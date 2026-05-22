import { createScene } from "./scene.js";
import { createCarousel } from "./carousel.js";
import { songs } from "./songs.js";

const container = document.getElementById("canvas-container");
const npTitle = document.getElementById("np-title");
const npArtist = document.getElementById("np-artist");

const { scene, camera, renderer, resize } = createScene(container);
const carousel = createCarousel(scene, songs);

carousel.mountLabels(container);
carousel.updatePositions();

function updateNowPlaying() {
  const song = carousel.getFrontSong();
  if (song) {
    npTitle.textContent = song.title;
    npArtist.textContent = song.artist;
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!document.hidden) {
    carousel.tick();
    updateNowPlaying();
  }
  renderer.render(scene, camera);
  carousel.renderLabels(camera);
}

window.addEventListener("resize", () => {
  resize();
  carousel.resizeLabels(container);
  carousel.updatePositions();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) carousel.updatePositions();
});

animate();
updateNowPlaying();
