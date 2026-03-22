/**
 * hexado-characters.js  —  Vehicle · Character · Camera Layer
 * ──────────────────────────────────────────────────────────────
 * Depends on:  Three.js (global), hexado-logic.js (HE namespace)
 * Load order:  After hexado-render.js, before hexado.html boot.
 *
 * Exports via window.HexEngine:
 *
 *   VehicleFactory
 *     .createVehicle()   → THREE.Group  (F-150-style pickup)
 *     .createCockpit()   → THREE.Group  (FPV dashboard, wheel, arms)
 *     .createDriver()    → THREE.Group  (seated storm-chaser)
 *     .createWalker()    → THREE.Group  (on-foot player character)
 *
 *   FPVCamera
 *     constructor(camera)
 *     .update(dt, physics)
 *     .animateWheel(dt, steeringWheel, keys)
 *     .animateNeedle(speedNeedle, kmh)
 *
 *   ThirdPersonCamera                        ← NEW
 *     constructor(camera)
 *     .update(dt, pos, heading, heightFn)    call every frame
 */

'use strict';
const HE = window.HexEngine;

/* ════════════════════════════════════════════════════════════════
   VEHICLE FACTORY
   ════════════════════════════════════════════════════════════════ */
HE.VehicleFactory = class {

  static _a(geo, mat, px, py, pz, group, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    group.add(m);
    return m;
  }

  /* ════════════════════════════════════════════════════════════
     createVehicle() — F-150-style pickup
     ════════════════════════════════════════════════════════════ */
  static createVehicle() {
    const g = new THREE.Group();
    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    const body   = new THREE.MeshLambertMaterial({ color: 0xcc2e12 });
    const bodyDk = new THREE.MeshLambertMaterial({ color: 0x991e08 });
    const glass  = new THREE.MeshLambertMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.62 });
    const tire   = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const rim    = new THREE.MeshLambertMaterial({ color: 0xb8b8b8 });
    const metal  = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const chrome = new THREE.MeshLambertMaterial({ color: 0xddddcc });
    const dark   = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const lightY = new THREE.MeshLambertMaterial({ color: 0xffffcc, emissive: 0x332200 });
    const tailR  = new THREE.MeshLambertMaterial({ color: 0xff2200, emissive: 0x330000, transparent: true, opacity: 0.9 });
    const liner  = new THREE.MeshLambertMaterial({ color: 0x111111 });

    a(new THREE.BoxGeometry(1.52, 0.20, 4.20), metal,   0, 0.24, -0.06);
    [-0.86, 0.86].forEach(x => a(new THREE.BoxGeometry(0.09, 0.08, 1.50), metal, x, 0.20, -0.04));

    a(new THREE.BoxGeometry(1.76, 0.24, 0.22), chrome, 0, 0.34, +1.98);
    a(new THREE.BoxGeometry(1.76, 0.09, 0.18), metal,  0, 0.24, +1.97);
    a(new THREE.BoxGeometry(0.90, 0.30, 0.08), dark,   0, 0.52, +1.95);
    for (let i = 0; i < 5; i++)
      a(new THREE.BoxGeometry(0.88, 0.026, 0.10), chrome, 0, 0.38 + i * 0.056, +1.96);
    a(new THREE.BoxGeometry(1.58, 0.05, 0.05), chrome, 0, 0.52, +1.96);

    [-0.66, 0.66].forEach(x => {
      a(new THREE.BoxGeometry(0.30, 0.20, 0.08), lightY, x, 0.66, +1.95);
      a(new THREE.BoxGeometry(0.30, 0.04, 0.06), chrome, x, 0.56, +1.95);
      a(new THREE.BoxGeometry(0.13, 0.07, 0.06), new THREE.MeshLambertMaterial({color:0xfff8e0}), x, 0.42, +1.95);
    });

    a(new THREE.BoxGeometry(1.56, 0.10, 1.60), body,   0, 0.66, +1.12);
    a(new THREE.BoxGeometry(1.14, 0.08, 1.00), body,   0, 0.72, +1.04);
    [-0.20, 0.20].forEach(x => a(new THREE.BoxGeometry(0.09, 0.03, 0.44), dark, x, 0.71, +0.86));
    a(new THREE.BoxGeometry(1.60, 0.48, 0.12), body,   0, 0.70, +0.60);

    [-0.82, 0.82].forEach(x => {
      a(new THREE.BoxGeometry(0.13, 0.46, 0.84), body,   x, 0.60, +1.12);
      a(new THREE.BoxGeometry(0.11, 0.10, 0.88), bodyDk, x, 0.28, +1.12);
      a(new THREE.BoxGeometry(0.13, 0.46, 0.82), body,   x, 0.60, -1.12);
      a(new THREE.BoxGeometry(0.11, 0.10, 0.86), bodyDk, x, 0.28, -1.12);
    });

    a(new THREE.BoxGeometry(1.62, 0.76, 1.56), body,  0, 0.86, +0.00);
    a(new THREE.BoxGeometry(1.54, 0.32, 1.44), body,  0, 1.42, +0.00);
    a(new THREE.BoxGeometry(1.50, 0.08, 1.38), body,  0, 1.60, +0.02);
    [-0.52, 0.52].forEach(x => a(new THREE.BoxGeometry(0.05, 0.05, 1.14), dark, x, 1.66, +0.02));
    a(new THREE.BoxGeometry(1.08, 0.05, 0.05), dark,  0, 1.66, +0.56);
    a(new THREE.BoxGeometry(1.08, 0.05, 0.05), dark,  0, 1.66, -0.50);

    {
      const ws = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.54, 0.07), glass);
      ws.position.set(0, 1.18, +0.70); ws.rotation.x = -0.30; g.add(ws);
    }
    a(new THREE.BoxGeometry(1.30, 0.44, 0.07), glass, 0, 1.18, -0.70);
    [-0.82, 0.82].forEach(x => a(new THREE.BoxGeometry(0.07, 0.44, 0.94), glass, x, 1.18, +0.00));
    [-0.82, 0.82].forEach(x => a(new THREE.BoxGeometry(0.07, 0.28, 0.28), glass, x, 1.20, -0.66));

    [-0.77, 0.77].forEach(x =>
      a(new THREE.BoxGeometry(0.07, 0.54, 0.09), body, x, 1.24, +0.69, 0, 0, x > 0 ? -0.17 : 0.17));
    [-0.77, 0.77].forEach(x => a(new THREE.BoxGeometry(0.07, 0.76, 0.09), body, x, 0.88, -0.68));
    [-0.82, 0.82].forEach(x => a(new THREE.BoxGeometry(0.08, 0.12, 1.40), bodyDk, x, 0.50, 0));
    [-0.83, 0.83].forEach(x =>
      [-0.08, +0.28].forEach(z => a(new THREE.BoxGeometry(0.04, 0.065, 0.22), chrome, x, 0.98, z)));
    [-0.88, 0.88].forEach(x => {
      a(new THREE.BoxGeometry(0.05, 0.18, 0.22), dark,  x + Math.sign(x)*0.05, 1.42, +0.58);
      a(new THREE.BoxGeometry(0.03, 0.14, 0.18), glass, x + Math.sign(x)*0.06, 1.42, +0.58);
    });

    a(new THREE.BoxGeometry(1.56, 0.08, 1.60), liner, 0, 0.54, -1.34);
    [-0.81, 0.81].forEach(x => a(new THREE.BoxGeometry(0.07, 0.52, 1.62), body, x, 0.78, -1.34));
    a(new THREE.BoxGeometry(1.60, 0.56, 0.07), body, 0, 0.78, -0.56);
    for (let i = 0; i < 3; i++)
      [-0.84, 0.84].forEach(x => a(new THREE.BoxGeometry(0.055, 0.52, 0.036), dark, x, 0.76, -0.76 - i*0.32));
    a(new THREE.BoxGeometry(1.56, 0.50, 0.09), body,   0, 0.76, -2.12);
    a(new THREE.BoxGeometry(0.78, 0.07, 0.07), chrome, 0, 0.57, -2.14);
    a(new THREE.BoxGeometry(1.76, 0.20, 0.22), chrome, 0, 0.38, -2.12);
    [-0.66, 0.66].forEach(x => {
      a(new THREE.BoxGeometry(0.26, 0.20, 0.08), tailR,  x, 0.80, -2.13);
      a(new THREE.BoxGeometry(0.08, 0.20, 0.07), new THREE.MeshLambertMaterial({color:0xffeeaa,emissive:0x221800}), x, 0.80, -2.11);
    });
    [-0.60, 0.60].forEach(x => {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 7), chrome);
      ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.34, -2.13); g.add(ex);
    });
    {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.28, 7), metal);
      h.rotation.x = Math.PI / 2; h.position.set(0, 0.36, -2.22); g.add(h);
    }

    const wPos = [
      [ 0.92, 0, +0.96], [-0.92, 0, +0.96],
      [ 0.92, 0, -0.96], [-0.92, 0, -0.96],
    ];
    wPos.forEach(([wx, wy, wz]) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 10, 20), tire);
      t.rotation.y = Math.PI / 2; t.position.set(wx, wy, wz); g.add(t);
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 10), rim);
      r.rotation.z = Math.PI / 2; r.position.set(wx, wy, wz); g.add(r);
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.22), rim);
        sp.position.set(wx + Math.sign(wx) * 0.08, Math.sin(ang) * 0.13, wz + Math.cos(ang) * 0.13);
        g.add(sp);
      }
      const cc = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.17, 8), chrome);
      cc.rotation.z = Math.PI / 2; cc.position.set(wx, wy, wz); g.add(cc);
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const lb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), dark);
        lb.position.set(wx + Math.sign(wx) * 0.09, Math.sin(ang) * 0.17, wz + Math.cos(ang) * 0.17);
        g.add(lb);
      }
    });

    a(new THREE.BoxGeometry(0.74, 0.19, 0.52), metal, -0.22, 0.19, -0.54);
    g.scale.setScalar(0.9);
    return g;
  }


  /* ════════════════════════════════════════════════════════════
     createCockpit() — FPV interior
     ════════════════════════════════════════════════════════════ */
  static createCockpit() {
    const g = new THREE.Group();
    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    const dashB   = new THREE.MeshLambertMaterial({ color: 0x0e0e0e });
    const dashG   = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    const trimM   = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const chromM  = new THREE.MeshLambertMaterial({ color: 0x888877 });
    const gaugeM  = new THREE.MeshLambertMaterial({ color: 0x080808 });
    const needM   = new THREE.MeshLambertMaterial({ color: 0xff3300, emissive: 0x220800 });
    const gripM   = new THREE.MeshLambertMaterial({ color: 0x252525 });
    const spokeM  = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const skinM   = new THREE.MeshLambertMaterial({ color: 0xe2b596 });
    const slvM    = new THREE.MeshLambertMaterial({ color: 0x2c3e55 });
    const linerM  = new THREE.MeshLambertMaterial({ color: 0x242030 });
    const mirFr   = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const mirGl   = new THREE.MeshLambertMaterial({ color: 0xaaccdd, transparent: true, opacity: 0.65 });
    const screenM = new THREE.MeshLambertMaterial({ color: 0x091428 });
    const visorM  = new THREE.MeshLambertMaterial({ color: 0x060614, transparent: true, opacity: 0.55 });

    a(new THREE.BoxGeometry(1.54, 0.28, 0.66), dashB, 0, 0.60, +0.60);
    a(new THREE.BoxGeometry(1.54, 0.07, 0.50), dashG, 0, 0.75, +0.56);
    a(new THREE.BoxGeometry(1.54, 0.24, 0.34), dashB, 0, 0.34, +0.66);

    a(new THREE.BoxGeometry(0.50, 0.22, 0.09), gaugeM, -0.30, 0.72, +0.82);
    a(new THREE.CylinderGeometry(0.088, 0.088, 0.055, 16), gaugeM,  -0.40, 0.75, +0.80, Math.PI/2);
    a(new THREE.TorusGeometry(0.088, 0.009, 6, 16),         chromM, -0.40, 0.75, +0.80, Math.PI/2);
    a(new THREE.CylinderGeometry(0.068, 0.068, 0.055, 14), gaugeM,  -0.21, 0.75, +0.80, Math.PI/2);
    a(new THREE.TorusGeometry(0.068, 0.007, 6, 14),         chromM, -0.21, 0.75, +0.80, Math.PI/2);

    const needleGroup = new THREE.Group();
    needleGroup.position.set(-0.40, 0.754, +0.81);
    needleGroup.rotation.x = Math.PI / 2;
    const needleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.072, 0.006), needM);
    needleMesh.position.set(0, 0.036, 0);
    needleGroup.add(needleMesh);
    g.add(needleGroup);
    g.speedNeedle = needleGroup;

    a(new THREE.BoxGeometry(0.34, 0.22, 0.05), screenM, +0.12, 0.72, +0.83);
    a(new THREE.BoxGeometry(0.30, 0.18, 0.04),
      new THREE.MeshLambertMaterial({color:0x0a1e3c, emissive:0x020610}), +0.12, 0.72, +0.84);

    for (let i = 0; i < 3; i++)
      a(new THREE.CylinderGeometry(0.028, 0.028, 0.055, 10), trimM, -0.06 + i * 0.18, 0.62, +0.87, Math.PI/2);

    a(new THREE.BoxGeometry(0.26, 0.30, 0.78), dashB, +0.32, 0.50, +0.10);
    a(new THREE.BoxGeometry(0.22, 0.09, 0.34), trimM, +0.32, 0.67, +0.10);
    {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 6), dashB);
      stalk.position.set(+0.32, 0.66, -0.02); g.add(stalk);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), chromM);
      ball.position.set(+0.32, 0.77, -0.02); g.add(ball);
    }
    a(new THREE.BoxGeometry(0.06, 0.04, 0.12), dashG, +0.32, 0.58, +0.28);

    a(new THREE.CylinderGeometry(0.036, 0.052, 0.50, 8), dashB, -0.28, 0.54, +0.46, -0.60);
    a(new THREE.BoxGeometry(0.11, 0.07, 0.22), dashB, -0.28, 0.74, +0.34);

    const sw = new THREE.Group();
    sw.position.set(-0.28, 0.84, +0.38);
    sw.rotation.x = -0.58;
    const swRim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.024, 10, 28), gripM);
    sw.add(swRim);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.020, 0.055), trimM);
      grip.position.set(Math.sin(ang) * 0.185, Math.cos(ang) * 0.185, 0);
      grip.rotation.z = ang; sw.add(grip);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.050, 0.038, 10), spokeM);
    hub.rotation.x = Math.PI / 2; sw.add(hub);
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.010, 0.165), spokeM);
      sp.position.set(Math.sin(ang) * 0.094, Math.cos(ang) * 0.094, 0);
      sp.rotation.z = -ang; sw.add(sp);
    }
    const horn = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.025), spokeM);
    horn.position.set(0, 0, 0.018); sw.add(horn);
    g.add(sw);
    g.steeringWheel = sw;

    a(new THREE.CylinderGeometry(0.038, 0.042, 0.42, 7), slvM,  -0.28, 0.60, +0.14, -0.80, 0, +0.40);
    a(new THREE.CylinderGeometry(0.032, 0.038, 0.32, 6), skinM, -0.42, 0.76, +0.29, -0.55, 0, +0.26);
    a(new THREE.SphereGeometry(0.055, 8, 6), skinM, -0.46, 0.86, +0.22);
    a(new THREE.CylinderGeometry(0.013, 0.013, 0.055, 5), skinM, -0.49, 0.87, +0.20, 0, 0, -0.65);
    a(new THREE.CylinderGeometry(0.038, 0.042, 0.42, 7), slvM,  +0.08, 0.60, +0.14, -0.80, 0, -0.36);
    a(new THREE.CylinderGeometry(0.032, 0.038, 0.32, 6), skinM, +0.22, 0.76, +0.29, -0.55, 0, -0.22);
    a(new THREE.SphereGeometry(0.055, 8, 6), skinM, +0.27, 0.86, +0.22);
    a(new THREE.CylinderGeometry(0.013, 0.013, 0.055, 5), skinM, +0.30, 0.87, +0.20, 0, 0, +0.65);

    a(new THREE.BoxGeometry(0.24, 0.095, 0.038), mirFr,  0, 1.52, +0.62);
    a(new THREE.BoxGeometry(0.20, 0.075, 0.030), mirGl,  0, 1.52, +0.63);
    a(new THREE.BoxGeometry(0.018, 0.11,  0.018), trimM, 0, 1.45, +0.60);

    a(new THREE.BoxGeometry(0.060, 0.62, 1.20), trimM, -0.78, 0.95, -0.02);
    a(new THREE.BoxGeometry(0.065, 0.10, 0.50), dashB, -0.79, 0.78, +0.12);
    a(new THREE.BoxGeometry(0.055, 0.055, 0.46), dashG, -0.79, 0.84, +0.12);
    a(new THREE.BoxGeometry(0.055, 0.058, 0.19), trimM, -0.79, 1.05, +0.24);
    a(new THREE.BoxGeometry(0.055, 0.038, 0.15), trimM, -0.79, 0.90, +0.22);
    a(new THREE.CylinderGeometry(0.076, 0.076, 0.036, 13), dashB, -0.79, 0.70, -0.22, 0, 0, Math.PI/2);

    a(new THREE.BoxGeometry(1.48, 0.044, 1.34), linerM, 0, 1.62, +0.02);
    a(new THREE.BoxGeometry(0.066, 0.52, 0.068), trimM, -0.75, 1.30, +0.70, 0, 0, -0.16);
    a(new THREE.BoxGeometry(1.24, 0.076, 0.055), visorM, 0, 1.47, +0.69);

    return g;
  }


  /* ════════════════════════════════════════════════════════════
     createDriver() — seated storm-chaser
     ════════════════════════════════════════════════════════════ */
  static createDriver() {
    const g = new THREE.Group();
    g.position.set(-0.30, 0.44, -0.04);
    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    const skin  = new THREE.MeshLambertMaterial({ color: 0xe2b596 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2c3e55 });
    const vest  = new THREE.MeshLambertMaterial({ color: 0xff6a00, transparent: true, opacity: 0.90 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xffee66, emissive: 0x221a00 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x1e2d40 });
    const boot  = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const hair  = new THREE.MeshLambertMaterial({ color: 0x110c06 });
    const cap   = new THREE.MeshLambertMaterial({ color: 0x192436 });
    const shades = new THREE.MeshLambertMaterial({ color: 0x080808 });

    a(new THREE.BoxGeometry(0.34, 0.44, 0.22), shirt,  0, 0.42, 0);
    a(new THREE.BoxGeometry(0.36, 0.42, 0.24), vest,   0, 0.42, 0);
    a(new THREE.BoxGeometry(0.37, 0.038, 0.25), stripe, 0, 0.28, 0);
    a(new THREE.BoxGeometry(0.37, 0.038, 0.25), stripe, 0, 0.46, 0);
    [-0.21, 0.21].forEach(x =>
      a(new THREE.CylinderGeometry(0.09, 0.07, 0.11, 7), shirt, x, 0.62, 0, 0, 0, Math.PI/2));

    a(new THREE.CylinderGeometry(0.065, 0.075, 0.13, 8), skin,  0, 0.72, 0);
    a(new THREE.SphereGeometry(0.155, 11, 9),             skin,  0, 0.89, 0);
    a(new THREE.SphereGeometry(0.160, 9,  7),             hair,  0, 0.95, -0.02);
    a(new THREE.CylinderGeometry(0.175, 0.175, 0.055, 12), cap, 0, 1.05, 0);
    a(new THREE.BoxGeometry(0.15, 0.028, 0.20),             cap, 0, 1.04, +0.18);
    a(new THREE.BoxGeometry(0.26, 0.046, 0.036), shades, 0, 0.87, +0.158);

    [-0.09, 0.09].forEach(x =>
      a(new THREE.CylinderGeometry(0.078, 0.078, 0.36, 8), pants, x, 0.11, +0.15, 0, 0, Math.PI/2));
    [-0.09, 0.09].forEach(x =>
      a(new THREE.CylinderGeometry(0.065, 0.065, 0.40, 7), pants, x, -0.06, +0.35, 0.58));
    [-0.09, 0.09].forEach(x =>
      a(new THREE.BoxGeometry(0.12, 0.11, 0.22), boot, x, -0.24, +0.53));

    return g;
  }


  /* ════════════════════════════════════════════════════════════
     createWalker()  ← NEW
     Standing storm-chaser seen from behind (third-person).
     Origin at feet. Height ≈ 1.8 world units (unscaled).
     ════════════════════════════════════════════════════════════ */
  static createWalker() {
    const g = new THREE.Group();
    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    const skin   = new THREE.MeshLambertMaterial({ color: 0xe2b596 });
    const vest   = new THREE.MeshLambertMaterial({ color: 0xff6a00 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xffee66, emissive: 0x221a00 });
    const shirt  = new THREE.MeshLambertMaterial({ color: 0x2c3e55 });
    const pants  = new THREE.MeshLambertMaterial({ color: 0x1e2d40 });
    const boot   = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const hair   = new THREE.MeshLambertMaterial({ color: 0x110c06 });
    const cap    = new THREE.MeshLambertMaterial({ color: 0x192436 });
    const shades = new THREE.MeshLambertMaterial({ color: 0x080808 });

    // ─ Legs (standing)
    [-0.12, 0.12].forEach(x => {
      a(new THREE.CylinderGeometry(0.10, 0.09, 0.55, 7), pants, x, 0.275, 0);
      a(new THREE.CylinderGeometry(0.09, 0.08, 0.48, 7), pants, x, 0.790, 0);
    });

    // ─ Boots
    [-0.12, 0.12].forEach(x => {
      a(new THREE.BoxGeometry(0.16, 0.14, 0.26), boot, x, 0.07, 0.04);
    });

    // ─ Torso + hi-vis vest
    a(new THREE.BoxGeometry(0.38, 0.50, 0.24), shirt, 0, 1.20, 0);
    a(new THREE.BoxGeometry(0.40, 0.48, 0.26), vest,  0, 1.20, 0);
    a(new THREE.BoxGeometry(0.41, 0.038, 0.27), stripe, 0, 1.07, 0);
    a(new THREE.BoxGeometry(0.41, 0.038, 0.27), stripe, 0, 1.26, 0);

    // ─ Shoulders
    [-0.24, 0.24].forEach(x =>
      a(new THREE.CylinderGeometry(0.085, 0.07, 0.13, 6), shirt, x, 1.45, 0, 0, 0, Math.PI/2));

    // ─ Arms (at sides)
    [-0.30, 0.30].forEach(x => {
      a(new THREE.CylinderGeometry(0.065, 0.06, 0.38, 6), shirt, x, 1.28, 0);
      a(new THREE.CylinderGeometry(0.055, 0.05, 0.32, 6), skin,  x, 0.98, 0);
      // Fist
      a(new THREE.SphereGeometry(0.07, 7, 5), skin, x, 0.80, 0);
    });

    // ─ Neck + head
    a(new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8), skin, 0, 1.58, 0);
    a(new THREE.SphereGeometry(0.17, 11, 9),            skin, 0, 1.77, 0);
    a(new THREE.SphereGeometry(0.175, 9, 7),            hair, 0, 1.83, -0.01);

    // ─ Baseball cap
    a(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 12), cap, 0, 1.94, 0);
    a(new THREE.BoxGeometry(0.17, 0.03, 0.22),           cap, 0, 1.93, +0.20);

    // ─ Sunglasses
    a(new THREE.BoxGeometry(0.28, 0.05, 0.04), shades, 0, 1.74, +0.172);

    // ─ Backpack (storm chaser gear)
    const bpMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    a(new THREE.BoxGeometry(0.26, 0.38, 0.14), bpMat, 0, 1.22, -0.19);
    a(new THREE.BoxGeometry(0.22, 0.32, 0.07), new THREE.MeshLambertMaterial({color:0x333333}), 0, 1.22, -0.26);

    g.visible = false;  // hidden until player exits vehicle
    return g;
  }
};


