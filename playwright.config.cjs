const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  outputDir: `${process.env.AUDIT_RUN_DIR||'audit/results'}/test-results`, testDir: './audit', timeout: 180000, workers: 3,
  reporter: [['list'], ['json', { outputFile: `${process.env.AUDIT_RUN_DIR||'audit/results'}/browser.json` }]],
  use: { baseURL: 'http://127.0.0.1:4173', actionTimeout: 10000, screenshot: 'only-on-failure', trace: process.env.AUDIT_FINAL ? 'on' : 'retain-on-failure' },
  webServer: { command: 'python3 -m http.server 4173 --bind 127.0.0.1', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI },
  projects: ['chromium', 'webkit', 'firefox'].flatMap(browserName =>
    [[360,800],[390,844],[430,932],[768,1024],[1440,900]].map(([width,height]) => ({
      name: `${browserName}-${width}`, use: { browserName, viewport: { width,height }, hasTouch: width < 768,
        launchOptions: browserName==='webkit' && process.env.AUDIT_WEBKIT_EXECUTABLE ? {executablePath:process.env.AUDIT_WEBKIT_EXECUTABLE} : {} }
    })))
});
