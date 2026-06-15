import { repoUrl } from "./projects.js";

// Games you've built — add `playUrl` when you have a live demo; otherwise links to the repo.
export const GAMES = [
  {
    label: "Spot Battle",
    playUrl: repoUrl("spotbattle"),
    note: "Spotify battle game (TypeScript)",
  },
  {
    label: "Astro Dash",
    playUrl: repoUrl("Astro-Dash"),
    note: "3D endless runner (Three.js)",
  },
];

export function gamesToSection() {
  // Games list lives in the overlay only — keep book pages blank when open.
  return {
    title: "",
    body: "",
  };
}
