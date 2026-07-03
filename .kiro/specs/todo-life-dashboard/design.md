# Design Document: To-Do List Life Dashboard

## Overview

The To-Do Life Dashboard is a zero-dependency, single-page personal productivity application delivered as three static files: `index.html`, `css/style.css`, and `js/app.js`. It runs entirely in the browser with no build step, no backend, and no ES6 module syntax — so it works cleanly over `file://` without CORS issues.

The app is organized into four functional widgets rendered as cards on a responsive grid:

| Widget | Responsibility |
|---|---|
| Greeting | Shows personalized greeting, live time, and date |
| Focus Timer | Pomodoro-style configurable countdown |
| To-Do List | Full task CRUD with sorting and duplicate detection |
| Quick Links | Labeled URL shortcuts that open in a new tab |

A global Theme toggle (light / dark) and all mutable state are persisted to `localStorage`. On load the app restores state before the first paint, eliminating a flash of unstyled content.

---

## Architecture

### Constraint-Driven Choices

Because the app must work over `file://` and must be written in plain Vanilla JS without modules, the entire application lives in a single `js/app.js` file organized into namespaces via IIFEs and plain object literals. There is no build pipeline, no bundler, and no framework.

```
index.html          ← shell; links to css/style.css + js/app.js
css/style.css       ← all CSS custom properties, layout, themes, transitions
js/app.js           ← all application logic (IIFE-namespaced modules)
```

### Execution Model

```
Browser loads index.html
 └─► <link> css/style.css       (stylesheet applied synchronously)
 └─► <script> js/app.js         (deferred; runs after DOM is parsed)
       ├─ Storage.init()         read all localStorage keys
       ├─ Theme.apply()          apply theme class before first paint
       ├─ Greeting.init()        render name, time, date; start 1-min interval
       ├─ Timer.init()           restore saved duration; render display
       ├─ TodoList.init()        restore tasks + sort pref; render list
       └─ QuickLinks.init()      restore links; render grid
```

### State Management

All state lives in a flat `AppState` object in memory. Every user action updates `AppState` then flushes the relevant key(s) to `localStorage` via `Storage.set()`. Reads on load go through `Storage.get()` which catches parse errors and returns the supplied default value.

### Event Handling

All events are delegated to the nearest stable container element per widget (no global document listeners except for the Escape key for canceling edits). This avoids re-binding handlers after list re-renders.

---

## Components and Interfaces

### Storage Module (`Storage`)

Wraps `localStorage` with error handling.

```js
Storage.get(key, defaultValue)  // try JSON.parse; return defaultValue on error
Storage.set(key, value)         // try JSON.stringify + setItem; swallow error, set in-memory flag
Storage.remove(key)             // removeItem wrapped in try/catch
Storage.isAvailable()           // returns bool; used at init to set degraded-mode flag
```

**localStorage key registry:**

| Key | Type | Default |
|---|---|---|
| `tld_userName` | string | `""` |
| `tld_theme` | `"light"` \| `"dark"` | `"light"` |
| `tld_timerDuration` | number (minutes) | `25` |
| `tld_tasks` | `Task[]` (JSON) | `[]` |
| `tld_sortPref` | string | `"default"` |
| `tld_quickLinks` | `Link[]` (JSON) | `[]` |

---

### Greeting Module (`Greeting`)

| Function | Description |
|---|---|
| `Greeting.init()` | Restore `userName` from storage; render; start interval |
| `Greeting.render()` | Update DOM: time, date, greeting text |
| `Greeting.getPrefix(hour)` | Pure function — returns greeting prefix for a given hour |
| `Greeting.saveName(raw)` | Trim; persist or clear `tld_userName`; re-render |

**Time-of-day prefix mapping:**

| Range | Prefix |
|---|---|
| 05:00 – 11:59 | Good Morning |
| 12:00 – 17:59 | Good Afternoon |
| 18:00 – 20:59 | Good Evening |
| 21:00 – 23:59, 00:00 – 04:59 | Good Night |

---

### Timer Module (`Timer`)

