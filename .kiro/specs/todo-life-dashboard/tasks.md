# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a zero-dependency, single-page personal productivity dashboard delivered as three static files (`index.html`, `css/style.css`, `js/app.js`). The application is organized into IIFE-namespaced modules — Storage, Greeting, Timer, TodoList, QuickLinks, and Theme — all wired together in a single script that runs after DOM parsing. All mutable state is persisted to `localStorage`. Property-based tests are written using **fast-check** (UMD build, loaded via CDN `<script>` tag in the test file) and run with `node tests/pbt.test.js`.

---

## Tasks

- [x] 1. Scaffold project structure and shell HTML
  - Create root directory structure: `index.html`, `css/style.css`, `js/app.js`, `tests/pbt.test.js`
  - Write `index.html` shell: `<html data-theme="light">`, `<head>` with `<link>` to `css/style.css`, `<body>` with semantic landmark regions for each widget card (Greeting, Timer, TodoList, QuickLinks), and a deferred `<script src="js/app.js">` at the bottom
  - Add all widget card skeletons with stable IDs that JS will target (`#greeting-widget`, `#timer-widget`, `#todo-widget`, `#quicklinks-widget`)
  - Add the theme toggle button (`#theme-toggle`) in the page header
  - Add a `<div id="storage-error-banner" hidden>` for the degraded-mode banner
  - _Requirements: 9.1, 9.2, 10.1, 10.2, 10.3, 10.4_

- [x] 2. Implement the Storage module
  - [x] 2.1 Write the `Storage` IIFE in `js/app.js`
    - Implement `Storage.isAvailable()` — write+read+delete a sentinel key in `localStorage`; return bool
    - Implement `Storage.get(key, defaultValue)` — `JSON.parse(localStorage.getItem(key))`; return `defaultValue` on any thrown error or when the value is `null`
    - Implement `Storage.set(key, value)` — `localStorage.setItem(key, JSON.stringify(value))`; swallow errors; set `AppState.storageAvailable = false` on failure
    - Implement `Storage.remove(key)` — `localStorage.removeItem(key)` wrapped in `try/catch`
    - Define the `AppState` object with all keys and defaults: `userName`, `theme`, `timerDuration`, `tasks`, `sortPref`, `quickLinks`, `storageAvailable`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 3. Implement the Theme module
  - [x] 3.1 Write the `Theme` IIFE in `js/app.js`
    - Implement `Theme.apply(value)` — set `document.documentElement.setAttribute("data-theme", value)`; update `#theme-toggle` aria-label and icon/text
    - Implement `Theme.toggle()` — read `AppState.theme`; flip between `"light"` and `"dark"`; update `AppState.theme`; call `Storage.set("tld_theme", ...)`; call `Theme.apply()`
    - Implement `Theme.init()` — call `Storage.get("tld_theme", "light")`; set `AppState.theme`; call `Theme.apply()` — this MUST be the first module initialized so the attribute is set before any widget renders
    - Attach click listener to `#theme-toggle` → `Theme.toggle()`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 4. Implement the Greeting module
  - [x] 4.1 Write the `Greeting` IIFE in `js/app.js`
    - Implement `Greeting.getPrefix(hour)` — pure function; map `hour` (integer 0–23) to one of the four greeting strings per the time-of-day table in the design; use `if/else if` or a lookup table
    - Implement `Greeting.render()` — compute `new Date()`; build `HH:MM` time string; build human-readable date string; call `getPrefix(hour)`; compose greeting with or without `AppState.userName`; write to DOM targets `#greeting-time`, `#greeting-date`, `#greeting-text`
    - Implement `Greeting.saveName(raw)` — trim `raw`; if non-empty write to `AppState.userName` and `Storage.set("tld_userName", trimmed)`; if empty call `Storage.remove("tld_userName")` and clear `AppState.userName`; call `Greeting.render()`
    - Implement `Greeting.init()` — `Storage.get("tld_userName", "")`; set `AppState.userName`; call `Greeting.render()`; start `setInterval(Greeting.render, 60000)` aligned to the next whole minute
    - Attach event: submit on the name input form → `Greeting.saveName(inputValue)`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_


