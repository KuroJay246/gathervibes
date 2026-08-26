import crypto from 'node:crypto'

const STATE_TTL_MS = 10 * 60 * 1000
const PLACEHOLDER_PATTERN = /\{\{\s*[^}]+\s*\}\}/

export const PROVIDER_DEFINITIONS = {
  gmail: {
    providerKey: 'gmail',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.send',
    ],
    connectionLabel: 'Gmail',
  },
  outlook: {
    providerKey: 'outlook',
    authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    revokeUrl: 'https://graph.microsoft.com/v1.0/me/revokeSignInSessions',
    scopes: [
      'openid',
      'email',
      'offline_access',
      'profile',
      'Mail.Send',
    ],
    connectionLabel: 'Microsoft Outlook',
  },
  googleSheets: {
    providerKey: 'googleSheets',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    revokeUrl: 'https://oauth2.googleapis.com/revoke',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
    connectionLabel: 'Google Sheets',
  },
}

function base64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest()
}

function requireSecret(secret, label) {
  if (typeof secret !== 'string' || secret.trim().length < 32) {
    throw new Error(`${label} must be a 32+ character secret.`)
  }
  return secret
}

function requireProtectedOwner(actor) {
  if (!actor?.protectedOwner) {
    const error = new Error('Only the Protected Owner can manage provider integrations.')
    error.code = 'integration/not-authorized'
    throw error
  }
}

function providerDefinition(providerKey) {
  const provider = PROVIDER_DEFINITIONS[providerKey]
  if (!provider) throw new Error(`Unsupported provider "${providerKey}".`)
  return provider
}

function createCipher(secret) {
  return sha256(requireSecret(secret, 'Integration secret'))
}

export function encryptSensitiveJson(value, secret) {
  const iv = crypto.randomBytes(12)
  const key = createCipher(secret)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const plaintext = JSON.stringify(value)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return base64Url(Buffer.concat([iv, cipher.getAuthTag(), ciphertext]))
}

export function decryptSensitiveJson(token, secret) {
  if (!token) throw new Error('Encrypted value is required.')
  const buffer = Buffer.from(token.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(token.length / 4) * 4, '='), 'base64')
  const iv = buffer.subarray(0, 12)
  const authTag = buffer.subarray(12, 28)
  const payload = buffer.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', createCipher(secret), iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8')
  return JSON.parse(plaintext)
}

export function createOAuthSession({
  providerKey,
  actor,
  redirectUri,
  encryptionSecret,
  stateSecret,
  now = Date.now(),
  connectionId = crypto.randomUUID(),
  eventId = '',
  accountHint = '',
}) {
  requireProtectedOwner(actor)
  requireSecret(encryptionSecret, 'Integration secret')
  requireSecret(stateSecret, 'OAuth state secret')
  if (typeof redirectUri !== 'string' || redirectUri.trim().length === 0) {
    throw new Error('Exact redirect URI is required.')
  }

  const provider = providerDefinition(providerKey)
  const rawState = base64Url(crypto.randomBytes(32))
  const codeVerifier = base64Url(crypto.randomBytes(48))
  const codeChallenge = base64Url(sha256(codeVerifier))
  const session = {
    connectionId,
    providerKey,
    actorUid: actor.uid || '',
    actorEmail: actor.email || '',
    redirectUri,
    eventId,
    accountHint,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + STATE_TTL_MS).toISOString(),
    stateHash: base64Url(sha256(`${stateSecret}:${rawState}`)),
    encryptedVerifier: encryptSensitiveJson({ codeVerifier }, encryptionSecret),
    scopes: provider.scopes,
  }

  const authorizationUrl = new URL(provider.authorizationUrl)
  authorizationUrl.searchParams.set('client_id', 'OWNER_CONFIGURES_THIS')
  authorizationUrl.searchParams.set('redirect_uri', redirectUri)
  authorizationUrl.searchParams.set('response_type', 'code')
  authorizationUrl.searchParams.set('scope', provider.scopes.join(' '))
  authorizationUrl.searchParams.set('state', rawState)
  authorizationUrl.searchParams.set('code_challenge', codeChallenge)
  authorizationUrl.searchParams.set('code_challenge_method', 'S256')
  if (accountHint) authorizationUrl.searchParams.set('login_hint', accountHint)

  return {
    state: rawState,
    session,
    authorizationUrl: authorizationUrl.toString(),
  }
}

