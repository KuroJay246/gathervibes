import test from 'node:test'
import assert from 'node:assert/strict'

import {
  PROVIDER_DEFINITIONS,
  completeOAuthCallback,
  createIdempotencyGuard,
  createMemoryRateLimiter,
  createOAuthSession,
  disconnectProviderConnection,
  encryptSensitiveJson,
  previewSheetSelection,
  refreshProviderAccessToken,
  sanitizeProviderError,
  sendProviderMessage,
} from '../integrations/backend/foundation.js'

const owner = {
  uid: 'owner-uid',
  email: 'owner@example.com',
  protectedOwner: true,
}

const outsider = {
  uid: 'staff-uid',
  email: 'staff@example.com',
  protectedOwner: false,
}

const encryptionSecret = '0123456789abcdef0123456789abcdef'
const stateSecret = 'fedcba9876543210fedcba9876543210'
const redirectUri = 'https://gathervibeshub.web.app/oauth/google/callback'

test('provider definitions expose minimum Gmail, Outlook, and Sheets scopes', () => {
  assert.ok(PROVIDER_DEFINITIONS.gmail.scopes.includes('https://www.googleapis.com/auth/gmail.send'))
  assert.ok(PROVIDER_DEFINITIONS.outlook.scopes.includes('Mail.Send'))
  assert.ok(PROVIDER_DEFINITIONS.googleSheets.scopes.includes('https://www.googleapis.com/auth/spreadsheets.readonly'))
})

test('valid OAuth callback completes with PKCE and connected metadata', async () => {
  const { state, session, authorizationUrl } = createOAuthSession({
    providerKey: 'gmail',
    actor: owner,
    redirectUri,
    encryptionSecret,
    stateSecret,
    accountHint: 'owner@example.com',
  })

  assert.match(authorizationUrl, /code_challenge=/)
  assert.match(authorizationUrl, /state=/)

  let savedConnection = null
  const result = await completeOAuthCallback({
    providerKey: 'gmail',
    actor: owner,
    session,
    callback: { state, code: 'oauth-code-1' },
    redirectUri,
    encryptionSecret,
    stateSecret,
    exchangeCode: async () => ({
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      expires_in: 3600,
      accountEmail: 'owner@example.com',
      accountDisplayName: 'Owner Mailbox',
    }),
    saveConnection: async (connection) => {
      savedConnection = connection
    },
  })

  assert.equal(result.connection.status, 'Connected')
  assert.equal(savedConnection.accountEmail, 'owner@example.com')
})

test('OAuth callback rejects invalid state, missing verifier, and expired sessions', async () => {
  const { session } = createOAuthSession({
    providerKey: 'outlook',
    actor: owner,
    redirectUri,
    encryptionSecret,
    stateSecret,
    now: 1_000,
  })

  await assert.rejects(() => completeOAuthCallback({
    providerKey: 'outlook',
    actor: owner,
    session,
    callback: { state: 'wrong', code: 'code' },
    redirectUri,
    encryptionSecret,
    stateSecret,
    exchangeCode: async () => ({}),
    now: 2_000,
  }), /invalid/)

  await assert.rejects(() => completeOAuthCallback({
    providerKey: 'outlook',
    actor: owner,
    session: { ...session, encryptedVerifier: '' },
    callback: { state: 'wrong', code: 'code' },
    redirectUri,
    encryptionSecret,
    stateSecret,
    exchangeCode: async () => ({}),
    now: 2_000,
  }), /Missing PKCE verifier/)

  await assert.rejects(() => completeOAuthCallback({
    providerKey: 'outlook',
    actor: owner,
    session,
    callback: { state: 'wrong', code: 'code' },
    redirectUri,
    encryptionSecret,
    stateSecret,
    exchangeCode: async () => ({}),
    now: Date.parse(session.expiresAt) + 1,
  }), /expired/)
})

test('token refresh, disconnect, and unauthorized owner checks are enforced server-side', async () => {
  const encryptedTokens = encryptSensitiveJson({
    refreshToken: 'refresh-token-1',
    accessToken: 'access-token-1',
    expiresAt: Date.now() + 1000,
  }, encryptionSecret)

  const refreshed = await refreshProviderAccessToken({
    providerKey: 'gmail',
    actor: owner,
    encryptedTokens,
    encryptionSecret,
    refreshAccessToken: async () => ({
      access_token: 'access-token-2',
      expires_in: 7200,
    }),
  })

  assert.ok(typeof refreshed === 'string' && refreshed.length > 20)

  const disconnected = await disconnectProviderConnection({
    providerKey: 'gmail',
    actor: owner,
    connection: { connectionId: 'gmail-1', providerKey: 'gmail', status: 'Connected' },
    revokeToken: async () => {},
  })
  assert.equal(disconnected.status, 'Authorization Required')

  await assert.rejects(() => disconnectProviderConnection({
    providerKey: 'gmail',
    actor: outsider,
    connection: { connectionId: 'gmail-1', providerKey: 'gmail', status: 'Connected' },
    revokeToken: async () => {},
  }), /Protected Owner/)
})

