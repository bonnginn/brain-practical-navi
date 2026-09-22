import {Component,type ErrorInfo,type ReactNode} from "react";

export class AppRecoveryBoundary extends Component<{children:ReactNode},{failed:boolean}>{
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true}}
  componentDidCatch(error:Error,info:ErrorInfo){console.error("Teaching view failed",error,info.componentStack)}
  render(){
    if(!this.state.failed)return this.props.children;
    const english=new URLSearchParams(window.location.search).get("lang")==="en";
    return <main className="appRecovery" lang={english?"en":"ja"} aria-labelledby="app-recovery-title" data-no-localize>
      <h1 id="app-recovery-title">{english?"This view could not be opened":"画面を開けませんでした"}</h1>
      <p>{english?"Check your connection and try reloading. If the problem started after an update, close all tabs and app windows for this material, then open it again.":"通信を確認して再読み込みしてください。更新直後に起きた場合は、この教材のタブとアプリのウィンドウをすべて閉じてから、開き直してください。"}</p>
      <p>{english?"Reloading will end the current quiz. Saved mistake history and segmentation edits remain on this device; you do not need to clear site data.":"再読み込みすると進行中のクイズは終了します。保存済みの誤答履歴と分節差分は端末内に残ります。サイトデータを消去する必要はありません。"}</p>
      <button type="button" onClick={()=>window.location.reload()}>{english?"Reload":"再読み込み"}</button>
    </main>;
  }
}