- [x] 5. Implement the Timer module
  - [x] 5.1 Write the `Timer` IIFE in `js/app.js` — state and pure helpers
    - Define module-level state: `{ durationMinutes, remainingSeconds, intervalId, running }`
    - Implement `Timer.formatTime(seconds)` — pure function; `Math.floor(seconds / 60)` padded to 2 digits, `seconds % 60` padded to 2 digits; return `"MM:SS"` string
    - Implement `Timer.setDuration(minutes)` — validate `Number.isInteger(minutes) && minutes >= 1 && minutes <= 120`; on valid: update state, `Storage.set("tld_timerDuration", minutes)`, call `Timer.reset()`; on invalid: show inline error adjacent to `#timer-duration-input`, retain invalid value in input, do NOT persist
    - Implement `Timer.beep()` — construct `AudioContext`; create oscillator; schedule 0.3 s tone clamped to ≤ 3 s; wrap in `try/catch` to swallow autoplay errors silently
    - _Requirements: 3.1, 3.7, 3.9, 3.10, 3.11_


  - [x] 5.3 Implement Timer start / stop / reset / tick and DOM wiring
    - Implement `Timer.tick()` — decrement `remainingSeconds`; call `Timer.updateDisplay()`; when `remainingSeconds === 0`: `clearInterval`, set `running = false`, call `Timer.beep()`, call `Timer.notify()`
    - Implement `Timer.start()` — guard if already running; set `running = true`; `setInterval(Timer.tick, 1000)` store in `intervalId`; update button states
    - Implement `Timer.stop()` — `clearInterval(intervalId)`; set `running = false`; update button states
    - Implement `Timer.reset()` — call `Timer.stop()`; set `remainingSeconds = durationMinutes * 60`; call `Timer.updateDisplay()`
    - Implement `Timer.updateDisplay()` — write `Timer.formatTime(remainingSeconds)` to `#timer-display`
    - Implement `Timer.notify()` — show `#timer-notification` banner; auto-hide after 5 s
    - Implement `Timer.init()` — `Storage.get("tld_timerDuration", 25)`; set state; call `Timer.reset()`
    - Attach events: `#timer-start` → `Timer.start()`, `#timer-stop` → `Timer.stop()`, `#timer-reset` → `Timer.reset()`, `#timer-duration-input` change → `Timer.setDuration(value)`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 3.10_

- [ ] 6. Checkpoint — ensure Storage, Theme, Greeting, and Timer pass all tests
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the TodoList module — core CRUD
  - [x] 7.1 Write `TodoList` IIFE — data helpers and add/delete
    - Define `generateId()` helper: `String(Date.now()) + String(Math.random()).slice(2)`
    - Implement `TodoList.add(description)` — trim; reject empty/whitespace (inline error on `#todo-input`); reject case-insensitive duplicate against `AppState.tasks` (inline duplicate warning); push `{ id, description: trimmed, done: false, insertedAt: Date.now() }` to `AppState.tasks`; `Storage.set("tld_tasks", AppState.tasks)`; call `TodoList.render()`
    - Implement `TodoList.delete(id)` — filter `AppState.tasks`; persist; call `TodoList.render()`
    - Implement `TodoList.toggle(id)` — find task; flip `done`; persist; call `TodoList.render()`
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 4.10_


  - [x] 7.3 Implement TodoList inline edit and cancel
    - Implement `TodoList.startEdit(id)` — find item DOM node by `data-id`; replace task display `<span>` with `<input>` pre-filled with current description; focus input; store original description in `data-original`
    - Implement `TodoList.saveEdit(id, newDesc)` — trim; reject empty/whitespace (inline error); reject duplicate excluding self (inline error); update `AppState.tasks` entry; persist; call `TodoList.render()`
    - Implement `TodoList.cancelEdit(id)` — restore item from `data-original`; call `TodoList.render()`
    - Attach Escape keydown listener on edit input → `TodoList.cancelEdit(id)`
    - _Requirements: 4.7, 4.8, 4.9_


- [x] 8. Implement TodoList sorting
  - [x] 8.1 Write `TodoList.sort()` and `TodoList.render()`
    - Define `SORT_OPTIONS` object with the five comparator functions from the design
    - Implement `TodoList.sort(option)` — update `AppState.sortPref`; `Storage.set("tld_sortPref", option)`; call `TodoList.render()`
    - Implement `TodoList.render()` — create a shallow copy of `AppState.tasks`; apply `SORT_OPTIONS[AppState.sortPref]` comparator on the copy; build list items HTML; update `#todo-list` innerHTML; re-attach delegated event listeners on the container
    - Implement `TodoList.init()` — `Storage.get("tld_tasks", [])`; `Storage.get("tld_sortPref", "default")`; validate sort pref against `SORT_OPTIONS` keys; set `AppState`; call `TodoList.render()`; populate sort control to reflect active option
    - Attach event delegation on `#todo-list` container for toggle, edit, delete buttons using `data-id` and `data-action` attributes
    - Attach change listener on `#todo-sort-select` → `TodoList.sort(value)`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_


