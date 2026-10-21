/* ============================================================
   main.js —— 渲染 / 交互 / UI
   ============================================================ */
(function () {
  const H3 = window.H3;
  const P = H3.plan, M = H3.mat;

  /* ---------------- 基础三件套 ---------------- */
  const canvas = document.getElementById('scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();

  /* 环境反射（渐变天空） */
  (function () {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#eaf1f7');
    g.addColorStop(0.48, '#f6f2ea');
    g.addColorStop(0.52, '#e2ddd2');
    g.addColorStop(1, '#cfcac0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
    pmrem.dispose();
  })();

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  camera.position.set(9.8, 15.2, 12.6);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.target.set(-0.2, 0.3, -0.2);
  controls.minDistance = 2.2;
  controls.maxDistance = 62;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.screenSpacePanning = false;
  controls.zoomSpeed = 0.85;

  /* ---------------- 场景 ---------------- */
  H3.build(scene);
  const LIGHTS = H3.buildLights(scene, H3.GROUPS.root);
  H3.LIGHTS = LIGHTS;

  /* 收集全部材质，用于昼夜环境光强度切换 */
  const allMats = [];
  (function () {
    const seen = new Set();
    H3.GROUPS.root.traverse(o => {
      if (!o.isMesh) return;
      const arr = Array.isArray(o.material) ? o.material : [o.material];
      arr.forEach(m => {
        if (!m || seen.has(m.uuid)) return;
        seen.add(m.uuid);
        if (m.envMapIntensity === undefined) m.envMapIntensity = 1;
        allMats.push(m);
      });
    });
  })();
  const baseEnv = allMats.map(m => m.envMapIntensity);
  function setEnvFactor(f) {
    allMats.forEach((m, i) => { m.envMapIntensity = baseEnv[i] * f; });
  }

  /* ---------------- 尺寸 ---------------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', resize);
  resize();

  /* ---------------- 剖切 ---------------- */
  const cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1.38);
  let cutOn = false;
  function setCut(on) {
    cutOn = on;
    H3.wallMats.forEach(m => {
      m.clippingPlanes = on ? [cutPlane] : null;
      m.needsUpdate = true;
    });
    H3.GROUPS.ceiling.visible = on ? false : ceilOn;
    if (on) { document.body.classList.add('cut'); } else { document.body.classList.remove('cut'); }
  }

  /* ---------------- 标签 ---------------- */
  const labelLayer = document.getElementById('labels');
  const labels = [];
  P.rooms.forEach(r => {
    const el = document.createElement('div');
    el.className = 'room-label';
    el.innerHTML = '<span class="dot"></span><b>' + r.name + '</b><i>' + r.area.toFixed(1) + '㎡</i>';
    labelLayer.appendChild(el);
    labels.push({
      el, id: r.id,
      pos: new THREE.Vector3((r.x1 + r.x2) / 2 - P.cx, 1.35, (r.z1 + r.z2) / 2 - P.cz)
    });
  });

  let labelsOn = true;
  const _v = new THREE.Vector3();
  function updateLabels() {
    const w = window.innerWidth, h = window.innerHeight;
    for (const L of labels) {
      if (!labelsOn) { L.el.style.display = 'none'; continue; }
      _v.copy(L.pos).project(camera);
      const visible = _v.z < 1 && Math.abs(_v.x) < 1.15 && Math.abs(_v.y) < 1.15;
      if (!visible) { L.el.style.display = 'none'; continue; }
      L.el.style.display = 'flex';
      const x = (_v.x * 0.5 + 0.5) * w;
      const y = (-_v.y * 0.5 + 0.5) * h;
      const dist = camera.position.distanceTo(L.pos);
      const fade = Math.max(0, Math.min(1, (dist - 3) / 5));
      L.el.style.transform = 'translate(-50%,-50%) translate(' + x + 'px,' + y + 'px)';
      L.el.style.opacity = 0.35 + 0.65 * fade;
      L.el.style.zIndex = Math.round(1000 - dist * 10);
    }
  }

  /* ---------------- 相机动画 ---------------- */
  const anim = { t: 0, dur: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), ft: new THREE.Vector3(), tt: new THREE.Vector3(), on: false };
  function flyTo(pos, target, dur) {
    anim.from.copy(camera.position);
    anim.to.copy(pos);
    anim.ft.copy(controls.target);
    anim.tt.copy(target);
    anim.t = 0;
    anim.dur = dur || 0.85;
    anim.on = true;
  }
  function apply(pos, target, instant, fov) {
    if (fov && camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    if (instant) {
      anim.on = false;
      camera.position.copy(pos);
      controls.target.copy(target);
      controls.update();
    } else flyTo(pos, target);
  }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  /* ---------------- 视角 ---------------- */
  const HOME_P = new THREE.Vector3(11.2, 16.4, 13.8);
  const HOME_T = new THREE.Vector3(-0.1, 0.3, 0.1);
  const VIEWS = {
    overview: (inst) => apply(HOME_P, HOME_T, inst, 42),
    top: (inst) => apply(new THREE.Vector3(0.00, 52.0, 0.30), new THREE.Vector3(0, 0, 0.30), inst, 15.0),
    front: (inst) => apply(new THREE.Vector3(0, 4.8, 17.2), new THREE.Vector3(0, 1.0, 0), inst, 42),
    corner: (inst) => apply(new THREE.Vector3(-12.6, 10.6, 12.8), new THREE.Vector3(0, 0.4, 0), inst, 42),
    room: (id, inst) => {
      const r = P.rooms.find(x => x.id === id);
      if (!r) return;
      const p = r.cam
        ? new THREE.Vector3(r.cam[0][0] - P.cx, r.cam[0][1], r.cam[0][2] - P.cz)
        : new THREE.Vector3((r.x1 + r.x2) / 2 - P.cx, 2.4, (r.z1 + r.z2) / 2 - P.cz);
      const t = r.cam
        ? new THREE.Vector3(r.cam[1][0] - P.cx, r.cam[1][1], r.cam[1][2] - P.cz)
        : new THREE.Vector3((r.x1 + r.x2) / 2 - P.cx, 0.8, (r.z1 + r.z2) / 2 - P.cz);
      apply(p, t, inst, r.fov || 56);
    }
  };

  /* ---------------- 状态开关 ---------------- */
  let ceilOn = false;
  H3.GROUPS.ceiling.visible = false;

  let furnOn = true;
  let nightOn = false;

  function setCeiling(on) {
    ceilOn = on;
    H3.GROUPS.ceiling.visible = on && !cutOn;
  }
  function setFurniture(on) {
    furnOn = on;
    H3.GROUPS.furniture.visible = on;
    H3.GROUPS.walls.visible = true;
  }
  function setDims(on) {
    if (H3.GROUPS.dims) H3.GROUPS.dims.visible = on;
  }
  function setNight(on) {
    nightOn = on;
    document.body.classList.toggle('night', on);
    if (on) {
      LIGHTS.hemi.color.setHex(0x2b3d57);
      LIGHTS.hemi.groundColor.setHex(0x0a0d12);
      LIGHTS.hemi.intensity = 0.16;
      LIGHTS.sun.color.setHex(0xa8c2e0);
      LIGHTS.sun.intensity = 0.10;
      LIGHTS.fill.intensity = 0;
      LIGHTS.lights.forEach(l => { l.intensity = l.userData.on * 4.6; });
      setEnvFactor(0.10);
      M.bulb.emissiveIntensity = 4.2;
      M.led.emissiveIntensity = 3.0;
      M.screen.emissiveIntensity = 1.9;
      if (H3.ground) H3.ground.material.color.setHex(0x4a4f4c);
      renderer.toneMappingExposure = 1.15;
    } else {
      LIGHTS.hemi.color.setHex(0xf2f6ff);
      LIGHTS.hemi.groundColor.setHex(0xc8bfae);
      LIGHTS.hemi.intensity = 0.34;
      LIGHTS.sun.color.setHex(0xffeed4);
      LIGHTS.sun.intensity = 1.95;
      LIGHTS.fill.intensity = 0.26;
      LIGHTS.lights.forEach(l => { l.intensity = 0; });
      setEnvFactor(1);
      M.bulb.emissiveIntensity = 2.2;
      M.led.emissiveIntensity = 1.4;
      M.screen.emissiveIntensity = 1.0;
      if (H3.ground) H3.ground.material.color.setHex(0xffffff);
      renderer.toneMappingExposure = 0.92;
    }
  }
  function setLabels(on) {
    labelsOn = on;
    labels.forEach(L => { if (!on) L.el.style.display = 'none'; });
  }

  /* ---------------- 漫游模式 ---------------- */
  const walk = {
    on: false, yaw: 0, pitch: 0, keys: {},
    pos: new THREE.Vector3(), saved: null, base: 1.62
  };
  const WALK_START = new THREE.Vector3(0.95 - P.cx, 0, 10.05 - P.cz);

  function enterWalk() {
    walk.on = true;
    walk.saved = { pos: camera.position.clone(), target: controls.target.clone() };
    walk.pos.copy(WALK_START);
    walk.yaw = Math.PI; walk.pitch = -0.04;
    // 面向室内（+Z 方向 => yaw = PI）
    controls.enabled = false;
    document.body.classList.add('walking');
    document.getElementById('walkTip').classList.add('show');
    renderer.domElement.requestPointerLock && renderer.domElement.requestPointerLock();
  }
  function exitWalk() {
    walk.on = false;
    controls.enabled = true;
    document.body.classList.remove('walking');
    document.getElementById('walkTip').classList.remove('show');
    if (document.pointerLockElement) document.exitPointerLock();
    if (walk.saved) {
      camera.position.copy(walk.saved.pos);
      controls.target.copy(walk.saved.target);
      controls.update();
    }
  }
  document.addEventListener('pointerlockchange', () => {
    if (walk.on && !document.pointerLockElement) exitWalk();
  });
  document.addEventListener('mousemove', e => {
    if (!walk.on || !document.pointerLockElement) return;
    walk.yaw -= e.movementX * 0.0022;
    walk.pitch -= e.movementY * 0.0018;
    walk.pitch = Math.max(-1.1, Math.min(1.1, walk.pitch));
  });
  window.addEventListener('keydown', e => {
    if (e.code === 'Escape' && walk.on) exitWalk();
    walk.keys[e.code] = true;
  });
  window.addEventListener('keyup', e => { walk.keys[e.code] = false; });

  function blocked(x, z) {
    const r = 0.24;
    for (const c of H3.COLLIDERS) {
      if (x > c.x1 - r && x < c.x2 + r && z > c.z1 - r && z < c.z2 + r) return true;
    }
    return false;
  }

  function stepWalk(dt) {
    const k = walk.keys;
    let f = 0, s = 0;
    if (k['KeyW'] || k['ArrowUp']) f += 1;
    if (k['KeyS'] || k['ArrowDown']) f -= 1;
    if (k['KeyD'] || k['ArrowRight']) s += 1;
    if (k['KeyA'] || k['ArrowLeft']) s -= 1;
    if (!f && !s) { camera.position.copy(walk.pos); return; }
    const spd = (k['ShiftLeft'] ? 3.0 : 1.65) * dt;
    const l = Math.hypot(f, s) || 1;
    const fx = -Math.sin(walk.yaw), fz = -Math.cos(walk.yaw);
    const rx = Math.cos(walk.yaw), rz = -Math.sin(walk.yaw);
    let nx = walk.pos.x + (fx * f + rx * s) / l * spd;
    let nz = walk.pos.z + (fz * f + rz * s) / l * spd;
    if (!blocked(nx, walk.pos.z)) walk.pos.x = nx;
    if (!blocked(walk.pos.x, nz)) walk.pos.z = nz;
    // 限制在户型范围内
    walk.pos.x = Math.max(-P.cx + 0.25, Math.min(P.cx - 0.25, walk.pos.x));
    walk.pos.z = Math.max(-P.cz + 0.25, Math.min(P.cz - 0.25, walk.pos.z));
    camera.position.set(walk.pos.x, walk.base, walk.pos.z);
    camera.rotation.set(walk.pitch, walk.yaw, 0, 'YXZ');
  }

  /* ---------------- 生成房间列表 ---------------- */
  (function buildRoomList() {
    const list = document.getElementById('roomList');
    const order = ['living', 'master', 'dining', 'kitchen', 'bath2', 'bed2', 'bath1', 'balcony'];
    for (const id of order) {
      const r = P.rooms.find(x => x.id === id);
      if (!r) continue;
      const b = document.createElement('button');
      b.setAttribute('data-room', id);
      b.innerHTML = r.name + '<i>' + (r.x2 - r.x1).toFixed(2) + ' × ' + (r.z2 - r.z1).toFixed(2) + ' m</i>';
      list.appendChild(b);
    }
  })();

  document.getElementById('panelToggle').addEventListener('click', () => {
    document.body.classList.toggle('collapsed');
  });

  /* ---------------- UI 绑定 ---------------- */
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = btn.getAttribute('data-view');
      if (VIEWS[v]) VIEWS[v]();
      document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  document.querySelectorAll('[data-room]').forEach(btn => {
    btn.addEventListener('click', () => {
      VIEWS.room(btn.getAttribute('data-room'));
      document.querySelectorAll('[data-room]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => fn(el.checked));
  };
  bind('tCut', v => setCut(v));
  bind('tCeil', v => setCeiling(v));
  bind('tFurn', v => setFurniture(v));
  bind('tLabel', v => setLabels(v));
  bind('tDims', v => setDims(v));
  bind('tNight', v => setNight(v));
  document.getElementById('btnWalk').addEventListener('click', () => {
    if (walk.on) exitWalk(); else enterWalk();
  });

  /* ---------------- 主循环 ---------------- */
  const clock = new THREE.Clock();
  let firstFrame = true;

  function tick() {
    requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);

    if (anim.on) {
      anim.t += dt / anim.dur;
      const k = easeInOut(Math.min(1, anim.t));
      camera.position.lerpVectors(anim.from, anim.to, k);
      controls.target.lerpVectors(anim.ft, anim.tt, k);
      if (anim.t >= 1) anim.on = false;
    }

    if (walk.on) stepWalk(dt);
    else controls.update();

    updateLabels();
    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      const ld = document.getElementById('loading');
      if (ld) { ld.classList.add('done'); setTimeout(() => ld.remove(), 700); }
    }
  }
  tick();

  /* 键盘：1-4 快捷视角 */
  window.addEventListener('keydown', e => {
    if (walk.on) return;
    if (e.key === '1') VIEWS.overview();
    if (e.key === '2') VIEWS.top();
    if (e.key === '3') VIEWS.corner();
    if (e.key === '4') VIEWS.front();
  });

  H3.resetView = () => VIEWS.overview();

  /* URL 参数：?view=top / room:master / corner / front · &cut=1 · &night=1 */
  (function () {
    const q = new URLSearchParams(location.search);
    const v = q.get('view');
    if (v) {
      if (v.indexOf('room:') === 0) VIEWS.room(v.slice(5), true);
      else if (VIEWS[v]) VIEWS[v](true);
    }
    if (q.get('cut') === '1') { setCut(true); const c = document.getElementById('tCut'); if (c) c.checked = true; }
    if (q.get('night') === '1') { setNight(true); const n = document.getElementById('tNight'); if (n) n.checked = true; }
    if (q.get('dims') === '1') { setDims(true); const d = document.getElementById('tDims'); if (d) d.checked = true; }
  })();
})();
