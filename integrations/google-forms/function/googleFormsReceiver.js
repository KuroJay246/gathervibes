import crypto from 'node:crypto'

const REPLAY_WINDOW_MS = 5 * 60 * 1000
const MAX_BODY_BYTES = 128 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 10
const ALLOWED_TARGET_TYPES = new Set([
  'guest-registration',
  'baker-application',
  'vendor-application',
  'sponsor-inquiry',
  'volunteer-application',
  'school-participation',
  'feedback',
  'custom-review-record',
])

export function verifySignedRequest({ method, headers = {}, rawBody, secret, allowedConnections = new Map() }) {
  if (method !== 'POST') return { ok: false, status: 405, error: 'POST required' }
  if (!secret || secret.length < 32) return { ok: false, status: 500, error: 'receiver secret unavailable' }
  if (!rawBody || Buffer.byteLength(rawBody) > MAX_BODY_BYTES) return { ok: false, status: 413, error: 'request too large' }

  const timestampHeader = headerValue(headers, 'x-gsv-timestamp')
  const signatureHeader = headerValue(headers, 'x-gsv-signature')
  const idempotencyKey = headerValue(headers, 'x-gsv-idempotency-key')
  const timestamp = Number(timestampHeader)
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > REPLAY_WINDOW_MS) {
    return { ok: false, status: 401, error: 'stale or missing timestamp' }
  }
  if (!idempotencyKey || idempotencyKey.length > 160) return { ok: false, status: 400, error: 'invalid idempotency key' }

  const expected = crypto.createHmac('sha256', secret).update(`${timestampHeader}.${rawBody}`).digest('hex')
  if (!timingSafeEqual(signatureHeader, expected)) return { ok: false, status: 401, error: 'invalid signature' }

  let payload
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return { ok: false, status: 400, error: 'malformed json' }
  }

  const schema = validatePayload(payload, allowedConnections)
  if (!schema.ok) return schema
  return { ok: true, status: 202, payload, idempotencyKey }
}

export function validatePayload(payload = {}, allowedConnections = new Map()) {
  const requiredStrings = ['connectionId', 'eventId', 'formId', 'responseId', 'receivedAt']
  for (const field of requiredStrings) {
    if (typeof payload[field] !== 'string' || payload[field].length === 0 || payload[field].length > 200) {
      return { ok: false, status: 400, error: `${field} is invalid` }
    }
  }
  if (!Array.isArray(payload.answers) || payload.answers.length > 100) {
    return { ok: false, status: 400, error: 'answers are invalid' }
  }
  if (!payload.answers.every(validAnswer)) return { ok: false, status: 400, error: 'answer shape is invalid' }

  const connection = allowedConnections.get(payload.connectionId)
  if (!connection) return { ok: false, status: 403, error: 'connection not allowlisted' }
  if (connection.status !== 'active') return { ok: false, status: 403, error: 'connection disabled' }
  if (connection.formId !== payload.formId) return { ok: false, status: 403, error: 'wrong form' }
  if (connection.eventId !== payload.eventId) return { ok: false, status: 403, error: 'wrong event' }
  if (!ALLOWED_TARGET_TYPES.has(connection.targetType)) return { ok: false, status: 403, error: 'unsupported target type' }

  return { ok: true }
}

function validAnswer(answer = {}) {
  return typeof answer.itemId === 'string'
    && answer.itemId.length <= 120
    && typeof answer.title === 'string'
    && answer.title.length <= 300
    && (typeof answer.response === 'string' || Array.isArray(answer.response))
}

function headerValue(headers, name) {
  return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()] || ''
}

function timingSafeEqual(a = '', b = '') {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

export function createRateLimiter({ limit = RATE_LIMIT_MAX, windowMs = RATE_LIMIT_WINDOW_MS } = {}) {
  const windows = new Map()
  return {
    consume(key, now = Date.now()) {
      const current = (windows.get(key) || []).filter((timestamp) => timestamp > now - windowMs)
      if (current.length >= limit) {
        return { ok: false, retryAfterMs: current[0] + windowMs - now }
      }
      current.push(now)
      windows.set(key, current)
      return { ok: true, retryAfterMs: 0 }
    },
  }
}

export function sanitizePayloadForLogging(payload = {}) {
  return {
    connectionId: payload.connectionId || '',
    eventId: payload.eventId || '',
    formId: payload.formId || '',
    responseId: payload.responseId || '',
    receivedAt: payload.receivedAt || '',
    answerCount: Array.isArray(payload.answers) ? payload.answers.length : 0,
  }
}

export async function enqueueReviewedInboxResponse({ db, payload, idempotencyKey, receivedBy = 'google-forms-function' }) {
  const responseRef = db.collection('formResponses').doc(idempotencyKey.replaceAll('/', '_').slice(0, 160))
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(responseRef)
    if (existing.exists) return
    transaction.set(responseRef, {
      ...payload,
      status: 'new',
      receivedBy,
      idempotencyKey,
      createdAt: new Date(),
      updatedAt: new Date(),
      originalResponseSnapshot: payload,
    })
  })
}

export async function handleGoogleFormsReceiver({
  request,
  secret,
  allowedConnections = new Map(),
  rateLimiter = createRateLimiter(),
  db,
  log = () => {},
}) {
  const rateLimitKey = request?.ip || headerValue(request?.headers || {}, 'x-forwarded-for') || 'unknown'
  const limitResult = rateLimiter.consume(rateLimitKey)
  if (!limitResult.ok) {
    return {
      ok: false,
      status: 429,
      error: `rate limit exceeded; retry in ${limitResult.retryAfterMs}ms`,
    }
  }

  const verified = verifySignedRequest({
    method: request?.method,
    headers: request?.headers,
    rawBody: request?.rawBody,
    secret,
    allowedConnections,
  })
  if (!verified.ok) {
    log({ level: 'warn', error: verified.error })
    return verified
  }

  await enqueueReviewedInboxResponse({
    db,
    payload: verified.payload,
    idempotencyKey: verified.idempotencyKey,
  })

  log({
    level: 'info',
    payload: sanitizePayloadForLogging(verified.payload),
    idempotencyKey: verified.idempotencyKey,
  })

  return {
    ok: true,
    status: 202,
    payload: sanitizePayloadForLogging(verified.payload),
  }
}
