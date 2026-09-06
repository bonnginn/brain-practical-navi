"""Exercise the actual context subtraction expression on controlled masks."""
import ast
from pathlib import Path
import unittest
import numpy as np


class MidbrainContextTests(unittest.TestCase):
    def test_schematic_aqueduct_does_not_excavate_source_tissue(self):
        path=Path(__file__).resolve().parents[1]/'scripts/build_specimen_blocks.py'
        tree=ast.parse(path.read_text(encoding='utf-8'))
        fn=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='specimen_definitions')
        expressions=[n for n in fn.body if isinstance(n,ast.AugAssign) and isinstance(n.target,ast.Name) and n.target.id=='midbrain_slab']
        self.assertEqual(len(expressions),1)
        context=np.ones((5,5,5),dtype=bool);context[0]=False
        masks={key:np.zeros_like(context) for key in ['red_in_slab','nigra_in_slab','aqueduct','cerebral_peduncles']}
        masks['aqueduct'][2,2,2]=True
        masks['red_in_slab'][1,1,1]=True
        masks['nigra_in_slab'][3,3,3]=True
        masks['cerebral_peduncles'][4,4,4]=True
        ns=dict(midbrain_slab=context.copy(),**masks)
        exec(compile(ast.Module(body=expressions,type_ignores=[]),str(path),'exec'),ns)
        self.assertTrue(ns['midbrain_slab'][2,2,2])
        self.assertFalse(ns['midbrain_slab'][1,1,1])
        self.assertFalse(ns['midbrain_slab'][3,3,3])
        self.assertFalse(ns['midbrain_slab'][4,4,4])
        self.assertFalse(np.any(ns['midbrain_slab']&~context))


if __name__=='__main__':unittest.main()
