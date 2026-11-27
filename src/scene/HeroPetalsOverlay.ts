interface HeroPetal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  depth: number;
  rot: number;
  vrot: number;
  phase: number;
  color: string;
  edge: string;
}

/**
 * Lightweight sunlit drifting rose/peony petals layered subtly above the Hero video
 * to heighten volumetric 3D floral grove depth and pointer parallax.
 */
export class HeroPetalsOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private petals: HeroPetal[] = [];
  private rafId: number | null = null;
  private lastTime = 0;
  private reducedMotion = false;
  private isVisible = true;
  private pointerX = 0;
  private pointerY = 0;
  private smoothPX = 0;
  private smoothPY = 0;
  private resizeObserver: ResizeObserver;
  private io: IntersectionObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hero-petals-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;

    this.resize();
    this.seedPetals();

    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.container);

    this.io = new IntersectionObserver((entries) => {
      this.isVisible = Boolean(entries[0]?.isIntersecting);
      if (this.isVisible && !this.reducedMotion && this.rafId === null) {
        this.lastTime = performance.now();
        this.loop(this.lastTime);
      }
    });
    this.io.observe(this.container);

    if (!this.reducedMotion) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  private onPointerMove = (e: PointerEvent): void => {
    const nx = (e.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
    const ny = (e.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
    this.pointerX = nx;
    this.pointerY = ny;
  };

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 320);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private seedPetals(): void {
    const w = Math.max(this.container.clientWidth, 320);
    const h = Math.max(this.container.clientHeight, 320);
    const colors = [
      ['rgba(252, 224, 232, 0.78)', 'rgba(241, 184, 200, 0.58)'],
      ['rgba(255, 244, 238, 0.80)', 'rgba(246, 206, 212, 0.54)'],
      ['rgba(247, 198, 212, 0.72)', 'rgba(232, 162, 182, 0.52)'],
    ];
    this.petals = [];
    const count = w < 640 ? 12 : 20;
    for (let i = 0; i < count; i++) {
      const depth = 0.4 + Math.random() * 0.9;
      const pair = colors[i % colors.length];
      this.petals.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (10 + Math.random() * 18) * depth,
        vy: (12 + Math.random() * 20) * depth,
        size: (7 + Math.random() * 9) * depth,
        depth,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 1.1,
        phase: Math.random() * Math.PI * 2,
        color: pair[0],
        edge: pair[1],
      });
    }
  }

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (enabled) {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.ctx.clearRect(0, 0, this.container.clientWidth, this.container.clientHeight);
    } else if (this.isVisible && this.rafId === null) {
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  private loop = (now: number): void => {
    if (this.reducedMotion || !this.isVisible) {
      this.rafId = null;
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.ctx.clearRect(0, 0, w, h);

    this.smoothPX += (this.pointerX - this.smoothPX) * Math.min(1, dt * 4);
    this.smoothPY += (this.pointerY - this.smoothPY) * Math.min(1, dt * 4);

    for (const p of this.petals) {
      p.phase += dt * 1.35;
      p.x += (p.vx + Math.sin(p.phase) * 14) * dt;
      p.y += (p.vy + Math.cos(p.phase * 0.8) * 6) * dt;
      p.rot += p.vrot * dt;

      if (p.x > w + 40) p.x = -40;
      if (p.y > h + 40) p.y = -40;

      const drawX = p.x - this.smoothPX * 16 * p.depth;
      const drawY = p.y - this.smoothPY * 12 * p.depth;

      const ctx = this.ctx;
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(p.rot);
      ctx.scale(1, 0.72 + 0.28 * Math.sin(p.phase * 1.2));

      const s = p.size;
      const grad = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 1, 0, 0, s);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, p.edge);
      ctx.fillStyle = grad;

      ctx.beginPath();
      ctx.moveTo(0, s * 0.85);
      ctx.bezierCurveTo(s * 0.9, s * 0.4, s * 0.9, -s * 0.65, 0, -s * 0.85);
      ctx.bezierCurveTo(-s * 0.9, -s * 0.65, -s * 0.9, s * 0.4, 0, s * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.resizeObserver.disconnect();
    this.io.disconnect();
    this.canvas.remove();
  }
}
