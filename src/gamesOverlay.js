import { GAMES } from "./games.js";

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function gameInitials(label) {
  const words = label.match(/[A-Za-z0-9]+/g) ?? [];
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function gameThumbHue(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function createGamesOverlay(parent, { onClose } = {}) {
  const root = document.createElement("div");
  root.className = "games-overlay";
  root.hidden = true;
  root.style.opacity = "1";
  root.style.pointerEvents = "none";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "games-overlay__close";
  closeBtn.setAttribute("aria-label", "Close");
  closeBtn.textContent = "×";
  closeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClose?.();
  });
  root.appendChild(closeBtn);

  const content = document.createElement("div");
  content.className = "games-overlay__content";

  const header = document.createElement("div");
  header.className = "games-overlay__header";
  const title = document.createElement("h2");
  title.textContent = "Games";
  header.appendChild(title);
  content.appendChild(header);

  const hint = document.createElement("p");
  hint.className = "games-overlay__hint";
  hint.textContent = "Games I've made — pick one to play or view the repo.";
  content.appendChild(hint);

  const list = document.createElement("div");
  list.className = "games-overlay__list";
  const items = [];
  for (let i = 0; i < GAMES.length; i++) {
    const game = GAMES[i];
    const initial = gameInitials(game.label);
    const a = document.createElement("a");
    a.className = "games-overlay__item";
    a.href = game.playUrl;
    a.target = "_blank";
    a.rel = "noopener";
    a.style.setProperty("--thumb-hue", String(gameThumbHue(game.label)));
    a.innerHTML = `<span class="games-overlay__thumb" aria-hidden="true">${initial}</span><span class="games-overlay__meta"><span class="games-overlay__name">${game.label}</span><span class="games-overlay__note">${game.note}</span></span>`;
    list.appendChild(a);
    items.push(a);
  }
  content.appendChild(list);
  root.appendChild(content);

  parent.appendChild(root);

  const ITEM_STAGGER_MS = 150;
  const ITEM_START_DELAY_MS = 120;
  const REVEAL_AMOUNT = 0.998;
  let listRevealed = false;
  let revealGeneration = 0;
  const revealTimers = [];

  function clearRevealTimers() {
    revealGeneration++;
    while (revealTimers.length) clearTimeout(revealTimers.pop());
  }

  function scheduleReveal(fn, delayMs) {
    const gen = revealGeneration;
    revealTimers.push(
      setTimeout(() => {
        if (gen !== revealGeneration) return;
        fn();
      }, delayMs)
    );
  }

  function resetListAnimation() {
    clearRevealTimers();
    listRevealed = false;
    root.classList.remove("games-overlay--revealed");
    header.classList.remove("games-overlay__chrome--visible");
    hint.classList.remove("games-overlay__chrome--visible");
    for (const item of items) {
      item.classList.remove("games-overlay__item--visible");
    }
  }

  function revealListStaggered() {
    if (listRevealed) return;
    listRevealed = true;
    root.classList.add("games-overlay--revealed");
    scheduleReveal(() => header.classList.add("games-overlay__chrome--visible"), 0);
    scheduleReveal(() => hint.classList.add("games-overlay__chrome--visible"), 70);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      scheduleReveal(
        () => item.classList.add("games-overlay__item--visible"),
        ITEM_START_DELAY_MS + i * ITEM_STAGGER_MS
      );
    }
  }

  function dismissContent() {
    content.style.opacity = "0";
    content.style.visibility = "hidden";
    closeBtn.style.opacity = "0";
    resetListAnimation();
  }

  return {
    root,
    dismissContent,
    setProgress(t, { anchor = null, closing = false } = {}) {
      const amount = Math.max(0, Math.min(1, t));
      if (amount <= 0.001) {
        root.hidden = true;
        root.style.pointerEvents = "none";
        root.style.background = "rgba(0, 0, 0, 0)";
        content.style.opacity = "0";
        content.style.visibility = "hidden";
        content.style.transform = "translateY(24px) scale(0.96)";
        closeBtn.style.opacity = "0";
        closeBtn.style.transform = "translateY(-8px)";
        resetListAnimation();
        return;
      }

      root.hidden = false;
      root.style.pointerEvents = !closing && amount > 0.93 ? "auto" : "none";

      const contentIn = closing
        ? amount ** 2.2
        : smoothstep(0.75, 0.998, amount);
      const parallaxY = closing ? (1 - amount) * 8 : (1 - contentIn) * 12;
      const scale = closing
        ? 0.98 + amount * 0.02
        : 0.05 + contentIn * 0.95;

      root.style.background = `rgba(0, 0, 0, ${contentIn})`;

      if (anchor) {
        const contentRect = content.getBoundingClientRect();
        content.style.transformOrigin = `${anchor.x - contentRect.left}px ${anchor.y - contentRect.top}px`;
      } else {
        content.style.transformOrigin = "50% 42%";
      }

      if (closing) {
        content.style.opacity = "0";
        content.style.visibility = "hidden";
        closeBtn.style.opacity = "0";
        resetListAnimation();
      } else {
        const showContent = amount >= REVEAL_AMOUNT - 0.015;
        content.style.visibility = showContent ? "visible" : "hidden";
        content.style.opacity = "1";
        const chrome = smoothstep(0.92, 0.999, amount);
        closeBtn.style.opacity = String(chrome);
        closeBtn.style.transform = `translateY(${(1 - chrome) * -8}px)`;
        if (amount >= REVEAL_AMOUNT && !listRevealed) {
          revealListStaggered();
        }
      }

      if (listRevealed) {
        content.style.transform = "translateY(0) scale(1)";
      } else {
        content.style.transform = `translateY(${parallaxY}px) scale(${scale})`;
      }
    },
    show() {
      this.setProgress(1);
    },
    hide() {
      this.setProgress(0);
    },
    remove() {
      root.remove();
    },
  };
}
