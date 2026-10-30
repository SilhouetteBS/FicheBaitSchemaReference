// Shared by the browser policy and Vite. No credentials belong in VITE_* values.
export function getDiagnosticsConfig(env = {}) {
  if (env.VITE_SENTRY_ENABLED !== 'true' || env.VITE_ENABLE_EDITING === 'true') return null;
  const release = env.VITE_SENTRY_RELEASE;
  const environment = env.VITE_SENTRY_ENVIRONMENT;
  if (!/^schema-reference@[a-zA-Z0-9._-]{7,100}$/.test(release ?? '')) return null;
  if (!['staging', 'production'].includes(environment)) return null;
  try {
    const dsn = new URL(env.VITE_SENTRY_DSN);
    if (dsn.protocol !== 'https:' || dsn.password || dsn.port || dsn.search || dsn.hash
      || !/^o\d+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(dsn.hostname)
      || !/^[a-f0-9]{32}$/i.test(dsn.username) || !/^\/\d+$/.test(dsn.pathname)) return null;
    return { dsn: dsn.href, origin: dsn.origin, release, environment };
  } catch { return null; }
}
