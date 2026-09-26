import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_ID = process.env.GSV_MOBILE_APP_ID || 'com.gathervibeshub.staff'
const MAIN_ACTIVITY = process.env.GSV_MOBILE_MAIN_ACTIVITY || `${APP_ID}/.MainActivity`
const DEVICE_ID = String(process.env.GSV_ANDROID_DEVICE_ID || '').trim()
const EXPECTED_AVD_NAME = String(process.env.GSV_ANDROID_AVD_NAME || '').trim()
const DEV_URL = process.env.GSV_MOBILE_E2E_DEV_URL || ''
const LAUNCH_MODE = process.env.GSV_MOBILE_E2E_LAUNCH_MODE || (DEV_URL ? 'dev-client' : 'native')
const STARTUP_TIMEOUT_MS = Number(process.env.GSV_MOBILE_E2E_STARTUP_TIMEOUT_MS || (LAUNCH_MODE === 'dev-client' ? 120000 : 30000))
const ADB_COMMAND_TIMEOUT_MS = Number(process.env.GSV_ANDROID_ADB_TIMEOUT_MS || 20000)
const SKIP_PM_CLEAR = process.env.GSV_ANDROID_SKIP_PM_CLEAR === 'true'
const BLOCKED_PACKAGES = ['com.jaylan.couplebook', ...String(process.env.GSV_ANDROID_BLOCKED_PACKAGES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)]
const OUTPUT_DIR = path.resolve(__dirname, '..', '..', '..', 'output', 'mobile-e2e')
const UI_DUMP_PATH = path.join(OUTPUT_DIR, 'window_dump.xml')
const REQUIRED_FLOWS = [
  'launch',
  'sign-in',
  'event-selection',
  'session-recovery',
  'guest-search',
  'manual-invalid-ticket',
  'manual-check-in',
  'duplicate-check-in',
  'camera-permission-denial',
  'offline-indication',
  'sign-out',
]

function resolveAdbPath() {
  const candidates = [
    process.env.ADB_PATH,
    process.env.ANDROID_HOME ? path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb.exe') : null,
    process.env.ANDROID_SDK_ROOT ? path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb.exe') : null,
    path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      execFileSync(candidate, ['version'], { stdio: 'ignore' })
      return candidate
    } catch {}
  }

  return 'adb'
}

const ADB_PATH = resolveAdbPath()

function blockingSleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function execAdb(args, options = {}) {
  const output = execFileSync(ADB_PATH, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: ADB_COMMAND_TIMEOUT_MS,
    ...options,
  })
  return typeof output === 'string' ? output.trim() : ''
}

function shouldRetryAdb(error) {
  const signal = `${error?.message || ''}\n${error?.stderr || ''}`.toLowerCase()
  return signal.includes('daemon not running')
    || signal.includes('cannot connect to daemon')
    || signal.includes('failed to start daemon')
    || signal.includes('could not read ok from adb server')
    || signal.includes('device offline')
    || signal.includes('device not found')
}

function adb(args, options = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return execAdb(['-s', DEVICE_ID, ...args], options)
    } catch (error) {
      if (!shouldRetryAdb(error) || attempt === 2) throw error

      try {
        execAdb(['kill-server'])
      } catch {}
      blockingSleep(500)
      execAdb(['start-server'])
      blockingSleep(1000)
      execAdb(['wait-for-device'])
      blockingSleep(1000)
    }
  }

  throw new Error(`ADB command failed after retries: ${args.join(' ')}`)
}

function assertRequiredDeviceConfiguration() {
  if (!DEVICE_ID) throw new Error('GSV_ANDROID_DEVICE_ID is required; refusing implicit adb device selection.')
  if (!EXPECTED_AVD_NAME) throw new Error('GSV_ANDROID_AVD_NAME is required; refusing an unverified emulator.')
}

