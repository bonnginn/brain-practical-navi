// Keep the complete inventory as evidence; ship only fields read by the card.
export function curriculumDisplayMap(map){
  return {
    materials:map.materials.map(m=>({id:m.id,name:m.name,
      source_text_refs:(m.source_text_refs??[]).filter(r=>r.symbol==='surfaceObservationGuides').map(r=>({symbol:r.symbol,key:r.key})),
      evidence_state:{image_position:m.evidence_state.image_position},
      provenance_mapping:{mapping:{composite:!!m.provenance_mapping?.mapping.composite}},
      evidence:(m.evidence??[]).map(e=>({entry_key:e.entry_key,limitations:e.limitations,source_refs:e.source_refs})),
    })),
    tasks:map.tasks.map(t=>({id:t.id,material_refs:t.material_refs})),
    gaps:map.gaps.map(g=>({subject_ref:g.subject_ref,kind:g.kind})),
  };
}
