// GitHub repositories, grouped by year. Each entry's `repo` is the exact slug under
// github.com/TheOnlyJason/. Only real repos are listed (resume-only highlights are
// intentionally excluded since they have no repo to link to).
const GH_USER = "TheOnlyJason";

export const PROJECT_GROUPS = [
  {
    year: "2026",
    repos: [
      { repo: "youtubebot", label: "youtubebot", note: "Short-form content generator (TypeScript)" },
      { repo: "spotifymixvideo", label: "spotifymixvideo", note: "Spotify mix / video project" },
      { repo: "Matchateahousesite", label: "Matchateahousesite", note: "Matcha tea house website (TypeScript)" },
      { repo: "spotbattle", label: "spotbattle", note: "Spotify battle app (TypeScript)" },
      { repo: "billable", label: "billable", note: "Billing / invoicing app (Python)" },
      { repo: "tiktokrepostgame", label: "tiktokrepostgame", note: "TikTok repost game" },
    ],
  },
  {
    year: "2025",
    repos: [
      { repo: "MLStocks", label: "MLStocks", note: "Real-time market dashboard + news sentiment" },
      { repo: "restful-rust", label: "restful-rust", note: "RESTful service in Rust" },
      { repo: "Astro-Dash", label: "Astro-Dash", note: "3D endless runner (Three.js)" },
    ],
  },
  {
    year: "2024",
    repos: [
      { repo: "Assignment4", label: "Assignment4", note: "Course assignment (JavaScript)" },
      { repo: "Connectly", label: "Connectly", note: "Social / connectivity app" },
      { repo: "Assignment3-", label: "Assignment3", note: "Course assignment (JavaScript)" },
      { repo: "solarsystem", label: "solarsystem", note: "Mini solar system (JavaScript)" },
      { repo: "Assigment2", label: "Assignment2", note: "Course assignment" },
      { repo: "study", label: "study", note: "Practice codebase (C++)" },
      { repo: "valentine", label: "valentine", note: "Interactive valentine (TypeScript)" },
      { repo: "homework7pic10B", label: "homework7pic10B", note: "PIC 10B homework (UCLA)" },
      { repo: "MarbleMadness", label: "MarbleMadness", note: "Marble Madness-style game (C++)" },
    ],
  },
  {
    year: "2023",
    repos: [
      { repo: "visual-code", label: "visual-code", note: "Visual coding experiment (Python)" },
      { repo: "Don-t-BeFake.", label: "Don't-BeFake", note: 'Web project, "Don’t Be Fake" (HTML)' },
      { repo: "YouToSpot", label: "YouToSpot", note: "YouTube to Spotify tool (first repo)" },
    ],
  },
];

export function repoUrl(repo) {
  return `https://github.com/${GH_USER}/${repo}`;
}

export const PROFILE_URL = `https://github.com/${GH_USER}?tab=repositories`;
