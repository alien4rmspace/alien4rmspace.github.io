import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#particle-globe");
const testPage = document.querySelector(".test-page");
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
const projectClusters = [
  {
    label: "CUDA Mandelbrot Renderer",
    href: "index.html#project-mandelbrot",
    direction: new THREE.Vector3(-0.74, 0.38, 0.56).normalize(),
    color: new THREE.Color(0xff8a3d)
  },
  {
    label: "Pokémon Card Classifier",
    href: "index.html#project-pokemon",
    direction: new THREE.Vector3(-0.44, -0.05, 0.9).normalize(),
    color: new THREE.Color(0x55d6c2)
  },
  {
    label: "Multiplayer Game Systems",
    href: "index.html#project-multiplayer",
    direction: new THREE.Vector3(-0.42, -0.42, 0.8).normalize(),
    color: new THREE.Color(0xffc15f)
  }
];
const clusterClickThreshold = 0.88;
const clusterVisualThreshold = 0.9;
const idleSpinSpeed = reducedMotion ? 0.00008 : 0.00034;
let idleSpin = 0;

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

const clusterParticlesPerProject = window.innerWidth < 760 ? 150 : 230;
const clusterParticleCount = projectClusters.length * clusterParticlesPerProject;
const clusterPositions = new Float32Array(clusterParticleCount * 3);
const clusterBaseDirections = new Float32Array(clusterParticleCount * 3);
const clusterColors = new Float32Array(clusterParticleCount * 3);
const clusterPhases = new Float32Array(clusterParticleCount);
const clusterIndexes = new Uint8Array(clusterParticleCount);
const clusterGeometry = new THREE.BufferGeometry();
const tangentA = new THREE.Vector3();
const tangentB = new THREE.Vector3();
const helperAxis = new THREE.Vector3();

projectClusters.forEach((cluster, clusterIndex) => {
  helperAxis.set(0, 1, 0);

  if (Math.abs(cluster.direction.dot(helperAxis)) > 0.88) {
    helperAxis.set(1, 0, 0);
  }

  tangentA.crossVectors(cluster.direction, helperAxis).normalize();
  tangentB.crossVectors(cluster.direction, tangentA).normalize();

  for (let i = 0; i < clusterParticlesPerProject; i += 1) {
    const particleIndex = clusterIndex * clusterParticlesPerProject + i;
    const attributeIndex = particleIndex * 3;
    const angle = i * goldenAngle + clusterIndex * 0.82;
    const spread = Math.sqrt((i + 0.5) / clusterParticlesPerProject) * 0.18;
    const normal = cluster.direction
      .clone()
      .addScaledVector(tangentA, Math.cos(angle) * spread)
      .addScaledVector(tangentB, Math.sin(angle) * spread)
      .normalize();
    const color = colorBase.clone().lerp(cluster.color, 0.82 + (i % 5) * 0.03);

    clusterBaseDirections[attributeIndex] = normal.x;
    clusterBaseDirections[attributeIndex + 1] = normal.y;
    clusterBaseDirections[attributeIndex + 2] = normal.z;
    clusterPositions[attributeIndex] = normal.x * radius * 1.06;
    clusterPositions[attributeIndex + 1] = normal.y * radius * 1.06;
    clusterPositions[attributeIndex + 2] = normal.z * radius * 1.06;
    clusterColors[attributeIndex] = color.r;
    clusterColors[attributeIndex + 1] = color.g;
    clusterColors[attributeIndex + 2] = color.b;
    clusterPhases[particleIndex] = Math.random() * Math.PI * 2;
    clusterIndexes[particleIndex] = clusterIndex;
  }
});

clusterGeometry.setAttribute("position", new THREE.BufferAttribute(clusterPositions, 3));
clusterGeometry.setAttribute("color", new THREE.BufferAttribute(clusterColors, 3));

