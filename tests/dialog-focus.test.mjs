import test from 'node:test';
import assert from 'node:assert/strict';
import {trapDialogFocus} from '../src/dialogFocus.mjs';

function fixture(items){
  let focused=null,prevented=false;
  const controls=items.map(item=>({
    ...item,tabIndex:item.tabIndex??0,
    matches:selector=>selector===':disabled'&&!!item.disabled,
    getClientRects:()=>item.hidden?[]:[{}],
    focus(){focused=this.name},
  }));
  const dialog={querySelectorAll:()=>controls,contains:active=>controls.includes(active)};
  const event=(options={})=>({key:'Tab',shiftKey:false,preventDefault(){prevented=true},...options});
  return {controls,dialog,event,result:()=>({focused,prevented})};
}

test('reference disclosures remain reachable after the final enabled action',()=>{
  const f=fixture([{name:'close'},{name:'compare'},{name:'reference-summary'},{name:'reference-link'},{name:'find',disabled:true}]);
  assert.equal(trapDialogFocus(f.event(),f.dialog,f.controls[1]),false);
  assert.deepEqual(f.result(),{focused:null,prevented:false},'Tab may continue to the reference summary');
  assert.equal(trapDialogFocus(f.event(),f.dialog,f.controls[2]),false);
  assert.equal(trapDialogFocus(f.event(),f.dialog,f.controls[3]),true);
  assert.deepEqual(f.result(),{focused:'close',prevented:true});
});
test('Shift+Tab from close returns to the last visible reference',()=>{
  const f=fixture([{name:'close'},{name:'reference-summary'},{name:'reference-link'},{name:'review',disabled:true}]);
  assert.equal(trapDialogFocus(f.event({shiftKey:true}),f.dialog,f.controls[0]),true);
  assert.deepEqual(f.result(),{focused:'reference-link',prevented:true});
});
test('collapsed links, disabled actions and negative tabindex are skipped',()=>{
  const f=fixture([{name:'close'},{name:'reference-summary'},{name:'collapsed-link',hidden:true},{name:'review',disabled:true},{name:'programmatic-heading',tabIndex:-1}]);
  assert.equal(trapDialogFocus(f.event({shiftKey:true}),f.dialog,f.controls[0]),true);
  assert.deepEqual(f.result(),{focused:'reference-summary',prevented:true});
});
test('focus outside the explanation reenters at the correct boundary',()=>{
  for(const shiftKey of [false,true]){
    const f=fixture([{name:'close'},{name:'review'}]);
    assert.equal(trapDialogFocus(f.event({shiftKey}),f.dialog,{}),true);
    assert.deepEqual(f.result(),{focused:shiftKey?'review':'close',prevented:true});
  }
});
test('browser shortcuts, composition and already handled keys are left alone',()=>{
  for(const options of [{key:'Enter'},{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true},{defaultPrevented:true}]){
    const f=fixture([{name:'close'}]);
    assert.equal(trapDialogFocus(f.event(options),f.dialog,f.controls[0]),false);
    assert.deepEqual(f.result(),{focused:null,prevented:false});
  }
});
test('missing or empty explanations do not intercept keys',()=>{
  const f=fixture([{name:'disabled',disabled:true},{name:'hidden',hidden:true}]);
  assert.equal(trapDialogFocus(f.event(),f.dialog,null),false);
  assert.equal(trapDialogFocus(f.event(),null,null),false);
  assert.deepEqual(f.result(),{focused:null,prevented:false});
});
