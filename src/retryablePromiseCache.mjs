// Share in-flight work and successful results, but never cache a failure.
export function retryableCachedLoad(cache,key,load){
  if(cache.has(key))return cache.get(key);
  const pending=Promise.resolve().then(load).catch(error=>{
    // A reset may already have installed a newer request for the same key.
    if(cache.get(key)===pending)cache.delete(key);
    throw error;
  });
  cache.set(key,pending);
  return pending;
}
