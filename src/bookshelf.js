import * as THREE from "three";
import {
  createBook,
  bookVariant,
  applyBookOpenAmount,
  applyContentToPages,
  clearPageContent,
  bookPageInfo,
  turnBookPage,
  stepBookPageTurn,
  pageLayoutForBook,
} from "./book.js";
import { createGameBox, applyBoxOpenAmount, BOX_STACK_SCALE, GAME_BOX_STACK_EXTRA } from "./gameBox.js";
import { createProjectsOverlay } from "./projectsOverlay.js";
import { createGamesOverlay } from "./gamesOverlay.js";
import { adventuresToSection } from "./adventures.js";
import { educationToSection } from "./education.js";
import { experienceToSection } from "./experience.js";

const SHELF_SCALE = 1.45;
const FOCUS_LERP = 0.18;
const FOCUS_DEPTH_FACTOR = 0.75;
const LEAN_GRAVITY = 0.0042;
const LEAN_FRICTION = 0.968;
const LEAN_PUSH_LERP = 0.14;
const LEAN_SETTLE = 0.32;
const LEAN_ANGLE_EPS = 0.003;
const ABOUT_SUPPORT_THRESHOLD = 0.12;
const ON_SHELF_THRESHOLD = 0.12;
const STACK_DROP_LERP = 0.22;
const HORIZONTAL_STACK = ["games", "adventures", "intro"];

function easeOutCubic(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return 1 - (1 - x) ** 3;
}

function easeInOutQuart(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x < 0.5 ? 8 * x * x * x * x : 1 - (-2 * x + 2) ** 4 / 2;
}

function gamesRevealProgress(openAmount) {
  const eased = easeInOutQuart(easeOutCubic(openAmount));
  return eased ** 1.75;
}

function gamesPaperVisualProgress(paperAmount, closing) {
  const t = THREE.MathUtils.clamp(paperAmount, 0, 1);
  if (closing) return t ** 2.6;
  return gamesRevealProgress(t);
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
const BOOK_GAP = 0;
const LEAN_BOOK_X_OFFSET = -0.07;
const WORK_TOUCH_INSET = 0.018;

const BOARD = 0.045;
const SIDE = 0.055;

const HOVER_EMISSIVE = 0x2a2a2a;
const ROTATE_SENSITIVITY = 0.006;
const DRAG_CLICK_THRESHOLD = 5;
const FOCUS_ROTATE_MIN = 0.35;
const ARROW_ROTATE_SPEED = 0.032;
const OPEN_BOOK_DAMP = 7;
const OPEN_BOX_DAMP = 6.5;
const OPEN_BOX_CLOSE_DAMP = 16;
const OPEN_PAPER_DAMP = 0.52;
const OPEN_PAPER_CLOSE_DAMP = 7.5;
const FOCUS_DAMP = 10;
const GAMES_CLOSE_FOCUS_DAMP = 18;
const OPEN_ORIENT_DAMP = 8;
const PAPER_VIEW_THRESHOLD = 0.52;
const _camDir = new THREE.Vector3();
const _unitCenter = new THREE.Vector3();
const _focusWorld = new THREE.Vector3();
const _focusLocal = new THREE.Vector3();
const _focusGroupPos = new THREE.Vector3();
const _rotatedOffset = new THREE.Vector3();
const _focusEuler = new THREE.Euler();
const _savedRotation = new THREE.Euler();
const _bookWorldPos = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _faceNormal = new THREE.Vector3();

const ROTATE_HINT_SIDES = ["top", "right", "bottom", "left"];

const ROTATE_HINT_ARIA = {
  top: "Tilt book up",
  right: "Turn book right",
  bottom: "Tilt book down",
  left: "Turn book left",
};

const ROTATE_HINT_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M7 12l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function createRotationHints(parent) {
  const root = document.createElement("div");
  root.className = "rotate-hints";
  root.setAttribute("aria-hidden", "true");

  const icons = {};
  for (const side of ROTATE_HINT_SIDES) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = `rotate-hint rotate-hint--${side}`;
    el.setAttribute("aria-label", ROTATE_HINT_ARIA[side]);
    el.innerHTML = ROTATE_HINT_ICON;
    root.appendChild(el);
    icons[side] = el;
  }

  parent.appendChild(root);
  return { root, icons };
}

function updateRotationHints({ hints, opacity }) {
  if (!hints || opacity <= 0.02) {
    if (hints) {
      hints.root.classList.remove("rotate-hints--visible");
      hints.root.style.opacity = "0";
    }
    return;
  }

  hints.root.classList.add("rotate-hints--visible");
  hints.root.style.opacity = String(opacity);
}

function isGameBoxEntry(entry) {
  return !!entry?.boxParts;
}

function syncGamesPaperTarget(entry) {
  if (!isGameBoxEntry(entry)) return;
  if (entry.openTarget > 0.5 && entry.openAmount >= 0.94) {
    entry.paperTarget = 1;
  } else if (entry.openTarget < 0.5) {
    entry.paperTarget = 0;
  }
}

function getOpenParts(entry) {
  return entry?.boxParts ?? entry?.bookParts ?? null;
}

function hasOpenableParts(entry) {
  return !!getOpenParts(entry);
}

function isPaperSideView(entry, camera) {
  if (!entry?.bookParts || isGameBoxEntry(entry)) return false;

  entry.group.updateMatrixWorld(true);
  entry.group.getWorldPosition(_bookWorldPos);
  _toCamera.copy(camera.position).sub(_bookWorldPos).normalize();

  _faceNormal.set(0, 0, 1).applyQuaternion(entry.group.quaternion);
  const spineDot = _faceNormal.dot(_toCamera);

  _faceNormal.set(1, 0, 0).applyQuaternion(entry.group.quaternion);
  const rightDot = _faceNormal.dot(_toCamera);

  _faceNormal.set(-1, 0, 0).applyQuaternion(entry.group.quaternion);
  const leftDot = _faceNormal.dot(_toCamera);
  const foreEdgeDot = Math.max(rightDot, leftDot);

  _faceNormal.set(0, 1, 0).applyQuaternion(entry.group.quaternion);
  const topDot = _faceNormal.dot(_toCamera);

  _faceNormal.set(0, -1, 0).applyQuaternion(entry.group.quaternion);
  const bottomDot = _faceNormal.dot(_toCamera);
  const topBottomDot = Math.max(topDot, bottomDot);

  const paperDot = Math.max(foreEdgeDot, topBottomDot);

  return paperDot > PAPER_VIEW_THRESHOLD && paperDot > spineDot + 0.1;
}

function createOpenBookButton(parent) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "open-book-btn";
  button.textContent = "Open book";
  button.hidden = true;
  parent.appendChild(button);
  return button;
}

function createPageNav(parent) {
  const root = document.createElement("div");
  root.className = "page-nav";
  root.hidden = true;

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "page-nav__btn page-nav__prev";
  prev.setAttribute("aria-label", "Previous page");
  prev.textContent = "‹";

  const label = document.createElement("span");
  label.className = "page-nav__label";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "page-nav__btn page-nav__next";
  next.setAttribute("aria-label", "Next page");
  next.textContent = "›";

  root.append(prev, label, next);
  parent.appendChild(root);
  return { root, prev, next, label };
}

function getCenterOffsetInParent(group, out) {
  group.updateMatrixWorld(true);
  // Exclude the oversized hidden page-turn leaf so the focused book centers on its
  // real geometry, not the leaf's bounding box.
  boundsExcludingFlagged(group).getCenter(out);
  group.parent.worldToLocal(out);
  out.sub(group.position);
  return out;
}

function getFocusGroupPos(group, focusLocal, rotationEuler, out) {
  _savedRotation.copy(group.rotation);
  group.rotation.copy(rotationEuler);
  getCenterOffsetInParent(group, _rotatedOffset);
  out.copy(focusLocal).sub(_rotatedOffset);
  group.rotation.copy(_savedRotation);
  return out;
}

