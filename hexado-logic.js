/**
 * hexado-logic.js — Logic + Data Layer
 * ─────────────────────────────────────
 * Depends on: Three.js (global, loaded by hexado.html before this file)
 * Exports via: window.HexEngine namespace
 *
 * Layers contained here:
 *   CORE       EventBus          — pub/sub decoupling all engine modules
 *   DATA       PlayerStats       — speed, distance, proximity, score
 *   DATA       StormTracker      — EF scale, wind speed, path history
 *   DATA       SessionLogger     — timestamped event log
 *   LOGIC      VortexMath        — Burgers vortex equations
 *   LOGIC      PhysicsEngine     — vehicle driving dynamics
 *   LOGIC      StormSystem       — tornado movement & intensity
 */

'use strict';
window.HexEngine = window.HexEngine || {};
const HE = window.HexEngine;

/* ════════════════════════════════════════════════════════════
   CORE — EventBus
   Lightweight pub/sub that decouples all engine layers.
   Usage:  bus.on('STORM_UPDATE', handler)
           bus.emit('PLAYER_MOVE', { pos, speed })
   ════════════════════════════════════════════════════════════ */
HE.EventBus = class {
  constructor() {
    this._map = {};
  }
  /** Subscribe to an event. Returns `this` for chaining. */
  on(event, fn) {
    (this._map[event] ||= []).push(fn);
    return this;
  }
  /** Unsubscribe a specific handler. */
  off(event, fn) {
    this._map[event] = (this._map[event] || []).filter(f => f !== fn);
  }
  /** Emit an event to all subscribers. */
  emit(event, data) {
    (this._map[event] || []).forEach(fn => fn(data));
  }
};


/* ════════════════════════════════════════════════════════════
   DATA — PlayerStats
   Accumulates per-session metrics each physics tick.
   ════════════════════════════════════════════════════════════ */
HE.PlayerStats = class {
  constructor() {
    this.speed            = 0;          // km/h
    this.distanceTraveled = 0;          // meters
    this.proximity        = Infinity;   // meters from tornado centre
    this.score            = 0;          // accumulated score
    this.maxSpeed         = 0;
    this.closestApproach  = Infinity;
  }

  /**
   * @param {number} dt          — frame delta-time in seconds
   * @param {number} speedKmh    — current vehicle speed km/h
   * @param {number} distDelta   — meters moved this frame
   * @param {number} prox        — distance to tornado centre (metres)
   */
  update(dt, speedKmh, distDelta, prox) {
    this.speed            = speedKmh;
    this.maxSpeed         = Math.max(this.maxSpeed, speedKmh);
    this.distanceTraveled += Math.abs(distDelta);
    this.proximity        = prox;
    this.closestApproach  = Math.min(this.closestApproach, prox);

    // Score: reward sustained close approach in 10–55 m sweet spot
    if (prox > 10 && prox < 55) {
      this.score += dt * (55 - prox) * 0.7;
    }
  }
};


/* ════════════════════════════════════════════════════════════
   DATA — StormTracker
   Tracks derived storm state: EF scale, wind speed, path log.
   ════════════════════════════════════════════════════════════ */
HE.StormTracker = class {
  constructor() {
    this.intensity  = 0;    // 0..1 normalised
    this.efScale    = 0;    // 0..5 (Enhanced Fujita)
    this.windSpeed  = 65;   // km/h
    this.activeTime = 0;    // seconds since init
    this.path       = [];   // [{x, z, t}] – last 300 sampled positions
  }

  /**
   * Called from the STORM_UPDATE event handler.
   * @param {number} dt         — frame delta-time
   * @param {number} intensity  — normalised storm intensity 0..1
   * @param {THREE.Vector3} pos — world position of tornado base
   */
  update(dt, intensity, pos) {
    this.intensity  = intensity;
    this.efScale    = Math.min(5, Math.floor(intensity * 6));
    this.windSpeed  = 65 + intensity * 255;
    this.activeTime += dt;

    const last = this.path[this.path.length - 1];
    if (!last || this.activeTime - last.t > 0.5) {
      this.path.push({ x: pos.x, z: pos.z, t: this.activeTime });
      if (this.path.length > 300) this.path.shift();
    }
  }
};


/* ════════════════════════════════════════════════════════════
   DATA — SessionLogger
   Lightweight ring-buffer event log (max 500 entries).
   Accessible via window.hexado.logger in dev console.
   ════════════════════════════════════════════════════════════ */
