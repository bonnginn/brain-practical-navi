export type DialogTabEvent={
  key:string;
  shiftKey:boolean;
  defaultPrevented?:boolean;
  altKey?:boolean;
  ctrlKey?:boolean;
  metaKey?:boolean;
  isComposing?:boolean;
  preventDefault():void;
};
export function trapDialogFocus(event:DialogTabEvent,dialog:HTMLElement|null,activeElement:Element|null):boolean;
