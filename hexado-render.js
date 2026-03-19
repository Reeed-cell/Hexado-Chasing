/**
 * hexado-render.js — Rendering Layer + HUD
 * ─────────────────────────────────────────
 * Depends on: Three.js (global), hexado-logic.js (HE namespace)
 * Extends:    window.HexEngine
 *
 * Classes:
 *   TerrainGen     — smooth multi-octave displaced PlaneGeometry (NO hexagons)
 *   EnvironmentGen — road, trees, farm buildings, power poles, fences, hay bales
 *   AssetFactory   — procedural vehicle mesh, tornado funnel, storm clouds
 *   ParticleEngine — debris spiral (VortexMath) + rain system
 *   HUD            — DOM stat boxes, EF bar, minimap canvas
 */

'use strict';
const HE = window.HexEngine;

/* ════════════════════════════════════════════════════════════
   TERRAIN — smooth Oklahoma plains
   PlaneGeometry(290×290, 90×90) displaced via layered sine noise.
   Vertex-colored by height band — no textures, no external assets.
   ════════════════════════════════════════════════════════════ */
HE.TerrainGen = class {

  /**
   * Multi-octave sine noise height function.
   * Produces gentle rolling Oklahoma plains — mostly flat, mild undulation.
   * @param {number} wx  world X
   * @param {number} wz  world Z
   * @returns {number} height ≥ 0
   */
  static heightAt(wx, wz) {
    return Math.max(0,
      Math.sin(wx * 0.025 + 0.3) * Math.cos(wz * 0.020 + 0.8) * 2.8 +  // large rolls
      Math.sin(wx * 0.060 + wz  * 0.045 + 0.7) * 1.1 +                  // medium bumps
      Math.cos(wx * 0.130 - wz  * 0.100 + 1.2) * 0.5 +                  // fine detail
      Math.sin(wx * 0.280 + wz  * 0.320)        * 0.18 +                 // micro texture
      0.65                                                                 // base lift
    );
  }

  /**
   * Generate and add the terrain mesh to the scene.
   * @param {THREE.Scene} scene
   * @returns {THREE.Mesh}
   */
  static generate(scene) {
    const W    = 290;  // world units
    const SEGS = 90;   // subdivisions each axis

    const geo = new THREE.PlaneGeometry(W, W, SEGS, SEGS);
    geo.rotateX(-Math.PI / 2);  // lay flat in XZ plane

    const pos   = geo.attributes.position;
    const cols  = [];

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = this.heightAt(x, z);
      pos.setY(i, h);

      // Height-band vertex colors
      let r, g, b;
      if      (h < 0.45) { r = 0.18; g = 0.30; b = 0.11; }  // low dark grass
      else if (h < 1.30) { r = 0.22; g = 0.40; b = 0.12; }  // main grassland
      else if (h < 2.20) { r = 0.27; g = 0.44; b = 0.14; }  // mid hillside
      else if (h < 3.10) { r = 0.40; g = 0.36; b = 0.17; }  // hilltop dirt
      else               { r = 0.52; g = 0.45; b = 0.22; }  // plateau

      // Micro jitter to break uniformity
      const j = 1 + (Math.random() - 0.5) * 0.09;
      cols.push(r * j, g * j, b * j);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    geo.computeVertexNormals();

    const mat  = new THREE.MeshLambertMaterial({ vertexColors: true });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    return mesh;
  }
};


/* ════════════════════════════════════════════════════════════
   ENVIRONMENT — Oklahoma tornado-alley countryside
   All geometry is procedural Three.js constructors, no files.
   Props: road · power poles · two farm complexes · trees
          hay bales · fences · water tower · storm clouds
   ════════════════════════════════════════════════════════════ */
