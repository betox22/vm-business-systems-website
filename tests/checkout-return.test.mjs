import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileCheckoutReturn} from '../storefront-checkout.js';
import {createSharedCommerceCart} from '../shared-commerce-cart.js';

const store=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
test('verified paid return clears only its store cart; URL alone cannot clear',async()=>{
 const storage=store(), receipts=store();
 const cart=createSharedCommerceCart({businessId:'a',storage,documentRef:null});
 const items=[{id:'p',name:'P',price:'10',image:'',quantity:1}];
 storage.setItem(cart.storageKey,JSON.stringify(items)); storage.setItem('kreaton:cart:b','other');
 receipts.setItem(`kreaton:checkout:${cart.storageKey}`,JSON.stringify({businessId:'a',sessionId:'cs_test',items}));
 const args={site:{commerce:{businessId:'a'}},cart,apiBase:'https://test',locationRef:{href:'https://shop/?checkout=returned'},storage:receipts};
 assert.equal(await reconcileCheckoutReturn({...args,fetchRef:async()=>({ok:true,json:async()=>({paid:false})})}),false);
 assert.ok(storage.getItem(cart.storageKey));
 assert.equal(await reconcileCheckoutReturn({...args,fetchRef:async()=>({ok:true,json:async()=>({paid:true})})}),true);
 assert.equal(storage.getItem(cart.storageKey),null); assert.equal(storage.getItem('kreaton:cart:b'),'other');
});
test('new cart edits are not erased by an old payment return',()=>{
 const storage=store(); const cart=createSharedCommerceCart({businessId:'a',storage,documentRef:null});
 storage.setItem(cart.storageKey,JSON.stringify([{id:'new',name:'New',quantity:2}]));
 assert.equal(cart.clearIfUnchanged([{id:'old',quantity:1}]),false); assert.ok(storage.getItem(cart.storageKey));
});