/* ════════════════════════════════════════════════════════════════
   FPV CAMERA CONTROLLER
   ════════════════════════════════════════════════════════════════ */
HE.FPVCamera = class {

  static EX =  -0.234;
  static EY =   0.990;
  static EZ =  +0.126;

  constructor(camera) {
    this.camera        = camera;
    camera.fov         = 76;
    camera.near        = 0.08;
    camera.far         = 700;
    camera.updateProjectionMatrix();
    this._bobTime      = 0;
    this._swRotTarget  = 0;
    this._swRotCurrent = 0;
  }

  update(dt, physics) {
    this._bobTime += dt;
    const h    = physics.heading;
    const cosH = Math.cos(h);
    const sinH = Math.sin(h);
    const { EX, EY, EZ } = HE.FPVCamera;

    const worldX = physics.pos.x + EX * cosH + EZ * sinH;
    const worldY = physics.pos.y + EY;
    const worldZ = physics.pos.z - EX * sinH + EZ * cosH;

    const bobT = Math.min(physics.speedKmh / 160, 1.0);
    const bobY = Math.sin(this._bobTime * 9.0) * 0.018 * bobT;
    const bobX = Math.cos(this._bobTime * 4.5) * 0.009 * bobT;

    this.camera.position.set(worldX + bobX, worldY + bobY, worldZ);
    this.camera.lookAt(
      worldX + sinH * 18,
      worldY - 0.06,
      worldZ + cosH * 18
    );
  }

  animateWheel(dt, steeringWheel, keys) {
    if (!steeringWheel) return;
    const left  = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];
    this._swRotTarget = left ? 0.52 : (right ? -0.52 : 0);
    this._swRotCurrent += (this._swRotTarget - this._swRotCurrent) * Math.min(dt * 7, 1);
    steeringWheel.rotation.z = this._swRotCurrent;
  }

  animateNeedle(speedNeedle, kmh) {
    if (!speedNeedle) return;
    const t = Math.min(Math.abs(kmh) / 180, 1);
    speedNeedle.rotation.z = -Math.PI * 0.75 + t * Math.PI * 1.5;
  }
};


