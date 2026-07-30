const CONFIG_KEYS = {
  endpointUrl: 'GSV_ENDPOINT_URL',
  sharedSecret: 'GSV_SHARED_SECRET',
  connectionId: 'GSV_CONNECTION_ID',
  eventId: 'GSV_EVENT_ID',
  formId: 'GSV_FORM_ID',
}

function installGatherSavorTrigger() {
  validateGatherSavorConfig_()
  removeGatherSavorTriggers()
  ScriptApp.newTrigger('onGatherSavorFormSubmit')
    .forForm(FormApp.getActiveForm())
    .onFormSubmit()
    .create()
  console.log('Gather & Savor form submit trigger installed.')
}

function removeGatherSavorTriggers() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === 'onGatherSavorFormSubmit')
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger))
  console.log('Gather & Savor form submit triggers removed.')
}

function healthCheckGatherSavorConfig() {
  const config = validateGatherSavorConfig_()
  return {
    ok: true,
    endpointHost: config.endpointUrl.replace(/^https:\/\/([^/]+).*$/, '$1'),
    connectionId: config.connectionId,
    eventId: config.eventId,
    formId: config.formId,
  }
}

function onGatherSavorFormSubmit(event) {
  const config = validateGatherSavorConfig_()
  const payload = buildPayload_(event, config)
  const body = JSON.stringify(payload)
  const timestamp = String(Date.now())
  const idempotencyKey = `${config.connectionId}:${payload.responseId}`
  const signature = sign_(timestamp + '.' + body, config.sharedSecret)

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: body,
    muteHttpExceptions: true,
    headers: {
      'X-GSV-Timestamp': timestamp,
      'X-GSV-Signature': signature,
      'X-GSV-Idempotency-Key': idempotencyKey,
    },
  }

  const response = UrlFetchApp.fetch(config.endpointUrl, options)
  const code = response.getResponseCode()
  if (code < 200 || code >= 300) {
    console.warn(`Gather & Savor delivery failed with status ${code}.`)
    Utilities.sleep(1000)
    const retry = UrlFetchApp.fetch(config.endpointUrl, options)
    if (retry.getResponseCode() < 200 || retry.getResponseCode() >= 300) {
      throw new Error(`Gather & Savor retry failed with status ${retry.getResponseCode()}.`)
    }
  }
}

function buildPayload_(event, config) {
  const response = event?.response
  const itemResponses = response?.getItemResponses() || []
  const answers = itemResponses.map((item) => ({
    itemId: String(item.getItem().getId()),
    title: item.getItem().getTitle(),
    response: safeAnswer_(item.getResponse()),
  }))

  return {
    connectionId: config.connectionId,
    eventId: config.eventId,
    formId: config.formId,
    responseId: response ? String(response.getId()) : `manual-${Date.now()}`,
    receivedAt: new Date().toISOString(),
    answers,
  }
}

function safeAnswer_(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).slice(0, 1000))
  return String(value || '').slice(0, 2000)
}

function validateGatherSavorConfig_() {
  const props = PropertiesService.getScriptProperties()
  const config = Object.fromEntries(Object.entries(CONFIG_KEYS).map(([key, prop]) => [key, props.getProperty(prop)]))
  if (!/^https:\/\/.+/.test(config.endpointUrl || '')) throw new Error('GSV_ENDPOINT_URL must be an HTTPS URL.')
  if (!config.sharedSecret || config.sharedSecret.length < 32) throw new Error('GSV_SHARED_SECRET must be at least 32 characters.')
  if (!config.connectionId) throw new Error('GSV_CONNECTION_ID is required.')
  if (!config.eventId) throw new Error('GSV_EVENT_ID is required.')
  if (!config.formId) throw new Error('GSV_FORM_ID is required.')
  return config
}

function sign_(message, secret) {
  const raw = Utilities.computeHmacSha256Signature(message, secret)
  return raw.map((byte) => (`0${(byte & 0xff).toString(16)}`).slice(-2)).join('')
}
