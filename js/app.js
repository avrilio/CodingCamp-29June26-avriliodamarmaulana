/**
 * To-Do Life Dashboard — app.js
 *
 * All modules are IIFE-namespaced. No ES6 import/export.
 * Works over file:// without any build step.
 */

/* ============================================================
   Global App State
   ============================================================ */
var AppState = {
  userName: "",
  theme: "light",
  timerDuration: 25,
  tasks: [],
  sortPref: "default",
  quickLinks: [],
  storageAvailable: true
};

/* ============================================================
   Storage Module
   ============================================================ */
var Storage = (function () {
  function isAvailable() {
    try {
      var testKey = "__tld_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  function get(key, defaultValue) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return defaultValue;
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      AppState.storageAvailable = false;
      _showBanner("Storage write failed: changes may not be saved.");
    }
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // silently swallow
    }
  }

  function _showBanner(msg) {
    var banner = document.getElementById("storage-error-banner");
    var msgEl  = document.getElementById("storage-error-message");
    if (banner) {
      if (msgEl && msg) msgEl.textContent = msg;
      banner.removeAttribute("hidden");
    }
  }

  function init() {
    AppState.storageAvailable = isAvailable();
    if (!AppState.storageAvailable) {
      _showBanner("Local storage is unavailable. Your changes will not be saved beyond this session.");
    }
  }

  return { isAvailable: isAvailable, get: get, set: set, remove: remove, init: init };
})();

/* ============================================================
   Theme Module
   ============================================================ */
var Theme = (function () {
  function apply(value) {
    var theme = (value === "dark") ? "dark" : "light";
    AppState.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);

    var btn   = document.getElementById("theme-toggle");
    var icon  = btn && btn.querySelector(".theme-toggle-icon");
    var label = btn && btn.querySelector(".theme-toggle-label");

    if (btn) {
      // aria-pressed reflects the current "dark mode is active" state
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
      // aria-label describes what the button will do on the next click
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    }
    if (icon)  icon.textContent  = theme === "dark" ? "☀️" : "🌙";
    if (label) label.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
  }

  function toggle() {
    var next = AppState.theme === "light" ? "dark" : "light";
    apply(next);
    Storage.set("tld_theme", next);
  }

  function init() {
    var saved = Storage.get("tld_theme", "light");
    apply(saved);

    var btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.addEventListener("click", function () {
        Theme.toggle();
      });
    }
  }

  return { apply: apply, toggle: toggle, init: init };
})();

/* ============================================================
   Greeting Module
   ============================================================ */
var Greeting = (function () {
  var _intervalId = null;

  function getPrefix(hour) {
    if (hour >= 5 && hour <= 11) return "Good Morning";
    if (hour >= 12 && hour <= 17) return "Good Afternoon";
    if (hour >= 18 && hour <= 20) return "Good Evening";
    return "Good Night"; // 21–23 and 0–4
  }

  function render() {
    var now    = new Date();
    var hour   = now.getHours();
    var prefix = getPrefix(hour);

    var greetingText = document.getElementById("greeting-text");
    var greetingTime = document.getElementById("greeting-time");
    var greetingDate = document.getElementById("greeting-date");

    if (greetingText) {
      greetingText.textContent = AppState.userName
        ? prefix + ", " + AppState.userName + "!"
        : prefix + "!";
    }

    if (greetingTime) {
      var hh = String(hour).padStart(2, "0");
      var mm = String(now.getMinutes()).padStart(2, "0");
      greetingTime.textContent = hh + ":" + mm;
    }

    if (greetingDate) {
      greetingDate.textContent = now.toLocaleDateString(undefined, {
        weekday: "long",
        year:    "numeric",
        month:   "long",
        day:     "numeric"
      });
    }
  }

  function saveName(raw) {
    var trimmed = (raw || "").trim();
    if (trimmed) {
      AppState.userName = trimmed;
      Storage.set("tld_userName", trimmed);
    } else {
      AppState.userName = "";
      Storage.remove("tld_userName");
    }
    render();
  }

  function init() {
    AppState.userName = Storage.get("tld_userName", "");

    var nameInput = document.getElementById("greeting-name-input");
    if (nameInput && AppState.userName) {
      nameInput.value = AppState.userName;
    }

    render();

    // Update time every minute
    _intervalId = setInterval(render, 60000);

    var form = document.getElementById("greeting-name-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.getElementById("greeting-name-input");
        saveName(input ? input.value : "");
      });
    }
  }

  return { init: init, render: render, getPrefix: getPrefix, saveName: saveName };
})();

