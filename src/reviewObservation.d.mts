export function copyReviewObservation<T extends {
  workspace:'sections'|'surface';
  layout?:'both'|'slice'|'model';
}>(context:T,forceSlice?:boolean):T;
