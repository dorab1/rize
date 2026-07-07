// 3D hero visual: a capsule shell holding glowing "microcapsules" that
// periodically release outward — a visual metaphor for delayed-release caffeine.
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const container = document.querySelector(".capsule-stage");
const canvas = document.getElementById("capsule-canvas");
if (!container || !canvas) {
  // section not present on this page — nothing to do
} else {
  try {
    initCapsuleScene(container, canvas);
  } catch (err) {
    console.error("[RIZE] 3D scene failed, falling back to static wordmark:", err);
    container.classList.add("capsule-stage--fallback");
  }
}

function initCapsuleScene(container, canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const LIME = 0xcbff33;
  const LIME_DIM = 0x4a5c14;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.15, 5.6);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // ---- lighting ----
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  const rim = new THREE.PointLight(LIME, 6, 12);
  rim.position.set(-2.2, -1, 2.5);
  scene.add(rim);

  // ---- capsule group ----
  const rig = new THREE.Group();
  rig.rotation.z = -0.38;
  rig.rotation.x = 0.12;
  scene.add(rig);

  const RADIUS = 0.85;
  const LENGTH = 1.55; // cylindrical mid-section length (caps add 2*RADIUS on top)
  const HALF = LENGTH / 2;

  const shellGeo = new THREE.CapsuleGeometry(RADIUS, LENGTH, 8, 32);

  const shellMat = new THREE.MeshPhysicalMaterial({
    color: 0x121412,
    roughness: 0.22,
    metalness: 0.15,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    transparent: true,
    opacity: 0.55,
    side: THREE.FrontSide,
  });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  rig.add(shell);

  // cheap fresnel-style rim glow: slightly larger backface shell, additive
  const glowMat = new THREE.MeshBasicMaterial({
    color: LIME,
    transparent: true,
    opacity: 0.5,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const glowShell = new THREE.Mesh(shellGeo, glowMat);
  glowShell.scale.setScalar(1.07);
  rig.add(glowShell);

  // banding rings for a "capsule seam" detail
  const ringMat = new THREE.MeshBasicMaterial({
    color: LIME,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  [-0.55, -0.18, 0.18, 0.55].forEach((y) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RADIUS * 1.01, 0.006, 8, 48), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    rig.add(ring);
  });

  // ---- microcapsules (instanced) ----
  const COUNT = 90;
  const microGeo = new THREE.IcosahedronGeometry(0.052, 1);
  const microMat = new THREE.MeshStandardMaterial({
    color: LIME_DIM,
    emissive: LIME,
    emissiveIntensity: 0.6,
    roughness: 0.35,
    metalness: 0.1,
    vertexColors: true,
  });
  const micro = new THREE.InstancedMesh(microGeo, microMat, COUNT);
  rig.add(micro);

  const dummy = new THREE.Object3D();
  const baseColor = new THREE.Color(0x5a6a1e);
  const peakColor = new THREE.Color(0xf2ffcf);
  const tmpColor = new THREE.Color();

  const particles = [];
  for (let i = 0; i < COUNT; i++) {
    particles.push(sampleInsideCapsule(RADIUS * 0.82, HALF));
  }

  function sampleInsideCapsule(r, halfLen) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const x = (Math.random() * 2 - 1) * r;
      const z = (Math.random() * 2 - 1) * r;
      const y = (Math.random() * 2 - 1) * (halfLen + r);
      const py = Math.max(-halfLen, Math.min(halfLen, y));
      const dist = Math.hypot(x, y - py, z);
      if (dist < r) {
        return {
          base: new THREE.Vector3(x, y, z),
          releaseAxis: (y + halfLen + r) / (2 * (halfLen + r)), // 0 bottom .. 1 top
          phase: Math.random() * Math.PI * 2,
          jitterSpeed: 0.6 + Math.random() * 0.8,
          driftDir: new THREE.Vector3(x, Math.abs(y) * 0.4 + 0.6, z).normalize(),
        };
      }
    }
    return {
      base: new THREE.Vector3(0, 0, 0),
      releaseAxis: 0.5,
      phase: 0,
      jitterSpeed: 1,
      driftDir: new THREE.Vector3(0, 1, 0),
    };
  }

  // ---- responsive sizing ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.45, 0.18);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const rect = container.getBoundingClientRect();
    const w = Math.max(rect.width, 240);
    const h = Math.max(rect.height, 240);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // ---- subtle pointer parallax (disabled for touch / reduced motion) ----
  let targetRotY = 0;
  let targetRotX = 0;
  if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("pointermove", (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetRotY = nx * 0.25;
      targetRotX = ny * 0.12;
    });
  }

  // ---- pause when off-screen ----
  let isVisible = true;
  new IntersectionObserver(
    (entries) => { isVisible = entries[0].isIntersecting; },
    { threshold: 0.05 }
  ).observe(container);

  const CYCLE = 8.5; // seconds for a full release loop
  let rafId = null;
  const clock = new THREE.Clock();

  function renderStaticFrame() {
    updateParticles(0);
    renderer.render(scene, camera);
  }

  function updateParticles(t) {
    const front = (t % CYCLE) / CYCLE;
    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      const local = THREE.MathUtils.clamp((front - p.releaseAxis * 0.7) / 0.3, 0, 1);
      const pulse = Math.sin(local * Math.PI); // 0 -> 1 -> 0

      const jitter = reduceMotion ? 0 : Math.sin(t * p.jitterSpeed + p.phase) * 0.02;
      const drift = p.driftDir.clone().multiplyScalar(pulse * 0.55);

      dummy.position.copy(p.base).add(drift);
      dummy.position.y += jitter;
      const scale = 0.7 + pulse * 0.9;
      dummy.scale.setScalar(scale);
      dummy.rotation.set(t * 0.4 + p.phase, t * 0.3, 0);
      dummy.updateMatrix();
      micro.setMatrixAt(i, dummy.matrix);

      tmpColor.copy(baseColor).lerp(peakColor, pulse);
      micro.setColorAt(i, tmpColor);
    }
    micro.instanceMatrix.needsUpdate = true;
    if (micro.instanceColor) micro.instanceColor.needsUpdate = true;
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!isVisible) return;

    const t = clock.getElapsedTime();
    if (!reduceMotion) {
      rig.rotation.y += 0.0035;
      rig.rotation.x = THREE.MathUtils.lerp(rig.rotation.x, 0.12 + targetRotX, 0.04);
      rig.rotation.z = THREE.MathUtils.lerp(rig.rotation.z, -0.38 + targetRotY * 0.3, 0.04);
    }
    updateParticles(t);
    composer.render();
  }

  if (reduceMotion) {
    renderStaticFrame();
  } else {
    tick();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!document.hidden && !rafId && !reduceMotion) {
      tick();
    }
  });
}
