/* Node 端场景构建自检：不启动 WebGL，仅验证几何生成与摆放 */
const path = require('path');

global.window = global;
global.self = global;

function makeCtx(canvas) {
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return canvas;
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern')
        return () => ({ addColorStop() { }, });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return () => ({ data: new Uint8Array(4) });
      if (k === 'putImageData') return () => { };
      return () => { };
    },
    set() { return true; }
  });
}
function makeCanvas() {
  const c = { width: 0, height: 0, style: {} };
  const ctx = makeCtx(c);
  c.getContext = () => ctx;
  return c;
}
global.document = {
  createElement: (t) => (t === 'canvas' ? makeCanvas() : { style: {}, appendChild() { }, addEventListener() { } }),
  createElementNS: () => makeCanvas(),
  addEventListener() { },
  body: { classList: { add() { }, remove() { }, toggle() { } } }
};
global.navigator = { userAgent: 'node' };
global.devicePixelRatio = 1;

const THREE = require(path.join(__dirname, '..', 'lib', 'three.min.js'));
global.THREE = THREE;
window.THREE = THREE;

require(path.join(__dirname, '..', 'js', 'materials.js'));
require(path.join(__dirname, '..', 'js', 'furniture.js'));
require(path.join(__dirname, '..', 'js', 'plan.js'));
require(path.join(__dirname, '..', 'js', 'build.js'));

const H3 = global.H3;
const out = [];

const scene = new THREE.Scene();
const t0 = Date.now();
let groups;
try {
  groups = H3.build(scene);
  out.push('BUILD OK in ' + (Date.now() - t0) + 'ms');
} catch (e) {
  out.push('BUILD FAILED: ' + e.message);
  out.push(e.stack);
  require('fs').writeFileSync(path.join(__dirname, 'report.txt'), out.join('\n'), 'utf8');
  process.exit(1);
}

let meshes = 0, tris = 0, lights = 0;
const mats = new Set(), geos = new Set();
scene.traverse(o => {
  if (o.isMesh) {
    meshes++;
    geos.add(o.geometry.uuid);
    if (Array.isArray(o.material)) o.material.forEach(m => mats.add(m.uuid));
    else mats.add(o.material.uuid);
    const idx = o.geometry.index;
    tris += idx ? idx.count / 3 : (o.geometry.attributes.position ? o.geometry.attributes.position.count / 3 : 0);
  }
  if (o.isLight) lights++;
});
out.push('meshes=' + meshes + ' drawGeoms=' + geos.size + ' materials=' + mats.size + ' tris=' + Math.round(tris));

const box = new THREE.Box3().setFromObject(scene);
out.push('scene bbox  min(' + box.min.toArray().map(v => v.toFixed(2)) + ')  max(' + box.max.toArray().map(v => v.toFixed(2)) + ')');

/* ---- 校验：洞口是否在墙长范围内 ---- */
let bad = 0;
H3.plan.walls.forEach((w, i) => {
  const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
  (w.op || []).forEach(o => {
    if (o.s < -0.001 || o.e > L + 0.001 || o.e <= o.s) {
      out.push('!! WALL#' + i + ' opening out of range s=' + o.s + ' e=' + o.e + ' L=' + L.toFixed(2));
      bad++;
    }
    if (o.top > (w.h || H3.plan.W) + 0.001) {
      out.push('!! WALL#' + i + ' opening top > wall height');
      bad++;
    }
  });
});
out.push('wall opening check: ' + (bad ? bad + ' problems' : 'all ok'));

/* ---- 校验：家具是否越界 ---- */
const bb = new THREE.Box3();
let outCount = 0;
H3.GROUPS.furniture.children.forEach(g => {
  bb.setFromObject(g);
  const x1 = bb.min.x + H3.plan.cx, x2 = bb.max.x + H3.plan.cx;
  const z1 = bb.min.z + H3.plan.cz, z2 = bb.max.z + H3.plan.cz;
  const B_ = H3.plan.bounds;
  if (x1 < B_.x1 - 0.15 || z1 < B_.z1 - 0.15 || x2 > B_.x2 + 0.15 || z2 > B_.z2 + 0.15) {
    out.push('!! 家具越界 x[' + x1.toFixed(2) + ',' + x2.toFixed(2) + '] z[' + z1.toFixed(2) + ',' + z2.toFixed(2) + ']');
    outCount++;
  }
});
out.push('furniture bounds check: ' + (outCount ? outCount + ' problems' : 'all inside'));

/* ---- 校验：房间面积 ---- */
let total = 0;
H3.plan.rooms.forEach(r => {
  total += r.area;
  out.push('  ' + r.name + '\t' + (r.x2 - r.x1).toFixed(2) + ' × ' + (r.z2 - r.z1).toFixed(2) + ' = ' + r.area.toFixed(2) + '㎡');
});
out.push('室内使用面积合计 = ' + total.toFixed(2) + '㎡');
out.push('碰撞盒数量 = ' + H3.COLLIDERS.length);

require('fs').writeFileSync(path.join(__dirname, 'report.txt'), out.join('\n'), 'utf8');
console.log(out.join('\n'));
