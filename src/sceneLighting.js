import * as THREE from "three";

export function createSceneLighting({ scene, ambient, key, rim }) {
  const bgRest = new THREE.Color(0x030303);
  const bgDim = new THREE.Color(0x010102);
  const _bg = new THREE.Color();

  return {
    setGamesFocus(t) {
      const u = THREE.MathUtils.clamp(t, 0, 1);
      ambient.intensity = THREE.MathUtils.lerp(0.38, 0.09, u);
      key.intensity = THREE.MathUtils.lerp(1.55, 0.32, u);
      rim.intensity = THREE.MathUtils.lerp(0.22, 0.05, u);
      _bg.copy(bgRest).lerp(bgDim, u);
      scene.background = _bg;
    },
  };
}
