/**
 * hexado-characters.js  —  Vehicle · Character · Camera Layer
 * ──────────────────────────────────────────────────────────────
 * Depends on:  Three.js (global), hexado-logic.js (HE namespace)
 * Load order:  After hexado-render.js, before hexado.html boot.
 *
 * Exports via window.HexEngine:
 *
 *   VehicleFactory
 *     .createVehicle()   → THREE.Group  (improved F-150-style pickup)
 *     .createCockpit()   → THREE.Group  (FPV dashboard, wheel, arms)
 *     .createDriver()    → THREE.Group  (seated storm-chaser character)
 *
 *   FPVCamera
 *     constructor(camera)
 *     .update(dt, physics)                   call every frame
 *     .animateWheel(dt, steeringWheel, keys) steer wheel animation
 *     .animateNeedle(speedNeedle, kmh)       speedo needle animation
 *
 * ── Coordinate convention ──────────────────────────────────────
 *   Vehicle FRONT faces  +Z  (matches physics forward when heading = 0)
 *   Driver-side          –X  (left)
 *   All geometry unscaled;  VehicleFactory.createVehicle() applies
 *   group.scale 0.9 at the end — cockpit & driver are added as
 *   children of that group and inherit the same scale.
 *
 *   Driver eye (UNSCALED local):  x = –0.26,  y = 1.10,  z = +0.14
 *   After ×0.9 (SCALED local):   x = –0.234, y = 0.990, z = +0.126
 */

'use strict';
/* HE is declared by hexado-logic.js — do not redeclare */

/* ════════════════════════════════════════════════════════════════
   VEHICLE FACTORY
   All geometry uses Three.js constructors — zero external files.
   ════════════════════════════════════════════════════════════════ */
