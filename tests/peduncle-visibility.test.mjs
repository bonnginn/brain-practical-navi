import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('approximate peduncles are explicit highlights, not neutral occluding tissue',()=>{
 const canvas=readFileSync(new URL('../app/AtlasVolumeCanvas.tsx',import.meta.url),'utf8');
 assert.match(canvas,/if\(key==="peduncles"&&!active\)return;/);
 const guard=canvas.indexOf('if(key==="peduncles"&&!active)return;');
 assert.ok(guard>canvas.indexOf('const active=hypothalamicOnly||basalHighlights.includes(key)'));
 assert.ok(guard<canvas.indexOf('draw(part,teachingColor(active?palette[index]:neutral'));
 assert.match(canvas,/keepBrainstemOpaqueInGhost&&view==="ghost"&&i>=3/);
 assert.match(canvas,/gl\.depthFunc\(gl\.LEQUAL\)/);
});