- [x] 9. Implement the QuickLinks module
  - [x] 9.1 Write `QuickLinks` IIFE
    - Implement `QuickLinks.validateUrl(url)` — pure function; return `typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"))`
    - Implement `QuickLinks.add(label, url)` — trim both; reject empty label (inline error on `#ql-label-input`); reject invalid URL (inline error on `#ql-url-input`); push `{ id: generateId(), label, url }` to `AppState.quickLinks`; `Storage.set("tld_quickLinks", ...)`; call `QuickLinks.render()`
    - Implement `QuickLinks.delete(id)` — filter `AppState.quickLinks`; persist; call `QuickLinks.render()`
    - Implement `QuickLinks.render()` — build anchor/button elements for each link with `href`, `target="_blank"`, `rel="noopener noreferrer"`; inject into `#quicklinks-grid`; re-attach delete button listeners
    - Implement `QuickLinks.init()` — `Storage.get("tld_quickLinks", [])`; set `AppState.quickLinks`; call `QuickLinks.render()`
    - Attach submit event on `#quicklinks-form` → `QuickLinks.add(label, url)`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_



- [ ] 10. Checkpoint — ensure all module logic tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement CSS — layout, theming, and responsive breakpoints
  - [x] 11.1 Write CSS custom properties and base styles
    - Declare all color tokens as CSS custom properties on `:root`: background, surface (card), text, text-muted, border, primary, primary-hover, danger, success
    - Declare `[data-theme="dark"]` overrides for all color tokens
    - Set `transition: background-color 300ms ease, color 300ms ease, border-color 300ms ease` on relevant elements to satisfy requirement 9.3
    - Set base `font-size: 16px` on `body`; enforce `min-font-size: 14px` for body text and `18px` for headings (req 9.6)
    - _Requirements: 7.3, 9.3, 9.6, 9.7_

  - [x] 11.2 Write CSS grid layout and card components
    - Implement `.dashboard-grid` as CSS Grid; apply breakpoints:
      - `≥ 1024px`: `grid-template-columns: repeat(2, 1fr)` (at least 2 columns)
      - `600px – 1023px`: `grid-template-columns: repeat(2, 1fr)` or `1fr` as appropriate
      - `≤ 599px`: `grid-template-columns: 1fr` (single column)
    - Style `.card` with `padding: 16px` (min), `border` or `box-shadow`, distinct `background-color` using `var(--color-surface)`
    - Ensure all interactive elements (buttons, inputs) have `min-width: 44px; min-height: 44px` to meet touch target requirement
    - Add `overflow-wrap: break-word` on task and link text elements for long-content safety
    - _Requirements: 9.1, 9.2, 9.8_

  - [x] 11.3 Write CSS for task list, timer, and quick links components
    - Style `.todo-item` with `display: flex; align-items: center; gap: 8px`; add `.todo-item--done` class with `text-decoration: line-through` and `transition: text-decoration 300ms ease` (req 9.4)
    - Style `#timer-display` with large monospace font; style start/stop/reset buttons distinctly
    - Style `.quicklinks-grid` as CSS Grid auto-fill with `minmax(120px, 1fr)` columns
    - Style inline validation error messages (`[role="alert"]`) with danger color, `font-size: 0.875rem`, visible below their input
    - Style `#timer-notification` and `#storage-error-banner` as non-blocking banners (fixed or top-of-card position)
    - _Requirements: 4.5, 9.1, 9.4, 9.5, 3.11_

- [x] 12. Wire all modules together in `js/app.js` bootstrap
  - [x] 12.1 Write the bootstrap initialization sequence
    - At the bottom of `js/app.js`, add a `DOMContentLoaded` listener (or use `defer` attribute on the script tag) that calls modules in this exact order:
      1. `Storage.init()` — call `Storage.isAvailable()`; if false set `AppState.storageAvailable = false` and show `#storage-error-banner`
      2. `Theme.init()` — reads and applies theme before any widget is rendered
      3. `Greeting.init()`
      4. `Timer.init()`
      5. `TodoList.init()`
      6. `QuickLinks.init()`
    - Ensure `AppState` is defined before all module IIFEs so every module can reference it
    - _Requirements: 7.3, 8.2, 8.4, 10.1, 10.4_