/* ============================================================
   Timer Module
   ============================================================ */
var Timer = (function () {
  var _state = {
    durationMinutes: 25,
    remainingSeconds: 25 * 60,
    intervalId: null,
    running: false
  };

  function formatTime(seconds) {
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  }

  function _updateDisplay() {
    var el = document.getElementById("timer-display");
    if (el) el.textContent = formatTime(_state.remainingSeconds);
  }

  function _showNotification() {
    var el = document.getElementById("timer-notification");
    if (el) {
      el.removeAttribute("hidden");
      setTimeout(function () {
        el.setAttribute("hidden", "");
      }, 5000);
    }
  }

  function beep() {
    try {
      var ctx  = new (window.AudioContext || window.webkitAudioContext)();
      var osc  = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 2);
    } catch (e) {
      // AudioContext not available; skip beep silently
    }
  }

  function tick() {
    _state.remainingSeconds -= 1;
    _updateDisplay();
    if (_state.remainingSeconds <= 0) {
      _state.remainingSeconds = 0; // clamp to prevent negatives on repeated ticks
      stop();
      beep();
      _showNotification();
    }
  }

  function start() {
    if (_state.running) return;
    _state.running = true;
    _state.intervalId = setInterval(tick, 1000);
    _syncControls();
  }

  function stop() {
    if (_state.intervalId) {
      clearInterval(_state.intervalId);
      _state.intervalId = null;
    }
    _state.running = false;
    _syncControls();
  }

  function reset() {
    stop();
    _state.remainingSeconds = _state.durationMinutes * 60;
    _updateDisplay();
  }

  function setDuration(minutes) {
    // minutes must already be a parsed number; use Number.isInteger for strict validation
    var errorEl = document.getElementById("timer-duration-error");

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      if (errorEl) {
        errorEl.textContent = "Duration must be a whole number between 1 and 120 minutes.";
        errorEl.removeAttribute("hidden");
      }
      // Do NOT change _state or storage — retain previous valid duration
      return false;
    }

    if (errorEl) errorEl.setAttribute("hidden", "");

    _state.durationMinutes = minutes;
    AppState.timerDuration = minutes;
    Storage.set("tld_timerDuration", minutes);
    reset();
    return true;
  }

  function _syncControls() {
    var startBtn = document.getElementById("timer-start-btn");
    var stopBtn  = document.getElementById("timer-stop-btn");
    var durationInput = document.getElementById("timer-duration-input");
    var durationForm  = document.getElementById("timer-duration-form");

    if (startBtn) startBtn.disabled = _state.running;
    if (stopBtn)  stopBtn.disabled  = !_state.running;
    if (durationInput) durationInput.disabled = _state.running;
    if (durationForm) {
      var submitBtn = durationForm.querySelector("button[type='submit']");
      if (submitBtn) submitBtn.disabled = _state.running;
    }
  }

  function init() {
    var saved = Storage.get("tld_timerDuration", 25);
    var n = parseInt(saved, 10);
    _state.durationMinutes  = (isNaN(n) || n < 1 || n > 120) ? 25 : n;
    _state.remainingSeconds = _state.durationMinutes * 60;
    AppState.timerDuration  = _state.durationMinutes;

    var durationInput = document.getElementById("timer-duration-input");
    if (durationInput) durationInput.value = _state.durationMinutes;

    _updateDisplay();
    _syncControls();

    var startBtn = document.getElementById("timer-start-btn");
    var stopBtn  = document.getElementById("timer-stop-btn");
    var resetBtn = document.getElementById("timer-reset-btn");

    if (startBtn) startBtn.addEventListener("click", start);
    if (stopBtn)  stopBtn.addEventListener("click",  stop);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    var durationForm = document.getElementById("timer-duration-form");
    if (durationForm) {
      durationForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.getElementById("timer-duration-input");
        // Parse the raw string value; setDuration expects a number and uses
        // Number.isInteger for strict validation (rejects floats, NaN, etc.)
        var raw = input ? input.value : "";
        var parsed = parseInt(raw, 10);
        // Pass parsed number — NaN and floats will be rejected by setDuration's
        // Number.isInteger check; invalid value stays in input per requirement 3.11
        setDuration(isNaN(parsed) ? NaN : parsed);
      });
    }
  }

  return {
    init: init,
    start: start,
    stop: stop,
    reset: reset,
    tick: tick,
    setDuration: setDuration,
    formatTime: formatTime,
    beep: beep
  };
})();

