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
 *   LOGIC      StormSystem       — tornado movement & intensity + weather cycle
 */

'use strict';
window.HexEngine = window.HexEngine || {};
var HE = window.HexEngine;

/* ════════════════════════════════════════════════════════════
   CORE — EventBus
   ════════════════════════════════════════════════════════════ */
HE.EventBus = class {
  constructor() { this._map = {}; }
  on(event, fn)    { (this._map[event] ||= []).push(fn); return this; }
  off(event, fn)   { this._map[event] = (this._map[event] || []).filter(f => f !== fn); }
  emit(event, data){ (this._map[event] || []).forEach(fn => fn(data)); }
};


/* ════════════════════════════════════════════════════════════
   DATA — PlayerStats
   ════════════════════════════════════════════════════════════ */
HE.PlayerStats = class {
  constructor() {
    this.speed            = 0;
    this.distanceTraveled = 0;
    this.proximity        = Infinity;
    this.score            = 0;
    this.maxSpeed         = 0;
    this.closestApproach  = Infinity;
  }

  update(dt, speedKmh, distDelta, prox) {
    this.speed            = speedKmh;
    this.maxSpeed         = Math.max(this.maxSpeed, speedKmh);
    this.distanceTraveled += Math.abs(distDelta);
    this.proximity        = prox;
    this.closestApproach  = Math.min(this.closestApproach, prox);
    if (prox > 10 && prox < 55) {
      this.score += dt * (55 - prox) * 0.7;
    }
  }
};


/* ════════════════════════════════════════════════════════════
   DATA — StormTracker
   ════════════════════════════════════════════════════════════ */
