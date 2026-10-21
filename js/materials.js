/* ============================================================
   materials.js —— 程序化贴图 + 材质库
   ============================================================ */
(function () {
  const H3 = (window.H3 = window.H3 || {});

  function cv(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    return c;
  }
  H3.cv = cv;

  function mkTex(w, h, draw, rx, ry) {
    const t = new THREE.CanvasTexture(cv(w, h, draw));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 8;
    t.repeat.set(rx || 1, ry || 1);
    return t;
  }
  H3.mkTex = mkTex;

  function rnd(a, b) { return a + Math.random() * (b - a); }

  /* ---------- 木地板 ---------- */
  function woodDraw(ctx, w, h) {
    ctx.fillStyle = '#bd9067';
    ctx.fillRect(0, 0, w, h);
    const rows = 4, ph = h / rows;
    for (let r = 0; r < rows; r++) {
      const y = r * ph;
      const v = rnd(0.86, 1.04);
      ctx.fillStyle = 'rgb(' + Math.round(189 * v) + ',' + Math.round(144 * v) + ',' + Math.round(103 * v) + ')';
      ctx.fillRect(0, y, w, ph);
      for (let k = 0; k < 26; k++) {
        ctx.strokeStyle = 'rgba(96,66,40,' + rnd(0.05, 0.16).toFixed(3) + ')';
        ctx.lineWidth = rnd(0.6, 2.0);
        const yy = y + rnd(3, ph - 3);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        for (let x = 0; x <= w; x += 14) {
          ctx.lineTo(x, yy + Math.sin(x * 0.017 + r * 2.1 + k) * 1.6);
        }
        ctx.stroke();
      }
      // 板缝
      ctx.fillStyle = 'rgba(74,50,32,0.45)';
      ctx.fillRect(0, y + ph - 1.4, w, 1.4);
      // 短边接缝
      const sx = Math.floor(rnd(0, w));
      ctx.fillRect(sx, y, 1.2, ph);
    }
  }

  /* ---------- 瓷砖 ---------- */
  function tileDraw(base, grout) {
    return function (ctx, w, h) {
      ctx.fillStyle = grout; ctx.fillRect(0, 0, w, h);
      const n = 4, s = w / n, g = 3;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const v = rnd(0.965, 1.015);
          const c = base.map(x => Math.min(255, Math.round(x * v)));
          ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
          ctx.fillRect(i * s + g, j * s + g, s - g * 2, s - g * 2);
          // 极淡的石纹
          ctx.strokeStyle = 'rgba(150,150,145,0.10)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          const sxx = i * s + g, syy = j * s + g;
          ctx.moveTo(sxx + rnd(4, s * 0.6), syy + rnd(4, s * 0.4));
          ctx.bezierCurveTo(sxx + s * 0.4, syy + s * 0.5, sxx + s * 0.6, syy + s * 0.2, sxx + s - 6, syy + rnd(6, s - 6));
          ctx.stroke();
        }
      }
    };
  }

  /* ---------- 大理石/岩板 ---------- */
  function stoneDraw(ctx, w, h) {
    ctx.fillStyle = '#3a3d42'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = 'rgba(220,220,225,' + rnd(0.04, 0.16).toFixed(2) + ')';
      ctx.lineWidth = rnd(0.5, 2.2);
      ctx.beginPath();
      let x = rnd(0, w), y = rnd(0, h);
      ctx.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += rnd(-70, 90); y += rnd(-40, 60);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ---------- 地毯 ---------- */
  function rugDraw(ctx, w, h) {
    ctx.fillStyle = '#d9d1c4'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = 'rgba(' + Math.round(rnd(150, 210)) + ',' + Math.round(rnd(140, 195)) + ',' + Math.round(rnd(125, 180)) + ',0.5)';
      ctx.fillRect(rnd(0, w), rnd(0, h), 2, 2);
    }
    ctx.strokeStyle = 'rgba(160,120,95,0.55)';
    ctx.lineWidth = 8; ctx.strokeRect(20, 20, w - 40, h - 40);
    ctx.strokeStyle = 'rgba(170,135,110,0.35)';
    ctx.lineWidth = 3; ctx.strokeRect(40, 40, w - 80, h - 80);
  }

  /* ---------- 织物噪点 ---------- */
  function fabricDraw(ctx, w, h) {
    ctx.fillStyle = '#cfc8bc'; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 14000; i++) {
      const g = Math.round(rnd(150, 240));
      ctx.fillStyle = 'rgba(' + g + ',' + Math.round(g * 0.97) + ',' + Math.round(g * 0.92) + ',0.35)';
      ctx.fillRect(rnd(0, w), rnd(0, h), 2, 1);
    }
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = 'rgba(0,0,0,0.035)';
      ctx.fillRect(0, y, w, 1);
    }
  }

  /* ---------- 木饰面（家具） ---------- */
  function veneerDraw(ctx, w, h) {
    ctx.fillStyle = '#9b7a58'; ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 90; k++) {
      ctx.strokeStyle = 'rgba(70,48,32,' + rnd(0.03, 0.13).toFixed(2) + ')';
      ctx.lineWidth = rnd(0.5, 2.0);
      const yy = rnd(0, h);
      ctx.beginPath();
      ctx.moveTo(0, yy);
      for (let x = 0; x <= w; x += 16) ctx.lineTo(x, yy + Math.sin(x * 0.012 + k) * 3);
      ctx.stroke();
    }
  }

  const TEX = {
    wood: mkTex(512, 512, woodDraw, 1, 1),
    tile: mkTex(512, 512, tileDraw([226, 224, 218], '#c9c5bd'), 1, 1),
    tileWarm: mkTex(512, 512, tileDraw([223, 214, 202], '#c2b9ab'), 1, 1),
    tileGray: mkTex(512, 512, tileDraw([186, 187, 184], '#9d9e9b'), 1, 1),
    tileWall: mkTex(512, 512, tileDraw([236, 234, 229], '#d2cec6'), 1, 1),
    stone: mkTex(512, 512, stoneDraw, 1, 1),
    rug: mkTex(512, 512, rugDraw, 1, 1),
    fabric: mkTex(256, 256, fabricDraw, 1, 1),
    veneer: mkTex(512, 512, veneerDraw, 1, 1)
  };
  H3.tex = TEX;

  const M = {
    /* 建筑 */
    wall: new THREE.MeshStandardMaterial({ color: 0xf1ece2, roughness: 0.96, metalness: 0, side: THREE.DoubleSide }),
    wallOut: new THREE.MeshStandardMaterial({ color: 0xdcd6ca, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
    wallWet: new THREE.MeshStandardMaterial({ color: 0xeceae4, roughness: 0.9, metalness: 0, side: THREE.DoubleSide }),
    slab: new THREE.MeshStandardMaterial({ color: 0xcbc5b9, roughness: 0.95 }),
    ceiling: new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 1, side: THREE.DoubleSide }),
    ground: new THREE.MeshStandardMaterial({ color: 0xece8e0, roughness: 1 }),

    /* 木作 */
    wood: new THREE.MeshStandardMaterial({ map: TEX.veneer, color: 0xffffff, roughness: 0.62, metalness: 0.02 }),
    woodDark: new THREE.MeshStandardMaterial({ color: 0x4a3b30, roughness: 0.55 }),
    woodWalnut: new THREE.MeshStandardMaterial({ color: 0x6b4f3a, roughness: 0.55 }),
    doorWood: new THREE.MeshStandardMaterial({ color: 0x8c6a4c, roughness: 0.5 }),
    doorFrame: new THREE.MeshStandardMaterial({ color: 0x6f5340, roughness: 0.55 }),

    /* 台面 / 石材 */
    stone: new THREE.MeshStandardMaterial({ map: TEX.stone, roughness: 0.32, metalness: 0.12 }),
    quartz: new THREE.MeshStandardMaterial({ color: 0xe8e6e1, roughness: 0.28, metalness: 0.05 }),
    ceramic: new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.12, metalness: 0.02 }),
    ceramicMatte: new THREE.MeshStandardMaterial({ color: 0xf2f1ee, roughness: 0.55 }),

    /* 软装 */
    linen: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xf6f3ec, roughness: 0.95 }),
    duvetBlue: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0x859cb2, roughness: 0.95 }),
    duvetSand: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xbfa985, roughness: 0.95 }),
    pillow: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xf2eee6, roughness: 0.95 }),
    pillowTerra: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xc47a5a, roughness: 0.95 }),
    throwTerra: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xb9836a, roughness: 0.95 }),
    throwOlive: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0x8b8a6a, roughness: 0.95 }),
    sofa: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xc9c1b3, roughness: 0.96 }),
    sofaCushion: new THREE.MeshStandardMaterial({ map: TEX.fabric, color: 0xbdb4a4, roughness: 0.96 }),
    rug: new THREE.MeshStandardMaterial({ map: TEX.rug, roughness: 1 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x7a5c46, roughness: 0.6 }),

    /* 金属 / 玻璃 */
    metal: new THREE.MeshStandardMaterial({ color: 0xb9b9b6, roughness: 0.28, metalness: 0.85 }),
    metalDark: new THREE.MeshStandardMaterial({ color: 0x3b3d40, roughness: 0.35, metalness: 0.75 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xdedee0, roughness: 0.12, metalness: 1 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xd7ecf2, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22,
      transmission: 0, side: THREE.DoubleSide, depthWrite: false
    }),
    glassFrost: new THREE.MeshPhysicalMaterial({
      color: 0xe8f2f4, roughness: 0.55, transparent: true, opacity: 0.42,
      side: THREE.DoubleSide, depthWrite: false
    }),

    /* 其他 */
    black: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.45 }),
    screen: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.15, metalness: 0.4, emissive: 0x0a1420, emissiveIntensity: 1 }),
    plant: new THREE.MeshStandardMaterial({ color: 0x4e7a4b, roughness: 0.85, flatShading: true }),
    plant2: new THREE.MeshStandardMaterial({ color: 0x6b9660, roughness: 0.85, flatShading: true }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3b3128, roughness: 1 }),
    pot: new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.75 }),
    bulb: new THREE.MeshStandardMaterial({ color: 0xfff4dd, emissive: 0xffe6b0, emissiveIntensity: 2.2 }),
    shade: new THREE.MeshStandardMaterial({ color: 0xfaf6ee, roughness: 0.9, emissive: 0xffe9c4, emissiveIntensity: 0.35, side: THREE.DoubleSide }),
    led: new THREE.MeshStandardMaterial({ color: 0xfffaf0, emissive: 0xfff0d2, emissiveIntensity: 1.4 }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xdfe8ea, roughness: 0.05, metalness: 1 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0xc9c5bc, roughness: 0.95 })
  };
  H3.mat = M;

  /* 压低 IBL，避免环境光把画面洗白（保留玻璃/金属的高光） */
  Object.keys(M).forEach(k => {
    const m = M[k];
    if (m && m.isMeshStandardMaterial && k !== 'glass' && k !== 'glassFrost' && k !== 'mirror') {
      m.envMapIntensity = 0.32;
    }
  });

  /* ---------- 墙面材质集合（用于剖切裁剪） ---------- */
  H3.wallMats = [M.wall, M.wallOut, M.wallWet, M.ceiling];
})();