/* ============================================================
   TodoList Module
   ============================================================ */
var TodoList = (function () {
  var SORT_OPTIONS = {
    "default":        function (a, b) { return a.insertedAt - b.insertedAt; },
    "az":             function (a, b) { return a.description.localeCompare(b.description, undefined, { sensitivity: "base" }); },
    "za":             function (a, b) { return b.description.localeCompare(a.description, undefined, { sensitivity: "base" }); },
    "completedLast":  function (a, b) { return (a.done === b.done) ? 0 : (a.done ? 1 : -1); },
    "completedFirst": function (a, b) { return (a.done === b.done) ? 0 : (a.done ? -1 : 1); }
  };

  function _persist() {
    Storage.set("tld_tasks", AppState.tasks);
  }

  function _generateId() {
    return String(Date.now()) + String(Math.random()).slice(2);
  }

  function _getSortedTasks() {
    var comparator = SORT_OPTIONS[AppState.sortPref] || SORT_OPTIONS["default"];
    return AppState.tasks.slice().sort(comparator);
  }

  function render() {
    var list     = document.getElementById("todo-list");
    var emptyEl  = document.getElementById("todo-empty");
    if (!list) return;

    var sorted = _getSortedTasks();

    if (sorted.length === 0) {
      list.innerHTML = "";
      if (emptyEl) emptyEl.removeAttribute("hidden");
      return;
    }

    if (emptyEl) emptyEl.setAttribute("hidden", "");

    list.innerHTML = sorted.map(function (task) {
      return (
        '<li class="todo-item' + (task.done ? " done" : "") + '" data-id="' + task.id + '">' +
          '<input type="checkbox" class="todo-item__checkbox" aria-label="Toggle task done"' +
          (task.done ? " checked" : "") + ' />' +
          '<span class="todo-item__text">' + _escHtml(task.description) + '</span>' +
          '<span class="todo-item__actions">' +
            '<button type="button" class="btn btn-icon todo-edit-btn" aria-label="Edit task">✏️</button>' +
            '<button type="button" class="btn btn-icon btn-danger todo-delete-btn" aria-label="Delete task">🗑️</button>' +
          '</span>' +
        '</li>'
      );
    }).join("");
  }

  function _escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function add(description) {
    var trimmed = (description || "").trim();
    var errorEl = document.getElementById("todo-add-error");

    if (!trimmed) {
      if (errorEl) {
        errorEl.textContent = "Task description cannot be empty.";
        errorEl.removeAttribute("hidden");
      }
      return false;
    }

    var lower = trimmed.toLowerCase();
    var duplicate = AppState.tasks.some(function (t) {
      return t.description.trim().toLowerCase() === lower;
    });

    if (duplicate) {
      if (errorEl) {
        errorEl.textContent = "A task with this description already exists.";
        errorEl.removeAttribute("hidden");
      }
      return false;
    }

    if (errorEl) errorEl.setAttribute("hidden", "");

    var task = {
      id:          _generateId(),
      description: trimmed,
      done:        false,
      insertedAt:  Date.now()
    };
    AppState.tasks.push(task);
    _persist();
    render();
    return true;
  }

  function toggle(id) {
    var task = AppState.tasks.find(function (t) { return t.id === id; });
    if (!task) return;
    task.done = !task.done;
    _persist();
    render();
  }

  function startEdit(id) {
    var item = document.querySelector(".todo-item[data-id='" + id + "']");
    if (!item) return;
    var task = AppState.tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    item.classList.add("todo-item--editing");
    item.innerHTML =
      '<input type="text" class="text-input todo-edit-input"' +
        ' value="' + _escHtml(task.description) + '"' +
        ' data-original="' + _escHtml(task.description) + '"' +
        ' aria-label="Edit task description" />' +
      '<span class="todo-item__actions">' +
        '<button type="button" class="btn btn-primary todo-save-btn" data-id="' + id + '">Save</button>' +
        '<button type="button" class="btn btn-secondary todo-cancel-btn" data-id="' + id + '">Cancel</button>' +
      '</span>';

    var input = item.querySelector(".todo-edit-input");
    if (input) {
      input.focus();
      input.select();
      input.addEventListener("keydown", function (e) {
        if (e.key === "Escape") cancelEdit(id);
        if (e.key === "Enter")  saveEdit(id, input.value);
      });
    }
  }

  function saveEdit(id, newDesc) {
    var trimmed = (newDesc || "").trim();
    var task    = AppState.tasks.find(function (t) { return t.id === id; });
    if (!task) return;

    var item = document.querySelector(".todo-item[data-id='" + id + "']");
    var errorEl = item && item.querySelector(".todo-edit-error");

    if (!trimmed) {
      _showEditError(item, "Description cannot be empty.");
      return;
    }

    var lower = trimmed.toLowerCase();
    var duplicate = AppState.tasks.some(function (t) {
      return t.id !== id && t.description.trim().toLowerCase() === lower;
    });

    if (duplicate) {
      _showEditError(item, "A task with this description already exists.");
      return;
    }

    task.description = trimmed;
    _persist();
    render();
  }

  function _showEditError(item, msg) {
    if (!item) return;
    var existing = item.querySelector(".todo-edit-error");
    if (!existing) {
      var p = document.createElement("p");
      p.className = "field-error todo-edit-error";
      p.style.width = "100%";
      p.textContent = msg;
      item.appendChild(p);
    } else {
      existing.textContent = msg;
    }
  }

  function cancelEdit(id) {
    render(); // re-render restores original display
  }

  function deleteTask(id) {
    AppState.tasks = AppState.tasks.filter(function (t) { return t.id !== id; });
    _persist();
    render();
  }

  function sort(option) {
    if (!SORT_OPTIONS[option]) return;
    AppState.sortPref = option;
    Storage.set("tld_sortPref", option);
    render();
  }

  function init() {
    var savedTasks = Storage.get("tld_tasks", []);
    AppState.tasks = Array.isArray(savedTasks) ? savedTasks : [];

    var savedSort = Storage.get("tld_sortPref", "default");
    AppState.sortPref = SORT_OPTIONS[savedSort] ? savedSort : "default";

    var sortSelect = document.getElementById("todo-sort-select");
    if (sortSelect) sortSelect.value = AppState.sortPref;

    render();

    // Delegate events on the list container
    var list = document.getElementById("todo-list");
    if (list) {
      list.addEventListener("change", function (e) {
        if (e.target.classList.contains("todo-item__checkbox")) {
          var item = e.target.closest(".todo-item");
          if (item) toggle(item.dataset.id);
        }
      });

      list.addEventListener("click", function (e) {
        var item = e.target.closest(".todo-item");
        if (!item) return;
        var id = item.dataset.id;

        if (e.target.classList.contains("todo-edit-btn")) {
          startEdit(id);
        } else if (e.target.classList.contains("todo-delete-btn")) {
          deleteTask(id);
        } else if (e.target.classList.contains("todo-save-btn")) {
          var input = item.querySelector(".todo-edit-input");
          saveEdit(id, input ? input.value : "");
        } else if (e.target.classList.contains("todo-cancel-btn")) {
          cancelEdit(id);
        }
      });
    }

    // Add form
    var form = document.getElementById("todo-add-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var input = document.getElementById("todo-input");
        if (add(input ? input.value : "")) {
          if (input) input.value = "";
        }
      });
    }

    // Sort select
    if (sortSelect) {
      sortSelect.addEventListener("change", function () {
        sort(sortSelect.value);
      });
    }
  }

  return {
    init: init,
    add: add,
    toggle: toggle,
    startEdit: startEdit,
    saveEdit: saveEdit,
    cancelEdit: cancelEdit,
    delete: deleteTask,
    sort: sort,
    render: render
  };
})();

