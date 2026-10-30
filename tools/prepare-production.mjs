import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const hash=crypto.createHash('sha256');
function scan(dir) { for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) { const p=path.join(dir,entry.name); if(entry.isDirectory()) scan(p); else {hash.update(p);hash.update(fs.readFileSync(p));} } }
scan('src');
for(const p of ['index.html','vite.config.js','package.json','package-lock.json',...(fs.existsSync('build.mjs')?['build.mjs']:[])]) {hash.update(p);hash.update(fs.readFileSync(p));}
const release='schema-reference@production-'+hash.digest('hex').slice(0,16);
fs.writeFileSync('.env.production', '# Public build configuration; no authentication token belongs here.\nVITE_SENTRY_ENABLED=true\nVITE_SENTRY_DSN=https://c21f6d622f662120ce7eabca2441701a@o4511389082648576.ingest.us.sentry.io/4512342792142848\nVITE_SENTRY_ENVIRONMENT=production\nVITE_SENTRY_RELEASE='+release+'\n');
console.log('Prepared '+release);
