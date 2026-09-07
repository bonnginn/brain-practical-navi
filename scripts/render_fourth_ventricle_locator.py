"""Scientific locator rendered directly from the pinned raw volume, no edits."""
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, read_browser_volume, _outline,
)
from prepare_fourth_ventricle_candidate import DEFAULT_LABELS, EXPECTED_LABELS_SHA256


def main():
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, lab = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    plane = raw[195, :, :].T[::-1, :]
    labels = lab[195, :, :].T[::-1, :]
    font_path = 'C:/Windows/Fonts/meiryo.ttc'
    font = ImageFont.truetype(font_path, 20)
    small = ImageFont.truetype(font_path, 16)
    sheet = Image.new('RGB', (1160, 740), '#16212b')
    d = ImageDraw.Draw(sheet)
    d.text((24, 14), '脳のほぼ正中の縦断面（X=195） — 今回の修正位置', font=font, fill='white')
    # Y increases anteriorly; Z increases superiorly in this pinned image.
    sheet.paste(Image.fromarray(plane).convert('RGB').resize((699, 567), Image.Resampling.NEAREST), (20, 80))
    d.text((24, 54), '後ろ（小脳側）', font=small, fill='white')
    d.text((565, 54), '前（顔側）', font=small, fill='white')
    # Locator encloses both the fourth ventricle and the disconnected fragment.
    y0, y1, z0, z1 = 145, 240, 48, 143
    box = (20+y0*1.5, 80+(377-z1)*1.5, 20+y1*1.5, 80+(377-z0)*1.5)
    d.rectangle(box, outline='#ffca55', width=3)
    d.line((box[2], box[1], 752, 110), fill='#ffca55', width=2)
    d.text((752, 75), '黄色枠の拡大（同じ原画像）', font=small, fill='#ffca55')
    crop = plane[377-z1:378-z0, y0:y1+1]
    crop_labels = labels[377-z1:378-z0, y0:y1+1]
    rgb = np.repeat(crop[:, :, None], 3, axis=2)
    # Colors mark stored labels only, not a newly inferred anatomical boundary.
    rgb[_outline(crop_labels == 26)] = [255, 80, 100]
    sheet.paste(Image.fromarray(rgb).resize((384, 384), Image.Resampling.NEAREST), (752, 110))
    def pos(y, z):
        return (752+(y-y0)*4+2, 110+(z1-z)*4+2)
    a = pos(200, 119)
    d.ellipse((a[0]-17, a[1]-23, a[0]+17, a[1]+23), outline='#ffca55', width=3)
    d.line((a[0]+17, a[1], 1110, 150), fill='#ffca55', width=2)
    d.text((1080, 122), '①', font=font, fill='#ffca55')
    b = pos(180, 82)
    d.text((b[0]-12, b[1]-12), '②', font=font, fill='#1144aa')
    d.text((755, 515), '① 今回外す小片：中脳水道付近', font=small, fill='#ffca55')
    d.text((755, 548), '② 第四脳室の主腔：変更しません', font=small, fill='white')
    d.text((24, 667), '小脳と脳幹の間の第四脳室から、上へ離れた小片だけが対象です。', font=font, fill='white')
    d.text((24, 704), '赤線＝既存ID26の輪郭。①のラベルを外す候補で、原画像は変更しません。未採用・専門家未確認。', font=small, fill='#d0dae2')
    out = ROOT/'work/anatomy-review/fourth-ventricle-repair-v1/locator.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)
    print(out)


if __name__ == '__main__':
    main()
