import { CELEBRATION_LETTER } from '../data/content';

interface PetalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;
  swayPhase: number;
  swaySpeed: number;
  color: string;
  highlight: string;
  alpha: number;
  life: number;
  maxLife: number;
}

/**
 * Celebratory rose & peony petal shower overlay triggered by the Mother's Day CTA button.
 * Respects prefers-reduced-motion gracefully.
 */
export class PetalCelebrationOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: PetalParticle[] = [];
  private rafId: number | null = null;
  private lastTime = 0;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'celebration-petals-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public launchShower(reducedMotion: boolean): void {
    if (reducedMotion) return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const palettes = [
      ['#f2b5c6', '#fde5ec'],
      ['#f7ccd6', '#fff2f5'],
      ['#e598ae', '#f8d5df'],
      ['#f9dfd6', '#fff7f2'],
      ['#eed4c9', '#fffaf5'],
    ];

    // Spawn 95 lush rose & peony petals cascading from upper sky + gentle upward fountain
    for (let i = 0; i < 95; i++) {
      const pair = palettes[i % palettes.length];
      const fromBurst = i < 32;
      this.particles.push({
        x: fromBurst ? w * 0.5 + (Math.random() - 0.5) * 160 : Math.random() * w,
        y: fromBurst ? h * 0.68 + (Math.random() - 0.5) * 40 : -30 - Math.random() * h * 0.45,
        vx: fromBurst ? (Math.random() - 0.5) * 320 : (Math.random() - 0.5) * 55,
        vy: fromBurst ? -260 - Math.random() * 240 : 65 + Math.random() * 115,
        size: 10 + Math.random() * 15,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 3.4,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.8 + Math.random() * 2.2,
        color: pair[0],
        highlight: pair[1],
        alpha: 0.92,
        life: 0,
        maxLife: 4.2 + Math.random() * 2.6,
      });
    }

    if (this.rafId === null) {
      this.lastTime = performance.now();
      this.tick(this.lastTime);
    }
  }

  /** Spawns a delicate localized burst of rose & peony petals at a click/tap coordinate */
  public launchMiniBurst(clientX: number, clientY: number, reducedMotion: boolean): void {
    if (reducedMotion) return;

    const palettes = [
      ['#f2b5c6', '#fde5ec'],
      ['#f7ccd6', '#fff2f5'],
      ['#e598ae', '#f8d5df'],
      ['#f9dfd6', '#fff7f2'],
    ];

    for (let i = 0; i < 16; i++) {
      const pair = palettes[i % palettes.length];
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 75 + Math.random() * 145;
      this.particles.push({
        x: clientX + (Math.random() - 0.5) * 14,
        y: clientY + (Math.random() - 0.5) * 14,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 95,
        size: 7 + Math.random() * 9,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 4.2,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 2.2 + Math.random() * 2.0,
        color: pair[0],
        highlight: pair[1],
        alpha: 0.92,
        life: 0,
        maxLife: 1.6 + Math.random() * 0.9,
      });
    }

    if (this.rafId === null) {
      this.lastTime = performance.now();
      this.tick(this.lastTime);
    }
  }

  private drawPetal(p: PetalParticle): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    const scaleY = 0.68 + 0.32 * Math.cos(p.swayPhase * 1.4);
    ctx.scale(1, scaleY);
    ctx.globalAlpha = p.alpha;

    const s = p.size;
    const grad = ctx.createRadialGradient(-s * 0.2, -s * 0.2, s * 0.08, 0, 0, s);
    grad.addColorStop(0, p.highlight);
    grad.addColorStop(1, p.color);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(0, s * 0.85);
    ctx.bezierCurveTo(s * 0.95, s * 0.45, s * 0.92, -s * 0.65, 0, -s * 0.85);
    ctx.bezierCurveTo(-s * 0.92, -s * 0.65, -s * 0.95, s * 0.45, 0, s * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private tick = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.clearRect(0, 0, w, h);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      p.swayPhase += p.swaySpeed * dt;
      // Air resistance & gentle gravity
      p.vy += 120 * dt;
      p.vy = Math.min(p.vy, 165);
      p.vx *= Math.exp(-1.1 * dt);
      p.x += (p.vx + Math.sin(p.swayPhase) * 42) * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;

      const fadeProgress = p.life / p.maxLife;
      p.alpha = fadeProgress > 0.72 ? Math.max(0, 1 - (fadeProgress - 0.72) / 0.28) * 0.9 : 0.9;

      if (p.life >= p.maxLife || p.y > h + 60) {
        this.particles.splice(i, 1);
      } else {
        this.drawPetal(p);
      }
    }

    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.ctx.clearRect(0, 0, w, h);
      this.rafId = null;
    }
  };
}