function woodMaterial(color = 0x8b6914) {
  return new THREE.MeshLambertMaterial({ color });
}

function darkWoodMaterial() {
  return new THREE.MeshLambertMaterial({ color: 0x5c3d1e });
}

function computeLeanBookTransform(leanVariant, aboutVariant, indexVariant, stackLeft, stackTopY, stackWidth) {
  const height = leanVariant.height;
  const thickness = leanVariant.thickness;
  const targetX = -stackWidth / 2 + aboutVariant.thickness * 0.1;
  const targetY = aboutVariant.height * 0.96;
  const diagonal = Math.hypot(thickness, height);
  const rise = targetY - stackTopY;
  const run = Math.sqrt(Math.max(diagonal * diagonal - rise * rise, 0));
  const contactX = Math.min(
    targetX - run,
    stackLeft - indexVariant.height * 0.05
  );
  const dx = targetX - contactX;
  const dy = rise;

  let leanAngle = 0;
  let bestError = Infinity;
  for (let probe = 0.02; probe < 1.05; probe += 0.002) {
    const xTip = -thickness * Math.cos(probe) + height * Math.sin(probe);
    const yTip = thickness * Math.sin(probe) + height * Math.cos(probe);
    const error = Math.hypot(xTip - dx, yTip - dy);
    if (error < bestError) {
      bestError = error;
      leanAngle = probe;
    }
  }

  return {
    pivotX: contactX + LEAN_BOOK_X_OFFSET,
    pivotY: stackTopY + 0.004,
    leanAngle,
  };
}

function computeFallenLeanTransform(contactX, contactY) {
  return {
    pivotX: contactX,
    pivotY: contactY,
    rotation: -Math.PI / 2,
  };
}

function measurePivotExtents(pivot, rotationZ) {
  const savedRot = pivot.rotation.z;
  const savedPos = pivot.position.clone();
  pivot.rotation.z = rotationZ;
  pivot.position.set(0, 0, 0);
  pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pivot);
  if (pivot.parent) {
    pivot.parent.updateMatrixWorld(true);
    box.applyMatrix4(pivot.parent.matrixWorld.clone().invert());
  }
  pivot.rotation.z = savedRot;
  pivot.position.copy(savedPos);
  return { maxX: box.max.x, minX: box.min.x, minY: box.min.y };
}

function measureFallenPivotExtents(pivot, rotationZ) {
  const { maxX, minY } = measurePivotExtents(pivot, rotationZ);
  return { maxX, minY };
}

function computePushedRestPos(pivot, fallenRestPos, fallenRotation, aboutLeftEdge) {
  const { maxX } = measureFallenPivotExtents(pivot, fallenRotation);
  const gap = 0.03;
  const pushed = fallenRestPos.clone();
  pushed.x = Math.min(fallenRestPos.x, aboutLeftEdge - maxX - gap);
  return pushed;
}

function syncIntroAboutTouchRestPos(leanEntry, contactY, aboutLeftEdge) {
  const { maxX } = measurePivotExtents(
    leanEntry.group,
    leanEntry.fallenRestRotation
  );
  const px = aboutLeftEdge - maxX;
  leanEntry.aboutTouchRestPos.set(px, contactY, leanEntry.leanRestPos.z);
}

function syncIntroFallenRestPos(leanEntry, contactY, aboutLeftEdge, aboutVariant) {
  const { maxX } = measurePivotExtents(
    leanEntry.group,
    leanEntry.fallenRestRotation
  );
  const workLeftEdge = aboutLeftEdge + aboutVariant.thickness;
  const px = workLeftEdge + WORK_TOUCH_INSET - maxX;
  leanEntry.fallenRestPos.set(px, contactY, leanEntry.leanRestPos.z);
}

function syncIntroPushedRestPos(leanEntry, aboutLeftEdge) {
  leanEntry.pushedRestPos.copy(
    computePushedRestPos(
      leanEntry.group,
      leanEntry.fallenRestPos,
      leanEntry.fallenRestRotation,
      aboutLeftEdge
    )
  );
}

function fallProgress(leanEntry) {
  const span = leanEntry.leanRestRotation - leanEntry.fallenRestRotation;
  if (Math.abs(span) < 1e-6) return 1;
  return THREE.MathUtils.clamp(
    (leanEntry.leanRestRotation - leanEntry.fallAngle) / span,
    0,
    1
  );
}

function boundsExcludingFlagged(root) {
  // Box3.setFromObject includes hidden/oversized helper meshes (e.g. the page-turn leaf),
  // which would distort the shelf fit. Skip anything flagged userData.noBounds.
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.userData?.noBounds) return;
    if (!o.geometry) return;
    o.geometry.computeBoundingBox();
    tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    box.union(tmp);
  });
  return box;
}

// A name badge that hangs by two cords and SWINGS like a pendulum from a pivot at the
// top. Built in shelf-frame local space (+y up on screen, +z toward camera). Returns
// the pivot group plus the pickable card and a mutable swing state used by the loop.
function createNameBadge(box, photoUrl) {
  const topY = box.max.y;
  const frontZ = box.max.z;
  const leftX = box.min.x; // hang off the LEFT edge of the shelf

  const cardW = 0.42;
  const cardH = 0.54;
  const cordLen = 0.18;

  // The whole thing hangs from this pivot (at the top, where the cords attach).
  const pivot = new THREE.Group();
  const hangX = leftX - 0.08;
  const hangZ = frontZ + 0.2;
  const pivotY = topY + 0.02;
  pivot.position.set(hangX, pivotY, hangZ);
  // Resting tilt so it faces the camera a touch and reads as hanging at the side.
  pivot.rotation.x = -0.1;

  // Render the badge face (name plate) to a canvas texture.
  const W = 360;
  const H = 470;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1c1d22";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#2a2c33";
  ctx.fillRect(10, 10, W - 20, H - 20);
  ctx.fillStyle = "#f4efe6";
  ctx.font = '600 38px "Source Sans 3", system-ui, sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("Jason Dai", W / 2, H - 60);
  ctx.fillStyle = "#b9c2d0";
  ctx.font = '400 20px "Source Sans 3", system-ui, sans-serif';
  ctx.fillText("Software Engineer", W / 2, H - 28);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;

  const faceMat = new THREE.MeshLambertMaterial({ map: tex });
  const sideMat = new THREE.MeshLambertMaterial({ color: 0x15161a });
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(cardW, cardH, 0.022),
    [sideMat, sideMat, sideMat, sideMat, faceMat, sideMat]
  );
  // Card hangs below the pivot by the cord length + half its height.
  const cardBaseY = -(cordLen + cardH / 2);
  card.position.set(0, cardBaseY, 0);

  // Photo inset, mounted just in front of the card face.
  const photoMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  new THREE.TextureLoader().load(photoUrl, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    photoMat.map = t;
    photoMat.color.set(0xffffff);
    photoMat.needsUpdate = true;
  });
  // Square photo → square plane; sits in the upper portion of the card.
  const photoSize = cardW * 0.8;
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(photoSize, photoSize), photoMat);
  photo.position.set(0, cardH * 0.16, 0.013);
  card.add(photo);
  pivot.add(card);

  // Retractable ID-badge holder: ONE thin reel cord straight down the center, ending
  // in a small clip that grips the top-center of the card. The cord is a unit-tall
  // cylinder (height 1) so its length can be set every frame by scaling Y.
  const cordMat = new THREE.MeshLambertMaterial({ color: 0xc9ccd2 });
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0035, 0.0035, 1, 6),
    cordMat
  );
  // Geometry origin is the cord's center; we want it anchored at the top (y=0) and
  // extending downward, so put the mesh origin at the top by offsetting the geometry.
  cord.geometry.translate(0, -0.5, 0); // now spans y ∈ [-1, 0]
  cord.position.set(0, 0, -0.012);
  pivot.add(cord);

  // Reel housing at the very top (where the cord retracts from).
  const reelMat = new THREE.MeshLambertMaterial({ color: 0x2b2d33 });
  const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 14), reelMat);
  reel.rotation.x = Math.PI / 2;
  reel.position.set(0, 0, -0.012);
  pivot.add(reel);

  // Small metal clip joining the cord to the top of the card.
  const clipMat = new THREE.MeshLambertMaterial({ color: 0xb8bcc4 });
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.03, 0.01), clipMat);
  pivot.add(clip);

  pivot.userData.noBounds = true; // don't let the badge distort shelf/camera framing
  pivot.traverse((o) => (o.userData.noBounds = true));

  card.userData.isBadge = true;

  // Swing (angle about Z) + reel length offset. extend > 0 = pulled down, < 0 = pulled up.
  const swing = {
    angle: 0,
    vel: 0,
    restX: pivot.rotation.x,
    extend: 0,
    extendVel: 0,
  };

  const badge = {
    pivot,
    card,
    cord,
    clip,
    swing,
    cardW,
    cardH,
    cordLen,
    cardBaseY,
  };
  layoutBadge(badge); // place card/cord/clip for the initial (un-pulled) state
  return badge;
}

