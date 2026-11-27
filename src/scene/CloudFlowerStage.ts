import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface CloudStageCallbacks {
  onAngleChange?: (yawDeg: number, pitchDeg: number, facetIndex: number) => void;
  onModelLoaded?: () => void;
  onInteractionStateChange?: (isDragging: boolean) => void;
  onFlowerTap?: (clientX: number, clientY: number) => void;
}

interface AnimatedLeaf {
  node: THREE.Object3D;
  baseRot: THREE.Euler;
  phase: number;
  speed: number;
  ampX: number;
  ampZ: number;
}

interface CloudSprite {
  sprite: THREE.Sprite;
  baseX: number;
  baseY: number;
  baseZ: number;
  driftSpeed: number;
  driftAmp: number;
  phase: number;
}

interface FloatingPetal {
  mesh: THREE.Mesh;
  radius: number;
  angle: number;
  speed: number;
  baseY: number;
  bobAmp: number;
  phase: number;
  rotSpeedX: number;
  rotSpeedY: number;
}

/**
 * Interactive Three.js Cloud Scene featuring a realistically shaded 3D Garden Peony-Rose (GLB),
 * local Draco & Meshopt decoders, independently animated leaves, layered drifting clouds,
 * pointer drag rotation with inertia, and smooth keyboard arrow controls.
 */
export class CloudFlowerStage {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private flowerPivot: THREE.Group;
  private flowerModel: THREE.Object3D | null = null;
  private leaves: AnimatedLeaf[] = [];
  private clouds: CloudSprite[] = [];
  private petals: FloatingPetal[] = [];
  private pollenPoints: THREE.Points | null = null;

  private callbacks: CloudStageCallbacks;
  private reducedMotion = false;
  private isVisible = true;
  private rafId: number | null = null;
  private lastTime = 0;
  private elapsed = 0;

  // Interactive rotation state (smooth inertial target + current)
  private targetYaw = 0.28;
  private targetPitch = 0.42;
  private currentYaw = 0.28;
  private currentPitch = 0.42;
  private angularVelocityY = 0;
  private scrollReveal = 0; // 0..1 driven by bright dissolve transition

  // Pointer drag state
  private isPointerDown = false;
  private activePointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragLockedAxis: 'none' | 'rotate' | 'scroll' = 'none';

  // Keyboard arrow continuous hold state
  private pressedKeys = new Set<string>();
  private lastReportedFacet = -1;
  private lastReportedDeg = -999;

  private resizeObserver: ResizeObserver;
  private intersectionObserver: IntersectionObserver;

  constructor(container: HTMLElement, callbacks: CloudStageCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Renderer configured for realistic daylight floral shading
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.domElement.className = 'cloud-stage-canvas';
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.container.appendChild(this.renderer.domElement);

    // Scene & subtle pastel cloud atmospheric fog
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xf5f1f2, 0.022);

