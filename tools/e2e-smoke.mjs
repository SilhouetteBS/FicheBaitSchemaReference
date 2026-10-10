import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4177';
const executablePath = process.env.CHROME_PATH || undefined;
const screenshotDir = process.env.E2E_SCREENSHOT_DIR;

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const consoleMessages = [];

async function saveFailureScreenshot(label) {
  if (!screenshotDir) {
    return;
  }
  fs.mkdirSync(screenshotDir, { recursive: true });
  const fileName = `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
  await page.screenshot({ path: path.join(screenshotDir, fileName), fullPage: true });
}

async function handleFailure(error) {
  try {
    await saveFailureScreenshot('e2e-failure');
    await browser.close();
  } catch {
    // Preserve the original failure below.
  }
  console.error(error);
  process.exit(1);
}

process.on('uncaughtException', handleFailure);
process.on('unhandledRejection', handleFailure);

page.on('console', (message) => {
  if (['error', 'warning'].includes(message.type())) {
    const text = message.text();
    if (!text.includes("The Content Security Policy directive 'frame-ancestors' is ignored")) {
      consoleMessages.push(`${message.type()}: ${text}`);
    }
  }
});

await page.goto(appUrl, { waitUntil: 'networkidle' });
assert.equal(await page.title(), 'FicheBait Schema Reference');
assert.equal(await page.getByRole('heading', { name: 'FicheBait Schema Reference', level: 1, exact: true }).count(), 1);
assert.equal(await page.getByRole('button', { name: 'Import', exact: true }).count(), 0);
assert.equal(await page.locator('.snapshot-details').count(), 0);
assert.equal(await page.getByRole('button', { name: 'Metadata details', exact: true }).getAttribute('aria-expanded'), 'false');
await page.getByRole('button', { name: 'Metadata details', exact: true }).click();
assert.equal(await page.getByRole('button', { name: 'Hide details', exact: true }).getAttribute('aria-expanded'), 'true');
assert.match(await page.locator('.snapshot-details').innerText(), /Export manifest and coverage/i);
assert.match(await page.locator('.snapshot-details').innerText(), /Product and version identity/i);
assert.match(await page.locator('.snapshot-details').innerText(), /Database role/i);
assert.match(await page.locator('.snapshot-details').innerText(), /Export script/i);

await page.getByRole('button', { name: 'Diagram', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.detail-surface h2').textContent(), 'Database diagram');
assert.match(await page.locator('.diagram-explainer').innerText(), /Foreign keys vs\. dependencies/i);
assert.match(await page.locator('.diagram-explainer').innerText(), /foreign keys are exported SQL constraints/i);
assert.ok((await page.locator('.diagram-box').count()) > 0);
assert.ok((await page.locator('.diagram-edge').count()) > 0);
assert.equal(await page.locator('.diagram-mini-map').count(), 1);
assert.equal(await page.getByRole('button', { name: 'Fit diagram', exact: true }).count(), 1);
assert.equal(await page.getByRole('button', { name: 'Fit selection', exact: true }).count(), 1);
assert.equal(await page.getByRole('button', { name: 'Reset view', exact: true }).count(), 1);
assert.equal(await page.getByRole('button', { name: 'Reset filters', exact: true }).count(), 1);
assert.equal(await page.getByRole('button', { name: 'Zoom in', exact: true }).getAttribute('title'), 'Zoom in');
assert.equal(await page.getByRole('button', { name: 'Fit diagram', exact: true }).getAttribute('title'), 'Fit diagram');
assert.equal(
  await page.locator('.diagram-mini-map').getAttribute('title'),
  'Diagram mini-map. Click to move the viewport.',
);
const miniMapPosition = await page.locator('.diagram-mini-map').evaluate((miniMap) => {
  const styles = globalThis.getComputedStyle(miniMap);
  return {
    bottom: styles.bottom,
    position: styles.position,
    right: styles.right,
  };
});
assert.deepEqual(miniMapPosition, { bottom: '24px', position: 'fixed', right: '24px' });
const miniMapRendering = await page.locator('.diagram-mini-map').evaluate((miniMap) => {
  const svg = miniMap.querySelector('svg');
  const viewport = miniMap.querySelector('.diagram-mini-map-viewport');
  return {
    preserveAspectRatio: svg?.getAttribute('preserveAspectRatio'),
    viewportStrokeWidth: globalThis.getComputedStyle(viewport).strokeWidth,
  };
});
assert.deepEqual(miniMapRendering, { preserveAspectRatio: 'none', viewportStrokeWidth: '2.5px' });
await page.locator('.diagram-options-menu summary').click();
assert.equal(await page.getByLabel('Curved lines').count(), 1);
await page.getByLabel('Curved lines').check();
assert.match(await page.locator('.diagram-lines path.diagram-edge').first().getAttribute('d'), /^M .+ C /);
assert.equal(await page.getByLabel('High contrast').count(), 1);
await page.getByLabel('High contrast').check();
assert.equal(await page.locator('.detail-surface.diagram-high-contrast').count(), 1);
const highContrastStroke = await page.locator('.diagram-lines path.diagram-edge').first().evaluate((edge) =>
  globalThis.getComputedStyle(edge).strokeWidth,
);
assert.equal(highContrastStroke, '1.8px');
await page.getByLabel('High contrast').uncheck();
assert.deepEqual(
  await page.locator('.diagram-pan-controls button').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('aria-label')),
  ),
  ['Pan diagram left', 'Pan diagram up', 'Pan diagram down', 'Pan diagram right'],
);
assert.deepEqual(
  await page.locator('.diagram-pan-controls button').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('title')),
  ),
  ['Pan diagram left', 'Pan diagram up', 'Pan diagram down', 'Pan diagram right'],
);
const objectsTooltip = await page.evaluate(() =>
  globalThis.document.querySelector('.diagram-summary .metadata-stat:first-child .info-tooltip')?.getAttribute('aria-label'),
);
assert.match(objectsTooltip, /views, stored procedures, functions, and triggers/i);

await page.locator('.sidebar-diagnostics summary').click();
await page.getByRole('button', { name: 'Schema checks', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.detail-surface h2').textContent(), 'Schema checks');
assert.ok((await page.locator('.health-row').count()) > 0);

await page.getByRole('button', { name: 'Dependencies', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.detail-surface h2').textContent(), 'Dependency report');
assert.equal(await page.getByRole('button', { name: 'Export dependencies', exact: true }).count(), 1);
assert.match(await page.locator('.dependency-report-note').innerText(), /SQL Server dependency metadata/i);

await page.getByRole('button', { name: 'Reporting', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.detail-surface h2').textContent(), 'Reporting guide');
assert.equal(await page.locator('.reporting-workspace').count(), 1);
assert.match(await page.locator('.reporting-detail-pane').innerText(), /Reporting overview/i);
await page.locator('.reporting-nav button').filter({ hasText: 'Generated examples' }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.query-example').count(), 4);
await page.locator('.reporting-nav button').filter({ hasText: 'Forms active task and Monitor reporting' }).click();
await page.waitForTimeout(100);
assert.match(await page.locator('.reporting-detail-pane').innerText(), /Forms active task and Monitor reporting/i);
await page.getByRole('tab', { name: 'SQL', exact: true }).click();
await page.waitForTimeout(250);
await page.locator('.reporting-sql-highlight').waitFor();
assert.match(await page.locator('.reporting-sql-viewer').innerText(), /CREATE OR ALTER VIEW rpt\.vw_FormsActiveTasks/i);
assert.match(page.url(), /reporting=script%3Areporting%2Fforms%2Fforms-active-task-monitor\.sql/);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('.reporting-sql-highlight').waitFor();
assert.equal(
  await page.locator('.reporting-script-detail-heading h3').innerText(),
  'Forms active task and Monitor reporting',
);
await page.getByRole('tab', { name: 'Review notes', exact: true }).click();
await page.locator('.reporting-script-content.notes').waitFor();
assert.match(await page.locator('.reporting-script-content.notes').innerText(), /Forms Active Task/i);
await page.getByRole('tab', { name: 'Links to Resources', exact: true }).click();
await page.locator('.reporting-answers-links').waitFor();
assert.match(await page.locator('.reporting-answers-links').innerText(), /Forms Instance Monitoring/i);

await page.getByRole('button', { name: 'Tables', exact: true }).click();
const usersTableButton = page.locator('.table-item-main', {
  has: page.locator('.table-item-name[title="dbo.cf_users"]'),
});
await usersTableButton.waitFor();
await usersTableButton.click();
await page.waitForURL(/table=dbo\.cf_users/);
assert.equal(await page.getByRole('heading', { name: 'Manual documentation notes' }).count(), 0);
assert.equal(await page.getByText('Import notes', { exact: true }).count(), 0);
assert.match(page.url(), /table=dbo\.cf_users/);
await page.reload({ waitUntil: 'networkidle' });
assert.equal(await page.locator('.table-detail h2').textContent(), 'dbo.cf_users');
await page.getByRole('button', { name: 'Reporting', exact: true }).click();
await page.getByRole('heading', { name: 'Reporting guide' }).waitFor();
await page.goBack({ waitUntil: 'networkidle' });
await page.locator('.table-detail h2').waitFor();
assert.match(page.url(), /view=tables/);
assert.match(page.url(), /table=dbo\.cf_users/);
assert.equal(await page.locator('.table-detail h2').textContent(), 'dbo.cf_users');

const lfdsDiagramUrl = new URL(appUrl);
lfdsDiagramUrl.search = new URLSearchParams({
  product: 'lfds',
  version: '12.0.2506.370',
  view: 'diagram',
  diagramFocus: 'dbo.adgs_rules',
  diagramMode: 'focused',
  diagramEdges: 'foreignKey',
  diagramDepth: '2',
  diagramZoom: '1',
  diagramSecondHop: 'hidden',
}).toString();
await page.goto(lfdsDiagramUrl.toString(), { waitUntil: 'networkidle' });
const lfdsMiniMapViewport = await page.locator('.diagram-mini-map').evaluate((miniMap) => {
  const svg = miniMap.querySelector('svg');
  const viewport = miniMap.querySelector('.diagram-mini-map-viewport');
  const viewBoxHeight = Number(svg?.getAttribute('viewBox')?.split(/\s+/)[3] ?? 0);
  return {
    viewportHeight: Number(viewport?.getAttribute('height') ?? 0),
    viewBoxHeight,
  };
});
assert.ok(lfdsMiniMapViewport.viewportHeight > 0);
assert.ok(lfdsMiniMapViewport.viewportHeight < lfdsMiniMapViewport.viewBoxHeight);
assert.equal(await page.getByLabel('2-hop lines').isChecked(), false);
assert.match(page.url(), /diagramSecondHop=hidden/);
assert.equal(await page.locator('.relationship-group h4').count(), 1);
assert.match(await page.locator('.relationship-group h4').first().innerText(), /Foreign keys\s+2/i);
const relationshipPanelState = await page.locator('.diagram-relationship-panel').evaluate((panel) => {
  const styles = globalThis.getComputedStyle(panel);
  return {
    position: styles.position,
    top: styles.top,
  };
});
assert.deepEqual(relationshipPanelState, { position: 'sticky', top: '12px' });
const initialPanelWidth = await page.locator('.diagram-relationship-panel').evaluate((panel) =>
  Math.round(panel.getBoundingClientRect().width),
);
const initialRequestedPanelWidth = await page.locator('.diagram-stage').evaluate((stage) =>
  Number.parseInt(globalThis.getComputedStyle(stage).getPropertyValue('--relationship-panel-width'), 10),
);
const resizeHandle = page.getByRole('button', { name: /Resize focused relationship panel/ });
const resizeHandleBox = await resizeHandle.boundingBox();
assert.ok(resizeHandleBox);
await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2, resizeHandleBox.y + resizeHandleBox.height / 2);
await page.mouse.down();
await page.mouse.move(resizeHandleBox.x + resizeHandleBox.width / 2 + 80, resizeHandleBox.y + resizeHandleBox.height / 2);
await page.mouse.up();
await page.waitForTimeout(100);
const resizedPanelState = await page.locator('.diagram-stage').evaluate((stage) => ({
  renderedWidth: Math.round(stage.querySelector('.diagram-relationship-panel').getBoundingClientRect().width),
  requestedWidth: globalThis.getComputedStyle(stage).getPropertyValue('--relationship-panel-width').trim(),
}));
assert.ok(Number.parseInt(resizedPanelState.requestedWidth, 10) > initialRequestedPanelWidth);
assert.ok(resizedPanelState.renderedWidth > initialPanelWidth);
await page.getByRole('button', { name: 'Collapse relationship panel', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-stage.relationship-panel-collapsed').count(), 1);
assert.equal(await page.getByRole('button', { name: /Resize focused relationship panel/ }).count(), 0);
const collapsedPanelButtonPosition = await page.locator('.diagram-relationship-panel').evaluate((panel) => {
  const panelRect = panel.getBoundingClientRect();
  const buttonRect = panel.querySelector('.relationship-panel-toggle').getBoundingClientRect();
  return {
    nearTop: buttonRect.top - panelRect.top <= 14,
    centered: Math.abs((buttonRect.left + buttonRect.width / 2) - (panelRect.left + panelRect.width / 2)) <= 1,
  };
});
assert.deepEqual(collapsedPanelButtonPosition, { nearTop: true, centered: true });
await page.getByRole('button', { name: 'Expand relationship panel', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-stage.relationship-panel-collapsed').count(), 0);
const focusedHintLayout = await page.evaluate(() => {
  const hint = globalThis.document.querySelector('.diagram-scroll-hint')?.getBoundingClientRect();
  const scroll = globalThis.document.querySelector('.diagram-scroll-frame')?.getBoundingClientRect();
  return {
    topRight: Boolean(hint && scroll && hint.top - scroll.top <= 16 && scroll.right - hint.right <= 24),
    insideScroll: Boolean(hint && scroll && hint.left >= scroll.left && hint.right <= scroll.right && hint.bottom <= scroll.bottom),
  };
});
assert.deepEqual(focusedHintLayout, { topRight: true, insideScroll: true });
assert.ok((await page.locator('.diagram-edge-hit-target').count()) > 0);
await page.locator('.diagram-edge-hit-target').first().hover();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-selected').count(), 1);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Type\s+Foreign key/i);
await page.locator('.diagram-edge-hit-target').first().click();
await page.mouse.move(10, 10);
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-selected').count(), 1);
const selectedRelationshipIconAlignment = await page.locator('.relationship-selected-detail').evaluate((card) => {
  const getAlignment = (selector) => {
    const button = card.querySelector(selector);
    const icon = button?.querySelector('svg');
    const buttonRect = button.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    return {
      centerX: Math.abs((buttonRect.left + buttonRect.width / 2) - (iconRect.left + iconRect.width / 2)) <= 1,
      centerY: Math.abs((buttonRect.top + buttonRect.height / 2) - (iconRect.top + iconRect.height / 2)) <= 1,
    };
  };
  return {
    clear: getAlignment('.relationship-clear-button'),
    copy: getAlignment('.relationship-copy-button'),
  };
});
assert.deepEqual(selectedRelationshipIconAlignment, {
  clear: { centerX: true, centerY: true },
  copy: { centerX: true, centerY: true },
});
await page.getByRole('button', { name: 'Clear selected relationship', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-selected').count(), 0);
await page.locator('.relationship-detail').first().hover();
await page.waitForTimeout(100);
assert.equal(
  await page.getByRole('button', { name: 'Copy relationship name', exact: true }).getAttribute('title'),
  'Copy relationship name',
);
const hoverState = await page.evaluate(() => ({
  selected: [...globalThis.document.querySelectorAll('.diagram-lines path.diagram-edge-selected')].map((edge) => ({
    stroke: globalThis.getComputedStyle(edge).stroke,
    strokeWidth: globalThis.getComputedStyle(edge).strokeWidth,
    markerEnd: edge.getAttribute('marker-end'),
  })),
  dimmed: [...globalThis.document.querySelectorAll('path.diagram-edge-dimmed')].map((edge) => ({
    stroke: globalThis.getComputedStyle(edge).stroke,
    strokeWidth: globalThis.getComputedStyle(edge).strokeWidth,
    opacity: globalThis.getComputedStyle(edge).opacity,
  })),
  labels: [...globalThis.document.querySelectorAll('.diagram-edge-label')].map((label) => label.textContent),
  cardinalityLabels: [...globalThis.document.querySelectorAll('.diagram-cardinality-label')].map(
    (label) => label.textContent,
  ),
  selectedCardinalityLabels: [...globalThis.document.querySelectorAll('.diagram-cardinality-label-selected')].map(
    (label) => ({
      fill: globalThis.getComputedStyle(label).fill,
      text: label.textContent,
    }),
  ),
  titles: [...globalThis.document.querySelectorAll('.diagram-lines g title')].map((title) => title.textContent),
}));
assert.ok(hoverState.selected.some((edge) => edge.stroke === 'rgb(227, 82, 5)' && edge.strokeWidth === '5px'));
assert.ok(hoverState.selected.every((edge) => edge.markerEnd === 'url(#diagram-arrow-selected)'));
assert.ok(hoverState.dimmed.some((edge) => edge.stroke === 'rgb(170, 180, 188)' && edge.strokeWidth === '1.25px'));
assert.ok(hoverState.labels.some((label) => /container_id -> id|provider_id -> id/.test(label)));
assert.ok(hoverState.cardinalityLabels.includes('many'));
assert.ok(hoverState.cardinalityLabels.includes('one'));
assert.ok(hoverState.selectedCardinalityLabels.some((label) => label.text === 'many' && label.fill === 'rgb(143, 52, 0)'));
assert.ok(hoverState.selectedCardinalityLabels.some((label) => label.text === 'one' && label.fill === 'rgb(143, 52, 0)'));
assert.ok(hoverState.titles.some((title) => /Status: Exported SQL foreign key constraint/.test(title)));
const layerOrder = await page.evaluate(() => ({
  highlightZ: Number.parseInt(globalThis.getComputedStyle(globalThis.document.querySelector('.diagram-highlight-lines')).zIndex, 10),
  focusedBoxZ: Number.parseInt(globalThis.getComputedStyle(globalThis.document.querySelector('.diagram-node-focused')).zIndex, 10),
}));
assert.ok(layerOrder.highlightZ > layerOrder.focusedBoxZ);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Type\s+Foreign key/i);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Status\s+Confirmed/i);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Source\s+container_id|Source\s+provider_id/i);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Target\s+id/i);
await page.locator('.relationship-detail').first().click();
await page.mouse.move(10, 10);
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-selected').count(), 1);
assert.equal(await page.locator('.diagram-edge-label').count(), 1);
await page.getByRole('button', { name: 'Clear selected relationship', exact: true }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-selected').count(), 0);
assert.equal(await page.locator('.relationship-selected-detail').count(), 0);
const arrowMarkers = await page.evaluate(() => ({
  foreignKey: globalThis.document.querySelector('path.diagram-edge-foreignKey')?.getAttribute('marker-end'),
  dependency: globalThis.document.querySelector('path.diagram-edge-dependency')?.getAttribute('marker-end'),
  focus: globalThis.document.querySelector('path.diagram-edge-highlight-overlay')?.getAttribute('marker-end'),
}));
assert.equal(arrowMarkers.foreignKey, 'url(#diagram-arrow-fk)');
assert.equal(arrowMarkers.focus, 'url(#diagram-arrow-focus)');
await page.getByRole('button', { name: /Incoming/i }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.relationship-detail').count(), 0);
await page.getByRole('button', { name: /Outgoing/i }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.relationship-detail').count(), 2);
await page.locator('.relationship-direction-filters').getByRole('button', { name: /All/i }).click();
await page.waitForTimeout(100);
await page.locator('.diagram-relationship-panel .relationship-quick-filters').first()
  .getByRole('button', { name: /Dependencies/i })
  .click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-dependency').count(), 1);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-dependency').first().getAttribute('marker-end'), 'url(#diagram-arrow-dependency)');
assert.match(await page.locator('.relationship-group h4').first().innerText(), /Dependencies\s+1/i);
await page.locator('.diagram-relationship-panel .relationship-quick-filters').first()
  .getByRole('button', { name: /Foreign keys/i })
  .click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-lines path.diagram-edge-foreignKey').count(), 2);

const lfdsDependencyUrl = new URL(appUrl);
lfdsDependencyUrl.search = new URLSearchParams({
  product: 'lfds',
  version: '12.0.2506.370',
  view: 'diagram',
  diagramFocus: 'dbo.adgs_rules',
  diagramMode: 'focused',
  diagramEdges: 'dependency',
  diagramDepth: '1',
  diagramZoom: '1',
}).toString();
await page.goto(lfdsDependencyUrl.toString(), { waitUntil: 'networkidle' });
assert.equal(await page.locator('.diagram-lines path.diagram-edge-dependency').count(), 1);
assert.ok((await page.locator('.diagram-object-badge-routine').count()) > 0);
assert.match(await page.locator('.relationship-detail-list').innerText(), /DEPENDED ON BY/i);
assert.equal(await page.locator('.diagram-status-row').count(), 0,
  'An expected check-constraint reference must not display a missing-object warning');
await page.locator('.relationship-detail').first().hover();
await page.waitForTimeout(100);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Status\s+Inferred/i);
assert.match(await page.locator('.relationship-selected-detail').innerText(), /Routine|Table/i);
assert.ok((await page.getByRole('button', { name: /^Copy relationship name$/ }).count()) > 0);
await page.getByRole('button', { name: /Open object details dbo\.create_adgs_rule/ }).click();
await page.waitForTimeout(100);
assert.match(await page.locator('.diagram-object-detail-panel').innerText(), /ROUTINE|Routine/i);
assert.match(await page.locator('.diagram-object-detail-panel').innerText(), /Definition preview/i);
assert.ok((await page.getByRole('button', { name: /Copy object key dbo\.create_adgs_rule/ }).count()) > 0);
assert.equal(
  await page.getByRole('button', { name: /Copy object key dbo\.create_adgs_rule/ }).getAttribute('title'),
  'Copy object key',
);
assert.equal(
  await page.getByRole('button', { name: /^Close object details$/ }).getAttribute('title'),
  'Close object details',
);
await page.getByRole('button', { name: /^Close object details$/ }).click();
await page.waitForTimeout(100);
assert.equal(await page.locator('.diagram-object-detail-panel').count(), 0);

const repositoryObjectUrl = new URL(appUrl);
repositoryObjectUrl.search = new URLSearchParams({
  product: 'repository',
  version: '11.0.2.338',
  view: 'objects',
}).toString();
await page.goto(repositoryObjectUrl.toString(), { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /triggers/i }).click();
await page.waitForTimeout(100);
await page.locator('.object-item').filter({ hasText: 'short_str_val_insert_update' }).click();
await page.waitForTimeout(100);
assert.match(await page.locator('.object-detail-panel').innerText(), /TRIGGER|Trigger/i);
assert.match(await page.locator('.object-detail-panel').innerText(), /Definition preview/i);
await page.getByRole('button', { name: /routines/i }).click();
await page.waitForTimeout(100);
await page.locator('.object-item').filter({ hasText: 'dbo.clone_entry' }).first().click();
await page.waitForTimeout(100);
assert.match(await page.locator('.object-detail-panel').innerText(), /routine|stored procedure|procedure/i);
assert.match(await page.locator('.object-detail-panel').innerText(), /clone_entry/i);

const repositoryViewDiagramUrl = new URL(appUrl);
repositoryViewDiagramUrl.search = new URLSearchParams({
  product: 'repository',
  version: '11.0.2.338',
  view: 'diagram',
  diagramMode: 'focused',
  diagramFocus: 'dbo.account_cache',
  diagramEdges: 'dependency',
  diagramDepth: '1',
  diagramZoom: '1',
}).toString();
await page.goto(repositoryViewDiagramUrl.toString(), { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Open object details dbo\.all_trustees/ }).click();
await page.waitForTimeout(100);
assert.match(await page.locator('.diagram-object-detail-panel').innerText(), /VIEW|View/i);
assert.match(await page.locator('.diagram-object-detail-panel').innerText(), /Definition preview/i);

const formsDiagramUrl = new URL(appUrl);
formsDiagramUrl.search = new URLSearchParams({
  product: 'forms',
  version: '12.0.2503.10378',
  view: 'diagram',
  diagramMode: 'full',
  diagramEdges: 'all',
  diagramTypes: 'table,view',
}).toString();
await page.goto(formsDiagramUrl.toString(), { waitUntil: 'networkidle' });
const legendRows = await page.locator('.diagram-legend-row').allTextContents();
assert.deepEqual(
  legendRows.map((row) => row.replace(/\s+/g, ' ').trim()),
  [
    'Foreign key Dependency Direct focused relationship',
    'Table View Routine Trigger',
  ],
);
assert.ok((await page.locator('.diagram-object-badge-view').count()) > 0);
assert.equal(await page.locator('.diagram-object-badge-routine').count(), 0);
assert.equal(await page.locator('.diagram-object-badge-trigger').count(), 0);
const objectCountBeforeConnectedOnly = await page.locator('.diagram-box').count();
await page.locator('.diagram-options-menu summary').click();
await page.getByLabel('Connected only').check();
await page.waitForTimeout(100);
assert.ok((await page.locator('.diagram-box').count()) < objectCountBeforeConnectedOnly);
assert.match(page.url(), /diagramConnectedOnly=true/);

await page.goto(appUrl, { waitUntil: 'networkidle' });
await page.locator('.sidebar-view-nav').getByRole('button', { name: 'Tables', exact: true }).click();
const tableBrowserPanel = page.locator('.table-browser-panel');
await page.locator('.table-item').first().waitFor();
const initialTableCount = await page.locator('.table-item').count();
await tableBrowserPanel.getByLabel('Confidence').selectOption('deprecated');
await page.waitForTimeout(100);
assert.ok((await page.locator('.table-item').count()) < initialTableCount);
await tableBrowserPanel.getByLabel('Confidence').selectOption('all');
await tableBrowserPanel.getByLabel('Notes').selectOption('manual');
await page.waitForTimeout(100);
assert.ok((await page.locator('.table-item').count()) <= initialTableCount);

await page.setViewportSize({ width: 760, height: 900 });
const mobileDiagramUrl = new URL(appUrl);
mobileDiagramUrl.search = new URLSearchParams({
  product: 'lfds',
  version: '12.0.2506.370',
  view: 'diagram',
}).toString();
await page.goto(mobileDiagramUrl.toString(), { waitUntil: 'networkidle' });
assert.equal(await page.locator('.diagram-mobile-message').isVisible(), true);
assert.equal(await page.locator('.diagram-stage').isVisible(), false);
assert.equal(await page.locator('.diagram-mini-map').isVisible(), false);
assert.deepEqual(consoleMessages, []);

await browser.close();
console.log(
  JSON.stringify(
    {
      appUrl,
      consoleMessages,
      hoverSelectedEdges: hoverState.selected.length,
      hoverDimmedEdges: hoverState.dimmed.length,
      legendRows: legendRows.length,
      restoredTable: 'dbo.cf_users',
    },
    null,
    2,
  ),
);