/* ════════════════════════════════════════════════════════════════
   THIRD-PERSON CAMERA  ← NEW
   Smooth follow camera for on-foot walking mode.
   Stays BACK_DIST behind player, UP_DIST above ground.
   Smoothed with per-frame lerp to avoid jitter.
   ════════════════════════════════════════════════════════════════ */
HE.ThirdPersonCamera = class {

  static BACK_DIST =  5.5;
  static UP_DIST   =  2.4;
  static LERP_RATE =  8.0;   // camera position smoothing speed

  constructor(camera) {
    this.camera = camera;
    camera.fov  = 70;
    camera.near = 0.10;
    camera.far  = 700;
    camera.updateProjectionMatrix();
    this._smoothPos = null;   // lazy-initialised on first update
  }

  /**
   * @param {number}        dt        — frame delta-time (s)
   * @param {THREE.Vector3} pos       — player world position (feet)
   * @param {number}        heading   — player heading (radians)
   * @param {Function}      heightFn  — (x,z) → terrain height
   */
  update(dt, pos, heading, heightFn) {
    const { BACK_DIST, UP_DIST, LERP_RATE } = HE.ThirdPersonCamera;

    const sinH = Math.sin(heading);
    const cosH = Math.cos(heading);

    const targetX = pos.x - sinH * BACK_DIST;
    const targetZ = pos.z - cosH * BACK_DIST;
    const groundH = heightFn ? heightFn(targetX, targetZ) : 0;
    const targetY = Math.max(groundH + 0.8, pos.y + UP_DIST);
    const target  = new THREE.Vector3(targetX, targetY, targetZ);

    if (!this._smoothPos) {
      this._smoothPos = target.clone();
    } else {
      const lf = Math.min(LERP_RATE * dt, 1.0);
      this._smoothPos.lerp(target, lf);
    }

    this.camera.position.copy(this._smoothPos);
    this.camera.lookAt(pos.x, pos.y + 0.9, pos.z);
  }
};
