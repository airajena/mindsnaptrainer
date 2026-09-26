/** All landing copy in one place (TECH_PLAN §4). PRD §11.1. */

export const HERO = {
  eyebrow: "Visual memory trainer",
  headline: "One second. Eighteen squares. Remember them all.",
  sub: "A pattern flashes. It disappears. You rebuild it. Frame-accurate timing, adaptive training and honest stats, so you actually get better.",
  primary: "Start training",
  secondary: "Try it right here",
  proof: ["Frame-accurate timing", "No sign-up", "Works offline", "Nothing leaves your device"],
} as const;

export const STEPS = [
  {
    title: "See",
    body: "A pattern lights up for a precise, short time — measured in display frames, not guessed.",
  },
  {
    title: "Hold",
    body: "It disappears. Nothing moves, nothing distracts. Just you and the empty grid.",
  },
  {
    title: "Rebuild",
    body: "Tap or swipe the squares back in. Cells respond on touch-down, on the very next frame.",
  },
] as const;

export const MODES = [
  {
    title: "Competition",
    tag: "8×8 · 18 · 1.0 s",
    body: "The classic format: 18 squares for one second, ten rounds, results at the end.",
    href: "/train?preset=competition",
    soon: false,
  },
  {
    title: "Capacity test",
    tag: "Adaptive",
    body: "Finds how many cells you can hold at a fixed time. One stable number to beat.",
    href: "/train?test=capacity",
    soon: false,
  },
  {
    title: "Speed test",
    tag: "Adaptive",
    body: "Finds the shortest flash you can handle for a fixed number of cells.",
    href: "/train?test=speed",
    soon: false,
  },
  {
    title: "Road to 18",
    tag: "Soon",
    body: "A goal ladder that walks you up to 18 squares at one second, one step at a time.",
    href: null,
    soon: true,
  },
  {
    title: "Custom",
    tag: "4×4 – 12×12",
    body: "Every parameter: board, cells, exposure, rounds, recall rules, pattern style.",
    href: "/train?tab=custom",
    soon: false,
  },
] as const;

/** Sample round for the "Honest numbers" section: 16 of 18 with one false tap. */
export const SAMPLE_ROUND = {
  n: 8,
  pattern: [1, 4, 9, 13, 18, 22, 26, 27, 33, 36, 38, 41, 45, 50, 53, 57, 60, 62],
  selection: [1, 4, 9, 13, 18, 22, 26, 27, 33, 36, 38, 45, 50, 53, 57, 62, 30],
} as const;

export const FAQ = [
  {
    q: "Is it free?",
    a: "Yes. No ads, no paywall, no account.",
  },
  {
    q: "Do I need an account?",
    a: "No. Your history is stored in this browser on this device. You can wipe it any time from Settings.",
  },
  {
    q: "Is this the official Mind Snap?",
    a: "No. MindSnap Trainer is an independent practice tool. It isn't affiliated with Matiks or any other game.",
  },
  {
    q: "Does it work offline?",
    a: "Once it's loaded, a session needs no network at all. A fully offline, installable version is on the way.",
  },
  {
    q: "Why does it say 1,008 ms instead of 1,000?",
    a: "Screens update in whole frames (every 16.7 ms at 60 Hz), so the pattern is shown for the nearest whole number of frames — and we report the time that was actually shown.",
  },
  {
    q: "Can a browser really time this precisely?",
    a: "It can time frames, not photons. Reveal and hide happen on exact display frames and every exposure is measured. Your screen's display delay is constant, so it doesn't change how long the pattern is visible.",
  },
] as const;

export const PRIVACY = {
  headline: "No account. No cookies. No tracking.",
  body: "Your history lives on your device, and you can wipe it with one tap.",
} as const;
