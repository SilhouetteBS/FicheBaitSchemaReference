import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

const defaultChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chromePath = process.env.CHROME_PATH ?? (process.platform === 'win32' ? defaultChromePath : '');
const url = process.argv[2] ?? 'http://127.0.0.1:5173';
const outDir = process.argv[3] ?? 'tmp/render-check';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(chromePath && existsSync(chromePath) ? { executablePath: chromePath } : {}),
});

const page = await browser.newPage({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 1,
});

await page.goto(url, { waitUntil: 'networkidle' });

const result = {
  title: await page.title(),
  h1: await page.locator('h1').innerText(),
  tableHeading: await page.locator('.detail-heading h2').innerText(),
  hasSupportWarning: (await page.locator('.warning-banner').innerText()).includes(
    'consult your applicable license and support agreements',
  ),
  columnRows: await page.locator('.columns-table .table-row').count(),
};

await page.screenshot({
  path: `${outDir}/desktop.png`,
  fullPage: true,
});

await browser.close();
await writeFile(`${outDir}/result.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
