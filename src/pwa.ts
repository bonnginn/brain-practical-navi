export type PwaInstallPromptEvent=Event&{
  prompt:()=>Promise<void>;
  userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>;
};

let pendingInstallPrompt:PwaInstallPromptEvent|null=null;
const installPromptListeners=new Set<()=>void>();

function notifyInstallPrompt(){for(const listener of installPromptListeners)listener()}

export function subscribePwaInstallPrompt(listener:()=>void){
  installPromptListeners.add(listener);
  return()=>installPromptListeners.delete(listener);
}

export function getPwaInstallPrompt(){return pendingInstallPrompt}

export function isPwaStandalone(){
  return window.matchMedia("(display-mode: standalone)").matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);
}

export async function promptPwaInstall(){
  const prompt=pendingInstallPrompt;
  if(!prompt)return null;
  pendingInstallPrompt=null;
  notifyInstallPrompt();
  await prompt.prompt();
  const choice=await prompt.userChoice;
  return choice.outcome;
}

export function installPwa(){
  if(!import.meta.env.PROD||!("serviceWorker" in navigator))return;
  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    pendingInstallPrompt=event as PwaInstallPromptEvent;
    notifyInstallPrompt();
  });
  window.addEventListener("appinstalled",()=>{pendingInstallPrompt=null;notifyInstallPrompt()});
  window.addEventListener("load",()=>{
    const url=new URL("sw.js",document.baseURI);
    void navigator.serviceWorker.register(url,{scope:new URL("./",document.baseURI).pathname}).catch(error=>console.warn("PWA registration failed",error));
  });
}
