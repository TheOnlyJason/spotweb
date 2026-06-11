import * as THREE from "three";
import { createLinenCoverMaterial } from "./linenTextures.js";
import { softenColor, spineEdgeColor } from "./colors.js";
import {
  drawSpineEdgeStrip,
  drawStripLabel,
  stripCanvasSize,
  configureSpineTexture,
} from "./spineText.js";

export const BOX_STACK_SCALE = 1.28;
const BOX_WALL = 0.013;
export const GAME_BOX_LID_OVERHANG = BOX_WALL * 1.35;
export const GAME_BOX_STACK_GAP = 0.004;
export const GAME_BOX_STACK_EXTRA = GAME_BOX_LID_OVERHANG + GAME_BOX_STACK_GAP;
export const BOX_OPEN_ANGLE_MAX = Math.PI * 0.62;
const LID_FRONT_INSET = 0.012;

function createSolidMaterial(color, linen) {
  const tint = softenColor(color);
  const mat = linen
    ? createLinenCoverMaterial(linen, tint)
    : new THREE.MeshLambertMaterial({ color: new THREE.Color(tint) });
  mat.emissive = new THREE.Color(0x000000);
  return mat;
}

function createFrontLabelMaterial(label, color, wide, wallHeight, linen) {
  const tint = softenColor(color);
  const edge = spineEdgeColor(color);
  const { w, h } = stripCanvasSize(wide, wallHeight);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  if (linen?.map?.image) {
    const pattern = ctx.createPattern(linen.map.image, "repeat");
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = tint;
    ctx.globalCompositeOperation = "multiply";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  } else {
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, tint);
    grad.addColorStop(1, edge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawSpineEdgeStrip(ctx, w, h, edge);
  drawStripLabel(ctx, w, h, label);

  const tex = new THREE.CanvasTexture(canvas);
  configureSpineTexture(tex);

  const sideMat = createSolidMaterial(color, null);
  const frontMat = new THREE.MeshLambertMaterial({ map: tex });
  frontMat.emissive = new THREE.Color(0x000000);
  return [
    sideMat,
    sideMat,
    sideMat,
    sideMat,
    frontMat, // +z front
    sideMat,
  ];
}

// Built in "display" space: X = wide, Y = up (thin), Z = depth. Front label on +Z.
// Inner content is counter-rotated so that with the shelf's rotation.z = PI/2 the
// box still presents a wide horizontal face and the lid opens from the top (+Y).
export function createGameBox(options = {}) {
  const {
    color = "#c9887a",
    label = "Games",
    linen = null,
    spineWidth = 0.168,
    spineHeight = 1.02,
    depth = 0.72,
    position = new THREE.Vector3(0, 0, 0),
    rotationZ = Math.PI / 2,
  } = options;

  const group = new THREE.Group();
  const content = new THREE.Group();
  content.rotation.z = -Math.PI / 2;

  const coverMat = createSolidMaterial(color, linen);
  const edgeMat = new THREE.MeshLambertMaterial({
    color: new THREE.Color(spineEdgeColor(color)),
  });
  edgeMat.emissive = new THREE.Color(0x000000);
  const innerMat = new THREE.MeshLambertMaterial({ color: new THREE.Color(0x241f1c) });
  innerMat.emissive = new THREE.Color(0x000000);

  const wide = spineHeight;
  const tall = spineWidth;
  const wall = BOX_WALL;
  const lip = 0.004;
  const halfX = wide / 2;
  const halfY = tall / 2;
  const halfZ = depth / 2;

  const wallHeight = tall - wall;
  const wallCenterY = wall / 2;

  const bottom = new THREE.Mesh(new THREE.BoxGeometry(wide, wall, depth), coverMat);
  bottom.position.y = -halfY + wall / 2;
  bottom.renderOrder = 0;
  content.add(bottom);

  const frontMats = createFrontLabelMaterial(label, color, wide, wallHeight, linen);
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(wide, wallHeight, wall), frontMats);
  frontWall.position.set(0, wallCenterY, halfZ - wall / 2);
  frontWall.renderOrder = 1;
  content.add(frontWall);

  const backWall = new THREE.Mesh(new THREE.BoxGeometry(wide, wallHeight, wall), edgeMat);
  backWall.position.set(0, wallCenterY, -halfZ + wall / 2);
  backWall.renderOrder = 1;
  content.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wall, wallHeight, depth - wall * 2),
    edgeMat
  );
  leftWall.position.set(-halfX + wall / 2, wallCenterY, 0);
  leftWall.renderOrder = 1;
  content.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wall, wallHeight, depth - wall * 2),
    edgeMat
  );
  rightWall.position.set(halfX - wall / 2, wallCenterY, 0);
  rightWall.renderOrder = 1;
  content.add(rightWall);

  const innerFloor = new THREE.Mesh(
    new THREE.BoxGeometry(wide - wall * 2.4, wall * 0.5, depth - wall * 2.4),
    innerMat
  );
  innerFloor.position.y = -halfY + wall * 1.1;
  content.add(innerFloor);

  const lidThick = wall * 1.35;
  const makeLidFaceMat = (polygonOffset) => {
    const mat = coverMat.clone();
    if (polygonOffset) {
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = -2;
      mat.polygonOffsetUnits = -2;
    }
    return mat;
  };
  const lidMaterials = [
    makeLidFaceMat(true),
    makeLidFaceMat(true),
    makeLidFaceMat(true),
    makeLidFaceMat(false),
    makeLidFaceMat(true),
    makeLidFaceMat(true),
  ];

  const lidDepth = depth - wall - LID_FRONT_INSET;
  const hingeZ = -halfZ + wall;

  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, halfY, hingeZ);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(wide + lip * 2, lidThick, lidDepth),
    lidMaterials
  );
  lid.position.set(0, lidThick / 2, lidDepth / 2);
  lid.renderOrder = 2;
  lidPivot.add(lid);
  content.add(lidPivot);

  const hitVolume = new THREE.Mesh(
    new THREE.BoxGeometry(wide, tall + lidThick * 0.5, depth),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  content.add(hitVolume);

  group.add(content);
  group.position.copy(position);
  group.rotation.z = rotationZ;

  const frontMat = frontMats[4];

  return {
    group,
    mesh: hitVolume,
    meshes: [hitVolume],
    highlight: { spine: frontMat, cover: coverMat },
    boxParts: { lidPivot, lidThick, wide, tall, depth, lidDepth, hingeZ },
  };
}

export function applyBoxOpenAmount(boxParts, amount) {
  if (!boxParts?.lidPivot) return;
  boxParts.lidPivot.rotation.x = -amount * BOX_OPEN_ANGLE_MAX;
}
