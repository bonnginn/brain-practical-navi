"""Verify raw-plane coverage and lossless contacts, not anatomical interpretation."""
import hashlib
import json
import unittest
from pathlib import Path
from PIL import Image, ImageChops

WORK=Path(__file__).resolve().parents[1]/'work/anatomy-review'


class WideEvidenceTests(unittest.TestCase):
    def check_bundle(self,folder,expected):
        report=json.loads((folder/'report.json').read_text(encoding='utf-8'))
        self.assertEqual([(p['axis'],p['index']) for p in report['figures']],expected)
        self.assertEqual(report['labelSha256'],'58d8044071bd0b638bfdbbcc309c35ac3301a9c8f449b8ebcc5b77e5435cfae7')
        by_name={p['path']:p for p in report['figures']};covered=[]
        for c in report['contacts']:
            self.assertFalse(c['resampled'])
            blob=(folder/c['path']).read_bytes()
            self.assertEqual(hashlib.sha256(blob).hexdigest(),c['sha256'])
            with Image.open(folder/c['path']) as source:sheet=source.convert('RGB')
            w,h=sheet.width//2,sheet.height//2
            for n,name in enumerate(c['sourcePanels']):
                data=(folder/name).read_bytes()
                self.assertEqual(hashlib.sha256(data).hexdigest(),by_name[name]['sha256'])
                with Image.open(folder/name) as source:panel=source.convert('RGB')
                x,y=(n%2)*w,(n//2)*h
                self.assertIsNone(ImageChops.difference(panel,sheet.crop((x,y,x+panel.width,y+panel.height))).getbbox())
                covered.append(name)
        self.assertEqual(covered,[p['path'] for p in report['figures']])

    def test_coronal_series_has_no_skipped_planes(self):
        self.check_bundle(WORK/'inferior-horn-partial19-wide-series-v1',[('y',i) for i in range(398,419)])

    def test_orthogonal_locator_planes_match_record(self):
        self.check_bundle(WORK/'inferior-horn-partial19-wide-orthogonal-v1',
                          [('x',i) for i in [395,410,425,440]]+[('z',i) for i in [175,185,195,205]])

    def test_outer_candidate_all_reviewed_planes_and_contacts(self):
        self.check_bundle(WORK/'inferior-horn-outer-after19-finite-v1',
                          [('x',i) for i in range(444,458)]+
                          [('y',i) for i in range(399,419)]+
                          [('z',i) for i in range(164,179)])


if __name__=='__main__':unittest.main()
