"""Wider context on the same X180 plane; no anatomical edits."""
import json,hashlib
import numpy as np
from PIL import Image,ImageDraw,ImageFont
from render_current_ventral_midbrain import LABEL_SHA
from build_orthogonal_review_bundle import ROOT,DEFAULT_LABELS,DEFAULT_IMAGE,MAGIC_LABELS,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256,read_browser_volume,_oriented_crop,_outline

out=ROOT/'work/user-review-midbrain-wide.png'
if out.exists():raise ValueError('Refusing to overwrite review evidence')
_,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,LABEL_SHA)
_,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
crop={'min':[180,110,30],'max':[180,345,235]}
r=_oriented_crop(raw,'x',180,crop);s=_oriented_crop(labels,'x',180,crop)
rgb=np.repeat(r[:,:,None],3,axis=2)
for ids,color in [([27],[255,75,75]),([1,2],[80,255,255]),([3,4],[250,150,45]),([5,6],[220,100,255]),([15,16],[160,180,255])]:rgb[_outline(np.isin(s,ids))]=color
scale=3;w,h=r.shape[1]*scale,r.shape[0]*scale
sheet=Image.new('RGB',(w*2+36,h+136),'#faf9f5');d=ImageDraw.Draw(sheet)
font=ImageFont.truetype('C:/Windows/Fonts/meiryo.ttc',18)
d.text((12,8),'広域図：前と同じ左傍矢状断 X180　← 後方（小脳側）　前方 →',font=font,fill='black')
d.text((12,36),'原画像',font=font,fill='black');d.text((w+24,36),'現在のラベル（確定境界ではありません）',font=font,fill='black')
for offset,data in [(12,r),(w+24,rgb)]:
 sheet.paste(Image.fromarray(data).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(offset,70))
 d.rectangle((offset+(210-110)*scale,70+(235-150)*scale,offset+(247-110)*scale,70+(235-127)*scale),outline='#e33131',width=2)
d.text((12,h+78),'赤枠は前の図と同じ確認範囲です。境界線の提案ではありません。',font=font,fill='black')
d.text((12,h+106),'青紫：視床　水色：赤核　橙：黒質　紫：視床下核　赤の輪郭：現在の脳幹',font=font,fill='black')
sheet.save(out)
record=dict(imageSha256=EXPECTED_IMAGE_SHA256,labelsSha256=LABEL_SHA,axis='x',index=180,crop=crop,scale=scale,panels=[dict(origin=[12,70]),dict(origin=[w+24,70])],reviewRectangle=dict(y=[210,247],z=[127,150]),mutation=False,outputSha256=hashlib.sha256(out.read_bytes()).hexdigest())
out.with_suffix('.json').write_text(json.dumps(record,indent=2)+'\n',encoding='utf-8')
print(out)