| Function | Description |
|---|---|
| `Timer.init()` | Restore duration; render MM:SS |
| `Timer.start()` | Set `setInterval(1000)`; tick each second |
| `Timer.stop()` | `clearInterval`; preserve remaining time |
| `Timer.reset()` | `clearInterval`; restore `remainingSeconds` to configured duration |
| `Timer.tick()` | Decrement; update DOM; auto-stop + notify at 00:00 |
| `Timer.setDuration(minutes)` | Validate 1–120; persist; reset display |
| `Timer.formatTime(seconds)` | Pure — returns `"MM:SS"` string |
| `Timer.beep()` | `AudioContext` one-shot beep ≤ 3 s |
| `Timer.notify()` | Show in-page visual banner |

State: `{ durationMinutes, remainingSeconds, intervalId, running }`

---

### TodoList Module (`TodoList`)

| Function | Description |
|---|---|
| `TodoList.init()` | Restore tasks + sort pref; render |
| `TodoList.add(description)` | Validate; duplicate check; push; persist; render |
| `TodoList.toggle(id)` | Flip `done`; persist; render |
| `TodoList.startEdit(id)` | Replace item DOM with inline input |
| `TodoList.saveEdit(id, newDesc)` | Validate; duplicate check (excluding self); persist; render |
| `TodoList.cancelEdit(id)` | Restore original display |
| `TodoList.delete(id)` | Remove from array; persist; render |
| `TodoList.sort(option)` | Compute display order without mutating storage order; render |
| `TodoList.render()` | Re-draw list from sorted view of `AppState.tasks` |

**Task shape:**

```js
{ id: string, description: string, done: boolean, insertedAt: number }
```

`id` is generated as `Date.now() + Math.random()` — simple, no external dependency needed.

Sort options: `"default"` | `"az"` | `"za"` | `"completedLast"` | `"completedFirst"`

---

### QuickLinks Module (`QuickLinks`)

| Function | Description |
|---|---|
| `QuickLinks.init()` | Restore links; render |
| `QuickLinks.add(label, url)` | Validate both fields; push; persist; render |
| `QuickLinks.delete(id)` | Remove; persist; render |
| `QuickLinks.render()` | Draw link buttons grid |
| `QuickLinks.validateUrl(url)` | Returns bool — must start with `http://` or `https://` |

**Link shape:**

```js
{ id: string, label: string, url: string }
```

---

### Theme Module (`Theme`)

| Function | Description |
|---|---|
| `Theme.apply(value)` | Set `data-theme` attribute on `<html>`; update toggle control |
| `Theme.toggle()` | Flip between `"light"` and `"dark"`; persist; apply |
| `Theme.init()` | Read from storage; apply immediately (called before DOM renders) |

The CSS uses `[data-theme="dark"]` selectors to override custom properties declared on `:root`. All color tokens are CSS custom properties, so a single attribute swap is sufficient to re-theme every element.

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string}  id          - Unique identifier (timestamp + random)
 * @property {string}  description - Task text (trimmed, non-empty)
 * @property {boolean} done        - Completion status
 * @property {number}  insertedAt  - Unix timestamp ms (insertion order)
 */
```

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id    - Unique identifier
 * @property {string} label - Display text (trimmed, non-empty)
 * @property {string} url   - Full URL starting with http:// or https://
 */
```

### AppState

```js
const AppState = {
  userName: "",           // string
  theme: "light",        // "light" | "dark"
  timerDuration: 25,     // number, 1–120
  tasks: [],             // Task[]
  sortPref: "default",   // sort option key
  quickLinks: [],        // Link[]
  storageAvailable: true // bool — degraded mode flag
};
```

### Sort Options Registry

