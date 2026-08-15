export function installPwa(){
  if(!import.meta.env.PROD||!("serviceWorker" in navigator))return;
  window.addEventListener("load",()=>{
    const url=new URL("sw.js",document.baseURI);
    void navigator.serviceWorker.register(url,{scope:new URL("./",document.baseURI).pathname}).catch(error=>console.warn("PWA registration failed",error));
  });
}
