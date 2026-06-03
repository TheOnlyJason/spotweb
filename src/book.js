import * as THREE from "three";
import {
  createLinenCoverMaterial,
  createLinenSpineMaterial,
} from "./linenTextures.js";
import { softenColor } from "./colors.js";
import { drawSpineBackground, drawSpineLabel } from "./spineText.js";

export const BOOK_WIDTH = 0.72;
export const BOOK_HEIGHT = 1.02;
export const BOOK_SPINE = 0.13;
const COVER_BOARD_RATIO = 0.1;
const COVER_BOARD_MIN = 0.011;
const PAGE_INSET_Y_RATIO = 0.014;
const PAGE_INSET_FORE_RATIO = 0.016;
const PAGE_INSET_MIN = 0.006;

const HEIGHT_SCALE = [0.94, 1.02, 0.97, 1.06, 0.99];
const THICKNESS_SCALE = [0.92, 1.14, 0.88, 1.08, 1.02];
const DEPTH_SCALE = [1, 0.96, 1.04, 0.93, 1.01];

function createPagesTexture() {
  const w = 256;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f3ede3";
  ctx.fillRect(0, 0, w, h);

  for (let x = 0; x < w; x += 2 + Math.floor(Math.random() * 2)) {
    const shade = 178 + Math.floor(Math.random() * 28);
    ctx.strokeStyle = `rgba(${shade}, ${shade - 10}, ${shade - 20}, 0.55)`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(0, 0, w * 0.035, h);
  ctx.fillStyle = "rgba(100, 85, 65, 0.1)";
  ctx.fillRect(w * 0.965, 0, w * 0.035, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.6, 1);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

function createPagesMaterial() {
  const mat = new THREE.MeshLambertMaterial({
    map: createPagesTexture(),
    color: 0xf8f4ec,
  });
  mat.emissive = new THREE.Color(0x000000);
  return mat;
}

function createSpineMaterial(color, spineLabel, linen, { flipLabel = false } = {}) {
  const tint = softenColor(color);

  if (linen && spineLabel) {
    return createLinenSpineMaterial(linen, tint, spineLabel, { flipLabel });
  }

  const w = 512;
  const h = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  drawSpineBackground(ctx, w, h, tint);
  if (spineLabel) drawSpineLabel(ctx, w, h, spineLabel, { flip: flipLabel });

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.generateMipmaps = true;
  map.minFilter = THREE.LinearMipmapLinearFilter;

  const mat = new THREE.MeshLambertMaterial({ map });
  mat.emissive = new THREE.Color(0x000000);
  return mat;
}

function createCoverMaterial(color, linen) {
  const tint = softenColor(color);
  if (linen) return createLinenCoverMaterial(linen, tint);
  const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(tint) });
  mat.emissive = new THREE.Color(0x000000);
  return mat;
}


export function bookVariant(index) {
  const i = index % 5;
  return {
    height: BOOK_HEIGHT * HEIGHT_SCALE[i],
    thickness: BOOK_SPINE * THICKNESS_SCALE[i],
    depth: BOOK_WIDTH * DEPTH_SCALE[i],
  };
}

