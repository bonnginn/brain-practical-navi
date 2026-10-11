type Geometry={vertices:Float32Array;faces:Uint32Array;normals:Float32Array;shade:Float32Array;regions:Float32Array};
export function circuitSpatialGuide(from:Geometry[],to:Geometry[],range?:[number,number]):{mesh:Geometry;travel:Float32Array}[];
