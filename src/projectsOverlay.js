import { PROJECT_GROUPS, repoUrl, PROFILE_URL } from "./projects.js";

// A floating HTML panel listing GitHub repos, each a real clickable link to its repo.
// Shown only while the Projects book is open.
export function createProjectsOverlay(parent) {
  const root = document.createElement("div");
  root.className = "projects-overlay";
  root.hidden = true;

  const header = document.createElement("div");
  header.className = "projects-overlay__header";
  const title = document.createElement("h2");
  title.textContent = "Projects";
  const profile = document.createElement("a");
  profile.className = "projects-overlay__profile";
  profile.href = PROFILE_URL;
  profile.target = "_blank";
  profile.rel = "noopener";
  profile.textContent = "All repos ↗";
  header.append(title, profile);
  root.appendChild(header);

  const list = document.createElement("div");
  list.className = "projects-overlay__list";
  for (const group of PROJECT_GROUPS) {
    const yearEl = document.createElement("div");
    yearEl.className = "projects-overlay__year";
    yearEl.textContent = group.year;
    list.appendChild(yearEl);

    for (const item of group.repos) {
      const a = document.createElement("a");
      a.className = "projects-overlay__item";
      a.href = repoUrl(item.repo);
      a.target = "_blank";
      a.rel = "noopener";
      a.innerHTML = `<span class="projects-overlay__name">${item.label}</span><span class="projects-overlay__note">${item.note}</span>`;
      list.appendChild(a);
    }
  }
  root.appendChild(list);

  parent.appendChild(root);

  return {
    root,
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
    },
    remove() {
      root.remove();
    },
  };
}
