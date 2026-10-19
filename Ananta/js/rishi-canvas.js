/**
 * Ananta Rishi Quantum Animation Engine
 * Creates a living, breathing, interactive quantum energy field over the Maharshi Kanada artwork.
 * Features:
 * - Hand levitation & meditative breathing kinematics
 * - 3D Gyroscopic Quantum Parmanu atom (Bloch orbitals) floating between hands
 * - Entangled electric-cyan energy arc weaving between mudras
 * - Interactive cursor magnetism & plasma sparks
 * - Floating Dirac math equations and Sanskrit quanta drifting into the cosmos
 * - Luminous head halo pulsation
 */

class RishiQuantumCanvas {
  constructor(canvasId, containerId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.container = document.getElementById(containerId) || this.canvas.parentElement;
    this.ctx = this.canvas.getContext('2d');

    this.width = 0;
    this.height = 0;
    this.time = 0;
    this.animId = null;

    // Mouse tracking
    this.mouse = { x: -1000, y: -1000, isHovering: false };

    // Math particles
    this.mathSymbols = ['|ψ⟩', 'α|0⟩+β|1⟩', 'H|0⟩=|+⟩', 'E=ℏω', 'Tr(ρ)=1', 'परमाणु', 'अनन्त', '⟨ψ|ψ⟩=1', 'e^iπ+1=0'];
    this.particles = [];
    this.sparks = [];

    this.initSize();
    this.initParticles();
    this.bindEvents();
    // Do not start loop automatically; started only when login tab is shown
  }

  initSize() {
    const rect = this.container.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width || 540;
    this.height = rect.height || 600;

    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.scale(dpr, dpr);
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 24; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vy: -0.3 - Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        text: this.mathSymbols[Math.floor(Math.random() * this.mathSymbols.length)],
        opacity: Math.random() * 0.6 + 0.2,
        scale: Math.random() * 0.35 + 0.7,
        hue: Math.random() > 0.4 ? '#00f0ff' : '#fbbf24',
        drift: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => this.initSize());

    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.isHovering = true;

