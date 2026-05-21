# WAIED? (What Am I Even Doing?)

A loud, neobrutalist, hyper-focused todo app that helps you manage cognitive load and answer the age-old question: *What am I even doing right now?*

🌐 **Live Demo**: [https://what-am-i-even-doing.vercel.app](https://what-am-i-even-doing.vercel.app)

---

## 🧠 The Concept: Capped Attention (5 Tasks Max)
Our brain wasn't built to process infinite backlogs. WAIED? enforces a strict **5-task limit**. 
- If you attempt to add more than 5 tasks, the input box is locked and warning-pulses with `"ATTENTION FULL: 5/5"`.
- After 10 seconds, it gracefully dims into a quiet, greyed-out disabled state to prevent distractions.
- You must complete or delete a task to unlock the input.

---

## 🎨 Interactive Easter Eggs & Polish
WAIED? is packed with subtle, springy micro-interactions and visual feedback:

- **Split-Flap Logo Synced Initials**: The logo initials (originally `WAIED?`) dynamically update in real-time based on your tagline! If you click/hover-change the subheading to *"Why am we honestly making?"*, the logo dynamically split-flaps to *"WAWHM?"* with a mechanical 3D card rotation animation. It automatically resets back to its default state after 10 seconds of inactivity.
- **Tagline Word-by-Word Randomizer**: Hover over individual words in the tagline *"What am I even doing?"* to temporarily flash them to random synonyms, or click a word to permanently swap it with funny alternatives (like `dreaming`, `debugging`, `drinking`, or `destroying`).
- **Animate-Scroll Dotted Line**: The dotted border divider scrolls left-to-right on hover. Click the dotted line to reverse the scroll direction and trigger a vertical spring stretch.
- **Bouncy Question Mark**: Hovering the `?` on the logo flips it horizontally backwards with a springy bounce.
- **Offline Audio Focus Chime**: Completing a task plays a double focus chime synthesized natively using the Web Audio API (completely offline-friendly!).
- **Assignee Toggles**: Hover the current focus banner to slide in the options to delegate tasks between 👤 (Human) and 🤖 (AI Robot).
- **Undo / Dismiss Done State**: Made a mistake? Hover the recently completed task banner to reveal the Undo (↩) and Dismiss (✕) buttons, glowing bright yellow on hover. If the list is full, trying to undo triggers a playful side-to-side shake of the banner.

---

## 🛠️ Installation & PWA Support
WAIED? is a fully-compliant **Progressive Web App (PWA)**. 
- Install it on your mobile device or desktop browser to run standalone, offline-ready, with custom splash screens and app icons.
- standalone window size automatically resizes to a sleek, compact desktop widget format (`420x720`).

---

## 🚀 Technical Stack
- **Framework**: Vue 3 (Composition API `<script setup>`)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS (CSS Variables, Neobrutalist design tokens, responsive breakpoints)
- **State Management**: Reactive LocalStorage sync
