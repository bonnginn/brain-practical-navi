export function retryableCachedLoad<K,T>(cache:Map<K,Promise<T>>,key:K,load:()=>Promise<T>):Promise<T>;
