import {useSyncExternalStore} from "react";
import {getPwaUpdateAvailable,subscribePwaUpdates} from "../src/pwa";

export function PwaUpdateNotice({english,compact=false}:{english:boolean;compact?:boolean}){
  const available=useSyncExternalStore(subscribePwaUpdates,getPwaUpdateAvailable,()=>false);
  if(!available)return null;
  return <aside className={`pwaUpdateNotice ${compact?"pwaUpdateNoticeCompact":""}`} role="status" data-no-localize>
    <strong>{english?"An update is ready":"新しい版を利用できます"}</strong>
    <p>{compact
      ? english?"After your activity, export any unsaved edits, close every tab and app window for this material, then reopen it. Reloading alone may keep the old version.":"学習を区切り、編集中の差分を先に書き出してから、この教材のタブとアプリのウィンドウをすべて閉じ、開き直してください。再読み込みだけでは旧版が残る場合があります。"
      : english?"Finish your current activity, close all tabs and app windows for this material, then open it again to use the update. Simply reloading may keep the current version. Export any unsaved editing work first.":"学習を区切ったら、この教材のタブとアプリのウィンドウをすべて閉じ、開き直してください。再読み込みだけでは現在の版が続く場合があります。編集中の差分は先に書き出してください。"}</p>
  </aside>;
}
