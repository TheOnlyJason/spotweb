import { repoUrl } from "./projects.js";

// Games you've built — add `playUrl` when you have a live demo; otherwise links to the repo.
export const GAMES = [
  {
    label: "Spot Battle",
    playUrl: repoUrl("spotbattle"),
    note: "Spotify battle game (TypeScript)",
  },
  {
    label: "TikTok Repost Game",
    playUrl: repoUrl("tiktokrepostgame"),
    note: "Social repost challenge",
  },
  {
    label: "Astro Dash",
    playUrl: repoUrl("Astro-Dash"),
    note: "3D endless runner (Three.js)",
  },
  {
    label: "Marble Madness",
    playUrl: repoUrl("MarbleMadness"),
    note: "Marble Madness-style game (C++)",
  },
  {
    label: "Valentine",
    playUrl: repoUrl("valentine"),
    note: "Interactive valentine (TypeScript)",
  },
];

export function gamesToSection() {
  // Games list lives in the overlay only — keep book pages blank when open.
  return {
    title: "",
    body: "",
  };
}
