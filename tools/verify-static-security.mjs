import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const requiredCspParts = [
  'Content-Security-Policy',
  "default-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];
const missing = requiredCspParts.filter((part) => !html.includes(part));

if (missing.length > 0) {
  console.error(`Static security metadata missing: ${missing.join(', ')}`);
  process.exit(1);
}

if (html.includes('frame-ancestors')) {
  console.error('frame-ancestors must be sent as an HTTP CSP header, not a meta directive.');
  process.exit(1);
}

console.log('Static security metadata verified.');