HE.SessionLogger = class {
  constructor() {
    this.events = [];
    this._t0    = Date.now();
  }

  log(type, data = {}) {
    const t = ((Date.now() - this._t0) / 1000).toFixed(2);
    this.events.push({ type, t, data });
    if (this.events.length > 500) this.events.shift();
  }

  summary() {
    return {
      count:    this.events.length,
      duration: ((Date.now() - this._t0) / 1000).toFixed(1) + 's'
    };
  }
};


/* ════════════════════════════════════════════════════════════
   LOGIC — VortexMath
   Burgers vortex approximation for wind field computation.

   Equations:
     u_θ = (Γ / 2πr)(1 − e^(−r²/r_c²))   — tangential (swirl)
     u_r = −α · r                           — radial inflow
     u_z = 2α · z                           — vertical updraft
   ════════════════════════════════════════════════════════════ */
HE.VortexMath = class {
  constructor() {
    this.circulation = 800;   // Γ  vortex strength (m²/s)
    this.coreRadius  = 8;     // r_c core radius (m)
    this.alpha       = 0.35;  // strain rate
  }

  /** Scale all vortex parameters to storm intensity t ∈ [0, 1] */
  setIntensity(t) {
    this.circulation = 300  + t * 3200;
    this.coreRadius  = 4    + t * 14;
    this.alpha       = 0.20 + t * 0.40;
  }

  /**
   * Cylindrical velocity components at radius r, height z.
   * @returns {{ vTheta, vR, vZ }}
   */
  cylindrical(r, z) {
    r = Math.max(r, 0.01);
    const rc     = this.coreRadius;
    const vTheta = (this.circulation / (2 * Math.PI * r))
                   * (1 - Math.exp(-(r * r) / (rc * rc)));
    const vR     = -this.alpha * r;
    const vZ     = 2 * this.alpha * Math.abs(z) + 0.5;
    return { vTheta, vR, vZ };
  }

  /**
   * World-space horizontal wind velocity at Cartesian offset (dx, dz)
   * from the tornado centre. Converts polar back to Cartesian.
   * @returns {{ x, z }}
   */
  worldWind(dx, dz) {
    const r   = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(dz, dx);
    const { vTheta, vR } = this.cylindrical(r, 0);
    return {
      x: vR * Math.cos(ang) - vTheta * Math.sin(ang),
      z: vR * Math.sin(ang) + vTheta * Math.cos(ang)
    };
  }

  /**
   * Returns the 3D spiral position for debris particle i of total,
   * at height h, at simulation time t. Used by ParticleEngine.
   * @returns {{ x, y, z }}
   */
  spiralPos(i, total, h, t) {
    const phase  = (i / total) * Math.PI * 2 + t * (2.5 + h * 0.06);
    const twist  = h * 0.03;
    const radius = this.coreRadius * (0.35 + h * 0.05)
                   + Math.sin(t * 1.8 + i * 0.4) * 2.0;
    return {
      x: Math.cos(phase + twist) * radius,
      y: h,
      z: Math.sin(phase + twist) * radius
    };
  }
};


/* ════════════════════════════════════════════════════════════
   LOGIC — PhysicsEngine
   Custom vehicle driving dynamics:
     • Forward / reverse acceleration with momentum drag
     • Speed-scaled steering radius
     • Terrain-following (vehicle stays 0.85 m above ground)
     • Wind displacement (from VortexMath, applied here)
   ════════════════════════════════════════════════════════════ */
