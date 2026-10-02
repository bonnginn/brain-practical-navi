// Observation angles for small targets; anatomy and mesh coordinates stay fixed.
const TARGET_ROTATIONS = {
  cn4: {x: -42, y: -118, z: 0},
  cn6: {x: -10, y: 178, z: 0},
  basilar: {x: 174, y: 2, z: 180},
};

export function reviewModelRotation(target, fallback) {
  return {...(TARGET_ROTATIONS[target] ?? fallback)};
}
