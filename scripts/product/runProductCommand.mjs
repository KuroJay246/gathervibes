/* global console, process */
import { spawn } from 'node:child_process'

const mode = process.argv[2]

const commands = {
  qa: [
    'npm run lint',
    'npm test',
    'npx -y firebase-tools@14.19.0 emulators:exec --only firestore --project gathervibeshub "node --test tests/firestore-checkin-rules.test.js"',
    'npm run e2e:smoke',
    'npm run build',
    'npm audit --omit=dev',
    'npm run doctor:changed',
    'npm run product:copy-scan',
    'npm run product:routes',
  ],
  audit: [
    'npm run product:qa',
    'npm run e2e:full',
    'npm run doctor',
    'npm run doctor:json',
    'npm run product:bundle',
    'npm run product:docs',
    'npm run product:legacy',
  ],
}

if (!commands[mode]) {
  console.error('Usage: node scripts/product/runProductCommand.mjs <qa|audit>')
  process.exit(1)
}

for (const command of commands[mode]) {
  console.log(`\n> ${command}`)
  const exitCode = await new Promise((resolve) => {
    const child = spawn(command, {
      shell: true,
      stdio: 'inherit',
    })
    child.on('close', resolve)
  })

  if (exitCode !== 0) {
    process.exit(exitCode)
  }
}