HE.VehicleFactory = class {

  /* ── internal mesh helper ── */
  static _a(geo, mat, px, py, pz, group, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    if (rx || ry || rz) m.rotation.set(rx, ry, rz);
    group.add(m);
    return m;
  }

  /* ════════════════════════════════════════════════════════════
     createVehicle()
     Improved F-150-style pickup truck.
     Front (hood, grille, headlights) faces +Z.
     Returns a THREE.Group scaled to 0.9.
     ════════════════════════════════════════════════════════════ */
  static createVehicle() {
    const g = new THREE.Group();
    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    /* ─ Materials ─ */
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

    /* ──────────────────────────────────
       CHASSIS FRAME
       ────────────────────────────────── */
    a(new THREE.BoxGeometry(1.52, 0.20, 4.20), metal,   0, 0.24, -0.06);
    // Running boards
    [-0.86, 0.86].forEach(x =>
      a(new THREE.BoxGeometry(0.09, 0.08, 1.50), metal, x, 0.20, -0.04));

    /* ──────────────────────────────────
       FRONT END  (+Z direction)
       ────────────────────────────────── */
    // Front bumper
    a(new THREE.BoxGeometry(1.76, 0.24, 0.22), chrome, 0, 0.34, +1.98);
    a(new THREE.BoxGeometry(1.76, 0.09, 0.18), metal,  0, 0.24, +1.97); // skid plate

    // Grille opening + slats
    a(new THREE.BoxGeometry(0.90, 0.30, 0.08), dark,   0, 0.52, +1.95);
    for (let i = 0; i < 5; i++)
      a(new THREE.BoxGeometry(0.88, 0.026, 0.10), chrome, 0, 0.38 + i * 0.056, +1.96);
    // Brand badge bar
    a(new THREE.BoxGeometry(1.58, 0.05, 0.05), chrome, 0, 0.52, +1.96);

    // Headlight clusters (LED style)
    [-0.66, 0.66].forEach(x => {
      a(new THREE.BoxGeometry(0.30, 0.20, 0.08), lightY,                                       x, 0.66, +1.95);
      a(new THREE.BoxGeometry(0.30, 0.04, 0.06), chrome,                                       x, 0.56, +1.95);
      a(new THREE.BoxGeometry(0.13, 0.07, 0.06), new THREE.MeshLambertMaterial({color:0xfff8e0}), x, 0.42, +1.95); // fog
    });

    // Hood — two-layer power dome
    a(new THREE.BoxGeometry(1.56, 0.10, 1.60), body,   0, 0.66, +1.12);
    a(new THREE.BoxGeometry(1.14, 0.08, 1.00), body,   0, 0.72, +1.04); // centre dome
    // Hood vents
    [-0.20, 0.20].forEach(x =>
      a(new THREE.BoxGeometry(0.09, 0.03, 0.44), dark, x, 0.71, +0.86));
    // Firewall/cowl
    a(new THREE.BoxGeometry(1.60, 0.48, 0.12), body,   0, 0.70, +0.60);

    /* ──────────────────────────────────
       FENDER ARCHES  (front + rear)
       ────────────────────────────────── */
    [-0.82, 0.82].forEach(x => {
      // Front fender panel
      a(new THREE.BoxGeometry(0.13, 0.46, 0.84), body,   x, 0.60, +1.12);
      a(new THREE.BoxGeometry(0.11, 0.10, 0.88), bodyDk, x, 0.28, +1.12); // arch flare
      // Rear fender panel
      a(new THREE.BoxGeometry(0.13, 0.46, 0.82), body,   x, 0.60, -1.12);
      a(new THREE.BoxGeometry(0.11, 0.10, 0.86), bodyDk, x, 0.28, -1.12);
    });

    /* ──────────────────────────────────
       CAB  (door panels + greenhouse)
       ────────────────────────────────── */
    // Door panels (lower body)
    a(new THREE.BoxGeometry(1.62, 0.76, 1.56), body,  0, 0.86, +0.00);
    // Greenhouse (upper cab)
    a(new THREE.BoxGeometry(1.54, 0.32, 1.44), body,  0, 1.42, +0.00);
    // Roof
    a(new THREE.BoxGeometry(1.50, 0.08, 1.38), body,  0, 1.60, +0.02);
    // Roof rack rails
    [-0.52, 0.52].forEach(x =>
      a(new THREE.BoxGeometry(0.05, 0.05, 1.14), dark, x, 1.66, +0.02));
    a(new THREE.BoxGeometry(1.08, 0.05, 0.05), dark,  0, 1.66, +0.56);  // cross bar
    a(new THREE.BoxGeometry(1.08, 0.05, 0.05), dark,  0, 1.66, -0.50);

    // Windshield (angled, +Z face of cab)
    {
      const ws = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.54, 0.07), glass);
      ws.position.set(0, 1.18, +0.70); ws.rotation.x = -0.30; g.add(ws);
    }
    // Rear window
    a(new THREE.BoxGeometry(1.30, 0.44, 0.07), glass, 0, 1.18, -0.70);
    // Side windows
    [-0.82, 0.82].forEach(x =>
      a(new THREE.BoxGeometry(0.07, 0.44, 0.94), glass, x, 1.18, +0.00));
    // Quarter glass
    [-0.82, 0.82].forEach(x =>
      a(new THREE.BoxGeometry(0.07, 0.28, 0.28), glass, x, 1.20, -0.66));

    // A-pillars (angled)
    [-0.77, 0.77].forEach(x =>
      a(new THREE.BoxGeometry(0.07, 0.54, 0.09), body, x, 1.24, +0.69,
        0, 0, x > 0 ? -0.17 : 0.17));
    // B-pillars
    [-0.77, 0.77].forEach(x =>
      a(new THREE.BoxGeometry(0.07, 0.76, 0.09), body, x, 0.88, -0.68));
    // Rocker panels
    [-0.82, 0.82].forEach(x =>
      a(new THREE.BoxGeometry(0.08, 0.12, 1.40), bodyDk, x, 0.50, 0));

    // Door handles
    [-0.83, 0.83].forEach(x =>
      [-0.08, +0.28].forEach(z =>
        a(new THREE.BoxGeometry(0.04, 0.065, 0.22), chrome, x, 0.98, z)));

    // Side mirrors
    [-0.88, 0.88].forEach(x => {
      a(new THREE.BoxGeometry(0.05, 0.18, 0.22), dark,   x + Math.sign(x)*0.05, 1.42, +0.58);
      a(new THREE.BoxGeometry(0.03, 0.14, 0.18), glass,  x + Math.sign(x)*0.06, 1.42, +0.58);
    });

    /* ──────────────────────────────────
       TRUCK BED  (–Z direction)
       ────────────────────────────────── */
    a(new THREE.BoxGeometry(1.56, 0.08, 1.60), liner, 0, 0.54, -1.34); // floor
    // Bed sides
    [-0.81, 0.81].forEach(x =>
      a(new THREE.BoxGeometry(0.07, 0.52, 1.62), body, x, 0.78, -1.34));
    // Cab-wall end (connects cab to bed)
    a(new THREE.BoxGeometry(1.60, 0.56, 0.07), body, 0, 0.78, -0.56);
    // Stake pockets
    for (let i = 0; i < 3; i++)
      [-0.84, 0.84].forEach(x =>
        a(new THREE.BoxGeometry(0.055, 0.52, 0.036), dark, x, 0.76, -0.76 - i*0.32));
    // Tailgate
    a(new THREE.BoxGeometry(1.56, 0.50, 0.09), body,   0, 0.76, -2.12);
    a(new THREE.BoxGeometry(0.78, 0.07, 0.07), chrome, 0, 0.57, -2.14); // handle
    // Rear bumper
    a(new THREE.BoxGeometry(1.76, 0.20, 0.22), chrome, 0, 0.38, -2.12);
    // Tail lights (wide)
    [-0.66, 0.66].forEach(x => {
      a(new THREE.BoxGeometry(0.26, 0.20, 0.08), tailR,  x, 0.80, -2.13);
      a(new THREE.BoxGeometry(0.08, 0.20, 0.07), new THREE.MeshLambertMaterial({color:0xffeeaa,emissive:0x221800}), x, 0.80, -2.11); // reverse
    });
    // Exhaust pipes
    [-0.60, 0.60].forEach(x => {
      const ex = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.18, 7), chrome);
      ex.rotation.x = Math.PI / 2; ex.position.set(x, 0.34, -2.13); g.add(ex);
    });
    // Tow hitch
    {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.28, 7), metal);
      h.rotation.x = Math.PI / 2; h.position.set(0, 0.36, -2.22); g.add(h);
    }

    /* ──────────────────────────────────
       WHEELS  (4×  torus + spoke rim)
       ────────────────────────────────── */
    const wPos = [
      [ 0.92, 0, +0.96],
      [-0.92, 0, +0.96],
      [ 0.92, 0, -0.96],
      [-0.92, 0, -0.96],
    ];
    wPos.forEach(([wx, wy, wz]) => {
      // Tyre (torus)
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.14, 10, 20), tire);
      t.rotation.y = Math.PI / 2; t.position.set(wx, wy, wz); g.add(t);
      // Rim disc
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.15, 10), rim);
      r.rotation.z = Math.PI / 2; r.position.set(wx, wy, wz); g.add(r);
      // 5 spokes
      for (let i = 0; i < 5; i++) {
        const ang = (i / 5) * Math.PI * 2;
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.22), rim);
        sp.position.set(wx + Math.sign(wx) * 0.08, Math.sin(ang) * 0.13, wz + Math.cos(ang) * 0.13);
        g.add(sp);
      }
      // Centre cap
      const cc = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.17, 8), chrome);
      cc.rotation.z = Math.PI / 2; cc.position.set(wx, wy, wz); g.add(cc);
      // Lug bolts
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const lb = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 4), dark);
        lb.position.set(wx + Math.sign(wx) * 0.09, Math.sin(ang) * 0.17, wz + Math.cos(ang) * 0.17);
        g.add(lb);
      }
    });

    /* ── Fuel tank (underside) ── */
    a(new THREE.BoxGeometry(0.74, 0.19, 0.52), metal, -0.22, 0.19, -0.54);

    g.scale.setScalar(0.9);
    return g;
  }


  /* ════════════════════════════════════════════════════════════
     createCockpit()
     FPV interior: dashboard, gauges, steering wheel + arms, mirror.
     Add as a child of the vehicle group (inherits scale 0.9).

     Driver eye (UNSCALED):  x=–0.26,  y=1.10,  z=+0.14
     All positions below are in that same unscaled local space.

     Returns a THREE.Group with two extra refs for animation:
       group.steeringWheel  — rotate .rotation.z for steering anim
       group.speedNeedle    — rotate .rotation.z for speedo anim
     ════════════════════════════════════════════════════════════ */
  static createCockpit() {
    const g = new THREE.Group();
    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    /* ─ Materials ─ */
    const dashB  = new THREE.MeshLambertMaterial({ color: 0x0e0e0e });
    const dashG  = new THREE.MeshLambertMaterial({ color: 0x1c1c1c });
    const trimM  = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const chromM = new THREE.MeshLambertMaterial({ color: 0x888877 });
    const gaugeM = new THREE.MeshLambertMaterial({ color: 0x080808 });
    const needM  = new THREE.MeshLambertMaterial({ color: 0xff3300, emissive: 0x220800 });
    const gripM  = new THREE.MeshLambertMaterial({ color: 0x252525 });
    const spokeM = new THREE.MeshLambertMaterial({ color: 0x181818 });
    const skinM  = new THREE.MeshLambertMaterial({ color: 0xe2b596 });
    const slvM   = new THREE.MeshLambertMaterial({ color: 0x2c3e55 });
    const linerM = new THREE.MeshLambertMaterial({ color: 0x242030 });
    const mirFr  = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
    const mirGl  = new THREE.MeshLambertMaterial({ color: 0xaaccdd, transparent: true, opacity: 0.65 });
    const screenM = new THREE.MeshLambertMaterial({ color: 0x091428 });
    const visorM  = new THREE.MeshLambertMaterial({ color: 0x060614, transparent: true, opacity: 0.55 });

    /* ────────────────────────────────────────
       DASHBOARD
       ──────────────────────────────────────── */
    // Main body
    a(new THREE.BoxGeometry(1.54, 0.28, 0.66), dashB, 0, 0.60, +0.60);
    // Top pad (soft angled surface toward driver)
    a(new THREE.BoxGeometry(1.54, 0.07, 0.50), dashG, 0, 0.75, +0.56);
    // Lower knee area
    a(new THREE.BoxGeometry(1.54, 0.24, 0.34), dashB, 0, 0.34, +0.66);

    // ── Instrument cluster (driver left) ──
    a(new THREE.BoxGeometry(0.50, 0.22, 0.09), gaugeM, -0.30, 0.72, +0.82);
    // Speedometer dial
    a(new THREE.CylinderGeometry(0.088, 0.088, 0.055, 16), gaugeM,  -0.40, 0.75, +0.80, Math.PI/2);
    a(new THREE.TorusGeometry(0.088, 0.009, 6, 16),         chromM, -0.40, 0.75, +0.80, Math.PI/2);
    // Tachometer dial
    a(new THREE.CylinderGeometry(0.068, 0.068, 0.055, 14), gaugeM,  -0.21, 0.75, +0.80, Math.PI/2);
    a(new THREE.TorusGeometry(0.068, 0.007, 6, 14),         chromM, -0.21, 0.75, +0.80, Math.PI/2);

    // Speedo needle (pivot around face centre)
    const needleGroup = new THREE.Group();
    needleGroup.position.set(-0.40, 0.754, +0.81);
    needleGroup.rotation.x = Math.PI / 2; // face the driver
    const needleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.005, 0.072, 0.006), needM);
    needleMesh.position.set(0, 0.036, 0);   // pivot at base
    needleGroup.add(needleMesh);
    g.add(needleGroup);
    g.speedNeedle = needleGroup;            // ← animate this

    // ── Centre infotainment screen ──
    a(new THREE.BoxGeometry(0.34, 0.22, 0.05), screenM, +0.12, 0.72, +0.83);
    // Screen glow strip (fake)
    a(new THREE.BoxGeometry(0.30, 0.18, 0.04),
      new THREE.MeshLambertMaterial({color:0x0a1e3c, emissive:0x020610}), +0.12, 0.72, +0.84);

    // ── HVAC vents (3 round) ──
    for (let i = 0; i < 3; i++)
      a(new THREE.CylinderGeometry(0.028, 0.028, 0.055, 10), trimM,
        -0.06 + i * 0.18, 0.62, +0.87, Math.PI/2);

    // ── Centre console ──
    a(new THREE.BoxGeometry(0.26, 0.30, 0.78), dashB, +0.32, 0.50, +0.10);
    a(new THREE.BoxGeometry(0.22, 0.09, 0.34), trimM, +0.32, 0.67, +0.10); // armrest pad
    // Gear shift stalk + ball
    {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.18, 6), dashB);
      stalk.position.set(+0.32, 0.66, -0.02); g.add(stalk);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), chromM);
      ball.position.set(+0.32, 0.77, -0.02); g.add(ball);
    }
    // USB/charge slots
    a(new THREE.BoxGeometry(0.06, 0.04, 0.12), dashG, +0.32, 0.58, +0.28);

    /* ────────────────────────────────────────
       STEERING COLUMN + WHEEL
       ──────────────────────────────────────── */
    // Column tube
    a(new THREE.CylinderGeometry(0.036, 0.052, 0.50, 8),
      dashB, -0.28, 0.54, +0.46, -0.60);
    // Stalk housing
    a(new THREE.BoxGeometry(0.11, 0.07, 0.22), dashB, -0.28, 0.74, +0.34);

    // Steering wheel group (exposed for animation)
    const sw = new THREE.Group();
    sw.position.set(-0.28, 0.84, +0.38);
    sw.rotation.x = -0.58;   // tilt toward driver

    // Rim
    const swRim = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.024, 10, 28), gripM);
    sw.add(swRim);
    // Grip wraps (flat strips to break uniform torus look)
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.020, 0.055), trimM);
      grip.position.set(Math.sin(ang) * 0.185, Math.cos(ang) * 0.185, 0);
      grip.rotation.z = ang;
      sw.add(grip);
    }
    // Hub
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.050, 0.038, 10), spokeM);
    hub.rotation.x = Math.PI / 2; sw.add(hub);
    // 3 spokes
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.010, 0.165), spokeM);
      sp.position.set(Math.sin(ang) * 0.094, Math.cos(ang) * 0.094, 0);
      sp.rotation.z = -ang;
      sw.add(sp);
    }
    // Horn pad
    const horn = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.055, 0.025), spokeM);
    horn.position.set(0, 0, 0.018); sw.add(horn);
    g.add(sw);
    g.steeringWheel = sw;               // ← animate this

    /* ────────────────────────────────────────
       DRIVER ARMS (FPV hands on wheel)
       ──────────────────────────────────────── */
    // Left arm — upper sleeve
    a(new THREE.CylinderGeometry(0.038, 0.042, 0.42, 7), slvM,
      -0.28, 0.60, +0.14, -0.80, 0, +0.40);
    // Left forearm (skin, angled toward wheel)
    a(new THREE.CylinderGeometry(0.032, 0.038, 0.32, 6), skinM,
      -0.42, 0.76, +0.29, -0.55, 0, +0.26);
    // Left hand (~9 o'clock on wheel)
    a(new THREE.SphereGeometry(0.055, 8, 6), skinM, -0.46, 0.86, +0.22);
    a(new THREE.CylinderGeometry(0.013, 0.013, 0.055, 5), skinM,
      -0.49, 0.87, +0.20, 0, 0, -0.65); // thumb

    // Right arm — upper sleeve
    a(new THREE.CylinderGeometry(0.038, 0.042, 0.42, 7), slvM,
      +0.08, 0.60, +0.14, -0.80, 0, -0.36);
    // Right forearm
    a(new THREE.CylinderGeometry(0.032, 0.038, 0.32, 6), skinM,
      +0.22, 0.76, +0.29, -0.55, 0, -0.22);
    // Right hand (~3 o'clock)
    a(new THREE.SphereGeometry(0.055, 8, 6), skinM, +0.27, 0.86, +0.22);
    a(new THREE.CylinderGeometry(0.013, 0.013, 0.055, 5), skinM,
      +0.30, 0.87, +0.20, 0, 0, +0.65);

    /* ────────────────────────────────────────
       REARVIEW MIRROR
       ──────────────────────────────────────── */
    a(new THREE.BoxGeometry(0.24, 0.095, 0.038), mirFr,  0, 1.52, +0.62);
    a(new THREE.BoxGeometry(0.20, 0.075, 0.030), mirGl,  0, 1.52, +0.63);
    a(new THREE.BoxGeometry(0.018, 0.11,  0.018), trimM, 0, 1.45, +0.60); // mount

    /* ────────────────────────────────────────
       DRIVER DOOR INTERIOR
       ──────────────────────────────────────── */
    // Door card
    a(new THREE.BoxGeometry(0.060, 0.62, 1.20), trimM, -0.78, 0.95, -0.02);
    // Armrest + pad
    a(new THREE.BoxGeometry(0.065, 0.10, 0.50), dashB, -0.79, 0.78, +0.12);
    a(new THREE.BoxGeometry(0.055, 0.055, 0.46), dashG, -0.79, 0.84, +0.12);
    // Pull handle
    a(new THREE.BoxGeometry(0.055, 0.058, 0.19), trimM, -0.79, 1.05, +0.24);
    // Window switches
    a(new THREE.BoxGeometry(0.055, 0.038, 0.15), trimM, -0.79, 0.90, +0.22);
    // Speaker grille circle
    a(new THREE.CylinderGeometry(0.076, 0.076, 0.036, 13), dashB,
      -0.79, 0.70, -0.22, 0, 0, Math.PI/2);

    /* ────────────────────────────────────────
       HEADLINER + TRIM
       ──────────────────────────────────────── */
    a(new THREE.BoxGeometry(1.48, 0.044, 1.34), linerM, 0, 1.62, +0.02);
    // A-pillar trim (driver side)
    a(new THREE.BoxGeometry(0.066, 0.52, 0.068), trimM,
      -0.75, 1.30, +0.70, 0, 0, -0.16);
    // Windshield visor band (anti-glare strip)
    a(new THREE.BoxGeometry(1.24, 0.076, 0.055), visorM, 0, 1.47, +0.69);

    return g;
  }


  /* ════════════════════════════════════════════════════════════
     createDriver()
     Seated storm-chaser seen through windows from outside.
     No arms (cockpit provides FPV arms separately).
     Add as child of vehicle group.
     Local origin = torso base: x=–0.30, y=0.44, z=–0.04
     ════════════════════════════════════════════════════════════ */
  static createDriver() {
    const g = new THREE.Group();
    // Position in vehicle-local space (driver seat)
    g.position.set(-0.30, 0.44, -0.04);

    const a = (geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0) =>
      this._a(geo, mat, px, py, pz, g, rx, ry, rz);

    /* ─ Materials ─ */
    const skin  = new THREE.MeshLambertMaterial({ color: 0xe2b596 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0x2c3e55 });
    const vest  = new THREE.MeshLambertMaterial({ color: 0xff6a00, transparent: true, opacity: 0.90 });
    const stripe = new THREE.MeshLambertMaterial({ color: 0xffee66, emissive: 0x221a00 });
    const pants = new THREE.MeshLambertMaterial({ color: 0x1e2d40 });
    const boot  = new THREE.MeshLambertMaterial({ color: 0x141414 });
    const hair  = new THREE.MeshLambertMaterial({ color: 0x110c06 });
    const cap   = new THREE.MeshLambertMaterial({ color: 0x192436 });
    const shades = new THREE.MeshLambertMaterial({ color: 0x080808 });

    /* ─ TORSO ─ */
    a(new THREE.BoxGeometry(0.34, 0.44, 0.22), shirt,  0, 0.42, 0);
    a(new THREE.BoxGeometry(0.36, 0.42, 0.24), vest,   0, 0.42, 0);   // hi-vis vest
    a(new THREE.BoxGeometry(0.37, 0.038, 0.25), stripe, 0, 0.28, 0); // reflective band
    a(new THREE.BoxGeometry(0.37, 0.038, 0.25), stripe, 0, 0.46, 0);
    // Shoulders
    [-0.21, 0.21].forEach(x =>
      a(new THREE.CylinderGeometry(0.09, 0.07, 0.11, 7), shirt, x, 0.62, 0, 0, 0, Math.PI/2));

    /* ─ NECK + HEAD ─ */
    a(new THREE.CylinderGeometry(0.065, 0.075, 0.13, 8), skin,  0, 0.72, 0);
    a(new THREE.SphereGeometry(0.155, 11, 9),             skin,  0, 0.89, 0);
    a(new THREE.SphereGeometry(0.160, 9,  7),             hair,  0, 0.95, -0.02); // hair
    // Baseball cap
    a(new THREE.CylinderGeometry(0.175, 0.175, 0.055, 12), cap, 0, 1.05, 0);
    a(new THREE.BoxGeometry(0.15, 0.028, 0.20),             cap, 0, 1.04, +0.18); // brim
    // Sunglasses
    a(new THREE.BoxGeometry(0.26, 0.046, 0.036), shades, 0, 0.87, +0.158);

    /* ─ SEATED THIGHS (horizontal) ─ */
    [-0.09, 0.09].forEach(x =>
      a(new THREE.CylinderGeometry(0.078, 0.078, 0.36, 8), pants, x, 0.11, +0.15, 0, 0, Math.PI/2));

    /* ─ LOWER LEGS (bent downward) ─ */
    [-0.09, 0.09].forEach(x =>
      a(new THREE.CylinderGeometry(0.065, 0.065, 0.40, 7), pants, x, -0.06, +0.35, 0.58));

    /* ─ BOOTS ─ */
    [-0.09, 0.09].forEach(x =>
      a(new THREE.BoxGeometry(0.12, 0.11, 0.22), boot, x, -0.24, +0.53));

    return g;
  }
};