HE.StormTracker = class {
  constructor() {
    this.intensity  = 0;
    this.efScale    = 0;
    this.windSpeed  = 65;
    this.activeTime = 0;
    this.path       = [];
  }

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
   ════════════════════════════════════════════════════════════ */
HE.SessionLogger = class {
  constructor() { this.events = []; this._t0 = Date.now(); }
  log(type, data = {}) {
    const t = ((Date.now() - this._t0) / 1000).toFixed(2);
    this.events.push({ type, t, data });
    if (this.events.length > 500) this.events.shift();
  }
  summary() {
    return { count: this.events.length, duration: ((Date.now() - this._t0) / 1000).toFixed(1) + 's' };
  }
};


/* ════════════════════════════════════════════════════════════
   LOGIC — VortexMath
   ════════════════════════════════════════════════════════════ */
HE.VortexMath = class {
  constructor() {
    this.circulation = 800;
    this.coreRadius  = 8;
    this.alpha       = 0.35;
  }

  setIntensity(t) {
    this.circulation = 300  + t * 3200;
    this.coreRadius  = 4    + t * 14;
    this.alpha       = 0.20 + t * 0.40;
  }

  cylindrical(r, z) {
    r = Math.max(r, 0.01);
    const rc     = this.coreRadius;
    const vTheta = (this.circulation / (2 * Math.PI * r))
                   * (1 - Math.exp(-(r * r) / (rc * rc)));
    const vR     = -this.alpha * r;
    const vZ     = 2 * this.alpha * Math.abs(z) + 0.5;
    return { vTheta, vR, vZ };
  }

  worldWind(dx, dz) {
    const r   = Math.sqrt(dx * dx + dz * dz);
    const ang = Math.atan2(dz, dx);
    const { vTheta, vR } = this.cylindrical(r, 0);
    return {
      x: vR * Math.cos(ang) - vTheta * Math.sin(ang),
      z: vR * Math.sin(ang) + vTheta * Math.cos(ang)
    };
  }

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
   ════════════════════════════════════════════════════════════ */
HE.PhysicsEngine = class {
  constructor(bus) {
    this.bus      = bus;
    this.pos      = new THREE.Vector3(0, 1, 80);
    this.heading  = 0;
    this.speed    = 0;
    this.maxSpeed = 30;
    this.accel    = 14;
    this.brakeF   = 22;
    this.dragBase = 0.965;
    this.turnRate = 1.75;
    this.windF    = new THREE.Vector2();
    this.keys     = {};
    this._prevPos = new THREE.Vector3();
  }

  bindKeys() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      // Only prevent default for movement keys to allow E key etc.
      if (['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
  }

  applyWind(wx, wz, intensity) {
    this.windF.set(wx * intensity * 0.004, wz * intensity * 0.004);
  }

  update(dt, heightFn) {
    this._prevPos.copy(this.pos);
    const k   = this.keys;
    const fwd = k['KeyW'] || k['ArrowUp'];
    const bak = k['KeyS'] || k['ArrowDown'];
    const lft = k['KeyA'] || k['ArrowLeft'];
    const rgt = k['KeyD'] || k['ArrowRight'];

    if (fwd) {
      this.speed = Math.min(this.maxSpeed, this.speed + this.accel * dt);
    } else if (bak) {
      this.speed = Math.max(-this.maxSpeed * 0.45, this.speed - this.brakeF * dt);
    } else {
      this.speed *= Math.pow(this.dragBase, dt * 60);
    }

    if (Math.abs(this.speed) > 0.5) {
      const dir = this.speed > 0 ? 1 : -1;
      const tr  = this.turnRate * Math.min(1, Math.abs(this.speed) / 8);
      if (lft) this.heading += dir * tr * dt;
      if (rgt) this.heading -= dir * tr * dt;
    }

    const vx = Math.sin(this.heading) * this.speed;
    const vz = Math.cos(this.heading) * this.speed;
    this.pos.x += (vx + this.windF.x) * dt;
    this.pos.z += (vz + this.windF.y) * dt;

    const B = 130;
    this.pos.x = Math.max(-B, Math.min(B, this.pos.x));
    this.pos.z = Math.max(-B, Math.min(B, this.pos.z));
    this.pos.y = heightFn(this.pos.x, this.pos.z) + 0.85;

    if (Math.abs(this.speed) > 0.8) {
      this.bus.emit('PLAYER_MOVE', { pos: this.pos.clone(), speed: this.speed });
    }
  }

  get speedKmh()  { return Math.abs(this.speed) * 3.6; }
  get distDelta() { return this.pos.distanceTo(this._prevPos); }
};


/* ════════════════════════════════════════════════════════════
   LOGIC — StormSystem
   Weather cycle:  clear → forming → active → dissipating → clear
   Exposed state:  .state  .tornVisible  .intensity
   ════════════════════════════════════════════════════════════ */
HE.StormSystem = class {
  constructor(bus) {
    this.bus          = bus;
    this.pos          = new THREE.Vector3(0, 0, 0);
    this.vel          = new THREE.Vector2(2.8, 1.4);
    this.intensity    = 0;
    this.targetInt    = 0;
    this.phase        = 0;
    this.lifetime     = 0;

    // ── Weather cycle state machine ──────────────────────────
    // States: 'clear' | 'forming' | 'active' | 'dissipating'
    this.state        = 'clear';
    this.stateTimer   = 20 + Math.random() * 25;  // 20-45s until first storm
    this.tornVisible  = false;
    this._formDur     = 25;   // how long forming phase lasts
  }

  /** @param {number} dt — frame delta-time (seconds) */
  update(dt) {
    this.lifetime  += dt;
    this.stateTimer -= dt;

    /* ── State transitions ── */
    switch (this.state) {

      case 'clear':
        // Fade intensity to zero
        this.intensity   = Math.max(0, this.intensity - dt * 1.2);
        this.tornVisible = false;
        if (this.stateTimer <= 0) {
          this._enterForming();
        }
        break;

      case 'forming':
        // Gradually ramp intensity from 0 → 0.5 over formDur seconds
        this.tornVisible = true;
        {
          const progress = Math.max(0, 1 - this.stateTimer / this._formDur);
          this.targetInt  = progress * 0.55;
          this.intensity += (this.targetInt - this.intensity) * dt * 0.8;
        }
        if (this.stateTimer <= 0) {
          this.state      = 'active';
          this.stateTimer = 40 + Math.random() * 90;  // 40-130s active
        }
        break;

      case 'active':
        // Normal surge oscillation
        this.tornVisible = true;
        this.targetInt = 0.20 + 0.72
          * (0.5 + 0.5 * Math.sin(this.lifetime * 0.13 + 1.0));
        this.intensity += (this.targetInt - this.intensity) * dt * 0.35;
        if (this.stateTimer <= 0) {
          this.state      = 'dissipating';
          this.stateTimer = 12 + Math.random() * 12;  // 12-24s fadeout
        }
        break;

      case 'dissipating':
        // Fade out
        this.tornVisible = this.intensity > 0.04;
        this.intensity   = Math.max(0, this.intensity - dt * 0.055);
        if (this.stateTimer <= 0 || this.intensity <= 0.005) {
          this.state       = 'clear';
          this.stateTimer  = 30 + Math.random() * 50;  // 30-80s calm
          this.intensity   = 0;
          this.tornVisible = false;
          // Reposition for next storm so it spawns from a fresh direction
          this.pos.set(
            (Math.random() - 0.5) * 80,
            0,
            (Math.random() - 0.5) * 80
          );
        }
        break;
    }

    /* ── Tornado movement — only when storm is present ── */
    if (this.state === 'clear') {
      this.bus.emit('STORM_UPDATE', {
        pos: this.pos, intensity: 0, visible: false
      });
      return;
    }

    this.phase += dt;
    const wX = Math.sin(this.phase * 0.27) * 0.9
              + Math.cos(this.phase * 0.11) * 0.4;
    const wZ = Math.cos(this.phase * 0.20) * 0.7
              + Math.sin(this.phase * 0.09) * 0.35;

    this.pos.x += (this.vel.x + wX) * dt;
    this.pos.z += (this.vel.y + wZ) * dt;

    const B = 95;
    if (Math.abs(this.pos.x) > B) { this.vel.x *= -1; this.pos.x = Math.sign(this.pos.x) * B; }
    if (Math.abs(this.pos.z) > B) { this.vel.y *= -1; this.pos.z = Math.sign(this.pos.z) * B; }

    this.bus.emit('STORM_UPDATE', {
      pos:        this.pos,
      intensity:  this.intensity,
      visible:    this.tornVisible,
      state:      this.state
    });
  }

  _enterForming() {
    this.state      = 'forming';
    this._formDur   = 20 + Math.random() * 15;  // 20-35s build-up
    this.stateTimer = this._formDur;
    this.intensity  = 0;
    this.tornVisible = true;
  }
};

/* ── Namespace seal ── */
Object.freeze(Object.keys(HE));
