import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../seller-portal.js', import.meta.url), 'utf8');
function harness(fetchImpl) {
  const handlers = {};
  const element = { innerHTML: '', textContent: '', dataset: {}, disabled: false,
    classList: { add() {}, remove() {} }, setAttribute() {},
    addEventListener(name, fn) { (handlers[name] ||= []).push(fn); }, querySelectorAll() { return []; } };
  const context = vm.createContext({ URL, URLSearchParams,
    window: { location: { search: '?business_id=owned', hostname: 'localhost' } },
    localStorage: { getItem() { return null; }, removeItem() {} },
    document: { querySelector() { return element; } }, fetch: fetchImpl,
  });
  vm.runInContext(source.replace('(async () => { if (!await captureAuthRedirect()) await loadPortal(); })();', ''), context);
  const run = code => vm.runInContext(code, context);
  run('state.authenticated=true; state.products=[{id:"p1",name:"Drill",sku:"REAL",price:25,stock:0,quoteOnly:false,status:"Published"}]');
  const status = { textContent: '' }, button = { hidden: false };
  const cell = { dataset: {}, querySelector(selector) { return selector === '.cell-status' ? status : button; } };
  const input = { dataset: { inventoryId: 'p1', field: 'price' }, value: '30.50', isConnected: true,
    closest() { return cell; }, setAttribute() {}, focus() {}, matches() { return true; } };
  context.input = input;
  return { run, context, input, cell, status, button, handlers };
}

test('inventory distinguishes no imports from filtered empty results', () => {
  const h = harness();
  assert.match(h.run('catalogTable([])'), /Sin resultados para el filtro/);
  h.run('state.products=[]');
  assert.match(h.run('catalogTable([])'), /no hay productos importados/);
});
test('quote-only price has no numeric editor or zero fallback; stock remains editable', () => {
  const h = harness(); h.run('state.products[0].quoteOnly=true; state.products[0].price=null');
  const html = h.run('catalogTable(state.products)');
  assert.match(html, /Requiere cotizacion/);
  assert.doesNotMatch(html, /data-field="price"|\$0\.00/);
  assert.match(html, /data-field="stock"/);
});
test('inline validates price precision, empty values and integral stock', () => {
  const h = harness();
  for (const value of ['', '-1', '0', '1.234', 'Infinity', 'abc']) {
    h.context.value = value;
    assert.throws(() => h.run('inlineInventoryPayload(state.products[0],"price",value)'));
  }
  assert.equal(h.run('inlineInventoryPayload(state.products[0],"price","15,50").price'), 15.5);
  for (const value of ['', '-1', '1.5', '2147483648']) {
    h.context.value = value;
    assert.throws(() => h.run('inlineInventoryPayload(state.products[0],"stock",value)'));
  }
  assert.equal(h.run('inlineInventoryPayload(state.products[0],"stock","0").stock'), 0);
});
test('real inline save handler sends only price PATCH with cookie, saved state uses server response', async () => {
  const calls = [];
  const h = harness(async (url, options) => { calls.push({url, options}); return {ok:true,json:async()=>({id:'p1',price:30.5,stock:0})}; });
  await h.run('saveInventoryCell(input)');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /store-owner\/owned\/products\/p1$/);
  assert.equal(calls[0].options.method, 'PATCH');
  assert.equal(calls[0].options.credentials, 'include');
  assert.deepEqual(JSON.parse(calls[0].options.body), {price:30.5});
  assert.equal(h.input.value,'30.50'); assert.equal(h.status.textContent,'Guardado');
  assert.equal(h.run('state.products[0].price'),30.5);
});
test('stock PATCH is isolated and repeat Enter is blocked while saving', async () => {
  let finish; let calls = 0; let body;
  const h = harness((url, options) => { calls++; body = JSON.parse(options.body); return new Promise(resolve => { finish = resolve; }); });
  h.input.dataset.field = 'stock'; h.input.value = '7';
  const saving = h.run('saveInventoryCell(input)');
  assert.equal(h.status.textContent,'Guardando...');
  await h.run('saveInventoryCell(input)'); assert.equal(calls,1);
  assert.deepEqual(body,{stock:7});
  finish({ok:true,json:async()=>({id:'p1',stock:7,price:25})}); await saving;
  assert.equal(h.run('state.products[0].stock'),7);
  assert.equal(h.run('state.products[0].price'),25);
});
test('Escape cancels without PATCH and Enter invokes the save handler', async () => {
  let calls=0;
  const h = harness(async () => { calls++; return {ok:true,json:async()=>({id:'p1',price:26,stock:0})}; });
  const key = h.handlers.keydown[0];
  key({target:h.input,key:'Escape',preventDefault(){}});
  assert.equal(h.input.value,'25.00'); assert.equal(calls,0);
  h.input.value='26'; key({target:h.input,key:'Enter',preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1); assert.equal(h.status.textContent,'Guardado');
});
test('server rejection keeps persisted value and draft available for retry', async () => {
  const h = harness(async () => ({ok:false,status:422,json:async()=>({detail:'Precio rechazado'})}));
  await h.run('saveInventoryCell(input)');
  assert.equal(h.status.textContent,'Precio rechazado'); assert.equal(h.cell.dataset.status,'error');
  assert.equal(h.input.value,'30.50'); assert.equal(h.run('state.products[0].price'),25);
  assert.equal(h.run('state.saving'),false);
});
test('late PATCH response never hydrates a logged-out session', async () => {
  let finish;
  const h = harness(() => new Promise(resolve=>{finish=resolve;}));
  const saving = h.run('saveInventoryCell(input)'); h.run('resetView()');
  finish({ok:true,json:async()=>({id:'p1',price:30.5})}); await saving;
  assert.equal(h.run('state.products.length'),0); assert.equal(h.run('state.authenticated'),false);
  assert.notEqual(h.status.textContent,'Guardado');
});
test('invalid session clears products instead of reporting a successful save', async () => {
  const h = harness(async () => ({ok:false,status:401,json:async()=>({detail:'Expired'})}));
  await h.run('saveInventoryCell(input)');
  assert.equal(h.run('state.authenticated'),false);
  assert.equal(h.run('state.products.length'),0);
  assert.notEqual(h.status.textContent,'Guardado');
});
test('new-product form stays secondary and mobile does not hide stock cells', () => {
  const h = harness();
  assert.match(h.run('renderEditor()'), /<details/); assert.match(h.run('renderEditor()'), /Nuevo producto/);
  const css=readFileSync(new URL('../seller-portal.css',import.meta.url),'utf8');
  assert.doesNotMatch(css,/td:nth-child\(3\)\s*\{\s*display:\s*none/);
  assert.match(css,/\.inventory-table tr \{ display: grid/);
});