HE.PhysicsEngine = class {
  constructor(bus) {
    this.bus      = bus;
    this.pos      = new THREE.Vector3(0, 1, 80);
    this.heading  = 0;          // radians, Y-up (0 = looking toward +Z)
    this.speed    = 0;          // m/s (signed: positive = forward)
    this.maxSpeed = 30;         // m/s ≈ 108 km/h
    this.accel    = 14;         // m/s²
    this.brakeF   = 22;         // m/s² braking decel
    this.dragBase = 0.965;      // drag exponent per-tick
    this.turnRate = 1.75;       // rad/s at full speed
    this.windF    = new THREE.Vector2(); // accumulated wind force per frame
    this.keys     = {};
    this._prevPos = new THREE.Vector3();
  }

  /** Attach keyboard listeners (called once at engine init) */
  bindKeys() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      e.preventDefault();
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });
  }

  /** Apply wind force from VortexMath for this frame */
  applyWind(wx, wz, intensity) {
    this.windF.set(wx * intensity * 0.004, wz * intensity * 0.004);
  }

  /**
   * Main physics step.
   * @param {number}   dt        — frame delta-time (seconds, capped at 0.05)
   * @param {Function} heightFn  — (x, z) → terrain height at world position
   */
  update(dt, heightFn) {
    this._prevPos.copy(this.pos);
    const k   = this.keys;
    const fwd = k['KeyW'] || k['ArrowUp'];
    const bak = k['KeyS'] || k['ArrowDown'];
    const lft = k['KeyA'] || k['ArrowLeft'];
    const rgt = k['KeyD'] || k['ArrowRight'];

    // ─ Acceleration / braking
    if (fwd) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
    } else if (bak) {
      this.speed = Math.max(-this.maxSpeed * 0.45, this.speed - this.brakeF * dt);
    } else {
      this.speed *= Math.pow(this.dragBase, dt * 60);
    }

    // ─ Steering (turn rate tapers at low speed)
    if (Math.abs(this.speed) > 0.5) {
      const dir = this.speed > 0 ? 1 : -1;
      const tr  = this.turnRate * Math.min(1, Math.abs(this.speed) / 8);
      if (lft) this.heading += dir * tr * dt;
      if (rgt) this.heading -= dir * tr * dt;
    }

    // ─ Integrate position with wind offset
    const vx = Math.sin(this.heading) * this.speed;
    const vz = Math.cos(this.heading) * this.speed;
    this.pos.x += (vx + this.windF.x) * dt;
    this.pos.z += (vz + this.windF.y) * dt;

    // ─ World boundary clamp (±130 m from origin)
    const B = 130;
    this.pos.x = Math.max(-B, Math.min(B, this.pos.x));
    this.pos.z = Math.max(-B, Math.min(B, this.pos.z));

    // ─ Terrain follow — vehicle hugs ground + 0.85 m clearance
    this.pos.y = heightFn(this.pos.x, this.pos.z) + 0.85;

    if (Math.abs(this.speed) > 0.8) {
      this.bus.emit('PLAYER_MOVE', { pos: this.pos.clone(), speed: this.speed });
    }
  }

  /** Current speed in km/h (always positive) */
  get speedKmh()  { return Math.abs(this.speed) * 3.6; }
  /** Meters moved since last frame */
  get distDelta() { return this.pos.distanceTo(this._prevPos); }
};


/* ════════════════════════════════════════════════════════════
   LOGIC — StormSystem
   Tornado movement engine:
     • Sinusoidal wandering path with slow drift velocity
     • Bounces off world bounds (±95 m)
     • Smooth intensity oscillation (simulates surge cycles)
     • Emits STORM_UPDATE every tick for other systems to consume
   ════════════════════════════════════════════════════════════ */
HE.StormSystem = class {
  constructor(bus) {
    this.bus       = bus;
    this.pos       = new THREE.Vector3(0, 0, 0);
    this.vel       = new THREE.Vector2(2.8, 1.4);  // base drift (m/s)
    this.intensity = 0.1;
    this.targetInt = 0.45;
    this.phase     = 0;
    this.lifetime  = 0;
  }

  /** @param {number} dt — frame delta-time (seconds) */
  update(dt) {
    this.lifetime += dt;
    this.phase    += dt;

    // Sinusoidal wandering overlaid on base drift
    const wX = Math.sin(this.phase * 0.27) * 0.9
              + Math.cos(this.phase * 0.11) * 0.4;
    const wZ = Math.cos(this.phase * 0.20) * 0.7
              + Math.sin(this.phase * 0.09) * 0.35;

    this.pos.x += (this.vel.x + wX) * dt;
    this.pos.z += (this.vel.y + wZ) * dt;

    // Boundary bounce
    const B = 95;
    if (Math.abs(this.pos.x) > B) {
      this.vel.x  *= -1;
      this.pos.x   = Math.sign(this.pos.x) * B;
    }
    if (Math.abs(this.pos.z) > B) {
      this.vel.y  *= -1;
      this.pos.z   = Math.sign(this.pos.z) * B;
    }

    // Intensity surge oscillation
    this.targetInt = 0.15 + 0.7
      * (0.5 + 0.5 * Math.sin(this.lifetime * 0.13 + 1.0));
    this.intensity += (this.targetInt - this.intensity) * dt * 0.35;

    this.bus.emit('STORM_UPDATE', {
      pos:       this.pos,
      intensity: this.intensity
    });
  }
};

/* ── Namespace seal — prevent accidental overwrite ── */
Object.freeze(Object.keys(HE)); // keys frozen, values still mutable for init
