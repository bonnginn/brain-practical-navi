import {useSyncExternalStore} from "react";
import {getPwaUpdateAvailable,subscribePwaUpdates} from "../src/pwa";

export function PwaUpdateNotice({english}:{english:boolean}){
  const available=useSyncExternalStore(subscribePwaUpdates,getPwaUpdateAvailable,()=>false);
  if(!available)return null;
  return <aside className="pwaUpdateNotice" role="status" data-no-localize>
    <strong>{english?"An update is ready":"新しい版を利用できます"}</strong>
    <p>{english?"Finish your current activity, close all tabs and app windows for this material, then open it again to use the update. Simply reloading may keep the current version. Export any unsaved editing work first.":"学習を区切ったら、この教材のタブとアプリのウィンドウをすべて閉じ、開き直してください。再読み込みだけでは現在の版が続く場合があります。編集中の差分は先に書き出してください。"}</p>
  </aside>;
}