// Position the card, cord, and clip for the current `extend` (negative = pulled up toward reel).
function layoutBadge(badge) {
  const len = Math.max(BADGE_MIN_CORD_LEN, badge.cordLen + badge.swing.extend);
  badge.cord.scale.y = len;
  badge.clip.position.set(0, -len + 0.012, -0.006);
  badge.card.position.y = badge.cardBaseY - badge.swing.extend;
}

// Advance the badge one frame.
// Swing: gravity restoring force toward angle 0, light damping (left/right pendulum).
// Retract: the cord is a spring that pulls `extend` back to 0 with some bounce — like
// releasing a retractable reel. While being actively pulled, the spring is held off.
const BADGE_GRAVITY = 0.022; // stiffer return → smaller, quicker swing
const BADGE_DAMPING = 0.92; // heavier damping → settles fast, doesn't keep swinging
const BADGE_MAX_ANGLE = 0.55;
const BADGE_DRAG_MAX_ANGLE = 0.95;
const BADGE_DRAG_ANGLE_SENS = 0.0035;
const BADGE_RETRACT_STIFFNESS = 0.06; // how hard the reel pulls back
const BADGE_RETRACT_DAMPING = 0.8; // higher = snappier settle, less bounce
const BADGE_MAX_EXTEND = 0.7;
const BADGE_MIN_EXTEND = -0.14;
const BADGE_MIN_CORD_LEN = 0.04;
const BADGE_DRAG_EXTEND_SENS = 0.0022;
function stepBadgeSwing(badge, held) {
  if (!badge) return;
  const s = badge.swing;

  // Pendulum swing (always active, even while held), clamped to a gentle range.
  s.vel += -s.angle * BADGE_GRAVITY;
  s.vel *= BADGE_DAMPING;
  s.angle += s.vel;
  if (s.angle > BADGE_MAX_ANGLE) {
    s.angle = BADGE_MAX_ANGLE;
    s.vel *= -0.3;
  } else if (s.angle < -BADGE_MAX_ANGLE) {
    s.angle = -BADGE_MAX_ANGLE;
    s.vel *= -0.3;
  }
  badge.pivot.rotation.z = s.angle;

  // Retract spring (only springs back when NOT being held/pulled).
  if (!held) {
    s.extendVel += -s.extend * BADGE_RETRACT_STIFFNESS;
    s.extendVel *= BADGE_RETRACT_DAMPING;
    s.extend += s.extendVel;
    if (Math.abs(s.extend) < 1e-4 && Math.abs(s.extendVel) < 1e-4) {
      s.extend = 0;
      s.extendVel = 0;
    }
  }
  layoutBadge(badge);
}

function buildShelfFrame(booksGroup, photoUrl) {
  const box = boundsExcludingFlagged(booksGroup);
  const frame = new THREE.Group();
  const padX = 0.1;
  const padY = 0.08;
  const padZ = 0.14;

  const min = box.min;
  const max = box.max;
  const innerW = max.x - min.x + padX * 2;
  const innerH = max.y - min.y + padY * 2;
  const innerD = max.z - min.z + padZ * 2;
  const cx = (min.x + max.x) * 0.5;
  const cy = (min.y + max.y) * 0.5;
  const cz = (min.z + max.z) * 0.5;

  const wood = woodMaterial();
  const dark = darkWoodMaterial();

  const floor = new THREE.Mesh(new THREE.BoxGeometry(innerW, BOARD, innerD), wood);
  floor.position.set(cx, min.y - padY * 0.45 + BOARD / 2, cz);
  frame.add(floor);

  const top = new THREE.Mesh(new THREE.BoxGeometry(innerW, BOARD, innerD), wood);
  top.position.set(cx, max.y + padY * 0.45 - BOARD / 2, cz);
  frame.add(top);

  const back = new THREE.Mesh(new THREE.BoxGeometry(innerW, innerH, BOARD), dark);
  back.position.set(cx, cy, min.z - padZ * 0.55 - BOARD / 2);
  frame.add(back);

  const left = new THREE.Mesh(new THREE.BoxGeometry(SIDE, innerH, innerD), dark);
  left.position.set(cx - innerW / 2 + SIDE / 2, cy, cz);
  frame.add(left);

  const right = new THREE.Mesh(new THREE.BoxGeometry(SIDE, innerH, innerD), dark);
  right.position.set(cx + innerW / 2 - SIDE / 2, cy, cz);
  frame.add(right);

  let badge = null;
  if (photoUrl) {
    badge = createNameBadge(box, photoUrl);
    frame.add(badge.pivot);
  }

  return { frame, badge };
}

