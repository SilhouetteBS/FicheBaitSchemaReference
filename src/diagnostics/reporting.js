import * as Sentry from '@sentry/react';
import { getDiagnosticsConfig } from './config.js';
import { createEventGate, safeContext, sanitizeEvent } from './policy.js';

const config = getDiagnosticsConfig(import.meta.env);
const breadcrumbs = [];
let client;
const reportedFailures = new WeakSet();

export function initializeDiagnostics() {
  if (!config || client) return;
  try {
    const allow = createEventGate();
    client = Sentry.init({
      dsn: config.dsn, release: config.release, environment: config.environment,
      defaultIntegrations: false,
      integrations: [Sentry.globalHandlersIntegration({ onerror: true, onunhandledrejection: true })],
      sendDefaultPii: false, sendClientReports: false, autoSessionTracking: false,
      maxBreadcrumbs: 0,
      tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0,
      transportOptions: { bufferSize: 10, fetchOptions: { credentials: 'omit', referrerPolicy: 'no-referrer' } },
      beforeSend(event, hint) {
        try {
          if (hint.originalException?.name === 'AbortError') return null;
          const safe = sanitizeEvent(event, { config, origin: window.location.origin, breadcrumbs });
          return allow(safe, hint.originalException) ? safe : null;
        } catch { return null; }
      },
    });
  } catch { /* Diagnostics must never stop the application. */ }
}

export function diagnosticBreadcrumb(message, data = {}) {
  if (!client) return;
  breadcrumbs.push({ message, data: safeContext(data) });
  if (breadcrumbs.length > 20) breadcrumbs.shift();
}

export function reportFailure(error, operation, context = {}) {
  if (!client || error?.name === 'AbortError') return;
  try {
    let cause = error;
    for (let depth = 0; cause && typeof cause === 'object' && depth < 10; depth++, cause = cause.cause) {
      if (reportedFailures.has(cause)) return;
    }
    if (error && typeof error === 'object') reportedFailures.add(error);
    Sentry.captureException(error, { tags: { operation, ...safeContext(context) } });
  } catch { /* Best effort. Keep application recovery unchanged. */ }
}