/* ════════════════════════════════════════════════════════════════
   FPV CAMERA CONTROLLER
   Manages first-person perspective from the driver's seat.

   Usage (in HexadoEngine):
     this.fpv = new HE.FPVCamera(this.camera);

     // in _loop():
     this.fpv.update(dt, this.physics);
     this.fpv.animateWheel(dt, this.cockpit.steeringWheel, this.physics.keys);
     this.fpv.animateNeedle(this.cockpit.speedNeedle, this.physics.speedKmh);

   Eye position (SCALED = ×0.9, relative to physics.pos):
     offset X = –0.234  (left of centre — driver seat)
     offset Y =  0.990  (above vehicle base — eye height)
     offset Z = +0.126  (slightly forward in cab)
   ════════════════════════════════════════════════════════════════ */
HE.FPVCamera = class {

  /* Driver eye offsets in SCALED vehicle space (×0.9 applied) */
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
    this._swRotTarget  = 0;    // current steering wheel Z target
    this._swRotCurrent = 0;    // smoothed value
  }

  /**
   * Call every frame to position the camera at the driver's eye.
   * @param {number}            dt       — frame delta-time (s)
   * @param {HE.PhysicsEngine}  physics  — live physics state
   */
  update(dt, physics) {
    this._bobTime += dt;

    const h    = physics.heading;
    const cosH = Math.cos(h);
    const sinH = Math.sin(h);

    const { EX, EY, EZ } = HE.FPVCamera;

    /* ── Transform eye offset from vehicle-local to world space ──
       Y-rotation by heading h:
         worldX = pos.x + EX*cos(h) + EZ*sin(h)
         worldZ = pos.z – EX*sin(h) + EZ*cos(h)
    ── */
    const worldX = physics.pos.x + EX * cosH + EZ * sinH;
    const worldY = physics.pos.y + EY;
    const worldZ = physics.pos.z - EX * sinH + EZ * cosH;

    /* ── Head bob (scales with speed) ── */
    const bobT   = Math.min(physics.speedKmh / 160, 1.0);
    const bobY   = Math.sin(this._bobTime * 9.0) * 0.018 * bobT;
    const bobX   = Math.cos(this._bobTime * 4.5) * 0.009 * bobT;

    this.camera.position.set(worldX + bobX, worldY + bobY, worldZ);

    /* ── Look forward along vehicle heading (slight downward tilt) ── */
    const lookX = worldX + sinH * 18;
    const lookY = worldY - 0.06;          // natural eyes-ahead driver tilt
    const lookZ = worldZ + cosH * 18;
    this.camera.lookAt(lookX, lookY, lookZ);
  }

  /**
   * Smoothly rotate the steering wheel based on WASD input.
   * Call after update() each frame.
   * @param {number}      dt            — frame delta-time
   * @param {THREE.Group} steeringWheel — cockpit.steeringWheel
   * @param {object}      keys          — physics.keys map
   */
  animateWheel(dt, steeringWheel, keys) {
    if (!steeringWheel) return;

    const left  = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];
    this._swRotTarget = left ? 0.52 : (right ? -0.52 : 0);

    // Smooth spring toward target
    this._swRotCurrent += (this._swRotTarget - this._swRotCurrent) * Math.min(dt * 7, 1);
    steeringWheel.rotation.z = this._swRotCurrent;
  }

  /**
   * Rotate the speedometer needle proportional to current speed.
   * @param {THREE.Group} speedNeedle  — cockpit.speedNeedle (group)
   * @param {number}      kmh          — current speed km/h
   */
  animateNeedle(speedNeedle, kmh) {
    if (!speedNeedle) return;
    // Sweep: –135° at 0 km/h  →  +135° at 180 km/h
    const t = Math.min(Math.abs(kmh) / 180, 1);
    speedNeedle.rotation.z = -Math.PI * 0.75 + t * Math.PI * 1.5;
  }
};