/* ============================================================
   QuickLinks Module
   ============================================================ */
var QuickLinks = (function () {
  function validateUrl(url) {
    return typeof url === "string" &&
      (url.indexOf("http://") === 0 || url.indexOf("https://") === 0);
  }

  function _persist() {
    Storage.set("tld_quickLinks", AppState.quickLinks);
  }

  function _generateId() {
    return String(Date.now()) + String(Math.random()).slice(2);
  }

  function _escHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function render() {
    var grid    = document.getElementById("quicklinks-grid");
    var emptyEl = document.getElementById("quicklinks-empty");
    if (!grid) return;

    if (AppState.quickLinks.length === 0) {
      grid.innerHTML = "";
      if (emptyEl) emptyEl.removeAttribute("hidden");
      return;
    }

    if (emptyEl) emptyEl.setAttribute("hidden", "");

    grid.innerHTML = AppState.quickLinks.map(function (link) {
      return (
        '<div class="quicklink-item" role="listitem" data-id="' + link.id + '">' +
          '<a href="' + _escHtml(link.url) + '" target="_blank" rel="noopener noreferrer"' +
          ' class="quicklink-btn" aria-label="Open ' + _escHtml(link.label) + '">' +
          _escHtml(link.label) +
          '</a>' +
          '<button type="button" class="quicklink-delete-btn" aria-label="Delete link ' + _escHtml(link.label) + '">✕</button>' +
        '</div>'
      );
    }).join("");
  }

  function add(label, url) {
    var trimLabel = (label || "").trim();
    var trimUrl   = (url   || "").trim();
    var labelErr  = document.getElementById("quicklinks-label-error");
    var urlErr    = document.getElementById("quicklinks-url-error");
    var valid     = true;

    if (!trimLabel) {
      if (labelErr) {
        labelErr.textContent = "Label is required.";
        labelErr.removeAttribute("hidden");
      }
      valid = false;
    } else {
      if (labelErr) labelErr.setAttribute("hidden", "");
    }

    if (!validateUrl(trimUrl)) {
      if (urlErr) {
        urlErr.textContent = "URL must start with http:// or https://.";
        urlErr.removeAttribute("hidden");
      }
      valid = false;
    } else {
      if (urlErr) urlErr.setAttribute("hidden", "");
    }

    if (!valid) return false;

    var link = {
      id:    _generateId(),
      label: trimLabel,
      url:   trimUrl
    };
    AppState.quickLinks.push(link);
    _persist();
    render();
    return true;
  }

  function deleteLink(id) {
    AppState.quickLinks = AppState.quickLinks.filter(function (l) { return l.id !== id; });
    _persist();
    render();
  }

  function init() {
    var saved = Storage.get("tld_quickLinks", []);
    AppState.quickLinks = Array.isArray(saved) ? saved : [];

    render();

    // Delegate delete clicks on the grid
    var grid = document.getElementById("quicklinks-grid");
    if (grid) {
      grid.addEventListener("click", function (e) {
        if (e.target.classList.contains("quicklink-delete-btn")) {
          var item = e.target.closest(".quicklink-item");
          if (item) deleteLink(item.dataset.id);
        }
      });
    }

    // Add form
    var form = document.getElementById("quicklinks-add-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var labelInput = document.getElementById("quicklinks-label-input");
        var urlInput   = document.getElementById("quicklinks-url-input");
        if (add(labelInput ? labelInput.value : "", urlInput ? urlInput.value : "")) {
          if (labelInput) labelInput.value = "";
          if (urlInput)   urlInput.value   = "";
        }
      });
    }
  }

  return {
    init: init,
    add: add,
    delete: deleteLink,
    render: render,
    validateUrl: validateUrl
  };
})();

/* ============================================================
   App Bootstrap
   ============================================================ */
document.addEventListener("DOMContentLoaded", function () {
  // 1. Storage — check availability first; show banner if unavailable
  if (!Storage.isAvailable()) {
    AppState.storageAvailable = false;
    var banner = document.getElementById("storage-error-banner");
    if (banner) banner.removeAttribute("hidden");
  }

  // 2. Theme — read and apply before any widget renders to prevent FOUC
  Theme.init();

  // 3. Greeting
  Greeting.init();

  // 4. Focus Timer
  Timer.init();

  // 5. To-Do List
  TodoList.init();

  // 6. Quick Links
  QuickLinks.init();
});
