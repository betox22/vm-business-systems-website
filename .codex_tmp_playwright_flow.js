const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const logs = [];
  const requests = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text(), location: msg.location() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.stack || err.message }));
  page.on('requestfailed', req => requests.push({ phase: 'requestfailed', method: req.method(), url: req.url(), failure: req.failure()?.errorText }));
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/') || url.includes('/ai/') || url.includes('kreaton-lyra-api') || url.includes('vmbusinesssystems')) {
      requests.push({ phase: 'request', method: req.method(), url });
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('/api/') || url.includes('/ai/') || url.includes('kreaton-lyra-api')) {
      let body = '';
      try {
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('json') || ct.includes('text')) body = (await res.text()).slice(0, 12000);
      } catch (e) { body = `<<body read failed: ${e.message}>>`; }
      requests.push({ phase: 'response', status: res.status(), url, body });
    }
  });

  await page.goto('https://vmbusinesssystems.com/client/setup/?test-login=1&logout=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const initialStorage = await page.evaluate(() => Object.fromEntries(['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft','lumaPendingGeneratedSite','lumaClientAccessToken','lumaClientRefreshToken'].map(k=>[k, localStorage.getItem(k)])));

  const email = `codex-bath-${Date.now()}@example.com`;
  await page.fill('#studioAuthEmail', email);
  await page.evaluate(() => document.querySelector('#studioEmailAuthForm')?.requestSubmit());
  await page.waitForTimeout(8000);
  const afterLoginText = await page.locator('body').innerText().catch(e => `<<body read failed: ${e.message}>>`);
  const afterLoginStorage = await page.evaluate(() => Object.fromEntries(['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft','lumaClientAccessToken'].map(k=>[k, localStorage.getItem(k)])));

  const message = 'quiero una pagina web para vender mi catalogo de jabones velas y bombas de bano, ofrecer ofertas bundles etc se va a llamar bath all day';
  await page.waitForSelector('#guidedReply', { state: 'visible', timeout: 30000 });
  await page.fill('#guidedReply', message);
  await page.click('#guidedSendButton');
  await page.waitForTimeout(16000);
  const afterFirstText = await page.locator('body').innerText().catch(e => `<<body read failed: ${e.message}>>`);
  const afterFirstStorage = await page.evaluate(() => Object.fromEntries(['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft'].map(k=>[k, localStorage.getItem(k)])));

  await page.fill('#guidedReply', 'sáltalo por ahora');
  await page.click('#guidedSendButton');
  await page.waitForTimeout(12000);

  requests.push({ phase: 'marker', url: '---BEFORE_GENERATE_CLICK---' });
  const beforeClickCount = requests.length;
  const genVisible = await page.locator('#guidedGenerateButton').isVisible().catch(() => false);
  const genText = await page.locator('#guidedGenerateButton').innerText().catch(() => '');
  if (genVisible) await page.click('#guidedGenerateButton').catch(e => logs.push({ type: 'click-error', text: e.message }));
  await page.waitForTimeout(35000);

  const finalStorage = await page.evaluate(() => Object.fromEntries(['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft','lumaPendingGeneratedSite'].map(k=>[k, localStorage.getItem(k)])));
  const finalText = await page.locator('body').innerText().catch(e => `<<body read failed: ${e.message}>>`);
  console.log('---EMAIL---'); console.log(email);
  console.log('---INITIAL_LOCALSTORAGE---'); console.log(JSON.stringify(initialStorage, null, 2));
  console.log('---AFTER_LOGIN_TEXT_HEAD---'); console.log(afterLoginText.slice(0, 1500));
  console.log('---AFTER_LOGIN_LOCALSTORAGE---'); console.log(JSON.stringify(afterLoginStorage, null, 2));
  console.log('---AFTER_FIRST_TEXT_HEAD---'); console.log(afterFirstText.slice(0, 3000));
  console.log('---AFTER_FIRST_LOCALSTORAGE---'); console.log(JSON.stringify(afterFirstStorage, null, 2));
  console.log('---GENERATE_BUTTON---'); console.log(JSON.stringify({ genVisible, genText }, null, 2));
  console.log('---REQUESTS_AFTER_CLICK---'); console.log(JSON.stringify(requests.slice(beforeClickCount), null, 2));
  console.log('---ALL_RELEVANT_REQUESTS---'); console.log(JSON.stringify(requests, null, 2));
  console.log('---CONSOLE_LOGS---'); console.log(JSON.stringify(logs, null, 2));
  console.log('---FINAL_LOCALSTORAGE---'); console.log(JSON.stringify(finalStorage, null, 2));
  console.log('---FINAL_VISIBLE_TEXT_HEAD---'); console.log(finalText.slice(0, 5000));
  await browser.close();
})().catch(err => { console.error('SCRIPT_ERROR', err.stack || err.message); process.exit(1); });
