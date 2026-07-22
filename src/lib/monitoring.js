import * as Sentry from '@sentry/react'

function numberFromEnv(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function stripPrivateContext(event) {
  if (event.user) delete event.user
  if (event.request) {
    delete event.request.cookies
    delete event.request.data
    delete event.request.headers
  }
  return event
}

export function initializeMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return false

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_BUILD_COMMIT || undefined,
    sendDefaultPii: false,
    dataCollection: {
      userInfo: false,
      httpBodies: [],
    },
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: numberFromEnv(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 0.05),
    replaysSessionSampleRate: numberFromEnv(import.meta.env.VITE_SENTRY_REPLAY_SAMPLE_RATE, 0),
    replaysOnErrorSampleRate: numberFromEnv(import.meta.env.VITE_SENTRY_REPLAY_ON_ERROR_SAMPLE_RATE, 1),
    tracePropagationTargets: ['localhost', /^https:\/\/gathervibeshub\.web\.app/],
    enableLogs: true,
    beforeSend: stripPrivateContext,
    beforeSendTransaction: stripPrivateContext,
  })

  return true
}

export function captureAppError(error, context = {}) {
  if (!import.meta.env.VITE_SENTRY_DSN) return
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: context.componentStack || '',
      },
    },
  })
}