HE.EnvironmentGen = class {

  /** Build all static world props and add to scene. */
  static build(scene) {
    const hAt = (x, z) => HE.TerrainGen.heightAt(x, z);
    this._buildRoad(scene, hAt);
    this._buildPowerPoles(scene, hAt);
    this._buildFarm(scene, hAt, -36, -22, false);  // west farm
    this._buildFarm(scene, hAt,  30,  28, true);   // east farm
    this._buildTrees(scene, hAt);
    this._buildHayBales(scene, hAt);
    this._buildFences(scene, hAt);
    this._buildWaterTower(scene, hAt, 16, 48);
    this._buildStormClouds(scene);
  }

  /* ── Utility: add a mesh at (px, py, pz) to a parent group ── */
  static _m(geo, mat, px, py, pz, parent) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(px, py, pz);
    parent.add(m);
    return m;
  }

  /* ── Country road — runs along Z axis, two lanes ── */
  static _buildRoad(scene, hAt) {
    const asphalt  = new THREE.MeshLambertMaterial({ color: 0x252525 });
    const shoulder = new THREE.MeshLambertMaterial({ color: 0x787060 });
    const edgeLine = new THREE.MeshLambertMaterial({ color: 0xeeeecc });
    const centreDash = new THREE.MeshLambertMaterial({ color: 0xf0dd50 });

    // Segment the road along Z so it follows terrain height
    for (let z = -125; z < 125; z += 5) {
      const h = hAt(0, z + 2.5) + 0.04;

      // Gravel shoulders
      const sL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 5.1), shoulder);
      sL.position.set(-5.6, h, z + 2.5); scene.add(sL);
      const sR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 5.1), shoulder);
      sR.position.set(5.6, h, z + 2.5); scene.add(sR);

      // Asphalt body
      const road = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.07, 5.1), asphalt);
      road.position.set(0, h, z + 2.5); scene.add(road);

      // Edge white stripes
      const eL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 5.1), edgeLine);
      eL.position.set(-4.5, h + 0.01, z + 2.5); scene.add(eL);
      const eR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 5.1), edgeLine);
      eR.position.set(4.5, h + 0.01, z + 2.5); scene.add(eR);
    }

    // Yellow centre dashes (every 8 m, 3.5 m long)
    for (let z = -124; z < 124; z += 8) {
      const h = hAt(0, z + 1.75) + 0.08;
      const dash = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.02, 3.5), centreDash);
      dash.position.set(0, h, z + 1.75);
      scene.add(dash);
    }
  }

  /* ── Wooden power poles along both road sides, wires connecting ── */
  static _buildPowerPoles(scene, hAt) {
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x7a6540 });
    const insulate = new THREE.MeshLambertMaterial({ color: 0x334455 });
    const wireMat  = new THREE.LineBasicMaterial({ color: 0x2a2a2a });

    const SIDE   = 7.8;   // lateral offset from road
    const STEP   = 26;    // pole spacing (m)
    const zList  = [];
    for (let z = -112; z <= 112; z += STEP) zList.push(z);

    zList.forEach((z, idx) => {
      [-SIDE, SIDE].forEach(ox => {
        const h = hAt(ox, z);
        const g = new THREE.Group();
        g.position.set(ox, h, z);

        // Main pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.15, 9.5, 7), poleMat);
        pole.position.y = 4.75; g.add(pole);

        // Cross-arm
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 3.4, 5), poleMat);
        arm.rotation.z = Math.PI / 2;
        arm.position.y = 8.9; g.add(arm);

        // Insulator caps at arm ends
        [-1.55, 1.55].forEach(cx => {
          const cap = new THREE.Mesh(new THREE.SphereGeometry(0.11, 5, 4), insulate);
          cap.position.set(cx, 8.9, 0); g.add(cap);
        });

        scene.add(g);
      });

      // Wires between consecutive poles (both sides)
      if (idx > 0) {
        const prevZ = zList[idx - 1];
        [-SIDE, SIDE].forEach(ox => {
          const y0 = hAt(ox, prevZ) + 8.9;
          const y1 = hAt(ox, z)     + 8.9;
          const midY = (y0 + y1) * 0.5 - 0.5;  // catenary sag

          // Two wire lines per side (left + right insulator positions)
          [-1.55, 1.55].forEach(cx => {
            const pts = [
              new THREE.Vector3(ox + cx, y0,  prevZ),
              new THREE.Vector3(ox + cx, midY, (prevZ + z) * 0.5),
              new THREE.Vector3(ox + cx, y1,  z)
            ];
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            scene.add(new THREE.Line(geo, wireMat));
          });
        });
      }
    });
  }

  /* ── Farm complex: house · barn · two silos · shed ── */
  static _buildFarm(scene, hAt, cx, cz, mirror) {
    const d = mirror ? -1 : 1;  // mirror flips lateral offsets

    // ── Materials
    const wall    = new THREE.MeshLambertMaterial({ color: 0xdbd0bb });
    const roofRed = new THREE.MeshLambertMaterial({ color: 0x7a1a15 });
    const barnWall = new THREE.MeshLambertMaterial({ color: 0x8c1c1c });
    const barnRoof = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
    const siloWall = new THREE.MeshLambertMaterial({ color: 0xbcb4a0 });
    const siloCap  = new THREE.MeshLambertMaterial({ color: 0x556655 });
    const shedWall = new THREE.MeshLambertMaterial({ color: 0x889268 });
    const shedRoof = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
    const glass    = new THREE.MeshLambertMaterial({ color: 0x88aacc, transparent: true, opacity: 0.72 });
    const door     = new THREE.MeshLambertMaterial({ color: 0x4a3010 });
    const chimney  = new THREE.MeshLambertMaterial({ color: 0x8a7060 });
    const porch    = new THREE.MeshLambertMaterial({ color: 0xbbaa90 });

    // ════ House ════
    {
      const g  = new THREE.Group();
      const bh = hAt(cx, cz);
      g.position.set(cx, bh, cz);
      g.rotation.y = d * 0.12;

      // Walls + porch bump
      this._m(new THREE.BoxGeometry(7.2, 4.5, 5.8), wall,    0, 2.25, 0,    g);
      this._m(new THREE.BoxGeometry(3.5, 2.8, 1.7), porch,   d * 0.4, 1.4, 3.75, g);
      // Gabled roof (4-sided ConeGeometry rotated 45°)
      const roof = new THREE.Mesh(new THREE.ConeGeometry(5.2, 2.9, 4), roofRed);
      roof.position.set(0, 5.8, 0); roof.rotation.y = Math.PI / 4; g.add(roof);
      // Chimney
      this._m(new THREE.BoxGeometry(0.55, 1.6, 0.55), chimney, d * 1.6, 7.1, -0.7, g);
      // Windows
      [[-2.0, 2.1, 2.92], [2.0, 2.1, 2.92], [-2.6, 2.1, -2.92], [2.6, 2.1, -2.92]].forEach(([x,y,z]) => {
        this._m(new THREE.BoxGeometry(0.92, 0.95, 0.05), glass, x, y, z, g);
      });
      // Front door
      this._m(new THREE.BoxGeometry(0.95, 2.1, 0.05), door, 0, 1.05, 2.93, g);

      scene.add(g);
    }

    // ════ Barn ════
    {
      const bx  = cx + d * 14;
      const bz  = cz - 5;
      const g   = new THREE.Group();
      g.position.set(bx, hAt(bx, bz), bz);
      g.rotation.y = d * 0.18;

      // Main structure
      this._m(new THREE.BoxGeometry(13, 7.5, 9.5), barnWall, 0, 3.75, 0, g);
      // Gambrel roof — two stacked box "decks"
      this._m(new THREE.BoxGeometry(13.5, 2.0, 10.5), barnRoof, 0, 8.5,  0, g);
      this._m(new THREE.BoxGeometry(13.5, 1.6, 5.0),  barnRoof, 0, 9.9,  0, g);
      // Large barn door
      this._m(new THREE.BoxGeometry(4.8, 5.8, 0.09), door, 0, 2.9, 4.79, g);
      // Side hayloft window
      this._m(new THREE.BoxGeometry(1.8, 1.4, 0.09), glass, d * 5.2, 6.0, 0, g);

      scene.add(g);
    }

    // ════ Grain silos (two) ════
    {
      const sx  = cx + d * 24;
      const sz  = cz + 2;

      // Tall silo
      const g1 = new THREE.Group();
      g1.position.set(sx, hAt(sx, sz), sz);
      this._m(new THREE.CylinderGeometry(2.3, 2.3, 15, 12), siloWall, 0, 7.5,  0, g1);
      this._m(new THREE.ConeGeometry(2.5, 2.8, 12),         siloCap,  0, 16.4, 0, g1);
      scene.add(g1);

      // Shorter companion silo
      const g2 = new THREE.Group();
      g2.position.set(sx + d * 3.8, hAt(sx + d * 3.8, sz - 1), sz - 1);
      this._m(new THREE.CylinderGeometry(1.7, 1.7, 11, 10), siloWall, 0, 5.5,  0, g2);
      this._m(new THREE.ConeGeometry(1.9, 2.2, 10),         siloCap,  0, 12.1, 0, g2);
      scene.add(g2);
    }

    // ════ Tool shed ════
    {
      const shx = cx - d * 4;
      const shz = cz + 9;
      const g   = new THREE.Group();
      g.position.set(shx, hAt(shx, shz), shz);
      this._m(new THREE.BoxGeometry(4.2, 2.9, 3.8), shedWall, 0, 1.45, 0, g);
      this._m(new THREE.BoxGeometry(4.6, 0.3, 4.2), shedRoof,  0, 3.05, 0, g);
      scene.add(g);
    }
  }

  /* ── Scattered trees: cottonwoods, oaks, shrubs ── */
  static _buildTrees(scene, hAt) {
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4b22 });
    const leafA    = new THREE.MeshLambertMaterial({ color: 0x2c6c1c });
    const leafB    = new THREE.MeshLambertMaterial({ color: 0x367d22 });
    const leafC    = new THREE.MeshLambertMaterial({ color: 0x1f5412 });
    const leafMats = [leafA, leafB, leafC];

    const placements = [];

    // Trees lining both sides of the road
    for (let z = -110; z <= 110; z += 13 + Math.random() * 7) {
      [-13.5, 14.5].forEach(ox => {
        const jx = (Math.random() - 0.5) * 3.5;
        const jz = (Math.random() - 0.5) * 3.5;
        placements.push([ox + jx, z + jz, Math.random() < 0.65 ? 'cottonwood' : 'shrub']);
      });
    }

    // Scattered field trees (avoid ±12 road corridor)
    for (let i = 0; i < 55; i++) {
      const x   = (Math.random() - 0.5) * 230;
      const z   = (Math.random() - 0.5) * 230;
      if (Math.abs(x) < 12 || Math.abs(x) > 138 || Math.abs(z) > 138) continue;
      const type = Math.random() < 0.5 ? 'cottonwood' : (Math.random() < 0.5 ? 'oak' : 'shrub');
      placements.push([x, z, type]);
    }

    // Windbreak grove (tight row, NE corner)
    for (let i = 0; i < 14; i++) {
      placements.push([75 + i * 3.5, -65 + (Math.random()-0.5)*5, 'cottonwood']);
    }

    // Small copse (irregular cluster, SW)
    for (let i = 0; i < 12; i++) {
      const ax = -80 + (Math.random() - 0.5) * 22;
      const az =  55 + (Math.random() - 0.5) * 18;
      placements.push([ax, az, Math.random() < 0.6 ? 'cottonwood' : 'oak']);
    }

    placements.forEach(([x, z, type]) => {
      const h  = hAt(x, z);
      const lm = leafMats[Math.floor(Math.random() * 3)];
      const g  = new THREE.Group();
      g.position.set(x, h, z);

      if (type === 'cottonwood') {
        // Tall trunk, rounded billowing canopy
        const trH = 3 + Math.random() * 3;
        this._m(new THREE.CylinderGeometry(0.11, 0.22, trH, 7), trunkMat, 0, trH / 2, 0, g);
        const cr = 2.4 + Math.random() * 1.6;
        // Main canopy sphere
        this._m(new THREE.SphereGeometry(cr, 7, 5), lm, 0, trH + cr * 0.72, 0, g);
        // Offset puff
        const px = (Math.random() - 0.5) * cr;
        const pz = (Math.random() - 0.5) * cr;
        this._m(new THREE.SphereGeometry(cr * 0.7, 6, 4), lm, px, trH + cr * 0.85, pz, g);

      } else if (type === 'oak') {
        // Shorter, wider crown
        const trH = 2 + Math.random() * 1.5;
        this._m(new THREE.CylinderGeometry(0.16, 0.28, trH, 7), trunkMat, 0, trH / 2, 0, g);
        const cr = 2.8 + Math.random() * 1.2;
        this._m(new THREE.SphereGeometry(cr, 6, 4), lm, 0, trH + cr * 0.55, 0, g);
        // Two extra puffs for a broader irregular silhouette
        this._m(new THREE.SphereGeometry(cr * 0.65, 5, 4), lm,  cr * 0.5, trH + cr * 0.5, 0, g);
        this._m(new THREE.SphereGeometry(cr * 0.55, 5, 4), lm, -cr * 0.55, trH + cr * 0.45, 0, g);

      } else {
        // Shrub — low, two-blob
        const sr = 0.9 + Math.random() * 0.9;
        this._m(new THREE.SphereGeometry(sr, 6, 4), lm, 0, sr * 0.7, 0, g);
        this._m(new THREE.SphereGeometry(sr * 0.68, 5, 4), lm,
          (Math.random()-0.5)*sr*1.3, sr * 0.55, (Math.random()-0.5)*sr*1.3, g);
      }

      scene.add(g);
    });
  }

  /* ── Round hay bales — horizontal cylinders in field clusters ── */
  static _buildHayBales(scene, hAt) {
    const baleMat = new THREE.MeshLambertMaterial({ color: 0xcfad52 });
    // Pre-defined clusters [cx, cz, count]
    const clusters = [
      [26, 22, 3], [28, 28, 2], [-40, -28, 4],
      [62, -38, 3], [-16, 56, 3], [50, 70, 2]
    ];
    clusters.forEach(([cx, cz, n]) => {
      for (let i = 0; i < n; i++) {
        const x = cx + (Math.random() - 0.5) * 6;
        const z = cz + (Math.random() - 0.5) * 5;
        const h = hAt(x, z);
        const bale = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.65, 11), baleMat);
        bale.rotation.z = Math.PI / 2;
        bale.position.set(x, h + 1.05, z);
        scene.add(bale);
      }
    });
  }

  /* ── Fence lines bordering farm fields ── */
  static _buildFences(scene, hAt) {
    const postMat = new THREE.MeshLambertMaterial({ color: 0x8a7050 });
    const railMat = new THREE.MeshLambertMaterial({ color: 0x9a8060 });

    /**
     * Place a fence line along Z from z0 to z1 at fixed X.
     * @param {number} fx      — fixed world X for the fence
     * @param {number} z0      — start Z
     * @param {number} z1      — end Z
     * @param {number} spacing — post spacing (m)
     */
    const fenceLine = (fx, z0, z1, spacing = 4.0) => {
      for (let z = z0; z <= z1; z += spacing) {
        const h = hAt(fx, z);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.6, 5), postMat);
        post.position.set(fx, h + 0.8, z);
        scene.add(post);
      }
      for (let z = z0; z < z1; z += spacing) {
        const h0 = hAt(fx, z);
        const h1 = hAt(fx, z + spacing);
        const midH = (h0 + h1) * 0.5;
        const midZ = z + spacing * 0.5;

        // Two horizontal rails per span
        [0.90, 0.52].forEach(yOff => {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, spacing - 0.08), railMat);
          rail.position.set(fx, midH + yOff, midZ);
          scene.add(rail);
        });
      }
    };

    // Farm enclosures
    fenceLine(-52, -38, 18);
    fenceLine(-57, -38, 18);
    fenceLine( 22,  22, 58);
    fenceLine( 27,  22, 58);
  }

  /* ── Water tower (cylinder tank + legs) ── */
  static _buildWaterTower(scene, hAt, x, z) {
    const tankMat = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
    const legMat  = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const h       = hAt(x, z);
    const g       = new THREE.Group();
    g.position.set(x, h, z);

    // Tank body + dome cap
    this._m(new THREE.CylinderGeometry(2.6, 2.6, 3.8, 12), tankMat, 0, 12.4, 0, g);
    this._m(new THREE.ConeGeometry(2.7, 1.8, 12),           tankMat, 0, 14.9, 0, g);

    // Four angled legs
    [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 10.5, 5), legMat);
      leg.position.set(lx, 5.25, lz);
      // Angle the legs outward slightly
      leg.rotation.z = Math.sign(lx) * 0.12;
      leg.rotation.x = Math.sign(lz) * 0.12;
      g.add(leg);
    });

    // Cross-brace ring mid-height
    this._m(new THREE.TorusGeometry(2.4, 0.06, 5, 12), legMat, 0, 7.0, 0, g);

    scene.add(g);
  }

  /* ── Cumulonimbus cloud clusters (background atmosphere) ── */
  static _buildStormClouds(scene) {
    const cloudMat = new THREE.MeshLambertMaterial({ color: 0x4a5060, transparent: true, opacity: 0.78 });
    const darkMat  = new THREE.MeshLambertMaterial({ color: 0x2a2e3a, transparent: true, opacity: 0.70 });

    const positions = [
      [-45, 30, -35, cloudMat], [ 22, 34, -52, cloudMat],
      [ 65, 27,  12, darkMat],  [-65, 31,  22, darkMat],
      [ 12, 37,  68, cloudMat], [-22, 28,  52, darkMat],
      [ 55, 30, -62, darkMat],  [-55, 34, -12, cloudMat]
    ];

    positions.forEach(([cx, cy, cz, mat]) => {
      const g = new THREE.Group();
      g.position.set(cx, cy, cz);
      // Main puff
      this._m(new THREE.SphereGeometry(5.5, 6, 5), mat,   0,    0, 0, g);
      this._m(new THREE.SphereGeometry(4.0, 6, 5), mat,   4.5,  0.6, 0, g);
      this._m(new THREE.SphereGeometry(3.5, 6, 5), mat,  -3.8,  0.5, 0.5, g);
      this._m(new THREE.SphereGeometry(3.0, 6, 5), mat,   2.0, -0.5, 2.5, g);
      this._m(new THREE.SphereGeometry(2.8, 6, 5), mat,  -1.5,  0.9, -2.5, g);
      this._m(new THREE.SphereGeometry(5.2, 5, 4), mat,   0,   -2.5, 0, g);  // dark base
      scene.add(g);
    });
  }
};


