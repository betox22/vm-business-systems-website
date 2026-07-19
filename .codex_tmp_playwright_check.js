const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const logs = [];
  const requests = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text(), location: msg.location() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: err.stack || err.message }));
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
        if (ct.includes('json') || ct.includes('text')) body = (await res.text()).slice(0, 6000);
      } catch (e) { body = `<<body read failed: ${e.message}>>`; }
      requests.push({ phase: 'response', status: res.status(), url, body });
    }
  });

  await page.goto('https://vmbusinesssystems.com/client/setup/?test-login=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);
  const initialStorage = await page.evaluate(() => {
    const keys = ['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft','lumaPendingGeneratedSite','lumaClientAccessToken','lumaClientRefreshToken'];
    return Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]));
  });
  const visibleText = await page.locator('body').innerText({ timeout: 10000 }).catch(e => `<<body read failed: ${e.message}>>`);
  console.log('---INITIAL_LOCALSTORAGE---');
  console.log(JSON.stringify(initialStorage, null, 2));
  console.log('---INITIAL_VISIBLE_TEXT_HEAD---');
  console.log(visibleText.slice(0, 2000));

  // Try to login if gate is present.
  const email = `codex-bath-${Date.now()}@example.com`;
  const emailInput = page.locator('input[type="email"], input[name*="email" i], #studioAuthEmail').first();
  if (await emailInput.count()) {
    await emailInput.fill(email);
    const enterButton = page.getByRole('button', { name: /enter|workspace|continue|iniciar|entrar|start/i }).first();
    if (await enterButton.count()) await enterButton.click();
    else await emailInput.press('Enter');
    await page.waitForTimeout(5000);
  }

  const message = 'quiero una pagina web para vender mi catalogo de jabones velas y bombas de bano, ofrecer ofertas bundles etc se va a llamar bath all day';
  const input = page.locator('textarea, input[placeholder*="answer" i], input[placeholder*="respuesta" i], .chat-composer textarea, .chat-composer input').last();
  await input.waitFor({ state: 'visible', timeout: 30000 });
  await input.fill(message);
  const sendButton = page.locator('button:has-text("➤"), button[aria-label*="send" i], button:has-text("Send"), button:has-text("Enviar")').last();
  if (await sendButton.count()) await sendButton.click(); else await input.press('Enter');
  await page.waitForTimeout(12000);

  // Answer logo question if a composer is still available.
  const bodyAfterFirst = await page.locator('body').innerText().catch(()=>'');
  const input2 = page.locator('textarea, input[placeholder*="answer" i], input[placeholder*="respuesta" i], .chat-composer textarea, .chat-composer input').last();
  if (await input2.count()) {
    await input2.fill('sáltalo por ahora');
    if (await sendButton.count()) await sendButton.click(); else await input2.press('Enter');
    await page.waitForTimeout(8000);
  }

  requests.push({ phase: 'marker', url: '---BEFORE_GENERATE_CLICK---' });
  const beforeClickCount = requests.length;
  const gen = page.getByRole('button', { name: /generate.*(website|site)|generate now|generate website now|generar/i }).first();
  const genCount = await gen.count();
  console.log('---GENERATE_BUTTON_COUNT---');
  console.log(genCount);
  if (genCount) {
    await gen.click({ timeout: 10000 }).catch(e => logs.push({ type: 'click-error', text: e.message }));
    await page.waitForTimeout(25000);
  }
  const finalStorage = await page.evaluate(() => {
    const keys = ['lumaPendingClientEmail','lumaClientIntakeSession','lumaGuidedDraft','lumaPendingGeneratedSite','lumaClientAccessToken','lumaClientRefreshToken'];
    return Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)]));
  });
  const finalText = await page.locator('body').innerText().catch(e => `<<body read failed: ${e.message}>>`);
  console.log('---FINAL_LOCALSTORAGE---');
  console.log(JSON.stringify(finalStorage, null, 2));
  console.log('---REQUESTS_AFTER_CLICK---');
  console.log(JSON.stringify(requests.slice(beforeClickCount), null, 2));
  console.log('---ALL_RELEVANT_REQUESTS---');
  console.log(JSON.stringify(requests, null, 2));
  console.log('---CONSOLE_LOGS---');
  console.log(JSON.stringify(logs, null, 2));
  console.log('---FINAL_VISIBLE_TEXT_HEAD---');
  console.log(finalText.slice(0, 4000));
  await browser.close();
})().catch(err => { console.error('SCRIPT_ERROR', err.stack || err.message); process.exit(1); });
