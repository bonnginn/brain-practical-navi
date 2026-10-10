// Transient return-to-observation context only; no storage or quiz scoring state.
export function copyReviewObservation(context,forceSlice=false){
  const result=structuredClone(context);
  if(forceSlice&&result.workspace==='sections')result.layout='slice';
  return result;
}
