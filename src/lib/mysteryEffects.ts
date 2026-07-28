export type MysteryEffectContext = {
  root: HTMLElement;
  grid: HTMLElement;
  tile: HTMLElement;
};

export type MysteryEffect = {
  id: string;
  /** Skip when user prefers reduced motion. */
  motionHeavy: boolean;
  durationMs: number;
  run: (ctx: MysteryEffectContext) => () => void;
};

const FAKE_LABELS = [
  "404 Frakt",
  "Null Pointer AB",
  "Excel.exe",
  "GLC Chaos",
  "Resurs ???",
  "Demo Mode",
  "Coffee Break",
  "WIP Module",
];

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function pickEffect(
  pool: MysteryEffect[],
  lastId: string | null
): MysteryEffect {
  if (pool.length === 0) {
    throw new Error("No mystery effects available");
  }
  if (pool.length === 1) return pool[0];

  let next = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (next.id === lastId && guard < 8) {
    next = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  }
  return next;
}

function quietToast(ctx: MysteryEffectContext): () => void {
  const label = ctx.tile.querySelector("[data-mystery-label]");
  const previous = label?.textContent ?? "";
  if (label) label.textContent = "Modul under utveckling…";
  ctx.tile.classList.add("mystery-quiet-pulse");
  return () => {
    if (label) label.textContent = previous;
    ctx.tile.classList.remove("mystery-quiet-pulse");
  };
}

const hueTwist: MysteryEffect = {
  id: "hue-twist",
  motionHeavy: false,
  durationMs: 2200,
  run: (ctx) => {
    const deg = 40 + Math.floor(Math.random() * 140);
    ctx.root.style.filter = `hue-rotate(${deg}deg)`;
    ctx.root.style.transition = "filter 0.4s ease";
    return () => {
      ctx.root.style.filter = "";
      ctx.root.style.transition = "";
    };
  },
};

const gridShake: MysteryEffect = {
  id: "grid-shake",
  motionHeavy: true,
  durationMs: 900,
  run: (ctx) => {
    ctx.grid.classList.add("mystery-grid-shake");
    return () => ctx.grid.classList.remove("mystery-grid-shake");
  },
};

const labelScramble: MysteryEffect = {
  id: "label-scramble",
  motionHeavy: false,
  durationMs: 2400,
  run: (ctx) => {
    const nodes = Array.from(
      ctx.grid.querySelectorAll<HTMLElement>("[data-portal-name]")
    );
    const originals = nodes.map((node) => node.textContent ?? "");
    const shuffled = [...FAKE_LABELS]
      .sort(() => Math.random() - 0.5)
      .slice(0, nodes.length);

    nodes.forEach((node, i) => {
      node.textContent = shuffled[i] ?? FAKE_LABELS[i % FAKE_LABELS.length];
      node.classList.add("mystery-label-flash");
    });

    return () => {
      nodes.forEach((node, i) => {
        node.textContent = originals[i] ?? "";
        node.classList.remove("mystery-label-flash");
      });
    };
  },
};

const orangeRain: MysteryEffect = {
  id: "orange-rain",
  motionHeavy: true,
  durationMs: 2200,
  run: (ctx) => {
    const layer = document.createElement("div");
    layer.className = "mystery-rain-layer";
    layer.setAttribute("aria-hidden", "true");

    const count = 18;
    for (let i = 0; i < count; i++) {
      const drop = document.createElement("span");
      drop.className = "mystery-rain-drop";
      drop.style.left = `${Math.random() * 100}%`;
      drop.style.animationDelay = `${Math.random() * 0.6}s`;
      drop.style.animationDuration = `${1.1 + Math.random() * 0.9}s`;
      layer.appendChild(drop);
    }

    const previousPosition = ctx.root.style.position;
    const computedPosition = getComputedStyle(ctx.root).position;
    const didSetPosition =
      !previousPosition && computedPosition === "static";
    if (didSetPosition) ctx.root.style.position = "relative";

    ctx.root.appendChild(layer);

    return () => {
      layer.remove();
      if (didSetPosition) ctx.root.style.position = previousPosition;
    };
  },
};

const tileSpin: MysteryEffect = {
  id: "tile-spin",
  motionHeavy: true,
  durationMs: 1000,
  run: (ctx) => {
    ctx.tile.classList.add("mystery-tile-spin");
    return () => ctx.tile.classList.remove("mystery-tile-spin");
  },
};

const fakeBoot: MysteryEffect = {
  id: "fake-boot",
  motionHeavy: false,
  durationMs: 2800,
  run: (ctx) => {
    const overlay = document.createElement("div");
    overlay.className = "mystery-boot-overlay";
    overlay.setAttribute("aria-live", "polite");

    const title = document.createElement("p");
    title.className = "mystery-boot-title";
    title.textContent = "Laddar modul…";
    overlay.appendChild(title);

    const wasRelative =
      getComputedStyle(ctx.root).position !== "static" ||
      Boolean(ctx.root.style.position);
    if (!wasRelative) ctx.root.style.position = "relative";
    ctx.root.appendChild(overlay);

    const swapTimer = window.setTimeout(() => {
      title.textContent = "404: modul saknas";
      title.classList.add("mystery-boot-error");
    }, 1100);

    return () => {
      window.clearTimeout(swapTimer);
      overlay.remove();
      if (!wasRelative) ctx.root.style.position = "";
    };
  },
};

const nightFlash: MysteryEffect = {
  id: "night-flash",
  motionHeavy: true,
  durationMs: 700,
  run: (ctx) => {
    ctx.root.classList.add("mystery-night-flash");
    return () => ctx.root.classList.remove("mystery-night-flash");
  },
};

export const MYSTERY_EFFECTS: MysteryEffect[] = [
  hueTwist,
  gridShake,
  labelScramble,
  orangeRain,
  tileSpin,
  fakeBoot,
  nightFlash,
];

export type MysteryRunHandle = {
  effectId: string;
  durationMs: number;
  cleanup: () => void;
};

/**
 * Pick and run one mystery effect. Returns cleanup + duration.
 * Respects prefers-reduced-motion by using a quiet toast instead of motion-heavy effects.
 */
export function runRandomMysteryEffect(
  ctx: MysteryEffectContext,
  lastEffectId: string | null
): MysteryRunHandle {
  const reduced = prefersReducedMotion();
  const pool = reduced
    ? MYSTERY_EFFECTS.filter((effect) => !effect.motionHeavy)
    : MYSTERY_EFFECTS;

  if (reduced && pool.length === 0) {
    return {
      effectId: "quiet-toast",
      durationMs: 2000,
      cleanup: quietToast(ctx),
    };
  }

  // With reduced motion, still allow quiet non-motion effects; if none left, toast.
  const effect = pickEffect(pool.length > 0 ? pool : [hueTwist], lastEffectId);
  if (reduced && effect.motionHeavy) {
    return {
      effectId: "quiet-toast",
      durationMs: 2000,
      cleanup: quietToast(ctx),
    };
  }

  return {
    effectId: effect.id,
    durationMs: effect.durationMs,
    cleanup: effect.run(ctx),
  };
}
