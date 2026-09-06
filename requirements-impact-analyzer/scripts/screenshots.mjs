import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd(), 'requirements-impact-analyzer');
const output = path.join(root, 'docs', 'screenshots');
await mkdir(output, { recursive: true });

const browser = await chromium.launch({ headless: true });
const consoleErrors = [];
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
desktop.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
desktop.on('pageerror', error => consoleErrors.push(error.message));

const views = [
  ['overview', '01-overview.png'],
  ['input', '02-input.png'],
  ['changes', '03-changes.png'],
  ['impact', '04-impact-map.png'],
  ['trace', '05-traceability.png']
];

for (const [view, filename] of views) {
  await desktop.goto(`http://127.0.0.1:4173/?view=${view}`, { waitUntil: 'networkidle' });
  await desktop.waitForSelector(`[data-view-panel="${view}"].active`);
  const overflow = await desktop.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error(`Desktop horizontal overflow detected: ${view}`);
  await desktop.screenshot({ path: path.join(output, filename), fullPage: false });
}

const smoke = await desktop.evaluate(() => {
  document.querySelector('[data-view="input"]')?.click();
  const project = document.querySelector('#projectName');
  project.value = 'QA変更テスト';
  document.querySelector('#analysisForm')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  const result = {
    project: document.querySelector('#heroProjectName')?.textContent,
    changeCount: Number(document.querySelector('#navChangeCount')?.textContent || 0),
    taskCount: Number(document.querySelector('#navTaskCount')?.textContent || 0)
  };
  document.querySelector('[data-view="changes"]')?.click();
  const search = document.querySelector('#changeSearch');
  search.value = 'Slack';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  result.filteredChanges = document.querySelectorAll('.change-card').length;
  return result;
});

if (smoke.project !== 'QA変更テスト' || smoke.changeCount < 1 || smoke.taskCount < 1 || smoke.filteredChanges < 1) {
  throw new Error(`Desktop smoke test failed: ${JSON.stringify(smoke)}`);
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
for (const view of ['overview', 'input', 'changes', 'impact', 'tasks', 'trace']) {
  await mobile.goto(`http://127.0.0.1:4173/?view=${view}`, { waitUntil: 'networkidle' });
  await mobile.waitForSelector(`[data-view-panel="${view}"].active`);
  const overflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  if (overflow) throw new Error(`Mobile horizontal overflow detected: ${view}`);
}

await browser.close();
if (consoleErrors.length) throw new Error(`Browser errors: ${consoleErrors.join(' | ')}`);
console.log(JSON.stringify({ desktopViews: views.length, mobileViews: 6, ...smoke }, null, 2));
