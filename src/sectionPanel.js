export function createSectionPanel(container, { onClose } = {}) {
  const panel = document.createElement("aside");
  panel.id = "section-panel";
  panel.className = "section-panel";
  panel.setAttribute("aria-hidden", "true");

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "section-panel__close";
  closeBtn.setAttribute("aria-label", "Close section");
  closeBtn.textContent = "×";

  const titleEl = document.createElement("h2");
  titleEl.className = "section-panel__title";

  const bodyEl = document.createElement("div");
  bodyEl.className = "section-panel__body";

  panel.append(closeBtn, titleEl, bodyEl);
  container.appendChild(panel);

  function show(section) {
    titleEl.textContent = section.title;
    bodyEl.textContent = section.body;
    panel.classList.add("section-panel--open");
    panel.setAttribute("aria-hidden", "false");
  }

  function hide() {
    panel.classList.remove("section-panel--open");
    panel.setAttribute("aria-hidden", "true");
  }

  closeBtn.addEventListener("click", () => {
    hide();
    onClose?.();
  });

  return { show, hide, element: panel };
}
