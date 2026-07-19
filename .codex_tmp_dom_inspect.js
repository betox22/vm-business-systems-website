const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await page.goto('https://vmbusinesssystems.com/client/setup/?test-login=1&logout=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const dom = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll('button')].map((b, i) => ({i, id:b.id, cls:b.className, text:b.innerText, hidden:b.hidden, disabled:b.disabled, display:getComputedStyle(b).display, visibility:getComputedStyle(b).visibility})).slice(0,50),
    inputs: [...document.querySelectorAll('input,textarea')].map((el, i) => ({i, id:el.id, name:el.name, type:el.type, placeholder:el.placeholder, hidden:el.hidden, disabled:el.disabled, value:el.value, display:getComputedStyle(el).display, visibility:getComputedStyle(el).visibility})).slice(0,80),
    body: document.body.innerText.slice(0,2000),
    storage: Object.fromEntries(['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft','lumaClientAccessToken'].map(k=>[k, localStorage.getItem(k)]))
  }));
  console.log(JSON.stringify(dom, null, 2));
  await browser.close();
})().catch(err => { console.error(err.stack || err.message); process.exit(1); });
