/* global console, process */
import net from 'node:net'
import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const command = process.argv.slice(2).join(' ').trim()
if (!command) {
  console.error('Usage: node scripts/product/runIsolatedEmulators.mjs "command"')
  process.exit(1)
}

const outputRoot = path.resolve('output/web-production-completion/owner-closeout')
const candidatePorts = [9199, 8180, 4402, 9198, 8179, 4403]

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
  })
}

async function choosePorts() {
  const selected = []
  for (const port of candidatePorts) {
    if (await isPortFree(port)) selected.push(port)
    if (selected.length === 3) return selected
  }
  throw new Error(`No isolated GSV emulator ports are available from ${candidatePorts.join(', ')}`)
}

const [authPort, firestorePort, uiPort] = await choosePorts()
const tempDirectory = await fs.mkdtemp(path.join(outputRoot, '.gsv-emulator-'))
const configPath = path.join(tempDirectory, 'firebase.json')
const config = {
  firestore: { rules: path.resolve('firestore.rules'), indexes: path.resolve('firestore.indexes.json') },
  emulators: {
    auth: { host: '127.0.0.1', port: authPort },
    firestore: { host: '127.0.0.1', port: firestorePort },
    ui: { enabled: true, host: '127.0.0.1', port: uiPort },
  },
}
await fs.writeFile(configPath, JSON.stringify(config, null, 2))
console.log(JSON.stringify({ project: 'gathervibeshub', authPort, firestorePort, uiPort, command }, null, 2))

const child = spawn(`npx -y firebase-tools@14.19.0 emulators:exec --config "${configPath}" --only auth,firestore --project gathervibeshub "${command.replaceAll('"', '\\"')}"`, {
  shell: true,
  stdio: 'inherit',
  env: {
    ...process.env,
    GSV_EMULATOR_AUTH_PORT: String(authPort),
    GSV_EMULATOR_FIRESTORE_PORT: String(firestorePort),
    VITE_FIREBASE_AUTH_EMULATOR_PORT: String(authPort),
    VITE_FIREBASE_FIRESTORE_EMULATOR_PORT: String(firestorePort),
  },
})
const exitCode = await new Promise((resolve) => child.on('close', resolve))
await fs.rm(tempDirectory, { recursive: true, force: true })
process.exit(exitCode || 0)
