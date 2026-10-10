// Keep reference disclosures and links in the keyboard route through an explanation.
const focusableSelector='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]';

export function trapDialogFocus(event,dialog,activeElement){
  if(event.key!=='Tab'||event.defaultPrevented||event.altKey||event.ctrlKey||event.metaKey||event.isComposing||!dialog)return false;
  const items=[...dialog.querySelectorAll(focusableSelector)].filter(element=>
    element.tabIndex>=0&&!element.matches(':disabled')&&element.getClientRects().length>0);
  if(!items.length)return false;
  const first=items[0],last=items.at(-1);
  const target=!dialog.contains(activeElement)?(event.shiftKey?last:first)
    :event.shiftKey&&activeElement===first?last
    :!event.shiftKey&&activeElement===last?first:null;
  if(!target)return false;
  event.preventDefault();
  target.focus();
  return true;
}
