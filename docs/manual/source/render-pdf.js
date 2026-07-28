const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fileUrl = 'file:///' + path.resolve(__dirname, 'manual-final.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.pdf({
    path: path.join(__dirname, 'Manual-Operador-4K-POS.pdf'),
    format: 'Letter',
    printBackground: true,
    margin: { top: '20mm', bottom: '22mm', left: '18mm', right: '18mm' },
    outline: true,
  });
  console.log('pdf done');
  await browser.close();
})();
