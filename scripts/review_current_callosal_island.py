"""Read-only raw-image review of the September 12 remaining ID30 island."""
import hashlib
import json
import numpy as np
from scipy import ndimage
from PIL import Image
import build_orthogonal_review_bundle as source
from render_callosal_inferior_component import frame
from stage_callosal_remaining304 import LABEL_SHA


def main():
    _, dims, raw = source.read_browser_volume(source.DEFAULT_IMAGE, source.MAGIC_IMAGE, source.EXPECTED_IMAGE_SHA256)
    baseline = source.ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-callosal-remaining304.bin.gz'
    _, _, labels = source.read_browser_volume(baseline, source.MAGIC_LABELS, LABEL_SHA)
    cc, _ = ndimage.label(labels == 30)
    target = cc == 6
    points = np.argwhere(target)
    if len(points) != 304 or points.min(0).tolist() != [205, 290, 198] or points.max(0).tolist() != [216, 306, 208]:
        raise ValueError('Pinned candidate identity changed')
    out = source.ROOT/'work/anatomy-review/callosal-remaining-304-v1'
    out.mkdir(parents=True, exist_ok=False)
    crop = dict(min=(points.min(0)-24).tolist(), max=(points.max(0)+24).tolist())
    report = dict(imageSha256=source.EXPECTED_IMAGE_SHA256, labelSha256=LABEL_SHA,
                  count=len(points), minimum=points.min(0).tolist(), maximum=points.max(0).tolist(),
                  labelMutation=False, adopted=False, figures=[],
                  orientation='X: anterior right, superior top; Y: X increases right, superior top; Z: anterior top, X increases right')
    indices = np.sort(np.ravel_multi_index(points.T, dims, order='F')).astype('<u4')
    report['indicesSha256'] = hashlib.sha256(indices.tobytes()).hexdigest()
    for a, axis in enumerate('xyz'):
        views = [(i, frame(raw, labels, target, axis, i, crop, 3, 'remaining island'))
                 for i in range(int(points[:, a].min())-1, int(points[:, a].max())+2)]
        for start in range(0, len(views), 4):
            group = views[start:start+4]
            sheet = Image.new('RGB', (group[0][1].width, sum(v.height for _, v in group)))
            y = 0
            for _, view in group:
                sheet.paste(view, (0, y))
                y += view.height
            name = f'{axis}-{group[0][0]}-{group[-1][0]}.png'
            sheet.save(out/name)
            report['figures'].append(dict(file=name, indices=[i for i, _ in group], sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
        index = int(np.bincount(points[:, a], minlength=dims[a]).argmax())
        full = dict(min=[0, 0, 0], max=(np.array(dims)-1).tolist())
        frame(raw, labels, target, axis, index, full, 1, 'remaining island').save(out/f'locator-{axis}.png')
    (out/'report.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