/**
 * Renders a high-resolution (1200x1600) downloadable PNG editorial Mother's Day card
 * dedicated to all mothers using local fonts & local botanical artwork (zero watermarks).
 */
export async function exportMothersDayCardPNG(): Promise<void> {
  await document.fonts.ready;

  const W = 1200;
  const H = 1600;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Warm alabaster editorial paper background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#fcf9f5');
  bgGrad.addColorStop(0.55, '#f9f3ec');
  bgGrad.addColorStop(1, '#f4ebe3');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Draw top botanical artwork arch softly blended into ivory paper
  try {
    const img = await loadImage('./images/horseshoe-floral-arch.jpg');
    ctx.save();
    const imgH = 680;
    const scale = Math.max(W / img.width, imgH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    ctx.drawImage(img, (W - drawW) / 2, 0, drawW, drawH);

    // Seamless sunlit fade into lower paper area
    const maskGrad = ctx.createLinearGradient(0, 380, 0, 720);
    maskGrad.addColorStop(0, 'rgba(250, 246, 240, 0)');
    maskGrad.addColorStop(0.65, 'rgba(250, 246, 240, 0.82)');
    maskGrad.addColorStop(1, 'rgba(249, 243, 236, 1)');
    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 360, W, 380);
    ctx.restore();
  } catch {
    // Graceful fallback if image fails to load
  }

  // Delicate editorial inner frame
  ctx.strokeStyle = 'rgba(40, 58, 46, 0.22)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(56, 56, W - 112, H - 112);

  // Frosted editorial letter panel
  ctx.save();
  roundRect(ctx, 118, 490, W - 236, 930, 36);
  ctx.fillStyle = 'rgba(255, 253, 250, 0.88)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Eyebrow
  ctx.textAlign = 'center';
  ctx.fillStyle = '#5c7263';
  ctx.font = '500 22px "Manrope", sans-serif';
  ctx.fillText(CELEBRATION_LETTER.eyebrow.toUpperCase(), W / 2, 585);

  // Editorial Serif Display Heading
  ctx.fillStyle = '#202d25';
  ctx.font = '400 96px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(CELEBRATION_LETTER.title, W / 2, 695);

  // Delicate botanical divider
  ctx.strokeStyle = 'rgba(186, 122, 140, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 70, 738);
  ctx.lineTo(W / 2 + 70, 738);
  ctx.stroke();

  // Italic Lead
  ctx.fillStyle = '#6c4d57';
  ctx.font = 'italic 400 36px "Cormorant Garamond", Georgia, serif';
  let y = wrapText(ctx, CELEBRATION_LETTER.lead, W / 2, 804, W - 360, 48);

  // Body paragraphs
  y += 28;
  ctx.fillStyle = '#2d3b32';
  ctx.font = '400 26px "Manrope", sans-serif';
  for (const para of CELEBRATION_LETTER.paragraphs) {
    y = wrapText(ctx, para, W / 2, y, W - 360, 42);
    y += 24;
  }

  // Signature
  ctx.fillStyle = '#5d474e';
  ctx.font = 'italic 400 32px "Cormorant Garamond", Georgia, serif';
  ctx.fillText(CELEBRATION_LETTER.signature, W / 2, 1345);

  // Trigger download
  const link = document.createElement('a');
  link.download = 's-dnem-materi-otkrytka.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number
): number {
  const words = text.split(' ');
  let line = '';
  let y = startY;

  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, centerX, y);
      line = words[i];
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, centerX, y);
    y += lineHeight;
  }
  return y;
}
