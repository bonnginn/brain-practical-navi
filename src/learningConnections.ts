export type LearningCircuitKey="papez"|"visual"|"basal-ganglia";
export const sectionCircuitLinks:Partial<Record<string,readonly LearningCircuitKey[]>>={
  hippocampus:["papez"],fornixBodyPartial:["papez"],mammillaryBody:["papez"],
  thalamus:["papez","basal-ganglia"],
  opticChiasmPartial:["visual"],opticTractsPartial:["visual"],lateralGeniculateBodies:["visual"],
  caudate:["basal-ganglia"],putamen:["basal-ganglia"],pallidum:["basal-ganglia"],pallidumExternal:["basal-ganglia"],pallidumInternal:["basal-ganglia"],substantiaNigra:["basal-ganglia"],subthalamic:["basal-ganglia"],
};
export const surfaceCircuitLinks:Partial<Record<string,readonly LearningCircuitKey[]>>={
  cingulate:["papez"],parahippocampal:["papez"],entorhinal:["papez"],pericalcarine:["visual"],
};