export function validateOAuthCallback({
  providerKey,
  session,
  callback,
  redirectUri,
  encryptionSecret,
  stateSecret,
  now = Date.now(),
}) {
  providerDefinition(providerKey)
  requireSecret(encryptionSecret, 'Integration secret')
  requireSecret(stateSecret, 'OAuth state secret')
  if (!session?.encryptedVerifier) throw new Error('Missing PKCE verifier.')
  if (session.providerKey !== providerKey) throw new Error('Provider mismatch.')
  if (session.redirectUri !== redirectUri) throw new Error('Redirect URI mismatch.')
  if (!callback?.state || !callback?.code) throw new Error('OAuth callback is incomplete.')
  if (new Date(session.expiresAt).getTime() < now) throw new Error('OAuth state expired.')

  const expectedStateHash = base64Url(sha256(`${stateSecret}:${callback.state}`))
  if (expectedStateHash !== session.stateHash) throw new Error('OAuth state is invalid.')

  const verifierPayload = decryptSensitiveJson(session.encryptedVerifier, encryptionSecret)
  if (!verifierPayload?.codeVerifier) throw new Error('Missing PKCE verifier.')

  return {
    code: callback.code,
    codeVerifier: verifierPayload.codeVerifier,
  }
}

function buildConnectionRecord(providerKey, session, tokens, now) {
  const provider = providerDefinition(providerKey)
  return {
    connectionId: session.connectionId,
    providerKey,
    providerLabel: provider.connectionLabel,
    status: tokens.refresh_token ? 'Connected' : 'Authorization Required',
    accountEmail: tokens.accountEmail || '',
    accountDisplayName: tokens.accountDisplayName || '',
    tenantId: tokens.tenantId || '',
    scopes: [...provider.scopes],
    eventId: session.eventId || '',
    updatedAt: new Date(now).toISOString(),
    updatedBy: session.actorEmail || session.actorUid || 'unknown',
  }
}

export async function completeOAuthCallback({
  providerKey,
  actor,
  session,
  callback,
  redirectUri,
  encryptionSecret,
  stateSecret,
  exchangeCode,
  saveConnection = async () => {},
  saveAudit = async () => {},
  now = Date.now(),
}) {
  requireProtectedOwner(actor)
  const { code, codeVerifier } = validateOAuthCallback({
    providerKey,
    session,
    callback,
    redirectUri,
    encryptionSecret,
    stateSecret,
    now,
  })

  const tokens = await exchangeCode({
    providerKey,
    code,
    codeVerifier,
    redirectUri,
    scopes: session.scopes,
  })

  const connection = buildConnectionRecord(providerKey, session, tokens || {}, now)
  const encryptedTokens = encryptSensitiveJson({
    refreshToken: tokens?.refresh_token || '',
    accessToken: tokens?.access_token || '',
    expiresAt: tokens?.expires_in ? now + Number(tokens.expires_in) * 1000 : null,
  }, encryptionSecret)

  await saveConnection(connection, encryptedTokens)
  await saveAudit({
    providerKey,
    connectionId: connection.connectionId,
    action: 'oauth.callback',
    status: connection.status,
    changedAt: connection.updatedAt,
  })

  return { connection, encryptedTokens }
}

export async function refreshProviderAccessToken({
  providerKey,
  actor,
  encryptedTokens,
  encryptionSecret,
  refreshAccessToken,
  now = Date.now(),
}) {
  requireProtectedOwner(actor)
  providerDefinition(providerKey)
  const tokens = decryptSensitiveJson(encryptedTokens, encryptionSecret)
  if (!tokens?.refreshToken) throw new Error('Missing refresh token.')

  const refreshed = await refreshAccessToken({
    providerKey,
    refreshToken: tokens.refreshToken,
  })

  return encryptSensitiveJson({
    refreshToken: refreshed?.refresh_token || tokens.refreshToken,
    accessToken: refreshed?.access_token || '',
    expiresAt: refreshed?.expires_in ? now + Number(refreshed.expires_in) * 1000 : null,
  }, encryptionSecret)
}

export function createMemoryRateLimiter({ limit = 5, windowMs = 60000 } = {}) {
  const windows = new Map()
  return {
    consume(key, now = Date.now()) {
      const current = (windows.get(key) || []).filter((timestamp) => timestamp > now - windowMs)
      if (current.length >= limit) {
        return {
          ok: false,
          retryAfterMs: current[0] + windowMs - now,
        }
      }
      current.push(now)
      windows.set(key, current)
      return { ok: true, retryAfterMs: 0 }
    },
  }
}