      // 3D Parallax tilt
      const normX = (this.mouse.x / this.width - 0.5);
      const normY = (this.mouse.y / this.height - 0.5);
      this.container.style.transform = `perspective(1000px) rotateY(${normX * 4}deg) rotateX(${-normY * 4}deg)`;
    });

    this.container.addEventListener('mouseleave', () => {
      this.mouse.isHovering = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
      this.container.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    });

    // Click triggers quantum burst
    this.container.addEventListener('click', (e) => {
      const rect = this.container.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.spawnBurst(clickX, clickY);
    });
  }

  spawnBurst(x, y) {
    for (let i = 0; i < 28; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3.5 + 1.2;
      this.sparks.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: Math.random() * 0.03 + 0.015,
        color: Math.random() > 0.5 ? '#00f0ff' : '#fbbf24',
        size: Math.random() * 2.5 + 1.5
      });
    }
  }

  start() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.running = true;
    const loop = (ts) => {
      if (!this.running) return;
      this.time = ts * 0.001;
      this.render();
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    const W = this.width;
    const H = this.height;

    // Meditative slow breathing cycle (4.2 seconds period)
    const breath = Math.sin(this.time * 1.5);

    // Anatomical anchor positions on the artwork
    const headX = W * 0.50;
    const headY = H * 0.36 + breath * 2;

    // Left hand (viewer's left / Rishi's right hand resting on knee)
    const leftHandX = W * 0.275 + (this.mouse.isHovering ? (this.mouse.x - W * 0.275) * 0.04 : 0);
    const leftHandY = H * 0.725 + Math.sin(this.time * 1.8) * 4.5 + breath * 3;

    // Right hand (viewer's right / Rishi's left hand resting on knee)
    const rightHandX = W * 0.725 + (this.mouse.isHovering ? (this.mouse.x - W * 0.725) * 0.04 : 0);
    const rightHandY = H * 0.725 + Math.sin(this.time * 1.8 + 0.8) * 4.5 + breath * 3;

    // Center Levitating Parmanu Orb (floating above crossed lap)
    const orbX = W * 0.50;
    const orbY = H * 0.67 + breath * 9;

    // 1. Render Golden Halo Pulse behind head
    this.renderHalo(headX, headY, breath);

    // 2. Render Floating Dirac Math Equations and Sanskrit Quanta
    this.renderFloatingMath();

    // 3. Render Luminous Mudra Hand Energy Rings
    this.renderMudraAura(leftHandX, leftHandY, '#fbbf24');
    this.renderMudraAura(rightHandX, rightHandY, '#00f0ff');

    // 4. Render Entangled Quantum Wave connecting Hands through Orb
    this.renderQuantumBridge(leftHandX, leftHandY, orbX, orbY, rightHandX, rightHandY);

    // 5. Render 3D Gyroscopic Quantum Parmanu Orb (Bloch Sphere Atom)
    this.renderParmanuAtom(orbX, orbY, breath);

    // 6. Render Cursor Magnetic Plasma Arc if hovering
    if (this.mouse.isHovering) {
      this.renderCursorAttractor(leftHandX, leftHandY, rightHandX, rightHandY, orbX, orbY);
    }

    // 7. Update and draw Sparks
    this.renderSparks();
  }

  renderHalo(x, y, breath) {
    const ctx = this.ctx;
    ctx.save();
    const haloRadius = (this.width * 0.22) + (breath * 6);
    const grad = ctx.createRadialGradient(x, y, haloRadius * 0.2, x, y, haloRadius);
    grad.addColorStop(0, 'rgba(251, 191, 36, 0.22)');
    grad.addColorStop(0.5, 'rgba(251, 191, 36, 0.08)');
    grad.addColorStop(1, 'rgba(251, 191, 36, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, haloRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderMudraAura(x, y, color) {
    const ctx = this.ctx;
    ctx.save();

    for (let r = 0; r < 3; r++) {
      const phase = (this.time * 0.8 + r * 0.33) % 1;
      const radius = 6 + phase * 32;
      const alpha = (1 - phase) * 0.55;

      ctx.strokeStyle = color === '#fbbf24' ? `rgba(251, 191, 36, ${alpha})` : `rgba(0, 240, 255, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 16);
    glow.addColorStop(0, color);
    glow.addColorStop(0.4, color === '#fbbf24' ? 'rgba(251, 191, 36, 0.4)' : 'rgba(0, 240, 255, 0.4)');
    glow.addColorStop(1, 'transparent');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderParmanuAtom(x, y, breath) {
    const ctx = this.ctx;
    ctx.save();

    const baseRadius = 38 + breath * 3;

    // Glowing core nucleus (Parmanu essence)
    const nucGlow = ctx.createRadialGradient(x, y, 0, x, y, 22);
    nucGlow.addColorStop(0, '#ffffff');
    nucGlow.addColorStop(0.3, '#fbbf24');
    nucGlow.addColorStop(0.7, 'rgba(0, 240, 255, 0.3)');
    nucGlow.addColorStop(1, 'transparent');

    ctx.fillStyle = nucGlow;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 4 Gyroscopic 3D Orbital Rings (Euler rotating ellipses)
    const orbitals = [
      { angle: this.time * 1.2, tilt: 0.65, color: '#00f0ff', electronPos: this.time * 2.2 },
      { angle: -this.time * 0.9 + 1.2, tilt: -0.65, color: '#fbbf24', electronPos: this.time * 2.6 + 1 },
      { angle: this.time * 0.7 + 2.4, tilt: 0.25, color: '#a78bfa', electronPos: this.time * 1.8 + 2 },
      { angle: -this.time * 1.1 + 3.6, tilt: 0.85, color: '#34d399', electronPos: this.time * 2.4 + 3 }
    ];

    orbitals.forEach((orb) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(orb.angle);
      ctx.scale(1, orb.tilt);

      ctx.strokeStyle = orb.color;
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.65;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.stroke();

      const eAngle = orb.electronPos;
      const ex = Math.cos(eAngle) * baseRadius;
      const ey = Math.sin(eAngle) * baseRadius;

      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = orb.color;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(ex, ey, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    ctx.restore();
  }

  renderQuantumBridge(x1, y1, ox, oy, x2, y2) {
    const ctx = this.ctx;
    ctx.save();

    this.drawCurvedEnergyBeam(x1, y1, ox, oy, '#00f0ff', 0);
    this.drawCurvedEnergyBeam(ox, oy, x2, y2, '#fbbf24', Math.PI);

    const sparkCount = 4;
    for (let i = 0; i < sparkCount; i++) {
      const progress = ((this.time * 0.7 + i * 0.25) % 1);
      let px, py;
      if (progress < 0.5) {
        const t = progress * 2;
        px = this.lerp(x1, ox, t) + Math.sin(t * Math.PI + this.time * 6) * 12;
        py = this.lerp(y1, oy, t) - Math.sin(t * Math.PI) * 20;
      } else {
        const t = (progress - 0.5) * 2;
        px = this.lerp(ox, x2, t) + Math.sin(t * Math.PI + this.time * 6) * 12;
        py = this.lerp(oy, y2, t) - Math.sin(t * Math.PI) * 20;
      }

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawCurvedEnergyBeam(x1, y1, x2, y2, color, phaseOffset) {
    const ctx = this.ctx;
    const steps = 30;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = this.lerp(x1, x2, t);
      const by = this.lerp(y1, y2, t);

      const arc = -Math.sin(t * Math.PI) * 26;
      const wave = Math.sin(t * Math.PI * 5 + this.time * 5 + phaseOffset) * 5;

      const px = bx;
      const py = by + arc + wave;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
  }

  renderCursorAttractor(lx, ly, rx, ry, ox, oy) {
    const ctx = this.ctx;
    ctx.save();
    const mx = this.mouse.x;
    const my = this.mouse.y;

    const distLeft = Math.hypot(mx - lx, my - ly);
    const distRight = Math.hypot(mx - rx, my - ry);
    const hx = distLeft < distRight ? lx : rx;
    const hy = distLeft < distRight ? ly : ry;
    const color = distLeft < distRight ? '#fbbf24' : '#00f0ff';

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.globalAlpha = 0.8;

    ctx.beginPath();
    ctx.moveTo(hx, hy);
    const segs = 14;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const jx = this.lerp(hx, mx, t) + (Math.random() - 0.5) * 16;
      const jy = this.lerp(hy, my, t) + (Math.random() - 0.5) * 16;
      ctx.lineTo(jx, jy);
    }
    ctx.lineTo(mx, my);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderFloatingMath() {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '11.5px "Roboto Mono", monospace';

    this.particles.forEach((p) => {
      p.y += p.vy;
      p.x += p.vx + Math.sin(this.time + p.drift) * 0.3;

      if (p.y < 40) {
        p.y = this.height - 40;
        p.x = Math.random() * this.width;
      }

      ctx.fillStyle = p.hue;
      ctx.globalAlpha = p.opacity * (1 - (this.height - p.y) / this.height * 0.3);
      ctx.fillText(p.text, p.x, p.y);
    });

    ctx.restore();
  }

  renderSparks() {
    const ctx = this.ctx;
    ctx.save();
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= s.decay;

      if (s.life <= 0) {
        this.sparks.splice(i, 1);
        continue;
      }

      ctx.fillStyle = s.color;
      ctx.globalAlpha = s.life;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

window.RishiQuantumCanvas = RishiQuantumCanvas;
