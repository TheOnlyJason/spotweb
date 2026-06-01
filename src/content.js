import raw from "../jason.md?raw";

const COLORS = [
  "#7e74c8",
  "#c9887a",
  "#4fa892",
  "#4a8fbf",
  "#c9b06a",
  "#c47292",
  "#6bb8a8",
  "#b85c5c",
  "#9a92c8",
  "#c9bc88",
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseJasonMd(md) {
  const lines = md.replace(/\r\n/g, "\n").trim().split("\n");
  let siteTitle = "Jason Dai";
  let intro = "";
  const sections = [];
  let current = null;
  const introLines = [];

  for (const line of lines) {
    if (line.startsWith("# ")) {
      siteTitle = line.slice(2).trim();
    } else if (line.startsWith("## ")) {
      if (current) sections.push(current);
      const title = line.slice(3).trim();
      current = { id: slugify(title), title, body: "" };
    } else if (current) {
      current.body += `${line}\n`;
    } else if (line.trim()) {
      introLines.push(line);
    }
  }

  if (current) sections.push(current);

  intro = introLines.join("\n").trim();
  sections.forEach((s, i) => {
    s.body = s.body.trim();
    s.color = COLORS[i % COLORS.length];
  });

  return { siteTitle, intro, sections };
}

export const site = parseJasonMd(raw);