test('Gmail and Outlook send mocks enforce confirmation, rate limits, and duplicate prevention', async () => {
  const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 })
  const duplicateGuard = createIdempotencyGuard()
  const encryptedTokens = encryptSensitiveJson({
    refreshToken: 'refresh-token-1',
    accessToken: 'access-token-1',
  }, encryptionSecret)
  const gmailConnection = { connectionId: 'gmail-1', providerKey: 'gmail', status: 'Connected' }
  const outlookConnection = { connectionId: 'outlook-1', providerKey: 'outlook', status: 'Connected' }

  const gmailSent = await sendProviderMessage({
    providerKey: 'gmail',
    actor: owner,
    connection: gmailConnection,
    draft: { recipientConfirmed: true, subject: 'Ready', body: 'Hello world' },
    idempotencyKey: 'gmail-send-1',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: createMemoryRateLimiter({ limit: 5, windowMs: 60_000 }),
    idempotencyGuard: createIdempotencyGuard(),
    sendMessage: async () => ({ providerMessageId: 'gmail-msg-1' }),
  })
  assert.equal(gmailSent.providerMessageId, 'gmail-msg-1')

  const outlookSent = await sendProviderMessage({
    providerKey: 'outlook',
    actor: owner,
    connection: outlookConnection,
    draft: { recipientConfirmed: true, subject: 'Ready', body: 'Hello world' },
    idempotencyKey: 'outlook-send-1',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: createMemoryRateLimiter({ limit: 5, windowMs: 60_000 }),
    idempotencyGuard: createIdempotencyGuard(),
    sendMessage: async () => ({ providerMessageId: 'outlook-msg-1' }),
  })
  assert.equal(outlookSent.providerMessageId, 'outlook-msg-1')

  const copyOnly = await sendProviderMessage({
    providerKey: 'gmail',
    actor: owner,
    connection: gmailConnection,
    draft: { recipientConfirmed: true, subject: 'Ready {{name}}', body: 'Hello world' },
    idempotencyKey: 'gmail-send-copy',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: createMemoryRateLimiter({ limit: 5, windowMs: 60_000 }),
    idempotencyGuard: createIdempotencyGuard(),
    sendMessage: async () => ({ providerMessageId: 'gmail-msg-copy' }),
  })
  assert.equal(copyOnly.status, 'copy-only')

  const firstSend = await sendProviderMessage({
    providerKey: 'gmail',
    actor: owner,
    connection: gmailConnection,
    draft: { recipientConfirmed: true, subject: 'Ready', body: 'Hello world' },
    idempotencyKey: 'gmail-send-2',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: limiter,
    idempotencyGuard: duplicateGuard,
    sendMessage: async () => ({ providerMessageId: 'gmail-msg-2' }),
  })
  assert.equal(firstSend.status, 'sent')

  const duplicate = await sendProviderMessage({
    providerKey: 'gmail',
    actor: owner,
    connection: gmailConnection,
    draft: { recipientConfirmed: true, subject: 'Ready', body: 'Hello world' },
    idempotencyKey: 'gmail-send-2',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: createMemoryRateLimiter({ limit: 5, windowMs: 60_000 }),
    idempotencyGuard: duplicateGuard,
    sendMessage: async () => ({ providerMessageId: 'gmail-msg-2' }),
  })
  assert.equal(duplicate.status, 'duplicate-blocked')

  await assert.rejects(() => sendProviderMessage({
    providerKey: 'gmail',
    actor: owner,
    connection: gmailConnection,
    draft: { recipientConfirmed: true, subject: 'Ready', body: 'Hello world' },
    idempotencyKey: 'gmail-send-3',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: limiter,
    idempotencyGuard: createIdempotencyGuard(),
    sendMessage: async () => ({ providerMessageId: 'gmail-msg-3' }),
  }), /Rate limit exceeded/)
})

test('provider failure and revoked token results are sanitized', async () => {
  const encryptedTokens = encryptSensitiveJson({
    refreshToken: 'refresh-token-1',
    accessToken: 'access-token-1',
  }, encryptionSecret)
  const connection = { connectionId: 'gmail-1', providerKey: 'gmail', status: 'Connected' }

  const revoked = await sendProviderMessage({
    providerKey: 'gmail',
    actor: owner,
    connection,
    draft: { recipientConfirmed: true, subject: 'Ready', body: 'Hello world' },
    idempotencyKey: 'gmail-send-revoked',
    encryptedTokens,
    encryptionSecret,
    rateLimiter: createMemoryRateLimiter({ limit: 5, windowMs: 60_000 }),
    idempotencyGuard: createIdempotencyGuard(),
    sendMessage: async () => {
      const error = new Error('Bearer abc revoked')
      error.code = 'revoked_token'
      throw error
    },
  })
  assert.equal(revoked.status, 'authorization-required')
  assert.doesNotMatch(revoked.error.message, /abc/)

  const safeError = sanitizeProviderError(new Error('refresh_token=abc123 access_token=xyz789'))
  assert.doesNotMatch(safeError.message, /abc123|xyz789/)
})

test('Sheets preview validates identifier/range and surfaces duplicate rows', async () => {
  const preview = await previewSheetSelection({
    actor: owner,
    connection: { connectionId: 'sheets-1', providerKey: 'googleSheets', status: 'Connected' },
    spreadsheetId: 'sheetIdentifier01',
    range: 'Sheet1!A1:C5',
    fetchRows: async () => [
      ['Name', 'Email', 'Ticket'],
      ['One', 'one@example.com', 'A1'],
      ['One', 'one@example.com', 'A1'],
    ],
  })

  assert.deepEqual(preview.headers, ['Name', 'Email', 'Ticket'])
  assert.deepEqual(preview.duplicateRowIndexes, [3])

  await assert.rejects(() => previewSheetSelection({
    actor: owner,
    connection: { connectionId: 'sheets-1', providerKey: 'googleSheets', status: 'Connected' },
    spreadsheetId: 'bad',
    range: 'Sheet1!A1:C5',
    fetchRows: async () => [],
  }), /Spreadsheet identifier is invalid/)

  await assert.rejects(() => previewSheetSelection({
    actor: owner,
    connection: { connectionId: 'sheets-1', providerKey: 'googleSheets', status: 'Connected' },
    spreadsheetId: 'sheetIdentifier01',
    range: 'not-a-range',
    fetchRows: async () => [],
  }), /Sheet range is invalid/)
})
