// A cancelled/superseded reader must never apply an older node's open answers.
// Scheduling is injected so cancellation can be verified without a browser.
export function scheduleReadingRestore(request,cancel,apply){
 let active=true,first=null,second=null;
 first=request(()=>{if(!active)return;second=request(()=>{if(active)apply();});});
 return ()=>{active=false;if(first!==null)cancel(first);if(second!==null)cancel(second);};
}
