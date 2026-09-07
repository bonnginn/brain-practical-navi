"""Reconstruct the pinned label pipeline from browser raw/manual and atlas.

This audits label generation, not the absent original NIfTI ingestion stage.
All generated data stay in memory; only a report is saved under work.
"""
import ast
import hashlib
import json
import numpy as np
import nibabel as nib
from nibabel.processing import resample_from_to
import build_bigbrain_practical_seg as builder
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE,
    EXPECTED_LABELS_SHA256, EXPECTED_IMAGE_SHA256, read_browser_volume,
)


def main():
    _,_,actual = read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,EXPECTED_LABELS_SHA256)
    _,_,raw = read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    source = ROOT/'work/segmentation-source-review'
    for name,digest in [('cerebra.nii.gz','7b69ad2478c6be7de12bb5b254b4cb7c'),('wm-prob.nii.gz','e5f636592b9c3a3eea4660ebc987a385')]:
        if hashlib.md5((source/name).read_bytes()).hexdigest()!=digest:
            raise ValueError(f'Changed official input {name}')
    cerebra_nii=nib.load(source/'cerebra.nii.gz')
    wm_nii=nib.load(source/'wm-prob.nii.gz')
    if cerebra_nii.shape!=wm_nii.shape or not np.array_equal(cerebra_nii.affine,wm_nii.affine):
        raise ValueError('Source grids differ')
    grid=json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    if tuple(grid['shape'])!=actual.shape or raw.shape!=actual.shape:
        raise ValueError('Target grids differ')
    manual=np.where((actual>=1)&(actual<=22),actual,0).astype(np.uint8)
    manual_nii=nib.Nifti1Image(manual,np.array(grid['affine']))
    cerebra=np.rint(np.asarray(cerebra_nii.dataobj)).astype(np.uint8)
    wm_probability=np.asarray(wm_nii.dataobj,dtype=np.float32)
    if wm_probability.max()>1.5:wm_probability/=100
    resampled_atlas=np.rint(np.asarray(resample_from_to(cerebra_nii,
        (actual.shape,manual_nii.affine),order=0).dataobj)).astype(np.uint8)
    # Reproduce the generator's encoded empty-space predicate, not an
    # anatomical assertion that every 255 voxel contains no tissue.
    if np.isin(raw,[251,252,253,254]).any():
        raise ValueError('Unexpected raw encoding; cannot infer tissue predicate')
    source_path=ROOT/'scripts/build_bigbrain_practical_seg.py'
    tree=ast.parse(source_path.read_text(encoding='utf-8'))
    fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='main')
    def assigns(node,name):
        return isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id==name for t in node.targets)
    start=next(i for i,n in enumerate(fn.body) if assigns(n,'practical'))
    stop=next(i for i,n in enumerate(fn.body) if assigns(n,'callosal_inferior_audit'))
    namespace=dict(builder.__dict__)
    namespace.update(manual=manual,manual_nii=manual_nii,cerebra_nii=cerebra_nii,
        cerebra=cerebra,wm_probability=wm_probability,resampled_atlas=resampled_atlas,empty_space=raw==255)
    exec(compile(ast.Module(body=fn.body[start:stop+1],type_ignores=[]),str(source_path),'exec'),namespace)
    reconstructed=namespace['practical']
    mismatch=int(np.count_nonzero(reconstructed!=actual))
    report=dict(sourceLabelsSha256=EXPECTED_LABELS_SHA256,sourceImageSha256=EXPECTED_IMAGE_SHA256,
        generatorSha256=hashlib.sha256(source_path.read_bytes()).hexdigest(),
        reconstructedRawSha256=hashlib.sha256(reconstructed.tobytes(order='F')).hexdigest(),
        mismatchVoxels=mismatch,passed=mismatch==0,publicMutation=False,
        scope='Exact current label pipeline including all six approved patch stages; original NIfTI ingestion not rerun.',
        mammillaryTransitions=namespace['reviewed_patch_audit']['transitions'],
        ventricleTransitions=namespace['ventricle_patch_audit']['transitions'],
        classificationTransitions=namespace['classification_patch_audit']['transitions'],
        callosalTransitions=namespace['callosal_patch_audit']['transitions'],
        callosalFollowupTransitions=namespace['callosal_followup_audit']['transitions'],
        callosalInferiorTransitions=namespace['callosal_inferior_audit']['transitions'])
    out=ROOT/'work/anatomy-review/practical-reconstruction-v5.json'
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))
    if mismatch:raise ValueError('Current label pipeline is not reproducible')


if __name__=='__main__':main()
