#!/usr/bin/env python3
"""Build a 1 mm browser volume and surface meshes from TemplateFlow MNI/CerebA."""
import csv, gzip, json, struct, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "work/pydeps"))
import numpy as np
from skimage.measure import marching_cubes
from scipy.ndimage import gaussian_filter, binary_fill_holes
import trimesh
import nibabel as nib

SRC, OUT = ROOT / "work/atlas-source", ROOT / "public/atlas"
FOCUS = {"ventricle":[5,29,37,41,56,80,88,92],"caudate":[49,100],"hippocampus":[48,99],"thalamus":[40,91]}

def read_nifti(path):
    raw=gzip.open(path,"rb").read(); endian="<" if struct.unpack("<I",raw[:4])[0]==348 else ">"
    dims=struct.unpack(endian+"8h",raw[40:56])[1:4]; dtype,bits=struct.unpack(endian+"2h",raw[70:74]);offset=int(struct.unpack(endian+"f",raw[108:112])[0])
    npdtype=endian+"i2" if (dtype,bits)==(4,16) else "u1" if (dtype,bits)==(2,8) else endian+"f4" if (dtype,bits)==(16,32) else None
    if not npdtype:raise ValueError(f"Unsupported NIfTI datatype {dtype}/{bits}")
    arr=np.frombuffer(raw,dtype=npdtype,offset=offset,count=np.prod(dims)).reshape((dims[2],dims[1],dims[0]))
    return dims,arr

def robust01(data, mask, low=.5, high=99.5):
    lo,hi=np.percentile(data[mask],[low,high])
    return np.clip((data-lo)/max(1e-6,hi-lo),0,1),(float(lo),float(hi))

def write_mesh(path,mask,step=3,sigma=0):
    field=gaussian_filter(mask.astype(np.float32),sigma=sigma) if sigma else mask.astype(np.uint8)
    verts,faces,normals,_=marching_cubes(field,.5,step_size=step,allow_degenerate=False)
    # marching_cubes order z,y,x; center coordinates and preserve anatomical proportions
    center=(np.array(mask.shape)-1)/2; verts=(verts-center).astype("<f4"); normals=normals.astype("<f4"); faces=faces.astype("<u4")
    with open(path,"wb") as f:
        f.write(b"BNM1"+struct.pack("<II",len(verts),len(faces)));f.write(verts.tobytes());f.write(normals.tobytes());f.write(faces.tobytes())
    print(path.name,len(verts),len(faces))

def pial_from_gifti(path, thickness=2.35):
    surface=nib.load(path);vertices=surface.darrays[0].data.astype(np.float64);faces=surface.darrays[1].data.astype(np.int64)
    white=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
    pial=trimesh.Trimesh(vertices=vertices+white.vertex_normals*thickness,faces=faces,process=False)
    return pial

def sulcal_shade(mesh, iterations=12):
    vertices=np.asarray(mesh.vertices,dtype=np.float64);faces=np.asarray(mesh.faces);work=vertices.copy();counts=np.zeros(len(vertices),dtype=np.float64)
    edges=np.concatenate([faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]]])
    np.add.at(counts,edges[:,0],1);np.add.at(counts,edges[:,1],1)
    for _ in range(iterations):
        sums=np.zeros_like(work);np.add.at(sums,edges[:,0],work[edges[:,1]]);np.add.at(sums,edges[:,1],work[edges[:,0]])
        work=work*.56+(sums/counts[:,None])*.44
    depth=np.einsum("ij,ij->i",work-vertices,mesh.vertex_normals)
    scale=max(.001,float(np.percentile(depth[depth>0],96))) if np.any(depth>0) else 1
    return (1-.56*np.clip(depth/scale,0,1)).astype("<f4")

def write_pial_mesh(path,mesh):
    xyz=np.asarray(mesh.vertices).copy();xyz+=np.array([0,18,-18])
    vertices=xyz[:,[2,1,0]].astype("<f4");normals=np.asarray(mesh.vertex_normals)[:,[2,1,0]].astype("<f4");faces=np.asarray(mesh.faces).astype("<u4");shade=sulcal_shade(mesh)
    with open(path,"wb") as f:
        f.write(b"BNM2"+struct.pack("<II",len(vertices),len(faces)));f.write(vertices.tobytes());f.write(normals.tobytes());f.write(shade.tobytes());f.write(faces.tobytes())
    print(path.name,len(vertices),len(faces),float(shade.min()),float(shade.mean()))