/* ════════════════════════════════════════════════════════════
   ASSET FACTORY — procedural vehicle + tornado mesh
   Every mesh is built from Three.js geometry constructors.
   No external model files are loaded anywhere.
   ════════════════════════════════════════════════════════════ */
HE.AssetFactory = class {

  /* ── Pickup truck (cab · bed · bumpers · wheels) ── */
  static createVehicle() {
    const g = new THREE.Group();
    const body  = new THREE.MeshLambertMaterial({ color: 0xcc2e12 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x88bbdd, transparent: true, opacity: 0.68 });
    const tire  = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
    const rim   = new THREE.MeshLambertMaterial({ color: 0x888888 });
    const metal = new THREE.MeshLambertMaterial({ color: 0x999999 });
    const dark  = new THREE.MeshLambertMaterial({ color: 0x222222 });

    const add = (geo, mat, px, py, pz, ry = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (ry) m.rotation.y = ry;
      g.add(m); return m;
    };

    // ─ Chassis / bed
    add(new THREE.BoxGeometry(1.62, 0.52, 2.2),  body,   0, 0.30, 0.6);
    // ─ Cab body
    add(new THREE.BoxGeometry(1.62, 0.72, 1.15), body,   0, 0.68, -0.72);
    // ─ Cab roof (slightly narrower)
    add(new THREE.BoxGeometry(1.46, 0.30, 1.05), body,   0, 1.19, -0.76);
    // ─ Windshield (angled)
    const ws = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.48, 0.06), glass);
    ws.position.set(0, 0.84, -0.18); ws.rotation.x = 0.22; g.add(ws);
    // ─ Rear glass
    add(new THREE.BoxGeometry(1.28, 0.38, 0.06), glass, 0, 0.88, -1.30);
    // ─ Side windows
    [-0.82, 0.82].forEach(x => add(new THREE.BoxGeometry(0.06, 0.38, 0.65), glass, x, 0.88, -0.72));
    // ─ Front grill
    add(new THREE.BoxGeometry(1.38, 0.40, 0.08), metal, 0, 0.40, -1.40);
    // ─ Headlight clusters
    [-0.52, 0.52].forEach(x => add(new THREE.BoxGeometry(0.28, 0.20, 0.06), new THREE.MeshLambertMaterial({color:0xffffcc}), x, 0.44, -1.44));
    // ─ Bumpers
    add(new THREE.BoxGeometry(1.62, 0.18, 0.16), metal, 0, 0.13, -1.46);
    add(new THREE.BoxGeometry(1.62, 0.18, 0.16), metal, 0, 0.13,  1.72);
    // ─ Exhaust pipe
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), metal, -0.72, 0.16, 1.72);
    // ─ Antenna
    add(new THREE.CylinderGeometry(0.012, 0.012, 0.7, 4), metal, 0.65, 1.35, -1.10);

    // ─ Wheels (4): [x, y, z]
    const wPos = [[0.92, 0, 0.78], [-0.92, 0, 0.78], [0.92, 0, -0.90], [-0.92, 0, -0.90]];
    const wGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 11);
    const rGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.24, 8);
    const bGeo = new THREE.SphereGeometry(0.07, 5, 4); // wheel bolt
    wPos.forEach(([x, y, z]) => {
      const tw = new THREE.Mesh(wGeo, tire); tw.rotation.z = Math.PI / 2;
      tw.position.set(x, y, z); g.add(tw);
      const rw = new THREE.Mesh(rGeo, rim);  rw.rotation.z = Math.PI / 2;
      rw.position.set(x, y, z); g.add(rw);
      // Lug bolts (5 per wheel)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const blt = new THREE.Mesh(bGeo, dark);
        blt.position.set(x + Math.sign(x) * 0.13, Math.cos(a) * 0.14, z + Math.sin(a) * 0.14);
        g.add(blt);
      }
    });

    g.scale.setScalar(0.86);
    return g;
  }

  /* ── Tornado funnel — stacked tapered open cylinders ── */
  static createTornadoMesh() {
    const g = new THREE.Group();

    // Ring definition: [yBase, radiusBottom, radiusTop, height, colorHex, opacity]
    const rings = [
      [0,   7.0, 5.5, 5,  0x2a1e12, 0.55],
      [5,   5.5, 4.0, 5,  0x3e2e1c, 0.58],
      [10,  4.0, 2.8, 6,  0x5a4830, 0.62],
      [16,  2.8, 1.8, 6,  0x7a6555, 0.65],
      [22,  1.8, 1.1, 6,  0xa08870, 0.68],
      [28,  1.1, 0.6, 5,  0xc0a890, 0.71],
      [33,  0.6, 0.28, 5, 0xddd0c0, 0.73],
    ];
    rings.forEach(([y, rBot, rTop, h, col, op]) => {
      const geo = new THREE.CylinderGeometry(rTop, rBot, h, 16, 1, true);
      const mat = new THREE.MeshLambertMaterial({
        color: col, transparent: true, opacity: op, side: THREE.DoubleSide
      });
      const m = new THREE.Mesh(geo, mat);
      m.position.y = y + h / 2;
      g.add(m);
    });

    // Cloud base disk at apex
    const topGeo = new THREE.TorusGeometry(2.8, 1.4, 6, 18);
    const topMat = new THREE.MeshLambertMaterial({ color: 0x887878, transparent: true, opacity: 0.52 });
    const top    = new THREE.Mesh(topGeo, topMat);
    top.position.y = 40; top.rotation.x = Math.PI / 2;
    g.add(top);

    // Ground contact scour disk
    const gndGeo = new THREE.CircleGeometry(9, 14);
    const gndMat = new THREE.MeshLambertMaterial({ color: 0x4a3020, transparent: true, opacity: 0.38 });
    const gnd    = new THREE.Mesh(gndGeo, gndMat);
    gnd.rotation.x = -Math.PI / 2; gnd.position.y = 0.06;
    g.add(gnd);

    return g;
  }
};