- [ ] 13. Set up the fast-check property test harness
  - [ ] 13.1 Create `tests/pbt.test.js` and load modules for testing
    - Create `tests/pbt.test.js` as a Node.js script
    - At the top, shim the DOM APIs used by pure functions (no `jsdom` needed — only `Greeting.getPrefix`, `Timer.formatTime`, `QuickLinks.validateUrl` are fully pure; for Storage and state-mutating functions, provide minimal stubs for `localStorage` and `AppState`)
    - Load fast-check via `require` (UMD build installed locally via `npm install --save-dev fast-check` or loaded via the npm `fast-check` package)
    - Load `js/app.js` module functions by extracting them (refactor pure helpers to be exported via `globalThis` assignments at the top of `js/app.js` when running in Node, guarded by `typeof window === "undefined"`)
    - Add a minimal test runner that logs pass/fail per property and exits with code 1 on any failure
    - _Requirements: 10.1_

  - [ ] 13.2 Implement all 13 property-based tests in `tests/pbt.test.js`
    - **P1** `Greeting.getPrefix` — `fc.integer({min:0, max:23})` → result in valid set, all 24 hours covered
    - **P2** `Storage` name round-trip — non-empty trimmed string → `set` then `get` returns same value
    - **P3** `Timer.formatTime` — `fc.integer({min:0, max:7200})` → matches `/^\d{2}:\d{2}$/`, correct parts
    - **P4** `Timer.setDuration` persist — `fc.integer({min:1, max:120})` → storage reads back same int
    - **P5** `Timer.setDuration` invalid — `fc.integer().filter(n=>n<1||n>120)` → storage and state unchanged
    - **P6** `TodoList.add` grows list — valid unique desc → `tasks.length` increases by 1
    - **P7** `TodoList.add` rejects whitespace — whitespace-only string → `tasks.length` unchanged
    - **P8** `TodoList.add` rejects duplicate — dup of existing desc → `tasks.length` unchanged
    - **P9** `TodoList.toggle` involution — any task → double-toggle returns to original `done`
    - **P10** `TodoList.sort` non-destructive — any sort → storage order by `insertedAt` unchanged
    - **P11** `TodoList.sort` permutation — any 5 sort options → output length and IDs same as input
    - **P12** `QuickLinks.validateUrl` — valid URLs return true, invalid return false
    - **P13** Task array JSON round-trip — `fc.array(taskArb)` → `JSON.parse(JSON.stringify(arr))` deeply equals `arr`
    - Each test tagged with comment `// Feature: todo-life-dashboard, Property N: <property_text>`
    - _Requirements: 4.2, 4.3, 4.5, 4.6, 4.11, 5.1, 5.2, 5.3, 6.2, 6.4, 8.1, 8.2_

- [ ] 14. Final checkpoint — all tests green, visual review
  - Ensure all property-based and unit tests pass by running `node tests/pbt.test.js`.
  - Verify `index.html` opens over `file://` in Chrome without console errors.
  - Confirm responsive layout at 320 px, 600 px, and 1024 px viewport widths.
  - Ask the user if any questions arise before marking complete.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP; core functionality is fully deliverable without them.
- The test harness in task 13 requires `fast-check` as the only dev dependency (`npm install --save-dev fast-check`); the application itself has zero runtime dependencies.
- All modules are written as IIFEs in a single `js/app.js` file — no ES6 `import`/`export`, no bundler — so the app works over `file://` without CORS issues.
- Each task references specific requirements for full traceability.
- Checkpoints (tasks 6, 10, 14) ensure incremental validation at meaningful milestones.
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "11.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "11.2"] },
    { "id": 3, "tasks": ["3.2", "4.1", "11.3"] },
    { "id": 4, "tasks": ["4.2", "5.1"] },
    { "id": 5, "tasks": ["5.2", "5.3"] },
    { "id": 6, "tasks": ["7.1"] },
    { "id": 7, "tasks": ["7.2", "7.3"] },
    { "id": 8, "tasks": ["7.4", "8.1"] },
    { "id": 9, "tasks": ["8.2", "9.1"] },
    { "id": 10, "tasks": ["9.2", "9.3"] },
    { "id": 11, "tasks": ["12.1"] },
    { "id": 12, "tasks": ["12.2", "13.1"] },
    { "id": 13, "tasks": ["13.2"] }
  ]
}
```
