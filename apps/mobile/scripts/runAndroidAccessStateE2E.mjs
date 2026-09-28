import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { openSync } from 'node:fs'
import path from 'node:path'

const device = process.env.GSV_ANDROID_DEVICE_ID
const avd = process.env.GSV_ANDROID_AVD_NAME
const appId = 'com.gathervibeshub.staff'
const devUrl = process.env.GSV_MOBILE_E2E_DEV_URL || ''
const adbPath = process.env.ADB_PATH || 'adb'
const outputDir = path.resolve('output/mobile-e2e')
if (!device || !avd) throw new Error('GSV_ANDROID_DEVICE_ID and GSV_ANDROID_AVD_NAME are required.')

function adb(args) {
  return execFileSync(adbPath, ['-s', device, ...args], { encoding: 'utf8', timeout: 20000 }).trim()
}

function dump() {
  adb(['shell', 'uiautomator', 'dump', '/sdcard/Download/gsv-access-state.xml'])
  adb(['pull', '/sdcard/Download/gsv-access-state.xml', path.join(outputDir, 'access-state-window.xml')])
  return readFile(path.join(outputDir, 'access-state-window.xml'), 'utf8')
}

function screenshot(label) {
  const target = path.join(outputDir, `${label}.png`)
  execFileSync(adbPath, ['-s', device, 'exec-out', 'screencap', '-p'], { stdio: ['ignore', openSync(target, 'w'), 'pipe'], timeout: 20000 })
}

function waitFor(text, timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const xml = execFileSync(adbPath, ['-s', device, 'exec-out', 'uiautomator', 'dump', '/dev/tty'], { encoding: 'utf8', timeout: 20000 })
    if (xml.includes(text)) return xml
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 750)
  }
  throw new Error(`Timed out waiting for ${text}`)
}

await mkdir(outputDir, { recursive: true })
const seed = spawnSync(process.execPath, [path.resolve('apps/mobile/scripts/seedMobileE2EFixture.mjs')], {
  env: { ...process.env, GSV_MOBILE_E2E_ACCESS_STATE: 'denied' },
  stdio: 'inherit',
})
if (seed.status !== 0) process.exit(seed.status || 1)

const installed = adb(['shell', 'pm', 'path', appId])
if (!installed) throw new Error(`${appId} is not installed on ${avd}`)
adb(['shell', 'am', 'force-stop', appId])
adb(['shell', 'pm', 'clear', appId])
if (devUrl) adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', devUrl])
else adb(['shell', 'am', 'start', '-n', `${appId}/.MainActivity`])
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000)
if (devUrl) {
  adb(['shell', 'input', 'tap', '540', '2165'])
  adb(['shell', 'input', 'keyevent', '4'])
}
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500)
adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', 'gsvstaff://e2e-auth', appId])
const xml = waitFor('Access denied')
await writeFile(path.join(outputDir, 'access-denied-window.xml'), xml)
screenshot('access-denied')
if (!xml.includes('This workspace is private.')) throw new Error('Denied fixture did not render the private-workspace message.')
if (xml.includes('home-guest-search-button')) throw new Error('Denied fixture rendered protected home content.')

console.log(JSON.stringify({
  result: 'pass',
  fixture: 'ISOLATED GUARDED E2E FIXTURE',
  accessState: 'denied',
  avd,
  device,
  protectedShellVisible: false,
  evidence: ['output/mobile-e2e/access-denied.png', 'output/mobile-e2e/access-denied-window.xml'],
}, null, 2))
