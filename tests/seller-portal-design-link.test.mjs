import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../seller-portal.js', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../src/ai-builder/auth.js', import.meta.url), 'utf8');
function harness(projects, details = {}) {
  const elements = new Map();
  const calls = [];
  const element = id => {
    if (!elements.has(id)) elements.set(id, { innerHTML:'', textContent:'', dataset:{}, addEventListener(){}, classList:{add(){},remove(){}}, setAttribute(){}, showModal(){this.open=true;}, close(){this.open=false;} });
    return elements.get(id);
  };
  const context = vm.createContext({ URL, URLSearchParams,
    window:{location:{search:'?business_id=owned',origin:'https://usekreaton.com',hostname:'usekreaton.com',href:'portal'}},
    localStorage:{getItem(){return null;},removeItem(){}},
    document:{querySelector:element},
    fetch:async url => { calls.push(url); return {ok:true,json:async()=>url.endsWith('/projects')?{projects}:details[url.split('/').pop()]}; },
  });
  vm.runInContext(source.replace('(async () => { if (!await captureAuthRedirect()) await loadPortal(); })();',''),context);
  return {run:code=>vm.runInContext(code,context),elements,calls};
}
test('one matching store opens its project, ignoring matching business names', async()=>{
  const h=harness([{id:'wrong',store_id:'other',business_name:'ElectroHub'},{id:'right',store_id:'owned'}]);
  h.run('state.authenticated=true'); await h.run('openStoreDesign()');
  assert.equal(h.run('window.location.href'),'https://usekreaton.com/client/setup/?project_id=right');
});
test('multiple matches require explicit choice and zero matches never redirect',async()=>{
  for(const projects of [[],[{id:'a',store_id:'owned'},{id:'b',store_id:'owned'}]]){
    const h=harness(projects);h.run('state.authenticated=true');await h.run('openStoreDesign()');
    assert.equal(h.run('window.location.href'),'portal');
    assert.equal(h.elements.get('#designProjectDialog').open,true);
    if(projects.length) assert.match(h.elements.get('#designProjectChoices').innerHTML,/data-design-project="b"/);
    else assert.match(h.elements.get('#designProjectChoices').innerHTML,/No hay paginas/);
  }
});
test('legacy listing uses owner-checked detail store ID, never slug',async()=>{
  const h=harness([{id:'site'}],{site:{business_id:'owned'}});h.run('state.authenticated=true');await h.run('openStoreDesign()');
  assert.equal(h.calls.length,2);assert.match(h.calls[1],/\/projects\/site$/);
  assert.match(h.run('window.location.href'),/project_id=site$/);
});
test('unauthenticated portal cannot request projects',async()=>{
  const h=harness([]);await h.run('openStoreDesign()');assert.equal(h.calls.length,0);
});
test('builder deep link validates session before loading and before new intake',()=>{
  const start=auth.indexOf('export async function resumeClientSessionFromAuthToken');
  const body=auth.slice(start,auth.indexOf('const name = user?',start));
  assert.ok(body.indexOf('await fetchClientAuthUser')<body.indexOf('await loadClientProject(projectId)'));
  assert.match(body,/allowCookie: Boolean\(projectId\)/);
  assert.match(body,/return builderState.clientIntakeSession/);
  assert.doesNotMatch(body,/createOrResumeClientIntakeSession/);
  const load=auth.slice(auth.indexOf('export async function loadClientProject'),start);
  assert.match(load,/credentials: "include"/);
  assert.match(load,/persist: false/);
});
