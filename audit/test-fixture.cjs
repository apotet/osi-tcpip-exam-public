const { test: base, expect } = require('@playwright/test');
// Every automated browser test replaces the deployed counter config, even if a
// real ID is installed later. Enabled analytics tests use a synthetic fixture ID
// and a local ym spy; the real SDK is never downloaded by the matrix.
const test = base.extend({
  analyticsEnabled: [false, { option: true }],
  page: async ({ page, analyticsEnabled }, use) => {
    await page.route('**/analytics/config.js', route => route.fulfill({
      contentType: 'application/javascript',
      body: `window.SITE_ANALYTICS_CONFIG={counterId:${analyticsEnabled ? '123456789' : 'null'}};`
    }));
    await page.route('https://mc.yandex.ru/**', route => route.fulfill({
      contentType: 'application/javascript', body: '/* SDK intercepted; no real Yandex request. */'
    }));
    await use(page);
  }
});
module.exports = { test, expect };
