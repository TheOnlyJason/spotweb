import * as THREE from "three";
import { createBookshelf } from "./bookshelf.js";

export function createScene(container, options = {}) {
  const {
    books = [],
    horizontalBooks = [],
    linen = null,
  } = options;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x030303);

  const camera = new THREE.PerspectiveCamera(
    48,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0.15, 1.45, 3.55);
  camera.lookAt(0.05, 0.58, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xf0f0f8, 0.38);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xfff8f0, 1.55);
  key.position.set(5, 11, 7);
  key.castShadow = false;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 24;
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -3;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xc8d4ff, 0.22);
  rim.position.set(-6, 4, -3);
  scene.add(rim);

  const floorShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 1.8),
    new THREE.ShadowMaterial({ opacity: 0.4 })
  );
  floorShadow.rotation.x = -Math.PI / 2;
  floorShadow.position.set(0.05, 0.015, 0.08);
  floorShadow.receiveShadow = true;
  scene.add(floorShadow);

  const bookshelf = createBookshelf(camera, renderer.domElement, {
    books,
    horizontalBooks,
    linen,
  });
  scene.add(bookshelf.unit);
  bookshelf.unit.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(bookshelf.unit);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const distance = Math.max(size.x, size.y) * 1.5;

  camera.up.set(0, 1, 0);
  camera.position.set(center.x, center.y, center.z + distance);
  camera.lookAt(center);

  const viewAxis = center.clone().sub(camera.position).normalize();
  camera.rotateOnWorldAxis(viewAxis, Math.PI / 2);

  function resize() {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  resize();

  function render() {
    bookshelf.animateSlides();
    renderer.render(scene, camera);
  }

  return { scene, camera, renderer, bookshelf, resize, render, dispose: bookshelf.dispose };
}
