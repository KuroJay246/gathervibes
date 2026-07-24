import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

test('Onboarding Flow: TARGET_UIDS includes the required targets', () => {
  const useOnboardingFile = readFileSync('src/components/onboarding/useOnboarding.js', 'utf8')
  assert.match(useOnboardingFile, /'WcDU2jmbopdAgDlMMWvD3TkqqbC3'/)
  assert.match(useOnboardingFile, /'WM2UOQtSeuOglCI5uMZQKrYYqP53'/)
})

test('Onboarding Flow: WelcomeCelebration contains required wording', () => {
  const welcomeFile = readFileSync('src/components/onboarding/WelcomeCelebration.jsx', 'utf8')
  assert.match(welcomeFile, /Welcome to Your Gather & Savor Event Hub/)
  assert.match(welcomeFile, /Created for you by Jaylan Maynard/)
  assert.match(welcomeFile, /Start Your Tour/)
  assert.match(welcomeFile, /Skip for Now/)
})

test('Onboarding Flow: AppWalkthrough contains all 13 steps', () => {
  const stepsFile = readFileSync('src/components/onboarding/onboardingSteps.js', 'utf8')
  const ids = [
    'working-event', 'overview', 'events', 'guests', 'payments',
    'tickets', 'check-in', 'operations', 'tasks', 'communications',
    'reports', 'imports', 'settings'
  ]
  ids.forEach(id => {
    assert.match(stepsFile, new RegExp(`id: '${id}'`))
  })
})

test('Onboarding Flow: AppShell integration mounts components', () => {
  const shellFile = readFileSync('src/layout/AppShell.jsx', 'utf8')
  assert.match(shellFile, /import { useOnboarding } from '..\/components\/onboarding\/useOnboarding'/)
  assert.match(shellFile, /<WelcomeCelebration/)
  assert.match(shellFile, /<AppWalkthrough/)
})

test('Onboarding Flow: SettingsPage provides replay control', () => {
  const settingsFile = readFileSync('src/pages/SettingsPage.jsx', 'utf8')
  assert.match(settingsFile, /window\.dispatchEvent\(new CustomEvent\('replay-onboarding'\)\)/)
  assert.match(settingsFile, /Show Welcome Tour Again/)
  assert.match(settingsFile, /TARGET_UIDS\.includes\(user\.uid\)/)
})
