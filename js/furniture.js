/* ============================================================
   furniture.js —— 家具构件库（全部程序化生成）
   约定：每个构件原点在「占地中心、地面 y=0」
   朝向：+X 为构件正面右方向，-Z 为背面（靠墙方向）
   ============================================================ */
(function () {
  const H3 = (window.H3 = window.H3 || {});
  const M = H3.mat;
  const geoCache = new Map();

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function rboxGeo(w, h, d, r) {
    const key = [w, h, d, r].map(v => v.toFixed(3)).join('|');
    if (geoCache.has(key)) return geoCache.get(key);
    const rr = Math.max(0.004, Math.min(r, w / 2 - 0.003, h / 2 - 0.003, d / 2 - 0.003));
    const x0 = -(w / 2 - rr), x1 = (w / 2 - rr), y0 = -(h / 2 - rr), y1 = (h / 2 - rr);
    const s = new THREE.Shape();
    s.moveTo(x0, y0 + rr);
    s.lineTo(x0, y1 - rr);
    s.quadraticCurveTo(x0, y1, x0 + rr, y1);
    s.lineTo(x1 - rr, y1);
    s.quadraticCurveTo(x1, y1, x1, y1 - rr);
    s.lineTo(x1, y0 + rr);
    s.quadraticCurveTo(x1, y0, x1 - rr, y0);
    s.lineTo(x0 + rr, y0);
    s.quadraticCurveTo(x0, y0, x0, y0 + rr);
    const depth = Math.max(0.004, d - 2 * rr);
    const g = new THREE.ExtrudeGeometry(s, {
      depth: depth, bevelEnabled: true, bevelThickness: rr, bevelSize: rr,
      bevelSegments: 2, curveSegments: 4, steps: 1
    });
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    geoCache.set(key, g);
    return g;
  }

  function rbox(w, h, d, r, mat, x, y, z) {
    const m = new THREE.Mesh(rboxGeo(w, h, d, r), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function cyl(rt, rb, h, seg, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 16), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function sph(r, mat, x, y, z, seg) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg || 12, seg ? seg - 2 : 10), mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  function plate(w, h, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(x || 0, y || 0, z || 0);
    return m;
  }

  /* ================= 卧室 ================= */

  // 床：headboard 在 -Z
  function bed(w, l, opt) {
    opt = opt || {};
    const g = new THREE.Group();
    const duvetMat = opt.duvet || M.duvetBlue;
    const frameMat = opt.frame || M.woodWalnut;

    // 床架
    g.add(rbox(w + 0.10, 0.26, l + 0.06, 0.035, frameMat, 0, 0.16, 0));
    // 内嵌踢脚
    g.add(box(w - 0.06, 0.06, l - 0.04, M.black, 0, 0.03, 0));
    // 床垫
    g.add(rbox(w, 0.24, l - 0.04, 0.07, M.linen, 0, 0.41, 0));
    // 被子（覆盖 2/3，靠近床尾）
    const dl = l * 0.64;
    g.add(rbox(w + 0.05, 0.14, dl, 0.06, duvetMat, 0, 0.545, l / 2 - dl / 2 - 0.02));
    // 被子翻边
    g.add(rbox(w + 0.06, 0.05, 0.18, 0.025, M.linen, 0, 0.615, l / 2 - dl - 0.02));
    // 床尾搭毯
    if (opt.throwMat !== false) {
      const tm = opt.throwMat || M.throwTerra;
      g.add(rbox(w + 0.08, 0.075, 0.46, 0.035, tm, 0, 0.625, l / 2 - 0.30));
    }
    // 枕头
    const n = w > 1.5 ? 2 : 1;
    const pw = n === 2 ? (w - 0.26) / 2 : w - 0.34;
    for (let i = 0; i < n; i++) {
      const px = n === 2 ? (i === 0 ? -(pw / 2 + 0.05) : (pw / 2 + 0.05)) : 0;
      const p = rbox(pw, 0.17, 0.4, 0.075, M.pillow, px, 0.60, -l / 2 + 0.30);
      p.rotation.x = -0.18;
      g.add(p);
    }
    // 抱枕
    if (opt.throwPillow) {
      const t = rbox(0.34, 0.34, 0.11, 0.05, M.pillowTerra, w * 0.22, 0.66, -l / 2 + 0.55);
      t.rotation.x = -0.4; t.rotation.z = 0.1;
      g.add(t);
    }
    // 床头板
    const hb = rbox(w + 0.20, 0.95, 0.10, 0.05, opt.headboard || M.sofa, 0, 0.56, -l / 2 - 0.05);
    g.add(hb);
    return g;
  }

  // 衣柜：back 在 -Z
  function wardrobe(w, h, d, opt) {
    opt = opt || {};
    const g = new THREE.Group();
    const body = rbox(w, h, d, 0.015, M.wood, 0, h / 2, 0);
    g.add(body);
    // 柜门分割
    const n = opt.doors || Math.max(2, Math.round(w / 0.55));
    const pw = w / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + pw * (i + 0.5);
      const p = box(pw - 0.012, h - 0.08, 0.022, M.wood, x, h / 2, d / 2 + 0.011);
      g.add(p);
      // 拉手
      if (opt.handles !== false) {
        const hd = cyl(0.008, 0.008, 0.26, 8, M.metalDark, x + (i % 2 === 0 ? pw / 2 - 0.06 : -pw / 2 + 0.06), h / 2 + 0.18, d / 2 + 0.035);
        g.add(hd);
      }
    }
    return g;
  }

  function nightstand(h) {
    const g = new THREE.Group();
    const H = h || 0.5;
    g.add(rbox(0.46, H, 0.42, 0.02, M.wood, 0, H / 2, 0));
    g.add(box(0.42, 0.02, 0.38, M.black, 0, H * 0.62, 0.005));
    g.add(cyl(0.008, 0.008, 0.10, 8, M.metalDark, 0, H * 0.62, 0.21).rotateX(Math.PI / 2));
    // 台灯
    const lx = 0, lz = -0.02;
    g.add(cyl(0.055, 0.065, 0.03, 14, M.metal, lx, H + 0.015, lz));
    g.add(cyl(0.012, 0.012, 0.22, 8, M.metal, lx, H + 0.13, lz));
    const shade = cyl(0.085, 0.115, 0.16, 16, M.shade, lx, H + 0.30, lz);
    g.add(shade);
    g.add(sph(0.03, M.bulb, lx, H + 0.27, lz));
    return g;
  }

  function dresser(w, h, d) {
    const g = new THREE.Group();
    const H = h || 0.78;
    g.add(rbox(w, H, d, 0.02, M.wood, 0, H / 2 + 0.02, 0));
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      g.add(box(w - 0.06, 0.012, 0.02, M.black, 0, 0.06 + (H - 0.1) * (r + 1) / rows, d / 2 + 0.008));
    }
    for (let r = 0; r < rows; r++) {
      g.add(cyl(0.007, 0.007, w * 0.32, 8, M.metalDark, 0, 0.06 + (H - 0.1) * (r + 0.5) / rows, d / 2 + 0.03)
        .rotateZ(Math.PI / 2));
    }
    return g;
  }

  // 书桌
  function desk(w, d) {
    const g = new THREE.Group();
    const H = 0.74;
    g.add(box(w, 0.035, d, M.wood, 0, H, 0));
    g.add(box(w - 0.02, 0.10, d - 0.06, M.wood, 0, H - 0.08, -0.02));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(cyl(0.018, 0.018, H, 8, M.metalDark, sx * (w / 2 - 0.06), H / 2, sz * (d / 2 - 0.06)));
    }
    return g;
  }

  /* ================= 客厅 ================= */

  // 沙发：正面朝 +Z，靠背在 -Z
  function sofa(len, dep) {
    const g = new THREE.Group();
    const armW = 0.17;
    const inner = len - armW * 2;

    g.add(box(len - 0.12, 0.12, dep - 0.12, M.woodDark, 0, 0.06, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(cyl(0.022, 0.022, 0.13, 8, M.metalDark, sx * (len / 2 - 0.12), 0.065, sz * (dep / 2 - 0.14)));
    }
    // 座体
    g.add(rbox(len, 0.26, dep, 0.06, M.sofa, 0, 0.30, 0));
    // 靠背
    g.add(rbox(len, 0.52, 0.20, 0.07, M.sofa, 0, 0.66, -dep / 2 + 0.10));
    // 扶手
    for (const sx of [-1, 1]) {
      g.add(rbox(armW, 0.46, dep, 0.075, M.sofa, sx * (len / 2 - armW / 2), 0.53, 0));
    }
    // 坐垫
    const n = Math.max(2, Math.round(inner / 0.78));
    const cw = inner / n;
    for (let i = 0; i < n; i++) {
      const x = -inner / 2 + cw * (i + 0.5);
      g.add(rbox(cw - 0.02, 0.17, dep - 0.28, 0.06, M.sofaCushion, x, 0.50, 0.06));
      const bk = rbox(cw - 0.03, 0.40, 0.17, 0.06, M.sofaCushion, x, 0.72, -dep / 2 + 0.24);
      bk.rotation.x = 0.12;
      g.add(bk);
    }
    // 抱枕
    const pp = rbox(0.33, 0.33, 0.11, 0.05, M.pillowTerra, -inner / 2 + 0.30, 0.68, -dep / 2 + 0.34);
    pp.rotation.x = 0.25; pp.rotation.z = -0.12;
    g.add(pp);
    const pp2 = rbox(0.30, 0.30, 0.10, 0.05, M.pillow, inner / 2 - 0.28, 0.67, -dep / 2 + 0.34);
    pp2.rotation.x = 0.25; pp2.rotation.z = 0.14;
    g.add(pp2);
    return g;
  }

  function armchair() {
    return sofa(0.78, 0.80);
  }

  function coffeeTable(w, d) {
    const g = new THREE.Group();
    g.add(rbox(w, 0.045, d, 0.02, M.woodWalnut, 0, 0.40, 0));
    g.add(rbox(w - 0.24, 0.03, d - 0.2, 0.015, M.wood, 0, 0.16, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      g.add(box(0.04, 0.40, 0.04, M.metalDark, sx * (w / 2 - 0.08), 0.20, sz * (d / 2 - 0.08)));
    }
    // 摆件
    g.add(rbox(0.22, 0.03, 0.16, 0.008, M.leather, -w * 0.22, 0.44, 0));
    g.add(rbox(0.20, 0.025, 0.14, 0.008, M.pillowTerra, -w * 0.22, 0.47, 0.01));
    const bowl = cyl(0.10, 0.06, 0.07, 18, M.ceramicMatte, w * 0.24, 0.46, 0.02);
    g.add(bowl);
    return g;
  }

  function sideTable() {
    const g = new THREE.Group();
    g.add(cyl(0.22, 0.22, 0.03, 20, M.woodWalnut, 0, 0.5, 0));
    g.add(cyl(0.03, 0.03, 0.5, 10, M.metalDark, 0, 0.25, 0));
    g.add(cyl(0.16, 0.16, 0.02, 16, M.metalDark, 0, 0.01, 0));
    return g;
  }

  // 电视柜：背面在 -Z
  function tvUnit(w) {
    const g = new THREE.Group();
    const H = 0.40;
    g.add(rbox(w, H, 0.40, 0.02, M.wood, 0, H / 2 + 0.06, 0));
    g.add(box(w - 0.10, 0.06, 0.30, M.woodDark, 0, 0.03, 0));
    // 门缝
    const n = Math.max(2, Math.round(w / 0.6));
    for (let i = 1; i < n; i++) {
      g.add(box(0.008, H - 0.06, 0.02, M.black, -w / 2 + w * i / n, H / 2 + 0.06, 0.2));
    }
    return g;
  }

  // 壁挂电视（背板贴墙，屏幕朝 -Z 方向的反面）—— 默认屏幕朝 +Z
  function tv(w) {
    const g = new THREE.Group();
    const h = w * 0.565;
    g.add(box(w, h, 0.04, M.black, 0, 0, 0));
    g.add(plate(w - 0.03, h - 0.03, M.screen, 0, 0, 0.021));
    g.add(box(w * 0.25, 0.14, 0.03, M.metalDark, 0, -h / 2 + 0.02, -0.05));
    return g;
  }

  function rug(w, d, mat) {
    const g = new THREE.Group();
    const m = rbox(w, 0.014, d, 0.006, mat || M.rug, 0, 0.007, 0);
    m.receiveShadow = true; m.castShadow = false;
    g.add(m);
    return g;
  }

  function curtain(w, h) {
    const g = new THREE.Group();
    const geo = new THREE.PlaneGeometry(w, h, 40, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin(x * 16) * 0.035 + Math.sin(x * 7.3) * 0.02);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xded8cc, roughness: 0.95, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    mesh.castShadow = true;
    g.add(mesh);
    return g;
  }

  function floorLamp() {
    const g = new THREE.Group();
    g.add(cyl(0.15, 0.17, 0.025, 20, M.metalDark, 0, 0.012, 0));
    g.add(cyl(0.018, 0.018, 1.55, 10, M.metalDark, 0, 0.79, 0));
    const shade = cyl(0.16, 0.22, 0.28, 20, M.shade, 0, 1.62, 0);
    shade.material = M.shade;
    g.add(shade);
    g.add(sph(0.05, M.bulb, 0, 1.55, 0));
    return g;
  }

  function pendant(drop) {
    const g = new THREE.Group();
    g.add(cyl(0.006, 0.006, drop, 6, M.black, 0, -drop / 2, 0));
    g.add(cyl(0.005, 0.005, 0.14, 6, M.black, 0, -drop - 0.07, 0));
    const shade = cyl(0.05, 0.22, 0.20, 22, M.shade, 0, -drop - 0.24, 0);
    g.add(shade);
    g.add(sph(0.055, M.bulb, 0, -drop - 0.30, 0));
    return g;
  }

  /* ================= 餐厨 ================= */

  function diningChair() {
    const g = new THREE.Group();
    // 座垫
    g.add(rbox(0.44, 0.06, 0.44, 0.03, M.sofaCushion, 0, 0.45, 0));
    g.add(rbox(0.40, 0.03, 0.40, 0.02, M.wood, 0, 0.42, 0));
    // 靠背
    const back = rbox(0.42, 0.44, 0.05, 0.025, M.wood, 0, 0.68, -0.19);
    back.rotation.x = -0.10;
    g.add(back);
    const pad = rbox(0.36, 0.26, 0.03, 0.02, M.sofaCushion, 0, 0.72, -0.16);
    pad.rotation.x = -0.10;
    g.add(pad);
    // 腿
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = cyl(0.016, 0.020, 0.44, 8, M.woodWalnut, sx * 0.18, 0.22, sz * 0.18);
      leg.rotation.z = sx * 0.05; leg.rotation.x = -sz * 0.05;
      g.add(leg);
    }
    return g;
  }

  function diningTableRound(r) {
    const g = new THREE.Group();
    g.add(cyl(r, r, 0.045, 40, M.woodWalnut, 0, 0.74, 0));
    g.add(cyl(r - 0.05, r - 0.05, 0.02, 40, M.wood, 0, 0.71, 0));
    g.add(cyl(0.05, 0.06, 0.70, 16, M.metalDark, 0, 0.36, 0));
    g.add(cyl(0.24, 0.26, 0.03, 24, M.metalDark, 0, 0.02, 0));
    // 餐具
    g.add(cyl(0.11, 0.10, 0.02, 20, M.ceramic, 0, 0.775, 0));
    g.add(cyl(0.035, 0.03, 0.16, 12, M.glassFrost, 0.22, 0.84, 0.10));
    return g;
  }

  // 橱柜（沿 +X 展开，背面在 -Z）
  function kitchenRun(len, opt) {
    opt = opt || {};
    const g = new THREE.Group();
    const D = 0.58, CH = 0.86;

    // 踢脚
    g.add(box(len, 0.10, D - 0.08, M.black, 0, 0.05, -0.05));
    // 柜体
    g.add(box(len, CH - 0.14, D - 0.03, M.wood, 0, 0.10 + (CH - 0.14) / 2, -0.015));
    // 门板
    const n = Math.max(2, Math.round(len / 0.55));
    const pw = len / n;
    for (let i = 0; i < n; i++) {
      const x = -len / 2 + pw * (i + 0.5);
      g.add(box(pw - 0.014, CH - 0.24, 0.02, M.wood, x, 0.10 + (CH - 0.14) / 2, D / 2 + 0.005));
      g.add(cyl(0.007, 0.007, 0.16, 8, M.metalDark, x + (i % 2 ? -1 : 1) * (pw / 2 - 0.055), CH - 0.22, D / 2 + 0.03));
    }
    // 台面
    g.add(box(len + 0.03, 0.04, D + 0.03, M.quartz, 0, CH + 0.02, 0));
    // 挡水
    g.add(box(len + 0.03, 0.06, 0.02, M.quartz, 0, CH + 0.05, -D / 2 + 0.01));
    // 墙面砖（浅色背板）
    g.add(box(len, 0.62, 0.012, M.wallWet, 0, CH + 0.35, -D / 2 - 0.006));

    // 水槽
    if (opt.sinkAt !== undefined) {
      const sx = opt.sinkAt;
      g.add(box(0.62, 0.012, 0.42, M.metal, sx, CH + 0.005, 0));
      g.add(box(0.56, 0.10, 0.36, M.metalDark, sx, CH - 0.05, 0));
      const f = cyl(0.014, 0.016, 0.30, 12, M.chrome, sx, CH + 0.18, -0.22);
      g.add(f);
      const neck = cyl(0.012, 0.012, 0.22, 12, M.chrome, sx, CH + 0.33, -0.12);
      neck.rotation.x = Math.PI / 2 * 1.0;
      g.add(neck);
    }
    // 灶台
    if (opt.stoveAt !== undefined) {
      const sx = opt.stoveAt;
      g.add(box(0.60, 0.012, 0.50, M.black, sx, CH + 0.006, 0));
      for (const dx of [-0.14, 0.14]) for (const dz of [-0.11, 0.11]) {
        g.add(cyl(0.065, 0.065, 0.008, 18, M.metalDark, sx + dx, CH + 0.014, dz));
        g.add(cyl(0.05, 0.05, 0.004, 18, M.black, sx + dx, CH + 0.019, dz));
      }
      // 抽油烟机
      g.add(box(0.62, 0.10, 0.52, M.metal, sx, 1.68, -0.10));
      g.add(box(0.30, 0.55, 0.30, M.metal, sx, 1.98, -0.22));
      g.add(box(0.34, 0.02, 0.34, M.metalDark, sx, 2.25, -0.22));
    }
    // 吊柜
    if (opt.upper !== false) {
      const uw = opt.upperW || len * 0.55;
      const ux = opt.upperX || (-len / 2 + uw / 2 + 0.1);
      g.add(box(uw, 0.66, 0.34, M.wood, ux, 1.90, -D / 2 + 0.17));
      const un = Math.max(2, Math.round(uw / 0.5));
      for (let i = 0; i < un; i++) {
        const x = ux - uw / 2 + uw * (i + 0.5) / un;
        g.add(box(uw / un - 0.012, 0.64, 0.016, M.wood, x, 1.90, -D / 2 + 0.345));
        g.add(cyl(0.006, 0.006, 0.13, 8, M.metalDark, x + (i % 2 ? -1 : 1) * (uw / un / 2 - 0.045), 1.68, -D / 2 + 0.37));
      }
      // 柜底灯带
      const led = box(uw - 0.08, 0.012, 0.03, M.led, ux, 1.56, -D / 2 + 0.32);
      led.castShadow = false;
      g.add(led);
    }
    return g;
  }

  function fridge() {
    const g = new THREE.Group();
    const w = 0.66, h = 1.85, d = 0.66;
    g.add(rbox(w, h, d, 0.02, M.metal, 0, h / 2 + 0.02, 0));
    g.add(box(w - 0.02, 0.012, 0.01, M.metalDark, 0, h * 0.62, d / 2 + 0.005));
    g.add(cyl(0.012, 0.012, 0.55, 8, M.metalDark, w / 2 - 0.09, h * 0.80, d / 2 + 0.035));
    g.add(cyl(0.012, 0.012, 0.42, 8, M.metalDark, w / 2 - 0.09, h * 0.42, d / 2 + 0.035));
    return g;
  }

  function washer() {
    const g = new THREE.Group();
    const w = 0.60, h = 0.85, d = 0.60;
    g.add(rbox(w, h, d, 0.025, M.ceramicMatte, 0, h / 2 + 0.01, 0));
    g.add(cyl(0.19, 0.19, 0.03, 26, M.metalDark, 0, h * 0.48, d / 2 + 0.01).rotateX(Math.PI / 2));
    g.add(cyl(0.155, 0.155, 0.02, 26, M.glass, 0, h * 0.48, d / 2 + 0.025).rotateX(Math.PI / 2));
    g.add(box(w - 0.10, 0.09, 0.02, M.black, 0, h - 0.06, d / 2 + 0.005));
    g.add(cyl(0.035, 0.035, 0.006, 20, M.chrome, w * 0.18, h - 0.06, d / 2 + 0.02).rotateX(Math.PI / 2));
    return g;
  }

  function acUnit() {
    const g = new THREE.Group();
    const w = 0.86, h = 0.62, d = 0.34;
    g.add(rbox(w, h, d, 0.02, M.ceramicMatte, 0, h / 2 + 0.05, 0));
    g.add(cyl(0.24, 0.24, 0.02, 26, M.metalDark, -0.10, h / 2 + 0.05, d / 2 + 0.005).rotateX(Math.PI / 2));
    g.add(cyl(0.22, 0.22, 0.015, 26, M.black, -0.10, h / 2 + 0.05, d / 2 + 0.012).rotateX(Math.PI / 2));
    for (let i = 0; i < 9; i++) {
      g.add(box(0.02, 0.44, 0.01, M.metalDark, 0.20 + (i % 3) * 0.07, h / 2 + 0.05, d / 2 + 0.008));
    }
    return g;
  }

  /* ================= 卫浴 ================= */

  // 马桶：背面 -Z
  function toilet() {
    const g = new THREE.Group();
    // 水箱
    g.add(rbox(0.40, 0.36, 0.18, 0.03, M.ceramic, 0, 0.55, -0.20));
    g.add(cyl(0.03, 0.03, 0.02, 14, M.chrome, 0, 0.735, -0.22));
    // 底座
    const base = cyl(0.15, 0.19, 0.34, 20, M.ceramic, 0, 0.17, 0.02);
    base.scale.z = 1.35;
    g.add(base);
    // 座圈
    const seat = cyl(0.19, 0.19, 0.075, 22, M.ceramic, 0, 0.37, 0.03);
    seat.scale.z = 1.30;
    g.add(seat);
    const lid = cyl(0.175, 0.175, 0.03, 22, M.ceramicMatte, 0, 0.415, 0.03);
    lid.scale.z = 1.28;
    g.add(lid);
    return g;
  }

  // 浴室柜：背面 -Z
  function vanity(w, d) {
    const g = new THREE.Group();
    const H = 0.80;
    g.add(rbox(w, H - 0.14, d, 0.015, M.woodWalnut, 0, 0.10 + (H - 0.14) / 2, 0));
    g.add(box(w - 0.06, 0.10, d - 0.06, M.black, 0, 0.05, 0));
    // 门板
    g.add(box(w - 0.03, H - 0.22, 0.018, M.woodWalnut, 0, 0.10 + (H - 0.14) / 2, d / 2 + 0.006));
    g.add(cyl(0.006, 0.006, 0.14, 8, M.metalDark, 0, H - 0.22, d / 2 + 0.028));
    // 台面
    g.add(box(w + 0.03, 0.045, d + 0.02, M.quartz, 0, H + 0.02, 0));
    // 台盆
    g.add(cyl(0.185, 0.155, 0.11, 26, M.ceramic, 0, H + 0.035, 0.02));
    g.add(cyl(0.16, 0.14, 0.09, 26, M.ceramicMatte, 0, H + 0.06, 0.02));
    // 龙头
    const fc = cyl(0.013, 0.016, 0.24, 12, M.chrome, 0, H + 0.15, -d / 2 + 0.09);
    g.add(fc);
    const nk = cyl(0.011, 0.011, 0.14, 12, M.chrome, 0, H + 0.26, -d / 2 + 0.15);
    nk.rotation.x = Math.PI / 2;
    g.add(nk);
    // 镜子
    const mir = box(w * 0.8, 0.62, 0.03, M.mirror, 0, H + 0.48, -d / 2 - 0.02);
    g.add(mir);
    g.add(box(w * 0.8 + 0.05, 0.03, 0.04, M.metalDark, 0, H + 0.18, -d / 2 - 0.02));
    // 镜前灯
    const lg = box(w * 0.5, 0.03, 0.05, M.led, 0, H + 0.83, -d / 2 + 0.01);
    lg.castShadow = false;
    g.add(lg);
    return g;
  }

  // 淋浴区：玻璃隔断在 +Z 侧，靠墙在 -Z
  function shower(w, d, side) {
    const g = new THREE.Group();
    // 底盘
    g.add(box(w, 0.05, d, M.ceramicMatte, 0, 0.025, 0));
    g.add(box(w - 0.06, 0.02, d - 0.06, M.tileWall ? M.ceramic : M.ceramic, 0, 0.052, 0));
    g.add(cyl(0.05, 0.05, 0.004, 14, M.metalDark, 0, 0.058, 0));
    // 玻璃隔断（沿 X 方向，位于 +Z 边）
    const gl = box(w - 0.02, 2.0, 0.012, M.glass, 0, 1.05, d / 2);
    gl.castShadow = false;
    g.add(gl);
    g.add(box(w - 0.02, 0.03, 0.03, M.metal, 0, 2.06, d / 2));
    g.add(box(w - 0.02, 0.03, 0.03, M.metal, 0, 0.06, d / 2));
    // 淋浴杆 + 顶喷
    const pole = cyl(0.014, 0.014, 1.25, 10, M.chrome, w / 2 - 0.12, 1.55, -d / 2 + 0.06);
    g.add(pole);
    const arm = cyl(0.012, 0.012, 0.34, 10, M.chrome, w / 2 - 0.12, 2.16, -d / 2 + 0.22);
    arm.rotation.x = Math.PI / 2;
    g.add(arm);
    const head = cyl(0.11, 0.10, 0.03, 22, M.chrome, w / 2 - 0.12, 2.14, -d / 2 + 0.38);
    g.add(head);
    // 手持花洒
    const hand = cyl(0.03, 0.018, 0.16, 12, M.chrome, w / 2 - 0.12, 1.42, -d / 2 + 0.10);
    hand.rotation.x = 0.4;
    g.add(hand);
    // 置物架
    g.add(box(0.28, 0.012, 0.14, M.glass, -w / 2 + 0.20, 1.20, -d / 2 + 0.06));
    return g;
  }

  // 浴缸：长边沿 X，靠墙在 -Z
  function tub(w, d) {
    const g = new THREE.Group();
    const H = 0.56;
    // 外壳
    g.add(rbox(w, H, d, 0.06, M.ceramicMatte, 0, H / 2, 0));
    // 缸内
    g.add(rbox(w - 0.16, H - 0.12, d - 0.16, 0.12, M.ceramic, 0, H - 0.04, 0));
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.20, 0.06, d - 0.20), M.ceramic);
    inner.position.set(0, H - 0.10, 0);
    g.add(inner);
    // 缸沿
    g.add(box(w + 0.02, 0.035, d + 0.02, M.ceramicMatte, 0, H + 0.005, 0));
    // 龙头
    g.add(cyl(0.014, 0.016, 0.22, 12, M.chrome, -w / 2 + 0.14, H + 0.13, -d / 2 + 0.10));
    const sp = cyl(0.011, 0.011, 0.16, 12, M.chrome, -w / 2 + 0.14, H + 0.22, -d / 2 + 0.18);
    sp.rotation.x = Math.PI / 2;
    g.add(sp);
    return g;
  }

  function towelRack(w) {
    const g = new THREE.Group();
    g.add(cyl(0.010, 0.010, w, 8, M.chrome, 0, 0, 0).rotateZ(Math.PI / 2));
    const t = box(w * 0.55, 0.42, 0.02, M.linen, 0, -0.24, 0.03);
    g.add(t);
    return g;
  }

  /* ================= 其他 ================= */

  function shoeCabinet(w) {
    const g = new THREE.Group();
    const H = 1.05, D = 0.34;
    g.add(rbox(w, H, D, 0.015, M.wood, 0, H / 2 + 0.10, 0));
    g.add(box(w - 0.05, 0.10, D - 0.05, M.black, 0, 0.05, 0));
    g.add(box(w - 0.04, 0.014, 0.02, M.black, 0, H * 0.55 + 0.10, D / 2 + 0.005));
    // 台面
    g.add(box(w + 0.02, 0.03, D + 0.02, M.quartz, 0, H + 0.115, 0));
    return g;
  }

  function mirrorFull(w, h) {
    const g = new THREE.Group();
    g.add(box(w + 0.04, h + 0.04, 0.03, M.metalDark, 0, h / 2, 0));
    g.add(plate(w, h, M.mirror, 0, h / 2, 0.02));
    return g;
  }

  function plant(h, potR) {
    const g = new THREE.Group();
    const pr = potR || 0.18;
    const ph = pr * 1.5;
    g.add(cyl(pr, pr * 0.78, ph, 18, M.pot, 0, ph / 2, 0));
    g.add(cyl(pr * 0.88, pr * 0.88, 0.03, 18, M.soil, 0, ph - 0.01, 0));
    const trunkH = h * 0.35;
    g.add(cyl(0.018, 0.024, trunkH, 8, M.woodWalnut, 0, ph + trunkH / 2, 0));
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + i;
      const r = h * 0.18 * (0.5 + Math.random() * 0.6);
      const yy = ph + trunkH * 0.6 + Math.random() * h * 0.42;
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), i % 2 ? M.plant2 : M.plant);
      leaf.position.set(Math.cos(a) * r * 0.75, yy, Math.sin(a) * r * 0.75);
      leaf.scale.set(1, 0.72, 1);
      leaf.rotation.set(Math.random(), Math.random(), Math.random());
      leaf.castShadow = true; leaf.receiveShadow = true;
      g.add(leaf);
    }
    return g;
  }

  function books(w, n) {
    const g = new THREE.Group();
    const cols = [0xb5644a, 0x2f5766, 0xd9cfbc, 0x7a6a52, 0x445c46];
    let x = -w / 2;
    for (let i = 0; i < n; i++) {
      const bw = 0.028 + Math.random() * 0.02;
      const bh = 0.20 + Math.random() * 0.05;
      const m = new THREE.MeshStandardMaterial({ color: cols[i % cols.length], roughness: 0.8 });
      g.add(box(bw, bh, 0.16, m, x + bw / 2, bh / 2, 0));
      x += bw + 0.004;
    }
    return g;
  }

  H3.f = {
    box, rbox, cyl, sph, plate,
    bed, wardrobe, nightstand, dresser, desk,
    sofa, armchair, coffeeTable, sideTable, tvUnit, tv, rug, curtain, floorLamp, pendant,
    diningChair, diningTableRound, kitchenRun, fridge, washer, acUnit,
    toilet, vanity, shower, tub, towelRack,
    shoeCabinet, mirrorFull, plant, books
  };
})();