```js
const SORT_OPTIONS = {
  default:        (a, b) => a.insertedAt - b.insertedAt,
  az:             (a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }),
  za:             (a, b) => b.description.localeCompare(a.description, undefined, { sensitivity: 'base' }),
  completedLast:  (a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1),
  completedFirst: (a, b) => (a.done === b.done ? 0 : a.done ? -1 : 1),
};
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting prefix covers all hours without gaps or overlaps

*For any* integer hour in [0, 23], `Greeting.getPrefix(hour)` SHALL return exactly one of "Good Morning", "Good Afternoon", "Good Evening", or "Good Night", and every hour in [0, 23] maps to a prefix.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: User name save / restore round-trip

*For any* non-empty, non-whitespace string up to 50 characters, saving it via `Greeting.saveName()` and then reading `Storage.get("tld_userName", "")` SHALL return the trimmed version of that string.

**Validates: Requirements 2.2, 2.4**

---

### Property 3: Timer format produces valid MM:SS strings

*For any* integer number of seconds in [0, 7200] (0–120 min), `Timer.formatTime(seconds)` SHALL return a string matching the pattern `\d{2}:\d{2}` where the minute part equals `Math.floor(seconds / 60)` padded to 2 digits and the second part equals `seconds % 60` padded to 2 digits.

**Validates: Requirements 3.1**

---

### Property 4: Custom timer duration persistence round-trip

*For any* integer duration in [1, 120], calling `Timer.setDuration(duration)` and then reading `Storage.get("tld_timerDuration", 25)` SHALL return that same integer.

**Validates: Requirements 3.9, 3.10**

---

### Property 5: Invalid timer duration is rejected

*For any* integer duration outside [1, 120] (e.g., 0, 121, negative values), `Timer.setDuration(duration)` SHALL NOT persist the value and SHALL NOT change the current valid configured duration.

**Validates: Requirements 3.11**

---

### Property 6: Task addition grows the list

*For any* task list and any valid (non-empty, non-whitespace, non-duplicate) description, calling `TodoList.add(description)` SHALL result in `AppState.tasks.length` increasing by exactly 1 and the new task appearing in `AppState.tasks`.

**Validates: Requirements 4.2**

---

### Property 7: Whitespace and empty task descriptions are rejected

*For any* string composed entirely of whitespace characters (including the empty string), `TodoList.add(description)` SHALL leave `AppState.tasks` unchanged and return a validation error.

**Validates: Requirements 4.3**

---

### Property 8: Duplicate task descriptions are rejected (case-insensitive)

*For any* existing task with description D, attempting to add a new task whose trimmed, lowercased description equals D's trimmed, lowercased description SHALL leave `AppState.tasks` unchanged and return a duplicate warning.

**Validates: Requirements 4.11**

---

### Property 9: Task completion toggle is an involution

*For any* task, toggling its completion status twice in succession SHALL return it to its original `done` value — i.e., `toggle(toggle(task.done)) === task.done`.

**Validates: Requirements 4.5, 4.6**

---

### Property 10: Sort is non-destructive to storage order

*For any* set of tasks and any sort option, after applying a sort the order of tasks as stored in `localStorage` (by `insertedAt`) SHALL remain unchanged — only the rendered display order varies.

**Validates: Requirements 5.3**

---

### Property 11: Sort covers all defined options without error

*For any* non-empty task list, applying each of the five defined sort options ("default", "az", "za", "completedLast", "completedFirst") SHALL produce a permutation of the same tasks with no tasks added or removed.

**Validates: Requirements 5.1, 5.2**

---

### Property 12: Quick link URL validation

*For any* string, `QuickLinks.validateUrl(url)` SHALL return `true` if and only if the string begins with `http://` or `https://` (case-sensitive), and `false` otherwise.

**Validates: Requirements 6.2, 6.4**

---

### Property 13: localStorage round-trip preserves task array

*For any* array of Task objects, serializing with `JSON.stringify` and then parsing with `JSON.parse` SHALL produce an array deeply equal to the original — all `id`, `description`, `done`, and `insertedAt` fields preserved.

**Validates: Requirements 4.2, 8.1, 8.2**

---

## Error Handling

### localStorage Unavailability

`Storage.isAvailable()` is called once at init. If it returns `false`, `AppState.storageAvailable` is set to `false` and a non-blocking banner is shown at the top of the page. All write operations become no-ops silently; the app continues to function in-memory for the session.

### localStorage Parse Errors