/* ════════════════════════════════════════════════════════════
   PARTICLE ENGINE
   Two systems:
     debris — orbit tornado using VortexMath spiral equations
     rain   — global vertical fall, wraps at ground
   ════════════════════════════════════════════════════════════ */
HE.ParticleEngine = class {

  constructor(scene) {
    this.scene  = scene;
    this.N_DEB  = 750;
    this.N_RAIN = 1000;
    this._time  = 0;
    this._initDebris();
    this._initRain();
  }

  _initDebris() {
    const geo  = new THREE.BufferGeometry();
    this._debPos    = new Float32Array(this.N_DEB * 3);
    this._dHeight   = new Float32Array(this.N_DEB).map(() => Math.random() * 36);
    this._dSpeed    = new Float32Array(this.N_DEB).map(() => 0.7 + Math.random() * 0.65);

    geo.setAttribute('position', new THREE.BufferAttribute(this._debPos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9a7450, size: 0.42, sizeAttenuation: true, transparent: true
    });
    this.debrisPts = new THREE.Points(geo, mat);
    this.scene.add(this.debrisPts);
  }

  _initRain() {
    const geo = new THREE.BufferGeometry();
    this._rainPos = new Float32Array(this.N_RAIN * 3);
    for (let i = 0; i < this.N_RAIN; i++) {
      this._rainPos[i*3  ] = (Math.random() - 0.5) * 200;
      this._rainPos[i*3+1] = Math.random() * 48;
      this._rainPos[i*3+2] = (Math.random() - 0.5) * 200;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(this._rainPos, 3));
    const mat = new THREE.PointsMaterial({ color: 0x88aacc, size: 0.11, transparent: true, opacity: 0.42 });
    this.rainPts = new THREE.Points(geo, mat);
    this.scene.add(this.rainPts);
  }

  /**
   * @param {number}          dt          — frame delta-time
   * @param {THREE.Vector3}   tornadoPos  — tornado world position
   * @param {HE.VortexMath}   vortex      — live vortex instance
   * @param {number}          intensity   — 0..1 storm intensity
   */
  update(dt, tornadoPos, vortex, intensity) {
    this._time += dt;
    const t = this._time;
    vortex.setIntensity(intensity);

    // ─ Debris: spiral around tornado via VortexMath
    const dp = this.debrisPts.geometry.attributes.position;
    for (let i = 0; i < this.N_DEB; i++) {
      const h  = this._dHeight[i];
      const sp = vortex.spiralPos(i, this.N_DEB, h, t * this._dSpeed[i]);
      dp.setXYZ(i,
        tornadoPos.x + sp.x,
        sp.y * (0.45 + intensity * 0.95),
        tornadoPos.z + sp.z
      );
      this._dHeight[i] = (h + dt * (4 + intensity * 11) * this._dSpeed[i]) % 38;
    }
    dp.needsUpdate = true;
    this.debrisPts.material.opacity = 0.28 + intensity * 0.72;

    // ─ Rain: global fall, wrap at ground
    const rp   = this.rainPts.geometry.attributes.position;
    const vFall = 15 + intensity * 25;
    for (let i = 0; i < this.N_RAIN; i++) {
      const y = this._rainPos[i*3+1] - vFall * dt;
      this._rainPos[i*3+1] = y < 0 ? 48 + Math.random() * 6 : y;
    }
    rp.array.set(this._rainPos);
    rp.needsUpdate = true;
  }
};


