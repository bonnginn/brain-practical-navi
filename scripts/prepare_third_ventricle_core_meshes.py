"""Compare every specimen mask for the fixed third-ventricle repair; stage only."""
import json
import argparse
import numpy as np
import build_specimen_blocks as blocks
from prepare_cerebellar_island_meshes import encode
from build_orthogonal_review_bundle import DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256, read_browser_volume
from stage_third_ventricle_core_repair import WORK, ROOT, BASE_SHA, MAGIC_LABELS, digest

FINAL_SHA = '9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8'


def main(fourth_paired=False, lateral_fringe=False, lateral_next=False, lateral_remaining=False, lateral_medium=False, inferior_horn=False, residual_51=False, residual_27=False, partial19=False, outer40=False, fourth_anterior=False, third_detached8=False, lateral_detached547=False, lateral_residual80=False, cavity21=False, crop34=False, stage_prefix=None, record_sha=None):
    if sum((fourth_paired,lateral_fringe,lateral_next,lateral_remaining,lateral_medium,inferior_horn,residual_51,residual_27,partial19,outer40,fourth_anterior,third_detached8,lateral_detached547,lateral_residual80,cavity21,crop34,bool(stage_prefix)))>1:raise ValueError('Choose one repair')
    if bool(stage_prefix)!=bool(record_sha):raise ValueError('Stage and SHA required together')
    stage = WORK / 'third-ventricle-core-stage-v1'
    out = WORK / 'third-ventricle-core-meshes-v1'
    base_sha, final_sha = BASE_SHA, FINAL_SHA
    if fourth_paired:
        stage = WORK/'fourth-ventricle-paired-stage-v1'
        out = WORK/'fourth-ventricle-paired-meshes-v1'
        base_sha = FINAL_SHA
        final_sha = 'd4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152'
    if lateral_fringe:
        stage = WORK/'lateral-fringe-stage-v1'
        out = WORK/'lateral-fringe-meshes-v1'
        base_sha = 'd4295e7cc00edd3639b631473445d5db1bb25f9fbe18c5c7f21ff8b8471d7152'
        final_sha = '83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567'
        if digest((stage/'repair.json').read_bytes()) != '65df6a9cf6056991241d64f87b85ab4f504e76084f5d7a63f05b58f0b280a071':
            raise ValueError('Lateral repair record changed')
    if lateral_next:
        stage = WORK/'lateral-fringe-next-stage-v1'
        out = WORK/'lateral-fringe-next-meshes-v1'
        base_sha = '83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567'
        final_sha = '7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef'
        if digest((stage/'repair.json').read_bytes()) != '90fd67a9e526dd116e47f302f26d13efd3b3daf2a92fae65bbe518fef6072f15':
            raise ValueError('Next lateral repair record changed')
    if lateral_remaining:
        stage = WORK/'lateral-fringe-remaining-large-stage-v1'
        out = WORK/'lateral-fringe-remaining-large-meshes-v1'
        base_sha = '7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef'
        final_sha = 'b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
        if digest((stage/'repair.json').read_bytes()) != '48e2fea89750e10afbbdd812628cebfcac5e004f2f235858992543804687ece1':
            raise ValueError('Remaining lateral repair record changed')
    if lateral_medium:
        stage = WORK/'lateral-fringe-medium-stage-v1'
        out = WORK/'lateral-fringe-medium-meshes-v1'
        base_sha = 'b473638881ac75dc3ce27cf9963d612ffa41f768906e895f2281954c44be9567'
        final_sha = '0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229'
        if digest((stage/'repair.json').read_bytes()) != '0a0eb1962cdd19991b951cd0b0a957d57b90118c746fb7ef29c48c0301ca7ab5':
            raise ValueError('Medium lateral repair record changed')
    if inferior_horn:
        stage=WORK/'inferior-horn-cavity-stage-v1'
        out=WORK/'inferior-horn-cavity-meshes-v1'
        base_sha='0d31037722a8a31eee3ff6feed49dc076ece3d6c864297240c687cd1526cc229'
        final_sha='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba'
        if digest((stage/'repair.json').read_bytes())!='470b0b86c0183416f2e5c308d10ce76e6ed797b5b64c49052819ccccecb06b50':
            raise ValueError('Inferior horn repair record changed')
    if residual_51:
        stage=WORK/'inferior-horn-residual-51-stage-v1'
        out=WORK/'inferior-horn-residual-51-meshes-v1'
        base_sha='5f1847a300e0a988ec19037c947e18b525f5d4dc01da8de87222035abbf88eba'
        final_sha='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
        if digest((stage/'repair.json').read_bytes())!='4401e414aa3e940e3991b0e631215af27415dd221a60c41e4d1b8f10c33b34e1':
            raise ValueError('Residual repair record changed')
    if residual_27:
        stage=WORK/'inferior-horn-residual-27-stage-v1'
        out=WORK/'inferior-horn-residual-27-meshes-v1'
        base_sha='681fb599fd6d2181d7b7398a775abf5f1335eb644ce95afc2149b39fab9f9c88'
        final_sha='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
        if digest((stage/'repair.json').read_bytes())!='6cfb2c826aab3efc0cc69f1d03b4a13d7591ecd392ee3527a83c1a34da90f80f':
            raise ValueError('Residual 27 repair record changed')
    if partial19:
        stage=WORK/'inferior-horn-partial19-stage-v1'
        out=WORK/'inferior-horn-partial19-meshes-v1'
        base_sha='ba31c7b26409ce771fe5df47548299e671489649580a004017bd0617c9100efb'
        final_sha='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
        if digest((stage/'repair.json').read_bytes())!='7075358385037d381b17207d786939dcf3ea0b6dc765948357ba1689563fd021':
            raise ValueError('Partial19 repair record changed')
    if outer40:
        stage=WORK/'inferior-horn-outer40-stage-v1'
        out=WORK/'inferior-horn-outer40-meshes-v1'
        base_sha='58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7'
        final_sha='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
        if digest((stage/'repair.json').read_bytes())!='2b85f78bb78dffb8614e8201c2d60da57977d9fe8ca0eb7b0ed391364d62e8f9':
            raise ValueError('Outer40 repair record changed')
    if fourth_anterior:
        stage=WORK/'fourth-ventricle-anterior105-stage-v1'
        out=WORK/'fourth-ventricle-anterior105-meshes-v1'
        base_sha='e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
        final_sha='ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'
        if digest((stage/'repair.json').read_bytes())!='1c47eb7801d6c90f1d62b89401b6774a62108546c7c42c2974693380e7014e8a':
            raise ValueError('Fourth anterior repair record changed')
    if third_detached8:
        stage=WORK/'third-detached8-stage-v1'
        out=WORK/'third-detached8-meshes-v1'
        base_sha='ffb8e56e0939f97b6bc9f8e2585bb3f74e11b525006c6f7d631ae85cd4b033c2'
        final_sha='b45c0669122b628529f56e73af06fa1cb697b621da99d51c8b921b136ea52463'
        if digest((stage/'repair.json').read_bytes())!='0841a4435a88132d698d4f905ebfedff028d1e1f589c3ab6359e1a7c76a65ba1':
            raise ValueError('Third detached repair record changed')
    if lateral_detached547:
        stage=WORK/'lateral-detached547-stage-v1'
        out=WORK/'lateral-detached547-meshes-v1'
        base_sha='b45c0669122b628529f56e73af06fa1cb697b621da99d51c8b921b136ea52463'
        final_sha='7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
        if digest((stage/'repair.json').read_bytes())!='d8655c4d9a7f356b97d589b96ac5671cfc9923ede5932ecb40a594b3a83bfba6':
            raise ValueError('Lateral detached repair record changed')
    if lateral_residual80:
        stage=WORK/'lateral-residual80-stage-v1'
        out=WORK/'lateral-residual80-meshes-v1'
        base_sha='7d2b88c3e966b9633571e1d5cfe4d86a99439e2ea7873c672217abd4c235a1f2'
        final_sha='a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
        if digest((stage/'repair.json').read_bytes())!='7fa310a4165d7cb199235b37c483d45513b5bb33d24a0b0e864e66b229f2c722':
            raise ValueError('Lateral residual80 record changed')
    if cavity21:
        stage=WORK/'lateral-cavity21-stage-v1'
        out=WORK/'lateral-cavity21-meshes-v1'
        base_sha='a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
        final_sha='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
        if digest((stage/'repair.json').read_bytes())!='50275ff60114f8e524ad7fa07f682ded7e1673e8fb9c2130b58b9122f18e9e82':
            raise ValueError('Cavity21 repair record changed')
    if crop34:
        stage=WORK/'lateral-crop34-stage-v1'
        out=WORK/'lateral-crop34-meshes-v1'
        base_sha='3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'
        final_sha='a2ceb2649ec0950eb7ba0620f38db9f8fc83293ad46bb2b7fcce82091360a6c5'
        if digest((stage/'repair.json').read_bytes())!='41f6300c9cc729ab1def24838c0e6b5c3284a9b21ef2bd85fbe02beb67ddab81':
            raise ValueError('Crop34 repair record changed')
    if stage_prefix:
        from stage_lateral_crop34 import load_batch_stage
        stage,batch=load_batch_stage(stage_prefix,record_sha)
        out=WORK/f'{stage_prefix}-meshes-v1'
        base_sha=batch['beforeSha256'];final_sha=batch['afterSha256']
    if out.exists():
        raise ValueError('Evidence exists')
    _, _, old = read_browser_volume(stage/('before.bin.gz' if third_detached8 or lateral_detached547 or lateral_residual80 or cavity21 or crop34 or stage_prefix else 'base.bin.gz'), MAGIC_LABELS, base_sha)
    _, _, new = read_browser_volume(stage/'labels.bin.gz', MAGIC_LABELS, final_sha)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    coarse = raw.transpose(2,1,0)[::2,::2,::2]
    before = blocks.specimen_definitions(coarse, old.transpose(2,1,0)[::2,::2,::2])
    after = blocks.specimen_definitions(coarse, new.transpose(2,1,0)[::2,::2,::2])
    if before.keys() != after.keys():
        raise ValueError('Block identities differ')
    impacts, outputs = [], []
    for key, parts in before.items():
        if len(parts) != len(after[key]):
            raise ValueError('Part count differs')
        for a, b in zip(parts, after[key]):
            if a.key != b.key:
                raise ValueError('Part identity differs')
            count = int(np.count_nonzero(a.mask != b.mask))
            record = dict(block=key, part=a.key, changedMaskVoxels=count)
            if stage_prefix:
                record.update(added=int(np.count_nonzero(b.mask & ~a.mask)),removed=int(np.count_nonzero(a.mask & ~b.mask)))
            if count:
                name = f'block-{key}-{a.key}.mesh'
                installed = (ROOT/'public/atlas'/name).read_bytes()
                previous = encode(blocks.mesh_from_mask(a.mask, coarse, a.material == 'specimen'))
                mesh = blocks.mesh_from_mask(b.mask, coarse, b.material == 'specimen')
                data = encode(mesh)
                record.update(file=name, beforeSha256=digest(installed), afterSha256=digest(data),
                              reproducedBeforeSha256=digest(previous), beforeMatches=(previous == installed),
                              vertices=len(mesh[0]), faces=len(mesh[3]))
                # Preserve all three artifacts to diagnose pre-existing drift. Never install here.
                outputs.append(('installed-'+name, installed))
                outputs.append(('reproduced-before-'+name, previous))
                outputs.append((name, data))
            impacts.append(record)
    if len(impacts) != 55:
        raise ValueError('Expected all 55 masks')
    report = dict(inputSha256=base_sha, outputSha256=final_sha, blockMaskImpact=impacts,
                  installed=False, anatomyValidatedByMaskComparison=False,
                  installationBlocked=any(not r.get('beforeMatches', True) for r in impacts))
    out.mkdir()
    for name, data in outputs:
        (out/name).write_bytes(data)
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps([r for r in impacts if r['changedMaskVoxels']], indent=2))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--fourth-paired', action='store_true')
    parser.add_argument('--lateral-fringe', action='store_true')
    parser.add_argument('--lateral-next', action='store_true')
    parser.add_argument('--lateral-remaining', action='store_true')
    parser.add_argument('--lateral-medium', action='store_true')
    parser.add_argument('--inferior-horn', action='store_true')
    parser.add_argument('--residual-51', action='store_true')
    parser.add_argument('--residual-27', action='store_true')
    parser.add_argument('--partial19', action='store_true')
    parser.add_argument('--outer40', action='store_true')
    parser.add_argument('--fourth-anterior', action='store_true')
    parser.add_argument('--third-detached8', action='store_true')
    parser.add_argument('--lateral-detached547', action='store_true')
    parser.add_argument('--lateral-residual80', action='store_true')
    parser.add_argument('--cavity21', action='store_true')
    parser.add_argument('--crop34', action='store_true')
    parser.add_argument('--stage-prefix')
    parser.add_argument('--record-sha')
    args=parser.parse_args()
    main(args.fourth_paired,args.lateral_fringe,args.lateral_next,args.lateral_remaining,args.lateral_medium,args.inferior_horn,args.residual_51,args.residual_27,args.partial19,args.outer40,args.fourth_anterior,args.third_detached8,args.lateral_detached547,args.lateral_residual80,args.cavity21,args.crop34,args.stage_prefix,args.record_sha)
