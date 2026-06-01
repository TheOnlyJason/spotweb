import * as THREE from "three";

/** Softer, desaturated tints for book materials. */
export function softenColor(hex) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 0.68, hsl.l * 0.52 + 0.28);
  return `#${c.getHexString()}`;
}

export function spineEdgeColor(hex) {
  const c = new THREE.Color(softenColor(hex));
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s * 1.05, hsl.l * 0.72);
  return `#${c.getHexString()}`;
}