export function createIdempotencyGuard() {
  const entries = new Map()
  return {
    claim(key) {
      if (!key || entries.has(key)) return false
      entries.set(key, { createdAt: Date.now() })
      return true
    },
    get(key) {
      return entries.get(key) || null
    },
  }
}

export function sanitizeProviderError(error) {
  const code = error?.code || 'provider/error'
  const message = String(error?.message || 'Provider request failed.')
    .replaceAll(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replaceAll(/access_token=([^&\s]+)/gi, 'access_token=[redacted]')
    .replaceAll(/refresh_token=([^&\s]+)/gi, 'refresh_token=[redacted]')
    .replaceAll(/client_secret=([^&\s]+)/gi, 'client_secret=[redacted]')
  return { code, message }
}

export async function sendProviderMessage({
  providerKey,
  actor,
  connection,
  draft,
  idempotencyKey,
  sendMessage,
  encryptedTokens,
  encryptionSecret,
  rateLimiter = createMemoryRateLimiter(),
  idempotencyGuard = createIdempotencyGuard(),
}) {
  requireProtectedOwner(actor)
  providerDefinition(providerKey)
  if (!connection || connection.providerKey !== providerKey) throw new Error('Provider connection is invalid.')
  if (connection.status !== 'Connected') throw new Error('Provider authorization is required before sending.')
  if (!draft?.recipientConfirmed) {
    return { status: 'copy-only', reason: 'Recipient confirmation is required.' }
  }
  if (PLACEHOLDER_PATTERN.test(String(draft.subject || '')) || PLACEHOLDER_PATTERN.test(String(draft.body || ''))) {
    return { status: 'copy-only', reason: 'Resolve all placeholders before sending.' }
  }

  const limitResult = rateLimiter.consume(`${providerKey}:${connection.connectionId}`)
  if (!limitResult.ok) throw new Error(`Rate limit exceeded. Retry in ${limitResult.retryAfterMs}ms.`)
  if (!idempotencyGuard.claim(idempotencyKey)) {
    return { status: 'duplicate-blocked', providerMessageId: null }
  }

  const tokenBundle = decryptSensitiveJson(encryptedTokens, encryptionSecret)
  try {
    const response = await sendMessage({
      providerKey,
      accessToken: tokenBundle.accessToken,
      refreshToken: tokenBundle.refreshToken,
      draft,
      connection,
    })
    return {
      status: 'sent',
      providerMessageId: response?.providerMessageId || `${providerKey}-message-id`,
    }
  } catch (error) {
    const safeError = sanitizeProviderError(error)
    if (/revoked/i.test(safeError.code) || /revoked/i.test(safeError.message)) {
      return {
        status: 'authorization-required',
        providerMessageId: null,
        error: safeError,
      }
    }
    throw Object.assign(new Error(safeError.message), { code: safeError.code })
  }
}

export async function previewSheetSelection({
  actor,
  connection,
  spreadsheetId,
  range,
  fetchRows,
}) {
  requireProtectedOwner(actor)
  if (!connection || connection.providerKey !== 'googleSheets') throw new Error('Google Sheets connection is required.')
  if (!/^[A-Za-z0-9-_]{10,}$/.test(String(spreadsheetId || ''))) throw new Error('Spreadsheet identifier is invalid.')
  if (!/^[^!]{1,120}![A-Z]{1,3}\d+:[A-Z]{1,3}\d+$/.test(String(range || ''))) throw new Error('Sheet range is invalid.')

  const rows = await fetchRows({ spreadsheetId, range, connection })
  const headers = Array.isArray(rows?.[0]) ? rows[0] : []
  const previewRows = Array.isArray(rows) ? rows.slice(1, 6) : []
  const duplicateRowIndexes = []
  const seen = new Map()

  previewRows.forEach((row, index) => {
    const key = JSON.stringify(row)
    if (seen.has(key)) duplicateRowIndexes.push(index + 2)
    seen.set(key, true)
  })

  return {
    status: 'preview-ready',
    headers,
    previewRows,
    duplicateRowIndexes,
  }
}

export async function disconnectProviderConnection({
  providerKey,
  actor,
  connection,
  revokeToken,
}) {
  requireProtectedOwner(actor)
  providerDefinition(providerKey)
  if (!connection || connection.providerKey !== providerKey) throw new Error('Provider connection is invalid.')
  await revokeToken({ providerKey, connection })
  return {
    ...connection,
    status: 'Authorization Required',
    revokedAt: new Date().toISOString(),
  }
}
