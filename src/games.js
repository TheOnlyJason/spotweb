import { SITE_HOST } from "./site.js";

// Games you've built — add `playUrl` when you have a live demo; otherwise links to the repo.
export const GAMES = [
  {
    label: "Spot Battle",
    playUrl: `https://spotbattle.${SITE_HOST}/`,
    note: "Spotify battle game (TypeScript)",
  },
  {
    label: "Astro Dash",
    playUrl: `https://astrodash.${SITE_HOST}`,
    note: "3D endless runner (Three.js)",
  },
  {
    label: "RightFluencer",
    playUrl: `https://rightfluencer.${SITE_HOST}/`,
    note: "Influencer game",
  },
  {
    label: "MobiusCheser",
    playUrl: `https://mobiuscheser.${SITE_HOST}/`,
    note: "Chess on a Möbius strip",
  },
  {
    label: "GALE",
    playUrl: `https://flyer.${SITE_HOST}/`,
    note: "Sky-sailing runner",
  },
];

export function gamesToSection() {
  // Games list lives in the overlay only — keep book pages blank when open.
  return {
    title: "",
    body: "",
  };
}