    // Camera (generous framing so top petals never clip when rotating or tilting)
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 320);
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 60);
    this.camera.position.set(0, 0.32, 5.95);
    this.camera.lookAt(0, -0.06, 0);

    // Procedural Studio PMREM Environment for soft velvet petal reflections & realistic shading
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;
    this.scene.environment = envTex;
    this.scene.environmentIntensity = 0.52;
    pmrem.dispose();

    // Multi-point botanical daylight lighting
    this.setupLighting();

    // Flower pivot (slightly lowered so upper peony crown always has generous headroom)
    this.flowerPivot = new THREE.Group();
    this.flowerPivot.position.set(0, -0.08, 0);
    this.scene.add(this.flowerPivot);

    // Volumetric soft cloud layers + drifting 3D petals + sunlit pollen
    this.buildCloudLayers();
    this.buildFloatingPetals();
    this.buildPollenParticles();

    // Load local Draco-compressed GLB model
    void this.loadFlowerGLB();

    // Pointer & Resize & Visibility listeners
    this.bindEvents();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.isVisible = Boolean(entry?.isIntersecting);
        if (this.isVisible && this.rafId === null) {
          this.lastTime = performance.now();
          this.loop(this.lastTime);
        }
      },
      { rootMargin: '140px 0px' }
    );
    this.intersectionObserver.observe(this.container);

    this.handleResize();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private setupLighting(): void {
    // Balanced cloud-sky hemisphere fill (preserves deep sculptural folds between petals)
    const hemi = new THREE.HemisphereLight(0xeef5ff, 0xdfc2bc, 0.65);
    this.scene.add(hemi);

    // Warm sunlit key light from upper-left front for crisp botanical dimensionality
    const keyLight = new THREE.DirectionalLight(0xfff4e4, 2.05);
    keyLight.position.set(3.4, 5.2, 4.0);
    this.scene.add(keyLight);

    // Translucent blush rim light from behind (simulates sunlit subsurface petal glow)
    const rimLight = new THREE.DirectionalLight(0xffbfd1, 1.35);
    rimLight.position.set(-3.4, 2.6, -3.5);
    this.scene.add(rimLight);

    // Soft cool sky side fill for editorial tonal separation
    const fillLight = new THREE.DirectionalLight(0xd4e6ff, 0.52);
    fillLight.position.set(-3.8, -0.6, 2.5);
    this.scene.add(fillLight);

    // Warm golden glow near the peony stamen heart
    const heartGlow = new THREE.PointLight(0xffd48f, 0.75, 5.5, 2);
    heartGlow.position.set(0.25, 1.15, 1.35);
    this.scene.add(heartGlow);
  }

  private createCloudTexture(): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Layered multi-puff soft watercolor cumulus cloud
    const puffs = [
      { x: 0.50, y: 0.52, r: 0.38, a: 0.52 },
      { x: 0.34, y: 0.56, r: 0.28, a: 0.42 },
      { x: 0.67, y: 0.55, r: 0.29, a: 0.42 },
      { x: 0.44, y: 0.40, r: 0.26, a: 0.36 },
      { x: 0.59, y: 0.42, r: 0.24, a: 0.34 },
    ];

    for (const p of puffs) {
      const gx = p.x * size;
      const gy = p.y * size;
      const gr = p.r * size;
      const grad = ctx.createRadialGradient(gx, gy, gr * 0.05, gx, gy, gr);
      grad.addColorStop(0, `rgba(255, 253, 250, ${p.a})`);
      grad.addColorStop(0.5, `rgba(252, 246, 244, ${p.a * 0.52})`);
      grad.addColorStop(1, 'rgba(250, 244, 242, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildCloudLayers(): void {
    const cloudTex = this.createCloudTexture();
    const specs = [
      // Distant soft clouds framing the sunlit sky behind the peony
      { x: -3.2, y: 1.4, z: -5.4, sx: 6.4, sy: 3.6, op: 0.72, speed: 0.14, amp: 0.45 },
      { x: 3.1, y: 1.2, z: -5.8, sx: 6.8, sy: 3.8, op: 0.68, speed: 0.11, amp: 0.52 },
      { x: 0.2, y: -1.8, z: -3.8, sx: 8.6, sy: 4.1, op: 0.78, speed: 0.13, amp: 0.38 },
      { x: -4.0, y: -1.2, z: -2.4, sx: 5.5, sy: 3.0, op: 0.58, speed: 0.18, amp: 0.48 },
      { x: 4.2, y: -1.3, z: -2.6, sx: 5.8, sy: 3.2, op: 0.55, speed: 0.16, amp: 0.44 },
      // Subtle foreground wispy cloud veils framing the lower corners (never blocking the leaves)
      { x: -3.6, y: -2.25, z: 0.8, sx: 4.4, sy: 2.0, op: 0.28, speed: 0.22, amp: 0.35 },
      { x: 3.7, y: -2.3, z: 0.8, sx: 4.6, sy: 2.1, op: 0.26, speed: 0.20, amp: 0.32 },
      { x: 0.0, y: 2.25, z: -4.2, sx: 7.4, sy: 3.2, op: 0.48, speed: 0.10, amp: 0.40 },
    ];

    specs.forEach((s, idx) => {
      const mat = new THREE.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        opacity: s.op,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(s.x, s.y, s.z);
      sprite.scale.set(s.sx, s.sy, 1);
      this.scene.add(sprite);
      this.clouds.push({
        sprite,
        baseX: s.x,
        baseY: s.y,
        baseZ: s.z,
        driftSpeed: s.speed,
        driftAmp: s.amp,
        phase: idx * 1.17,
      });
    });
  }

  private buildFloatingPetals(): void {
    // Sculpted single lightweight petal geometry orbiting gently in the cloud breeze
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.09, 0.06, 0.13, 0.18, 0.05, 0.26);
    shape.bezierCurveTo(0.02, 0.29, -0.02, 0.29, -0.05, 0.26);
    shape.bezierCurveTo(-0.13, 0.18, -0.09, 0.06, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 8);
    // Add slight cup curvature to floating petals
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin((y / 0.28) * Math.PI) * 0.035 - x * x * 1.2);
    }
    geom.computeVertexNormals();

    const colors = [0xf8c8d4, 0xfde6e8, 0xf2b5c6, 0xfff3ee];
    for (let i = 0; i < 16; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colors[i % colors.length],
        roughness: 0.45,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.88,
      });
      const mesh = new THREE.Mesh(geom, mat);
      const scale = 0.55 + (i % 4) * 0.2;
      mesh.scale.setScalar(scale);
      const radius = 1.9 + (i % 5) * 0.42;
      const angle = (i / 16) * Math.PI * 2;
      const baseY = -1.15 + ((i * 0.37) % 2.4);
      mesh.position.set(Math.cos(angle) * radius, baseY, Math.sin(angle) * radius * 0.72);
      mesh.rotation.set(i * 0.7, i * 1.1, i * 0.4);
      this.scene.add(mesh);

      this.petals.push({
        mesh,
        radius,
        angle,
        speed: 0.07 + (i % 3) * 0.025,
        baseY,
        bobAmp: 0.18 + (i % 4) * 0.06,
        phase: i * 0.85,
        rotSpeedX: 0.35 + (i % 3) * 0.16,
        rotSpeedY: 0.48 + (i % 4) * 0.14,
      });
    }
  }

  private buildPollenParticles(): void {
    const count = 80;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5.2;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 244, 212, 0.95)');
    grad.addColorStop(0.45, 'rgba(255, 232, 200, 0.45)');
    grad.addColorStop(1, 'rgba(255, 232, 200, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    const mat = new THREE.PointsMaterial({
      size: 0.075,
      map: new THREE.CanvasTexture(canvas),
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.pollenPoints = new THREE.Points(geom, mat);
    this.scene.add(this.pollenPoints);
  }

  private async loadFlowerGLB(): Promise<void> {
    const loader = new GLTFLoader();

    // Configure local Draco decoder from /decoders/draco/
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('./decoders/draco/');
    dracoLoader.preload();
    loader.setDRACOLoader(dracoLoader);

    // Also attach local Meshopt decoder from /decoders/meshopt_decoder.module.js
    try {
      const meshoptUrl = new URL('./decoders/meshopt_decoder.module.js', window.location.href).href;
      const meshoptMod = await import(/* @vite-ignore */ meshoptUrl);
      if (meshoptMod?.MeshoptDecoder) {
        loader.setMeshoptDecoder(meshoptMod.MeshoptDecoder);
      }
    } catch {
      // Optional meshopt decoder fallback — Draco is primary for peony-rose.glb
    }

    loader.load(
      './models/peony-rose.glb',
      (gltf) => {
        const model = gltf.scene;

        // Enhance PBR petal & foliage shading for velvety daylight translucency
        model.traverse((obj) => {
          if (obj.name.startsWith('Leaf_')) {
            const idx = Number.parseInt(obj.name.replace('Leaf_', ''), 10) || 0;
            this.leaves.push({
              node: obj,
              baseRot: obj.rotation.clone(),
              phase: idx * 1.15,
              speed: 1.25 + (idx % 3) * 0.22,
              ampX: 0.055 + (idx % 2) * 0.02,
              ampZ: 0.042 + (idx % 3) * 0.015,
            });
          }

          if (obj instanceof THREE.Mesh) {
            const mat = obj.material;
            if (mat instanceof THREE.MeshPhysicalMaterial || mat instanceof THREE.MeshStandardMaterial) {
              if (mat.name === 'PeonyRosePetal') {
                mat.roughness = 0.42;
                mat.envMapIntensity = 0.72;
                if (mat instanceof THREE.MeshPhysicalMaterial) {
                  mat.sheen = 0.85;
                  mat.sheenRoughness = 0.45;
                  mat.sheenColor = new THREE.Color(0xfff1f5);
                }
              } else if (mat.name === 'BotanicalFoliage') {
                mat.roughness = 0.36;
                mat.envMapIntensity = 0.85;
              }
              mat.needsUpdate = true;
            }
          }
        });

        // Normalize bounding center with comfortable top/bottom margin
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -center.y - 0.04, -center.z);
        model.scale.setScalar(0.92);

        this.flowerModel = model;
        this.flowerPivot.add(model);
        dracoLoader.dispose();
        this.callbacks.onModelLoaded?.();
        this.emitAngleState(true);
      },
      undefined,
      (err) => {
        console.error('Failed to load local peony-rose.glb:', err);
        dracoLoader.dispose();
      }
    );
  }

  private bindEvents(): void {
    const el = this.container;

    el.addEventListener('pointerdown', (e) => {
      // Ignore clicks on HUD buttons inside container
      if ((e.target as HTMLElement).closest('button, a')) return;
      this.isPointerDown = true;
      this.activePointerId = e.pointerId;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragLockedAxis = e.pointerType === 'mouse' ? 'rotate' : 'none';
      if (e.pointerType === 'mouse') {
        el.setPointerCapture?.(e.pointerId);
        this.callbacks.onInteractionStateChange?.(true);
      }
    });

    el.addEventListener('pointermove', (e) => {
      if (!this.isPointerDown || e.pointerId !== this.activePointerId) return;

      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;

      if (this.dragLockedAxis === 'none') {
        const totalDx = Math.abs(e.clientX - this.dragStartX);
        const totalDy = Math.abs(e.clientY - this.dragStartY);
        if (totalDx > 6 || totalDy > 6) {
          // On touch screens, allow natural vertical page scroll if gesture is strongly vertical
          if (totalDy > totalDx * 1.45) {
            this.dragLockedAxis = 'scroll';
            this.isPointerDown = false;
            return;
          } else {
            this.dragLockedAxis = 'rotate';
            el.setPointerCapture?.(e.pointerId);
            this.callbacks.onInteractionStateChange?.(true);
          }
        } else {
          return;
        }
      }

      if (this.dragLockedAxis === 'rotate') {
        this.targetYaw += dx * 0.0085;
        this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + dy * 0.006, -0.58, 0.88);
        this.angularVelocityY = dx * 0.015;
      }

      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    const endDrag = (e: PointerEvent) => {
      if (e.pointerId !== this.activePointerId) return;
      const movedDist = Math.hypot(e.clientX - this.dragStartX, e.clientY - this.dragStartY);
      this.isPointerDown = false;
      this.activePointerId = null;
      this.dragLockedAxis = 'none';
      this.callbacks.onInteractionStateChange?.(false);

      // Gentle tap/click on the 3D flower gives a joyful nudge + lets parent release petals/next wish
      if (movedDist < 7) {
        this.nudgeRotation(Math.PI * 0.5, 0);
        this.callbacks.onFlowerTap?.(e.clientX, e.clientY);
      }
    };

    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);

    // Keyboard arrow controls when Cloud Stage is focused or centered in viewport
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  private isStageInteractiveForKeys(): boolean {
    if (!this.isVisible) return false;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return false;
    const rect = this.container.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    const visibleHeight = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return visibleHeight > Math.min(rect.height * 0.35, vh * 0.35) || this.container.contains(active);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (!this.isStageInteractiveForKeys()) return;

    const isFocusedInside = this.container.contains(document.activeElement);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      this.pressedKeys.add(e.key);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      // Allow Up/Down to tilt flower when stage is focused or Shift is held, or when stage occupies most of viewport
      const rect = this.container.getBoundingClientRect();
      const dominatesViewport = rect.top <= 120 && rect.bottom >= window.innerHeight * 0.65;
      if (isFocusedInside || e.shiftKey || dominatesViewport) {
        e.preventDefault();
        this.pressedKeys.add(e.key);
      }
    } else if ((e.key === 'r' || e.key === 'R' || e.key === 'к' || e.key === 'К') && isFocusedInside) {
      this.resetView();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.pressedKeys.delete(e.key);
  };

  public nudgeRotation(deltaYaw: number, deltaPitch: number): void {
    this.targetYaw += deltaYaw;
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + deltaPitch, -0.58, 0.88);
    this.angularVelocityY += deltaYaw * 0.45;
  }

  public rotateToFacet(facetIndex: number): void {
    const normalized = ((facetIndex % 4) + 4) % 4;
    const baseAngle = normalized * (Math.PI / 2) + 0.25;
    // Choose shortest angular path from current targetYaw
    const currentTurns = Math.round((this.targetYaw - baseAngle) / (Math.PI * 2));
    this.targetYaw = baseAngle + currentTurns * Math.PI * 2;
    this.targetPitch = 0.42;
  }

  public resetView(): void {
    this.targetYaw = 0.28;
    this.targetPitch = 0.42;
    this.angularVelocityY = 0;
  }

  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  public setScrollReveal(progress: number): void {
    this.scrollReveal = THREE.MathUtils.clamp(progress, 0, 1);
  }

  private handleResize(): void {
    const width = Math.max(this.container.clientWidth, 280);
    const height = Math.max(this.container.clientHeight, 320);
    const aspect = width / height;
    this.camera.aspect = aspect;
    // Keep comfortable headroom on all viewport ratios (narrow mobile & wide/short desktop)
    const baseZ = width < 640 ? 6.75 : width < 1024 ? 6.25 : 5.95;
    this.camera.position.z = aspect < 0.85 ? baseZ + (0.85 - aspect) * 1.4 : baseZ;
    this.camera.lookAt(0, -0.06, 0);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  private emitAngleState(force = false): void {
    const rawDeg = ((THREE.MathUtils.radToDeg(this.currentYaw) % 360) + 360) % 360;
    const pitchDeg = Math.round(THREE.MathUtils.radToDeg(this.currentPitch));
    const facetIndex = Math.floor(((rawDeg + 45) % 360) / 90) % 4;
    const roundedDeg = Math.round(rawDeg);

    if (force || facetIndex !== this.lastReportedFacet || Math.abs(roundedDeg - this.lastReportedDeg) >= 2) {
      this.lastReportedFacet = facetIndex;
      this.lastReportedDeg = roundedDeg;
      this.callbacks.onAngleChange?.(roundedDeg, pitchDeg, facetIndex);
    }
  }

  private loop = (now: number): void => {
    if (!this.isVisible) {
      this.rafId = null;
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.reducedMotion) {
      this.elapsed += dt;
    }

    // Continuous smooth keyboard rotation
    const keySpeedYaw = 1.65;
    const keySpeedPitch = 1.15;
    if (this.pressedKeys.has('ArrowLeft')) {
      this.targetYaw -= keySpeedYaw * dt;
      this.angularVelocityY = -0.25;
    }
    if (this.pressedKeys.has('ArrowRight')) {
      this.targetYaw += keySpeedYaw * dt;
      this.angularVelocityY = 0.25;
    }
    if (this.pressedKeys.has('ArrowUp')) {
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch - keySpeedPitch * dt, -0.58, 0.88);
    }
    if (this.pressedKeys.has('ArrowDown')) {
      this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + keySpeedPitch * dt, -0.58, 0.88);
    }

    // Subtle idle float & slow turntable breathing when not dragging (disabled in reduced-motion)
    if (!this.reducedMotion && !this.isPointerDown && this.pressedKeys.size === 0) {
      this.targetYaw += dt * 0.11;
    }

    // Smooth inertial damping
    const damp = this.reducedMotion ? 0.35 : 1 - Math.exp(-7.5 * dt);
    this.currentYaw = THREE.MathUtils.lerp(this.currentYaw, this.targetYaw, damp);
    this.currentPitch = THREE.MathUtils.lerp(this.currentPitch, this.targetPitch, damp);
    this.angularVelocityY *= Math.exp(-5.0 * dt);

    // Apply scroll-reveal graceful rise + scale settle
    const revealEase = 1 - Math.pow(1 - this.scrollReveal, 3);
    const scaleFactor = this.reducedMotion ? 1 : THREE.MathUtils.lerp(0.86, 1.0, revealEase);
    const bobY = this.reducedMotion ? 0 : Math.sin(this.elapsed * 0.95) * 0.065;
    const revealOffsetY = this.reducedMotion ? 0 : (1 - revealEase) * -0.25;

    this.flowerPivot.position.y = -0.08 + bobY + revealOffsetY;
    this.flowerPivot.scale.setScalar(scaleFactor);
    this.flowerPivot.rotation.set(this.currentPitch, this.currentYaw, Math.sin(this.elapsed * 0.55) * (this.reducedMotion ? 0 : 0.025));

    // Animate individual botanical leaves with breeze + rotational flutter response
    if (this.flowerModel && !this.reducedMotion) {
      const spinInfluence = THREE.MathUtils.clamp(this.angularVelocityY * 0.18, -0.14, 0.14);
      for (const leaf of this.leaves) {
        const sway1 = Math.sin(this.elapsed * leaf.speed + leaf.phase);
        const sway2 = Math.cos(this.elapsed * leaf.speed * 0.65 + leaf.phase * 1.4);
        leaf.node.rotation.x = leaf.baseRot.x + sway1 * leaf.ampX;
        leaf.node.rotation.z = leaf.baseRot.z + sway2 * leaf.ampZ + spinInfluence;
      }
    }

    // Drift layered clouds softly
    if (!this.reducedMotion) {
      for (const c of this.clouds) {
        c.sprite.position.x = c.baseX + Math.sin(this.elapsed * c.driftSpeed + c.phase) * c.driftAmp;
        c.sprite.position.y = c.baseY + Math.cos(this.elapsed * c.driftSpeed * 0.8 + c.phase) * (c.driftAmp * 0.25);
      }

      // Orbit drifting 3D petals
      for (const p of this.petals) {
        const a = p.angle + this.elapsed * p.speed;
        p.mesh.position.x = Math.cos(a) * p.radius;
        p.mesh.position.z = Math.sin(a) * p.radius * 0.72;
        p.mesh.position.y = p.baseY + Math.sin(this.elapsed * 0.8 + p.phase) * p.bobAmp;
        p.mesh.rotation.x += dt * p.rotSpeedX;
        p.mesh.rotation.y += dt * p.rotSpeedY;
      }

      if (this.pollenPoints) {
        this.pollenPoints.rotation.y = this.elapsed * 0.028;
        this.pollenPoints.position.y = Math.sin(this.elapsed * 0.4) * 0.12;
      }
    }

    this.emitAngleState();
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
