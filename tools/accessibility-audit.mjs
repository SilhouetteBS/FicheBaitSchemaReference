import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:4177';
const screenshotDir = process.env.ACCESSIBILITY_SCREENSHOT_DIR;
const executablePath = process.env.CHROME_PATH || undefined;

function parseRgb(value) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function channelToLinear(value) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(rgb) {
  const [r, g, b] = rgb.map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const foregroundLum = luminance(foreground);
  const backgroundLum = luminance(background);
  const light = Math.max(foregroundLum, backgroundLum);
  const dark = Math.min(foregroundLum, backgroundLum);
  return (light + 0.05) / (dark + 0.05);
}

function isEffectivelyZeroDuration(value) {
  return value.split(',').every((duration) => {
    const trimmed = duration.trim();
    if (trimmed.endsWith('ms')) {
      return Number(trimmed.replace('ms', '')) <= 1;
    }
    if (trimmed.endsWith('s')) {
      return Number(trimmed.replace('s', '')) <= 0.001;
    }
    return trimmed === '0';
  });
}

async function snapshot(page, label) {
  if (!screenshotDir) {
    return;
  }
  fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.join(screenshotDir, `${label}.png`), fullPage: true });
}

async function assertAxe(page, label) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.length,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target),
    summaries: violation.nodes.map((node) => node.failureSummary),
  }));
  assert.deepEqual(violations, [], `${label} must have no automated accessibility violations`);
}

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : {}),
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(appUrl, { waitUntil: 'networkidle' });

  const unlabeledIconButtons = await page.locator('button').evaluateAll((buttons) =>
    buttons
      .filter((button) => button.querySelector('svg'))
      .filter((button) => !button.textContent.trim())
      .filter((button) => !button.getAttribute('aria-label') && !button.getAttribute('title'))
      .map((button) => button.outerHTML.slice(0, 180)),
  );
  assert.deepEqual(unlabeledIconButtons, [], 'Icon-only buttons must have an aria-label or title');

  const unlabeledInputs = await page.locator('input, select, textarea').evaluateAll((controls) =>
    controls
      .filter((control) => {
        const id = control.getAttribute('id');
        const explicit = id && globalThis.document.querySelector(`label[for="${globalThis.CSS.escape(id)}"]`);
        const implicit = control.closest('label');
        const aria = control.getAttribute('aria-label') || control.getAttribute('aria-labelledby');
        return !explicit && !implicit && !aria;
      })
      .map((control) => control.outerHTML.slice(0, 180)),
  );
  assert.deepEqual(unlabeledInputs, [], 'Inputs and selects must have visible, implicit, or ARIA labels');

  const nestedInteractiveControls = await page.locator('button button, button [role="button"], [role="button"] button').count();
  assert.equal(nestedInteractiveControls, 0, 'Interactive controls must not be nested');

  await page.keyboard.press('Tab');
  const focusedControl = await page.evaluate(() => {
    const element = globalThis.document.activeElement;
    const style = globalThis.getComputedStyle(element);
    return {
      tagName: element?.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });
  assert.notEqual(focusedControl.tagName, 'BODY', 'Keyboard tab should focus the first interactive control');
  assert.ok(
    focusedControl.outlineStyle !== 'none' ||
      focusedControl.outlineWidth !== '0px' ||
      focusedControl.boxShadow !== 'none',
    'Focused controls must have a visible focus style',
  );

  const contrastChecks = await page.evaluate(() => {
    function getEffectiveBackgroundColor(element) {
      let current = element;
      while (current) {
        const style = globalThis.getComputedStyle(current);
        if (!/rgba?\(0,\s*0,\s*0,\s*0\)|transparent/i.test(style.backgroundColor)) {
          return style.backgroundColor;
        }
        current = current.parentElement;
      }
      return 'rgb(255, 255, 255)';
    }

    const selectors = ['.brand h1', '.sidebar-view-nav button.selected', '.warning-banner p', '.table-item.selected span:nth-child(2)'];
    return selectors.map((selector) => {
      const element = globalThis.document.querySelector(selector);
      if (!(element instanceof globalThis.Element)) {
        return {
          selector,
          missing: true,
        };
      }
      const style = globalThis.getComputedStyle(element);
      return {
        selector,
        color: style.color,
        backgroundColor: getEffectiveBackgroundColor(element),
      };
    });
  });
  for (const check of contrastChecks) {
    assert.equal(check.missing, undefined, `${check.selector} must exist for contrast checks`);
    const color = parseRgb(check.color);
    const backgroundColor = parseRgb(check.backgroundColor);
    assert.ok(color && backgroundColor, `${check.selector} must expose computable colors`);
    assert.ok(
      contrastRatio(color, backgroundColor) >= 4.5,
      `${check.selector} text contrast must meet WCAG AA for normal text`,
    );
  }

  const reducedMotionDurations = await page.locator('*').evaluateAll((elements) =>
    elements
      .map((element) => {
        const style = globalThis.getComputedStyle(element);
        return {
          element: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length > 0 ? `.${[...element.classList].join('.')}` : ''}`,
          animationDuration: style.animationDuration,
          transitionDuration: style.transitionDuration,
        };
      }),
  );
  const reducedMotionViolations = reducedMotionDurations.filter((style) =>
    !isEffectivelyZeroDuration(style.animationDuration) ||
    !isEffectivelyZeroDuration(style.transitionDuration),
  );
  assert.deepEqual(reducedMotionViolations, [], 'Reduced-motion mode should disable transitions and animations');

  await snapshot(page, 'desktop-accessibility');
  await assertAxe(page, 'Tables view');

  const selectedTableButton = page.locator('.table-item-main[aria-current="page"]');
  assert.equal(await selectedTableButton.count(), 1, 'The selected table must expose aria-current="page"');

  const tableTabs = page.getByRole('tab');
  assert.equal(await tableTabs.count(), 6, 'Table details must expose six tabs');
  assert.equal(await tableTabs.nth(0).getAttribute('aria-selected'), 'true');
  assert.equal(await tableTabs.nth(0).getAttribute('tabindex'), '0');
  assert.equal(await tableTabs.nth(1).getAttribute('tabindex'), '-1');
  await tableTabs.nth(0).focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await tableTabs.nth(1).getAttribute('aria-selected'), 'true', 'ArrowRight must select the next tab');
  assert.equal(await tableTabs.nth(1).evaluate((element) => element === globalThis.document.activeElement), true);
  const activePanel = page.getByRole('tabpanel');
  assert.equal(await activePanel.count(), 1, 'Exactly one table detail panel must be active');
  assert.equal(await activePanel.getAttribute('aria-labelledby'), await tableTabs.nth(1).getAttribute('id'));
  await page.keyboard.press('Home');
  assert.equal(await tableTabs.nth(0).getAttribute('aria-selected'), 'true', 'Home must select the first tab');

  await page.getByRole('button', { name: 'Metadata details' }).click();
  const infoTooltip = page.locator('.info-tooltip').first();
  await infoTooltip.waitFor();
  const tooltipId = await infoTooltip.getAttribute('aria-describedby');
  assert.ok(tooltipId, 'Information buttons must reference their tooltip text');
  const tooltipText = page.locator(`[id="${tooltipId}"]`);
  assert.equal(await infoTooltip.getAttribute('aria-expanded'), 'false');
  assert.equal(await tooltipText.getAttribute('role'), 'tooltip');
  await infoTooltip.focus();
  assert.equal(await infoTooltip.getAttribute('aria-expanded'), 'true', 'Focus must open an information tooltip');
  await page.keyboard.press('Escape');
  assert.equal(await infoTooltip.getAttribute('aria-expanded'), 'false', 'Escape must close an information tooltip');
  await infoTooltip.click();
  assert.equal(await infoTooltip.getAttribute('aria-expanded'), 'true', 'Click must pin an information tooltip open');
  await page.locator('body').click({ position: { x: 4, y: 4 } });
  assert.equal(await infoTooltip.getAttribute('aria-expanded'), 'false', 'An outside click must close an information tooltip');

  for (const view of ['compare', 'diagram', 'objects', 'impact', 'health', 'dependencies', 'reporting']) {
    const viewUrl = new URL(appUrl);
    viewUrl.searchParams.set('view', view);
    await page.goto(viewUrl.toString(), { waitUntil: 'networkidle' });
    await assertAxe(page, `${view} view`);

    if (view === 'diagram') {
      for (const menuLabel of ['Diagram presets', 'Export diagram', 'Diagram options']) {
        const menuTrigger = page.locator(`summary[aria-label="${menuLabel}"]`);
        await menuTrigger.click();
        assert.equal(await menuTrigger.locator('xpath=..').getAttribute('open'), '', `${menuLabel} must open its menu`);
        await assertAxe(page, `${menuLabel} menu`);
      }
    }
  }

  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Command' }).click();
  assert.equal(await page.getByRole('dialog', { name: 'Command palette' }).count(), 1, 'Command must open an accessible dialog');
  await assertAxe(page, 'Command palette dialog');
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog', { name: 'Command palette' }).count(), 0, 'Escape must close the command dialog');

  const viewports = [
    ['tablet', { width: 900, height: 1100 }],
    ['mobile', { width: 390, height: 900 }],
  ];
  for (const [label, viewport] of viewports) {
    await page.setViewportSize(viewport);
    await page.reload({ waitUntil: 'networkidle' });
    assert.ok(await page.locator('h1').isVisible(), `${label} viewport must render the app heading`);
    assert.equal(await page.locator('body').evaluate((body) => body.scrollWidth <= globalThis.innerWidth + 1), true);
    await snapshot(page, `${label}-accessibility`);
  }
  await context.close();
} finally {
  await browser.close();
}

console.log('Accessibility audit passed.');
