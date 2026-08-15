export type OfflineCapacityRisk={downloadBytes:number;reserveBytes:number;availableBytes:number};
export const STORAGE_RESERVE_BYTES=5*1048576;

export function storageCapacityRisk(downloadBytes:number,availableBytes:number):OfflineCapacityRisk|null{
  const reserveBytes=Math.max(STORAGE_RESERVE_BYTES,Math.ceil(downloadBytes*.1));
  return downloadBytes>0&&availableBytes<downloadBytes+reserveBytes?{downloadBytes,reserveBytes,availableBytes}:null;
}

export function staleReplacementBytes(resources:{bytes:number}[]){
  return resources.length?Math.max(...resources.map(resource=>resource.bytes)):0;
}

export function offlineResourceResponseError(expectedBytes:number,response:Response|null){
  if(!response)return "missing";
  if(!response.ok)return `HTTP ${response.status}`;
  const contentType=response.headers.get("Content-Type")?.toLowerCase()??"";
  if(contentType.includes("text/html"))return "HTML fallback";
  const contentLength=response.headers.get("Content-Length");
  if(contentLength!==null){const measured=Number(contentLength);if(!Number.isFinite(measured)||measured!==expectedBytes)return `size ${contentLength}, expected ${expectedBytes}`}
  return null;
}