def make_anatomical_mesh(mask, color, sigma=.45):
    field=gaussian_filter(mask.astype(np.float32),sigma=sigma) if sigma else mask.astype(np.float32)
    verts,faces,normals,_=marching_cubes(field,.5,step_size=1,allow_degenerate=False)
    center=(np.array(mask.shape)-1)/2
    # Convert voxel-centred coordinates to MNI world x,y,z millimetres.
    verts=(verts-center)[:,[2,1,0]]+np.array([0,-18,18]);faces=faces[:,::-1]
    mesh=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    mesh.visual.face_colors=np.array(color,dtype=np.uint8)
    return mesh

def export_anatomical_glb(path, masks):
    scene=trimesh.Scene()
    for name,mask,color,sigma in masks:
        mesh=make_anatomical_mesh(mask,color,sigma)
        scene.add_geometry(mesh,node_name=name,geom_name=name)
        print("glb-part",name,len(mesh.vertices),len(mesh.faces))
    path.write_bytes(scene.export(file_type="glb"));print(path.name,path.stat().st_size)

def main():
    dims,labels=read_nifti(SRC/"cerebra.nii.gz");dims2,t1=read_nifti(SRC/"t1w.nii.gz");dims3,t2=read_nifti(SRC/"t2w.nii.gz");dims4,mask=read_nifti(SRC/"brain-mask.nii.gz");dims5,gm=read_nifti(SRC/"gm-prob.nii.gz");dims6,wm=read_nifti(SRC/"wm-prob.nii.gz");dims7,csf=read_nifti(SRC/"csf-prob.nii.gz");assert dims==dims2==dims3==dims4==dims5==dims6==dims7
    with open(SRC/"cerebra.tsv",newline="") as f:source_rows=list(csv.DictReader(f,delimiter="\t"))
    def scale(a):
        pos=np.sort(a[mask>0]);lo,hi=int(pos[len(pos)//100]),int(pos[len(pos)*99//100]);return np.clip(np.rint((a-lo)*255/max(1,hi-lo)),0,255).astype(np.uint8),(lo,hi)
    scaled,t1win=scale(t1);scaled2,t2win=scale(t2);labs=np.clip(labels,0,255).astype(np.uint8);mask=(mask>0).astype(np.uint8);gm8=np.clip(np.rint(gm*255),0,255).astype(np.uint8);wm8=np.clip(np.rint(wm*255),0,255).astype(np.uint8);csf8=np.clip(np.rint(csf*255),0,255).astype(np.uint8);OUT.mkdir(parents=True,exist_ok=True)
    payload=b"BNV4"+struct.pack("<3H",*dims)+scaled.tobytes()+scaled2.tobytes()+labs.tobytes()+mask.tobytes()+gm8.tobytes()+wm8.tobytes()+csf8.tobytes()
    (OUT/"mni-cerebra-1mm.bin").write_bytes(payload)
    with gzip.open(OUT/"mni-cerebra-1mm.bin.gz","wb",compresslevel=9) as f:f.write(payload)
    if (SRC/"bigbrain-400um.nii.gz").exists():
        bbdims,bigbrain=read_nifti(SRC/"bigbrain-400um.nii.gz")
        bbpayload=b"BBV1"+struct.pack("<3H",*bbdims)+bigbrain.astype(np.uint8).tobytes()
        with gzip.open(OUT/"bigbrain-400um.bin.gz","wb",compresslevel=9) as f:f.write(bbpayload)
        print("bigbrain",bbdims,len(bbpayload),(OUT/"bigbrain-400um.bin.gz").stat().st_size)
    if (SRC/"bigbrain-fixed-mri-0444.nii.gz").exists():
        fixed_img=nib.load(SRC/"bigbrain-fixed-mri-0444.nii.gz");fixed=np.asanyarray(fixed_img.dataobj).astype(np.float32);fmdims=fixed.shape[:3];positive=fixed>0;fixed_mask=binary_fill_holes(positive)
        fixed01,(flo,fhi)=robust01(fixed,positive);fixed8=np.rint(fixed01*255).astype(np.uint8)
        fmask8=fixed_mask.astype(np.uint8)
        fmpayload=b"BFM1"+struct.pack("<3H",*fmdims)+fixed8.tobytes(order="F")+fmask8.tobytes(order="F")
        with gzip.open(OUT/"bigbrain-fixed-mri-0444.bin.gz","wb",compresslevel=9) as f:f.write(fmpayload)
        print("fixed-mri",fmdims,len(fmpayload),(OUT/"bigbrain-fixed-mri-0444.bin.gz").stat().st_size,(float(flo),float(fhi)))
    # CerebA labels delimit brain tissue; T1 nonzero also contains face/head tissue.
    brain=mask>0;write_mesh(OUT/"brain.mesh",brain,step=1,sigma=.35)
    pial_left=pial_from_gifti(SRC/"mni152-white-left.surf.gii");pial_right=pial_from_gifti(SRC/"mni152-white-right.surf.gii")
    write_pial_mesh(OUT/"pial-left.mesh",pial_left);write_pial_mesh(OUT/"pial-right.mesh",pial_right)
    for name,values in FOCUS.items():write_mesh(OUT/f"{name}.mesh",np.isin(labs,values),step=1)
    cortex={int(r["label"]) for r in source_rows if int(r["mindboggle mapping"])>=2000}
    cerebellum={97,46,90,39,101,50,53,2,71,20};brainstem={62,11};ventricles=set(FOCUS["ventricle"])
    deep={int(r["label"]) for r in source_rows}-cortex-cerebellum-brainstem-ventricles
    for name,values,step,sigma in [("segment-cortex",cortex,1,.25),("segment-cerebellum",cerebellum,1,.20),("segment-brainstem",brainstem,1,.20),("segment-deep",deep,1,.15),("segment-ventricles",ventricles,1,.10)]:write_mesh(OUT/f"{name}.mesh",np.isin(labs,list(values)),step=step,sigma=sigma)
    x=np.arange(labs.shape[2])[None,None,:];mid=(labs.shape[2]-1)/2
    cerebrum=brain&~np.isin(labs,list(cerebellum|brainstem));left_hemi=cerebrum&(x<mid);right_hemi=cerebrum&(x>=mid)
    basal={100,49,72,21,78,27,55,4};amygdala={70,19};
    model_parts=[
        ("Cerebellum",np.isin(labs,list(cerebellum)),[176,142,113,255],.38),("Brainstem",np.isin(labs,list(brainstem)),[151,119,94,255],.38),
        ("Ventricular_system",np.isin(labs,list(ventricles)),[65,174,190,255],.25),("Thalamus",np.isin(labs,[91,40]),[137,126,190,255],.25),
        ("Basal_ganglia",np.isin(labs,list(basal)),[213,139,69,255],.25),("Hippocampus",np.isin(labs,[99,48]),[194,107,133,255],.20),
        ("Amygdala",np.isin(labs,list(amygdala)),[177,83,105,255],.20)]
    scene=trimesh.Scene();pial_left.visual.face_colors=np.array([184,151,121,255],dtype=np.uint8);pial_right.visual.face_colors=np.array([194,160,128,255],dtype=np.uint8)
    scene.add_geometry(pial_left,node_name="Cerebrum_L_pial",geom_name="Cerebrum_L_pial");scene.add_geometry(pial_right,node_name="Cerebrum_R_pial",geom_name="Cerebrum_R_pial")
    for name,part_mask,color,sigma in model_parts:
        part=make_anatomical_mesh(part_mask,color,sigma);scene.add_geometry(part,node_name=name,geom_name=name)
    glb=OUT/"brain-practical-segmented-v2.glb";glb.write_bytes(scene.export(file_type="glb"));print(glb.name,glb.stat().st_size)
    rows=[{"id":int(r["label"]),"name":r["name"],"hemi":r["hemi"]} for r in source_rows]
    (OUT/"labels.json").write_text(json.dumps(rows,ensure_ascii=False),encoding="utf-8")
    (OUT/"ATTRIBUTION.txt").write_text("MNI152NLin2009cSym and CerebA via TemplateFlow.\nMNI152 high-density white surfaces via BigBrainWarp; pial-like surface derived by normal expansion.\nDerived display volume and volumetric meshes: 1 mm.\n",encoding="utf-8")
    print({"dims":dims,"raw_bytes":len(payload),"gzip_bytes":(OUT/"mni-cerebra-1mm.bin.gz").stat().st_size,"T1_window":t1win,"T2_window":t2win})

if __name__=="__main__":main()