async function assertDeviceGuard() {
  assertRequiredDeviceConfiguration()
  adb(['wait-for-device'])

  const avdName = adb(['emu', 'avd', 'name']).split(/\r?\n/)[0].trim()
  if (avdName !== EXPECTED_AVD_NAME) {
    throw new Error(`Unexpected Android AVD "${avdName}"; expected "${EXPECTED_AVD_NAME}".`)
  }

  const bootCompleted = adb(['shell', 'getprop', 'sys.boot_completed'])
  if (bootCompleted !== '1') throw new Error(`Android device ${DEVICE_ID} is not boot-complete.`)

  const simulatedStylus = adb(['shell', 'getprop', 'debug.input.simulate_stylus_with_touch'])
  const defaultIme = adb(['shell', 'settings', 'get', 'secure', 'default_input_method'])
  const availableImes = adb(['shell', 'ime', 'list', '-s']).split(/\r?\n/).filter(Boolean)
  console.log(JSON.stringify({ inputPreflight: { simulatedStylus, defaultIme, availableImeCount: availableImes.length } }))
  if (simulatedStylus === '1' || simulatedStylus.toLowerCase() === 'true') {
    adb(['shell', 'setprop', 'debug.input.simulate_stylus_with_touch', 'false'])
    await sleep(500)
  }

  const installedPackages = adb(['shell', 'pm', 'list', 'packages'])
  const presentBlockedPackage = BLOCKED_PACKAGES.find((blockedPackage) => installedPackages.includes(`package:${blockedPackage}`))
  if (presentBlockedPackage) {
    throw new Error(`Blocked package ${presentBlockedPackage} is installed on AVD ${EXPECTED_AVD_NAME}; use a clean dedicated GSV AVD.`)
  }

  if (!adb(['shell', 'pm', 'path', APP_ID])) {
    throw new Error(`Gather & Savor Staff (${APP_ID}) is not installed on ${DEVICE_ID}.`)
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function selectorMatches(candidate, selector) {
  if (selector.accessibilityLabel) {
    return candidate['content-desc'] === selector.accessibilityLabel
      || candidate['resource-id'] === selector.accessibilityLabel
      || String(candidate['resource-id'] || '').endsWith(selector.accessibilityLabel)
  }
  if (selector.text) {
    return candidate.text === selector.text
      || candidate['content-desc'] === selector.text
      || String(candidate.text || '').includes(selector.text)
      || String(candidate['content-desc'] || '').includes(selector.text)
  }
  return false
}

function decodeXml(value = '') {
  return value
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
}

function parseBounds(bounds = '') {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/)
  if (!match) return null
  const [, x1, y1, x2, y2] = match.map(Number)
  return {
    x: Math.floor((x1 + x2) / 2),
    y: Math.floor((y1 + y2) / 2),
  }
}

function parseNodes(xml) {
  const matches = [...xml.matchAll(/<node\b([^>]*)>/g)]
  return matches.map(([, rawAttributes]) => {
    const attributes = {}
    for (const attribute of rawAttributes.matchAll(/([\w:-]+)="([^"]*)"/g)) {
      attributes[attribute[1]] = decodeXml(attribute[2])
    }
    return attributes
  })
}

function appIsForeground(nodes) {
  return nodes.some((candidate) => candidate.package === APP_ID)
}

function getSystemDialogTitle(nodes) {
  return nodes.find((candidate) => candidate['resource-id'] === 'android:id/alertTitle')?.text || ''
}

function isExternalAnrDialog(nodes) {
  if (!nodes.some((candidate) => candidate.package === 'android')) return false
  const title = getSystemDialogTitle(nodes)
  return title.includes("isn't responding") && !title.includes('Gather & Savor Staff')
}

async function dismissExternalAnrDialog(nodes) {
  if (!isExternalAnrDialog(nodes)) return false

  const closeNode = nodes.find((candidate) => candidate['resource-id'] === 'android:id/aerr_close' || candidate.text === 'Close app')
  const point = parseBounds(closeNode?.bounds)
  if (!point) return false

  adb(['shell', 'input', 'tap', String(point.x), String(point.y)])
  await sleep(1500)
  return true
}

async function dumpUi(label) {
  let lastError = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      adb(['shell', 'uiautomator', 'dump', '/sdcard/Download/gsv-window-dump.xml'])
      adb(['pull', '/sdcard/Download/gsv-window-dump.xml', UI_DUMP_PATH], { stdio: ['ignore', 'ignore', 'pipe'] })
      const xml = await readFile(UI_DUMP_PATH, 'utf8')
      const nodes = parseNodes(xml)
      if (await dismissExternalAnrDialog(nodes)) continue
      await writeFile(path.join(OUTPUT_DIR, `${label}.xml`), xml)
      return nodes
    } catch (error) {
      lastError = error
      await sleep(500)
    }
  }

  throw lastError
}

