import { collectPresentation } from './graph-presentation-dom.mjs';

export async function enumeratePresentationStates(page, catalog) {
  const states = [];
  const capture = async (name) => {
    const projection = await page.evaluate(collectPresentation, { root: await page.$('body'), covered: true, typed: true });
    states.push({ name, html: await page.locator('body').innerHTML(), ...projection });
  };
  const act = (fn, arg) => page.evaluate(fn, arg);
  const clearModals = () => act(() => {
    presentationHarness.cart.close();
    document.querySelectorAll('.lead-modal,.commerce-modal,.storefront-checkout,.kreaton-cart-toast').forEach(e => e.remove());
  });
  await capture('initial');
  await act(() => document.querySelectorAll('details').forEach(e => { e.open = true; }));
  await capture('departments-open');
  await act(() => {
    const form = document.querySelector('[data-catalog-search-form]');
    form.elements['catalog-search'].value = '__no_match__';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await capture('search-empty');
  await act(() => {
    const form = document.querySelector('[data-catalog-search-form]');
    form.elements['catalog-search'].value = '';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    document.querySelectorAll('img[onerror]').forEach(image => {
      const handler = image.getAttribute('onerror');
      if (handler !== "this.closest('.image-shell').classList.add('image-failed')") throw new Error('Unknown image handler');
      // Execute only this exact, inventoried handler; candidate JavaScript remains prohibited by CSP.
      Function(handler).call(image);
    });
  });
  await capture('image-failed');
  await act(() => presentationHarness.openAccount());
  await capture('account-open');
  await act(() => document.querySelector('.commerce-modal form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await capture('account-saved');
  await clearModals();
  await act(() => presentationHarness.openLead());
  await capture('lead-open');
  await act(() => document.querySelector('.lead-modal form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await capture('lead-invalid');
  await act(() => {
    globalThis.presentationRequests = [];
    globalThis.fetch = (url, options) => new Promise(resolve => presentationRequests.push({ url, method: options?.method, resolve }));
    const form = document.querySelector('.lead-modal form');
    form.elements.customerName.value = 'QA'; form.elements.message.value = 'Catalog question';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await capture('lead-pending');
  await act(() => presentationRequests.shift().resolve(new Response('{}', { status: 503 })));
  await capture('lead-error');
  await act(() => document.querySelector('.lead-modal form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await act(() => presentationRequests.shift().resolve(new Response('{}', { status: 200 })));
  await capture('lead-sent');
  await clearModals();
  for (const item of catalog) {
    await act(item => presentationHarness.openLead({ catalogItemName: item.name }), item);
    await capture(`lead-product:${item.id}`);
    await clearModals();
  }
  await act(() => presentationHarness.cart.open());
  await capture('cart-empty');
  await clearModals();
  const buttons = await page.locator('[data-cart-add]').count();
  if (!buttons) throw new Error('Purchasable product required for complete interaction verification');
  await act(() => document.querySelectorAll('[data-cart-add]').forEach(button => button.click()));
  await capture('cart-added');
  await act(() => presentationHarness.cart.open());
  await capture('cart-full');
  await act(() => document.querySelector('[data-cart-quantity="1"]').click());
  await capture('cart-increased');
  await act(() => document.querySelector('[data-cart-quantity="-1"]').click());
  await capture('cart-decreased');
  await act(() => document.querySelector('[data-cart-checkout]').click());
  await capture('checkout-open');
  await act(() => document.querySelector('.storefront-checkout form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await capture('checkout-invalid');
  await act(() => {
    const form = document.querySelector('.storefront-checkout form');
    for (const input of form.querySelectorAll('input')) input.value = ({ email: 'qa@example.test', country: 'US', postalCode: '12345' })[input.name] || 'QA';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await capture('checkout-pending');
  await act(() => presentationRequests.shift().resolve(new Response('{"detail":"Free shipping backend injection"}', { status: 503 })));
  await capture('checkout-error');
  await clearModals();
  await act(() => presentationHarness.checkout([]));
  await capture('checkout-unavailable');
  await clearModals();
  await act(() => {
    presentationHarness.cart.open();
    while (document.querySelector('[data-cart-remove]')) document.querySelector('[data-cart-remove]').click();
  });
  await capture('cart-removed');
  await clearModals();
  return states;
}
