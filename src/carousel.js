import * as THREE from "three";
import { CSS2DObject, CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";

const DEG = Math.PI / 180;
const ORBIT_RADIUS = 4.8;
const RECORD_Y = 1.05;
const DISC_RADIUS = 0.58;
const DISC_THICKNESS = 0.065;
const AUTO_SPEED = 0.14;
const FADE_EDGE = 12 * DEG;

/** Front semicircle: 9 o'clock (270°) → 12 → 3 o'clock (90°) */
function isOnFrontArc(thetaDeg) {
  let t = ((thetaDeg % 360) + 360) % 360;
  return t >= 270 || t <= 90;
}

function arcFade(thetaDeg) {
  let t = ((thetaDeg % 360) + 360) % 360;
  if (!isOnFrontArc(t)) return 0;

  if (t <= 90) return 1;
  if (t >= 270) return Math.min(1, (t - 270) / FADE_EDGE);
  return 0;
}

function createGrooveTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const cx = size / 2;
  const cy = size / 2;

  const grad = ctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, size * 0.48);
  grad.addColorStop(0, "#3a3a3a");
  grad.addColorStop(0.35, "#181818");
  grad.addColorStop(0.75, "#0c0c0c");
  grad.addColorStop(1, "#030303");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let r = size * 0.12; r < size * 0.48; r += 2.5) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.04 + (r % 5) * 0.008})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.46, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createLabelGeometry() {
  const outer = DISC_RADIUS * 0.36;
  const inner = DISC_RADIUS * 0.04;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ShapeGeometry(shape, 48);
}

function createVinylGroup(song, grooveTex) {
  const group = new THREE.Group();

  /*
   * Closed cylinder: caps = vinyl faces (YZ plane), axis = thickness (X).
   * rot Z 90 — upright wheel, no overlapping planes, no open-edge bar artifact.
   */
  const discPivot = new THREE.Group();
  const half = DISC_THICKNESS / 2;

  const cylGeo = new THREE.CylinderGeometry(
    DISC_RADIUS,
    DISC_RADIUS,
    DISC_THICKNESS,
    72
  );

  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.4,
    metalness: 0.25,
    transparent: true,
    depthWrite: true,
  });
  const discMat = new THREE.MeshStandardMaterial({
    map: grooveTex,
    roughness: 0.32,
    metalness: 0.16,
    transparent: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const backMat = new THREE.MeshStandardMaterial({
    map: grooveTex,
    roughness: 0.48,
    metalness: 0.06,
    transparent: true,
    depthWrite: true,
  });

  /* Cylinder groups: 0 = side, 1 = top cap (-X), 2 = bottom cap (+X toward viewer) */
  const body = new THREE.Mesh(cylGeo, [edgeMat, backMat, discMat]);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  discPivot.add(body);

  const labelColor = new THREE.Color(song.label);
  const labelMat = new THREE.MeshStandardMaterial({
    color: labelColor,
    emissive: labelColor,
    emissiveIntensity: 0.18,
    roughness: 0.5,
    metalness: 0.04,
    transparent: true,
    depthWrite: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const label = new THREE.Mesh(createLabelGeometry(), labelMat);
  label.rotation.y = Math.PI / 2;
  label.position.x = half + 0.012;
  label.renderOrder = 2;
  discPivot.add(label);

  group.add(discPivot);

  const labelDiv = document.createElement("div");
  labelDiv.className = "record-label-3d";
  labelDiv.innerHTML = `<span class="record-label-title">${song.title}</span><span class="record-label-artist">${song.artist}</span>`;
  const labelObj = new CSS2DObject(labelDiv);
  labelObj.position.set(0, DISC_RADIUS + 0.35, 0);
  labelObj.visible = false;
  group.add(labelObj);

  group.userData = {
    song,
    discMat,
    backMat,
    edgeMat,
    labelMat,
    labelObj,
    baseAngle: 0,
  };

  return group;
}

export function createCarousel(scene, songs) {
  const grooveTex = createGrooveTexture();
  const records = songs.map((song) => {
    const g = createVinylGroup(song, grooveTex);
    scene.add(g);
    return g;
  });

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.className = "labels-layer";

  let phase = 0;
  let frontIndex = 0;

  function getRecordCount() {
    return window.innerWidth < 768 ? 12 : 16;
  }

  function updatePositions() {
    const n = Math.min(getRecordCount(), records.length);
    const step = 360 / n;

    for (let i = 0; i < records.length; i++) {
      const g = records[i];
      if (i >= n) {
        g.visible = false;
        g.userData.labelObj.visible = false;
        continue;
      }

      const thetaDeg = phase + step * i;
      const theta = thetaDeg * DEG;
      const fade = arcFade(thetaDeg);
      const onArc = fade > 0.01;

      g.visible = onArc;
      g.userData.labelObj.visible = fade > 0.35;

      if (!onArc) continue;

      const x = ORBIT_RADIUS * Math.sin(theta);
      const z = ORBIT_RADIUS * Math.cos(theta);
      g.position.set(x, RECORD_Y, z);
      /* Yaw only — label faces orbit center; no pitch or roll */
      g.rotation.set(0, theta + Math.PI / 2, 0);

      const prominence = Math.max(0, Math.cos(theta));
      const scale = 0.88 + 0.14 * prominence;
      g.scale.setScalar(scale * fade);

      const op = fade;
      g.userData.discMat.opacity = op;
      g.userData.backMat.opacity = op * 0.92;
      g.userData.edgeMat.opacity = op;
      g.userData.labelMat.opacity = op;
    }

    let best = -1;
    let bestCos = -2;
    for (let i = 0; i < n; i++) {
      const theta = (phase + step * i) * DEG;
      const c = Math.cos(theta);
      if (c > bestCos) {
        bestCos = c;
        best = i;
      }
    }
    frontIndex = best;
  }

  function tick() {
    phase = (phase + AUTO_SPEED) % 360;
    if (phase < 0) phase += 360;
    updatePositions();
  }

  function mountLabels(container) {
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(labelRenderer.domElement);
  }

  function resizeLabels(container) {
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
  }

  function renderLabels(camera) {
    labelRenderer.render(scene, camera);
  }

  function getFrontSong() {
    if (frontIndex < 0 || frontIndex >= records.length) return null;
    return records[frontIndex].userData.song;
  }

  return {
    records,
    tick,
    mountLabels,
    resizeLabels,
    renderLabels,
    getFrontSong,
    updatePositions,
  };
}
