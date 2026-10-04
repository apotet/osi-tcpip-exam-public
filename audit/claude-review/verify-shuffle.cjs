// Focused content-review evidence, separate from the Stage 1 acceptance matrix.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../..');
const output = path.resolve(process.env.AUDIT_RUN_DIR || path.join(root, 'audit/runs/claude-review-20261004'));
fs.mkdirSync(output, { recursive: true });
const scope = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'quiz/questions.js'), 'utf8'), scope);
const bank = JSON.parse(JSON.stringify(scope.window.QUESTION_BANK));
const result = { browser: 'chromium', viewport: { width: 390, height: 844 },
  scope: 'Real UI, controlled copies of real single/multiple question records; seeded RNG. Not a full acceptance run or semantic answer validation.',
  pass: 0, fail: 0, skip: 0, cases: [] };
(async () => {
  const browser = await chromium.launch();
  try {
    for (const id of ['l1-01', 'l1-04']) {
      const source = bank.find(q => q.id === id);
      assert(source);
      const fixtures = Array.from({ length: 10 }, (_, i) => ({ ...source, id: `shuffle-${i}`, family: `shuffle-${i}` }));
      const context = await browser.newContext({ viewport: result.viewport });
      await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.route('**/quiz/questions.js', r => r.fulfill({ contentType: 'application/javascript', body: `window.QUESTION_BANK=${JSON.stringify(fixtures)};` }));
      await page.addInitScript(() => {
        let seed = 20261004;
        Math.random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
      });
      const observations = [];
      try {
        await page.goto('http://127.0.0.1:4173/');
        for (let attempt = 0; attempt < 4; attempt++) {
          if (attempt === 0) {
            await page.selectOption('#modeSelect', 'l1-l2');
            await page.click('#startButton');
          } else {
            await page.click('#retryButton');
          }
          for (let question = 0; question < 10; question++) {
            const rows = await page.locator('#answersForm label').evaluateAll(labels => labels.map(label => ({
              original: Number(label.querySelector('input').value),
              text: label.querySelector('.answer-text').textContent,
              type: label.querySelector('input').type
            })));
            assert.deepEqual(rows.map(r => r.original).sort((a,b) => a-b), source.answers.map((_, i) => i));
            for (const row of rows) {
              assert.equal(row.text, source.answers[row.original]);
              assert.equal(row.type, source.correct.length > 1 ? 'checkbox' : 'radio');
            }
            const correct = question % 2 === 0;
            const chosen = correct ? [...source.correct] : [source.answers.findIndex((_, i) => !source.correct.includes(i))];
            for (const value of chosen) await page.locator('#answersForm label').filter({ has: page.locator(`input[value="${value}"]`) }).click();
            await page.click('#checkButton');
            assert.equal(await page.locator('#feedback').getAttribute('class'), `feedback ${correct ? 'good' : 'bad'}`);
            observations.push({ attempt, question, order: rows.map(r => r.original), chosen, correct });
            await page.click('#nextButton');
          }
          assert.equal(await page.locator('#resultScore').textContent(), '5 из 10');
        }
        const orders = new Set(observations.map(r => r.order.join(',')));
        assert(orders.size > 1, 'Answer order did not vary');
        assert.deepEqual(errors, []);
        result.cases.push({ id, status: 'pass', uniqueOrders: orders.size, observations });
        result.pass++;
      } catch (error) {
        result.cases.push({ id, status: 'fail', error: error.stack, observations, consoleErrors: errors });
        result.fail++;
      } finally {
        await context.tracing.stop({ path: path.join(output, `${id}-shuffle-trace.zip`) });
        await context.close();
      }
    }
  } finally {
    await browser.close();
    fs.writeFileSync(path.join(output, 'shuffle-results.json'), JSON.stringify(result, null, 2) + '\n');
  }
  console.log(JSON.stringify({ pass: result.pass, fail: result.fail, skip: result.skip, cases: result.cases.map(({ id, status, uniqueOrders, error }) => ({ id, status, uniqueOrders, error })), output }, null, 2));
  process.exitCode = result.fail ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
