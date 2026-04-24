import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#particle-globe");
const statusText = document.querySelector("#globe-status-text");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x171411);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 6.4);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance"
});

renderer.setClearColor(0x171411, 1);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);

const globe = new THREE.Group();
scene.add(globe);

const particleCount = window.innerWidth < 760 ? 5200 : 9200;
const radius = 2.08;
const basePositions = new Float32Array(particleCount * 3);
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const phases = new Float32Array(particleCount);
const colorBase = new THREE.Color(0xfff1df);
const colorAccent = new THREE.Color(0xd86f32);
const colorHighlight = new THREE.Color(0x55d6c2);
const geometry = new THREE.BufferGeometry();
const goldenAngle = Math.PI * (3 - Math.sqrt(5));

for (let i = 0; i < particleCount; i += 1) {
  const y = 1 - (i / (particleCount - 1)) * 2;
  const ringRadius = Math.sqrt(1 - y * y);
  const theta = i * goldenAngle;
  const x = Math.cos(theta) * ringRadius;
  const z = Math.sin(theta) * ringRadius;
  const index = i * 3;

  basePositions[index] = x;
  basePositions[index + 1] = y;
  basePositions[index + 2] = z;
  positions[index] = x * radius;
  positions[index + 1] = y * radius;
  positions[index + 2] = z * radius;
  phases[i] = Math.random() * Math.PI * 2;

  const colorMix = 0.18 + Math.max(0, x * 0.18 + y * 0.1);
  const mixedColor = colorBase.clone().lerp(colorAccent, colorMix);
  colors[index] = mixedColor.r;
  colors[index + 1] = mixedColor.g;
  colors[index + 2] = mixedColor.b;
}

geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

const material = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexColors: true,
  uniforms: {
    uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    uPointSize: { value: window.innerWidth < 760 ? 20 : 15 }
  },
  vertexShader: `
    varying vec3 vColor;
    uniform float uPixelRatio;
    uniform float uPointSize;

    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = uPointSize * uPixelRatio / max(1.0, -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;

    void main() {
      vec2 center = gl_PointCoord - 0.5;
      float dist = length(center);
      float alpha = smoothstep(0.5, 0.08, dist);

      if (alpha <= 0.01) {
        discard;
      }

      gl_FragColor = vec4(vColor, alpha * 0.92);
    }
  `
});

const particles = new THREE.Points(geometry, material);
globe.add(particles);

const haloGeometry = new THREE.SphereGeometry(radius * 1.01, 64, 32);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0x55d6c2,
  transparent: true,
  opacity: 0.035,
  wireframe: true,
  depthWrite: false
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
globe.add(halo);

const pointer = {
  current: new THREE.Vector2(0.18, 0.05),
  target: new THREE.Vector2(0.18, 0.05),
  active: false
};

const pointerDirection = new THREE.Vector3(0, 0, 1);
const rotationTarget = new THREE.Vector2(0, 0);

function syncLayout() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  camera.aspect = width / height;
  camera.position.z = width < 760 ? 7.25 : 6.4;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height, false);
  material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio || 1, 2);
  material.uniforms.uPointSize.value = width < 760 ? 20 : 15;

  globe.position.x = width < 760 ? 0.25 : 1.62;
  globe.position.y = width < 760 ? 0.55 : 0;
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  pointer.target.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  pointer.active = true;
}

function updateParticles(time) {
  pointer.current.lerp(pointer.target, 0.08);

  const mappedX = THREE.MathUtils.clamp(pointer.current.x * 0.9, -0.95, 0.95);
  const mappedY = THREE.MathUtils.clamp(pointer.current.y * 0.78, -0.88, 0.88);
  const mappedZ = Math.sqrt(Math.max(0.12, 1 - mappedX * mappedX - mappedY * mappedY));

  pointerDirection.set(mappedX, mappedY, mappedZ).normalize();
  rotationTarget.set(pointer.current.y * 0.2, pointer.current.x * 0.34);

  globe.rotation.x = THREE.MathUtils.lerp(globe.rotation.x, rotationTarget.x, 0.035);
  globe.rotation.y += reducedMotion ? 0.0008 : 0.0028;
  globe.rotation.y = THREE.MathUtils.lerp(globe.rotation.y, rotationTarget.y + globe.rotation.y, 0.018);
  globe.rotation.z = THREE.MathUtils.lerp(globe.rotation.z, pointer.current.x * -0.06, 0.03);
  halo.rotation.y -= reducedMotion ? 0.0004 : 0.0018;
  halo.rotation.x += reducedMotion ? 0.0002 : 0.0009;

  for (let i = 0; i < particleCount; i += 1) {
    const index = i * 3;
    const nx = basePositions[index];
    const ny = basePositions[index + 1];
    const nz = basePositions[index + 2];
    const alignment = nx * pointerDirection.x + ny * pointerDirection.y + nz * pointerDirection.z;
    const influence = Math.max(0, (alignment - 0.86) / 0.14);
    const ripple = Math.sin(time * 4.4 + phases[i] + alignment * 7.5) * 0.035;
    const breathing = Math.sin(time * 0.9 + phases[i]) * 0.012;
    const lift = pointer.active ? influence * (0.58 + ripple) : 0;
    const currentRadius = radius + breathing + lift;

    positions[index] = nx * currentRadius;
    positions[index + 1] = ny * currentRadius;
    positions[index + 2] = nz * currentRadius;

    const glow = Math.min(1, influence * 1.2);
    const base = colorBase.clone().lerp(colorAccent, 0.2 + Math.max(0, nx + ny) * 0.08);
    const finalColor = base.lerp(colorHighlight, glow * 0.86);

    colors[index] = finalColor.r;
    colors[index + 1] = finalColor.g;
    colors[index + 2] = finalColor.b;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function animate(now) {
  const time = now * 0.001;

  updateParticles(time);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", syncLayout);
window.addEventListener("pointermove", updatePointer, { passive: true });
window.addEventListener("pointerdown", updatePointer, { passive: true });

syncLayout();
requestAnimationFrame(animate);

if (statusText) {
  statusText.textContent = "Globe ready";
}