export function createBookshelf(camera, domElement, options = {}) {
  const {
    books = [],
    horizontalBooks = [],
    linen = null,
    position = new THREE.Vector3(0, 0, 0),
    badgePhoto = null,
    sceneLighting = null,
    sceneDimEl = null,
  } = options;

  const unit = new THREE.Group();
  const booksGroup = new THREE.Group();
  const bookEntries = [];
  const pickables = [];
  let leanEntryRef = null;
  let aboutEntry = null;
  let stackLeft = 0;
  let stackWidth = 0;
  let aboutBookIndex = -1;
  let aboutVariant = null;
  let indexVariant = null;
  const bookZ = 0;
  let xCursor = 0;

  books.forEach((cfg, i) => {
    const variant = bookVariant(i);
    const depthTaper = 1 - (i / Math.max(books.length - 1, 1)) * 0.14;
    const restX = xCursor + variant.thickness / 2;
    const restPos = new THREE.Vector3(restX, variant.height / 2, bookZ);

    const { group, mesh, meshes, highlight, bookParts } = createBook({
      color: cfg.color,
      spineLabel: cfg.title,
      linen,
      height: variant.height,
      thickness: variant.thickness,
      depth: variant.depth,
      depthTaper,
      spineOut: true,
      position: restPos,
    });

    xCursor += variant.thickness + BOOK_GAP;

    // Handle both single mesh (old) and multiple meshes (new - no spine clickable)
    const meshesToAdd = meshes ?? [mesh];
    for (const m of meshesToAdd) {
      m.userData.bookIndex = bookEntries.length;
      m.userData.sectionId = cfg.id;
      pickables.push(m);
    }
    booksGroup.add(group);

    bookEntries.push({
      group,
      mesh,
      highlight,
      section: cfg,
      restPos,
      restRotation: group.rotation.z,
      focusAmount: 0,
      focusYaw: 0,
      focusYawTarget: 0,
      focusPitch: 0,
      focusPitchTarget: null,
      bookParts: bookParts ?? null,
      openAmount: 0,
      openTarget: 0,
    });
  });

  stackWidth = xCursor - BOOK_GAP;
  const centerShift = stackWidth / 2;
  for (const entry of bookEntries) {
    entry.group.position.x -= centerShift;
    entry.restPos.x -= centerShift;
  }

  if (horizontalBooks.length) {
    stackLeft = -stackWidth / 2;
    const bottomBooks = ["games", "adventures"]
      .map((id) => horizontalBooks.find((cfg) => cfg.id === id))
      .filter(Boolean);
    const leanBook = horizontalBooks.find((cfg) => cfg.id === "intro");
    aboutBookIndex = books.findIndex((cfg) => cfg.id === "about");
    aboutVariant = aboutBookIndex >= 0 ? bookVariant(aboutBookIndex) : bookVariant(0);
    let yCursor = 0;
    let indexVariant = null;

    bottomBooks.forEach((cfg) => {
      const i = horizontalBooks.indexOf(cfg);
      const variant = bookVariant(i);
      const stackThickness =
        cfg.id === "games" ? variant.thickness * BOX_STACK_SCALE : variant.thickness;
      const restX = stackLeft - variant.height / 2;
      const restY = yCursor + stackThickness / 2;
      yCursor += stackThickness;
      if (cfg.id === "games") yCursor += GAME_BOX_STACK_EXTRA;
      if (cfg.id === "adventures") indexVariant = variant;

      const restPos = new THREE.Vector3(restX, restY, bookZ);

      if (cfg.id === "games") {
        const { group, mesh, meshes, highlight, boxParts } = createGameBox({
          color: cfg.color,
          label: cfg.title,
          linen,
          spineWidth: stackThickness,
          spineHeight: variant.height,
          depth: variant.depth,
          rotationZ: Math.PI / 2,
          position: restPos,
        });

        const meshesToAdd = meshes ?? [mesh];
        for (const m of meshesToAdd) {
          m.userData.bookIndex = bookEntries.length;
          m.userData.sectionId = cfg.id;
          pickables.push(m);
        }
        booksGroup.add(group);

        bookEntries.push({
          group,
          mesh,
          highlight,
          section: cfg,
          restPos,
          restRotation: group.rotation.z,
          stackThickness,
          stackRestX: restX,
          focusAmount: 0,
          focusYaw: 0,
          focusYawTarget: 0,
          focusPitch: 0,
          focusPitchTarget: null,
          boxParts,
          bookParts: null,
          openAmount: 0,
          openTarget: 0,
          paperAmount: 0,
          paperTarget: 0,
          clickBump: 0,
        });
        return;
      }

      const { group, mesh, meshes, highlight, bookParts } = createBook({
        color: cfg.color,
        spineLabel: cfg.title,
        linen,
        height: variant.height,
        thickness: variant.thickness,
        depth: variant.depth,
        depthTaper: 1,
        rotationZ: Math.PI / 2,
        flipSpineLabel: true,
        position: restPos,
      });

      const meshesToAdd = meshes ?? [mesh];
      for (const m of meshesToAdd) {
        m.userData.bookIndex = bookEntries.length;
        m.userData.sectionId = cfg.id;
        pickables.push(m);
      }
      booksGroup.add(group);

      bookEntries.push({
        group,
        mesh,
        highlight,
        section: cfg,
        restPos,
        restRotation: group.rotation.z,
        stackThickness: variant.thickness,
        stackRestX: restX,
        focusAmount: 0,
        focusYaw: 0,
        focusYawTarget: 0,
        focusPitch: 0,
        focusPitchTarget: null,
        bookParts: bookParts ?? null,
        boxParts: null,
        openAmount: 0,
        openTarget: 0,
      });
    });

    if (leanBook && indexVariant) {
      const i = horizontalBooks.indexOf(leanBook);
      const variant = bookVariant(i);
      const { group, mesh, meshes, highlight, bookParts } = createBook({
        color: leanBook.color,
        spineLabel: leanBook.title,
        linen,
        height: variant.height,
        thickness: variant.thickness,
        depth: variant.depth,
        depthTaper: 1,
        rotationZ: 0,
        position: new THREE.Vector3(-variant.thickness / 2, variant.height / 2, 0),
      });

      let leanRestPos;
      let leanRestRotation;
      if (aboutBookIndex >= 0) {
        const lean = computeLeanBookTransform(
          variant,
          aboutVariant,
          indexVariant,
          stackLeft,
          yCursor,
          stackWidth
        );
        leanRestPos = new THREE.Vector3(lean.pivotX, lean.pivotY, bookZ);
        leanRestRotation = -lean.leanAngle;
      } else {
        const fallback = computeFallenLeanTransform(
          stackLeft - variant.height * 0.05 + LEAN_BOOK_X_OFFSET,
          yCursor + 0.004
        );
        leanRestPos = new THREE.Vector3(fallback.pivotX, fallback.pivotY, bookZ);
        leanRestRotation = fallback.rotation;
      }

      const fallenRestRotation = -Math.PI / 2;

      const pivot = new THREE.Group();
      pivot.add(group);

      const aboutLeftEdge =
        aboutBookIndex >= 0 ? -stackWidth / 2 : stackLeft;

      const fallenRestPos = leanRestPos.clone();
      syncIntroFallenRestPos(
        { group: pivot, leanRestPos, fallenRestPos, fallenRestRotation },
        leanRestPos.y,
        aboutLeftEdge,
        aboutVariant
      );

      const pushedRestPos = fallenRestPos.clone();
      syncIntroPushedRestPos(
        { group: pivot, fallenRestPos, fallenRestRotation, pushedRestPos },
        aboutLeftEdge
      );
      const aboutTouchRestPos = fallenRestPos.clone();
      syncIntroAboutTouchRestPos(
        { group: pivot, leanRestPos, fallenRestRotation, aboutTouchRestPos },
        leanRestPos.y,
        aboutLeftEdge
      );
      const startsFallen = aboutBookIndex < 0;
      const restPos = startsFallen ? fallenRestPos.clone() : leanRestPos.clone();
      const restRotation = startsFallen ? fallenRestRotation : leanRestRotation;

      pivot.rotation.z = restRotation;
      pivot.position.copy(restPos);

      const meshesToAdd = meshes ?? [mesh];
      for (const m of meshesToAdd) {
        m.userData.bookIndex = bookEntries.length;
        m.userData.sectionId = leanBook.id;
        pickables.push(m);
      }
      booksGroup.add(pivot);

      leanEntryRef = {
        group: pivot,
        mesh,
        highlight,
        section: leanBook,
        restPos,
        restRotation,
        leanRestPos,
        leanRestRotation,
        fallenRestPos,
        fallenRestRotation,
        pushedRestPos,
        aboutTouchRestPos,
        stackThickness: variant.thickness,
        hasFallen: startsFallen,
        hasBeenPushed: startsFallen,
        inAboutGap: startsFallen,
        fallAngle: restRotation,
        angularVelocity: 0,
        focusAmount: 0,
        focusYaw: 0,
        focusYawTarget: 0,
        focusPitch: 0,
        focusPitchTarget: null,
        bookParts: bookParts ?? null,
        openAmount: 0,
        openTarget: 0,
        stackMeta: {
          stackLeft,
          stackWidth,
          variant,
          aboutVariant,
          indexVariant,
          aboutBookIndex,
          aboutLeftEdge,
        },
      };
      bookEntries.push(leanEntryRef);
    }
  }

  for (const entry of bookEntries) {
    if (entry.section.id === "about") aboutEntry = entry;
    if (entry.section.id === "intro") leanEntryRef = entry;
  }

  const { frame: shelfFrame, badge } = buildShelfFrame(booksGroup, badgePhoto);
  unit.add(shelfFrame);
  if (badge) pickables.push(badge.card);
  unit.add(booksGroup);

  unit.rotation.set(0, 0, (3 * Math.PI) / 2);
  unit.scale.setScalar(SHELF_SCALE);
  unit.updateMatrixWorld(true);

  const bounds = boundsExcludingFlagged(unit);
  const boundsCenter = bounds.getCenter(new THREE.Vector3());
  unit.position.copy(position).add(new THREE.Vector3(0, 0, 0).sub(boundsCenter));
  unit.updateMatrixWorld(true);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoveredIndex = -1;
  let activeIndex = -1;
  let pointerDown = false;
  let dragRotate = false;
  let draggingBadge = false;
  let badgeDragStartX = 0;
  let badgeDragStartY = 0;
  let badgeDragStartAngle = 0;
  let badgeDragStartExtend = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let lastDragX = 0;
  let lastDragY = 0;
  let suppressClick = false;
  let arrowRotateSide = null;
  // Rotate-arrow hints removed — dragging rotates the book instead.
  const rotationHints = null;
  const openBookBtn = createOpenBookButton(domElement.parentElement ?? domElement);
  const pageNav = createPageNav(domElement.parentElement ?? domElement);
  const projectsOverlay = createProjectsOverlay(domElement.parentElement ?? domElement);
  let gamesOverlay;
  let gamesClosePending = false;

  function beginGamesClose(entry, { keepActive = false } = {}) {
    if (!entry) return;
    entry.openTarget = 0;
    entry.paperTarget = 0;
    entry.focusYawTarget = 0;
    entry.focusPitchTarget = null;
    gamesClosePending = true;
    resetGamesClickFeedback(entry);
    gamesOverlay?.dismissContent();
    if (
      !keepActive &&
      activeIndex >= 0 &&
      bookEntries[activeIndex] === entry
    ) {
      activeIndex = -1;
      refreshHighlights();
      updateOpenBookButton(null);
    }
  }

  function closeGamesView() {
    const entry = getStackEntry("games");
    if (!entry || (entry.openAmount < 0.02 && entry.paperAmount < 0.02)) {
      gamesOverlay?.hide();
      clearActive();
      return;
    }
    beginGamesClose(entry);
  }

  gamesOverlay = createGamesOverlay(domElement.parentElement ?? domElement, {
    onClose: closeGamesView,
  });
  let gamesFeedbackPlayed = false;

  function triggerGamesClickFeedback(entry) {
    if (!entry || gamesFeedbackPlayed) return;
    gamesFeedbackPlayed = true;
    entry.clickBump = 1;
  }

  function resetGamesClickFeedback(entry) {
    if (!entry) return;
    entry.clickBump = 0;
    gamesFeedbackPlayed = false;
  }

  function sectionContentForEntry(entry) {
    if (!entry?.section) return null;
    const layout = pageLayoutForBook(entry.bookParts);
    if (entry.section.id === "adventures") {
      return adventuresToSection();
    }
    if (entry.section.id === "education") {
      return educationToSection(entry.section);
    }
    if (entry.section.id === "experience") {
      return experienceToSection(entry.section, layout);
    }
    return entry.section;
  }

  function turnActivePage(dir) {
    if (activeIndex < 0) return;
    const entry = bookEntries[activeIndex];
    if (!entry.bookParts) return;
    if (turnBookPage(entry.bookParts, dir)) {
      updatePageNav(entry);
    }
  }

  pageNav.prev.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    suppressClick = true;
    turnActivePage(-1);
  });
  pageNav.next.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    suppressClick = true;
    turnActivePage(1);
  });

  openBookBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (activeIndex < 0) return;
    const entry = bookEntries[activeIndex];
    if (!hasOpenableParts(entry)) return;
    const opening = entry.openTarget <= 0.5;
    entry.openTarget = opening ? 1 : 0;
    if (opening) {
      entry.focusYawTarget = isGameBoxEntry(entry) ? 0 : Math.PI;
      entry.focusPitchTarget = 0;
      if (isGameBoxEntry(entry)) {
        entry.paperTarget = 0;
        triggerGamesClickFeedback(entry);
      } else if (entry.bookParts && entry.section) {
        applyContentToPages(entry.bookParts, sectionContentForEntry(entry));
      }
    } else {
      entry.focusYawTarget = 0;
      entry.focusPitchTarget = null;
      if (isGameBoxEntry(entry)) {
        beginGamesClose(entry);
      } else if (entry.bookParts) {
        clearPageContent(entry.bookParts);
      }
    }
    suppressClick = true;
  });

  function resetBookOpen(entry) {
    if (!entry) return;
    entry.openAmount = 0;
    entry.openTarget = 0;
    if (isGameBoxEntry(entry)) {
      entry.paperAmount = 0;
      entry.paperTarget = 0;
    }
    if (entry.boxParts) applyBoxOpenAmount(entry.boxParts, 0);
    else if (entry.bookParts) applyBookOpenAmount(entry.bookParts, 0);
  }

  function updateOpenBookButton(entry) {
    const show = entry && hasOpenableParts(entry) && entry.focusAmount > FOCUS_ROTATE_MIN;

    openBookBtn.hidden = !show;
    if (!show) {
      updatePageNav(null);
      return;
    }

    const isBox = isGameBoxEntry(entry);
    const opened = isBox
      ? entry.openTarget > 0.5 || entry.paperAmount > 0.5
      : entry.openTarget > 0.5 || entry.openAmount > 0.5;
    openBookBtn.textContent = opened
      ? isBox
        ? "Close"
        : "Close book"
      : isBox
        ? "Open"
        : "Open book";
    openBookBtn.style.opacity = String(
      THREE.MathUtils.clamp(
        (entry.focusAmount - FOCUS_ROTATE_MIN) / (1 - FOCUS_ROTATE_MIN),
        0,
        1
      )
    );
    updatePageNav(entry);
  }

  function updatePageNav(entry) {
    const opened = entry && (entry.openAmount > 0.5 || entry.openTarget > 0.5);

    const showProjects = !!(opened && entry.section.id === "projects");
    if (showProjects) projectsOverlay.show();
    else projectsOverlay.hide();

    const info = opened && entry.bookParts ? bookPageInfo(entry.bookParts) : { spread: 0, total: 0 };
    const show = opened && info.total > 2;

    pageNav.root.hidden = !show;
    if (!show) return;

    const current = Math.floor(info.spread / 2) + 1;
    const totalSpreads = Math.ceil(info.total / 2);
    pageNav.label.textContent = `${current} / ${totalSpreads}`;
    pageNav.prev.disabled = info.spread <= 0;
    pageNav.next.disabled = info.spread + 2 >= info.total;
  }

  function isBookOpened(entry) {
    if (!entry) return false;
    if (isGameBoxEntry(entry)) {
      return entry.openTarget > 0.5 || entry.paperAmount > 0.08;
    }
    return entry.openTarget > 0.5 || entry.openAmount > 0.08;
  }

  function animateBookOpen(entry, delta) {
    const parts = getOpenParts(entry);
    if (!parts) return;
    if (isGameBoxEntry(entry)) {
      const closing = entry.openTarget < entry.openAmount;
      const boxDamp = closing ? OPEN_BOX_CLOSE_DAMP : OPEN_BOX_DAMP;
      entry.openAmount = THREE.MathUtils.damp(
        entry.openAmount,
        entry.openTarget,
        boxDamp,
        delta
      );
      syncGamesPaperTarget(entry);
      entry.paperAmount = THREE.MathUtils.damp(
        entry.paperAmount,
        entry.paperTarget,
        entry.paperAmount > entry.paperTarget ? OPEN_PAPER_CLOSE_DAMP : OPEN_PAPER_DAMP,
        delta
      );
      applyBoxOpenAmount(entry.boxParts, easeOutCubic(entry.openAmount) * 0.18);
      return;
    }
    entry.openAmount = THREE.MathUtils.damp(
      entry.openAmount,
      entry.openTarget,
      OPEN_BOOK_DAMP,
      delta
    );
    applyBookOpenAmount(entry.bookParts, entry.openAmount);
    stepBookPageTurn(entry.bookParts);
  }

  function getBookScreenAnchor(group) {
    if (!group) return null;
    group.getWorldPosition(_bookWorldPos);
    _bookWorldPos.project(camera);
    const rect = domElement.getBoundingClientRect();
    return {
      x: rect.left + (_bookWorldPos.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-_bookWorldPos.y * 0.5 + 0.5) * rect.height,
    };
  }

  function updateGamesOverlayVisual() {
    const entry = getStackEntry("games");
    if (!entry || entry.paperAmount <= 0.001) {
      gamesOverlay.setProgress(0);
      sceneLighting?.setGamesFocus(0);
      if (sceneDimEl) sceneDimEl.style.opacity = "0";
      return;
    }
    const closing = entry.paperTarget < 0.5;
    const progress = gamesPaperVisualProgress(entry.paperAmount, closing);
    const dim = closing ? progress * 0.9 : smoothstep(0.06, 0.72, progress);
    sceneLighting?.setGamesFocus(dim);
    if (sceneDimEl) sceneDimEl.style.opacity = String(dim * 0.58);
    const anchor = getBookScreenAnchor(entry.group);
    gamesOverlay.setProgress(progress, { anchor, closing });
  }

  function finishGamesCloseIfNeeded() {
    if (!gamesClosePending) return;
    const entry = getStackEntry("games");
    if (entry && entry.paperAmount > 0.02) return;
    gamesClosePending = false;
    gamesOverlay.hide();
  }

  function bindRotationHint(el, side) {
    const stopArrow = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    el.addEventListener("pointerdown", (event) => {
      stopArrow(event);
      if (activeIndex < 0) return;
      const entry = bookEntries[activeIndex];
      if (entry.focusAmount <= FOCUS_ROTATE_MIN || isBookOpened(entry)) return;
      arrowRotateSide = side;
      suppressClick = true;
      el.setPointerCapture(event.pointerId);
      el.classList.add("rotate-hint--active");
    });

    const releaseArrow = (event) => {
      arrowRotateSide = null;
      el.classList.remove("rotate-hint--active");
      if (el.hasPointerCapture(event.pointerId)) {
        el.releasePointerCapture(event.pointerId);
      }
    };

    el.addEventListener("pointerup", (event) => {
      stopArrow(event);
      releaseArrow(event);
    });
    el.addEventListener("pointercancel", releaseArrow);
    el.addEventListener("lostpointercapture", () => {
      arrowRotateSide = null;
      el.classList.remove("rotate-hint--active");
    });
  }

  if (rotationHints) {
    for (const side of ROTATE_HINT_SIDES) {
      bindRotationHint(rotationHints.icons[side], side);
    }
  }

  function applyArrowRotation(entry) {
    if (!arrowRotateSide || isBookOpened(entry)) return;
    switch (arrowRotateSide) {
      case "left":
        entry.focusYaw -= ARROW_ROTATE_SPEED;
        break;
      case "right":
        entry.focusYaw += ARROW_ROTATE_SPEED;
        break;
      case "top":
        entry.focusPitch -= ARROW_ROTATE_SPEED;
        break;
      case "bottom":
        entry.focusPitch += ARROW_ROTATE_SPEED;
        break;
      default:
        break;
    }
    entry.focusPitch = THREE.MathUtils.clamp(
      entry.focusPitch,
      -Math.PI * 0.42,
      Math.PI * 0.42
    );
  }

  function resetFocusRotation(entry) {
    if (!entry) return;
    entry.focusYaw = 0;
    entry.focusYawTarget = 0;
    entry.focusPitch = 0;
    entry.focusPitchTarget = null;
    resetBookOpen(entry);
  }

  function setActiveIndex(index) {
    if (activeIndex >= 0 && activeIndex !== index) {
      const prev = bookEntries[activeIndex];
      if (isGameBoxEntry(prev) && prev.openTarget > 0.5) {
        beginGamesClose(prev, { keepActive: index >= 0 });
      } else {
        resetFocusRotation(prev);
      }
    }
    activeIndex = index;
    if (index >= 0) {
      const entry = bookEntries[index];
      if (isGameBoxEntry(entry)) {
        entry.openTarget = 0;
        entry.paperTarget = 0;
        entry.focusYawTarget = 0;
        entry.focusPitchTarget = 0;
      }
    }
    refreshHighlights();
  }

  function setHighlight(entry, hovered, active) {
    entry.highlight.spine.emissive.setHex(
      active || hovered ? HOVER_EMISSIVE : 0x000000
    );
    entry.highlight.cover.emissive.setHex(hovered ? 0x151515 : 0x000000);
  }

  function refreshHighlights() {
    for (let i = 0; i < bookEntries.length; i++) {
      setHighlight(bookEntries[i], i === hoveredIndex, i === activeIndex);
    }
  }

  function setPointerFromEvent(event) {
    const rect = domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickBook() {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(pickables, false);
    if (!hits.length) return -1;

    // If a book is already open, only allow clicking on that book or empty space
    if (activeIndex >= 0) {
      for (const hit of hits) {
        const bookIndex = hit.object.userData.bookIndex ?? -1;
        if (bookIndex === activeIndex) {
          return bookIndex;
        }
      }
      // Clicked on a different book while one is open — ignore it
      return -1;
    }

    return hits[0].object.userData.bookIndex ?? -1;
  }

  // True if the pointer is currently over the hanging badge card.
  function pickBadge() {
    if (!badge) return false;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(badge.card, false);
    return hits.length > 0;
  }

  function onPointerMove(event) {
    setPointerFromEvent(event);

    // Dragging the badge: vertical drag extends/retracts the reel cord, horizontal swings it.
    if (draggingBadge && badge) {
      lastDragX = event.clientX;
      lastDragY = event.clientY;
      badge.swing.extend = THREE.MathUtils.clamp(
        badgeDragStartExtend +
          (event.clientY - badgeDragStartY) * BADGE_DRAG_EXTEND_SENS,
        BADGE_MIN_EXTEND,
        BADGE_MAX_EXTEND
      );
      badge.swing.extendVel = 0;
      badge.swing.angle = THREE.MathUtils.clamp(
        badgeDragStartAngle + (event.clientX - badgeDragStartX) * BADGE_DRAG_ANGLE_SENS,
        -BADGE_DRAG_MAX_ANGLE,
        BADGE_DRAG_MAX_ANGLE
      );
      badge.swing.vel = 0;
      badge.pivot.rotation.z = badge.swing.angle;
      layoutBadge(badge);
      suppressClick = true;
      return;
    }

    if (pointerDown && activeIndex >= 0) {
      const entry = bookEntries[activeIndex];
      if (entry.focusAmount > FOCUS_ROTATE_MIN && !isBookOpened(entry)) {
        const dx = event.clientX - pointerDownX;
        const dy = event.clientY - pointerDownY;
        if (!dragRotate && dx * dx + dy * dy > DRAG_CLICK_THRESHOLD * DRAG_CLICK_THRESHOLD) {
          dragRotate = true;
          domElement.style.cursor = "grabbing";
        }
        if (dragRotate) {
          const deltaX = event.clientX - lastDragX;
          const deltaY = event.clientY - lastDragY;
          entry.focusYaw += deltaX * ROTATE_SENSITIVITY;
          entry.focusPitch = THREE.MathUtils.clamp(
            entry.focusPitch + deltaY * ROTATE_SENSITIVITY,
            -Math.PI * 0.42,
            Math.PI * 0.42
          );
          suppressClick = true;
          lastDragX = event.clientX;
          lastDragY = event.clientY;
          return;
        }
      }
    }

    hoveredIndex = pickBook();
    refreshHighlights();
    if (!dragRotate) {
      const active = activeIndex >= 0 ? bookEntries[activeIndex] : null;
      const canRotate =
        active &&
        hoveredIndex === activeIndex &&
        active.focusAmount > FOCUS_ROTATE_MIN &&
        !isBookOpened(active);
      const overBadge = hoveredIndex < 0 && pickBadge();
      domElement.style.cursor = canRotate
        ? "grab"
        : overBadge
          ? "grab"
          : hoveredIndex >= 0
            ? "pointer"
            : "default";
    }
  }

  function onPointerLeave() {
    if (dragRotate) return;
    hoveredIndex = -1;
    refreshHighlights();
    domElement.style.cursor = "default";
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;
    setPointerFromEvent(event);
    pointerDown = true;
    dragRotate = false;
    suppressClick = false;
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
    lastDragX = event.clientX;
    lastDragY = event.clientY;

    // Badge takes priority: drag down to pull it out (reel extends), release to retract.
    // A plain click gives it a little tug + sway.
    if (pickBadge() && badge) {
      draggingBadge = true;
      badgeDragStartX = event.clientX;
      badgeDragStartY = event.clientY;
      badgeDragStartAngle = badge.swing.angle;
      badgeDragStartExtend = badge.swing.extend;
      domElement.setPointerCapture(event.pointerId);
      domElement.style.cursor = "grabbing";
      return;
    }

    const clicked = pickBook();
    if (
      activeIndex >= 0 &&
      clicked === activeIndex &&
      bookEntries[activeIndex].focusAmount > FOCUS_ROTATE_MIN &&
      !isBookOpened(bookEntries[activeIndex])
    ) {
      domElement.setPointerCapture(event.pointerId);
    }
  }

  function onPointerUp(event) {
    if (event.button !== 0) return;

    const wasDragging = dragRotate;
    const wasBadge = draggingBadge;
    pointerDown = false;
    dragRotate = false;
    draggingBadge = false;

    if (domElement.hasPointerCapture(event.pointerId)) {
      domElement.releasePointerCapture(event.pointerId);
    }

    if (wasBadge) {
      domElement.style.cursor = "default";
      return; // badge interaction consumed this gesture
    }

    if (wasDragging || suppressClick) {
      suppressClick = false;
      onPointerMove(event);
      return;
    }

    setPointerFromEvent(event);
    const clicked = pickBook();
    if (clicked < 0) {
      // Don't auto-close the book when clicking off. Only close via the "Close book" button.
      domElement.style.cursor = "default";
      return;
    }

    const clickedEntry = bookEntries[clicked];
    if (activeIndex === clicked) {
      if (isGameBoxEntry(clickedEntry) && isBookOpened(clickedEntry)) {
        closeGamesView();
      } else if (!isBookOpened(clickedEntry)) {
        resetFocusRotation(clickedEntry);
        setActiveIndex(-1);
      }
    } else if (activeIndex !== clicked) {
      setActiveIndex(clicked);
    }

    onPointerMove(event);
  }

  domElement.addEventListener("pointerdown", onPointerDown);
  domElement.addEventListener("pointermove", onPointerMove);
  domElement.addEventListener("pointerup", onPointerUp);
  domElement.addEventListener("pointerleave", onPointerLeave);

  function computeFocusLocal(out) {
    unit.updateMatrixWorld(true);
    booksGroup.updateMatrixWorld(true);
    boundsExcludingFlagged(unit).getCenter(_unitCenter);
    camera.getWorldDirection(_camDir);
    const depth = _unitCenter.clone().sub(camera.position).dot(_camDir);
    _focusWorld.copy(camera.position).add(_camDir.multiplyScalar(depth * FOCUS_DEPTH_FACTOR));
    out.copy(_focusWorld);
    booksGroup.worldToLocal(out);
    return out;
  }

  function getStackEntry(id) {
    return bookEntries.find((entry) => entry.section.id === id);
  }

  function stackStride(entry) {
    if (!entry) return 0;
    let stride = entry.stackThickness;
    if (entry.section.id === "games") stride += GAME_BOX_STACK_EXTRA;
    return stride;
  }

  function computeFullStackY(id) {
    let y = 0;
    for (const stackId of HORIZONTAL_STACK) {
      const entry = getStackEntry(stackId);
      if (!entry) continue;
      if (stackId === id) return y + entry.stackThickness / 2;
      y += stackStride(entry);
    }
    return y;
  }

  function computeCollapsedStackY(id) {
    let y = 0;
    for (const stackId of HORIZONTAL_STACK) {
      const entry = getStackEntry(stackId);
      if (!entry) continue;
      if (stackId === id) return y + entry.stackThickness / 2;
      if (entry.focusAmount < ON_SHELF_THRESHOLD) y += stackStride(entry);
    }
    return y;
  }

  function stackTopBelowIntro() {
    let y = 0;
    for (const stackId of ["games", "adventures"]) {
      const entry = getStackEntry(stackId);
      if (entry && entry.focusAmount < ON_SHELF_THRESHOLD) y += stackStride(entry);
    }
    return y;
  }

  function recomputeIntroRestPositions(leanEntry) {
    const meta = leanEntry.stackMeta;
    if (!meta) return;

    const stackTopY = stackTopBelowIntro();
    const { variant, aboutVariant, indexVariant, stackLeft, stackWidth, aboutBookIndex, aboutLeftEdge } =
      meta;
    const aboutSupporting =
      aboutEntry && aboutEntry.focusAmount < ABOUT_SUPPORT_THRESHOLD;

    if (aboutBookIndex >= 0 && !leanEntry.hasFallen && aboutSupporting) {
      const lean = computeLeanBookTransform(
        variant,
        aboutVariant,
        indexVariant,
        stackLeft,
        stackTopY,
        stackWidth
      );
      leanEntry.leanRestPos.set(lean.pivotX, lean.pivotY, leanEntry.leanRestPos.z);
      leanEntry.leanRestRotation = -lean.leanAngle;
    }

    const contactY = stackTopY + 0.004;
    const aboutOffShelf =
      aboutEntry && aboutEntry.focusAmount >= ABOUT_SUPPORT_THRESHOLD;

    if (leanEntry.hasFallen || !leanEntry.hasBeenPushed || aboutOffShelf) {
      syncIntroFallenRestPos(leanEntry, contactY, aboutLeftEdge, aboutVariant);
      syncIntroAboutTouchRestPos(leanEntry, contactY, aboutLeftEdge);
      syncIntroPushedRestPos(leanEntry, aboutLeftEdge);
    } else {
      leanEntry.fallenRestPos.y = contactY;
      leanEntry.aboutTouchRestPos.y = contactY;
      leanEntry.pushedRestPos.y = contactY;
    }
  }

  function updateHorizontalStack() {
    for (const stackId of HORIZONTAL_STACK) {
      const entry = getStackEntry(stackId);
      if (!entry) continue;

      if (stackId === "intro") continue;

      const targetY =
        entry.focusAmount < ON_SHELF_THRESHOLD
          ? computeCollapsedStackY(stackId)
          : computeFullStackY(stackId);

      if (entry.focusAmount < ON_SHELF_THRESHOLD) {
        entry.restPos.y += (targetY - entry.restPos.y) * STACK_DROP_LERP;
      } else {
        entry.restPos.y = targetY;
      }
    }

    if (leanEntryRef) recomputeIntroRestPositions(leanEntryRef);
  }

  function updateLeanBookSupport(leanEntry) {
    if (!leanEntry?.leanRestPos) return;

    const aboutOnShelf =
      aboutEntry && aboutEntry.focusAmount < ABOUT_SUPPORT_THRESHOLD;
    const adventuresEntry = getStackEntry("adventures");
    const adventuresOnShelf =
      adventuresEntry && adventuresEntry.focusAmount < ON_SHELF_THRESHOLD;
    const canSupportLean = aboutOnShelf && adventuresOnShelf;
    const fallTargetPos = aboutOnShelf ? leanEntry.aboutTouchRestPos : leanEntry.fallenRestPos;

    if (!leanEntry.hasFallen && !canSupportLean) {
      if (!aboutOnShelf) leanEntry.inAboutGap = true;

      const delta = leanEntry.fallenRestRotation - leanEntry.fallAngle;
      leanEntry.angularVelocity += delta * LEAN_GRAVITY;
      leanEntry.angularVelocity *= LEAN_FRICTION;
      leanEntry.fallAngle += leanEntry.angularVelocity;

      if (leanEntry.fallAngle <= leanEntry.fallenRestRotation + LEAN_ANGLE_EPS) {
        leanEntry.fallAngle = leanEntry.fallenRestRotation;
        leanEntry.angularVelocity = 0;
        leanEntry.hasFallen = true;
      }

      leanEntry.restRotation = leanEntry.fallAngle;
      const fallT = fallProgress(leanEntry);
      leanEntry.restPos.lerpVectors(leanEntry.leanRestPos, fallTargetPos, fallT);
      return;
    }

    if (leanEntry.hasFallen) {
      leanEntry.fallAngle = leanEntry.fallenRestRotation;
      leanEntry.restRotation = leanEntry.fallenRestRotation;
      leanEntry.angularVelocity = 0;

      if (!aboutOnShelf) {
        if (leanEntry.inAboutGap) {
          leanEntry.restPos.copy(
            leanEntry.hasBeenPushed ? leanEntry.pushedRestPos : leanEntry.fallenRestPos
          );
        } else {
          leanEntry.restPos.copy(leanEntry.aboutTouchRestPos);
        }
      } else if (leanEntry.hasBeenPushed) {
        leanEntry.restPos.copy(leanEntry.pushedRestPos);
      } else if (leanEntry.inAboutGap) {
        const pushT = THREE.MathUtils.clamp(1 - aboutEntry.focusAmount, 0, 1);
        leanEntry.restPos.lerpVectors(leanEntry.fallenRestPos, leanEntry.pushedRestPos, pushT);
        if (pushT >= 1 - 1e-4) leanEntry.hasBeenPushed = true;
      } else {
        leanEntry.restPos.copy(leanEntry.aboutTouchRestPos);
      }

      leanEntry.restPos.y = leanEntry.aboutTouchRestPos.y;
      return;
    }

    leanEntry.fallAngle = leanEntry.leanRestRotation;
    leanEntry.restRotation = leanEntry.leanRestRotation;
    leanEntry.restPos.copy(leanEntry.leanRestPos);
    leanEntry.angularVelocity = 0;
  }

  function animateSlides(delta = 1 / 60) {
    stepBadgeSwing(badge, draggingBadge);
    for (let i = 0; i < bookEntries.length; i++) {
      const entry = bookEntries[i];
      const isActive = i === activeIndex;
      const targetFocus = isActive ? 1 : 0;
      const focusDamp =
        gamesClosePending && isGameBoxEntry(entry) && !isActive ? GAMES_CLOSE_FOCUS_DAMP : FOCUS_DAMP;
      entry.focusAmount = THREE.MathUtils.damp(entry.focusAmount, targetFocus, focusDamp, delta);
      entry.focusYaw = THREE.MathUtils.damp(
        entry.focusYaw,
        entry.focusYawTarget,
        OPEN_ORIENT_DAMP,
        delta
      );
      if (entry.focusPitchTarget != null) {
        entry.focusPitch = THREE.MathUtils.damp(
          entry.focusPitch,
          entry.focusPitchTarget,
          OPEN_ORIENT_DAMP,
          delta
        );
      }
      animateBookOpen(entry, delta);
    }

    updateGamesOverlayVisual();
    finishGamesCloseIfNeeded();

    updateHorizontalStack();
    if (leanEntryRef) updateLeanBookSupport(leanEntryRef);
    computeFocusLocal(_focusLocal);

    if (activeIndex >= 0) {
      const activeEntry = bookEntries[activeIndex];
      if (activeEntry.focusAmount > FOCUS_ROTATE_MIN && !isBookOpened(activeEntry)) {
        applyArrowRotation(activeEntry);
      }
    }

    for (let i = 0; i < bookEntries.length; i++) {
      const entry = bookEntries[i];
      const isActive = i === activeIndex;

      if (entry.focusAmount > 0.0005) {
        const focusT = entry.focusAmount;
        const baseZ = isGameBoxEntry(entry)
          ? entry.restRotation
          : THREE.MathUtils.lerp(entry.restRotation, 0, focusT);
        _focusEuler.set(entry.focusPitch * focusT, entry.focusYaw * focusT, baseZ, "YXZ");
        entry.group.rotation.copy(_focusEuler);
        getFocusGroupPos(entry.group, _focusLocal, _focusEuler, _focusGroupPos);
        entry.group.position.lerpVectors(entry.restPos, _focusGroupPos, focusT);
        if (isGameBoxEntry(entry) && entry.clickBump > 0.001) {
          entry.clickBump = THREE.MathUtils.damp(entry.clickBump, 0, 14, delta);
          entry.group.position.lerp(_focusGroupPos, entry.clickBump * 0.11 * focusT);
        }
        entry.mesh.renderOrder = focusT > 0.4 ? 2 : 0;
      } else if (entry.section.id === "intro") {
        entry.group.rotation.z = entry.restRotation;
        const aboutOffShelf =
          aboutEntry && aboutEntry.focusAmount >= ABOUT_SUPPORT_THRESHOLD;
        const adventuresEntry = getStackEntry("adventures");
        const adventuresOffShelf =
          adventuresEntry && adventuresEntry.focusAmount >= ON_SHELF_THRESHOLD;
        const falling = !entry.hasFallen && (aboutOffShelf || adventuresOffShelf);
        const settle =
          entry.hasFallen &&
          entry.inAboutGap &&
          !entry.hasBeenPushed &&
          aboutEntry &&
          aboutEntry.focusAmount > ABOUT_SUPPORT_THRESHOLD
            ? LEAN_PUSH_LERP
            : entry.focusAmount < ON_SHELF_THRESHOLD
              ? STACK_DROP_LERP
              : LEAN_SETTLE;
        entry.group.position.lerp(entry.restPos, falling ? 0.55 : settle);
        entry.mesh.renderOrder = aboutOffShelf || falling ? 3 : 0;
      } else if (entry.stackThickness != null) {
        entry.group.rotation.z = entry.restRotation;
        entry.group.position.lerp(entry.restPos, STACK_DROP_LERP);
        if (isGameBoxEntry(entry)) {
          entry.group.scale.set(1, 1, 1);
          if (entry.clickBump > 0.001) {
            entry.clickBump = THREE.MathUtils.damp(entry.clickBump, 0, 14, delta);
          }
        }
        entry.mesh.renderOrder = 0;
      } else {
        entry.group.position.lerp(entry.restPos, FOCUS_LERP);
        entry.group.rotation.z = THREE.MathUtils.lerp(
          entry.group.rotation.z,
          entry.restRotation,
          FOCUS_LERP
        );
        entry.mesh.renderOrder = 0;
      }
    }

    if (activeIndex >= 0) {
      const activeEntry = bookEntries[activeIndex];
      const hintOpacity =
        THREE.MathUtils.clamp(
          (activeEntry.focusAmount - FOCUS_ROTATE_MIN) / (1 - FOCUS_ROTATE_MIN),
          0,
          1
        ) * (dragRotate ? 0.4 : 1);
      const showRotateHints =
        activeEntry.focusAmount > FOCUS_ROTATE_MIN && !isBookOpened(activeEntry);
      updateRotationHints({
        hints: rotationHints,
        opacity: showRotateHints ? hintOpacity : 0,
      });
      updateOpenBookButton(activeEntry);
    } else {
      updateRotationHints({ hints: rotationHints, opacity: 0 });
      updateOpenBookButton(null);
    }
  }

  function dispose() {
    domElement.removeEventListener("pointerdown", onPointerDown);
    domElement.removeEventListener("pointermove", onPointerMove);
    domElement.removeEventListener("pointerup", onPointerUp);
    domElement.removeEventListener("pointerleave", onPointerLeave);
    rotationHints?.root.remove();
    openBookBtn.remove();
    pageNav.root.remove();
    projectsOverlay.remove();
    gamesOverlay.remove();
  }

  function clearActive() {
    if (activeIndex >= 0) resetFocusRotation(bookEntries[activeIndex]);
    setActiveIndex(-1);
  }

  return { unit, animateSlides, dispose, clearActive };
}
