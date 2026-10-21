/* ============================================================
   build.js —— 场景组装
   ============================================================ */
(function () {
  const H3 = (window.H3 = window.H3 || {});
  const F = H3.f, M = H3.mat, P = H3.plan;
  const GROUPS = {};

  /* ---------------- 墙体 ---------------- */
  function buildWall(wall, height) {
    const g = new THREE.Group();
    const [ax, az] = wall.a, [bx, bz] = wall.b;
    const dx = bx - ax, dz = bz - az;
    const L = Math.hypot(dx, dz);
    const ang = Math.atan2(dz, dx);
    const t = wall.t;
    const H = height || wall.h || P.W;
    const mat = wall.ext ? M.wallOut : M.wall;
    const ops = (wall.op || []).slice().sort((p, q) => p.s - q.s);

    g.position.set(ax, 0, az);
    g.rotation.y = -ang;

    const pieces = [];
    let cursor = 0;
    for (const o of ops) {
      if (o.s > cursor) pieces.push([cursor, o.s, 0, H]);
      if (o.sill > 0.001) pieces.push([o.s, o.e, 0, Math.min(o.sill, H)]);
      if (o.top < H - 0.001) pieces.push([o.s, o.e, o.top, H]);
      cursor = Math.max(cursor, o.e);
    }
    if (cursor < L) pieces.push([cursor, L, 0, H]);

    for (const p of pieces) {
      const len = p[1] - p[0], hh = p[3] - p[2];
      if (len <= 0.002 || hh <= 0.002) continue;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, hh, t), mat);
      m.position.set((p[0] + p[1]) / 2, p[2] + hh / 2, 0);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      // 碰撞体（仅地面以上的实墙段）
      if (p[2] < 0.25) {
        const x1 = ax + Math.cos(ang) * p[0], z1 = az + Math.sin(ang) * p[0];
        const x2 = ax + Math.cos(ang) * p[1], z2 = az + Math.sin(ang) * p[1];
        COLLIDERS.push({
          x1: Math.min(x1, x2) - t / 2, z1: Math.min(z1, z2) - t / 2,
          x2: Math.max(x1, x2) + t / 2, z2: Math.max(z1, z2) + t / 2
        });
      }
    }

    // 栏板压顶
    if (wall.rail) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(L, 0.05, t + 0.03), M.metal);
      cap.position.set(L / 2, H + 0.02, 0);
      cap.castShadow = true;
      g.add(cap);
      for (let x = 0.08; x < L; x += 0.14) {
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, H - 0.06, 0.02), M.metalDark);
        b.position.set(x, (H - 0.06) / 2, 0);
        g.add(b);
      }
    }

    // 洞口装饰
    for (const o of ops) {
      addOpening(g, o, t, H, ang);
    }
    return g;
  }

  /* 门窗框 / 玻璃 */
  function addOpening(g, o, t, H, ang) {
    const len = o.e - o.s, cx = (o.s + o.e) / 2;
    const fw = 0.05, fd = t + 0.02;
    const isDoor = (o.kind === 'door' || o.kind === 'entry');

    if (isDoor) {
      // 门套
      const jz = 2.12;
      g.add(Mesh(new THREE.BoxGeometry(fw, jz, fd), M.doorFrame, o.s + fw / 2, jz / 2, 0));
      g.add(Mesh(new THREE.BoxGeometry(fw, jz, fd), M.doorFrame, o.e - fw / 2, jz / 2, 0));
      g.add(Mesh(new THREE.BoxGeometry(len, 0.06, fd), M.doorFrame, cx, jz - 0.03, 0));
      return;
    }

    if (o.kind === 'open') {
      // 无门套框的洞口（过厅）
      const jz = o.top;
      g.add(Mesh(new THREE.BoxGeometry(fw, jz, fd), M.doorFrame, o.s + fw / 2, jz / 2, 0));
      g.add(Mesh(new THREE.BoxGeometry(fw, jz, fd), M.doorFrame, o.e - fw / 2, jz / 2, 0));
      g.add(Mesh(new THREE.BoxGeometry(len, 0.05, fd), M.doorFrame, cx, jz - 0.025, 0));
      return;
    }

    // 窗框
    const fd2 = t + 0.02;
    g.add(Mesh(new THREE.BoxGeometry(len, fw, fd2), M.metalDark, cx, o.sill + fw / 2, 0));
    g.add(Mesh(new THREE.BoxGeometry(len, fw, fd2), M.metalDark, cx, o.top - fw / 2, 0));
    g.add(Mesh(new THREE.BoxGeometry(fw, o.top - o.sill, fd2), M.metalDark, o.s + fw / 2, (o.sill + o.top) / 2, 0));
    g.add(Mesh(new THREE.BoxGeometry(fw, o.top - o.sill, fd2), M.metalDark, o.e - fw / 2, (o.sill + o.top) / 2, 0));

    // 竖梃
    const n = Math.max(1, Math.round(len / 0.95));
    for (let i = 1; i < n; i++) {
      const x = o.s + len * i / n;
      g.add(Mesh(new THREE.BoxGeometry(0.035, o.top - o.sill, fd2), M.metalDark, x, (o.sill + o.top) / 2, 0));
    }
    // 横梃（推拉门加一道）
    if (o.kind === 'slide') {
      g.add(Mesh(new THREE.BoxGeometry(len, 0.045, fd2), M.metalDark, cx, o.sill + (o.top - o.sill) * 0.72, 0));
    }
    // 玻璃
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(len - 0.06, o.top - o.sill - 0.06, 0.012), M.glass);
    glass.position.set(cx, (o.sill + o.top) / 2, 0);
    glass.castShadow = false;
    g.add(glass);

    // 内窗台
    const sill = new THREE.Mesh(new THREE.BoxGeometry(len + 0.10, 0.035, t + 0.10), M.quartz);
    sill.position.set(cx, o.sill - 0.017, 0);
    sill.receiveShadow = true; sill.castShadow = true;
    g.add(sill);
  }

  function Mesh(geo, mat, x, y, z) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }

  const COLLIDERS = [];
  H3.COLLIDERS = COLLIDERS;

  /* ---------------- 门扇 ---------------- */
  function buildDoors(parent) {
    for (const d of P.doors) {
      const g = new THREE.Group();
      g.position.set(d.hinge[0], 0, d.hinge[1]);
      g.rotation.y = d.rot;
      const isEntry = d.kind === 'entry';
      const leaf = new THREE.Mesh(
        new THREE.BoxGeometry(d.w - 0.03, 2.03, 0.045),
        isEntry ? M.woodDark : M.doorWood);
      leaf.position.set((d.w - 0.03) / 2 + 0.015, 1.02, 0);
      leaf.castShadow = true; leaf.receiveShadow = true;
      g.add(leaf);
      // 门芯板凹槽
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(d.w - 0.20, 1.55, 0.012), isEntry ? M.woodWalnut : M.wood);
      panel.position.set((d.w - 0.03) / 2 + 0.015, 1.05, 0.028);
      g.add(panel);
      // 把手
      const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 10), M.chrome);
      h1.rotation.x = Math.PI / 2;
      h1.position.set(d.w - 0.12, 1.02, 0.06);
      g.add(h1);
      const h2 = h1.clone(); h2.position.z = -0.06; g.add(h2);
      parent.add(g);
    }
  }

  /* ---------------- 地面 ---------------- */
  function floorMat(kind, w, d) {
    if (kind === 'wood') {
      const t = H3.tex.wood.clone(); t.needsUpdate = true;
      t.repeat.set(w / 1.6, d / 1.6);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.72, metalness: 0.02, color: 0xffffff, envMapIntensity: 0.3 });
    }
    if (kind === 'tile' || kind === 'tileWarm' || kind === 'tileGray') {
      const t = H3.tex[kind].clone(); t.needsUpdate = true;
      t.repeat.set(w / 1.2, d / 1.2);
      return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35, metalness: 0.03, color: 0xffffff, envMapIntensity: 0.3 });
    }
    return new THREE.MeshStandardMaterial({ color: 0xc6c2b9, roughness: 0.95, envMapIntensity: 0.3 });
  }

  function buildFloors(parent) {
    for (const r of P.floors) {
      const w = r.x2 - r.x1, d = r.z2 - r.z1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), floorMat(r.kind, w, d));
      m.position.set((r.x1 + r.x2) / 2, 0.02, (r.z1 + r.z2) / 2);
      m.receiveShadow = true;
      parent.add(m);
    }
  }

  /* ---------------- 烟道 / 管井 ---------------- */
  function buildShafts(parent) {
    for (const s of (P.shafts || [])) {
      const w = s.x2 - s.x1, d = s.z2 - s.z1;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, P.W, d), M.wall);
      m.position.set((s.x1 + s.x2) / 2, P.W / 2, (s.z1 + s.z2) / 2);
      m.castShadow = true; m.receiveShadow = true;
      parent.add(m);
      COLLIDERS.push({ x1: s.x1, z1: s.z1, x2: s.x2, z2: s.z2 });
    }
  }

  /* ---------------- 卫生间墙砖 ---------------- */
  function buildBathTiles(parent) {
    const H = 2.2;
    const baths = P.rooms.filter(r => r.id === 'bath1' || r.id === 'bath2');
    for (const b of baths) {
      const x1 = b.x1, x2 = b.x2, z1 = b.z1, z2 = b.z2;
      const W_ = x2 - x1, D_ = z2 - z1;
      const panels = [
        [0.012, H, D_, x1 + 0.006, H / 2, (z1 + z2) / 2],
        [0.012, H, D_, x2 - 0.006, H / 2, (z1 + z2) / 2],
        [W_, H, 0.012, (x1 + x2) / 2, H / 2, z1 + 0.006],
        [W_ - 0.02, H, 0.012, (x1 + x2) / 2, H / 2, z2 - 0.006]
      ];
      for (const [w, h, d, x, y, z] of panels) {
        const t = H3.tex.tileWall.clone();
        t.needsUpdate = true;
        t.repeat.set(Math.max(w, d) / 1.2, h / 1.2);
        const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.22, metalness: 0.04, envMapIntensity: 0.35 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.receiveShadow = true;
        parent.add(m);
      }
    }
  }

  /* ---------------- 家具摆放 ---------------- */
  function place(parent, obj, x, z, rot, y) {
    const g = new THREE.Group();
    g.position.set(x, y || 0, z);
    g.rotation.y = rot || 0;
    g.add(obj);
    parent.add(g);
    return g;
  }

  function furnish(parent) {
    /* ========== 客厅  净 6.066 × 5.811 ==========
       电视背景墙放在西墙 —— 这是全屋最长的一面连续墙
       （客厅 5.81 + 餐厅 1.41 + 厨房 2.96 ≈ 10.2 m，无窗、无门洞）
       沙发背对东侧过道，正面朝西看电视墙。                        */
    place(parent, featureWall(3.70, 2.58), 0.000, 3.15, Math.PI / 2, 1.31);          // 西墙电视背景墙
    place(parent, F.tvUnit(2.60), 0.255, 3.15, Math.PI / 2);                         // 悬浮电视柜
    place(parent, F.tv(1.90), 0.115, 3.15, Math.PI / 2, 1.26);                       // 壁挂电视
    place(parent, F.rug(3.30, 3.20, M.rug), 2.40, 3.15, 0, 0.005);
    place(parent, F.sofa(2.62, 1.02), 4.40, 3.15, -Math.PI / 2);                     // 沙发朝西
    place(parent, F.coffeeTable(1.35, 0.72), 2.55, 3.15, Math.PI / 2);
    place(parent, F.armchair(), 3.55, 1.30, -0.45);
    place(parent, F.sideTable(), 4.40, 1.55, 0);
    place(parent, F.floorLamp(), 4.78, 4.72, 0);
    place(parent, F.books(0.30, 5), 5.80, 4.55, 0, 0.47);
    place(parent, F.plant(1.15, 0.19), 0.55, 5.45, 0);
    place(parent, F.plant(0.90, 0.15), 5.60, 0.55, 0);
    place(parent, F.plant(1.00, 0.16), 5.55, 5.35, 0);
    place(parent, wallArt(1.10, 0.72), 6.030, 2.10, -Math.PI / 2, 1.62);             // 东墙挂画
    place(parent, wallArt(0.86, 0.60), 6.030, 3.60, -Math.PI / 2, 1.62);
    place(parent, F.curtain(0.60, 2.40), 0.80, 0.22, 0, 0.05);                      // 北窗窗帘
    place(parent, F.curtain(0.60, 2.40), 5.10, 0.22, 0, 0.05);

    /* ========== 主卧  净 2.864 × 5.961 ========== */
    place(parent, F.bed(2.00, 2.05, {
      duvet: M.duvetBlue, throwPillow: true, headboard: M.sofa, throwMat: M.throwTerra
    }), 7.45, 1.28, 0);                                                             // 床头靠北墙
    place(parent, F.nightstand(), 8.72, 0.55, 0);
    place(parent, F.wardrobe(2.10, 2.34, 0.55, { doors: 4 }), 8.86, 3.55, -Math.PI / 2);  // 东墙衣柜
    place(parent, F.wardrobe(1.90, 2.32, 0.55, { doors: 4 }), 7.45, 5.60, Math.PI);       // 南墙整排衣柜
    place(parent, F.rug(2.20, 2.50, M.rug), 7.45, 3.05, 0, 0.005);
    place(parent, F.plant(0.95, 0.16), 6.55, 5.35, 0);
    place(parent, wallArt(0.92, 0.64), 6.475, 3.10, Math.PI / 2, 1.70);
    place(parent, F.curtain(0.60, 2.40), 6.62, 0.22, 0, 0.05);
    place(parent, F.curtain(0.60, 2.40), 8.90, 0.22, 0, 0.05);

    /* ========== 餐厅  净 3.261 × 1.410（西飘窗） ========== */
    place(parent, F.diningTableRound(0.56), 1.55, 6.66, 0);
    place(parent, F.diningChair(), 1.55, 6.02, 0);
    place(parent, F.diningChair(), 1.55, 7.28, Math.PI);
    place(parent, F.diningChair(), 0.88, 6.66, Math.PI / 2);
    place(parent, F.diningChair(), 2.22, 6.66, -Math.PI / 2);
    const pend = F.pendant(0.55);
    pend.position.set(1.55, 2.86, 6.66);
    parent.add(pend);
    place(parent, F.wardrobe(1.05, 0.92, 0.38, { doors: 2 }), 3.05, 6.90, -Math.PI / 2);  // 东墙餐边柜
    place(parent, F.plant(0.86, 0.14), 0.42, 7.12, 0);
    place(parent, F.curtain(0.62, 1.55), 0.22, 6.15, Math.PI / 2, 0.48);
    place(parent, F.curtain(0.62, 1.55), 0.22, 7.28, Math.PI / 2, 0.48);

    /* ========== 厨房  净 3.261 × 2.959（开放式，与餐厅之间无墙） ========== */
    place(parent, F.kitchenRun(1.95, { sinkAt: -0.55, stoveAt: 0.52, upper: true }), 0.29, 8.51, Math.PI / 2);  // 西墙主台面
    place(parent, F.kitchenRun(1.30, { upper: false }), 2.97, 8.12, -Math.PI / 2);                             // 东墙备餐台
    place(parent, F.fridge(), 2.93, 9.15, -Math.PI / 2);                                                       // 冰箱（烟道旁）
    place(parent, F.shoeCabinet(0.78), 0.185, 9.93, Math.PI / 2);                                              // 入户鞋柜
    place(parent, F.plant(0.32, 0.06), 2.97, 8.52, 0, 0.92);                                                   // 台面绿植
    place(parent, F.rug(0.95, 0.70), 0.95, 10.02, 0, 0.005);                                                   // 入户地垫

    /* ========== 次卫  净 1.450 × 2.861 ========== */
    place(parent, F.vanity(0.78, 0.46), 4.28, 6.48, 0);
    place(parent, F.toilet(), 4.84, 7.40, -Math.PI / 2);
    place(parent, F.shower(1.05, 0.85), 4.12, 8.50, 0);
    const tr2 = F.towelRack(0.55);
    tr2.rotation.y = Math.PI / 2;
    tr2.position.set(3.63, 1.50, 7.30);
    parent.add(tr2);

    /* ========== 次卧  净 2.380 × 2.980 ========== */
    place(parent, F.bed(1.50, 2.00, {
      duvet: M.duvetSand, throwMat: M.throwOlive
    }), 6.10, 7.20, 0);                                                             // 床头靠北墙
    place(parent, F.wardrobe(1.45, 2.24, 0.55, { doors: 3 }), 7.20, 7.35, -Math.PI / 2);  // 东墙衣柜
    place(parent, F.nightstand(0.44), 5.32, 6.36, 0);
    place(parent, F.rug(1.10, 0.80, M.rug), 6.05, 8.62, 0, 0.005);
    place(parent, F.plant(0.80, 0.13), 5.35, 8.86, 0);
    place(parent, wallArt(0.68, 0.50), 5.185, 7.55, Math.PI / 2, 1.60);
    place(parent, F.curtain(0.55, 2.30), 5.82, 8.98, Math.PI, 0.05);                // 南窗窗帘
    place(parent, F.curtain(0.55, 2.30), 6.90, 8.98, Math.PI, 0.05);

    /* ========== 主卫  净 1.479 × 2.861 ========== */
    place(parent, F.vanity(0.80, 0.46), 8.50, 6.48, 0);
    place(parent, F.toilet(), 9.02, 7.40, -Math.PI / 2);
    place(parent, F.shower(1.05, 0.85), 8.25, 8.50, 0);
    const tr1 = F.towelRack(0.55);
    tr1.rotation.y = Math.PI / 2;
    tr1.position.set(7.79, 1.50, 7.30);
    parent.add(tr1);

    /* ========== 生活阳台  净 2.875 × 1.241 ========== */
    place(parent, F.wardrobe(1.15, 0.88, 0.52, { doors: 2 }), 3.75, 11.22, Math.PI);  // 洗衣柜
    place(parent, F.plant(0.86, 0.14), 1.85, 11.28, 0);
    place(parent, F.plant(0.70, 0.11), 2.45, 10.62, 0);
  }

  /* 电视背景墙：木格栅 + 深色底板（本地坐标：X=宽，Y=高，正面朝 +Z） */
  function featureWall(w, h) {
    const g = new THREE.Group();
    // 底板
    g.add(Mesh(new THREE.BoxGeometry(w, h, 0.02), M.woodDark, 0, 0, 0.01));
    // 竖向木格栅
    const n = Math.max(6, Math.round(w / 0.145));
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + step * (i + 0.5);
      const s = Mesh(new THREE.BoxGeometry(step * 0.52, h - 0.02, 0.03), M.woodWalnut, x, 0, 0.035);
      g.add(s);
    }
    // 上下压条
    g.add(Mesh(new THREE.BoxGeometry(w, 0.035, 0.05), M.metalDark, 0, h / 2 - 0.02, 0.03));
    g.add(Mesh(new THREE.BoxGeometry(w, 0.035, 0.05), M.metalDark, 0, -h / 2 + 0.02, 0.03));
    return g;
  }

  function wallArt(w, h) {
    const g = new THREE.Group();
    g.add(Mesh(new THREE.BoxGeometry(w, h, 0.035), M.woodDark, 0, 0, 0));
    const c1 = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.9 });
    const c2 = new THREE.MeshStandardMaterial({ color: 0xb08b6a, roughness: 0.9 });
    g.add(Mesh(new THREE.BoxGeometry(w - 0.07, h - 0.07, 0.01), c1, 0, 0, 0.022));
    const inner = Mesh(new THREE.BoxGeometry(w * 0.42, h * 0.30, 0.006), c2, -w * 0.12, -h * 0.10, 0.03);
    g.add(inner);
    return g;
  }

  /* ---------------- 天花 ---------------- */
  function buildCeiling(parent) {
    const g = new THREE.Group();
    for (const s of P.slabs) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(s.x2 - s.x1, 0.08, s.z2 - s.z1), M.ceiling);
      m.position.set((s.x1 + s.x2) / 2, P.W + 0.04, (s.z1 + s.z2) / 2);
      m.receiveShadow = true;
      g.add(m);
    }
    // 筒灯
    const spots = [
      // 客厅
      [1.10, 1.60], [2.90, 1.60], [4.70, 1.60],
      [1.10, 3.60], [2.90, 3.60], [4.70, 3.60],
      [1.10, 5.40], [3.60, 5.40], [5.60, 5.10],
      // 主卧
      [7.00, 1.10], [8.30, 1.10], [7.00, 3.30], [8.30, 3.30], [7.00, 5.20], [8.30, 5.20],
      // 餐厅
      [0.90, 6.30], [2.00, 6.30], [0.90, 7.10], [2.00, 7.10],
      // 厨房
      [1.00, 8.00], [2.20, 8.00], [1.00, 9.40], [2.20, 9.40],
      // 次卫
      [4.30, 6.60], [4.30, 8.50],
      // 次卧
      [5.70, 6.50], [6.80, 6.50], [5.70, 8.40], [6.80, 8.40],
      // 主卫
      [8.45, 6.60], [8.45, 8.50],
      // 阳台
      [2.10, 10.95], [3.40, 10.95]
    ];
    for (const [x, z] of spots) {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 18), M.metal);
      ring.position.set(x, P.W - 0.008, z);
      g.add(ring);
      const led = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.008, 18), M.led);
      led.position.set(x, P.W - 0.018, z);
      g.add(led);
    }
    parent.add(g);
    return g;
  }

  /* ---------------- 底盘 ---------------- */
  function buildBase(parent) {
    const b = P.bounds;
    for (const s of P.slabs) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(s.x2 - s.x1 + 0.30, 0.22, s.z2 - s.z1 + 0.30), M.slab);
      slab.position.set((s.x1 + s.x2) / 2, -0.11, (s.z1 + s.z2) / 2);
      slab.receiveShadow = true; slab.castShadow = true;
      parent.add(slab);
    }

    // 场地圆
    const groundTex = H3.mkTex(512, 512, (ctx, w, h) => {
      const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grd.addColorStop(0, '#efebe3');
      grd.addColorStop(0.5, '#e4dfd5');
      grd.addColorStop(1, '#d3cec2');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
    });
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(46, 64),
      new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, envMapIntensity: 0.18 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set((b.x1 + b.x2) / 2, -0.225, (b.z1 + b.z2) / 2);
    ground.receiveShadow = true;
    parent.add(ground);
    H3.ground = ground;
  }

  /* ---------------- 灯光 ---------------- */
  function buildLights(scene, parent) {
    const hemi = new THREE.HemisphereLight(0xf2f6ff, 0xc8bfae, 0.34);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeed4, 1.95);
    sun.position.set(8, 20, 8);
    sun.target.position.set(0, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 10;
    sun.shadow.camera.bottom = -10;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0xd7e6f7, 0.26);
    fill.position.set(-8, 10, -6);
    scene.add(fill);

    // 室内点光源（夜间启用）
    const pts = [
      [2.90, 2.2, 3.10, 0xffd9a8, 1.05, 9],    // 客厅
      [4.90, 2.2, 1.60, 0xffe0b8, 0.80, 7],    // 客厅北
      [1.20, 2.2, 5.40, 0xffd9a8, 0.65, 6],    // 客厅南
      [7.60, 2.2, 1.60, 0xffd9a8, 0.95, 8],    // 主卧
      [7.60, 2.2, 4.90, 0xffe6c8, 0.55, 5],    // 主卧南
      [1.55, 2.2, 6.66, 0xffd9a8, 0.95, 7],    // 餐厅
      [1.60, 2.2, 8.60, 0xffe6c8, 0.70, 5],    // 厨房
      [4.30, 2.2, 7.40, 0xfff0d8, 0.55, 4],    // 次卫
      [6.30, 2.2, 7.60, 0xffd9a8, 0.85, 7],    // 次卧
      [8.45, 2.2, 7.40, 0xfff0d8, 0.55, 4]     // 主卫
    ];
    const lights = [];
    for (const [x, y, z, c, i, dist] of pts) {
      const l = new THREE.PointLight(c, 0, dist, 2);
      l.position.set(x, y, z);
      l.userData.on = i;
      parent.add(l);
      lights.push(l);
    }
    return { hemi, sun, fill, lights };
  }

  /* ---------------- 图纸尺寸标注（1:1 还原标注链） ---------------- */
  function makeLabel(text, color) {
    try {
      const c = document.createElement('canvas');
      c.width = 320; c.height = 128;
      const g = c.getContext('2d');
      if (!g || !g.fillText) return null;
      g.clearRect(0, 0, 320, 128);
      g.fillStyle = color;
      g.font = 'bold 66px "Segoe UI", Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, 160, 66);
      const tex = new THREE.CanvasTexture(c);
      if (tex.minFilter !== undefined) tex.minFilter = THREE.LinearFilter;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthTest: false, depthWrite: false, opacity: 0.95
      }));
      sp.scale.set(0.72, 0.288, 1);
      sp.renderOrder = 999;
      return sp;
    } catch (e) { return null; }
  }

  function buildDims(parent) {
    const D = P.dims;
    if (!D) return null;
    const grp = new THREE.Group();
    grp.name = 'dims';
    const Y = 0.035;
    const OFF = 0.62;

    const mat = new THREE.LineBasicMaterial({ color: 0x2f7d8c, transparent: true, opacity: 0.85 });
    const matT = new THREE.LineBasicMaterial({ color: 0xc2683a, transparent: true, opacity: 0.9 });

    const segs = [];
    const push = (x1, z1, x2, z2) => segs.push(x1, Y, z1, x2, Y, z2);

    // 一条标注链：起点 + 方向 + 段长 + 文字偏移方向
    function chain(x, z, dx, dz, list, labelSide, totalSkip) {
      let cx = x, cz = z;
      for (let i = 0; i < list.length; i++) {
        const L = list[i] / 1000;
        const nx = cx + dx * L, nz = cz + dz * L;
        push(cx, cz, nx, nz);
        // 端部短斜线
        const t = 0.13;
        if (dx) {
          push(nx - t * 0.7, cz - t, nx + t * 0.7, cz + t);
        } else {
          push(cx - t, nz - t * 0.7, cx + t, nz + t * 0.7);
        }
        // 段长文字
        const mid = [(cx + nx) / 2, (cz + nz) / 2];
        const lb = makeLabel(String(list[i]), '#cfe9ef');
        if (lb) {
          lb.position.set(mid[0] + labelSide[0] * 0.30, Y + 0.30, mid[1] + labelSide[1] * 0.30);
          if (dx) lb.scale.set(0.60, 0.24, 1);
          else lb.scale.set(0.24, 0.60, 1);   // 竖排链不用，横向读即可
          grp.add(lb);
        }
        cx = nx; cz = nz;
      }
    }

    const B = P.bounds;
    // 上（北）：沿 x 正向
    chain(0, B.z1 - OFF, 1, 0, D.top, [0, -1]);
    // 下（南）
    chain(0, B.z2 + OFF, 1, 0, D.bottom, [0, 1]);
    // 左（西）：沿 z 正向
    chain(-OFF, 0, 0, 1, D.left, [-1, 0]);
    // 右（东）：自北墙皮到南墙皮
    chain(B.x2 + OFF, B.z2 - D.right.reduce((a, b) => a + b, 0) / 1000, 0, 1, D.right, [1, 0]);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
    grp.add(new THREE.LineSegments(geo, mat));

    // 总尺寸框（虚线感：用细长条示意轮廓）
    const outline = [
      [0, 0], [B.x2, 0], [B.x2, B.z2], [0, B.z2], [0, 0]
    ];
    const oSegs = [];
    for (let i = 0; i < outline.length - 1; i++) {
      oSegs.push(outline[i][0], Y, outline[i][1], outline[i + 1][0], Y, outline[i + 1][1]);
    }
    const oGeo = new THREE.BufferGeometry();
    oGeo.setAttribute('position', new THREE.Float32BufferAttribute(oSegs, 3));
    grp.add(new THREE.LineSegments(oGeo, matT));

    // 总尺寸文字
    const totText = '总开间 9200 ｜ 进深 10330';
    const tot = makeLabel(totText, '#ffd9b0');
    if (tot) {
      tot.scale.set(2.34, 0.94, 1);
      tot.position.set(B.x2 / 2, Y + 0.9, B.z2 + OFF + 1.35);
      grp.add(tot);
    }

    parent.add(grp);
    return grp;
  }

  /* ---------------- 主入口 ---------------- */
  H3.build = function (scene) {
    const root = new THREE.Group();
    root.position.set(-P.cx, 0, -P.cz);
    scene.add(root);

    buildBase(root);
    buildFloors(root);
    buildBathTiles(root);
    buildShafts(root);

    const wallGroup = new THREE.Group();
    for (const w of P.walls) wallGroup.add(buildWall(w));
    root.add(wallGroup);
    buildDoors(root);

    const furnitureGroup = new THREE.Group();
    furnish(furnitureGroup);
    root.add(furnitureGroup);

    const ceilGroup = buildCeiling(root);

    const dimGroup = buildDims(root);
    if (dimGroup) dimGroup.visible = false;

    GROUPS.root = root;
    GROUPS.walls = wallGroup;
    GROUPS.ceiling = ceilGroup;
    GROUPS.furniture = furnitureGroup;
    GROUPS.dims = dimGroup;
    H3.GROUPS = GROUPS;

    return GROUPS;
  };

  H3.buildLights = buildLights;
})();
