import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import process from 'node:process';
import { getDiagnosticsConfig } from './src/diagnostics/config.js';

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env };
  const diagnostics = getDiagnosticsConfig(env);
  if (env.VITE_SENTRY_ENABLED === 'true' && !diagnostics && env.VITE_ENABLE_EDITING !== 'true') {
    throw new Error('Sentry requires a valid hosted DSN, staging/production environment and schema-reference@ build identifier.');
  }
  const upload = env.SENTRY_UPLOAD_SOURCEMAPS === 'true';
  if (upload && (!diagnostics || !env.SENTRY_AUTH_TOKEN || !env.SENTRY_ORG || !env.SENTRY_PROJECT)) {
    throw new Error('Source-map upload requires enabled diagnostics and SENTRY_AUTH_TOKEN, SENTRY_ORG and SENTRY_PROJECT.');
  }
  return {
    base: env.VITE_BASE_PATH ?? '/',
    plugins: [react(), {
      name: 'schema-diagnostics-csp',
      transformIndexHtml(html) {
        return diagnostics ? html.replace("connect-src 'self';", `connect-src 'self' ${diagnostics.origin};`) : html;
      },
    }, ...(diagnostics ? [sentryVitePlugin({
      telemetry: false,
      org: env.SENTRY_ORG, project: env.SENTRY_PROJECT, authToken: env.SENTRY_AUTH_TOKEN,
      release: { name: diagnostics.release, create: upload, finalize: upload },
      sourcemaps: { disable: upload ? false : 'disable-upload', assets: './dist/assets/**', filesToDeleteAfterUpload: './dist/assets/**/*.map' },
    })] : [])],
    build: { sourcemap: diagnostics && upload ? 'hidden' : false },
  };
});