async function captureScreenshot(label) {
  const remote = `/sdcard/Download/${label}.png`
  const local = path.join(OUTPUT_DIR, `${label}.png`)
  adb(['shell', 'screencap', '-p', remote])
  adb(['pull', remote, local], { stdio: ['ignore', 'ignore', 'pipe'] })
  return local
}

async function findNode(predicate, timeoutMs = 15000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const nodes = await dumpUi('live')
    const match = nodes.find(predicate)
    if (match) return match
    await sleep(750)
  }
  return null
}

async function waitForVisibleText(text, timeoutMs = 15000) {
  const node = await findNode((candidate) => candidate.text === text || candidate['content-desc'] === text || String(candidate.text || '').includes(text), timeoutMs)
  if (!node) {
    await captureScreenshot(`missing-${text.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
    throw new Error(`Timed out waiting for text: ${text}`)
  }
  return node
}

async function waitForSelector(selector, timeoutMs = 15000) {
  const node = await findNode((candidate) => selectorMatches(candidate, selector), timeoutMs)
  if (!node) {
    await captureScreenshot(`missing-${(selector.accessibilityLabel || selector.text || 'node').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
    throw new Error(`Timed out waiting for selector ${JSON.stringify(selector)}`)
  }
  return node
}

async function assertNoVisibleText(text, timeoutMs = 3000) {
  const node = await findNode((candidate) => candidate.text === text || candidate['content-desc'] === text, timeoutMs)
  if (node) {
    await captureScreenshot(`unexpected-${text.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
    throw new Error(`Unexpected visible text: ${text}`)
  }
}

async function tapBySelector(selector, timeoutMs = 15000) {
  const node = await findNode((candidate) => selectorMatches(candidate, selector) && candidate.enabled !== 'false', timeoutMs)
  if (!node) {
    await captureScreenshot(`missing-${(selector.accessibilityLabel || selector.text || 'node').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
    throw new Error(`Node not found for selector ${JSON.stringify(selector)}`)
  }
  const point = parseBounds(node.bounds)
  if (!point) throw new Error(`Node bounds missing for selector ${JSON.stringify(selector)}`)
  adb(['shell', 'input', 'tap', String(point.x), String(point.y)])
  await sleep(500)
}

async function scrollUntilVisibleText(text, maxSwipes = 4) {
  for (let attempt = 0; attempt <= maxSwipes; attempt += 1) {
    const visible = await findNode((candidate) => candidate.text === text || candidate['content-desc'] === text || String(candidate.text || '').includes(text), 1200)
    if (visible) return visible
    if (attempt < maxSwipes) {
      adb(['shell', 'input', 'swipe', '540', '1900', '540', '700', '350'])
      await sleep(500)
    }
  }
  await captureScreenshot(`missing-${text.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
  throw new Error(`Timed out waiting for text after bounded scrolls: ${text}`)
}

function encodeAdbText(value) {
  return String(value)
    .replaceAll('%', '%25')
    .replaceAll(' ', '%s')
    .replaceAll('&', '\\&')
    .replaceAll('(', '\\(')
    .replaceAll(')', '\\)')
}

async function typeInto(accessibilityLabel, value) {
  await tapBySelector({ accessibilityLabel })
  adb(['shell', 'input', 'keyevent', 'KEYCODE_MOVE_END'])
  for (let index = 0; index < Math.max(String(value).length + 4, 20); index += 1) {
    adb(['shell', 'input', 'keyevent', 'KEYCODE_DEL'])
  }
  adb(['shell', 'input', 'text', encodeAdbText(value)])
  await sleep(500)
}

function isPermissionPromptNode(candidate) {
  return candidate.package === 'com.google.android.permissioncontroller'
}

function isPermissionDenyNode(candidate) {
  return isPermissionPromptNode(candidate)
    && (
      ["Don't allow", 'Don’t allow'].includes(candidate.text)
      || candidate['resource-id'] === 'com.android.permissioncontroller:id/permission_deny_button'
      || candidate['resource-id'] === 'com.android.permissioncontroller:id/permission_deny_and_dont_ask_again_button'
    )
}

async function waitForPermissionPromptToClose(timeoutMs = 10000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const nodes = await dumpUi('permission-close-check')
    if (!nodes.some(isPermissionPromptNode)) return true
    await sleep(500)
  }
  return false
}

async function maybeDenyCameraPrompt() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const denyNode = await findNode(isPermissionDenyNode, 10000)
    if (!denyNode) return false

    const point = parseBounds(denyNode.bounds)
    if (!point) return false

    adb(['shell', 'input', 'tap', String(point.x), String(point.y)])
    await sleep(1500)

    if (await waitForPermissionPromptToClose(4000)) return true
  }

  return false
}

function detectPostSignInDestination(nodes) {
  if (nodes.some((candidate) => candidate.package === 'com.google.android.permissioncontroller')) {
    return 'scanner-permission-prompt'
  }
  if (nodes.some((candidate) => selectorMatches(candidate, { accessibilityLabel: 'event-select-open-codex_demo_full_system_walkthrough' }))) {
    return 'events'
  }
  if (nodes.some((candidate) => selectorMatches(candidate, { accessibilityLabel: 'home-guest-search-button' }))) {
    return 'home'
  }
  if (nodes.some((candidate) => candidate.text === 'Scanner Mode' || candidate.text === 'QR SCANNER')) {
    return 'scanner'
  }
  if (nodes.some((candidate) => selectorMatches(candidate, { accessibilityLabel: 'Continue with Google' }))) {
    return 'sign-in'
  }
  return null
}

async function relaunchApp() {
  if (LAUNCH_MODE === 'dev-client') {
    if (!DEV_URL) throw new Error('GSV_MOBILE_E2E_DEV_URL is required when GSV_MOBILE_E2E_LAUNCH_MODE=dev-client')
    adb(['shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', DEV_URL])
  } else {
    // Do not make ADB wait for React Native startup; the bounded UI checks below
    // provide the actual readiness signal and preserve useful failure evidence.
    adb(['shell', 'am', 'start', '-n', MAIN_ACTIVITY])
  }
  await sleep(3000)
}

async function ensureAppForeground(timeoutMs = 15000) {
  const startedAt = Date.now()
  let relaunchCount = 0
  let anrObserved = false

  while (Date.now() - startedAt < timeoutMs) {
    const nodes = await dumpUi('foreground-check')
    if (appIsForeground(nodes)) return

    if (isExternalAnrDialog(nodes)) {
      anrObserved = true
      await dismissExternalAnrDialog(nodes)
      await sleep(2000)
      continue
    }

    relaunchCount += 1
    await relaunchApp()
    await sleep(Math.min(1000 + relaunchCount * 500, 3000))
  }

  await captureScreenshot('app-not-foreground')
  const detail = anrObserved
    ? 'Android reported a startup ANR before the app became responsive.'
    : 'The app was not present in the foreground.'
  throw new Error(`Gather & Savor Staff did not remain in the foreground. ${detail}`)
}

async function openRoute(route) {
  adb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', `gsvstaff://${route.replace(/^\//, '')}`, APP_ID])
  await sleep(2000)
  await ensureAppForeground(STARTUP_TIMEOUT_MS)
}

function isDevMenuOverlay(nodes) {
  return nodes.some((candidate) => {
    const text = `${candidate.text || ''} ${candidate['content-desc'] || ''}`
    return text.includes('This is the developer menu')
      || text.includes('Reload')
      || text.includes('Go home')
      || text.includes('Fast Refresh')
      || text.includes('Open React Native dev menu')
  })
}

async function dismissVisibleDevMenu(nodes) {
  const continueNode = nodes.find((candidate) => candidate.text === 'Continue')
  if (continueNode) {
    const point = parseBounds(continueNode.bounds)
    if (point) adb(['shell', 'input', 'tap', String(point.x), String(point.y)])
    await sleep(1000)
    return
  }

  const closeNode = nodes.find((candidate) => candidate.text === '×' || candidate['content-desc'] === 'Close')
  if (closeNode) {
    const point = parseBounds(closeNode.bounds)
    if (point) adb(['shell', 'input', 'tap', String(point.x), String(point.y)])
    await sleep(1000)
  }
}

async function dismissDevMenuIfPresent() {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const nodes = await dumpUi(`dev-menu-${attempt}`)
    const overlayVisible = isDevMenuOverlay(nodes)
    if (!overlayVisible) return

    await dismissVisibleDevMenu(nodes)

    adb(['shell', 'input', 'tap', '540', '700'])
    await sleep(500)
    adb(['shell', 'input', 'keyevent', '111'])
    await sleep(500)
    adb(['shell', 'input', 'swipe', '540', '2350', '540', '1200', '250'])
    await sleep(1000)
  }

  const nodes = await dumpUi('dev-menu-final')
  const overlayVisible = isDevMenuOverlay(nodes)
  if (overlayVisible) {
    await captureScreenshot('dev-menu-still-open')
    throw new Error('Expo developer menu remained open after repeated dismissal attempts.')
  }
}

async function resolvePostSignInDestination(timeoutMs = 30000) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const nodes = await dumpUi('live')
    if (isDevMenuOverlay(nodes)) {
      await dismissVisibleDevMenu(nodes)
      continue
    }
    const destination = detectPostSignInDestination(nodes)
    if (destination && destination !== 'sign-in') return destination
    await sleep(750)
  }

  await captureScreenshot('missing-post-sign-in-destination')
  throw new Error('Timed out waiting for a post-sign-in destination.')
}

async function ensureHomeScreen() {
  const destination = await resolvePostSignInDestination()
  if (destination === 'events') {
    await tapBySelector({ accessibilityLabel: 'event-select-open-codex_demo_full_system_walkthrough' })
    await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 20000)
    return
  }
  if (destination === 'scanner-permission-prompt') {
    const denied = await maybeDenyCameraPrompt()
    if (!denied) {
      await captureScreenshot('camera-permission-denial-failed')
      throw new Error('Camera permission prompt remained open after denial attempt.')
    }
    await openRoute('/home')
    await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 20000)
    return
  }
  if (destination === 'scanner') {
    await openRoute('/home')
    await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 20000)
    return
  }
  await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 20000)
}

