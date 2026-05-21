# AGENTS.md (Developer & AI Agent Reference)

This document is compiled for developer onboarding and AI agents. It details codebase mechanics, architectural decisions, styling tricks, and deployment workflows.

---

## 🏗️ Codebase Overview

- **Tech Stack**: Vue 3 (Composition API `<script setup>`) + Vite. No routers or stores (Pinia/Vuex); state is managed reactively in [src/App.vue](file:///home/mitchell/Documents/Mycode/small-tools/what-am-i-even-doing/src/App.vue) and synced to `localStorage`.
- **Primary Source Files**:
  - [src/App.vue](file:///home/mitchell/Documents/Mycode/small-tools/what-am-i-even-doing/src/App.vue): Contains the complete single-file component template, state, and scoped CSS overrides.
  - [src/style.css](file:///home/mitchell/Documents/Mycode/small-tools/what-am-i-even-doing/src/style.css): Main neobrutalist styling layer. Defines CSS variables for light/dark modes, base input styles, custom checkboxes, and responsive media queries.
  - [index.html](file:///home/mitchell/Documents/Mycode/small-tools/what-am-i-even-doing/index.html): Entry point, loaded with Google Fonts (Outfit).

---

## ⚡ Key Codebase Mechanics & Tricks

### 1. Split-Flap Logo Sync (`logoLetters`)
- **Computed Initials**: The initials in `<h1 class="logo-text">` are computed reactively based on the tagline word array (`logoLetters`).
- **SNAPPY DOM Replacement**: Standard Vue transitions with absolute-positioned leaves cause layout jumping in flexbox. Instead, we use key-based DOM replacement:
  ```vue
  <span 
    v-for="(char, idx) in logoLetters" 
    :key="idx + '-' + char" 
    class="logo-letter logo-letter-anim"
  >
    {{ char }}
  </span>
  ```
  Whenever a character changes, Vue instantly swaps the element, firing `@keyframes logo-flip-in` (a 3D rotateX split-flap transition).
- **10-Second Auto-Reset**: Managed in JS by `resetTimer`. Resets tagline words and logo initials after 10s of inactivity. Safely cleared in `onBeforeUnmount` to prevent memory leaks.

### 2. Dotted Line Scrolling & Hitbox
- **Background Gradient Hack**: Standard CSS `border-style: dotted` cannot be scroll-animated. We use a repeating horizontal linear gradient background:
  ```css
  background-image: linear-gradient(to right, var(--border-color) 60%, transparent 40%);
  background-size: 12px 2px;
  background-repeat: repeat-x;
  ```
  Keyframes animate `background-position-x` from `0` to `12px` (right) or `-12px` (left) for seamless scrolling.
- **Pseudo-Element Hitbox**: A height of `2px` is hard to hover. We inject an invisible pseudo-element (`::before`) extending `8px` above and below the line to expand the hover hitbox to `18px` without visual bloating.

### 3. Audio Chime (Zero-Dependency)
- We use the browser's native **Web Audio API** to synthesize double-chime notes (C6 -> G6 sine waves) on complete. This keeps the application 100% offline-friendly and eliminates static asset dependency issues.

---

## 🚀 Deployment to Vercel

The app is deployed to **Vercel** via Git integration.
- **Production URL**: [https://what-am-i-even-doing.vercel.app](https://what-am-i-even-doing.vercel.app)
- **Vercel Settings**:
  - **Framework Preset**: Vite
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
  - **Install Command**: `npm install`

To trigger manual previews/production updates:
1. Ensure your local tests build successfully: `npm run build`.
2. Push your changes to the main repository branch (`main`), or deploy via the Vercel CLI from the root directory:
   ```bash
   vercel --prod
   ```

---

## 💾 LocalStorage Schema

All client settings and database entries are stored in `localStorage` under versioned keys:
- `waied_tasks_v1`: JSON array of tasks `[{ id, name, assignee }]`.
- `waied_active_id_v1`: String ID of the currently focused task.
- `waied_last_done_v1`: JSON object representing the most recently completed task.
- `waied_history_v1`: JSON array of completed history items (capped at 50).
- `waied_theme_v1`: Theme mode (`'auto' | 'light' | 'dark'`).
- `waied_has_edited_v1`: Boolean flag confirming if the user has completed double-click onboarding.
