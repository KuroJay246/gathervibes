import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

test('Onboarding fields: firestore.rules validates onboarding fields safely', () => {
  const rules = readFileSync('firestore.rules', 'utf8')
  
  assert.match(rules, /'onboardingVersion', 'onboardingStartedAt', 'onboardingCompleted'/)
  assert.match(rules, /'onboardingCompletedAt', 'onboardingSkippedAt', 'onboardingLastStep'/)
  assert.match(rules, /'onboardingReplayRequestedAt'/)
  
  // Type validation
  assert.match(rules, /!\('onboardingVersion' in data\) \|\| \(data.onboardingVersion is string && data.onboardingVersion.size\(\) <= 64\)/)
  assert.match(rules, /!\('onboardingStartedAt' in data\) \|\| data.onboardingStartedAt is timestamp/)
  assert.match(rules, /!\('onboardingCompleted' in data\) \|\| data.onboardingCompleted is bool/)
  assert.match(rules, /!\('onboardingLastStep' in data\) \|\| \(data.onboardingLastStep is int && data.onboardingLastStep >= 0 && data.onboardingLastStep <= 100\)/)
  
  // Unchanged fields validation helper
  assert.match(rules, /function onboardingFieldsUnchanged\(newData, oldData\)/)
  assert.match(rules, /newData.get\('onboardingVersion', null\) == oldData.get\('onboardingVersion', null\)/)
  
  // Rule allowing update
  assert.match(rules, /\(isProtectedOwner\(\) \|\| request.resource.data.defaultRole == resource.data.defaultRole\)/)
  assert.match(rules, /\(isProtectedOwner\(\) \|\| request.resource.data.status == resource.data.status\)/)
  assert.match(rules, /\(request.auth.uid == uid \|\| onboardingFieldsUnchanged\(request.resource.data, resource.data\)\)/)
})