/* ════════════════════════════════════════════════════════════
   HUD — DOM controller + minimap canvas
   Reads PlayerStats + StormTracker, updates DOM each frame.
   ════════════════════════════════════════════════════════════ */
HE.HUD = class {

  constructor() {
    this._elSpeed   = document.getElementById('s-speed');
    this._elDist    = document.getElementById('s-dist');
    this._elProx    = document.getElementById('s-prox');
    this._elScore   = document.getElementById('s-score');
    this._elEfFill  = document.getElementById('ef-fill');
    this._elEfText  = document.getElementById('ef-label');
    this._elAlert   = document.getElementById('alert');
    this._alertClr  = null;

    // Minimap
    this._mmCanvas  = document.getElementById('mm-canvas');
    this._mmCtx     = this._mmCanvas.getContext('2d');
  }

  /**
   * @param {HE.PlayerStats}   stats
   * @param {HE.StormTracker}  tracker
   * @param {THREE.Vector3}    playerPos
   */
  update(stats, tracker, playerPos) {
    // Stat boxes
    this._elSpeed.textContent = Math.round(stats.speed);
    this._elDist.textContent  = Math.round(stats.distanceTraveled);
    this._elProx.textContent  = isFinite(stats.proximity) ? Math.round(stats.proximity) : '---';
    this._elScore.textContent = Math.round(stats.score);

    // EF intensity bar
    const pct = Math.round(tracker.intensity * 100);
    this._elEfFill.style.width = pct + '%';
    const efColors = ['#00cc44', '#88cc00', '#ffcc00', '#ff8800', '#ff4400', '#cc0000'];
    this._elEfFill.style.background = efColors[tracker.efScale] || '#00cc44';
    this._elEfText.textContent = `EF${tracker.efScale}  ·  ${Math.round(tracker.windSpeed)} km/h`;

    // Proximity danger flash
    if      (stats.proximity < 12)  this._flash('DANGER!', '#ff2222');
    else if (stats.proximity < 28)  this._flash('CLOSE!',  '#ff8800');

    // Minimap
    this._drawMinimap(playerPos, tracker.path);
  }

  _flash(msg, color = '#ff2222') {
    this._elAlert.textContent = msg;
    this._elAlert.style.color = color;
    this._elAlert.style.textShadow = `0 0 22px ${color}`;
    this._elAlert.style.opacity = '1';
    clearTimeout(this._alertClr);
    this._alertClr = setTimeout(() => { this._elAlert.style.opacity = '0'; }, 680);
  }

  _drawMinimap(playerPos, stormPath) {
    const ctx = this._mmCtx;
    const W = 110, H = 110, WORLD = 145;
    const toMM = (wx, wz) => ({
      x: (wx / WORLD + 1) * 0.5 * W,
      y: (wz / WORLD + 1) * 0.5 * H
    });

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(5,8,12,0.82)';
    ctx.fillRect(0, 0, W, H);

    // Terrain tint (green rectangle = world bounds)
    ctx.fillStyle = 'rgba(24,50,20,0.55)';
    ctx.fillRect(0, 0, W, H);

    // Road indicator (vertical white line at map centre)
    ctx.strokeStyle = 'rgba(200,190,140,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

    // Storm path trail
    if (stormPath.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,90,20,0.55)';
      ctx.lineWidth = 1.5;
      const p0 = toMM(stormPath[0].x, stormPath[0].z);
      ctx.moveTo(p0.x, p0.y);
      stormPath.forEach(pt => { const p = toMM(pt.x, pt.z); ctx.lineTo(p.x, p.y); });
      ctx.stroke();
    }

    // Tornado dot (red pulsing circle)
    if (stormPath.length > 0) {
      const last = stormPath[stormPath.length - 1];
      const tp   = toMM(last.x, last.z);
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#ff3300'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,100,30,0.6)';
      ctx.lineWidth = 2; ctx.stroke();
    }

    // Player dot (cyan)
    const pp = toMM(playerPos.x, playerPos.z);
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#44ccff'; ctx.fill();

    // Map border
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, H);

    // Legend
    const lb = [
      ['#ff3300', 'STORM'],
      ['#44ccff', 'YOU']
    ];
    lb.forEach(([col, label], i) => {
      const y = 92 + i * 9;
      ctx.fillStyle = col;
      ctx.fillRect(5, y, 6, 6);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '7px monospace';
      ctx.fillText(label, 14, y + 5.5);
    });
  }
};