`Storage.get(key, defaultValue)` wraps `JSON.parse` in a `try/catch`. On any error (malformed JSON, quota exceeded, security error) the default value is returned. A non-blocking error message is shown if this happens during init for critical keys (tasks, links, timer duration).

### Timer Duration Validation

If the user inputs a value outside 1–120:
- The invalid value remains visible in the input so the user can correct it.
- An inline error message is shown adjacent to the input.
- The timer retains the last valid duration.
- No persistence occurs.

### Task and Link Validation

All validation errors are displayed inline, adjacent to the offending input. They persist until the user corrects the value. No toast/popup is used — errors are always visible in context.

### Audio Context Failure

`Timer.beep()` constructs an `AudioContext`. If the browser blocks autoplay audio, the beep is silently skipped. The visual notification still fires regardless.

### `file://` Protocol

No `fetch`, `XMLHttpRequest`, or ES6 `import`/`export` is used anywhere in the codebase, eliminating all CORS error vectors.

---

## Testing Strategy

### Applicability of Property-Based Testing

This feature is well-suited for property-based testing. The core logic — greeting prefix computation, timer formatting, task validation, sort behavior, URL validation, and localStorage serialization — consists of pure or near-pure functions with well-defined input/output behavior and universal properties that hold across a wide input space. Running 100+ randomized iterations against these functions is cost-effective (all in-memory, no I/O).

PBT is **not** applied to:
- Theme toggle (binary state; 2 examples suffice)
- CSS transition timing (not computable)
- Browser compatibility (manual / E2E)

### Recommended PBT Library

**fast-check** (JavaScript) — works in any browser and Node environment, no build step required for test files. Alternatively, tests can run in Node with a simple `node test.js` invocation using the UMD build of fast-check.

### Property Tests (minimum 100 iterations each)

Each test references its design property via a comment tag:
`// Feature: todo-life-dashboard, Property N: <property_text>`

| # | Function under test | Property |
|---|---|---|
| 1 | `Greeting.getPrefix(hour)` | Covers all 24 hours, no gaps/overlaps |
| 2 | `Storage.get` / `Storage.set` | Name save/restore round-trip |
| 3 | `Timer.formatTime(seconds)` | Valid MM:SS for any second in [0, 7200] |
| 4 | `Timer.setDuration` + `Storage.get` | Duration persistence round-trip |
| 5 | `Timer.setDuration` (invalid) | Rejected outside [1, 120] |
| 6 | `TodoList.add` (valid) | List grows by 1 |
| 7 | `TodoList.add` (whitespace) | List unchanged |
| 8 | `TodoList.add` (duplicate) | List unchanged |
| 9 | `TodoList.toggle` × 2 | Double-toggle is identity |
| 10 | `TodoList.sort` → storage check | Storage order preserved |
| 11 | `TodoList.sort` (all options) | Output is permutation, no loss |
| 12 | `QuickLinks.validateUrl` | Accepts http(s) only |
| 13 | `JSON.stringify` → `JSON.parse` | Task array round-trip |

### Unit / Example Tests

Focused example-based tests for:
- Greeting renders correctly with and without a saved name
- Timer display initializes to saved duration on load
- `TodoList.init()` restores tasks from storage in correct sort order
- `QuickLinks.init()` renders all persisted links
- Theme is applied before first paint (check `data-theme` before any widget renders)
- `localStorage` unavailable path: degraded-mode banner appears
- Quick link opens with `target="_blank"` and correct `href`
- Edit cancellation (Escape) restores original task description

### Integration / Smoke Tests

Manual or Playwright-based:
- Open `index.html` via `file://` in Chrome, Firefox, Edge, Safari — verify zero console errors
- Add / complete / edit / delete tasks; refresh; confirm state is restored
- Set timer to 1 min; verify beep and visual notification at completion
- Toggle theme; refresh; confirm theme persists
- Resize viewport to 320px, 600px, 1024px, 1440px — verify layout breakpoints
- Verify WCAG 2.1 AA contrast ratios with browser DevTools accessibility audit