const clusterMaterial = new THREE.PointsMaterial({
  size: window.innerWidth < 760 ? 0.052 : 0.04,
  transparent: true,
  opacity: 0.98,
  vertexColors: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const projectClusterParticles = new THREE.Points(clusterGeometry, clusterMaterial);
globe.add(projectClusterParticles);

const clusterLabelLayer = document.createElement("div");
clusterLabelLayer.className = "cluster-label-layer";
testPage?.appendChild(clusterLabelLayer);

const clusterLabels = projectClusters.map((cluster) => {
  const label = document.createElement("a");
  label.className = "cluster-label";
  label.href = cluster.href;
  label.textContent = cluster.label;
  label.setAttribute("aria-label", `Open ${cluster.label} project`);
  label.addEventListener("pointerenter", () => setActiveCluster(cluster));
  label.addEventListener("pointerleave", () => setActiveCluster(null));
  label.addEventListener("focus", () => setActiveCluster(cluster));
  label.addEventListener("blur", () => setActiveCluster(null));
  clusterLabelLayer.append(label);

  return {
    cluster,
    label,
    worldPosition: new THREE.Vector3(),
    projectedPosition: new THREE.Vector3(),
    normalWorld: new THREE.Vector3()
  };
});

const pointer = {
  current: new THREE.Vector2(0.18, 0.05),
  target: new THREE.Vector2(0.18, 0.05),
  strength: 0,
  targetStrength: 0,
  active: false
};

const pointerDirection = new THREE.Vector3(0, 0, 1);
const pointerDirectionTarget = new THREE.Vector3(0, 0, 1);
const rotationTarget = new THREE.Vector2(0, 0);
const drag = {
  active: false,
  moved: false,
  startX: 0,
  startY: 0,
  previousX: 0,
  previousY: 0,
  rotation: new THREE.Vector2(0, 0),
  targetRotation: new THREE.Vector2(0, 0),
  startedInProjectBlockedZone: false
};
const dragMoveThreshold = 6;
const raycaster = new THREE.Raycaster();
const pointerNdc = new THREE.Vector2();
const globeCenterWorld = new THREE.Vector3();
const hitPointWorld = new THREE.Vector3();
const hitPointLocal = new THREE.Vector3();
const cameraDirection = new THREE.Vector3();
const interactionSphere = new THREE.Sphere(globeCenterWorld, radius * 1.04);
const labelPositionPadding = new THREE.Vector2();
let activeCluster = null;
let pressedCluster = null;

function getTargetElement(event) {
  return event.target instanceof Element ? event.target : null;
}

function isControlTarget(event) {
  return Boolean(getTargetElement(event)?.closest("a, button, .globe-status"));
}

function isProjectClickBlocked(event) {
  return Boolean(getTargetElement(event)?.closest("a, button, .test-hero, .globe-status"));
}

function findProjectCluster(direction) {
  let nearestCluster = null;
  let nearestAlignment = -1;

  for (const cluster of projectClusters) {
    const alignment = direction.dot(cluster.direction);

    if (alignment > nearestAlignment) {
      nearestAlignment = alignment;
      nearestCluster = cluster;
    }
  }

  return nearestAlignment >= clusterClickThreshold ? nearestCluster : null;
}

function setActiveCluster(cluster) {
  if (activeCluster === cluster) {
    return;
  }

  activeCluster = cluster;
  document.body.classList.toggle("is-project-target", Boolean(activeCluster));

  if (statusText) {
    statusText.textContent = activeCluster ? `Open ${activeCluster.label}` : "Project clusters ready";
  }
}

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
  clusterMaterial.size = width < 760 ? 0.052 : 0.04;

  globe.position.x = width < 760 ? 0.25 : 1.62;
  globe.position.y = width < 760 ? 0.55 : 0;
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

  pointer.target.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  pointer.active = true;

  pointerNdc.set(pointer.target.x, pointer.target.y);
  raycaster.setFromCamera(pointerNdc, camera);
  globe.updateMatrixWorld();
  globe.getWorldPosition(globeCenterWorld);

  interactionSphere.center.copy(globeCenterWorld);
  const globeHit = raycaster.ray.intersectSphere(interactionSphere, hitPointWorld);

  if (globeHit) {
    hitPointLocal.copy(globeHit);
    globe.worldToLocal(hitPointLocal);
    pointerDirectionTarget.copy(hitPointLocal.normalize());
    pointer.targetStrength = 1;
    setActiveCluster(findProjectCluster(pointerDirectionTarget));
  } else {
    pointer.targetStrength = 0;
    setActiveCluster(null);
  }
}

function openActiveCluster(event) {
  const startedInProjectBlockedZone = drag.startedInProjectBlockedZone;
  const wasDragging = finishDrag();

  if (wasDragging || startedInProjectBlockedZone) {
    pressedCluster = null;
    return;
  }

  if (isProjectClickBlocked(event)) {
    return;
  }

  updatePointer(event);

  const clusterToOpen = activeCluster || pressedCluster;
  pressedCluster = null;

  if (clusterToOpen) {
    window.location.assign(clusterToOpen.href);
  }
}

function pressProjectCluster(event) {
  if (event.button !== 0 || isControlTarget(event)) {
    pressedCluster = null;
    return;
  }

  drag.active = true;
  drag.moved = false;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.previousX = event.clientX;
  drag.previousY = event.clientY;
  drag.targetRotation.copy(drag.rotation);
  drag.startedInProjectBlockedZone = Boolean(getTargetElement(event)?.closest(".test-hero"));

  updatePointer(event);
  pressedCluster = drag.startedInProjectBlockedZone ? null : activeCluster;
}

function updateDrag(event) {
  if (!drag.active) {
    return;
  }

  const dx = event.clientX - drag.previousX;
  const dy = event.clientY - drag.previousY;
  const totalDistance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
  const dragSensitivity = window.innerWidth < 760 ? 0.0075 : 0.0052;

  drag.previousX = event.clientX;
  drag.previousY = event.clientY;
  drag.targetRotation.y += dx * dragSensitivity;
  drag.targetRotation.x = THREE.MathUtils.clamp(
    drag.targetRotation.x + dy * dragSensitivity,
    -0.95,
    0.95
  );

  if (totalDistance > dragMoveThreshold) {
    drag.moved = true;
    pressedCluster = null;
    document.body.classList.add("is-globe-dragging");

    if (statusText) {
      statusText.textContent = "Drag to rotate globe";
    }
  }
}

function handlePointerMove(event) {
  updatePointer(event);
  updateDrag(event);
}

function finishDrag() {
  const wasDragging = drag.active && drag.moved;

  drag.active = false;
  drag.moved = false;
  drag.startedInProjectBlockedZone = false;
  document.body.classList.remove("is-globe-dragging");

  if (!activeCluster && statusText) {
    statusText.textContent = "Project clusters ready";
  }

  return wasDragging;
}

function cancelInteraction() {
  finishDrag();
  pointer.targetStrength = 0;
  pressedCluster = null;
  setActiveCluster(null);
}

function updateParticles(time) {
  pointer.current.lerp(pointer.target, 0.08);
  pointer.strength = THREE.MathUtils.lerp(pointer.strength, pointer.targetStrength, 0.12);
  pointerDirection.lerp(pointerDirectionTarget, 0.14).normalize();
  drag.rotation.lerp(drag.targetRotation, 0.12);
  rotationTarget.set(
    drag.rotation.x + pointer.current.y * 0.13,
    drag.rotation.y + pointer.current.x * 0.14
  );

  const userIsTargeting = pointer.active && (pointer.targetStrength > 0.08 || activeCluster);
  const spinFactor = userIsTargeting || drag.active ? 0.05 : 1;
  idleSpin += idleSpinSpeed * spinFactor;

  globe.rotation.x = THREE.MathUtils.lerp(globe.rotation.x, rotationTarget.x, 0.05);
  globe.rotation.y = THREE.MathUtils.lerp(globe.rotation.y, idleSpin + rotationTarget.y, 0.05);
  globe.rotation.z = THREE.MathUtils.lerp(globe.rotation.z, pointer.current.x * -0.06, 0.03);
  halo.rotation.y -= reducedMotion ? 0.0003 : 0.0009;
  halo.rotation.x += reducedMotion ? 0.0002 : 0.0006;

  for (let i = 0; i < particleCount; i += 1) {
    const index = i * 3;
    const nx = basePositions[index];
    const ny = basePositions[index + 1];
    const nz = basePositions[index + 2];
    const alignment = nx * pointerDirection.x + ny * pointerDirection.y + nz * pointerDirection.z;
    const influence = Math.max(0, (alignment - 0.86) / 0.14);
    const ripple = Math.sin(time * 4.4 + phases[i] + alignment * 7.5) * 0.035;
    const breathing = Math.sin(time * 0.9 + phases[i]) * 0.012;
    const lift = pointer.active ? influence * pointer.strength * (0.58 + ripple) : 0;
    let clusterInfluence = 0;
    let activeClusterInfluence = 0;
    let nearestCluster = null;

    for (const cluster of projectClusters) {
      const clusterAlignment =
        nx * cluster.direction.x + ny * cluster.direction.y + nz * cluster.direction.z;
      const visualInfluence = Math.max(
        0,
        (clusterAlignment - clusterVisualThreshold) / (1 - clusterVisualThreshold)
      );

      if (visualInfluence > clusterInfluence) {
        clusterInfluence = visualInfluence;
        nearestCluster = cluster;
      }

      if (activeCluster === cluster) {
        activeClusterInfluence = visualInfluence;
      }
    }

    const clusterLift = clusterInfluence * 0.035 + activeClusterInfluence * 0.18;
    const currentRadius = radius + breathing + lift + clusterLift;

    positions[index] = nx * currentRadius;
    positions[index + 1] = ny * currentRadius;
    positions[index + 2] = nz * currentRadius;

    const glow = Math.min(1, influence * pointer.strength * 1.2);
    const base = colorBase.clone().lerp(colorAccent, 0.2 + Math.max(0, nx + ny) * 0.08);
    const clusterMix = Math.min(0.9, clusterInfluence * 0.7 + activeClusterInfluence * 0.28);
    const finalColor = nearestCluster
      ? base.lerp(nearestCluster.color, clusterMix).lerp(colorHighlight, glow * 0.86)
      : base.lerp(colorHighlight, glow * 0.86);

    colors[index] = finalColor.r;
    colors[index + 1] = finalColor.g;
    colors[index + 2] = finalColor.b;
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.color.needsUpdate = true;
}

function updateClusterParticles(time) {
  for (let i = 0; i < clusterParticleCount; i += 1) {
    const index = i * 3;
    const cluster = projectClusters[clusterIndexes[i]];
    const activeBoost = activeCluster === cluster ? 1 : 0;
    const pulse = Math.sin(time * 3.6 + clusterPhases[i]) * (0.01 + activeBoost * 0.02);
    const currentRadius = radius * (1.06 + pulse + activeBoost * 0.025);

    clusterPositions[index] = clusterBaseDirections[index] * currentRadius;
    clusterPositions[index + 1] = clusterBaseDirections[index + 1] * currentRadius;
    clusterPositions[index + 2] = clusterBaseDirections[index + 2] * currentRadius;
  }

  clusterGeometry.attributes.position.needsUpdate = true;
}

function updateClusterLabels() {
  globe.updateMatrixWorld();
  globe.getWorldPosition(globeCenterWorld);
  cameraDirection.copy(camera.position).sub(globeCenterWorld).normalize();

  for (const item of clusterLabels) {
    item.worldPosition.copy(item.cluster.direction).multiplyScalar(radius * 1.24);
    globe.localToWorld(item.worldPosition);
    item.normalWorld.copy(item.worldPosition).sub(globeCenterWorld).normalize();
    item.projectedPosition.copy(item.worldPosition).project(camera);

    const facingCamera = item.normalWorld.dot(cameraDirection);
    const isOnScreen =
      Math.abs(item.projectedPosition.x) < 1.05 &&
      Math.abs(item.projectedPosition.y) < 1.05 &&
      facingCamera > 0.12;
    const screenX = (item.projectedPosition.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-item.projectedPosition.y * 0.5 + 0.5) * window.innerHeight;
    labelPositionPadding.set(
      Math.min(154, window.innerWidth * 0.34),
      window.innerWidth < 760 ? 86 : 62
    );
    const clampedX = THREE.MathUtils.clamp(
      screenX,
      labelPositionPadding.x,
      window.innerWidth - labelPositionPadding.x
    );
    const clampedY = THREE.MathUtils.clamp(
      screenY,
      labelPositionPadding.y,
      window.innerHeight - labelPositionPadding.y
    );

    item.label.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) translate(-50%, -155%)`;
    item.label.classList.toggle("is-visible", isOnScreen);
    item.label.classList.toggle("is-active", activeCluster === item.cluster);
  }
}

function animate(now) {
  const time = now * 0.001;

  updateParticles(time);
  updateClusterParticles(time);
  updateClusterLabels();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", syncLayout);
window.addEventListener("pointermove", handlePointerMove, { passive: true });
window.addEventListener("pointerdown", pressProjectCluster, { passive: true });
window.addEventListener("pointerup", openActiveCluster);
window.addEventListener("pointercancel", cancelInteraction);
window.addEventListener("pointerleave", cancelInteraction);

syncLayout();
requestAnimationFrame(animate);

if (statusText) {
  statusText.textContent = "Project clusters ready";
}
