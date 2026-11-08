    const LEVEL_TITLE = { ALL_CLEAR: "ALL CLEAR", WATCH: "WATCH", WARNING: "WARNING", IMMINENT: "IMMINENT" };
    const LEVEL_SUB = {
      ALL_CLEAR: "No tropical systems threatening the island.",
      WATCH: "A system is active in the Atlantic basin. No immediate threat.",
      WARNING: "A storm may pass near the island. Prepare now.",
      IMMINENT: "Finish preparations and be ready to shelter.",
    };
    const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // ---- Inline line-icon set (Lucide, MIT-licensed) for a professional,
    // emoji-free UI. Icons are decorative (text labels carry meaning), so each
    // SVG is aria-hidden. currentColor makes them inherit the theme. (#icons)
    const UI_ICONS = {"sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />","calendar-days":"<path d=\"M8 2v4\" /> <path d=\"M16 2v4\" /> <rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\" /> <path d=\"M3 10h18\" /> <path d=\"M8 14h.01\" /> <path d=\"M12 14h.01\" /> <path d=\"M16 14h.01\" /> <path d=\"M8 18h.01\" /> <path d=\"M12 18h.01\" /> <path d=\"M16 18h.01\" />","umbrella":"<path d=\"M12 13v7a2 2 0 0 0 4 0\" /> <path d=\"M12 2v2\" /> <path d=\"M20.992 13a1 1 0 0 0 .97-1.274 10.284 10.284 0 0 0-19.923 0A1 1 0 0 0 3 13z\" />","cloud-rain":"<path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\" /> <path d=\"M16 14v6\" /> <path d=\"M8 14v6\" /> <path d=\"M12 16v6\" />","radar":"<path d=\"M19.07 4.93A10 10 0 0 0 6.99 3.34\" /> <path d=\"M4 6h.01\" /> <path d=\"M2.29 9.62A10 10 0 1 0 21.31 8.35\" /> <path d=\"M16.24 7.76A6 6 0 1 0 8.23 16.67\" /> <path d=\"M12 18h.01\" /> <path d=\"M17.99 11.66A6 6 0 0 1 15.77 16.67\" /> <circle cx=\"12\" cy=\"12\" r=\"2\" /> <path d=\"m13.41 10.59 5.66-5.66\" />","tornado":"<path d=\"M21 4H3\" /> <path d=\"M18 8H6\" /> <path d=\"M19 12H9\" /> <path d=\"M16 16h-6\" /> <path d=\"M11 20H9\" />","life-buoy":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m4.93 4.93 4.24 4.24\" /> <path d=\"m14.83 9.17 4.24-4.24\" /> <path d=\"m14.83 14.83 4.24 4.24\" /> <path d=\"m9.17 14.83-4.24 4.24\" /> <circle cx=\"12\" cy=\"12\" r=\"4\" />","backpack":"<path d=\"M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z\" /> <path d=\"M8 10h8\" /> <path d=\"M8 18h8\" /> <path d=\"M8 22v-6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v6\" /> <path d=\"M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2\" />","palmtree":"<path d=\"M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4\" /> <path d=\"M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-3l-1-1-1 1h-3\" /> <path d=\"M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.7-.7.71-.71 2.12-2.12c-1.95-1.96-5.27-1.8-7.42.35\" /> <path d=\"M11 15.5c.5 2.5-.17 4.5-1 6.5h4c2-5.5-.5-12-1-14\" />","waves":"<path d=\"M2 12q2.5 2 5 0t5 0 5 0 5 0\" /> <path d=\"M2 19q2.5 2 5 0t5 0 5 0 5 0\" /> <path d=\"M2 5q2.5 2 5 0t5 0 5 0 5 0\" />","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />","wind":"<path d=\"M12.8 19.6A2 2 0 1 0 14 16H2\" /> <path d=\"M17.5 8a2.5 2.5 0 1 1 2 4H2\" /> <path d=\"M9.8 4.4A2 2 0 1 1 11 8H2\" />","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\" /> <path d=\"M2 12h20\" />","tags":"<path d=\"M13.172 2a2 2 0 0 1 1.414.586l6.71 6.71a2.4 2.4 0 0 1 0 3.408l-4.592 4.592a2.4 2.4 0 0 1-3.408 0l-6.71-6.71A2 2 0 0 1 6 9.172V3a1 1 0 0 1 1-1z\" /> <path d=\"M2 7v6.172a2 2 0 0 0 .586 1.414l6.71 6.71a2.4 2.4 0 0 0 3.191.193\" /> <circle cx=\"10.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" />","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" /> <path d=\"M9 18h6\" /> <path d=\"M10 22h4\" />","history":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /> <path d=\"M3 3v5h5\" /> <path d=\"M12 7v5l4 2\" />","phone":"<path d=\"M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384\" />","house":"<path d=\"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8\" /> <path d=\"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" />","external-link":"<path d=\"M15 3h6v6\" /> <path d=\"M10 14 21 3\" /> <path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\" />","megaphone":"<path d=\"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z\" /> <path d=\"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14\" /> <path d=\"M8 6v8\" />","siren":"<path d=\"M7 18v-6a5 5 0 1 1 10 0v6\" /> <path d=\"M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z\" /> <path d=\"M21 12h1\" /> <path d=\"M18.5 4.5 18 5\" /> <path d=\"M2 12h1\" /> <path d=\"M12 2v1\" /> <path d=\"m4.929 4.929.707.707\" /> <path d=\"M12 12v6\" />","landmark":"<path d=\"M10 18v-7\" /> <path d=\"M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z\" /> <path d=\"M14 18v-7\" /> <path d=\"M18 18v-7\" /> <path d=\"M3 22h18\" /> <path d=\"M6 18v-7\" />","sailboat":"<path d=\"M10 2v15\" /> <path d=\"M7 22a4 4 0 0 1-4-4 1 1 0 0 1 1-1h16a1 1 0 0 1 1 1 4 4 0 0 1-4 4z\" /> <path d=\"M9.159 2.46a1 1 0 0 1 1.521-.193l9.977 8.98A1 1 0 0 1 20 13H4a1 1 0 0 1-.824-1.567z\" />","cloud-sun":"<path d=\"M12 2v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"M20 12h2\" /> <path d=\"m19.07 4.93-1.41 1.41\" /> <path d=\"M15.947 12.65a4 4 0 0 0-5.925-4.128\" /> <path d=\"M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z\" />","footprints":"<path d=\"M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z\" /> <path d=\"M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z\" /> <path d=\"M16 17h4\" /> <path d=\"M4 13h4\" />","trees":"<path d=\"M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z\" /> <path d=\"M7 16v6\" /> <path d=\"M13 19v3\" /> <path d=\"M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5\" />","flower-2":"<path d=\"M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1M9 8a3 3 0 1 0 3 3M9 8h1m5 0a3 3 0 1 1-3 3m3-3h-1m-2 3v-1\" /> <circle cx=\"12\" cy=\"8\" r=\"2\" /> <path d=\"M12 10v12\" /> <path d=\"M12 22c4.2 0 7-1.667 7-5-4.2 0-7 1.667-7 5Z\" /> <path d=\"M12 22c-4.2 0-7-1.667-7-5 4.2 0 7 1.667 7 5Z\" />","mountain":"<path d=\"m8 3 4 8 5-5 5 15H2L8 3z\" />","gem":"<path d=\"M10.5 3 8 9l4 13 4-13-2.5-6\" /> <path d=\"M17 3a2 2 0 0 1 1.6.8l3 4a2 2 0 0 1 .013 2.382l-7.99 10.986a2 2 0 0 1-3.247 0l-7.99-10.986A2 2 0 0 1 2.4 7.8l2.998-3.997A2 2 0 0 1 7 3z\" /> <path d=\"M2 9h20\" />","anchor":"<path d=\"M12 6v16\" /> <path d=\"m19 13 2-1a9 9 0 0 1-18 0l2 1\" /> <path d=\"M9 11h6\" /> <circle cx=\"12\" cy=\"4\" r=\"2\" />","wine":"<path d=\"M8 22h8\" /> <path d=\"M7 10h10\" /> <path d=\"M12 15v7\" /> <path d=\"M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z\" />","shopping-bag":"<path d=\"M16 10a4 4 0 0 1-8 0\" /> <path d=\"M3.103 6.034h17.794\" /> <path d=\"M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z\" />","utensils":"<path d=\"M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2\" /> <path d=\"M7 2v20\" /> <path d=\"M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7\" />","message-circle":"<path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\" />","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />","bell":"<path d=\"M10.268 21a2 2 0 0 0 3.464 0\" /> <path d=\"M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326\" />","triangle-alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\" /> <path d=\"M12 9v4\" /> <path d=\"M12 17h.01\" />"};
    function iconSvg(name) {
      const inner = UI_ICONS[name];
      if (!inner) return "";
      return `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
    }
    function hydrateIcons(root) {
      (root || document).querySelectorAll("[data-icon]").forEach((el) => {
        const n = el.getAttribute("data-icon");
        if (UI_ICONS[n]) el.innerHTML = iconSvg(n);
      });
    }

    // Date math is anchored to the island, not the browser's local TZ (#48).
    // A user opening the dashboard in UTC or Pacific time previously saw the
    // wrong day-of-week labels on the 7-day strip and the wrong wall-clock
    // for "winds reach us by X" — confusing during an actual storm.
    const ISLAND_TZ = "America/Barbados";
    // The feed's hourly/sunrise times are naive island-local strings
    // ("2026-11-08T13:00"), which new Date() would read in the viewer's zone.
    // Pin them to Barbados, UTC-4 all year with no DST (#118). Strings that
    // already carry Z or an offset pass through unchanged.
    const parseIslandTime = (iso) =>
      new Date(/T\d{2}:\d{2}(:\d{2})?$/.test(iso) ? iso + "-04:00" : iso);
    // Open-Meteo daily.date is already a YYYY-MM-DD calendar date in the island
    // TZ, so its weekday is timezone-independent. We parse as UTC midnight and
    // format in UTC: formatting in a negative-offset zone (island is UTC-4) would
    // land the instant on the previous calendar day and shift every label back
    // one (Thu → "Wed"). The time formatter below stays island TZ — it renders
    // real timestamps ("winds reach us by X"), which do need the local offset.
    const DOW_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });
    const ISLAND_TIME_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: ISLAND_TZ, hour: "numeric", minute: "2-digit", hour12: true });
    function islandDOW(dateStr) {
      if (!dateStr) return "—";
      const d = new Date(`${dateStr}T00:00:00Z`);
      if (!Number.isFinite(d.getTime())) return "—";
      // Intl returns "Sun"/"Mon"/etc with en-GB.
      return DOW_FMT.format(d);
    }

    // ---- Settings: units + theme, remembered in localStorage ----
    const settings = { temp: "C", wind: "kmh", theme: "light" };
    function loadSettings() { try { Object.assign(settings, JSON.parse(localStorage.getItem("hr-settings") || "{}")); } catch { /* ignore */ } }
    function saveSettings() { try { localStorage.setItem("hr-settings", JSON.stringify(settings)); } catch { /* ignore */ } }
    const prefersDark = () => !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
    function applyTheme() {
      const eff = settings.theme === "auto" ? (prefersDark() ? "dark" : "light") : settings.theme;
      document.documentElement.setAttribute("data-theme", eff);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", eff === "light" ? "#eef3fa" : "#0b1220");
      if (basemap) basemap.setUrl(cartoUrl());
    }
    // Data is stored in °C and km/h; current-conditions wind is in knots.
    const toTemp = (c) => c == null ? null : settings.temp === "F" ? Math.round(c * 9 / 5 + 32) : Math.round(c);
    const tUnit = () => settings.temp === "F" ? "°F" : "°C";
    const fmtTemp = (c) => c == null ? "—" : `${toTemp(c)}${tUnit()}`;
    const fmtDeg = (c) => c == null ? "—" : `${toTemp(c)}°`;
    const wUnit = () => settings.wind === "kt" ? "kt" : settings.wind === "mph" ? "mph" : "km/h";
    const fromKmh = (k) => k == null ? null : settings.wind === "kt" ? Math.round(k / 1.852) : settings.wind === "mph" ? Math.round(k / 1.609) : Math.round(k);
    const fromKt = (kt) => kt == null ? null : fromKmh(kt * 1.852);

    let lastStatus = null;
    function initSettings() {
      loadSettings();
      applyTheme();
      const t = document.getElementById("set-temp"), w = document.getElementById("set-wind"), th = document.getElementById("set-theme");
      t.value = settings.temp; w.value = settings.wind; th.value = settings.theme;
      const btn = document.getElementById("settings-btn"), panel = document.getElementById("settings-panel");
      // Settings panel a11y (#47): on open, focus moves into the panel; on
      // close, focus returns to the trigger button; Escape closes from
      // anywhere inside the panel. Keyboard-only users can now reach and
      // dismiss the menu.
      function openSettings() {
        panel.hidden = false;
        btn.setAttribute("aria-expanded", "true");
        panel.querySelector("select")?.focus();
      }
      function closeSettings({ restoreFocus = true } = {}) {
        if (panel.hidden) return;
        panel.hidden = true;
        btn.setAttribute("aria-expanded", "false");
        if (restoreFocus) btn.focus();
      }
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (panel.hidden) openSettings(); else closeSettings({ restoreFocus: false });
      });
      document.addEventListener("click", (e) => {
        if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) {
          closeSettings({ restoreFocus: false });
        }
      });
      panel.addEventListener("keydown", (e) => {
        if (e.key === "Escape") { e.preventDefault(); closeSettings(); }
      });
      const onChange = () => { settings.temp = t.value; settings.wind = w.value; settings.theme = th.value; saveSettings(); applyTheme(); if (lastStatus) render(lastStatus); };
      t.onchange = onChange; w.onchange = onChange; th.onchange = onChange;
      if (window.matchMedia) window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (settings.theme === "auto") applyTheme(); });
    }

    // Live-region update-on-change (#49). Each poll re-renders the same
    // banner / civil / flood / arrival / wave text most of the time; without
    // this guard, screen readers re-announce the same string every minute
    // when a civil alert is active (assertive) or whenever a level title
    // hasn't changed. Skipping the DOM write when text matches keeps the
    // live region quiet.
    function setLiveText(el, text) {
      if (!el || el.__hrLast === text) return;
      el.__hrLast = text;
      el.textContent = text;
    }
    function setLiveHtml(el, html) {
      if (!el || el.__hrLast === html) return;
      el.__hrLast = html;
      el.innerHTML = html;
    }

    // Briefing sanitization (#51). Strip bidi / format / invisible-control
    // characters that could visually reverse evacuation guidance (U+202E
    // RIGHT-TO-LEFT OVERRIDE) and cap at 4 KB so a degenerate Bedrock
    // output can't blow out layout or scroll the user past the rest of
    // the dashboard.
    // U+202A-202E: explicit bidi overrides   (LRE, RLE, PDF, LRO, RLO)
    // U+2066-2069: bidi isolates             (LRI, RLI, FSI, PDI)
    // U+200E/200F: LTR / RTL marks
    // U+FEFF:      zero-width no-break space / BOM
    // Built via RegExp() so no literal control chars sit in the source.
    const BIDI_CTL_RE = new RegExp(
      "[\\u202A-\\u202E\\u2066-\\u2069\\u200E\\u200F\\uFEFF]",
      "g"
    );
    // HTML-escape NHC-derived strings before they're interpolated into
    // template literals (#29). NHC is currently trusted, but the chain
    // NHC RSS → server regex parse → JSON → template literal → innerHTML
    // is fragile, and one bad upstream byte shouldn't be enough to land
    // executable script on the dashboard. Combined with the CSP drop of
    // `'unsafe-inline'` on script-src (the inline-script extraction this
    // file enables), even an XSS that does land can't run inline scripts.
    const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    function escapeHtml(s) {
      if (s == null) return "";
      return String(s).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
    }

    function sanitizeBriefing(s) {
      if (s == null) return "—";
      return String(s).replace(BIDI_CTL_RE, "").slice(0, 4000);
    }

    function icon(code) {
      if (code === 0) return "☀️";
      if (code === 1 || code === 2) return "🌤️";
      if (code === 3) return "☁️";
      if (code === 45 || code === 48) return "🌫️";
      if (code >= 51 && code <= 67) return "🌧️";
      if (code >= 71 && code <= 77) return "❄️";
      if (code >= 80 && code <= 82) return "🌦️";
      if (code >= 95) return "⛈️";
      return "🌡️";
    }
    const uvWord = (uv) => uv == null ? "—" : uv < 3 ? "Low" : uv < 6 ? "Moderate" : uv < 8 ? "High" : uv < 11 ? "Very high" : "Extreme";
    const uvClass = (uv) => uv == null ? "low" : uv < 3 ? "low" : uv < 6 ? "moderate" : uv < 8 ? "high" : "extreme";
    const seaWord = (m) => m == null ? "—" : m < 1 ? "Calm" : m < 1.5 ? "Slight" : m < 2.5 ? "Moderate" : m < 4 ? "Rough" : "Very rough";
    const aqiWord = (v) => v == null ? "—" : v <= 50 ? "Good" : v <= 100 ? "Moderate" : v <= 150 ? "Unhealthy (sensitive)" : v <= 200 ? "Unhealthy" : v <= 300 ? "Very unhealthy" : "Hazardous";
    const aqiClass = (v) => v == null ? "low" : v <= 50 ? "low" : v <= 100 ? "medium" : "high";
    const hazeWord = (pm10) => pm10 == null ? "—" : pm10 < 30 ? "Clear" : pm10 < 55 ? "Slight haze" : pm10 < 110 ? "Hazy" : pm10 < 180 ? "Thick dust" : "Severe dust";
    const hazeClass = (pm10) => pm10 == null ? "low" : pm10 < 55 ? "low" : pm10 < 110 ? "medium" : "high";
    const windWordKt = (kt) => kt == null ? "light" : kt < 7 ? "light" : kt < 16 ? "gentle" : kt < 22 ? "breezy" : kt < 34 ? "fresh" : "strong";

    // Plain-language "what does this rating mean + what should I do" notes,
    // shown on demand behind a "?" so the tiles stay uncluttered.
    const seaExplain = (m) => m == null ? null
      : m < 1 ? "<b>Calm</b> — flat, glassy water. Great for swimming and small boats."
      : m < 1.5 ? "<b>Slight</b> — small waves about 1 m, knee-to-waist high. Fine for a swim."
      : m < 2.5 ? "<b>Moderate</b> — choppy, waves up to about 2.5 m. Swim with care and watch children."
      : m < 4 ? "<b>Rough</b> — big waves (2.5–4 m). Best to stay out of the water."
      : "<b>Very rough</b> — dangerous seas over 4 m. Keep off the beaches and don't take a boat out.";
    const uvExplain = (uv) => uv == null ? null
      : uv < 3 ? "<b>Low</b> — little burn risk. Safe to be outside."
      : uv < 6 ? "<b>Moderate</b> — you could burn in 30–45 min. Wear a hat and sunscreen for long stints outside."
      : uv < 8 ? "<b>High</b> — skin burns in about 25 min. Wear sunscreen and seek shade around midday."
      : uv < 11 ? "<b>Very high</b> — burns in about 15 min. Cover up and limit midday sun."
      : "<b>Extreme</b> — burns in minutes. Stay out of the midday sun where you can.";
    const aqiExplain = (v) => v == null ? null
      : v <= 50 ? "<b>Good</b> — the air is clean. Fine for everyone."
      : v <= 100 ? "<b>Moderate</b> — mostly fine. A few unusually sensitive people might notice irritation."
      : v <= 150 ? "<b>Unhealthy for sensitive groups</b> — OK for most, but people with asthma, heart or lung conditions should ease up on hard outdoor activity."
      : v <= 200 ? "<b>Unhealthy</b> — everyone may start to feel it. Limit long or intense time outdoors."
      : v <= 300 ? "<b>Very unhealthy</b> — health alert. Cut outdoor activity and keep windows shut."
      : "<b>Hazardous</b> — emergency levels. Stay indoors.";
    const hazeExplain = (pm10) => pm10 == null ? null
      : pm10 < 30 ? "Saharan dust blows across the Atlantic and hazes the sky. <b>Clear</b> right now — little dust about."
      : pm10 < 55 ? "Saharan dust blows across the Atlantic and hazes the sky. <b>Slight haze</b> — the sky looks a little milky; most people won't be affected."
      : pm10 < 110 ? "Saharan dust blows across the Atlantic and hazes the sky. <b>Hazy</b> — noticeable dust; people with asthma may feel it."
      : pm10 < 180 ? "Saharan dust blows across the Atlantic and hazes the sky. <b>Thick dust</b> — hazy air; limit time outdoors if you have breathing trouble."
      : "Saharan dust blows across the Atlantic and hazes the sky. <b>Severe dust</b> — keep windows closed; asthma and allergy sufferers should stay in.";

    // Build a readout tile. If `note` is given, add a "?" that reveals a
    // plain-language explanation in the same box — kept hidden by default so
    // the grid isn't an information dump.
    function infoTile(lbl, valHtml, note) {
      // No inline onclick (#29): the document-level delegated handler in
      // start() picks up clicks on any `.tile-info` button. `lbl` is one
      // of our own labels (not user data), but escape defensively anyway.
      const info = note
        ? `<button type="button" class="tile-info" aria-label="What does ${escapeHtml(lbl)} mean?" aria-expanded="false">?</button><div class="tile-note" hidden>${note}</div>`
        : "";
      return `<div class="wx-tile"><div class="lbl">${escapeHtml(lbl)}</div><div class="val">${valHtml}</div>${info}</div>`;
    }
    function toggleTileNote(btn) {
      const note = btn.parentElement && btn.parentElement.querySelector(".tile-note");
      if (!note) return;
      const open = note.hidden;
      note.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    }
    // Turn WMO descriptions into a natural adjective for "it's 22°C and ___".
    const feel = (code, desc) =>
      code >= 95 ? "stormy" :
      code >= 80 && code <= 82 ? "showery" :
      code >= 61 && code <= 67 ? "rainy" :
      code >= 51 && code <= 55 ? "drizzly" :
      code === 45 || code === 48 ? "foggy" :
      desc.toLowerCase();
    // Compact "1pm" / "12am" form in island TZ (#48). Used in the hourly
    // strip — pre-fix used d.getHours() which drifts with the viewer's
    // local TZ, making "1pm" mean different things to different users.
    const HOUR_FMT = new Intl.DateTimeFormat("en-GB", { timeZone: ISLAND_TZ, hour: "numeric", hour12: true });
    const hourLabel = (iso) => {
      if (!iso) return "—";
      const d = parseIslandTime(iso);
      if (!Number.isFinite(d.getTime())) return "—";
      // Intl gives "1 pm" / "12 am" with a space; collapse to "1pm".
      return HOUR_FMT.format(d).toLowerCase().replace(/\s/g, "");
    };
    const timeLabel = (iso) => {
      // Format in island TZ (#48). Pre-fix used d.getHours() which is the
      // browser's local TZ — a UK user opening this saw sunrise/sunset and
      // storm-arrival times shifted by their offset.
      if (!iso) return "—";
      const d = parseIslandTime(iso);
      if (!Number.isFinite(d.getTime())) return "—";
      // Intl returns e.g. "1:24 pm" with en-GB + hour12.
      return ISLAND_TIME_FMT.format(d).toLowerCase();
    };
    const MOON_ICONS = {
      "New moon": "🌑", "Waxing crescent": "🌒", "First quarter": "🌓",
      "Waxing gibbous": "🌔", "Full moon": "🌕", "Waning gibbous": "🌖",
      "Last quarter": "🌗", "Waning crescent": "🌘",
    };

    let map, layerGroup, radarLayer, radarFrames = [], radarHost = "", radarIdx = 0, radarTimer = null;
    let mapIsland = null, basemap = null;

    // CARTO basemaps need a key since 2026 (keyless tiles come back watermarked
    // "API KEY REQUIRED" with a 200). It's a public browser key, locked in the
    // CARTO dashboard to bimweather.246labs.cloud, so other sites (and
    // localhost) get 403. It relies on the site's strict-origin-when-cross-origin
    // Referrer-Policy sending our origin to the tile host.
    const CARTO_KEY = "cb1_54ok_1_b6e739d860bb19708d4ffac0";

    // Tiles follow the effective theme (#109): dark_all's labels are unreadable
    // on a light page and light_all's on a dark one. applyTheme re-points the layer.
    const cartoUrl = () => {
      const style = document.documentElement.dataset.theme === "light" ? "light_all" : "dark_all";
      return `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`;
    };

    function initMap(island) {
      mapIsland = island;
      map = L.map("map", { zoomControl: false }).setView([island.lat, island.lon], 6);
      const carto = basemap = L.tileLayer(cartoUrl(), {
        attribution: "&copy; OpenStreetMap contributors &copy; CARTO", maxZoom: 19,
        // Both tile hosts check the Referer (CARTO's key is locked to our
        // domain; OpenStreetMap's usage policy expects one), so send our origin
        // explicitly rather than relying on the page-wide Referrer-Policy.
        referrerPolicy: "strict-origin-when-cross-origin",
      }).addTo(map);
      // If CARTO refuses our tiles (403 off our domain, e.g. localhost), swap
      // once to OpenStreetMap's own tiles, darkened in CSS in the dark theme. Radar and
      // storms draw on top either way. A browser or extension that strips the
      // Referer entirely may be refused by both; that's no worse than before.
      // Judged per loading cycle (each pan/zoom starts one): a tile or two
      // served from cache mustn't hide the rest of the view failing.
      let loads = 0, errors = 0, swapped = false;
      carto.on("loading", () => { loads = 0; errors = 0; });
      carto.on("tileload", () => { loads++; });
      carto.on("tileerror", () => {
        if (swapped || ++errors < 3 || errors <= loads) return;
        swapped = true;
        map.removeLayer(carto); basemap = null;
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors", maxZoom: 19, className: "basemap-fallback",
          referrerPolicy: "strict-origin-when-cross-origin",
        }).addTo(map);
      });
      layerGroup = L.layerGroup().addTo(map);
      setupRadar();
    }

    async function setupRadar() {
      try {
        const r = await fetch("https://api.rainviewer.com/public/weather-maps.json");
        const data = await r.json();
        radarHost = data.host;
        radarFrames = (data.radar.past || []).concat(data.radar.nowcast || []);
        if (radarFrames.length) showRadarFrame(radarFrames.length - 1);
      } catch { /* radar optional */ }
    }

    function showRadarFrame(i) {
      if (!radarHost || !radarFrames[i]) return;
      radarIdx = i;
      const f = radarFrames[i];
      const url = `${radarHost}${f.path}/256/{z}/{x}/{y}/4/1_1.png`;
      if (radarLayer) map.removeLayer(radarLayer);
      radarLayer = L.tileLayer(url, { opacity: 0.6, zIndex: 5 }).addTo(map);
      document.getElementById("radar-time").textContent =
        "Radar " + new Date(f.time * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }

    // Play/Pause buttons: the visible label is the accessible name (#106); the glyph is decoration.
    function setToggle(btn, glyph, label) {
      const g = document.createElement("span");
      g.setAttribute("aria-hidden", "true");
      g.textContent = glyph;
      btn.replaceChildren(...(glyph ? [g, " " + label] : [label]));
    }

    function toggleRadar() {
      const btn = document.getElementById("radar-toggle");
      if (radarTimer) {
        clearInterval(radarTimer); radarTimer = null; setToggle(btn, "▶", "Play radar"); return;
      }
      if (!radarFrames.length) return;
      setToggle(btn, "⏸", "Pause radar");
      radarTimer = setInterval(() => {
        showRadarFrame((radarIdx + 1) % radarFrames.length);
      }, 700);
    }

    const SAT_BASE = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/car/GEOCOLOR/";
    let satFrames = [], satIdx = 0, satTimer = null, satLoaded = false;

    const dayOfYear = (d) =>
      Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
    const satFrameUrl = (d, size) => {
      const ts = `${d.getUTCFullYear()}${String(dayOfYear(d)).padStart(3, "0")}` +
        `${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}`;
      return `${SAT_BASE}${ts}_GOES19-ABI-car-GEOCOLOR-${size}.jpg`;
    };

    function setSatellite() {
      const fig = document.getElementById("sat");
      const img = document.getElementById("sat-img");
      const bucket = Math.floor(Date.now() / 600000);
      img.onload = () => { fig.hidden = false; };
      img.onerror = () => { fig.hidden = true; };
      // Smaller image on phones — ~286 KB vs ~950 KB, easier on mobile data.
      const size = window.innerWidth < 560 ? "500x500" : "1000x1000";
      img.src = `${SAT_BASE}${size}.jpg?_=${bucket}`;
    }

    // Lazily preload the last ~100 minutes of frames (started 20 min back to
    // allow for posting latency); keep only the ones that actually load.
    function loadSatFrames() {
      if (satLoaded) return Promise.resolve();
      const now = new Date();
      now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 10) * 10, 0, 0);
      const got = [];
      const tries = [];
      for (let i = 2; i < 12; i++) {
        const d = new Date(now.getTime() - i * 600000);
        const url = satFrameUrl(d, "500x500");
        tries.push(new Promise((res) => {
          const im = new Image();
          im.onload = () => { got.push({ t: d.getTime(), url }); res(); };
          im.onerror = () => res();
          im.src = url;
        }));
      }
      return Promise.all(tries).then(() => {
        got.sort((a, b) => a.t - b.t);
        satFrames = got;
        satLoaded = true;
      });
    }

    // Windy wind map (embed.windy.com). Click-to-load: the embed pulls several
    // MB of scripts and tiles, which matters on mobile data during a storm.
    // The CSP's frame-src must allow https://embed.windy.com.
    function loadWindy() {
      const frame = document.getElementById("windy-frame");
      if (frame.querySelector("iframe")) return;
      const lat = mapIsland ? mapIsland.lat : 13.19;
      const lon = mapIsland ? mapIsland.lon : -59.54;
      const q = new URLSearchParams({
        // No marker=true: it didn't draw a pin in testing, and the map already
        // labels Bridgetown. (The embed logs its own harmless "Invalid LatLng
        // (NaN, NaN)" from its picker script either way.)
        type: "map", location: "coordinates", lat, lon, zoom: 5,
        overlay: "wind", product: "ecmwf", level: "surface",
        metricWind: "kt", metricTemp: "°C", metricRain: "mm",
        calendar: "now",
      });
      const iframe = document.createElement("iframe");
      iframe.src = "https://embed.windy.com/embed.html?" + q;
      iframe.title = "Windy.com wind forecast map centred on Barbados";
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = "strict-origin-when-cross-origin";
      frame.replaceChildren(iframe);
    }

    async function toggleSat() {
      const btn = document.getElementById("sat-toggle");
      const img = document.getElementById("sat-img");
      const time = document.getElementById("sat-time");
      if (satTimer) {
        clearInterval(satTimer); satTimer = null;
        setToggle(btn, "▶", "Play loop"); time.textContent = "";
        setSatellite();
        return;
      }
      setToggle(btn, "", "Loading loop…");
      await loadSatFrames();
      if (!satFrames.length) { setToggle(btn, "▶", "Play loop"); return; }
      setToggle(btn, "⏸", "Pause loop");
      satIdx = 0;
      img.onerror = null;
      satTimer = setInterval(() => {
        const f = satFrames[satIdx % satFrames.length];
        img.src = f.url;
        time.textContent = "Frame " + new Date(f.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        satIdx++;
      }, 600);
    }

    // Things to do in Barbados, tagged by the weather they suit. "fine" = dry
    // day, "wet" = rain about, "windy" = breezy; "any" works rain or shine.
    const ACTIVITIES = [
      { icon: "waves", name: "Carlisle Bay", area: "Bridgetown", blurb: "Calm, clear water for a swim and snorkelling over shipwrecks.", modes: ["fine"], indoor: false },
      { icon: "umbrella", name: "Crane Beach", area: "St. Philip", blurb: "One of the island's most famous pink-sand beaches.", modes: ["fine"], indoor: false },
      { icon: "sailboat", name: "Catamaran cruise", area: "West coast", blurb: "Sail the calm Caribbean side and swim with sea turtles.", modes: ["fine"], indoor: false },
      { icon: "trees", name: "Welchman Hall Gully", area: "St. Thomas", blurb: "A shady walk through tropical forest and giant trees.", modes: ["fine"], indoor: false },
      { icon: "flower-2", name: "Hunte's Gardens", area: "St. Joseph", blurb: "A lush, leafy garden tucked into a gully.", modes: ["fine"], indoor: false },
      { icon: "mountain", name: "Farley Hill National Park", area: "St. Peter", blurb: "Picnic spot with sweeping views over the east coast.", modes: ["fine"], indoor: false },
      { icon: "waves", name: "Bathsheba & the Soup Bowl", area: "St. Joseph", blurb: "Watch the surfers and the dramatic Atlantic rollers.", modes: ["fine", "windy"], indoor: false },
      { icon: "wind", name: "Silver Sands", area: "Christ Church", blurb: "The island's kitesurfing and windsurfing hotspot — best when it's breezy.", modes: ["windy"], indoor: false },
      { icon: "gem", name: "Harrison's Cave", area: "St. Thomas", blurb: "Underground crystal cave by tram — great whatever the weather.", modes: ["wet", "fine", "any"], indoor: true },
      { icon: "anchor", name: "Animal Flower Cave", area: "St. Lucy", blurb: "A sea cave at the island's northern tip with ocean views.", modes: ["fine", "any"], indoor: false },
      { icon: "landmark", name: "Barbados Museum", area: "Garrison", blurb: "Island history and heritage, all under one roof.", modes: ["wet"], indoor: true },
      { icon: "wine", name: "Rum distillery tour", area: "Mount Gay / St. Nicholas Abbey", blurb: "Tour a historic distillery and taste Barbadian rum, rain or shine.", modes: ["wet", "any"], indoor: true },
      { icon: "shopping-bag", name: "Bridgetown & Broad Street", area: "Bridgetown", blurb: "Shopping and the UNESCO-listed Garrison — easy to enjoy in the rain.", modes: ["wet", "any"], indoor: true },
      { icon: "utensils", name: "Oistins Fish Fry", area: "Christ Church", blurb: "Friday-night food, music and liming by the sea.", modes: ["any"], indoor: false },
    ];
    function todayMode(s) {
      const w = s.weather;
      const today = s.outlook && s.outlook.daily && s.outlook.daily[0];
      const rainProb = today ? (today.rainProb ?? 0) : 0;
      const raining = !!(w && w.precipMm > 0);
      const windKt = w ? (w.windKt ?? 0) : 0;
      const known = !!(w || today);
      if (!known) return "any";
      if (raining || rainProb >= 55) return "wet";
      if (windKt >= 22) return "windy";
      return "fine";
    }
    function renderThingsToDo(s) {
      const grid = document.getElementById("todo-grid");
      const sum = document.getElementById("todo-summary");
      if (!grid) return;
      const mode = todayMode(s);
      let pick = ACTIVITIES.filter((a) => a.modes.includes(mode) || a.modes.includes("any"));
      if (mode === "wet") pick = pick.sort((a, b) => (b.indoor ? 1 : 0) - (a.indoor ? 1 : 0));
      pick = pick.slice(0, 6);
      sum.textContent =
        mode === "wet" ? "A wet one today — here are some things to do under cover:"
        : mode === "windy" ? "Breezy out — good for the water, or try these:"
        : mode === "fine" ? "Great day to get outside — a few ideas:"
        : "Some ideas for your time in Barbados:";
      grid.innerHTML = pick.map((a) =>
        `<div class="todo-item"><div class="todo-ico">${iconSvg(a.icon)}</div>` +
        `<div><div class="todo-name">${escapeHtml(a.name)}</div>` +
        `<div class="todo-area">${escapeHtml(a.area)}</div>` +
        `<div class="todo-blurb">${escapeHtml(a.blurb)}</div></div></div>`).join("");
    }

    // A friendly "today at a glance" verdict (weather.com-style activity tip),
    // built from today's rain chance, wind and UV. Safety takes priority.
    function dayVerdict(s) {
      const w = s.weather;
      const today = s.outlook && s.outlook.daily && s.outlook.daily[0];
      if (!w && !today) return null;
      if (s.level && s.level !== "ALL_CLEAR") {
        return { icon: "tornado", html: "<b>Unsettled spell.</b> Keep an eye on the storm updates below and have your plan ready." };
      }
      const rainProb = today ? (today.rainProb ?? 0) : 0;
      const raining = !!(w && w.precipMm > 0);
      const windKt = w ? (w.windKt ?? 0) : 0;
      const uv = today ? (today.uvMax ?? 0) : 0;
      const sun = uv >= 8 ? " Wear sunscreen and grab some shade around midday." : "";
      if (raining || rainProb >= 65) {
        return { icon: "umbrella", html: "<b>A wet one today.</b> Keep an umbrella handy — better for indoor plans." };
      }
      if (rainProb >= 35) {
        return { icon: "cloud-sun", html: "<b>Sun with the odd shower.</b> Fine for a quick outing, but carry a brolly just in case." };
      }
      if (windKt >= 22) {
        return { icon: "footprints", html: `<b>Dry but breezy.</b> Good for a walk — just hold onto your hat.${sun}` };
      }
      return { icon: "palmtree", html: `<b>Lovely day.</b> Great for a walk, the beach or a lime outside.${sun}` };
    }

    function renderNow(s) {
      const w = s.weather;
      const el = document.getElementById("now-summary");
      const dv = document.getElementById("day-verdict");
      const verdict = dayVerdict(s);
      if (verdict && dv) {
        dv.hidden = false;
        document.getElementById("dv-ico").innerHTML = iconSvg(verdict.icon);
        document.getElementById("dv-text").innerHTML = verdict.html;
      } else if (dv) {
        dv.hidden = true;
      }
      if (!w) { el.textContent = "Current conditions are unavailable right now."; return; }
      document.getElementById("wx-now").hidden = false;
      document.getElementById("wx-grid").hidden = false;
      document.getElementById("wx-ico").textContent = icon(w.code);
      document.getElementById("wx-temp").textContent = fmtTemp(w.tempC);
      document.getElementById("wx-desc").textContent = w.description;
      document.getElementById("wx-feels").textContent = "Feels like " + fmtTemp(w.feelsLikeC);
      const td = s.outlook && s.outlook.daily && s.outlook.daily[0];
      document.getElementById("wx-hilo").innerHTML = td
        ? `Today <b>${fmtDeg(td.maxC)}</b> / ${fmtDeg(td.minC)}` : "";
      document.getElementById("wx-grid").innerHTML = `
        <div class="wx-tile"><div class="lbl">Wind</div><div class="val">${fromKt(w.windKt)} ${wUnit()} ${w.windFrom}</div></div>
        <div class="wx-tile"><div class="lbl">Gusts</div><div class="val">${fromKt(w.gustKt)} ${wUnit()}</div></div>
        <div class="wx-tile"><div class="lbl">Humidity</div><div class="val">${w.humidity}%</div></div>
        <div class="wx-tile"><div class="lbl">Rain</div><div class="val">${w.precipMm} mm</div></div>`;
      document.getElementById("wx-obs").textContent =
        "Observed " + agoText(w.observedAt + "Z") + " · Open-Meteo";
      const rain = w.precipMm > 0 ? " Light rain is falling." : "";
      const today = s.outlook && s.outlook.daily && s.outlook.daily[0];
      let todayClause = "";
      if (today) {
        const rp = today.rainProb ?? 0;
        const rainPhrase = rp >= 60 ? "showers likely" : rp >= 30 ? "a chance of showers" : "mostly dry";
        todayClause = ` Today: high ${fmtTemp(today.maxC)}, ${rainPhrase}.`;
      }
      el.innerHTML = `<span class="lead">It's ${fmtTemp(w.tempC)} and ${feel(w.code, w.description)}</span>, ` +
        `with a ${windWordKt(w.windKt)} ${w.windFrom} breeze.${rain}${todayClause}`;
    }

    // The card icons are decorative, so the condition (the server's WMO
    // description, as for "Right now") is read as hidden text instead (#103).
    // the server uses "—" for an unmapped weather code
    const condSr = (desc) => desc && desc !== "—" ? `<span class="sr-only">${escapeHtml(desc)}. </span>` : "";

    function renderForecast(o) {
      const wrap = document.getElementById("days");
      const age = document.getElementById("forecast-age");
      const googleDaily = !!(o && o.sources && o.sources.dailyRain === "google");
      age.textContent = o && o.generatedAt ? "Updated " + agoText(o.generatedAt) + (googleDaily ? " · Open-Meteo and Google" : " · Open-Meteo") : "";
      // Google's chances require attribution wherever they appear.
      document.getElementById("forecast-attribution").hidden = !googleDaily;
      if (!o || !o.daily || !o.daily.length) { wrap.innerHTML = '<p class="summary">Forecast unavailable right now.</p>'; document.getElementById("forecast-summary").textContent = ""; return; }
      wrap.innerHTML = o.daily.map((d, idx) => {
        const dow = idx === 0 ? "Today" : islandDOW(d.date);
        const rain = d.rainProb != null ? rainChance("rain", d.rainProb, (d.thunderProb ?? 0) >= 30 ? ", " : "") : "";
        const thunder = thunderChance(d.thunderProb);
        return `<div class="day"><div class="dow">${dow}</div><div class="ico" aria-hidden="true">${icon(d.code)}</div>${condSr(d.description)}
          <div><span class="sr-only">High </span><span class="hi">${fmtDeg(d.maxC)}</span> <span class="sr-only">low </span><span class="lo">${fmtDeg(d.minC)}</span></div>${rain}${thunder}</div>`;
      }).join("");
      const wet = o.daily.filter(d => (d.rainProb ?? 0) >= 50).length;
      const hi = Math.max(...o.daily.map(d => d.maxC));
      const lo = Math.min(...o.daily.map(d => d.minC));
      const temps = `Temperatures ${toTemp(lo)}–${toTemp(hi)}${tUnit()}.`;
      let lead, rest;
      if (wet === 0) { lead = "Mostly settled week ahead."; rest = ` Highs around ${fmtTemp(hi)}, lows near ${fmtTemp(lo)}, with little rain expected.`; }
      else if (wet === 7) { lead = "A wet week ahead."; rest = ` Rain is likely every day. ${temps}`; }
      else if (wet >= 4) { lead = "A wet week."; rest = ` ${wet} of the next 7 days look rainy. ${temps}`; }
      else { lead = "A mostly fine week."; rest = ` Just ${wet} wet ${wet === 1 ? "day" : "days"} ahead. ${temps}`; }
      document.getElementById("forecast-summary").innerHTML = `<span class="lead">${lead}</span>${rest}`;
    }

    // Rain and thunder chances for the hourly strip and 7-day cards. The emoji
    // are hidden from screen readers and replaced with words, because a title
    // attribute alone often isn't announced.
    const rainChance = (cls, pct, sep = "") =>
      `<div class="${cls}" title="Chance of rain"><span aria-hidden="true">💧</span> ${pct}%<span class="sr-only"> chance of rain${sep}</span></div>`;
    const thunderChance = (pct, sep = "") => (pct ?? 0) >= 30
      ? `<div class="th" title="Chance of thunderstorms"><span aria-hidden="true">⚡</span> ${pct}%<span class="sr-only"> chance of thunderstorms${sep}</span></div>`
      : "";

    const hasTh = (x) => (x.thunderProb ?? 0) >= 30;

    function renderRainWind(o, w) {
      const wrap = document.getElementById("hours");
      const sum = document.getElementById("rainwind-summary");
      if (!o || !o.hourly || !o.hourly.length) { sum.textContent = "Hourly outlook unavailable right now."; wrap.innerHTML = ""; document.getElementById("rain-attribution").hidden = true; return; }
      const h = o.hourly;
      wrap.innerHTML = h.map(x => `
        <div class="hr"><div class="t">${hourLabel(x.time)}</div><div class="ico" aria-hidden="true">${icon(x.code)}</div>${condSr(x.description)}
          ${rainChance("r", x.rainProb ?? 0, hasTh(x) ? "" : ", ")}${thunderChance(x.thunderProb, ", ")}<div class="w"><span class="sr-only">wind </span>${fromKmh(x.windKmh)} ${wUnit()}</div></div>`).join("");
      // Google's chances require attribution wherever they appear.
      document.getElementById("rain-attribution").hidden = !(o.sources && o.sources.rain === "google");
      let peak = h[0];
      for (const x of h) if ((x.rainProb ?? 0) > (peak.rainProb ?? 0)) peak = x;
      const winds = h.map(x => x.windKmh);
      const wlo = Math.min(...winds), whi = Math.max(...winds);
      const dir = w ? " from the " + w.windFrom : "";
      let rainText;
      if ((peak.rainProb ?? 0) < 30) rainText = "Little to no rain expected over the next 24 hours.";
      else rainText = `Showers most likely around ${hourLabel(peak.time)} (${peak.rainProb}% chance).`;
      let thunder = h[0];
      for (const x of h) if ((x.thunderProb ?? 0) > (thunder.thunderProb ?? 0)) thunder = x;
      if ((thunder.thunderProb ?? 0) >= 40) rainText += ` Thunderstorms possible around ${hourLabel(thunder.time)} (${thunder.thunderProb}% chance).`;
      sum.innerHTML = `<span class="lead">${rainText}</span> Winds ${fromKmh(wlo)}–${fromKmh(whi)} ${wUnit()}${dir}.`;

      // Flash-flood watch from next-24h rainfall total + peak hourly intensity.
      const total24 = Math.round(h.reduce((a, x) => a + (x.precipMm || 0), 0));
      const peakHr = h.reduce((mx, x) => Math.max(mx, x.precipMm || 0), 0);
      let lvl = total24 < 15 ? 0 : total24 < 40 ? 1 : total24 < 75 ? 2 : total24 < 125 ? 3 : 4;
      if (peakHr >= 20 && lvl > 0 && lvl < 4) lvl++; // intense bursts flood faster
      const fn = document.getElementById("flood-note");
      if (lvl === 0) {
        // Clear the dedup tag (#49) so a hide→show transition with the
        // same text still re-announces to screen readers.
        fn.hidden = true;
        fn.__hrLast = undefined;
      }
      else {
        const msg = ["", "minor ponding possible in low-lying spots",
          "flash flooding possible in low-lying areas",
          "flash flooding likely — avoid flood-prone roads",
          "dangerous flooding — stay off the roads if you can"][lvl];
        fn.hidden = false;
        // Polite live region — dedup via setLiveHtml (#49)
        setLiveHtml(fn, `<span class="chance ${lvl <= 2 ? "medium" : "high"}">Flood watch</span> About ${total24} mm of rain expected over 24h — ${msg}.`);
      }
    }

    function renderSea(o, hourlyUv) {
      const grid = document.getElementById("sea-grid");
      const sum = document.getElementById("sea-summary");
      const m = o && o.marine;
      const uvNow = o && o.hourly && o.hourly.length ? o.hourly[0].uv : null;
      const uvMax = o && o.daily && o.daily.length ? o.daily[0].uvMax : null;
      const mh = m && m.waveHeightM != null ? m.waveHeightM : null;
      const waveVal = mh != null ? mh + " m" : "—";
      const periodVal = m && m.wavePeriodS != null ? m.wavePeriodS + " s" : "—";
      grid.innerHTML =
        infoTile("Sea state", seaWord(mh), seaExplain(mh)) +
        infoTile("Wave height", waveVal, mh != null ? `How tall the waves are, measured crest to trough — about <b>${mh} m</b> right now. Sea state is the word for the same thing.` : null) +
        infoTile("Wave period", periodVal, "The gap in seconds between one wave and the next. Longer gaps (10s+) mean a stronger, more powerful swell; short gaps are choppy wind-driven sea.") +
        infoTile("UV now", `<span class="uv ${uvClass(uvNow)}">${uvWord(uvNow)}</span>`, uvExplain(uvNow));
      const uvAdvice = (uvMax != null && uvMax >= 6) ? " UV peaks " + uvWord(uvMax).toLowerCase() + " today — wear sunscreen and seek shade around midday." : "";
      if (m && m.waveHeightM != null) {
        sum.innerHTML = `<span class="lead">Seas are ${seaWord(m.waveHeightM).toLowerCase()} at about ${m.waveHeightM} m.</span>${uvAdvice}`;
      } else {
        sum.innerHTML = `<span class="lead">Sea conditions are unavailable right now.</span>${uvAdvice}`;
      }
    }

    // Official DEM Category 1 hurricane shelters (2026 booklet). Source:
    // https://dem.gov.bb/emergency/shelter — review yearly against the booklet.
    const SHELTERS = [
      { name: "Blackman and Gollop Primary School", parish: "Christ Church", wc: true },
      { name: "Christ Church Foundation School", parish: "Christ Church", wc: true },
      { name: "Dunamis Outreach Ministries (Wesleyan Holiness Church)", parish: "Christ Church", wc: true },
      { name: "St. Christopher Primary School", parish: "Christ Church", wc: true },
      { name: "Gordon Walters Primary", parish: "Christ Church", wc: false },
      { name: "The Lester Vaughn School", parish: "St. Thomas", wc: true },
      { name: "Hillaby/Turners Hall", parish: "St. Thomas", wc: true },
      { name: "Hillaby Seventh Day Adventist Church", parish: "St. Andrew", wc: true },
      { name: "Gordon Greenidge Primary", parish: "St. James", wc: true },
      { name: "Queen's College", parish: "St. James", wc: true },
      { name: "The Church of God Orange Hill", parish: "St. James", wc: false },
      { name: "Ruby Nazarene Church", parish: "St. Philip", wc: true },
      { name: "Six Roads Seventh Day Adventist Church", parish: "St. Philip", wc: false },
      { name: "Six Roads Church of Christ", parish: "St. Philip", wc: false },
      { name: "Hilda Skeene Primary School", parish: "St. Philip", wc: true },
      { name: "The Lodge School", parish: "St. John", wc: true },
      { name: "Tamarind Hall Library / Eric Holder Municipal Complex", parish: "St. Joseph", wc: true },
      { name: "Black Rock Seventh Day Adventist Church", parish: "St. Michael", wc: true },
      { name: "Combermere School", parish: "St. Michael", wc: false },
      { name: "Dalkeith Methodist Church", parish: "St. Michael", wc: true },
      { name: "St. Barnabas Day Care Centre", parish: "St. Michael", wc: false },
      { name: "Lloyd Erskine Sandiford Centre", parish: "St. Michael", wc: true },
      { name: "Harrison College", parish: "St. Michael", wc: false },
      { name: "The University of the West Indies", parish: "St. Michael", wc: true },
      { name: "Faith Wesleyan Holiness Church", parish: "St. Michael", wc: false },
      { name: "Connell Town Pentecostal House of Prayer", parish: "St. Lucy", wc: true },
      { name: "William Donald George Parish Centre (St. Lucy Parish Church)", parish: "St. Lucy", wc: true },
      { name: "Cuthbert Moore Primary", parish: "St. George", wc: true },
      { name: "Ellerton Wesleyan Holiness Church", parish: "St. George", wc: true },
      { name: "Roland Edwards Primary School", parish: "St. Peter", wc: true },
      { name: "Coleridge and Parry School", parish: "St. Peter", wc: true },
    ];
    const PARISH_ORDER = ["Christ Church", "St. Andrew", "St. George", "St. James", "St. John",
      "St. Joseph", "St. Lucy", "St. Michael", "St. Peter", "St. Philip", "St. Thomas"];

    function initShelters() {
      const sel = document.getElementById("parish-select");
      for (const p of PARISH_ORDER) {
        const count = SHELTERS.filter((s) => s.parish === p).length;
        if (!count) continue;
        const o = document.createElement("option");
        o.value = p; o.textContent = `${p} (${count})`;
        sel.appendChild(o);
      }
      sel.addEventListener("change", () => {
        renderShelters(sel.value);
        try { localStorage.setItem("hr-parish", sel.value); } catch { /* ignore */ }
      });
      let saved = "";
      try { saved = localStorage.getItem("hr-parish") || ""; } catch { /* ignore */ }
      if (saved && PARISH_ORDER.includes(saved)) { sel.value = saved; renderShelters(saved); }
    }

    function renderShelters(parish) {
      const el = document.getElementById("shelter-list");
      if (!parish) { el.innerHTML = ""; return; }
      el.innerHTML = SHELTERS.filter((s) => s.parish === parish)
        .map((s) => `<div class="shelter"><span class="s-name">${escapeHtml(s.name)}</span>${s.wc ? '<span class="s-wc" aria-hidden="true">♿</span><span class="sr-only">Wheelchair access</span>' : ""}</div>`)
        .join("");
    }

    function renderAir(o) {
      const grid = document.getElementById("air-grid");
      const sum = document.getElementById("air-summary");
      const aq = o && o.airQuality;
      const tide = o && o.tide;
      if (!aq && !tide) { sum.textContent = "Air and tide data are unavailable right now."; grid.innerHTML = ""; return; }
      const tideState = tide ? (tide.rising ? "Rising" : "Falling") : "—";
      const nextEvent = !tide ? "—"
        : tide.rising && tide.nextHigh ? "High " + timeLabel(tide.nextHigh.time)
        : tide.nextLow ? "Low " + timeLabel(tide.nextLow.time) : "—";
      grid.innerHTML =
        infoTile("Air quality", `<span class="chance ${aq ? aqiClass(aq.usAqi) : "low"}">${aq ? aqiWord(aq.usAqi) : "—"}</span>`, aq ? aqiExplain(aq.usAqi) : null) +
        infoTile("Saharan dust", `<span class="chance ${aq ? hazeClass(aq.pm10) : "low"}">${aq ? hazeWord(aq.pm10) : "—"}</span>`, aq ? hazeExplain(aq.pm10) : null) +
        infoTile("Tide", tideState, tide ? "Whether the sea is coming in (<b>rising</b>) or going out (<b>falling</b>). Rising tides cover more of the beach." : null) +
        infoTile("Next tide", nextEvent, tide ? "The time of the next high or low tide. Around high tide the water reaches furthest up the beach." : null);
      const parts = [];
      if (aq) {
        const aqi = aqiWord(aq.usAqi).toLowerCase();
        if (aq.pm10 >= 110) parts.push(`<span class="lead">Hazy with Saharan dust.</span> Air quality is ${aqi} — sensitive groups should limit time outdoors.`);
        else if (aq.pm10 >= 55) parts.push(`<span class="lead">A little Saharan haze about.</span> Air quality is ${aqi}.`);
        else parts.push(`<span class="lead">Clear air, little dust.</span> Air quality is ${aqi}.`);
      }
      if (tide) {
        parts.push(`Tide is ${tide.rising ? "rising" : "falling"}` +
          (tide.rising && tide.nextHigh ? ` — high around ${timeLabel(tide.nextHigh.time)}.` : tide.nextLow ? ` — low around ${timeLabel(tide.nextLow.time)}.` : "."));
      }
      sum.innerHTML = parts.join(" ");
    }

    function renderSunMoon(o) {
      const g = document.getElementById("sky-grid");
      const a = o && o.astro;
      const dayEl = document.getElementById("sky-day");
      if (!a) { g.innerHTML = `<div class="wx-tile"><div class="lbl">Sun &amp; moon</div><div class="val">—</div></div>`; if (dayEl) dayEl.textContent = ""; return; }
      if (dayEl) {
        const d = a.sunrise ? parseIslandTime(a.sunrise) : new Date();
        const dayFmt = (x) => x.toLocaleDateString([], { timeZone: ISLAND_TZ, weekday: "long", day: "numeric", month: "long" });
        const ds = dayFmt(d);
        const sameDay = ds === dayFmt(new Date());
        dayEl.innerHTML = `Sunrise, sunset and moon for <b>${sameDay ? "today" : ds}</b>${sameDay ? " (" + ds + ")" : ""}.`;
      }
      const dl = a.daylightSeconds != null
        ? `${Math.floor(a.daylightSeconds / 3600)}h ${Math.round((a.daylightSeconds % 3600) / 60)}m` : "—";
      g.innerHTML = `
        <div class="wx-tile"><div class="lbl">Sunrise</div><div class="val">${timeLabel(a.sunrise)}</div></div>
        <div class="wx-tile"><div class="lbl">Sunset</div><div class="val">${timeLabel(a.sunset)}</div></div>
        <div class="wx-tile"><div class="lbl">Daylight</div><div class="val">${dl}</div></div>
        <div class="wx-tile"><div class="lbl">Moon</div><div class="val">${MOON_ICONS[a.moonPhase] || "🌙"} ${a.moonIllumination}%</div><div class="lbl" style="margin-top:0.15rem">${a.moonPhase}</div></div>`;
    }

    function renderNames(s) {
      const el = document.getElementById("season-names");
      const names = s.seasonNames || [];
      const used = s.stormsSoFar || 0;
      const active = new Set((s.storms || []).map(x => x.name));
      el.innerHTML = names.map((n, i) => {
        let cls = "upcoming", tag = "";
        if (active.has(n)) { cls = "active"; tag = `<span class="name-tag"><span class="sr-only"> – </span>active now</span>`; }
        else if (i < used) { cls = "used"; tag = `<span class="sr-only"> (used)</span>`; }
        else if (i === used) { cls = "next"; tag = `<span class="name-tag"><span class="sr-only"> – </span>next</span>`; }
        return `<li class="name-chip ${cls}">${escapeHtml(n)}${tag}</li>`;
      }).join("");
    }

    function renderTropical(s) {
      const t = s.tropical;
      const sum = document.getElementById("tropical-summary");
      const areas = document.getElementById("tropical-areas");
      const src = document.getElementById("tropical-src");
      renderNames(s);
      const wn = document.getElementById("wave-note");
      if (s.waves && s.waves.near) {
        wn.hidden = false;
        const dev = (t && t.formationExpected === false) ? " No tropical development is expected." : "";
        // Polite live region — dedup via setLiveHtml (#49)
        setLiveHtml(wn, `<span class="lead">🌀 A tropical wave is crossing our area</span> (axis near ${s.waves.nearAxisLonW}°W) — expect passing showers and a gusty breeze.${dev}`);
      } else { wn.hidden = true; wn.__hrLast = undefined; }
      if (!t) { sum.textContent = "The Atlantic outlook is unavailable right now."; areas.innerHTML = ""; src.textContent = ""; return; }
      // NHC text → innerHTML — escape to prevent any upstream weirdness
      // from landing in the DOM as live markup (#29).
      sum.innerHTML = `<span class="lead">${escapeHtml(t.headline)}</span>` + (t.activeSystemsText ? ` ${escapeHtml(t.activeSystemsText)}` : "");
      if (t.areas && t.areas.length) {
        areas.innerHTML = t.areas.map(a => {
          const cat = a.chance7 ? a.chance7.category : "low";
          const pct = a.chance7 ? a.chance7.pct : 0;
          return `<div class="area">
            <div class="area-where">${escapeHtml(a.where)}</div>
            <div class="area-chance"><span class="chance ${cat}">${pct}%</span> chance of forming in 7 days</div>
            ${a.chance48 ? `<div class="area-48">${a.chance48.pct}% within 48 hours</div>` : ""}
          </div>`;
        }).join("");
      } else {
        areas.innerHTML = `<div class="area calm"><div class="area-where">☀️ All quiet across the Atlantic</div><div class="area-48">No new systems are expected to form in the next 7 days.</div></div>`;
      }
      const when = t.issuedAt ? new Date(t.issuedAt).toUTCString().slice(5, 22) + " UTC" : "";
      // t.url comes from NHC parsing; restrict to https to prevent
      // javascript: / data: URIs from sneaking through (#29).
      const safeUrl = (typeof t.url === "string" && /^https:\/\//.test(t.url)) ? t.url : "https://www.nhc.noaa.gov/";
      src.innerHTML = `NHC Tropical Weather Outlook${when ? " · issued " + when : ""} · <a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">read the full outlook</a>`;
    }

    const haversineKm = (a, b, c, d) => {
      const R = 6371, p = Math.PI / 180;
      const x = Math.sin((c - a) * p / 2) ** 2 + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x));
    };
    // Earliest time a storm's 34-kt wind field reaches the island, from the
    // forecast track + wind radii (tropical-storm-force arrival).
    function windsArrival(s) {
      const isl = s.island;
      let best = null;
      for (const st of s.storms || []) {
        if (st.radii34Km && haversineKm(isl.lat, isl.lon, st.lat, st.lon) <= st.radii34Km) return { hours: 0, name: st.name };
        for (const p of st.forecastPoints || []) {
          const r = p.radii34Km ?? st.radii34Km;
          if (r && Number.isFinite(p.lat) && haversineKm(isl.lat, isl.lon, p.lat, p.lon) <= r) {
            if (!best || p.hoursFromIssuance < best.hours) best = { hours: p.hoursFromIssuance, name: st.name };
            break;
          }
        }
      }
      return best;
    }

    function renderStorms(s) {
      const an = document.getElementById("arrival-note");
      // A failed arrival update hides the note rather than leaving a stale
      // warning up; the storm rows below still render (#126).
      try {
        const arr = windsArrival(s);
        if (arr) {
          const when = arr.hours === 0 ? "are arriving now"
            : `could reach us by about ${timeLabel(new Date(Date.parse(s.updatedAt) + arr.hours * 3600000).toISOString())} (~+${arr.hours}h)`;
          an.hidden = false;
          // Polite live region — dedup via setLiveHtml (#49)
          setLiveHtml(an, `<span class="chance high">Winds</span> Tropical-storm-force winds (34&nbsp;kt+) from ${escapeHtml(arr.name)} ${when}. Finish preparations early.`);
        } else { an.hidden = true; an.__hrLast = undefined; }
      } catch (err) {
        if (an) { an.hidden = true; an.__hrLast = undefined; }
        console.error("render failed: arrival", err);
      }
      const passText = (a) => {
        const p = a.pass;
        if (!p || p.kind === "distant") return "";
        if (p.kind === "direct-hit-risk") return `<small class="pass-close">may track very close</small>`;
        return `<small style="color:var(--accent)">passes ~${p.distanceKm} km to the ${p.side}</small>`;
      };
      const rows = s.storms.map(st => `
        <tr>
          <td><b>${escapeHtml(st.name)}</b></td>
          <td>${escapeHtml(st.classification)}</td>
          <td>${st.intensityKt} kt</td>
          <td>${st.assessment.distanceNowKm} km</td>
          <td>${st.assessment.closestApproachKm} km in ~${st.assessment.closestApproachInHours}h ${passText(st.assessment)}
              <br><small style="color:var(--muted)">(${st.assessment.method === "official-track" ? "NHC track" : "projected"}${st.assessment.windFieldKm ? `, winds reach ${st.assessment.windFieldKm} km` : ""})</small></td>
          <td><span class="chip ${st.assessment.level}">${st.assessment.level.replace("_", " ")}</span></td>
        </tr>`).join("");
      document.getElementById("storms-body").innerHTML = rows;
      // Empty message lives outside the table so it reflows at 320px (#111)
      // Null-guarded: a stale cached index.html (pre-#124) lacks these ids.
      const stTable = document.getElementById("storms-table"), stEmpty = document.getElementById("storms-empty");
      if (stTable) stTable.hidden = !rows;
      if (stEmpty) stEmpty.hidden = !!rows;
    }

    // Level-change history; its own block so a malformed entry can't wipe the
    // storm rows above it (#126).
    function renderHistory(s) {
      document.getElementById("history").innerHTML = (s.history ?? []).slice(-8).reverse()
        .map(h => `${new Date(h.at).toUTCString().slice(5, 22)} UTC — ${h.from.replace("_", " ")} → <b>${h.to.replace("_", " ")}</b>`)
        .join("<br>") || "No level changes yet";
    }

    // NHC Atlantic track-forecast "cone of uncertainty" radii (nautical miles
    // at each forecast hour; 2026 table, ~67% of past errors fall inside).
    const CONE_NM = [[0, 0], [12, 25], [24, 39], [36, 49], [48, 62], [60, 77], [72, 95], [96, 134], [120, 200]];
    const coneRadiusKm = (h) => {
      if (h <= 0) return 0;
      const last = CONE_NM[CONE_NM.length - 1];
      if (h >= last[0]) return last[1] * 1.852;
      for (let i = 0; i < CONE_NM.length - 1; i++) {
        const [h0, r0] = CONE_NM[i], [h1, r1] = CONE_NM[i + 1];
        if (h >= h0 && h <= h1) return (r0 + (r1 - r0) * ((h - h0) / (h1 - h0))) * 1.852;
      }
      return 0;
    };
    const _rad = (d) => d * Math.PI / 180, _deg = (r) => r * 180 / Math.PI;
    function _bearing(a, b) {
      const p1 = _rad(a[0]), p2 = _rad(b[0]), dl = _rad(b[1] - a[1]);
      return (_deg(Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl))) + 360) % 360;
    }
    function _dest(p, brg, km) {
      const d = km / 6371, t = _rad(brg), p1 = _rad(p[0]), l1 = _rad(p[1]);
      const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(t));
      const l2 = l1 + Math.atan2(Math.sin(t) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
      return [_deg(p2), _deg(l2)];
    }
    // Build the cone polygon: offset the forecast track left/right by the
    // error radius at each point (perpendicular to the direction of travel).
    function coneFor(st) {
      const pts = (st.forecastPoints ?? []).filter((p) => Number.isFinite(p.lat));
      if (!pts.length) return null;
      const verts = [{ lat: st.lat, lon: st.lon, h: 0 }, ...pts.map((p) => ({ lat: p.lat, lon: p.lon, h: p.hoursFromIssuance }))];
      const left = [], right = [];
      for (let i = 0; i < verts.length; i++) {
        const v = [verts[i].lat, verts[i].lon];
        const prev = verts[i - 1] && [verts[i - 1].lat, verts[i - 1].lon];
        const next = verts[i + 1] && [verts[i + 1].lat, verts[i + 1].lon];
        const brg = prev && next ? _bearing(prev, next) : next ? _bearing(v, next) : _bearing(prev, v);
        const r = coneRadiusKm(verts[i].h);
        left.push(_dest(v, brg - 90, r));
        right.push(_dest(v, brg + 90, r));
      }
      return left.concat(right.reverse());
    }

    function renderMap(s) {
      if (!map) initMap(s.island);
      layerGroup.clearLayers();
      // White dot with a dark ring — stands out from the blue radar returns.
      L.circleMarker([s.island.lat, s.island.lon], { radius: 6, color: "#0b1220", weight: 3, fillColor: "#ffffff", fillOpacity: 1 })
        .bindTooltip(s.island.name, { permanent: true, direction: "top", offset: [16, -8] }).addTo(layerGroup);
      for (const st of s.storms) {
        // Marker first, then the rest, each storm in its own try/catch: one
        // malformed storm must not drop the later storms from the map (#129).
        try {
          L.circleMarker([st.lat, st.lon], { radius: 10, color: "#f87171", fillColor: "#dc2626", fillOpacity: 0.8 })
            .bindTooltip(`${escapeHtml(st.name)} (${st.intensityKt} kt)`, { permanent: true, direction: "top" }).addTo(layerGroup);
          // Cone of uncertainty, sent to the back so the track and markers sit on top.
          const cone = coneFor(st);
          if (cone) {
            // Leaflet's bindTooltip treats the string content as HTML (writes
            // via innerHTML on the tooltip container) — escape st.name (#29).
            L.polygon(cone, { color: "#fbbf24", weight: 1, opacity: 0.5, fillColor: "#fbbf24", fillOpacity: 0.12 })
              .bindTooltip(`${escapeHtml(st.name)}: probable path of the centre (next 5 days)`).addTo(layerGroup).bringToBack();
          }
          L.polyline([[st.lat, st.lon], [s.island.lat, s.island.lon]], { color: "#475569", dashArray: "6 6", weight: 1 }).addTo(layerGroup);
          if (st.radii34Km) {
            L.circle([st.lat, st.lon], { radius: st.radii34Km * 1000, color: "#f97316", weight: 1, fillColor: "#f97316", fillOpacity: 0.12 })
              .bindTooltip(`34-kt winds to ~${st.radii34Km} km`).addTo(layerGroup);
          }
          const pts = (st.forecastPoints ?? []).filter(p => Number.isFinite(p.lat));
          if (pts.length > 0) {
            const track = [[st.lat, st.lon], ...pts.map(p => [p.lat, p.lon])];
            L.polyline(track, { color: "#fbbf24", weight: 2, dashArray: "8 5" }).addTo(layerGroup);
            for (const p of pts) {
              L.circleMarker([p.lat, p.lon], { radius: 4, color: "#fbbf24", fillColor: "#f59e0b", fillOpacity: 0.9 })
                .bindTooltip(`+${p.hoursFromIssuance}h${p.maxWindKt ? ` · ${p.maxWindKt} kt` : ""} (NHC forecast)`).addTo(layerGroup);
            }
          }
        } catch (err) {
          console.error(`render failed: map storm ${st.name}`, err);
        }
      }
    }

    function renderCivil(s) {
      const ca = document.getElementById("civil-alert");
      const c = s.civilAlert;
      if (c && c.active) {
        ca.hidden = false;
        ca.href = c.url || "https://brb-secondary.capews.com/capews/public/active";
        const n = c.count || 1;
        // Assertive live region — dedup via setLiveHtml (#49) so screen
        // readers don't re-announce "Official emergency alert in effect"
        // every 60 s while the same CAP alert is still active.
        setLiveHtml(
          document.getElementById("civil-text"),
          `<b>Official emergency alert${n > 1 ? "s" : ""} in effect.</b> Barbados DEM has ${n > 1 ? n + " active alerts" : "an active alert"} — tap for details on CAP.CAP.`
        );
      } else {
        ca.hidden = true;
        // Same dedup-clearing rationale (#49): if a CAP alert returns with
        // the same wording later, the assertive live region must re-announce.
        const cText = document.getElementById("civil-text");
        if (cText) cText.__hrLast = undefined;
      }
    }

    // renderStorms threw partway: never leave "No active systems" or stale rows
    // up while a storm is active. Plain-language warning row instead.
    function stormsFallback(s) {
      const n = s.storms.length;
      if (!n) return;
      const body = document.getElementById("storms-body");
      if (!body) return;
      const names = s.storms.map(x => x && x.name ? escapeHtml(String(x.name)) : "").filter(Boolean).join(", ");
      const table = document.getElementById("storms-table"), empty = document.getElementById("storms-empty");
      if (table) table.hidden = false;
      if (empty) empty.hidden = true;
      body.innerHTML = `<tr><td colspan="6"><b>Storm details couldn't be shown</b> — ${n} active system${n === 1 ? "" : "s"}${names ? ` (${names})` : ""}. Check the <a href="https://www.nhc.noaa.gov">National Hurricane Center</a>.</td></tr>`;
    }

    function render(s) {
      // Defensive defaults (#46): a partial /api/status (older SW cache,
      // 5xx-but-parseable, schema drift on deploy boundary) must not abort
      // the renderer chain. Without these guards `s.island.name` and
      // `s.storms.map` would throw and freeze the dashboard until reload.
      if (!s || typeof s !== "object") return;
      if (!s.island) { console.warn("render: missing s.island, skipping"); return; }
      s.storms = Array.isArray(s.storms) ? s.storms : [];
      s.history = Array.isArray(s.history) ? s.history : [];
      lastStatus = s;

      // Storm-critical renderers run first and every block is isolated:
      // schema drift or stale markup in one section must never hide an
      // active storm (#126). No block reads state another block sets.
      const safely = (name, fn) => { try { fn(); } catch (err) { console.error("render failed: " + name, err); } };
      try { renderStorms(s); } catch (err) {
        console.error("render failed: storms", err);
        stormsFallback(s);
      }
      safely("map", () => renderMap(s));

      // Threat banner next: safety-critical too, so isolated but early.
      safely("banner", () => {
        const banner = document.getElementById("banner");
        banner.className = "banner " + s.level;
        document.getElementById("banner-title").textContent = LEVEL_TITLE[s.level];
        // Banner sub is in a polite live region — only update DOM on change (#49)
        setLiveText(document.getElementById("banner-sub"), LEVEL_SUB[s.level]);
        document.getElementById("banner-storms").innerHTML = s.storms.length
          ? `tracking<b>${s.storms.map(x => escapeHtml(x.name)).join(", ")}</b>` : "";
      });

      // Safety: the Storms card starts collapsed only where its markup says
      // data-start="closed"; either way, if a threat is present or escalates
      // we auto-open it so people never have to hunt for it. Tracks the last
      // level so a user who re-closes it is respected unless the situation
      // worsens.
      safely("autoOpen", () => {
        const RANK = { ALL_CLEAR: 0, WATCH: 1, WARNING: 2, IMMINENT: 3 };
        const curRank = RANK[s.level] ?? 0;
        const civilActive = !!(s.civilAlert && s.civilAlert.active);
        if ((curRank > 0 || s.storms.length || civilActive) && curRank > (render._autoLvl ?? -1)) {
          const st = document.getElementById("storms");
          if (st) setCardOpen(st, true);
        }
        render._autoLvl = curRank;
      });

      safely("civil", () => renderCivil(s));
      safely("header", () => {
        document.getElementById("island").textContent = s.island.name;
        document.getElementById("now-island").textContent = s.island.name;
        document.getElementById("mode").innerHTML = s.mode === "replay" ? "🎬 <b>Replay:</b> Beryl 2024" : "📡 <b>Live:</b> NHC feed";
        document.getElementById("updated").textContent = !s.updatedAt ? ""
          : s.mode === "replay" ? new Date(s.updatedAt).toUTCString().slice(5, 22) + " UTC"
          : relTime(s.updatedAt);
      });
      safely("briefing", () => {
        document.getElementById("briefing").textContent = sanitizeBriefing(s.briefing);
        document.getElementById("briefing-source").textContent =
          s.briefingSource === "claude" ? "✨ Written by Claude on Amazon Bedrock · level decided by deterministic engine" :
          s.briefingSource === "template" ? "Standard guidance · level decided by deterministic engine" : "";
      });
      safely("replayLabel", () => { document.getElementById("replay-label").textContent = s.replayLabel ?? ""; });
      safely("history", () => renderHistory(s));
      safely("now", () => renderNow(s));
      safely("thingsToDo", () => renderThingsToDo(s));
      safely("forecast", () => renderForecast(s.outlook));
      safely("rainWind", () => renderRainWind(s.outlook, s.weather));
      safely("sea", () => renderSea(s.outlook));
      safely("sunMoon", () => renderSunMoon(s.outlook));
      safely("air", () => renderAir(s.outlook));
      safely("tropical", () => renderTropical(s));
    }

    // Highlight the section nav link for whichever section is in view.
    // Client-side pages (#router): the home page shows today's weather +
    // things to do; every other sidebar item is its own sub-page so you only
    // see one thing at a time. Cards carry data-page; we show the active page's
    // cards and hide the rest. Hash-routed so pages are linkable + Back works.
    const PAGES = ["home", "forecast", "sea", "radar", "storms", "shelters", "prep"];
    // Cards are heading + button disclosures (#107): the button's aria-expanded
    // and the body's hidden attribute are the single source of truth.
    // A stale cached index.html can briefly pair with this app.js (app.js
    // revalidates immediately, #97) and still have native <details> cards.
    function setCardOpen(card, open) {
      if (card.tagName === "DETAILS") { card.open = open; return; }
      const btn = card.querySelector(".card-toggle"), body = card.querySelector(".card-body");
      if (!btn || !body) return;
      btn.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
    }
    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".card-toggle");
      if (btn) setCardOpen(btn.closest(".card"), btn.getAttribute("aria-expanded") !== "true");
    });
    // Skip link (#100): focus main without touching location.hash, so no dead
    // history entry and a reload keeps the current page. href="#main" stays as the no-JS fallback.
    // Delegated at top level so a skip pressed before `load` isn't the native #main route.
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".skip-link")) return;
      const main = document.getElementById("main");
      if (!main) return; // let the native #main route proceed
      e.preventDefault();
      main.focus({ preventScroll: true });
      main.scrollIntoView();
    });
    document.querySelectorAll('.card[data-start="closed"]').forEach((c) => setCardOpen(c, false));
    let curPage = "home";
    // Returns null for hashes that aren't a page (e.g. the skip link's #main),
    // so those never reroute the user (#100).
    function pageFromHash() {
      const h = (location.hash || "").replace("#", "");
      return PAGES.includes(h) ? h : null;
    }
    // Page names match the nav labels; home keeps the full document title (#104).
    const PAGE_TITLES = { forecast: "7-day forecast", sea: "Beach & sea", radar: "Radar", storms: "Storms", shelters: "Shelters", prep: "Get ready" };
    const HOME_TITLE = document.title;
    function showPage(page, scroll = true, focus = false) {
      curPage = page;
      document.querySelectorAll(".card[data-page]").forEach((c) => {
        const on = c.dataset.page === page;
        c.hidden = !on;
        if (on) setCardOpen(c, true); // pages show content in full
      });
      document.querySelectorAll(".section-nav a").forEach((a) => {
        const on = a.getAttribute("href") === "#" + page;
        a.classList.toggle("active", on);
        if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      });
      document.title = PAGE_TITLES[page] ? PAGE_TITLES[page] + " | Bim Weather" : HOME_TITLE;
      // Leaflet sizes wrong while its container is display:none — nudge on show.
      // Permanent tooltips were placed with a zero size then, so re-place them (#109).
      if (page === "radar" && map) requestAnimationFrame(() => {
        map.invalidateSize();
        layerGroup.eachLayer((l) => { const t = l.getTooltip && l.getTooltip(); if (t) t.update(); });
      });
      if (scroll) window.scrollTo(0, 0);
      // User-initiated change only: the page's heading button names the new page for screen readers (#104).
      if (focus) {
        const t = document.querySelector(`.card[data-page="${page}"]:not([hidden]) .card-toggle`);
        if (t) {
          t.focus({ preventScroll: true });
          // On short screens with alerts above the layout the toggle can sit below the fold (2.4.11);
          // scroll-margin on .card-toggle keeps it clear of the sticky nav.
          t.scrollIntoView({ block: "nearest" });
        }
      }
    }
    function setupRouter() {
      // Skip link (#100): focus main without touching location.hash, so no dead
      // history entry and a reload keeps the current page. href="#main" stays as the no-JS fallback.
      showPage(pageFromHash() ?? "home");
      window.addEventListener("hashchange", () => {
        // Back to the hash-less URL is Today; other unknown hashes (#main) are ignored.
        const page = location.hash ? pageFromHash() : "home";
        if (page) showPage(page, true, page !== curPage);
      });
    }

    function setOffline(off) { document.getElementById("offline-note").hidden = !off; }

    const agoText = (iso) => {
      if (!iso) return "";
      const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 90) return "just now";
      if (s < 3600) return Math.round(s / 60) + " min ago";
      if (s < 86400) return Math.round(s / 3600) + " h ago";
      return new Date(iso).toUTCString().slice(5, 17);
    };
    const relTime = (iso) => iso ? "Updated " + agoText(iso) : "";

    const urlB64 = (b64) => {
      const pad = "=".repeat((4 - (b64.length % 4)) % 4);
      const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
      return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
    };

    // Show the "Get storm alerts" opt-in only when push is supported AND the
    // server has VAPID keys configured; wire up subscribe / unsubscribe.
    async function initAlerts() {
      if (!("PushManager" in window) || !("Notification" in window)) return;
      let key;
      try { const r = await fetch("/api/vapidPublicKey"); if (!r.ok) return; key = (await r.json()).key; }
      catch { return; }
      if (!key) return;
      const bar = document.getElementById("alerts-bar");
      const text = document.getElementById("alerts-text");
      const btn = document.getElementById("alerts-btn");
      const prefsBox = document.getElementById("alerts-prefs");
      const levelSel = document.getElementById("pref-level");
      const quietBox = document.getElementById("pref-quiet");
      bar.hidden = false;
      const reg = await navigator.serviceWorker.ready;

      // Load saved alert prefs into the controls.
      const prefs = { minLevel: "WATCH", quiet: false };
      try { Object.assign(prefs, JSON.parse(localStorage.getItem("hr-alert-prefs") || "{}")); } catch { /* ignore */ }
      levelSel.value = prefs.minLevel; quietBox.checked = prefs.quiet;
      const readPrefs = () => ({ minLevel: levelSel.value, quiet: quietBox.checked });
      const savePrefs = (p) => { try { localStorage.setItem("hr-alert-prefs", JSON.stringify(p)); } catch { /* ignore */ } };
      // Unsubscribe token (#18). The server hands this back on subscribe; we
      // store it in localStorage and replay it on /api/unsubscribe. Without
      // it, anyone who learns the push endpoint URL could silently mute
      // this device.
      const tokenKey = "hr-unsub-token";
      const readToken = () => { try { return localStorage.getItem(tokenKey) || ""; } catch { return ""; } };
      const writeToken = (t) => { try { if (t) localStorage.setItem(tokenKey, t); else localStorage.removeItem(tokenKey); } catch { /* ignore */ } };
      const postSub = async (sub) => {
        const r = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subscription: sub, ...readPrefs() }) });
        if (r.ok) {
          try { const j = await r.json(); if (j.unsubscribeToken) writeToken(j.unsubscribeToken); } catch { /* ignore */ }
        }
        return r;
      };

      const setState = (on) => {
        bar.classList.toggle("on", on);
        text.textContent = on
          ? "✓ Storm alerts are on for this device."
          : "🔔 Get a push the moment the storm level rises — even with the app closed.";
        btn.textContent = on ? "Turn off" : "Get storm alerts";
        btn.dataset.on = on ? "1" : "";
        prefsBox.hidden = false;
      };
      if (Notification.permission === "denied") {
        text.textContent = "Notifications are blocked. Turn them on in your browser settings to get storm alerts.";
        btn.hidden = true;
        return;
      }
      setState(Boolean(await reg.pushManager.getSubscription()));

      // Changing prefs persists, and updates the server if already subscribed.
      const onPrefChange = async () => {
        savePrefs(readPrefs());
        if (btn.dataset.on) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) await postSub(sub);
        }
      };
      levelSel.onchange = onPrefChange;
      quietBox.onchange = onPrefChange;

      btn.onclick = async () => {
        btn.disabled = true;
        try {
          if (btn.dataset.on) {
            const sub = await reg.pushManager.getSubscription();
            if (sub) {
              await fetch("/api/unsubscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ endpoint: sub.endpoint, unsubscribeToken: readToken() }),
              });
              await sub.unsubscribe();
              writeToken("");
            }
            setState(false);
          } else {
            const perm = await Notification.requestPermission();
            if (perm !== "granted") { text.textContent = "Notifications weren't allowed. You can enable them in browser settings."; return; }
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(key) });
            savePrefs(readPrefs());
            await postSub(sub);
            setState(true);
          }
        } catch {
          text.textContent = "Couldn't change alert settings — please try again.";
        } finally {
          btn.disabled = false;
        }
      };
    }

    async function refresh(first) {
      try {
        const res = await fetch("/api/status");
        if (!res.ok) return; // 5xx — keep the prior render; the next tick retries
        const payload = await res.json();
        // Render-time exceptions (#46) must not freeze the polling loop.
        try { render(payload); } catch (err) { console.error("render failed:", err); }
        // Re-assert the routed page after the first data render in case a
        // deep-link (e.g. /#radar) needs the map re-sized once shown.
        // No scroll reset: it would undo a skip-link jump made before this landed (#100).
        if (first) showPage(pageFromHash() ?? curPage, false);
      } catch { /* transient */ }
    }

    // SW update toast (#50). When a fresh SW reaches "installed" and an
    // existing controller is in place (i.e. this isn't the first install),
    // surface a button so the user opts in rather than getting a forced
    // mid-session reload. The matching SKIP_WAITING handler is in sw.js.
    // The reload-on-controllerchange listener is only ARMED after the user
    // explicitly accepts an update toast. Otherwise the FIRST SW install on
    // a fresh client triggers a controllerchange (sw.js calls clients.claim
    // on activate) and we'd reload the page mid-initialization — which both
    // breaks any test that expects a stable post-load DOM and is a poor UX
    // (an unrequested reload on every first visit).
    let userInitiatedSkip = false;
    function showUpdateToast(waiting) {
      if (document.getElementById("hr-update-toast")) return;
      const t = document.createElement("button");
      t.id = "hr-update-toast";
      t.className = "hr-update-toast";
      t.type = "button";
      t.textContent = "Update available — tap to refresh";
      t.addEventListener("click", () => {
        t.disabled = true;
        t.textContent = "Refreshing…";
        userInitiatedSkip = true;
        waiting.postMessage({ type: "SKIP_WAITING" });
      });
      document.body.appendChild(t);
    }
    function watchForSwUpdates(reg) {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdateToast(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          if (next.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateToast(next);
          }
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!userInitiatedSkip) return; // first-install / unrelated → ignore
        location.reload();
      });
    }

    // The server polls NHC every ~15 min and the API just returns its cached
    // status, so a 60 s UI refresh keeps the dashboard current without
    // hammering the origin.
    const start = () => {
      initSettings();
      refresh(true);
      setInterval(() => refresh(false), 60000);
      setSatellite();
      hydrateIcons();
      setupRouter();
      initShelters();
      document.getElementById("radar-toggle").addEventListener("click", toggleRadar);
      document.getElementById("sat-toggle").addEventListener("click", toggleSat);
      document.getElementById("windy-load").addEventListener("click", loadWindy);
      // Delegated click for the per-tile "?" buttons (#29). The inline
      // `onclick="toggleTileNote(this)"` was the last thing forcing
      // `'unsafe-inline'` to stay on script-src in the CSP — gone now.
      document.addEventListener("click", (e) => {
        const btn = e.target instanceof Element ? e.target.closest(".tile-info") : null;
        if (btn) toggleTileNote(btn);
      });

      setOffline(!navigator.onLine);
      window.addEventListener("online", () => { setOffline(false); refresh(false); });
      window.addEventListener("offline", () => setOffline(true));
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("/sw.js")
          .then((reg) => { initAlerts(reg); watchForSwUpdates(reg); })
          .catch(() => {});
      }
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start);
