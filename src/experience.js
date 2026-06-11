import { rowsForBody } from "./book.js";

function isExperienceJobHeader(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("- ")) return false;
  return trimmed.includes(" — ");
}

function parseExperienceJobs(body) {
  const jobs = [];
  let current = null;

  for (const line of (body ?? "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (isExperienceJobHeader(trimmed)) {
      if (current) jobs.push(current);
      current = [trimmed];
    } else if (current) {
      current.push(trimmed);
    }
  }

  if (current?.length) jobs.push(current);
  return jobs.map((lines) => lines.join("\n"));
}

export function experienceToSection(section, layout) {
  const jobs = parseExperienceJobs(section?.body);
  const textPages = jobs.map((body) => rowsForBody(body, { layout }));

  return {
    ...section,
    title: "",
    body: "",
    textPages: textPages.length
      ? textPages
      : [
          rowsForBody(section?.body ?? "", {
            includeTitle: true,
            title: section?.title ?? "Experience",
            layout,
          }),
        ],
  };
}