export function createBook(options = {}) {
  const {
    color = "#6c5ce7",
    spineLabel = "",
    linen = null,
    height = BOOK_HEIGHT,
    thickness = BOOK_SPINE,
    depth = BOOK_WIDTH,
    depthTaper = 1,
    position = new THREE.Vector3(0, 0, 0),
    rotationZ = 0,
    spineOut = true,
    flipSpineLabel = false,
  } = options;

  const depthScaled = depth * depthTaper;
  const group = new THREE.Group();

  const coverMat = createCoverMaterial(color, linen);
  const spineMat = createSpineMaterial(color, spineLabel, linen, {
    flipLabel: flipSpineLabel,
  });
  const pagesMat = createPagesMaterial();
  const backMat = pagesMat.clone();

  if (spineOut) {
    const coverBoard = Math.max(COVER_BOARD_MIN, thickness * COVER_BOARD_RATIO);
    const pageWidth = Math.max(thickness - coverBoard * 2, thickness * 0.76);
    const pageInsetY = Math.max(PAGE_INSET_MIN, height * PAGE_INSET_Y_RATIO);
    const pageInsetFore = Math.max(PAGE_INSET_MIN, depthScaled * PAGE_INSET_FORE_RATIO);
    const pageHeight = Math.max(height - pageInsetY * 2, height * 0.94);
    const pageDepth = Math.max(depthScaled - pageInsetFore, depthScaled * 0.94);
    const hingeZ = depthScaled / 2;

    // All hinges pivot at the GUTTER (x = 0) so the two halves meet in the middle
    // when open — no see-through gap at the spine.
    const N_HALF = Math.max(1, Math.floor(N_PAGE_LAYERS / 2));
    const halfChunkThick = (pageWidth / 2) / N_HALF;
    const pageCenterZ = -depthScaled / 2 + pageInsetFore / 2;
    const frontPagePivots = [];
    const backPagePivots = [];

    for (let i = 0; i < N_HALF; i++) {
      // i = 0 is the innermost layer (at the gutter); higher i is nearer the cover.
      // Outer layers are slightly shorter in depth so their fore-edges step → visible
      // page strata for a layered 3D look.
      const layerDepth = pageDepth * (1 - i * LAYER_DEPTH_STEP);
      // Innermost layer overhangs the gutter slightly so both halves overlap (no seam).
      const overlap = i === 0 ? GUTTER_OVERLAP : 0;
      const chunkW = halfChunkThick + overlap;

      const fPivot = new THREE.Group();
      fPivot.position.set(0, 0, hingeZ);
      const fChunk = new THREE.Mesh(
        new THREE.BoxGeometry(chunkW, pageHeight, layerDepth),
        pagesMat
      );
      // Front side occupies x ∈ [0, +pageWidth/2]; shift center toward gutter by overlap.
      fChunk.position.set((i + 0.5) * halfChunkThick - overlap / 2, 0, pageCenterZ);
      fPivot.add(fChunk);
      group.add(fPivot);
      frontPagePivots.push(fPivot);

      const bPivot = new THREE.Group();
      bPivot.position.set(0, 0, hingeZ);
      const bChunk = new THREE.Mesh(
        new THREE.BoxGeometry(chunkW, pageHeight, layerDepth),
        pagesMat
      );
      // Back side occupies x ∈ [-pageWidth/2, 0].
      bChunk.position.set(-((i + 0.5) * halfChunkThick - overlap / 2), 0, pageCenterZ);
      bPivot.add(bChunk);
      group.add(bPivot);
      backPagePivots.push(bPivot);
    }

    // Dedicated spine-face strip so the full-width label stays visible when closed.
    // Positioned just at the +z face of the page block.
    const spineStrip = new THREE.Mesh(
      new THREE.BoxGeometry(pageWidth, pageHeight, 0.002),
      [pagesMat, pagesMat, pagesMat, pagesMat, spineMat, backMat]
    );
    spineStrip.position.set(0, 0, pageInsetFore / 2 + pageDepth / 2 + 0.001);
    group.add(spineStrip);

    // Covers hinge at the gutter and are sized to the page block so they sit FLUSH with
    // the pages (no proud top/fore edges that would read as floating "flaps").
    const frontCoverPivot = new THREE.Group();
    frontCoverPivot.position.set(0, 0, hingeZ);
    const frontCover = new THREE.Mesh(
      new THREE.BoxGeometry(coverBoard, pageHeight, pageDepth),
      coverMat
    );
    frontCover.position.set(pageWidth / 2 + coverBoard / 2, 0, pageCenterZ);
    frontCoverPivot.add(frontCover);

    const backCoverPivot = new THREE.Group();
    backCoverPivot.position.set(0, 0, hingeZ);
    const backCover = new THREE.Mesh(
      new THREE.BoxGeometry(coverBoard, pageHeight, pageDepth),
      coverMat
    );
    backCover.position.set(-(pageWidth / 2 + coverBoard / 2), 0, pageCenterZ);
    backCoverPivot.add(backCover);

    // Create two separate hit volumes (front and back) so the spine is not clickable.
    // Front half: from center to right edge (pages + front cover)
    const frontHalfWidth = pageWidth / 2 + coverBoard;
    const frontHitVolume = new THREE.Mesh(
      new THREE.BoxGeometry(frontHalfWidth, height, depthScaled),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    frontHitVolume.position.x = frontHalfWidth / 2;

    // Back half: from center to left edge (pages + back cover)
    const backHalfWidth = pageWidth / 2 + coverBoard;
    const backHitVolume = new THREE.Mesh(
      new THREE.BoxGeometry(backHalfWidth, height, depthScaled),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    backHitVolume.position.x = -backHalfWidth / 2;

    // Group the hit volumes so they move together
    const hitVolumeGroup = new THREE.Group();
    hitVolumeGroup.add(frontHitVolume, backHitVolume);

    // --- Premium page-turn: a curling, double-sided shader leaf hinged at the spine.
    // It lies flat over a page when at rest and bends/rotates about the spine (Y axis)
    // through the turn. Hidden until a turn is in progress.
    // The reading face points toward -z (spine faces away after the 180° flip), so the
    // leaf sits just in front of the pages on the -z side and bulges toward the camera.
    const leafLen = pageDepth;
    const turnPivot = new THREE.Group();
    turnPivot.position.set(0, 0, hingeZ - 0.012);
    const leafGeo = new THREE.PlaneGeometry(leafLen, pageHeight, 48, 1);
    leafGeo.translate(leafLen / 2, 0, 0); // hinge at x = 0, page extends +x
    const turnLeaf = new THREE.Mesh(leafGeo, createPageTurnMaterial(leafLen));
    turnLeaf.visible = false;
    turnLeaf.frustumCulled = false;
    turnLeaf.userData.noBounds = true; // exclude from shelf-fit bounds (it's oversized/hidden)
    turnPivot.add(turnLeaf);
    group.add(turnPivot);

    // Permanent soft shadow in the gutter to give the spine depth.
    const creaseShadow = createCreaseShadow(pageHeight, pageWidth);
    creaseShadow.position.set(0, 0, hingeZ - 0.014);
    creaseShadow.visible = false;
    creaseShadow.userData.noBounds = true;
    group.add(creaseShadow);

    const bookParts = {
      frontCoverPivot,
      backCoverPivot,
      frontPagePivots,
      backPagePivots,
      spineStrip,
      turnLeaf,
      creaseShadow,
      leafLen,
    };

    group.add(frontCoverPivot, backCoverPivot, hitVolumeGroup);
    group.position.copy(position);
    group.rotation.z = rotationZ;

    return {
      group,
      mesh: frontHitVolume, // Keep single mesh for backward compatibility
      meshes: [frontHitVolume, backHitVolume],
      highlight: { spine: spineMat, cover: coverMat },
      bookParts,
    };
  }

  const hitVolume = new THREE.Mesh(
    new THREE.BoxGeometry(thickness, height, depthScaled),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  group.add(hitVolume);
  group.position.copy(position);
  group.rotation.z = rotationZ;
  return { group, mesh: hitVolume, highlight: { spine: spineMat, cover: coverMat } };
}

// Open to ~88° so covers lie nearly flat like a real open book.
const OPEN_ANGLE_MAX = Math.PI * 0.489;
const N_PAGE_LAYERS = 6;
// All page layers share the same depth so the closed book has a clean, flush top
// (stepped depths created jagged "peaks" at the page-block corners).
const LAYER_DEPTH_STEP = 0;
// Innermost layer overhangs the gutter by this much so the two halves overlap.
const GUTTER_OVERLAP = 0.006;
// Pages open slightly less than the covers so they tent toward the viewer, hiding the
// gutter seam and the covers behind them.
const PAGE_TENT = 0.06;

// Portrait canvas roughly matching the page face aspect (height : depth).
const PAGE_W = 760;
const PAGE_H = 1024;
const PAGE_PAD = 56;
const PAGE_INK = "#2b2b2b";
const PAGE_PAPER = "#f5efe2";
const BULLET_INDENT = 26;

const _measureCanvas =
  typeof document !== "undefined" ? document.createElement("canvas") : null;
const _measureCtx = _measureCanvas ? _measureCanvas.getContext("2d") : null;

// Break a logical line into wrapped display rows for the given font.
function wrapText(ctx, text, font, maxWidth, indent) {
  ctx.font = font;
  const avail = maxWidth - indent;
  const words = text.split(/\s+/).filter(Boolean);
  const rows = [];
  let cur = "";

  const pushWord = (w) => {
    // Hard-break a single word that's wider than the line (e.g. a long URL).
    if (ctx.measureText(w).width <= avail) return [w];
    const parts = [];
    let chunk = "";
    for (const ch of w) {
      if (ctx.measureText(chunk + ch).width > avail && chunk) {
        parts.push(chunk);
        chunk = ch;
      } else {
        chunk += ch;
      }
    }
    if (chunk) parts.push(chunk);
    return parts;
  };

  for (const word of words) {
    for (const piece of pushWord(word)) {
      const test = cur ? `${cur} ${piece}` : piece;
      if (ctx.measureText(test).width > avail && cur) {
        rows.push(cur);
        cur = piece;
      } else {
        cur = test;
      }
    }
  }
  if (cur) rows.push(cur);
  return rows.length ? rows : [""];
}

// Build display rows (text + style + spacing) for a section at a given font size.
function buildRows(section, fontSize, includeTitle) {
  const ctx = _measureCtx;
  const maxWidth = PAGE_W - PAGE_PAD * 2;
  const lh = Math.round(fontSize * 1.5);
  const body = `${fontSize}px Inter, sans-serif`;
  const bold = `600 ${fontSize}px Inter, sans-serif`;
  const titleSize = Math.round(fontSize * 1.7);
  const titleFont = `600 ${titleSize}px Inter, sans-serif`;
  const rows = [];

  if (includeTitle) {
    for (const l of wrapText(ctx, section.title, titleFont, maxWidth, 0)) {
      rows.push({ text: l, x: PAGE_PAD, font: titleFont, h: Math.round(titleSize * 1.35) });
    }
    rows.push({ gap: Math.round(lh * 0.55) });
  }

  const raw = section.body.split("\n");
  for (let line of raw) {
    line = line.replace(/\s+$/, "");
    if (!line.trim()) {
      rows.push({ gap: Math.round(lh * 0.5) });
      continue;
    }
    if (line.startsWith("- ")) {
      const wrapped = wrapText(ctx, line.slice(2), body, maxWidth, BULLET_INDENT);
      wrapped.forEach((l, i) => {
        rows.push({
          text: i === 0 ? `•  ${l}` : l,
          x: i === 0 ? PAGE_PAD : PAGE_PAD + BULLET_INDENT,
          font: body,
          h: lh,
        });
      });
    } else {
      // Treat role/project/date headers (em dash, colon-terminated) as bold.
      const isHead = line.includes(" — ") || /:\s*$/.test(line);
      const font = isHead ? bold : body;
      if (isHead) rows.push({ gap: Math.round(lh * 0.25) });
      for (const l of wrapText(ctx, line, font, maxWidth, 0)) {
        rows.push({ text: l, x: PAGE_PAD, font, h: lh });
      }
    }
  }
  return rows;
}

function rowsHeight(rows) {
  return rows.reduce((sum, r) => sum + (r.gap ?? r.h), 0);
}

// Split rows into pages that each fit within the usable page height.
function paginate(rows, usableHeight) {
  const pages = [];
  let cur = [];
  let h = 0;
  for (const r of rows) {
    const rh = r.gap ?? r.h;
    if (h + rh > usableHeight && cur.length) {
      pages.push(cur);
      cur = [];
      h = 0;
      if (r.gap) continue; // don't start a page with a blank gap
    }
    cur.push(r);
    h += rh;
  }
  if (cur.length) pages.push(cur);
  return pages;
}

// Lay out the section at a comfortable, readable font and paginate into as many
// spreads as needed (the reader flips pages with the on-screen arrows).
const PAGE_FONT_SIZE = 23;

function layoutSection(section) {
  const usable = PAGE_H - PAGE_PAD * 2;
  const rows = buildRows(section, PAGE_FONT_SIZE, true);
  const pages = paginate(rows, usable);
  return { fontSize: PAGE_FONT_SIZE, pages };
}

function renderPage(rows) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = PAGE_PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.fillStyle = PAGE_INK;
  ctx.textBaseline = "alphabetic";

  let y = PAGE_PAD;
  for (const r of rows) {
    if (r.gap) {
      y += r.gap;
      continue;
    }
    y += r.h;
    ctx.font = r.font;
    ctx.fillText(r.text, r.x, y - Math.round(r.h * 0.28));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 8;
  return texture;
}

// Render a photo onto a page (paper background, the image inset like a pasted-in print
// with a thin border and a caption). Returns the texture immediately and repaints once
// the image loads. `caption` is optional.
function renderPhotoPage(url, caption) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = 8;

  const paint = (img) => {
    ctx.fillStyle = PAGE_PAPER;
    ctx.fillRect(0, 0, PAGE_W, PAGE_H);

    // Frame area inside the page padding.
    const fx = PAGE_PAD;
    const fy = PAGE_PAD;
    const fw = PAGE_W - PAGE_PAD * 2;
    const fh = PAGE_H - PAGE_PAD * 2 - 64; // leave room for caption

    if (img) {
      // Contain the image within the frame, centered.
      const scale = Math.min(fw / img.width, fh / img.height);
      const iw = img.width * scale;
      const ih = img.height * scale;
      const ix = fx + (fw - iw) / 2;
      const iy = fy + (fh - ih) / 2;
      // white mat + subtle shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.28)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 8;
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(ix - 12, iy - 12, iw + 24, ih + 24);
      ctx.restore();
      ctx.drawImage(img, ix, iy, iw, ih);
      // thin border
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 2;
      ctx.strokeRect(ix, iy, iw, ih);
    }

    if (caption) {
      ctx.fillStyle = PAGE_INK;
      ctx.textAlign = "center";
      ctx.font = "600 30px Inter, sans-serif";
      ctx.fillText(caption, PAGE_W / 2, PAGE_H - PAGE_PAD - 8);
      ctx.textAlign = "left";
    }
    texture.needsUpdate = true;
  };

  paint(null); // immediate paper background while loading
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => paint(img);
  img.src = url;

  return texture;
}

// After the book rotates 180° to face the reader, the FRONT page stack appears on
// the LEFT and the BACK stack on the RIGHT. Flip this if it ever reads backwards.
const FRONT_IS_LEFT = true;
// Fraction of the flip completed per frame (~0.022 ≈ 0.75s — slow, deliberate turn).
const TURN_STEP = 0.022;
// Sign of the bulge toward the viewer (-1 = toward camera here). Flip if it bulges away.
const TURN_BULGE = -1;
// Max extra curl angle (radians) added at the free edge mid-flip.
const TURN_CURL = 0.55;
// Swap if the outgoing/incoming faces of the turning leaf appear reversed.
const LEAF_FACE_SWAP = false;

function leftPivots(bp) {
  return FRONT_IS_LEFT ? bp.frontPagePivots : bp.backPagePivots;
}
function rightPivots(bp) {
  return FRONT_IS_LEFT ? bp.backPagePivots : bp.frontPagePivots;
}

// The visible reading face is the topmost (index 0) layer on each side.
function topMesh(pivots) {
  return pivots?.[0]?.children?.[0] ?? null;
}

// A "page" is either an array of text rows, or a photo descriptor { photo, caption }.
function isPhotoPage(page) {
  return page && !Array.isArray(page) && typeof page === "object" && page.photo;
}

function pageTexture(page) {
  if (isPhotoPage(page)) return renderPhotoPage(page.photo, page.caption);
  return renderPage(page ?? []);
}

function pageMaterial(page) {
  if (page == null) return createPagesMaterial();
  return new THREE.MeshLambertMaterial({ map: pageTexture(page) });
}

// Cubic ease-in-out: slow start, fast through the arc, gentle settle.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Soft vertical gradient texture (transparent → dark → transparent) for the gutter.
function createCreaseShadow(pageHeight, pageWidth) {
  const w = 64;
  const h = 8;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0.0, "rgba(0,0,0,0)");
  grad.addColorStop(0.5, "rgba(0,0,0,0.32)");
  grad.addColorStop(1.0, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const creaseW = Math.max(pageWidth * 1.4, 0.05);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(creaseW, pageHeight * 0.99), mat);
  mesh.renderOrder = 3;
  return mesh;
}

// Double-sided shader leaf: curls and rotates about the spine, shows front/back pages,
// with diffuse shading, a specular crest highlight, and a contact shadow at the hinge.
function createPageTurnMaterial(leafLen) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uFront: { value: null },
      uBack: { value: null },
      uPhi: { value: 0 },
      uDir: { value: 1 },
      uBulge: { value: TURN_BULGE },
      uCurl: { value: TURN_CURL },
      uLen: { value: leafLen },
      uLight: { value: new THREE.Vector3(0.35, 0.55, 0.75).normalize() },
    },
    vertexShader: `
      uniform float uPhi, uDir, uBulge, uCurl, uLen;
      varying vec2 vUv;
      varying vec3 vN;
      varying float vT;
      void main() {
        float s = position.x;                 // 0 at spine .. uLen at free edge
        float t = clamp(s / max(uLen, 1e-4), 0.0, 1.0);
        float curl = uCurl * sin(uPhi) * t;    // extra bend, peaks mid-flip, grows outward
        float ang = uPhi + curl;
        float c = cos(ang), sn = sin(ang);
        vec3 p = vec3(uDir * s * c, position.y, uBulge * s * sn);
        // analytic tangent along s (ang varies with s) → surface normal
        float dAng = uCurl * sin(uPhi) / max(uLen, 1e-4);
        vec3 tang = normalize(vec3(uDir * (c - s * sn * dAng), 0.0, uBulge * (sn + s * c * dAng)));
        vN = normalize(vec3(-tang.z, 0.0, tang.x));
        vUv = uv;
        vT = t;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uFront, uBack;
      uniform float uPhi;
      uniform vec3 uLight;
      varying vec2 vUv;
      varying vec3 vN;
      varying float vT;
      void main() {
        vec3 col;
        if (gl_FrontFacing) {
          col = texture2D(uFront, vUv).rgb;
        } else {
          col = texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)).rgb;  // mirror the back face
        }
        vec3 N = normalize(vN);
        if (!gl_FrontFacing) N = -N;
        float diff = clamp(dot(N, normalize(uLight)), 0.0, 1.0);
        float light = 0.74 + 0.34 * diff;
        // specular crest highlight, strongest mid-flip
        float spec = pow(diff, 26.0) * 0.22 * sin(uPhi);
        // contact/ambient-occlusion shadow near the hinge during the flip
        float contact = mix(1.0, 0.8, sin(uPhi) * (1.0 - smoothstep(0.0, 0.32, vT)));
        col = col * light * contact + spec;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

// Render the current spread: left page = pages[spread], right page = pages[spread+1].
function renderSpread(bookParts) {
  const pages = bookParts._pages ?? [];
  const spread = bookParts._spread ?? 0;
  const left = topMesh(leftPivots(bookParts));
  const right = topMesh(rightPivots(bookParts));
  if (left) left.material = pageMaterial(pages[spread] ?? []);
  if (right) right.material = pageMaterial(pages[spread + 1] ?? null);
}

export function applyContentToPages(bookParts, section) {
  if (!bookParts?.frontPagePivots?.length) return;
  const { pages } = layoutSection(section);
  let allPages = pages.length ? pages : [[]];
  // If the section has a photo (e.g. the Jason book), show it on the opening spread:
  // photo on the left page, the intro text on the right.
  if (section.photo) {
    const photoPage = { photo: section.photo, caption: section.title };
    const firstText = allPages[0] ?? [];
    allPages = [photoPage, firstText, ...allPages.slice(1)];
  }
  bookParts._pages = allPages;
  bookParts._spread = 0;
  bookParts._turn = null;
  if (bookParts.turnLeaf) bookParts.turnLeaf.visible = false;
  if (bookParts.creaseShadow) bookParts.creaseShadow.visible = true;
  renderSpread(bookParts);
}

// Returns { spread, total } so the UI can show "Page X / Y" and enable arrows.
export function bookPageInfo(bookParts) {
  const total = bookParts?._pages?.length ?? 0;
  return { spread: bookParts?._spread ?? 0, total };
}

export function isBookTurning(bookParts) {
  return !!bookParts?._turn?.active;
}

// Begin a page-turn animation (dir = +1 next, -1 previous). Returns true if it started.
export function turnBookPage(bookParts, dir) {
  const pages = bookParts?._pages;
  const leaf = bookParts?.turnLeaf;
  if (!pages?.length || !leaf || bookParts._turn?.active) return false;
  const from = bookParts._spread ?? 0;
  const to = from + dir * 2;
  if (to < 0 || to >= pages.length) return false;

  const u = leaf.material.uniforms;
  if (dir > 0) {
    // Right page lifts and flips to the left. Front face = current right page; the back
    // becomes the new left page. The new right page is revealed beneath.
    u.uFront.value = pageTexture(pages[from + 1]);
    u.uBack.value = pageTexture(pages[to]);
    u.uDir.value = -1; // right side sits on the -x (back) side in local space
    const right = topMesh(rightPivots(bookParts));
    if (right) right.material = pageMaterial(pages[to + 1] ?? null);
  } else {
    // Left page lifts and flips to the right. Front face = current left page; the back
    // becomes the new right page. The new left page is revealed beneath.
    u.uFront.value = pageTexture(pages[from]);
    u.uBack.value = pageTexture(pages[to + 1]);
    u.uDir.value = 1; // left side sits on the +x (front) side in local space
    const left = topMesh(leftPivots(bookParts));
    if (left) left.material = pageMaterial(pages[to] ?? null);
  }
  if (LEAF_FACE_SWAP) {
    const tmp = u.uFront.value;
    u.uFront.value = u.uBack.value;
    u.uBack.value = tmp;
  }
  u.uPhi.value = 0;
  leaf.visible = true;

  bookParts._turn = { active: true, progress: 0, dir, to };
  return true;
}

// Advance an in-progress turn one frame. Returns true while still animating.
export function stepBookPageTurn(bookParts) {
  const turn = bookParts?._turn;
  if (!turn?.active) return false;
  const leaf = bookParts.turnLeaf;

  turn.progress = Math.min(1, turn.progress + TURN_STEP);
  const eased = easeInOutCubic(turn.progress);
  leaf.material.uniforms.uPhi.value = Math.PI * eased;

  if (turn.progress >= 1) {
    bookParts._spread = turn.to;
    leaf.visible = false;
    bookParts._turn = null;
    renderSpread(bookParts);
    return false;
  }
  return true;
}

export function clearPageContent(bookParts) {
  if (!bookParts?.frontPagePivots?.length) return;
  bookParts._pages = null;
  bookParts._spread = 0;
  bookParts._turn = null;
  if (bookParts.turnLeaf) bookParts.turnLeaf.visible = false;
  if (bookParts.creaseShadow) bookParts.creaseShadow.visible = false;
  const left = topMesh(leftPivots(bookParts));
  const right = topMesh(rightPivots(bookParts));
  if (left) left.material = createPagesMaterial();
  if (right) right.material = createPagesMaterial();
}

export function applyBookOpenAmount(bookParts, amount) {
  if (!bookParts) return;
  const angle = amount * OPEN_ANGLE_MAX;
  bookParts.frontCoverPivot.rotation.y = -angle;
  bookParts.backCoverPivot.rotation.y = angle;

  // Pages fan from the gutter: innermost layer (i=0) opens least, creating a subtle dome,
  // and all open a touch less than the covers so they sit in front of the cover seam.
  const N = bookParts.frontPagePivots.length;
  for (let i = 0; i < N; i++) {
    const tent = PAGE_TENT * (1 - i / Math.max(N - 1, 1));
    const pageAngle = angle * (1 - tent);
    bookParts.frontPagePivots[i].rotation.y = -pageAngle;
    bookParts.backPagePivots[i].rotation.y = pageAngle;
  }

  // Hide spine strip when open — it's only for the closed spine-label view.
  if (bookParts.spineStrip) {
    bookParts.spineStrip.visible = amount < 0.15;
  }
}