async function openScreenFromHome(buttonSelector, route, targetSelector, timeoutMs = 15000) {
  try {
    await tapBySelector(buttonSelector, Math.min(timeoutMs, 5000))
    const directTarget = await findNode((candidate) => selectorMatches(candidate, targetSelector), Math.min(timeoutMs, 8000))
    if (directTarget) return
  } catch {}

  await openRoute(route)
  await waitForSelector(targetSelector, timeoutMs)
}

async function tapForVisibleText(buttonSelector, text, timeoutMs = 20000) {
  await tapBySelector(buttonSelector)
  await sleep(1000)

  let retried = false
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const nodes = await dumpUi('action-result')
    if (nodes.some((candidate) => candidate.text === text || candidate['content-desc'] === text || String(candidate.text || '').includes(text))) {
      return
    }

    const buttonNode = nodes.find((candidate) => selectorMatches(candidate, buttonSelector))
    if (!retried && buttonNode && buttonNode.enabled !== 'false') {
      retried = true
      await tapBySelector(buttonSelector)
      await sleep(1500)
      continue
    }

    await sleep(750)
  }

  await captureScreenshot(`missing-${text.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`)
  throw new Error(`Timed out waiting for text: ${text}`)
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })

  const startedAt = Date.now()
  const step = (name) => console.log(JSON.stringify({ e2eStep: name, elapsedMs: Date.now() - startedAt, at: new Date().toISOString() }))

  step('adb-start-server')
  execAdb(['start-server'])
  step('device-guard')
  await assertDeviceGuard()
  step('clear-app-state')
  adb(['shell', 'am', 'force-stop', APP_ID])
  if (!SKIP_PM_CLEAR) adb(['shell', 'pm', 'clear', APP_ID])
  if (SKIP_PM_CLEAR) console.log(JSON.stringify({ e2eStep: 'clear-app-state-skipped', reason: 'GSV_ANDROID_SKIP_PM_CLEAR=true' }))
  await sleep(1500)

  step('launch-test-auth')
  await relaunchApp()
  await ensureAppForeground(STARTUP_TIMEOUT_MS)
  await dismissDevMenuIfPresent()
  await openRoute('/e2e-auth')

  step('establish-emulator-identity')
  step('authenticated-home')
  await ensureHomeScreen()
  await captureScreenshot('owner-home')

  step('run-of-show')
  await openScreenFromHome({ accessibilityLabel: 'home-run-of-show-button' }, '/run-of-show', { text: 'Run of Show' }, 15000)
  await waitForVisibleText('Staff briefing', 10000)
  await waitForVisibleText('Registration opens', 10000)
  await captureScreenshot('run-of-show-current-next')
  await scrollUntilVisibleText('Lunch service')
  await scrollUntilVisibleText('Supplier load-in')
  await scrollUntilVisibleText('Venue access confirmed')
  await captureScreenshot('run-of-show-upcoming')
  adb(['shell', 'input', 'keyevent', '4'])
  await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 10000)

  step('session-recovery')
  adb(['shell', 'am', 'force-stop', APP_ID])
  await sleep(1500)
  await relaunchApp()
  await ensureAppForeground(STARTUP_TIMEOUT_MS)
  await dismissDevMenuIfPresent()
  await ensureHomeScreen()

  await openScreenFromHome(
    { accessibilityLabel: 'home-guest-search-button' },
    '/lookup',
    { accessibilityLabel: 'lookup-search-input' },
    15000,
  )
  await typeInto('lookup-search-input', 'Lookup Guest')
  await waitForVisibleText('Lookup Guest', 10000)
  await captureScreenshot('guests-search')
  adb(['shell', 'input', 'keyevent', '4'])
  await openScreenFromHome(
    { accessibilityLabel: 'home-manual-ticket-button' },
    '/manual-entry',
    { accessibilityLabel: 'manual-ticket-input' },
    15000,
  )
  await typeInto('manual-ticket-input', 'GSV-E2E-INVALID')
  await waitForVisibleText('No event-scoped registration matched that ticket code.', 10000)

  await typeInto('manual-ticket-input', 'GSV-E2E-READY')
  await waitForVisibleText('Fixture Guest', 10000)
  await captureScreenshot('scanner-success-ready-to-confirm')
  await tapForVisibleText({ accessibilityLabel: 'manual-checkin-button' }, 'Fixture Guest checked in successfully.', 20000)

  await typeInto('manual-ticket-input', 'GSV-E2E-READY')
  await waitForVisibleText('Fixture Guest', 10000)
  await captureScreenshot('scanner-duplicate')
  await tapForVisibleText({ accessibilityLabel: 'manual-duplicate-button' }, 'Duplicate attempt recorded. No new check-in was saved.', 20000)

  await openRoute('/home')
  await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 15000)
  adb(['shell', 'pm', 'revoke', APP_ID, 'android.permission.CAMERA'])
  adb(['shell', 'cmd', 'appops', 'set', APP_ID, 'CAMERA', 'deny'])
  await tapBySelector({ accessibilityLabel: 'home-qr-scanner-button' })
  await sleep(1500)
  await maybeDenyCameraPrompt()
  await waitForVisibleText('Camera access denied', 15000)
  await captureScreenshot('scanner-ready')
  adb(['shell', 'input', 'keyevent', '4'])
  await waitForSelector({ accessibilityLabel: 'home-guest-search-button' }, 15000)

  adb(['shell', 'svc', 'wifi', 'disable'])
  adb(['shell', 'svc', 'data', 'disable'])
  await waitForVisibleText('Offline mode is visible, but check-ins stay blocked until the connection returns.', 15000)
  adb(['shell', 'svc', 'wifi', 'enable'])
  adb(['shell', 'svc', 'data', 'enable'])
  await sleep(5000)

  await openRoute('/settings')
  await waitForSelector({ accessibilityLabel: 'settings-sign-out-button' }, 15000)
  await tapBySelector({ accessibilityLabel: 'settings-sign-out-button' })
  await waitForSelector({ accessibilityLabel: 'Continue with Google' }, 15000)
  await assertNoVisibleText('Sign-in failed.')

  await captureScreenshot('android-e2e-pass')

  console.log(JSON.stringify({
    result: 'pass',
    framework: 'custom-adb-uiautomator',
    deviceId: DEVICE_ID,
    appId: APP_ID,
    flowCount: REQUIRED_FLOWS.length,
    flows: REQUIRED_FLOWS,
  }, null, 2))
}

main().catch(async (error) => {
  try {
    await mkdir(OUTPUT_DIR, { recursive: true })
    await captureScreenshot('android-e2e-failure')
  } catch {}
  console.error(error)
  process.exitCode = 1
})
