/* =========================================================
   STEMPELUHR & WOCHENÜBERSICHT — ANWENDUNGSLOGIK (VERSION 2.0.0)
   Architektur: STATE · CALC · STORAGE · UI · EVENTS
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    /* =========================================================
       0. BASIS-HELFER & KONSTANTEN
       ========================================================= */
    const format2 = (val) => String(val).padStart(2, "0");
    const getDateStrFromObj = (d) => `${d.getFullYear()}-${format2(d.getMonth() + 1)}-${format2(d.getDate())}`;
    const getTodayStr = () => getDateStrFromObj(new Date());

    const WEEKDAYS_FULL = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    const DAY_SHORT_MON = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    const DAY_FULL_MON = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
    const STATUS_LABELS = { work: "Arbeit", vacation: "Urlaub", sick: "Krank", holiday: "Feiertag", free: "Frei" };

    const SCRIBBLE_ICONS = [
        { id: "bolt", label: "Blitz", inner: `<path d="M20.5 3.5 L8.5 19.5 L18 19.2 L14.8 32.5 L27.5 16.2 L18.2 16.5 Z"/>` },
        { id: "loop-arrow", label: "Schleife", inner: `<path d="M5 24 C10 26, 22 23, 21 15 C20 10, 13 11, 14 17 C15 23, 25 22, 30 13 M24 12.5 L30.5 12.5 L29.5 19"/>` },
        { id: "star", label: "Stern", inner: `<path d="M18 4 L21.4 13.4 L31.5 13.8 L23.5 19.8 L26.3 29.8 L18 23.8 L9.7 29.8 L12.5 19.8 L4.5 13.8 L14.6 13.4 Z"/>` },
        { id: "spiral", label: "Spirale", inner: `<path d="M18 18 C19.5 17, 21 19, 19.5 21 C17 23.5, 13 21.5, 13.5 18 C14 13, 20.5 11.5, 24 15.5 C28 20, 24.5 27.5, 18 28 C10 28.5, 6 21, 8.5 13.5 C11 6.5, 20.5 4.5, 27.5 9.5"/>` },
        { id: "cloud", label: "Wolke", inner: `<path d="M10 26.5 H26.5 C30 26.5, 32 24, 31.5 21 C31 18, 28.2 16.8, 26 17.2 C25.2 12.2, 20.2 9.8, 15.8 11.8 C12.5 13.2, 11.2 16.5, 11.5 18.8 C8 18.8, 5.2 21, 5.5 23.8 C5.8 25.8, 7.8 26.5, 10 26.5 Z"/>` },
        { id: "coffee", label: "Kaffee", inner: `<path d="M7 15 H24 V24 C24 28, 20.5 30, 15.5 30 C10.5 30, 7 28, 7 24 Z M24 17.5 H27.5 C29.8 17.5, 31 19.2, 30.8 21.5 C30.5 23.8, 28.5 25, 24 24.8 M11.5 11 C11 9, 13 8, 12.2 6 M17.5 11 C17 9, 19 8, 18.2 6"/>` },
        { id: "crown", label: "Krone", inner: `<path d="M6 25.5 L4.5 12 L12.5 18.5 L18 9.5 L23.5 18.5 L31.5 12 L30 25.5 Z M6.5 29 H29.5"/>` },
        { id: "heart", label: "Herz", inner: `<path d="M18 30 C18 30, 5.5 21.5, 5.5 13.2 C5.5 8.8, 9.2 6, 13.2 6.5 C15.8 6.8, 17.4 8.6, 18 10.4 C18.6 8.6, 20.2 6.8, 22.8 6.5 C26.8 6, 30.5 8.8, 30.5 13.2 C30.5 21.5, 18 30, 18 30 Z"/>` },
        { id: "sun", label: "Sonne", inner: `<circle cx="18" cy="18" r="6.5"/><path d="M18 4.5 V8 M18 28 V31.5 M4.5 18 H8 M28 18 H31.5 M8.5 8.5 L11 11 M25 25 L27.5 27.5 M27.5 8.5 L25 11 M11 25 L8.5 27.5"/>` },
        { id: "note", label: "Musik", inner: `<path d="M14 26.5 V9.5 L27.5 6.5 V23.5 M14 14.5 L27.5 11.5"/><circle cx="10.8" cy="26.8" r="3.4"/><circle cx="24.3" cy="23.8" r="3.4"/>` },
        { id: "clover", label: "Klee", inner: `<path d="M18 17.5 C13 15.5, 13.5 8.5, 18 8.5 C22.5 8.5, 23 15.5, 18 17.5 Z M18 17.5 C20 12.5, 27 13, 27 17.5 C27 22, 20 22.5, 18 17.5 Z M18 17.5 C16 12.5, 9 13, 9 17.5 C9 22, 16 22.5, 18 17.5 Z M18 17.5 C21 21, 19.5 28, 15.5 31.5"/>` },
        { id: "planet", label: "Saturn", inner: `<circle cx="18" cy="18" r="7.5"/><path d="M5.5 22.5 C3.5 19.5, 8.5 15.5, 16.8 13.5 C25 11.5, 31.5 12, 30.8 15.2 C30 18.5, 24.5 22, 16.5 24 C10.5 25.5, 7 24.8, 5.5 22.5 Z"/>` },

        { id: "arrow-wave", label: "Wellenpfeil", inner: `<path d="M5 18 C8.5 13, 12 23, 15.5 18 C19 13, 22.5 23, 26 18 H31 M26.5 13.5 L31.5 18 L26.5 22.5"/>` },
        { id: "check-mark", label: "Haken", inner: `<path d="M6.5 19 L14 26.5 L29.5 9.5"/>` },
        { id: "cross-x", label: "Kreuz", inner: `<path d="M8.5 8.5 L27.5 27.5 M27.5 8.5 L8.5 27.5"/>` },
        { id: "infinity", label: "Unendlich", inner: `<path d="M12.5 12.5 C7.5 12.5, 5.5 15.5, 5.5 18 C5.5 20.5, 7.5 23.5, 12.5 23.5 C16.5 23.5, 19.5 12.5, 23.5 12.5 C28.5 12.5, 30.5 15.5, 30.5 18 C30.5 20.5, 28.5 23.5, 23.5 23.5 C19.5 23.5, 16.5 12.5, 12.5 12.5 Z"/>` },
        { id: "rainbow", label: "Regenbogen", inner: `<path d="M5.5 25 A12.5 12.5 0 0 1 30.5 25 M10 25 A8 8 0 0 1 26 25 M14.5 25 A3.5 3.5 0 0 1 21.5 25"/>` },
        { id: "crescent", label: "Halbmond", inner: `<path d="M24.5 7.5 A12 12 0 1 0 27.5 25.5 A9.5 9.5 0 1 1 24.5 7.5 Z"/>` },
        { id: "smiley", label: "Smiley", inner: `<circle cx="18" cy="18" r="11.5"/><circle cx="14" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="22" cy="15.5" r="1.3" fill="currentColor" stroke="none"/><path d="M13 20.5 C14.5 23.5, 21.5 23.5, 23 20.5"/>` },
        { id: "grid-hash", label: "Gitter", inner: `<path d="M14 7.5 V28.5 M22 7.5 V28.5 M7.5 14 H28.5 M7.5 22 H28.5"/>` },

        { id: "blossom", label: "Blüte", inner: `<circle cx="18" cy="18" r="3.5"/><path d="M18 14.5 C15 11.5, 15 6.5, 18 6.5 C21 6.5, 21 11.5, 18 14.5 Z M21.5 18 C24.5 15, 29.5 15, 29.5 18 C29.5 21, 24.5 21, 21.5 18 Z M18 21.5 C21 24.5, 21 29.5, 18 29.5 C15 29.5, 15 24.5, 18 21.5 Z M14.5 18 C11.5 21, 6.5 21, 6.5 18 C6.5 15, 11.5 15, 14.5 18 Z"/>` },
        { id: "stem-flower", label: "Blume", inner: `<path d="M18 31 V16 M18 25 C14 25, 12 22.5, 12 20.5 C15 20.5, 17 22.5, 18 25 Z M18 23 C22 23, 24 20.5, 24 18.5 C21 18.5, 19 20.5, 18 23 Z"/><path d="M12 11.5 C12 7.5, 15 5.5, 18 5.5 C21 5.5, 24 7.5, 24 11.5 C24 14.5, 21 16, 18 16 C15 16, 12 14.5, 12 11.5 Z"/>` },
        { id: "leaf", label: "Blatt", inner: `<path d="M8 28 C8 15, 17 8, 28 8 C28 19, 21 28, 8 28 Z M6.5 29.5 L21 15"/>` },
        { id: "butterfly", label: "Schmetterling", inner: `<path d="M18 11 V26 M18 15.5 C13.5 9.5, 6.5 10.5, 7.5 16.5 C8.2 20, 13.5 19.5, 18 18.5 M18 15.5 C22.5 9.5, 29.5 10.5, 28.5 16.5 C27.8 20, 22.5 19.5, 18 18.5 M18 18.5 C13.5 19, 9 22, 10.5 26.5 C11.8 29.5, 16.5 27.5, 18 23 M18 18.5 C22.5 19, 27 22, 25.5 26.5 C24.2 29.5, 19.5 27.5, 18 23"/>` },
        { id: "sunflower", label: "Sonnenblume", inner: `<circle cx="18" cy="18" r="5"/><path d="M18 5.5 V11 M18 25 V30.5 M5.5 18 H11 M25 18 H30.5 M9 9 L13 13 M23 23 L27 27 M27 9 L23 13 M13 23 L9 27"/>` },
        { id: "tulip", label: "Tulpe", inner: `<path d="M18 31 V19 M11 10 L14.5 14 L18 8.5 L21.5 14 L25 10 V15.5 C25 18.5, 21.8 20.5, 18 20.5 C14.2 20.5, 11 18.5, 11 15.5 Z"/>` },
        { id: "sprout", label: "Keimling", inner: `<path d="M18 31 V17 M18 21 C12 21, 7.5 17, 7.5 12.5 C13.5 12.5, 17.5 16, 18 21 Z M18 18 C23.5 18, 28.5 14, 28.5 9.5 C22.5 9.5, 18.5 13, 18 18 Z"/>` },
        { id: "daisy", label: "Gänseblümchen", inner: `<circle cx="18" cy="18" r="3.2"/><path d="M18 6.5 C20.5 6.5, 21.5 10.5, 19.5 14.5 M28.5 14.5 C29.5 17, 26.5 19.5, 21.5 18.5 M24.5 28 C22.5 29.5, 19.5 27, 18.5 21.5 M11.5 28 C9.5 26.5, 11 22.5, 15.5 20.5 M7.5 14.5 C6.5 12, 10.5 10.5, 15.5 15.5"/>` },

        { id: "rocket", label: "Rakete", inner: `<path d="M18 5 C23.5 9.5, 24.5 16.5, 22 23.5 H14 C11.5 16.5, 12.5 9.5, 18 5 Z"/><circle cx="18" cy="14.5" r="2.8"/><path d="M14 19.5 L9.5 24 L14 23.5 M22 19.5 L26.5 24 L22 23.5 M15.5 25.5 L18 31 L20.5 25.5"/>` },
        { id: "comet", label: "Komet", inner: `<circle cx="22.5" cy="14.5" r="5.5"/><path d="M17.5 12.5 L6.5 9.5 M17 15.5 L5 16.5 M18.5 18.5 L9 24.5 M20.5 20 L15.5 28.5"/>` },
        { id: "earth", label: "Planet", inner: `<circle cx="18" cy="18" r="11"/><path d="M10.5 11.5 C13.5 12.5, 15 15, 13.5 17.5 C12 20, 14.5 22.5, 17 22 C19.5 21.5, 21 24, 22.5 26.5 M22 10.5 C20 12.5, 21.5 15.5, 25 15"/>` },
        { id: "orbit", label: "Umlaufbahn", inner: `<circle cx="18" cy="18" r="5.5"/><ellipse cx="18" cy="18" rx="13.5" ry="5.5" transform="rotate(-24 18 18)"/><circle cx="29" cy="13" r="2.2"/>` }
    ];
    const makeScribbleSvg = (iconObj) => `<svg viewBox="0 0 36 36">${iconObj.inner}</svg>`;

    /* =========================================================
       1. STATE — ZENTRALER ANWENDUNGSZUSTAND
       ========================================================= */
    const STATE = {
        activeDateStr: getTodayStr(),
        userName: "",
        appStyleMode: "classic",
        appAsymIntensity: 55,
        appHue: 195,
        appLightness: 44,
        appIconTheme: "blue",
        sollHours: 8,
        sollMinutes: 0,
        weeklyHours: 40,
        glzBaseHours: 0,
        glzBaseDate: "",
        pauseNotifyEnabled: false,
        pauseNotifyLeadMins: 10,
        pauseWatcherEnabled: true,
        pauseWatcherMode: "both",
        isSmoker: false,
        smokeMinutesPerBreak: 5,
        selectedScribbles: ["bolt", "loop-arrow"],
        scribbleSizePct: 50,
        scribbleAccordionOpen: false,
        todaySmokeCount: 0,
        todaySessions: [],
        undoStack: [],
        welcomeActionMode: "come",
        ambientAnimTimer: null,
        weekOffset: 0,
        weekStaticCreditedSecs: 0,
        weekTotalSollSecs: 0,
        weekHasLiveToday: false,
        editingDateStr: null,
        editingDraft: null,
        currentWeekSatStr: "",
        currentWeekSunStr: "",
        kpState: null,
        holidayCacheByYear: {}
    };

    /* =========================================================
       2. STORAGE — 100 % ABWÄRTSKOMPATIBEL ZU v1.x
       ========================================================= */
    const STORAGE = {
        getDayData(dateStr) {
            try {
                return JSON.parse(localStorage.getItem("day_" + dateStr)) || null;
            } catch (e) {
                return null;
            }
        },
        saveDayData(dateStr, data) {
            localStorage.setItem("day_" + dateStr, JSON.stringify(data));
        },
        removeDayData(dateStr) {
            localStorage.removeItem("day_" + dateStr);
        },
        loadSettingsIntoState() {
            STATE.userName = localStorage.getItem("userName") || "";
            STATE.appStyleMode = localStorage.getItem("appStyleMode") === "asymmetric" ? "asymmetric" : "classic";

            const rawAsym = parseInt(localStorage.getItem("appAsymIntensity"), 10);
            STATE.appAsymIntensity = isNaN(rawAsym) ? 55 : Math.min(100, Math.max(0, rawAsym));

            const rawHue = parseInt(localStorage.getItem("appHue"), 10);
            STATE.appHue = isNaN(rawHue) ? 195 : ((rawHue % 360) + 360) % 360;

            const rawLight = parseInt(localStorage.getItem("appLightness"), 10);
            STATE.appLightness = isNaN(rawLight) ? 44 : Math.min(52, Math.max(28, rawLight));

            STATE.appIconTheme = localStorage.getItem("appIconTheme") === "rose" ? "rose" : "blue";

            const rawSollH = parseInt(localStorage.getItem("sollHours"), 10);
            STATE.sollHours = isNaN(rawSollH) ? 8 : Math.min(24, Math.max(0, rawSollH));

            const rawSollM = parseInt(localStorage.getItem("sollMinutes"), 10);
            STATE.sollMinutes = isNaN(rawSollM) ? 0 : Math.min(59, Math.max(0, rawSollM));

            const rawWeekly = parseFloat(localStorage.getItem("weeklyHours"));
            STATE.weeklyHours = (!isNaN(rawWeekly) && rawWeekly > 0 && rawWeekly <= 48) ? rawWeekly : 40;

            const rawGlzBase = parseFloat(localStorage.getItem("glzBaseHours"));
            STATE.glzBaseHours = !isNaN(rawGlzBase) ? rawGlzBase : 0;
            STATE.glzBaseDate = localStorage.getItem("glzBaseDate") || "";

            STATE.pauseNotifyEnabled = localStorage.getItem("pauseNotifyEnabled") === "true";
            const rawLead = parseInt(localStorage.getItem("pauseNotifyLeadMins"), 10);
            STATE.pauseNotifyLeadMins = (!isNaN(rawLead) && rawLead >= 1) ? Math.min(60, rawLead) : 10;

            STATE.pauseWatcherEnabled = localStorage.getItem("pauseWatcherEnabled") !== "false";
            const rawPwMode = localStorage.getItem("pauseWatcherMode") || "both";
            STATE.pauseWatcherMode = ["go", "come", "both"].includes(rawPwMode) ? rawPwMode : "both";

            STATE.isSmoker = localStorage.getItem("isSmoker") === "true";
            const rawSmokeMins = parseInt(localStorage.getItem("smokeMinutesPerBreak"), 10);
            STATE.smokeMinutesPerBreak = (!isNaN(rawSmokeMins) && rawSmokeMins >= 1) ? Math.min(60, rawSmokeMins) : 5;

            try {
                const rawArr = JSON.parse(localStorage.getItem("selectedScribbles"));
                if (Array.isArray(rawArr)) {
                    STATE.selectedScribbles = rawArr
                        .filter((id) => SCRIBBLE_ICONS.some((ic) => ic.id === id))
                        .slice(0, 5);
                }
            } catch (e) {}

            const rawScrSize = parseInt(localStorage.getItem("scribbleSizePct"), 10);
            STATE.scribbleSizePct = isNaN(rawScrSize) ? 50 : Math.min(100, Math.max(15, rawScrSize));
        },
        persistSettingsFromState() {
            localStorage.setItem("userName", STATE.userName);
            localStorage.setItem("selectedScribbles", JSON.stringify(STATE.selectedScribbles));
            localStorage.setItem("scribbleSizePct", String(STATE.scribbleSizePct));
            localStorage.setItem("appStyleMode", STATE.appStyleMode);
            localStorage.setItem("appAsymIntensity", String(STATE.appAsymIntensity));
            localStorage.setItem("appIconTheme", STATE.appIconTheme);
            localStorage.setItem("sollHours", String(STATE.sollHours));
            localStorage.setItem("sollMinutes", String(STATE.sollMinutes));
            localStorage.setItem("weeklyHours", String(STATE.weeklyHours));
            localStorage.setItem("glzBaseHours", String(STATE.glzBaseHours));
            localStorage.setItem("glzBaseDate", STATE.glzBaseDate);
            localStorage.setItem("pauseNotifyEnabled", String(STATE.pauseNotifyEnabled));
            localStorage.setItem("pauseNotifyLeadMins", String(STATE.pauseNotifyLeadMins));
            localStorage.setItem("pauseWatcherEnabled", String(STATE.pauseWatcherEnabled));
            localStorage.setItem("pauseWatcherMode", STATE.pauseWatcherMode);
            localStorage.setItem("isSmoker", String(STATE.isSmoker));
            localStorage.setItem("smokeMinutesPerBreak", String(STATE.smokeMinutesPerBreak));
            localStorage.setItem("appHue", String(STATE.appHue));
            localStorage.setItem("appLightness", String(STATE.appLightness));
        },
        loadTodayState(dateStr) {
            STATE.activeDateStr = dateStr;
            STATE.todaySessions = [];
            STATE.todaySmokeCount = 0;

            const dayRec = this.getDayData(dateStr);
            if (dayRec && typeof dayRec.smokeCount === "number") {
                STATE.todaySmokeCount = dayRec.smokeCount;
            }

            try {
                const rawSaved = localStorage.getItem("savedTodaySessions");
                if (rawSaved) {
                    const parsed = JSON.parse(rawSaved);
                    if (parsed && parsed.date === dateStr && Array.isArray(parsed.sessions)) {
                        STATE.todaySessions = parsed.sessions;
                        return;
                    }
                    localStorage.removeItem("savedTodaySessions");
                }
            } catch (e) {
                localStorage.removeItem("savedTodaySessions");
            }

            if (dayRec && Array.isArray(dayRec.sessions) && dayRec.sessions.length > 0) {
                STATE.todaySessions = JSON.parse(JSON.stringify(dayRec.sessions));
                localStorage.setItem("savedTodaySessions", JSON.stringify({ date: dateStr, sessions: STATE.todaySessions }));
            } else if (dayRec && dayRec.startH !== "" && dayRec.startH !== undefined) {
                STATE.todaySessions = [{
                    start: { h: format2(parseInt(dayRec.startH, 10) || 0), m: format2(parseInt(dayRec.startM, 10) || 0), s: "00" },
                    end: (dayRec.endH !== "" && dayRec.endH !== undefined)
                        ? { h: format2(parseInt(dayRec.endH, 10) || 0), m: format2(parseInt(dayRec.endM, 10) || 0), s: "00" }
                        : null
                }];
            }
        },
        saveTodaySessionsAndDay(dateStr) {
            if (STATE.todaySessions.length > 0) {
                localStorage.setItem("savedTodaySessions", JSON.stringify({ date: dateStr, sessions: STATE.todaySessions }));
            } else {
                localStorage.removeItem("savedTodaySessions");
            }

            const parts = dateStr.split("-").map(Number);
            const dow = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
            if (STATE.todaySessions.length === 0 && STATE.todaySmokeCount === 0 && (dow === 0 || dow === 6)) {
                this.removeDayData(dateStr);
                return;
            }

            const first = STATE.todaySessions[0] || null;
            const last = STATE.todaySessions[STATE.todaySessions.length - 1] || null;
            const { totalPresSecs } = CALC.getSessionMetricsFromList(STATE.todaySessions, null);

            const currentDay = this.getDayData(dateStr) || { status: "work" };
            if (STATE.todaySessions.length > 0 && currentDay.status === "free") {
                currentDay.status = "work";
            }
            currentDay.startH = first && first.start ? first.start.h : "";
            currentDay.startM = first && first.start ? (first.start.m || "00") : "";
            currentDay.endH = last && last.end ? last.end.h : "";
            currentDay.endM = last && last.end ? (last.end.m || "00") : "";
            currentDay.sessions = STATE.todaySessions;
            currentDay.customPresSecs = totalPresSecs > 0 ? totalPresSecs : null;
            currentDay.smokeCount = STATE.todaySmokeCount;
            currentDay.smokeTotalMins = STATE.todaySmokeCount * STATE.smokeMinutesPerBreak;

            this.saveDayData(dateStr, currentDay);
        },
        saveTodaySmokeOnly(dateStr) {
            const currentDay = this.getDayData(dateStr) || { status: "work", startH: "", startM: "", endH: "", endM: "" };
            currentDay.smokeCount = STATE.todaySmokeCount;
            currentDay.smokeTotalMins = STATE.todaySmokeCount * STATE.smokeMinutesPerBreak;
            this.saveDayData(dateStr, currentDay);
        }
    };

    /* =========================================================
       3. CALC — REINE BERECHNUNGS- & FEIERTAGSLOGIK
       ========================================================= */
    const CALC = {
        getCalendarWeek(date) {
            const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        },
        getMonday(d) {
            const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const day = copy.getDay();
            copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1));
            return copy;
        },
        // Gaußsche Osterformel (Gregorianischer Kalender)
        getEasterSunday(year) {
            const a = year % 19;
            const b = Math.floor(year / 100);
            const c = year % 100;
            const d = Math.floor(b / 4);
            const e = b % 4;
            const f = Math.floor((b + 8) / 25);
            const g = Math.floor((b - f + 1) / 3);
            const h = (19 * a + b - d - g + 15) % 30;
            const i = Math.floor(c / 4);
            const k = c % 4;
            const l = (32 + 2 * e + 2 * i - h - k) % 7;
            const m = Math.floor((a + 11 * h + 22 * l) / 451);
            const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = März, 4 = April
            const day = ((h + l - 7 * m + 114) % 31) + 1;
            return new Date(year, month - 1, day);
        },
        getHolidaysForYearNds(year) {
            if (STATE.holidayCacheByYear[year]) return STATE.holidayCacheByYear[year];
            const easter = this.getEasterSunday(year);
            const shiftDate = (base, offsetDays) => {
                const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offsetDays);
                return getDateStrFromObj(dt);
            };
            const map = {
                [`${year}-01-01`]: "Neujahr",
                [shiftDate(easter, -2)]: "Karfreitag",
                [shiftDate(easter, 1)]: "Ostermontag",
                [`${year}-05-01`]: "Tag der Arbeit",
                [shiftDate(easter, 39)]: "Christi Himmelfahrt",
                [shiftDate(easter, 50)]: "Pfingstmontag",
                [`${year}-10-03`]: "Tag d. Dt. Einheit",
                [`${year}-10-31`]: "Reformationstag",
                [`${year}-12-25`]: "1. Weihnachtstag",
                [`${year}-12-26`]: "2. Weihnachtstag"
            };
            STATE.holidayCacheByYear[year] = map;
            return map;
        },
        getHolidayName(dateStr) {
            if (!dateStr || dateStr.length < 4) return null;
            const year = parseInt(dateStr.slice(0, 4), 10);
            if (isNaN(year)) return null;
            const map = this.getHolidaysForYearNds(year);
            return map[dateStr] || null;
        },
        timeObjToSecs(t) {
            if (!t || t.h === "" || t.h === undefined || isNaN(parseInt(t.h, 10))) return null;
            return (parseInt(t.h, 10) * 3600) + ((parseInt(t.m, 10) || 0) * 60) + (parseInt(t.s, 10) || 0);
        },
        getNowSecsOfDay() {
            const now = new Date();
            return (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
        },
        formatSecsToHhMmSs(totalSecs) {
            const s = Math.max(0, Math.floor(totalSecs));
            const hh = Math.floor(s / 3600);
            const mm = Math.floor((s % 3600) / 60);
            const ss = s % 60;
            return `${format2(hh)}:${format2(mm)}:${format2(ss)}`;
        },
        formatSecsToHhMm(totalSecs) {
            const s = Math.max(0, Math.floor(totalSecs));
            const hh = Math.floor(s / 3600);
            const mm = Math.floor((s % 3600) / 60);
            return `${format2(hh)}:${format2(mm)}`;
        },
        getSessionMetricsFromList(sessionsArr, liveEndSecs = null) {
            let totalPresSecs = 0;
            let totalGapSecs = 0;
            if (!Array.isArray(sessionsArr)) return { totalPresSecs, totalGapSecs };

            for (let i = 0; i < sessionsArr.length; i++) {
                const sSecs = this.timeObjToSecs(sessionsArr[i].start);
                let eSecs = this.timeObjToSecs(sessionsArr[i].end);
                if (eSecs === null && liveEndSecs !== null && i === sessionsArr.length - 1) {
                    eSecs = liveEndSecs;
                }
                if (sSecs !== null && eSecs !== null && eSecs > sSecs) {
                    totalPresSecs += (eSecs - sSecs);
                }
                if (i > 0) {
                    const prevEndSecs = this.timeObjToSecs(sessionsArr[i - 1].end);
                    if (prevEndSecs !== null && sSecs !== null && sSecs > prevEndSecs) {
                        totalGapSecs += (sSecs - prevEndSecs);
                    }
                }
            }
            return { totalPresSecs, totalGapSecs };
        },
        /**
         * Gesplittete Tage & gesetzliche Pflichtpause:
         * - > 6:00 h (21.600 s) Arbeitszeit -> 30 Min (1.800 s) Pflichtpause
         *   (gleitende Übergangsphase 06:00:00..06:30:00 wenn noch keine reale Pause genommen wurde)
         * - > 9:00 h (32.400 s) Arbeitszeit -> 45 Min (2.700 s) Pflichtpause
         * - Bereits ausgestempelte Unterbrechungen (totalGapSecs) werden voll angerechnet:
         *   Es wird immer nur die noch fehlende Restpause abgezogen, niemals doppelt.
         */
        getDeductionDetails(totalPresSecs, smokeSecs = 0, totalGapSecs = 0) {
            const gapSecs = Math.max(0, totalGapSecs);
            let missingLegalPauseSecs = 0;

            if (totalPresSecs > 32400) {
                const target45 = 2700;
                const remaining45 = Math.max(0, target45 - gapSecs);
                // Gleitender Übergang ab 09:00 h bis 09:00 h + remaining45, damit Netto-Arbeitszeit nicht unter 9:00 h fällt
                missingLegalPauseSecs = Math.min(remaining45, totalPresSecs - 32400);
                // Mindestens jedoch der volle 30-Min-Restabzug aus der 6h-Stufe
                const remaining30 = Math.max(0, 1800 - gapSecs);
                missingLegalPauseSecs = Math.max(missingLegalPauseSecs, remaining30);
            } else if (totalPresSecs > 21600) {
                const target30 = 1800;
                const remaining30 = Math.max(0, target30 - gapSecs);
                missingLegalPauseSecs = Math.min(remaining30, totalPresSecs - 21600);
            }

            const effectiveSmokeSecs = Math.max(0, smokeSecs - gapSecs);
            const totalDeductSecs = Math.max(missingLegalPauseSecs, effectiveSmokeSecs);
            return {
                netSecs: Math.max(0, totalPresSecs - totalDeductSecs),
                totalDeductSecs,
                missingLegalPauseSecs,
                creditedGapSecs: gapSecs
            };
        },
        getDayBreakdown(saved, liveEndSecs = null) {
            if (!saved) return { presSecs: 0, gapSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
            let totalPresSecs = 0;
            let totalGapSecs = 0;
            let isLive = false;

            if (Array.isArray(saved.sessions) && saved.sessions.length > 0) {
                const lastSess = saved.sessions[saved.sessions.length - 1];
                const hasOpenLast = !lastSess.end || lastSess.end.h === "";
                const metrics = this.getSessionMetricsFromList(
                    saved.sessions,
                    (hasOpenLast && liveEndSecs !== null) ? liveEndSecs : null
                );
                isLive = Boolean(hasOpenLast && liveEndSecs !== null);
                totalPresSecs = (!isLive && saved.customPresSecs && saved.customPresSecs > 0)
                    ? saved.customPresSecs
                    : metrics.totalPresSecs;
                totalGapSecs = metrics.totalGapSecs;
            } else if (saved.customPresSecs && saved.customPresSecs > 0) {
                totalPresSecs = saved.customPresSecs;
            } else if (saved.startH !== "" && saved.startH !== undefined) {
                const sh = parseInt(saved.startH, 10);
                const sm = parseInt(saved.startM, 10) || 0;
                if (isNaN(sh)) return { presSecs: 0, gapSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                const sSecs = sh * 3600 + sm * 60;
                if (saved.endH !== "" && saved.endH !== undefined) {
                    const eh = parseInt(saved.endH, 10);
                    const em = parseInt(saved.endM, 10) || 0;
                    if (isNaN(eh)) return { presSecs: 0, gapSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                    const eSecs = eh * 3600 + em * 60;
                    if (eSecs <= sSecs) return { presSecs: 0, gapSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                    totalPresSecs = eSecs - sSecs;
                } else if (liveEndSecs !== null && liveEndSecs > sSecs) {
                    isLive = true;
                    totalPresSecs = liveEndSecs - sSecs;
                } else {
                    return { presSecs: 0, gapSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                }
            } else {
                return { presSecs: 0, gapSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
            }

            const smokeSecs = (saved.smokeTotalMins || 0) * 60;
            const { netSecs, totalDeductSecs } = this.getDeductionDetails(totalPresSecs, smokeSecs, totalGapSecs);
            return { presSecs: totalPresSecs, gapSecs: totalGapSecs, deductSecs: totalDeductSecs, netSecs, isLive };
        },
        hasWeekendBooking(saved) {
            if (!saved) return false;
            const hasTimes = (saved.startH !== "" && saved.startH !== undefined)
                || (saved.endH !== "" && saved.endH !== undefined)
                || (Array.isArray(saved.sessions) && saved.sessions.length > 0);
            const hasSmoke = typeof saved.smokeCount === "number" && saved.smokeCount > 0;
            const hasNonFreeStatus = saved.status && saved.status !== "free" && saved.status !== "work";
            return hasTimes || hasSmoke || hasNonFreeStatus;
        },
        computeTotalGlzHours() {
            const todayStr = getTodayStr();
            const nowSecs = this.getNowSecsOfDay();
            const sollSecsPerDay = (STATE.sollHours * 3600) + (STATE.sollMinutes * 60);
            let deltaSecs = 0;

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith("day_")) continue;
                const dateStr = key.slice(4);
                if (STATE.glzBaseDate && dateStr < STATE.glzBaseDate) continue;

                const parts = dateStr.split("-").map(Number);
                if (parts.length !== 3 || parts.some(isNaN)) continue;

                const dt = new Date(parts[0], parts[1] - 1, parts[2]);
                const dow = dt.getDay();
                const isWeekend = (dow === 0 || dow === 6);
                const saved = STORAGE.getDayData(dateStr);
                if (!saved) continue;

                const daySoll = isWeekend ? 0 : sollSecsPerDay;
                let dayCredited = 0;

                if (saved.status === "work") {
                    const bd = this.getDayBreakdown(saved, dateStr === todayStr ? nowSecs : null);
                    dayCredited = bd.netSecs;
                    if (dayCredited === 0 && bd.presSecs === 0 && dateStr > todayStr) continue;
                } else if (saved.status === "vacation" || saved.status === "sick" || saved.status === "holiday") {
                    dayCredited = daySoll;
                } else if (saved.status === "free") {
                    dayCredited = 0;
                }

                deltaSecs += (dayCredited - daySoll);
            }

            const total = STATE.glzBaseHours + (deltaSecs / 3600);
            return Number.isFinite(total) ? total : STATE.glzBaseHours;
        }
    };

    /* =========================================================
       4. DOM-REFERENZEN & UI-RENDERING
       ========================================================= */
    const DOM = {
        versionLabel: document.getElementById("app-version-label"),
        liveTime: document.getElementById("live-clock-time"),
        liveDay: document.getElementById("live-clock-day"),
        liveClockBox: document.getElementById("live-clock-box"),
        headerStatusChip: document.getElementById("header-status-chip"),
        bgHourWatermark: document.getElementById("bg-hour-watermark"),
        edgeBgLayer: document.getElementById("edge-bg-layer"),
        metaThemeColor: document.getElementById("meta-theme-color"),

        welcomeOverlay: document.getElementById("welcome-overlay"),
        welcomeScatterField: document.getElementById("welcome-scatter-field"),
        welcomeGreeting: document.getElementById("welcome-greeting"),
        welcomeDateSub: document.getElementById("welcome-date-sub"),
        welcomeBigClock: document.getElementById("welcome-big-clock"),
        btnWelcomeAction: document.getElementById("btn-welcome-action"),
        welcomeActionTitle: document.getElementById("welcome-action-title"),
        welcomeActionSub: document.getElementById("welcome-action-sub"),
        btnWelcomeMenu: document.getElementById("btn-welcome-menu"),
        welcomePauseWidget: document.getElementById("welcome-pause-widget"),
        wpwBadge: document.getElementById("wpw-badge"),
        wpwLimitTime: document.getElementById("wpw-limit-time"),
        wpwCountdown: document.getElementById("wpw-countdown"),
        wpwSubStatus: document.getElementById("wpw-sub-status"),

        viewsStage: document.getElementById("views-stage"),
        viewClock: document.getElementById("view-clock"),
        viewWeek: document.getElementById("view-week"),
        btnNavToday: document.getElementById("btn-nav-today"),
        btnToggleView: document.getElementById("btn-toggle-view"),
        btnSettings: document.getElementById("btn-settings"),

        btnNowStart: document.getElementById("btn-now-start"),
        btnNowEnd: document.getElementById("btn-now-end"),
        btnUndo: document.getElementById("btn-undo"),
        smokeBar: document.getElementById("smoke-bar"),
        smokeCountDisplay: document.getElementById("smoke-count-display"),

        outNoPause: document.getElementById("output-no-pause"),
        out30Range: document.getElementById("output-30min-pause-range"),
        out45Pause: document.getElementById("output-45min-pause"),
        lblDecimal: document.getElementById("label-decimal-time"),
        lblOvertime: document.getElementById("label-overtime"),
        outDecimal: document.getElementById("output-decimal-time"),
        outPauseHint: document.getElementById("output-pause-hint"),
        outOvertime: document.getElementById("output-overtime"),

        startTimePill: document.getElementById("startTimePill"),
        endTimePill: document.getElementById("endTimePill"),
        pillStartWrap: document.getElementById("pill-start"),
        pillEndWrap: document.getElementById("pill-end"),

        sessionsBox: document.getElementById("sessions-box"),
        sessionsList: document.getElementById("sessions-list"),
        sessionsPresSum: document.getElementById("sessions-pres-sum"),
        sessionsBreakInfo: document.getElementById("sessions-break-info"),
        sessionsGapSum: document.getElementById("sessions-gap-sum"),

        weekDaysContainer: document.getElementById("week-days-container"),
        weekKwMain: document.getElementById("week-kw-main"),
        weekDatePicker: document.getElementById("week-date-picker"),
        kwMergedSwipebar: document.getElementById("kw-merged-swipebar"),
        lblWeekWorked: document.getElementById("label-week-worked"),
        lblWeekTotal: document.getElementById("label-week-total"),
        outWeekWorked: document.getElementById("output-week-worked"),
        outWeekTotal: document.getElementById("output-week-total"),
        glzPill: document.getElementById("glzPill"),
        glzPillText: document.getElementById("glzPillText"),

        keypadSheet: document.getElementById("custom-keypad-sheet"),
        keypadTargetBadge: document.getElementById("keypad-target-badge"),

        settingsModal: document.getElementById("settings-modal"),
        settingsPageMain: document.getElementById("settings-page-main"),
        settingsPageWork: document.getElementById("settings-page-work"),
        settingsPageWidgets: document.getElementById("settings-page-widgets"),
        settingsPageDesign: document.getElementById("settings-page-design"),
        userNameInput: document.getElementById("userNameInput"),
        sollHoursInput: document.getElementById("sollHours"),
        sollMinutesInput: document.getElementById("sollMinutes"),
        weeklyHoursInput: document.getElementById("weeklyHoursInput"),
        glzBaseInput: document.getElementById("glzBaseInput"),
        glzBaseDateInput: document.getElementById("glzBaseDateInput"),
        pauseNotifyCheck: document.getElementById("pauseNotifyCheck"),
        pauseNotifyLeadInput: document.getElementById("pauseNotifyLeadInput"),
        pauseNotifyMinsWrap: document.getElementById("pauseNotifyMinsWrap"),
        pauseWatcherEnabledCheck: document.getElementById("pauseWatcherEnabledCheck"),
        pauseWatcherOptionsWrap: document.getElementById("pause-watcher-options-wrap"),
        pauseWatcherModePills: document.getElementById("pause-watcher-mode-pills"),
        styleModeSelect: document.getElementById("styleModeSelect"),
        asymSliderWrap: document.getElementById("asymSliderWrap"),
        asymIntensitySlider: document.getElementById("asymIntensitySlider"),
        asymIntensityVal: document.getElementById("asymIntensityVal"),
        isSmokerCheck: document.getElementById("isSmokerCheck"),
        smokeMinutesInput: document.getElementById("smokeMinutesInput"),
        smokerMinsWrap: document.getElementById("smokerMinsWrap"),
        lightnessSlider: document.getElementById("lightnessSlider"),
        lightnessVal: document.getElementById("lightnessVal"),
        colorWheelCanvas: document.getElementById("colorWheel"),
        scribbleAccordionCard: document.getElementById("scribble-accordion-card"),
        btnToggleScribbleAccordion: document.getElementById("btn-toggle-scribble-accordion"),
        scribbleAccordionMeta: document.getElementById("scribble-accordion-meta"),
        scribbleMiniStrip: document.getElementById("scribble-mini-strip"),
        scribbleSvgGrid: document.getElementById("scribble-svg-grid"),
        scribbleCountTag: document.getElementById("scribble-count-tag"),
        scribbleSizeSlider: document.getElementById("scribbleSizeSlider"),
        scribbleSizeVal: document.getElementById("scribbleSizeVal"),
        navWorkSummary: document.getElementById("nav-work-summary"),
        navWidgetsSummary: document.getElementById("nav-widgets-summary"),
        navDesignSummary: document.getElementById("nav-design-summary"),
        backupStatusPill: document.getElementById("backup-status-pill"),
        backupFileInput: document.getElementById("backup-file-input"),

        backfillModal: document.getElementById("backfill-modal"),
        backfillDateInput: document.getElementById("backfillDateInput"),
        pdfExportModal: document.getElementById("pdf-export-modal"),
        pdfMonthSelect: document.getElementById("pdfMonthSelect"),
        pdfUserNamePreview: document.getElementById("pdfUserNamePreview"),
        pdfAlsoBackupCheck: document.getElementById("pdfAlsoBackupCheck"),
        dayEditorModal: document.getElementById("day-editor-modal"),
        dayEditorTitle: document.getElementById("day-editor-title"),
        dayEditorWorkArea: document.getElementById("day-editor-work-area"),
        dayEditorNonWorkNote: document.getElementById("day-editor-nonwork-note"),
        dayEditorBlocksList: document.getElementById("day-editor-blocks-list"),
        editorSmokeVal: document.getElementById("editor-smoke-val")
    };

    /* OFFSCREEN-CANVAS FÜR OKLCH-FARBRAD (KEIN 360-SEGMENTE-NEUZEICHNEN BEIM ZIEHEN) */
    const wheelOffscreen = document.createElement("canvas");
    wheelOffscreen.width = DOM.colorWheelCanvas.width;
    wheelOffscreen.height = DOM.colorWheelCanvas.height;
    let cachedWheelLightness = null;

    const UI = {
        applyThemeColors(hue, lightness) {
            const pal = window.computeOklchPalette(hue, lightness);
            const root = document.documentElement;
            root.style.setProperty("--hue", hue);
            root.style.setProperty("--lightness", lightness + "%");
            root.style.setProperty("--bg-color", pal.bg);
            root.style.setProperty("--card-bg", pal.cardBg);
            root.style.setProperty("--subcard-bg", pal.subcardBg);
            root.style.setProperty("--text-color", pal.text);
            root.style.setProperty("--border-color", pal.border);
            root.style.setProperty("--primary-color", pal.primary);
            root.style.setProperty("--primary-hover", pal.primaryHover);
            root.style.setProperty("--secondary-color", pal.secondary);
            root.style.setProperty("--secondary-hover", pal.secondaryHover);
            root.style.backgroundColor = pal.bg;

            if (DOM.edgeBgLayer) DOM.edgeBgLayer.style.backgroundColor = pal.bg;
            if (DOM.metaThemeColor) {
                const isWelcomeOpen = DOM.welcomeOverlay.classList.contains("active");
                DOM.metaThemeColor.setAttribute("content", isWelcomeOpen ? pal.metaWelcome : pal.metaBg);
            }
        },
        applyAsymIntensity(val) {
            const clamped = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
            document.documentElement.style.setProperty("--asym-intensity", (clamped / 100).toFixed(3));
            return clamped;
        },
        drawColorWheel() {
            const ctx = DOM.colorWheelCanvas.getContext("2d");
            const radius = DOM.colorWheelCanvas.width / 2;

            // Offscreen-Basis nur neu rendern, wenn sich die Helligkeit geändert hat
            if (cachedWheelLightness !== STATE.appLightness) {
                const offCtx = wheelOffscreen.getContext("2d");
                offCtx.clearRect(0, 0, wheelOffscreen.width, wheelOffscreen.height);
                for (let angle = 0; angle < 360; angle++) {
                    const pal = window.computeOklchPalette(angle, STATE.appLightness);
                    offCtx.beginPath();
                    offCtx.moveTo(radius, radius);
                    offCtx.arc(radius, radius, radius, (angle - 0.5) * Math.PI / 180, (angle + 1.5) * Math.PI / 180);
                    offCtx.closePath();
                    offCtx.fillStyle = pal.primary;
                    offCtx.fill();
                }
                cachedWheelLightness = STATE.appLightness;
            }

            ctx.clearRect(0, 0, DOM.colorWheelCanvas.width, DOM.colorWheelCanvas.height);
            ctx.drawImage(wheelOffscreen, 0, 0);

            const drawDot = (hueAngle, dotRadius) => {
                const rad = hueAngle * Math.PI / 180;
                const dotX = radius + Math.cos(rad) * (radius * 0.7);
                const dotY = radius + Math.sin(rad) * (radius * 0.7);
                ctx.beginPath();
                ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
                ctx.lineWidth = dotRadius >= 7 ? 2.5 : 2;
                ctx.strokeStyle = "rgba(0,0,0,0.72)";
                ctx.stroke();
            };

            drawDot(STATE.appHue + 120, 4.5);
            drawDot(STATE.appHue + 150, 4.5);
            drawDot(STATE.appHue, 8);
        },
        isClockedIn() {
            if (STATE.todaySessions.length === 0) return false;
            const last = STATE.todaySessions[STATE.todaySessions.length - 1];
            return Boolean(last && last.start && last.start.h !== "" && (!last.end || last.end.h === ""));
        },
        syncStampButtonEmphasis() {
            const active = this.isClockedIn();
            if (active) {
                // Eingestempelt: "Gehen" strahlt voll gesättigt, "Kommen" tritt zurück
                DOM.btnNowEnd.classList.add("is-primary-active");
                DOM.btnNowEnd.classList.remove("is-dimmed");
                DOM.btnNowStart.classList.add("is-dimmed");
                DOM.btnNowStart.classList.remove("is-primary-active");

                DOM.headerStatusChip.textContent = "Eingestempelt";
                DOM.headerStatusChip.classList.add("is-running");
            } else {
                // Ausgestempelt: "Kommen" strahlt voll gesättigt, "Gehen" tritt zurück
                DOM.btnNowStart.classList.add("is-primary-active");
                DOM.btnNowStart.classList.remove("is-dimmed");
                DOM.btnNowEnd.classList.add("is-dimmed");
                DOM.btnNowEnd.classList.remove("is-primary-active");

                DOM.headerStatusChip.textContent = STATE.todaySessions.length > 0 ? "Ausgestempelt" : "Bereit";
                DOM.headerStatusChip.classList.remove("is-running");
            }
        },
        syncBottomNavActive(tab) {
            DOM.btnNavToday.classList.toggle("is-current", tab === "clock");
            DOM.btnToggleView.classList.toggle("is-current", tab === "week");
            DOM.btnSettings.classList.toggle("is-current", tab === "menu");
        },
        updateUndoButtonState() {
            DOM.btnUndo.disabled = STATE.undoStack.length === 0;
        },
        updateSmokerUI() {
            DOM.smokerMinsWrap.style.opacity = STATE.isSmokerCheck ? "1" : "0.45";
            DOM.smokeMinutesInput.disabled = !DOM.isSmokerCheck.checked;
            DOM.smokeBar.style.display = STATE.isSmoker ? "grid" : "none";
            DOM.smokeCountDisplay.textContent = `${STATE.todaySmokeCount}× (-${STATE.todaySmokeCount * STATE.smokeMinutesPerBreak}m)`;
        },
        syncInputsFromSessions() {
            if (STATE.todaySessions.length === 0) {
                DOM.startTimePill.value = "";
                DOM.endTimePill.value = "";
                this.syncStampButtonEmphasis();
                return;
            }
            DOM.startTimePill.value = `${STATE.todaySessions[0].start.h}:${STATE.todaySessions[0].start.m || "00"}`;
            const last = STATE.todaySessions[STATE.todaySessions.length - 1];
            DOM.endTimePill.value = (last && last.end && last.end.h !== "") ? `${last.end.h}:${last.end.m || "00"}` : "";
            this.syncStampButtonEmphasis();
        },
        renderSessionsBox() {
            if (STATE.todaySessions.length <= 1) {
                DOM.sessionsBox.style.display = "none";
                return;
            }
            DOM.sessionsBox.style.display = "block";
            DOM.sessionsList.innerHTML = "";

            const hasOpenLast = !STATE.todaySessions[STATE.todaySessions.length - 1].end;
            const { totalPresSecs, totalGapSecs } = CALC.getSessionMetricsFromList(
                STATE.todaySessions,
                hasOpenLast ? CALC.getNowSecsOfDay() : null
            );
            DOM.sessionsPresSum.textContent = `Anwesenheit: ${CALC.formatSecsToHhMm(totalPresSecs)} h`;

            const formatTimeWithSecs = (t) => (!t || t.h === "")
                ? "--:--"
                : `${format2(parseInt(t.h, 10))}:${format2(parseInt(t.m, 10) || 0)}:${format2(parseInt(t.s, 10) || 0)}`;

            STATE.todaySessions.forEach((sess, idx) => {
                const row = document.createElement("div");
                row.className = "session-item";
                const endStr = sess.end ? formatTimeWithSecs(sess.end) : "läuft...";
                row.innerHTML = `<span><strong>#${idx + 1}:</strong> ${formatTimeWithSecs(sess.start)} – ${endStr}</span><button type="button" class="session-del-btn" data-idx="${idx}" title="Block entfernen">×</button>`;
                DOM.sessionsList.appendChild(row);
            });

            DOM.sessionsList.querySelectorAll(".session-del-btn").forEach((btn) => {
                btn.addEventListener("click", (e) => {
                    pushUndoSnapshot();
                    STATE.todaySessions.splice(parseInt(e.target.getAttribute("data-idx"), 10), 1);
                    this.syncInputsFromSessions();
                    STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
                    this.calculateAllTimes();
                });
            });

            if (totalGapSecs > 0) {
                DOM.sessionsBreakInfo.style.display = "flex";
                DOM.sessionsGapSum.textContent = `${Math.round(totalGapSecs / 60)} min (angerechnet)`;
            } else {
                DOM.sessionsBreakInfo.style.display = "none";
            }
        },
        calculateEndTimes() {
            const pS = parseHhMmString(DOM.startTimePill.value);
            if (!pS) {
                DOM.outNoPause.textContent = "-";
                DOM.out30Range.textContent = "-";
                DOM.out45Pause.textContent = "-";
                return;
            }

            const hours = parseInt(pS.h, 10);
            const minutes = parseInt(pS.m, 10) || 0;
            const seconds = (STATE.todaySessions.length > 0 && STATE.todaySessions[0].start)
                ? (parseInt(STATE.todaySessions[0].start.s, 10) || 0)
                : 0;

            const { totalGapSecs } = CALC.getSessionMetricsFromList(STATE.todaySessions, null);
            const startTime = new Date();
            startTime.setHours(hours, minutes, seconds, 0);

            // Reale ausgestempelte Pausen (totalGapSecs) verlängern die Rahmenzeit entsprechend,
            // werden aber auf die 30/45 Min Pflichtpause angerechnet (nur Restpause bleibt zusätzlich).
            const rem30 = Math.max(0, 1800 - totalGapSecs);
            const rem45 = Math.max(0, 2700 - totalGapSecs);

            const addWorkPlusGap = (workSecs) => new Date(startTime.getTime() + (workSecs + totalGapSecs) * 1000);
            const formatT = (d) => `${format2(d.getHours())}:${format2(d.getMinutes())}:${format2(d.getSeconds())}`;

            // Ohne Pflichtpausenabzug: bis exakt 06:00:00 Netto-Arbeitszeit
            DOM.outNoPause.textContent = formatT(addWorkPlusGap(6 * 3600));
            // 30-Min-Stufe: ab 06:00:01 Netto-Arbeitszeit (plus ggf. Restpause) bis 09:00:00 Netto
            DOM.out30Range.textContent = `${formatT(addWorkPlusGap(6 * 3600 + rem30))} bis ${formatT(addWorkPlusGap(9 * 3600 + rem30))}`;
            // 45-Min-Stufe: ab > 09:00:00 Netto-Arbeitszeit (plus ggf. Restpause)
            DOM.out45Pause.textContent = formatT(addWorkPlusGap(9 * 3600 + rem45));
        },
        calculateWorkingTime() {
            const pS = parseHhMmString(DOM.startTimePill.value);
            const pE = parseHhMmString(DOM.endTimePill.value);

            if (!pS) {
                DOM.lblDecimal.textContent = "Dezimal (h)";
                DOM.lblOvertime.textContent = "+/-";
                DOM.outDecimal.textContent = "-";
                DOM.outPauseHint.style.display = "none";
                DOM.outOvertime.textContent = "-";
                return;
            }

            const stH = parseInt(pS.h, 10);
            const stM = parseInt(pS.m, 10) || 0;
            const isLiveRunning = !pE;

            const stS = (STATE.todaySessions.length > 0 && STATE.todaySessions[0].start)
                ? (parseInt(STATE.todaySessions[0].start.s, 10) || 0)
                : 0;
            const startSecs = (stH * 3600) + (stM * 60) + stS;

            let endSecs;
            if (isLiveRunning) {
                endSecs = CALC.getNowSecsOfDay();
                if (!DOM.lblDecimal.querySelector(".live-dot")) {
                    DOM.lblDecimal.innerHTML = `<span class="live-dot"></span>Bisher (Netto)`;
                }
                if (!DOM.lblOvertime.querySelector(".live-dot")) {
                    DOM.lblOvertime.innerHTML = `<span class="live-dot"></span>Bis Soll (+/-)`;
                }
            } else {
                const enH = parseInt(pE.h, 10);
                const enM = parseInt(pE.m, 10) || 0;
                const lastSess = STATE.todaySessions[STATE.todaySessions.length - 1];
                const enS = (lastSess && lastSess.end) ? (parseInt(lastSess.end.s, 10) || 0) : 0;
                endSecs = (enH * 3600) + (enM * 60) + enS;
                DOM.lblDecimal.textContent = "Dezimal (h)";
                DOM.lblOvertime.textContent = "+/-";
            }

            if (endSecs < startSecs) {
                DOM.outDecimal.textContent = isLiveRunning ? "00:00 h" : "Ungültig";
                DOM.outPauseHint.style.display = "none";
                DOM.outOvertime.textContent = "-";
                return;
            }

            let totalPresSecs = endSecs - startSecs;
            let totalGapSecs = 0;
            if (STATE.todaySessions.length > 1) {
                const metrics = CALC.getSessionMetricsFromList(STATE.todaySessions, isLiveRunning ? endSecs : null);
                if (metrics.totalPresSecs > 0) totalPresSecs = metrics.totalPresSecs;
                totalGapSecs = metrics.totalGapSecs;
            }

            const smokeSecs = STATE.isSmoker ? STATE.todaySmokeCount * STATE.smokeMinutesPerBreak * 60 : 0;
            const { netSecs, totalDeductSecs, creditedGapSecs } = CALC.getDeductionDetails(totalPresSecs, smokeSecs, totalGapSecs);
            const overSecs = netSecs - ((STATE.sollHours * 3600) + (STATE.sollMinutes * 60));

            const sign = overSecs < 0 ? "-" : "+";
            const aSecs = Math.abs(overSecs);
            DOM.outOvertime.textContent = `${sign}${CALC.formatSecsToHhMmSs(aSecs)}`;

            if (isLiveRunning) {
                DOM.outDecimal.textContent = `${CALC.formatSecsToHhMm(netSecs)} h`;
                if (totalDeductSecs > 0 || creditedGapSecs > 0) {
                    const parts = [];
                    if (totalDeductSecs > 0) parts.push(`-${Math.round(totalDeductSecs / 60)}m Abzug`);
                    if (creditedGapSecs > 0) parts.push(`${Math.round(creditedGapSecs / 60)}m Pause angerechnet`);
                    DOM.outPauseHint.textContent = parts.join(" · ");
                    DOM.outPauseHint.style.display = "block";
                } else {
                    DOM.outPauseHint.style.display = "none";
                }
            } else {
                DOM.outDecimal.textContent = (netSecs / 3600).toFixed(2).replace(".", ",");
                if (creditedGapSecs > 0 && totalDeductSecs > 0) {
                    DOM.outPauseHint.textContent = `Restabzug -${Math.round(totalDeductSecs / 60)}m`;
                    DOM.outPauseHint.style.display = "block";
                } else {
                    DOM.outPauseHint.style.display = "none";
                }
            }
        },
        calculateAllTimes() {
            this.calculateEndTimes();
            this.calculateWorkingTime();
            this.syncStampButtonEmphasis();
            this.updateWelcomePauseWidget();
        },
        updateWelcomePauseWidget() {
            if (!DOM.welcomePauseWidget) return;
            if (!STATE.pauseWatcherEnabled || !DOM.welcomeOverlay.classList.contains("active")) {
                DOM.welcomePauseWidget.style.display = "none";
                return;
            }

            const modeMatches = (STATE.pauseWatcherMode === "both")
                || (STATE.pauseWatcherMode === "go" && STATE.welcomeActionMode === "go")
                || (STATE.pauseWatcherMode === "come" && STATE.welcomeActionMode === "come");

            if (!modeMatches || !this.isClockedIn()) {
                DOM.welcomePauseWidget.style.display = "none";
                return;
            }

            const pS = parseHhMmString(DOM.startTimePill.value);
            if (!pS) {
                DOM.welcomePauseWidget.style.display = "none";
                return;
            }

            const stH = parseInt(pS.h, 10);
            const stM = parseInt(pS.m, 10) || 0;
            const stS = (STATE.todaySessions.length > 0 && STATE.todaySessions[0].start)
                ? (parseInt(STATE.todaySessions[0].start.s, 10) || 0)
                : 0;
            const startSecs = (stH * 3600) + (stM * 60) + stS;
            const nowSecs = CALC.getNowSecsOfDay();
            if (nowSecs < startSecs) {
                DOM.welcomePauseWidget.style.display = "none";
                return;
            }

            let totalPresSecs = nowSecs - startSecs;
            let totalGapSecs = 0;
            if (STATE.todaySessions.length > 1) {
                const metrics = CALC.getSessionMetricsFromList(STATE.todaySessions, nowSecs);
                if (metrics.totalPresSecs > 0) totalPresSecs = metrics.totalPresSecs;
                totalGapSecs = metrics.totalGapSecs;
            }

            const startDate = new Date();
            startDate.setHours(stH, stM, stS, 0);
            const addClock = (workSecs) => {
                const d = new Date(startDate.getTime() + (workSecs + totalGapSecs) * 1000);
                return `${format2(d.getHours())}:${format2(d.getMinutes())}:${format2(d.getSeconds())}`;
            };

            const limit30WorkSecs = 6 * 3600; // 06:00:00 Netto-Arbeitszeit
            const limit45WorkSecs = 9 * 3600; // 09:00:00 Netto-Arbeitszeit
            const gapMins = Math.round(totalGapSecs / 60);

            if (totalPresSecs <= limit30WorkSecs) {
                const remainingSecs = limit30WorkSecs - totalPresSecs;
                DOM.welcomePauseWidget.classList.remove("is-warner-45");
                DOM.wpwBadge.textContent = gapMins >= 30 ? "30m Pause erfüllt" : "30-Min-Grenze";
                DOM.wpwLimitTime.textContent = `bis ${addClock(limit30WorkSecs)}`;
                DOM.wpwCountdown.textContent = CALC.formatSecsToHhMmSs(remainingSecs);
                DOM.wpwSubStatus.textContent = gapMins > 0
                    ? `${gapMins} Min Pause bereits angerechnet (${Math.max(0, 30 - gapMins)} Min offen)`
                    : "";
                DOM.welcomePauseWidget.style.display = "flex";
            } else if (totalPresSecs <= limit45WorkSecs) {
                const remainingSecs = limit45WorkSecs - totalPresSecs;
                DOM.welcomePauseWidget.classList.add("is-warner-45");
                DOM.wpwBadge.textContent = gapMins >= 45 ? "45m Pause erfüllt" : "45er-Warner";
                DOM.wpwLimitTime.textContent = `bis ${addClock(limit45WorkSecs)}`;
                DOM.wpwCountdown.textContent = CALC.formatSecsToHhMmSs(remainingSecs);
                DOM.wpwSubStatus.textContent = gapMins > 0
                    ? `${gapMins} Min Pause angerechnet (${Math.max(0, 45 - gapMins)} Min offen)`
                    : "";
                DOM.welcomePauseWidget.style.display = "flex";
            } else {
                DOM.welcomePauseWidget.style.display = "none";
            }
        },
        updateAmpelPill() {
            if (!DOM.glzPill || !DOM.glzPillText) return;
            const gesamtSaldo = CALC.computeTotalGlzHours();
            const faktor = (STATE.weeklyHours > 0 ? STATE.weeklyHours : 40) / 40;

            const gruenMin = -20 * faktor;
            const gruenMax = 40 * faktor;
            const gelbMin = -40 * faktor;
            const gelbMax = 80 * faktor;
            const rotMax = 100 * faktor;

            DOM.glzPill.classList.remove("ampel-gruen", "ampel-gelb", "ampel-rot");
            const fmtSigned = (num) => (num >= 0 ? "+" : "") + num.toFixed(2).replace(".", ",");
            const fmtPlain = (num) => Math.abs(num).toFixed(1).replace(".", ",");

            let statusClass = "ampel-gruen";
            let infoText = "";

            if (gesamtSaldo >= gruenMin && gesamtSaldo <= gruenMax) {
                statusClass = "ampel-gruen";
                infoText = `Grün · noch ${fmtPlain(gruenMax - gesamtSaldo)}h bis Gelb`;
            } else if ((gesamtSaldo > gruenMax && gesamtSaldo <= gelbMax) || (gesamtSaldo < gruenMin && gesamtSaldo >= gelbMin)) {
                statusClass = "ampel-gelb";
                infoText = gesamtSaldo > gruenMax
                    ? `Gelb · noch ${fmtPlain(gelbMax - gesamtSaldo)}h bis Rot`
                    : `Gelb (Minus) · noch ${fmtPlain(gesamtSaldo - gelbMin)}h Puffer`;
            } else {
                statusClass = "ampel-rot";
                if (gesamtSaldo > rotMax) infoText = `Rot (> ${rotMax.toFixed(0)}h Max!)`;
                else if (gesamtSaldo < gelbMin) infoText = `Rot (Minus-Grenze!)`;
                else infoText = `Rot · Rückführung nötig`;
            }

            DOM.glzPill.classList.add(statusClass);
            DOM.glzPillText.textContent = `GLZ: ${fmtSigned(gesamtSaldo)}h (${infoText})`;
        },
        renderWeekSummaryLive() {
            const todayStr = getTodayStr();
            const nowSecs = CALC.getNowSecsOfDay();
            let liveTodaySecs = 0;
            let isLiveNow = false;

            if (STATE.weekHasLiveToday) {
                const todaySaved = STORAGE.getDayData(todayStr);
                if (todaySaved && todaySaved.status === "work") {
                    const bd = CALC.getDayBreakdown(todaySaved, nowSecs);
                    liveTodaySecs = bd.netSecs;
                    isLiveNow = bd.isLive;
                }
            }

            const totalCreditedSecs = STATE.weekStaticCreditedSecs + liveTodaySecs;
            const diffSecs = totalCreditedSecs - STATE.weekTotalSollSecs;
            const sign = diffSecs < 0 ? "-" : "+";
            const absDiffSecs = Math.abs(diffSecs);

            if (isLiveNow) {
                if (!DOM.lblWeekWorked.querySelector(".live-dot")) {
                    DOM.lblWeekWorked.innerHTML = `<span class="live-dot"></span>Geleistet (Live)`;
                }
                if (!DOM.lblWeekTotal.querySelector(".live-dot")) {
                    DOM.lblWeekTotal.innerHTML = `<span class="live-dot"></span>Wochen-Saldo`;
                }
                DOM.outWeekWorked.textContent = CALC.formatSecsToHhMmSs(totalCreditedSecs);
                DOM.outWeekTotal.textContent = `${sign}${CALC.formatSecsToHhMmSs(absDiffSecs)}`;
            } else {
                DOM.lblWeekWorked.textContent = "Geleistet (Ist)";
                DOM.lblWeekTotal.textContent = "Wochen-Saldo";
                DOM.outWeekWorked.textContent = `${CALC.formatSecsToHhMm(totalCreditedSecs)} h`;
                DOM.outWeekTotal.textContent = `${sign}${CALC.formatSecsToHhMm(absDiffSecs)} h`;
            }

            this.updateAmpelPill();
        },
        buildWeekView() {
            DOM.weekDaysContainer.innerHTML = "";
            const todayStr = getTodayStr();
            const refDate = new Date();
            refDate.setDate(refDate.getDate() + (STATE.weekOffset * 7));
            DOM.weekDatePicker.value = getDateStrFromObj(refDate);

            const kwNum = CALC.getCalendarWeek(refDate);
            DOM.weekKwMain.textContent = `KW ${kwNum} · ${refDate.getFullYear()}`;

            const monday = CALC.getMonday(refDate);
            const sollSecsPerDay = (STATE.sollHours * 3600) + (STATE.sollMinutes * 60);
            STATE.weekTotalSollSecs = sollSecsPerDay * 5;
            STATE.weekStaticCreditedSecs = 0;
            STATE.weekHasLiveToday = false;

            for (let i = 0; i < 7; i++) {
                const currDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
                const dateStr = getDateStrFromObj(currDate);
                const dateShort = `${format2(currDate.getDate())}.${format2(currDate.getMonth() + 1)}.`;
                const holidayName = CALC.getHolidayName(dateStr);
                const isSunday = (i === 6);
                const isSaturday = (i === 5);

                const rawSaved = localStorage.getItem("day_" + dateStr);
                const defaultStatus = holidayName ? "holiday" : ((isSaturday || isSunday) ? "free" : "work");
                const saved = STORAGE.getDayData(dateStr) || { status: defaultStatus, startH: "", startM: "", endH: "", endM: "" };
                if (holidayName && !rawSaved) saved.status = "holiday";

                if (isSunday && !CALC.hasWeekendBooking(saved)) continue;

                const row = document.createElement("div");
                row.className = "week-row" + (dateStr === todayStr ? " is-today" : "");

                const hasStart = saved.startH !== "" && saved.startH !== undefined;
                const hasEnd = saved.endH !== "" && saved.endH !== undefined;
                const smokeSub = (saved.smokeCount && saved.smokeCount > 0) ? ` · 🚬${saved.smokeCount}` : "";
                const splitSub = (saved.sessions && saved.sessions.length > 1) ? ` · ⏸️${saved.sessions.length}` : "";

                let middleHtml = "";
                if (saved.status === "work") {
                    if (hasStart || hasEnd) {
                        middleHtml = `<div class="day-time-display">${hasStart ? `${saved.startH}:${saved.startM || "00"}` : "--:--"} – ${hasEnd ? `${saved.endH}:${saved.endM || "00"}` : "läuft..."}</div>`;
                    } else {
                        middleHtml = `<div class="day-time-display empty">--:-- – --:--</div>`;
                    }
                } else if (saved.status === "holiday") {
                    middleHtml = `<div class="day-status-note">🎉 ${holidayName || "Feiertag"}</div>`;
                } else if (saved.status === "vacation" || saved.status === "sick") {
                    middleHtml = `<div class="day-status-note">Soll gutgeschrieben</div>`;
                } else {
                    middleHtml = `<div class="day-status-note">${(isSaturday || isSunday) ? "Wochenende (frei)" : "Gleitzeitabbau"}</div>`;
                }

                row.innerHTML = `<div class="day-label"><strong>${DAY_SHORT_MON[i]}</strong><span>${dateShort}${smokeSub}${splitSub}</span></div>${middleHtml}<div class="status-badge-pill" data-status="${saved.status}">${STATUS_LABELS[saved.status] || "Arbeit"}</div>`;
                row.addEventListener("click", () => openDayEditor(dateStr, `${DAY_FULL_MON[i]}, ${dateShort}${currDate.getFullYear()}`, isSaturday ? "work" : defaultStatus));
                DOM.weekDaysContainer.appendChild(row);

                if (saved.status === "work") {
                    if (dateStr === todayStr) STATE.weekHasLiveToday = true;
                    else STATE.weekStaticCreditedSecs += CALC.getDayBreakdown(saved, null).netSecs;
                } else if (saved.status === "vacation" || saved.status === "sick" || saved.status === "holiday") {
                    STATE.weekStaticCreditedSecs += sollSecsPerDay;
                }
            }
            this.renderWeekSummaryLive();
        }
    };

    /* =========================================================
       5. NOTIFICATIONS (REINE PWA-BENACHRICHTIGUNG)
       ========================================================= */
    async function showAppNotification(title, body, tag) {
        if (!("Notification" in window) || Notification.permission !== "granted") return;
        const iconFile = STATE.appIconTheme === "rose" ? "./favicon_rose_192.png" : "./favicon_192.png";
        const options = {
            body,
            icon: iconFile,
            badge: iconFile,
            tag,
            renotify: true
        };
        try {
            if ("serviceWorker" in navigator) {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    await reg.showNotification(title, options);
                    return;
                }
            }
        } catch (e) {}
        try {
            new Notification(title, options);
        } catch (e) {}
    }

    function checkPauseNotifications() {
        if (!STATE.pauseNotifyEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
        if (!UI.isClockedIn()) return;

        const pS = parseHhMmString(DOM.startTimePill.value);
        if (!pS) return;

        const stH = parseInt(pS.h, 10);
        const stM = parseInt(pS.m, 10) || 0;
        const stS = (STATE.todaySessions.length > 0 && STATE.todaySessions[0].start)
            ? (parseInt(STATE.todaySessions[0].start.s, 10) || 0)
            : 0;
        const startSecs = (stH * 3600) + (stM * 60) + stS;
        const nowSecs = CALC.getNowSecsOfDay();
        if (nowSecs <= startSecs) return;

        let totalPresSecs = nowSecs - startSecs;
        let totalGapSecs = 0;
        if (STATE.todaySessions.length > 1) {
            const metrics = CALC.getSessionMetricsFromList(STATE.todaySessions, nowSecs);
            if (metrics.totalPresSecs > 0) totalPresSecs = metrics.totalPresSecs;
            totalGapSecs = metrics.totalGapSecs;
        }

        const todayStr = getTodayStr();
        const leadSecs = STATE.pauseNotifyLeadMins * 60;

        // 30-Min-Pflichtpause nur warnen, wenn noch nicht 30 Min ausgestempelt pausiert wurde
        const limit30Secs = 6 * 3600;
        if (totalGapSecs < 1800 && totalPresSecs >= (limit30Secs - leadSecs) && totalPresSecs < (limit30Secs + 300)) {
            const key30 = `notified_p30_${todayStr}`;
            if (!localStorage.getItem(key30)) {
                localStorage.setItem(key30, "1");
                const remMins = Math.max(0, Math.ceil((limit30Secs - totalPresSecs) / 60));
                const limit30Time = DOM.outNoPause.textContent || "";
                const missingMins = Math.max(1, Math.round((1800 - totalGapSecs) / 60));
                showAppNotification(
                    `Achtung: ${missingMins} Min Pause fällig!`,
                    remMins > 0
                        ? `In ca. ${remMins} Min (ab ${limit30Time}) greift der automatische Pausenabzug.`
                        : `Die 6:00-Std-Grenze (${limit30Time}) ist erreicht – ${missingMins} Min Restpause werden jetzt angerechnet.`,
                    "pause-30"
                );
            }
        }

        // 45-Min-Pflichtpause nur warnen, wenn noch nicht 45 Min ausgestempelt pausiert wurde
        const limit45Secs = 9 * 3600;
        if (totalGapSecs < 2700 && totalPresSecs >= (limit45Secs - leadSecs) && totalPresSecs < (limit45Secs + 300)) {
            const key45 = `notified_p45_${todayStr}`;
            if (!localStorage.getItem(key45)) {
                localStorage.setItem(key45, "1");
                const remMins = Math.max(0, Math.ceil((limit45Secs - totalPresSecs) / 60));
                const limit45Time = DOM.out45Pause.textContent || "";
                const missingMins = Math.max(1, Math.round((2700 - totalGapSecs) / 60));
                showAppNotification(
                    `Achtung: 45-Min-Grenze (${missingMins} Min offen)!`,
                    remMins > 0
                        ? `In ca. ${remMins} Min (ab ${limit45Time}) greift der 45-Min-Pausenabzug.`
                        : `Die 9:00-Std-Grenze (${limit45Time}) ist erreicht – insgesamt 45 Min Pause erforderlich.`,
                    "pause-45"
                );
            }
        }
    }

    /* =========================================================
       6. START-SCREEN (SCRIBBLES & KOMMEN / GEHEN OVERLAY)
       ========================================================= */
    function createSeededRng(seedNum) {
        let s = seedNum % 2147483647;
        if (s <= 0) s += 2147483646;
        return () => {
            s = (s * 16807) % 2147483647;
            return (s - 1) / 2147483646;
        };
    }

    function triggerNodeMicroAnim(nodeEl, animClass) {
        if (!nodeEl) return;
        const animWrap = nodeEl.querySelector(".scatter-anim-wrap");
        if (!animWrap) return;
        nodeEl.classList.add("is-animating");
        animWrap.classList.remove("anim-pixel-spin", "anim-pixel-pop", "anim-pixel-wiggle");
        void animWrap.offsetWidth;
        animWrap.classList.add(animClass);
        setTimeout(() => {
            nodeEl.classList.remove("is-animating");
            animWrap.classList.remove("anim-pixel-spin", "anim-pixel-pop", "anim-pixel-wiggle");
        }, 900);
    }

    function renderWelcomeScatter() {
        DOM.welcomeScatterField.innerHTML = "";
        if (STATE.selectedScribbles.length === 0) return;

        const activeIcons = STATE.selectedScribbles
            .map((id) => SCRIBBLE_ICONS.find((ic) => ic.id === id))
            .filter(Boolean);
        if (activeIcons.length === 0) return;

        const modeOffset = STATE.welcomeActionMode === "go" ? 7919 : 0;
        const todaySeed = parseInt(getTodayStr().replace(/-/g, ""), 10) + STATE.selectedScribbles.join("").length * 131 + modeOffset;
        const rng = createSeededRng(todaySeed);

        const sizeNorm = STATE.scribbleSizePct / 100;
        const scaleFactor = 0.58 + Math.pow(sizeNorm, 1.15) * 1.78;
        const basePx = Math.round(54 * scaleFactor);
        const minDistPct = Math.max(7.2, 6.2 + sizeNorm * 7.5);
        const targetCount = Math.max(10, Math.round(32 - sizeNorm * 16));

        const placed = [];
        let attempts = 0;

        while (placed.length < targetCount && attempts < 700) {
            attempts++;
            const x = 6 + rng() * 88;
            const y = 5 + rng() * 90;
            const inGreetingZone = (y > 7 && y < 22 && x > 14 && x < 86);
            if (inGreetingZone) continue;

            let tooClose = false;
            for (const pt of placed) {
                const dx = (pt.x - x) * 0.65;
                const dy = (pt.y - y);
                if (Math.hypot(dx, dy) < minDistPct) {
                    tooClose = true;
                    break;
                }
            }
            if (tooClose) continue;
            placed.push({ x, y });
        }

        placed.forEach((pt, idx) => {
            const iconObj = activeIcons[idx % activeIcons.length];
            const rotDeg = Math.round((rng() - 0.5) * 90);
            const sizeJitter = 0.55 + rng() * 0.95;
            const finalPx = Math.round(basePx * sizeJitter);
            const alpha = (0.28 + rng() * 0.24).toFixed(2);

            const node = document.createElement("div");
            node.className = "scatter-node";
            node.style.left = `${pt.x.toFixed(1)}%`;
            node.style.top = `${pt.y.toFixed(1)}%`;
            node.style.setProperty("--base-rot", `${rotDeg}deg`);
            node.style.setProperty("--icon-size", `${finalPx}px`);
            node.style.setProperty("--icon-alpha", alpha);

            node.innerHTML = `<div class="scatter-rot-wrap"><div class="scatter-anim-wrap">${makeScribbleSvg(iconObj)}</div></div>`;
            node.addEventListener("click", (e) => {
                e.stopPropagation();
                const anims = ["anim-pixel-spin", "anim-pixel-pop", "anim-pixel-wiggle"];
                triggerNodeMicroAnim(node, anims[Math.floor(Math.random() * anims.length)]);
            });

            DOM.welcomeScatterField.appendChild(node);
            if (idx % 4 === 0) {
                setTimeout(() => triggerNodeMicroAnim(node, "anim-pixel-spin"), 160 + idx * 75);
            }
        });
    }

    function startAmbientPixelAnimations() {
        stopAmbientPixelAnimations();
        STATE.ambientAnimTimer = setInterval(() => {
            if (!DOM.welcomeOverlay.classList.contains("active")) return;
            const nodes = DOM.welcomeScatterField.querySelectorAll(".scatter-node");
            if (nodes.length === 0) return;
            const rndNode = nodes[Math.floor(Math.random() * nodes.length)];
            const anims = ["anim-pixel-spin", "anim-pixel-spin", "anim-pixel-pop", "anim-pixel-wiggle"];
            triggerNodeMicroAnim(rndNode, anims[Math.floor(Math.random() * anims.length)]);
        }, 2200);
    }

    function stopAmbientPixelAnimations() {
        if (STATE.ambientAnimTimer) {
            clearInterval(STATE.ambientAnimTimer);
            STATE.ambientAnimTimer = null;
        }
    }

    function updateWelcomeGreetingText() {
        const now = new Date();
        const hr = now.getHours();
        const cleanName = (STATE.userName || "").trim();

        if (STATE.welcomeActionMode === "go") {
            const salutation = hr >= 16 ? "Schönen Feierabend" : "Bis später";
            DOM.welcomeGreeting.textContent = cleanName ? `${salutation}, ${cleanName}!` : `${salutation}!`;
        } else {
            let salutation = "Guten Tag";
            if (hr < 11) salutation = "Guten Morgen";
            else if (hr >= 18) salutation = "Guten Abend";
            DOM.welcomeGreeting.textContent = cleanName ? `${salutation}, ${cleanName}!` : `${salutation}!`;
        }

        const dayName = WEEKDAYS_FULL[now.getDay()];
        DOM.welcomeDateSub.textContent = `${dayName}, ${format2(now.getDate())}.${format2(now.getMonth() + 1)}.${now.getFullYear()}`;
    }

    function openWelcomeScreen(mode = "come") {
        const newMode = mode === "go" ? "go" : "come";
        const wasAlreadyOpen = DOM.welcomeOverlay.classList.contains("active");
        STATE.welcomeActionMode = newMode;

        if (STATE.welcomeActionMode === "go") {
            DOM.welcomeOverlay.classList.add("mode-go-screen");
            DOM.btnWelcomeAction.classList.add("mode-go");
            DOM.btnWelcomeMenu.classList.add("mode-go");
            DOM.welcomeActionTitle.textContent = "Gehen";
            DOM.welcomeActionSub.textContent = "Jetzt direkt ausstempeln";
        } else {
            DOM.welcomeOverlay.classList.remove("mode-go-screen");
            DOM.btnWelcomeAction.classList.remove("mode-go");
            DOM.btnWelcomeMenu.classList.remove("mode-go");
            DOM.welcomeActionTitle.textContent = "Kommen";
            DOM.welcomeActionSub.textContent = "Jetzt direkt einstempeln";
        }

        const pal = window.computeOklchPalette(STATE.appHue, STATE.appLightness);
        if (DOM.metaThemeColor) DOM.metaThemeColor.setAttribute("content", pal.metaWelcome);

        updateWelcomeGreetingText();
        renderWelcomeScatter();

        if (wasAlreadyOpen) {
            DOM.welcomeOverlay.classList.remove("welcome-mode-switch");
            void DOM.welcomeOverlay.offsetWidth;
            DOM.welcomeOverlay.classList.add("welcome-mode-switch");
        } else {
            DOM.welcomeOverlay.classList.add("active");
            startAmbientPixelAnimations();
        }
        UI.updateWelcomePauseWidget();
    }

    function closeWelcomeScreen() {
        stopAmbientPixelAnimations();
        DOM.welcomeOverlay.classList.remove("active", "welcome-mode-switch", "mode-go-screen");
        if (DOM.welcomePauseWidget) DOM.welcomePauseWidget.style.display = "none";
        localStorage.setItem("welcomeDismissedDate", getTodayStr());
        UI.applyThemeColors(STATE.appHue, STATE.appLightness);
    }

    /* =========================================================
       7. ZAHLENTASTATUR-ENGINE (4 REIHEN)
       ========================================================= */
    function formatRawDigitsToHhMm(digits) {
        const clean = digits.replace(/\D/g, "").slice(0, 4);
        if (!clean) return "";
        if (clean.length === 1) return `0${clean}:00`;
        if (clean.length === 2) return `${format2(Math.min(23, parseInt(clean, 10)))}:00`;
        if (clean.length === 3) {
            const h = Math.min(23, parseInt(clean[0], 10));
            const m = Math.min(59, parseInt(clean.slice(1), 10));
            return `${format2(h)}:${format2(m)}`;
        }
        const h = Math.min(23, parseInt(clean.slice(0, 2), 10));
        const m = Math.min(59, parseInt(clean.slice(2, 4), 10));
        return `${format2(h)}:${format2(m)}`;
    }

    function parseHhMmString(str) {
        if (!str) return null;
        const trimmed = str.trim();
        const colonMatch = trimmed.match(/^(\d{1,2})\s*[:.,]\s*(\d{1,2})$/);
        if (colonMatch) {
            const h = Math.min(23, Math.max(0, parseInt(colonMatch[1], 10) || 0));
            const m = Math.min(59, Math.max(0, parseInt(colonMatch[2], 10) || 0));
            return { h: format2(h), m: format2(m) };
        }
        const digitsOnly = trimmed.replace(/\D/g, "");
        if (!digitsOnly) return null;
        const formatted = formatRawDigitsToHhMm(digitsOnly);
        const [hh, mm] = formatted.split(":");
        return { h: hh, m: mm };
    }

    function clampTwoDigitStr(valStr, min, max) {
        if (valStr === "") return "";
        let val = parseInt(valStr, 10);
        if (isNaN(val)) return "";
        if (!isNaN(min) && val < min) val = min;
        if (!isNaN(max) && val > max) val = max;
        return format2(val);
    }

    function clearAllKeypadHighlights() {
        DOM.pillStartWrap.classList.remove("is-active");
        DOM.pillEndWrap.classList.remove("is-active");
        document.querySelectorAll(".keypad-bound-input.kp-focused").forEach((el) => el.classList.remove("kp-focused"));
        DOM.settingsModal.classList.remove("keypad-open-shift");
        DOM.dayEditorModal.classList.remove("keypad-open-shift");
    }

    function openGlobalKeypad(config) {
        if (STATE.kpState && STATE.kpState.onCommit) {
            STATE.kpState.onCommit(STATE.kpState.el, true);
        }
        clearAllKeypadHighlights();

        STATE.kpState = {
            el: config.el,
            mode: config.mode || "number",
            label: config.label || "Eingabe",
            min: config.min !== undefined ? config.min : null,
            max: config.max !== undefined ? config.max : null,
            allowDecimal: Boolean(config.allowDecimal),
            allowNegative: Boolean(config.allowNegative),
            step: config.step || 1,
            nextEl: config.nextEl || null,
            onCommit: config.onCommit || null,
            fresh: true,
            buffer: ""
        };

        if (STATE.kpState.mode === "hhmm") {
            const parsed = parseHhMmString(STATE.kpState.el.value);
            STATE.kpState.buffer = parsed ? `${parsed.h}${parsed.m}` : "";
        } else {
            STATE.kpState.buffer = (STATE.kpState.el.value || "").trim();
        }

        DOM.keypadTargetBadge.textContent = STATE.kpState.label;
        if (STATE.kpState.el === DOM.startTimePill) DOM.pillStartWrap.classList.add("is-active");
        else if (STATE.kpState.el === DOM.endTimePill) DOM.pillEndWrap.classList.add("is-active");
        else STATE.kpState.el.classList.add("kp-focused");

        if (DOM.settingsModal.classList.contains("active")) DOM.settingsModal.classList.add("keypad-open-shift");
        if (DOM.dayEditorModal.classList.contains("active")) DOM.dayEditorModal.classList.add("keypad-open-shift");

        DOM.keypadSheet.classList.add("active");
        setTimeout(() => {
            if (STATE.kpState && STATE.kpState.el && STATE.kpState.el.scrollIntoView) {
                STATE.kpState.el.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }
        }, 40);
    }

    function closeCustomKeypad() {
        if (STATE.kpState) {
            const closingState = STATE.kpState;
            STATE.kpState = null;
            clearAllKeypadHighlights();
            DOM.keypadSheet.classList.remove("active");
            if (closingState.onCommit) closingState.onCommit(closingState.el, true);
        } else {
            clearAllKeypadHighlights();
            DOM.keypadSheet.classList.remove("active");
        }
    }

    function bindNumberKeypadInput(el, opts) {
        if (!el) return;
        el.dataset.kpBound = "1";
        el._kpOpts = opts;
        el.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (el.disabled) return;
            openGlobalKeypad({ el, ...opts });
        });
    }

    function handleKeypadPress(action) {
        if (!STATE.kpState) return;
        const st = STATE.kpState;
        const el = st.el;

        if (st.mode === "hhmm") {
            if (/^[0-9]$/.test(action)) {
                if (st.fresh || st.buffer.length >= 4) {
                    st.buffer = action;
                    st.fresh = false;
                } else {
                    st.buffer += action;
                }
                el.value = formatRawDigitsToHhMm(st.buffer);
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "del") {
                st.fresh = false;
                st.buffer = st.buffer.slice(0, -1);
                el.value = st.buffer ? formatRawDigitsToHhMm(st.buffer) : "";
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "-" || action === "+") {
                const delta = action === "-" ? -15 : 15;
                const parsed = parseHhMmString(el.value) || { h: "08", m: "00" };
                const total = Math.min(23 * 60 + 59, Math.max(0, (parseInt(parsed.h, 10) * 60) + parseInt(parsed.m, 10) + delta));
                const nh = format2(Math.floor(total / 60));
                const nm = format2(total % 60);
                st.buffer = `${nh}${nm}`;
                st.fresh = false;
                el.value = `${nh}:${nm}`;
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "," || action === ".") {
                const p = parseHhMmString(el.value) || { h: "08", m: "00" };
                st.buffer = `${p.h}00`;
                st.fresh = false;
                el.value = `${p.h}:00`;
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "enter") {
                const nextTarget = st.nextEl;
                closeCustomKeypad();
                if (nextTarget && !nextTarget.disabled) nextTarget.click();
            }
            return;
        }

        if (st.mode === "twoDigit") {
            if (/^[0-9]$/.test(action)) {
                if (st.fresh || st.buffer.length >= 2) {
                    st.buffer = action;
                    st.fresh = false;
                } else {
                    st.buffer += action;
                }
                let num = parseInt(st.buffer, 10);
                if (!isNaN(num)) {
                    if (st.max !== null && num > st.max) num = st.max;
                    if (st.min !== null && num < st.min) num = st.min;
                    el.value = st.buffer.length === 2 ? format2(num) : String(num);
                }
                if (st.onCommit) st.onCommit(el, false);
                if (st.buffer.length === 2 && st.nextEl) {
                    const nextTarget = st.nextEl;
                    closeCustomKeypad();
                    nextTarget.click();
                }
            } else if (action === "del") {
                st.fresh = false;
                st.buffer = st.buffer.slice(0, -1);
                el.value = st.buffer;
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "-" || action === "+") {
                const step = st.step || 1;
                let cur = parseInt(el.value, 10);
                if (isNaN(cur)) cur = 0;
                cur += (action === "-" ? -step : step);
                if (st.min !== null && cur < st.min) cur = st.min;
                if (st.max !== null && cur > st.max) cur = st.max;
                st.buffer = format2(cur);
                st.fresh = false;
                el.value = st.buffer;
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "," || action === ".") {
                st.buffer = "00";
                st.fresh = false;
                el.value = "00";
                if (st.onCommit) st.onCommit(el, false);
            } else if (action === "enter") {
                const nextTarget = st.nextEl;
                closeCustomKeypad();
                if (nextTarget) nextTarget.click();
            }
            return;
        }

        // Standard Zahlen / Dezimal (Menü)
        if (/^[0-9]$/.test(action)) {
            if (st.fresh) {
                st.buffer = action;
                st.fresh = false;
            } else {
                st.buffer = (st.buffer === "0") ? action : st.buffer + action;
            }
            el.value = st.buffer;
            if (st.onCommit) st.onCommit(el, false);
        } else if (action === "," || action === ".") {
            if (st.fresh) {
                st.buffer = "0" + action;
                st.fresh = false;
            } else if (!st.buffer.includes(",") && !st.buffer.includes(".")) {
                st.buffer = (st.buffer === "" || st.buffer === "-") ? st.buffer + "0" + action : st.buffer + action;
            }
            el.value = st.buffer;
            if (st.onCommit) st.onCommit(el, false);
        } else if (action === "del") {
            st.fresh = false;
            st.buffer = st.buffer.slice(0, -1);
            el.value = st.buffer;
            if (st.onCommit) st.onCommit(el, false);
        } else if (action === "-" || action === "+") {
            if (st.allowNegative && (st.fresh || st.buffer === "") && action === "-") {
                st.buffer = "-";
                st.fresh = false;
                el.value = st.buffer;
            } else {
                let num = parseFloat(String(el.value).replace(",", "."));
                if (isNaN(num)) num = 0;
                const delta = action === "-" ? -st.step : st.step;
                num = Math.round((num + delta) * 100) / 100;
                if (!st.allowNegative && num < 0) num = 0;
                if (st.min !== null && num < st.min) num = st.min;
                if (st.max !== null && num > st.max) num = st.max;
                st.buffer = String(num).replace(".", ",");
                st.fresh = false;
                el.value = st.buffer;
            }
            if (st.onCommit) st.onCommit(el, false);
        } else if (action === "enter") {
            const nextTarget = st.nextEl;
            closeCustomKeypad();
            if (nextTarget && !nextTarget.disabled) nextTarget.click();
        }
    }

    /* =========================================================
       8. STEMPEL-AKTIONEN, MITTERNACHTS-GUARD & UNDO
       ========================================================= */
    function pushUndoSnapshot() {
        STATE.undoStack.push({
            sessions: JSON.parse(JSON.stringify(STATE.todaySessions)),
            smokeCount: STATE.todaySmokeCount
        });
        if (STATE.undoStack.length > 20) STATE.undoStack.shift();
        UI.updateUndoButtonState();
    }

    function ensureCurrentDayActive() {
        const realTodayStr = getTodayStr();
        if (STATE.activeDateStr === realTodayStr) return false;

        // Mitternachts-Wechsel erkannt: Vortag sauber abschließen & auf den neuen Tag wechseln
        STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
        STATE.undoStack = [];
        UI.updateUndoButtonState();
        STORAGE.loadTodayState(realTodayStr);
        UI.updateSmokerUI();
        UI.syncInputsFromSessions();
        UI.renderSessionsBox();
        UI.calculateAllTimes();
        if (DOM.viewWeek.classList.contains("active")) {
            UI.buildWeekView();
        } else {
            UI.updateAmpelPill();
        }
        return true;
    }

    function triggerStampComeNow() {
        ensureCurrentDayActive();
        pushUndoSnapshot();
        const now = new Date();
        const tObj = { h: format2(now.getHours()), m: format2(now.getMinutes()), s: format2(now.getSeconds()) };

        if (STATE.todaySessions.length === 0) {
            STATE.todaySessions.push({ start: tObj, end: null });
        } else {
            const last = STATE.todaySessions[STATE.todaySessions.length - 1];
            if (last.end !== null) {
                STATE.todaySessions.push({ start: tObj, end: null });
            } else {
                last.start = tObj;
            }
        }

        if (!STATE.glzBaseDate) {
            STATE.glzBaseDate = STATE.activeDateStr;
            DOM.glzBaseDateInput.value = STATE.glzBaseDate;
            localStorage.setItem("glzBaseDate", STATE.glzBaseDate);
        }

        UI.syncInputsFromSessions();
        UI.renderSessionsBox();
        STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
        UI.calculateAllTimes();
        checkPauseNotifications();
    }

    function triggerStampGoNow() {
        ensureCurrentDayActive();

        // Schutz gegen versehentliches "Gehen" ohne vorheriges "Kommen" (kein 00:00-Phantomtag)
        if (STATE.todaySessions.length === 0) {
            DOM.headerStatusChip.textContent = "Erst Kommen stempeln!";
            DOM.btnNowStart.focus();
            setTimeout(() => UI.syncStampButtonEmphasis(), 2000);
            return;
        }

        const last = STATE.todaySessions[STATE.todaySessions.length - 1];
        if (last.end !== null && last.end.h !== "") {
            // Bereits ausgestempelt: bestehende Endzeit nur aktualisieren, wenn der Nutzer es bestätigt
            if (!confirm(`Du bist bereits um ${last.end.h}:${last.end.m} Uhr ausgestempelt. Endzeit auf jetzt aktualisieren?`)) {
                return;
            }
        }

        pushUndoSnapshot();
        const now = new Date();
        const tObj = { h: format2(now.getHours()), m: format2(now.getMinutes()), s: format2(now.getSeconds()) };
        last.end = tObj;

        UI.syncInputsFromSessions();
        UI.renderSessionsBox();
        STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
        UI.calculateAllTimes();
    }

    function onManualTimeInputChange() {
        ensureCurrentDayActive();
        const pS = parseHhMmString(DOM.startTimePill.value);
        const pE = parseHhMmString(DOM.endTimePill.value);

        if (!pS && !pE) {
            STATE.todaySessions = [];
            UI.renderSessionsBox();
            STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
            return;
        }

        // Wenn nur "Gehen" ohne "Kommen" eingetragen wird, kein 00:00-Phantomstart erzeugen
        if (!pS && pE && STATE.todaySessions.length === 0) {
            return;
        }

        const startObj = pS ? { h: pS.h, m: pS.m, s: "00" } : null;
        const endObj = pE ? { h: pE.h, m: pE.m, s: "00" } : null;

        if (STATE.todaySessions.length === 0) {
            if (startObj) STATE.todaySessions.push({ start: startObj, end: endObj });
        } else {
            if (startObj) {
                const oldS = STATE.todaySessions[0].start;
                STATE.todaySessions[0].start = {
                    ...startObj,
                    s: (oldS && oldS.h === startObj.h && oldS.m === startObj.m) ? (oldS.s || "00") : "00"
                };
            }
            if (endObj) {
                const oldE = STATE.todaySessions[STATE.todaySessions.length - 1].end;
                STATE.todaySessions[STATE.todaySessions.length - 1].end = {
                    ...endObj,
                    s: (oldE && oldE.h === endObj.h && oldE.m === endObj.m) ? (oldE.s || "00") : "00"
                };
            } else {
                STATE.todaySessions[STATE.todaySessions.length - 1].end = null;
            }
        }
        UI.renderSessionsBox();
        STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
    }

    /* =========================================================
       9. VIEW-WECHSEL, DAY-EDITOR, BACKUP & PDF-EXPORT
       ========================================================= */
    function switchToClockView() {
        if (DOM.welcomeOverlay.classList.contains("active")) closeWelcomeScreen();
        closeCustomKeypad();
        DOM.viewWeek.classList.remove("active");
        DOM.viewClock.classList.add("active");
        DOM.viewsStage.scrollTop = 0;
        UI.syncBottomNavActive("clock");
        UI.calculateAllTimes();
    }

    function switchToWeekView() {
        if (DOM.welcomeOverlay.classList.contains("active")) closeWelcomeScreen();
        closeCustomKeypad();
        DOM.viewClock.classList.remove("active");
        DOM.viewWeek.classList.add("active");
        DOM.viewsStage.scrollTop = 0;
        UI.syncBottomNavActive("week");
        STATE.weekOffset = 0;
        UI.buildWeekView();
    }

    function changeWeek(delta) {
        STATE.weekOffset += delta;
        UI.buildWeekView();
    }

    function jumpToCurrentWeek() {
        if (STATE.weekOffset === 0) return;
        STATE.weekOffset = 0;
        UI.buildWeekView();
    }

    function jumpToDateStr(dateStr) {
        if (!dateStr) return;
        const parts = dateStr.split("-").map(Number);
        const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const todayMonday = CALC.getMonday(new Date());
        const targetMonday = CALC.getMonday(targetDate);
        todayMonday.setHours(12, 0, 0, 0);
        targetMonday.setHours(12, 0, 0, 0);
        STATE.weekOffset = Math.round((targetMonday - todayMonday) / (7 * 86400000));
        UI.buildWeekView();
    }

    function openDayEditor(dateStr, titleText, defaultStatus) {
        closeCustomKeypad();
        STATE.editingDateStr = dateStr;
        DOM.dayEditorTitle.textContent = titleText;
        const existing = STORAGE.getDayData(dateStr);
        if (existing) {
            STATE.editingDraft = JSON.parse(JSON.stringify(existing));
            if (STATE.editingDraft.status === "free" && !CALC.hasWeekendBooking(STATE.editingDraft)) {
                STATE.editingDraft.status = "work";
            }
        } else {
            STATE.editingDraft = { status: defaultStatus, startH: "", startM: "", endH: "", endM: "", sessions: [], smokeCount: 0 };
        }

        if (!STATE.editingDraft.sessions || STATE.editingDraft.sessions.length === 0) {
            if (STATE.editingDraft.startH !== "" && STATE.editingDraft.startH !== undefined) {
                STATE.editingDraft.sessions = [{
                    start: { h: format2(parseInt(STATE.editingDraft.startH, 10) || 0), m: format2(parseInt(STATE.editingDraft.startM, 10) || 0), s: "00" },
                    end: (STATE.editingDraft.endH !== "" && STATE.editingDraft.endH !== undefined)
                        ? { h: format2(parseInt(STATE.editingDraft.endH, 10) || 0), m: format2(parseInt(STATE.editingDraft.endM, 10) || 0), s: "00" }
                        : null
                }];
            } else {
                STATE.editingDraft.sessions = [];
            }
        }
        if (typeof STATE.editingDraft.smokeCount !== "number") STATE.editingDraft.smokeCount = 0;

        renderDayEditor();
        DOM.dayEditorModal.classList.add("active");
    }

    function closeDayEditor() {
        closeCustomKeypad();
        DOM.dayEditorModal.classList.remove("active");
        STATE.editingDateStr = null;
        STATE.editingDraft = null;
    }

    function nudgeTimeObj(tObj, deltaMins) {
        let h = parseInt(tObj.h, 10);
        let m = parseInt(tObj.m, 10);
        if (isNaN(h)) h = 7;
        if (isNaN(m)) m = 30;
        const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + deltaMins));
        tObj.h = format2(Math.floor(total / 60));
        tObj.m = format2(total % 60);
        tObj.s = "00";
    }

    function renderDayEditor() {
        if (!STATE.editingDraft) return;
        document.querySelectorAll("#day-status-chips .day-status-chip").forEach((chip) => {
            chip.classList.toggle("selected", chip.getAttribute("data-status") === STATE.editingDraft.status);
        });

        if (STATE.editingDraft.status !== "work") {
            DOM.dayEditorWorkArea.style.display = "none";
            DOM.dayEditorNonWorkNote.style.display = "block";
            return;
        }

        DOM.dayEditorWorkArea.style.display = "block";
        DOM.dayEditorNonWorkNote.style.display = "none";
        DOM.editorSmokeVal.textContent = `${STATE.editingDraft.smokeCount}×`;
        DOM.dayEditorBlocksList.innerHTML = "";

        if (STATE.editingDraft.sessions.length === 0) {
            STATE.editingDraft.sessions.push({ start: { h: "07", m: "30", s: "00" }, end: { h: "16", m: "00", s: "00" } });
        }

        STATE.editingDraft.sessions.forEach((blk, idx) => {
            const card = document.createElement("div");
            card.className = "editor-block-card";
            const sH = blk.start ? blk.start.h : "";
            const sM = blk.start ? blk.start.m : "";
            const eH = blk.end ? blk.end.h : "";
            const eM = blk.end ? blk.end.m : "";

            card.innerHTML = `
                <div class="editor-block-header">
                    <span>Zeitblock #${idx + 1}</span>
                    ${STATE.editingDraft.sessions.length > 1 ? `<button type="button" class="editor-block-del" data-del-idx="${idx}">Entfernen</button>` : ""}
                </div>
                <div class="editor-time-row">
                    <div class="editor-time-col">
                        <span class="lbl">Kommen</span>
                        <div class="editor-hhmm-pair">
                            <input type="text" inputmode="none" readonly class="ed-sh keypad-bound-input" value="${sH}" placeholder="hh">
                            <span>:</span>
                            <input type="text" inputmode="none" readonly class="ed-sm keypad-bound-input" value="${sM}" placeholder="mm">
                        </div>
                        <div class="nudge-row">
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="start" data-delta="-5">-5</button>
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="start" data-delta="-1">-1</button>
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="start" data-delta="1">+1</button>
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="start" data-delta="5">+5</button>
                        </div>
                    </div>
                    <div class="editor-time-col">
                        <span class="lbl">Gehen</span>
                        <div class="editor-hhmm-pair">
                            <input type="text" inputmode="none" readonly class="ed-eh keypad-bound-input" value="${eH}" placeholder="hh">
                            <span>:</span>
                            <input type="text" inputmode="none" readonly class="ed-em keypad-bound-input" value="${eM}" placeholder="mm">
                        </div>
                        <div class="nudge-row">
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="end" data-delta="-5">-5</button>
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="end" data-delta="-1">-1</button>
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="end" data-delta="1">+1</button>
                            <button type="button" class="nudge-btn" data-idx="${idx}" data-side="end" data-delta="5">+5</button>
                        </div>
                    </div>
                </div>
            `;
            DOM.dayEditorBlocksList.appendChild(card);
        });

        DOM.dayEditorBlocksList.querySelectorAll("[data-del-idx]").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                closeCustomKeypad();
                STATE.editingDraft.sessions.splice(parseInt(e.target.getAttribute("data-del-idx"), 10), 1);
                renderDayEditor();
            });
        });

        DOM.dayEditorBlocksList.querySelectorAll(".nudge-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                closeCustomKeypad();
                const i = parseInt(e.target.getAttribute("data-idx"), 10);
                const side = e.target.getAttribute("data-side");
                const delta = parseInt(e.target.getAttribute("data-delta"), 10);
                const blk = STATE.editingDraft.sessions[i];
                if (side === "start") {
                    if (!blk.start) blk.start = { h: "07", m: "30", s: "00" };
                    nudgeTimeObj(blk.start, delta);
                } else {
                    if (!blk.end) blk.end = { h: "16", m: "00", s: "00" };
                    nudgeTimeObj(blk.end, delta);
                }
                renderDayEditor();
            });
        });

        DOM.dayEditorBlocksList.querySelectorAll(".editor-block-card").forEach((card, idx) => {
            const shInp = card.querySelector(".ed-sh");
            const smInp = card.querySelector(".ed-sm");
            const ehInp = card.querySelector(".ed-eh");
            const emInp = card.querySelector(".ed-em");

            const syncEditorBlockFromInputs = (finalize) => {
                if (!STATE.editingDraft || !STATE.editingDraft.sessions[idx]) return;
                if (finalize) {
                    shInp.value = clampTwoDigitStr(shInp.value, 0, 23);
                    smInp.value = clampTwoDigitStr(smInp.value, 0, 59);
                    ehInp.value = clampTwoDigitStr(ehInp.value, 0, 23);
                    emInp.value = clampTwoDigitStr(emInp.value, 0, 59);
                }
                const blk = STATE.editingDraft.sessions[idx];
                if (shInp.value === "" && smInp.value === "") {
                    blk.start = null;
                } else {
                    const oldS = blk.start;
                    const nh = format2(Math.min(23, Math.max(0, parseInt(shInp.value, 10) || 0)));
                    const nm = format2(Math.min(59, Math.max(0, parseInt(smInp.value, 10) || 0)));
                    blk.start = { h: nh, m: nm, s: (oldS && oldS.h === nh && oldS.m === nm) ? (oldS.s || "00") : "00" };
                }
                if (ehInp.value === "" && emInp.value === "") {
                    blk.end = null;
                } else {
                    const oldE = blk.end;
                    const nh = format2(Math.min(23, Math.max(0, parseInt(ehInp.value, 10) || 0)));
                    const nm = format2(Math.min(59, Math.max(0, parseInt(emInp.value, 10) || 0)));
                    blk.end = { h: nh, m: nm, s: (oldE && oldE.h === nh && oldE.m === nm) ? (oldE.s || "00") : "00" };
                }
            };

            bindNumberKeypadInput(shInp, {
                mode: "twoDigit", label: `#${idx + 1} Kommen · Stunde`, min: 0, max: 23, step: 1, nextEl: smInp,
                onCommit: (_, fin) => syncEditorBlockFromInputs(fin)
            });
            bindNumberKeypadInput(smInp, {
                mode: "twoDigit", label: `#${idx + 1} Kommen · Minute`, min: 0, max: 59, step: 5, nextEl: ehInp,
                onCommit: (_, fin) => syncEditorBlockFromInputs(fin)
            });
            bindNumberKeypadInput(ehInp, {
                mode: "twoDigit", label: `#${idx + 1} Gehen · Stunde`, min: 0, max: 23, step: 1, nextEl: emInp,
                onCommit: (_, fin) => syncEditorBlockFromInputs(fin)
            });
            bindNumberKeypadInput(emInp, {
                mode: "twoDigit", label: `#${idx + 1} Gehen · Minute`, min: 0, max: 59, step: 5,
                onCommit: (_, fin) => syncEditorBlockFromInputs(fin)
            });
        });
    }

    function openEditorForAnyDate(dateStr) {
        if (!dateStr) return;
        jumpToDateStr(dateStr);
        const parts = dateStr.split("-").map(Number);
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        const dowIdx = (dt.getDay() + 6) % 7;
        openDayEditor(dateStr, `${DAY_FULL_MON[dowIdx]}, ${format2(dt.getDate())}.${format2(dt.getMonth() + 1)}.${dt.getFullYear()}`, "work");
    }

    /* BACKUP-FUNKTIONEN */
    function updateBackupStatusBadge() {
        if (!DOM.backupStatusPill) return;
        const lastIso = localStorage.getItem("lastBackupDate");
        DOM.backupStatusPill.classList.remove("is-due");

        if (!lastIso) {
            DOM.backupStatusPill.textContent = "Noch kein Backup";
            DOM.backupStatusPill.classList.add("is-due");
            return;
        }
        const lastMs = Date.parse(lastIso);
        if (isNaN(lastMs)) {
            DOM.backupStatusPill.textContent = "Gesichert";
            return;
        }
        const diffDays = Math.floor((Date.now() - lastMs) / 86400000);
        if (diffDays <= 0) DOM.backupStatusPill.textContent = "Heute gesichert";
        else if (diffDays === 1) DOM.backupStatusPill.textContent = "Vor 1 Tag";
        else if (diffDays >= 30) {
            DOM.backupStatusPill.textContent = `Vor ${diffDays} Tagen!`;
            DOM.backupStatusPill.classList.add("is-due");
        } else {
            DOM.backupStatusPill.textContent = `Vor ${diffDays} Tagen`;
        }
    }

    function exportBackupJson() {
        const payload = {
            app: "Stempeluhr",
            version: typeof APP_VERSION !== "undefined" ? APP_VERSION : "2.0.0",
            exportedAt: new Date().toISOString(),
            storage: {}
        };
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) payload.storage[key] = localStorage.getItem(key);
        }
        const todayStr = getTodayStr();
        const safeName = (STATE.userName || "").trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_");
        const fileName = safeName ? `Stempeluhr_Backup_${todayStr}_${safeName}.json` : `Stempeluhr_Backup_${todayStr}.json`;

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);

        localStorage.setItem("lastBackupDate", new Date().toISOString());
        updateBackupStatusBadge();
    }

    /* =========================================================
       10. MENÜ- & EINSTELLUNGS-SYNCHRONISATION
       ========================================================= */
    function syncIconThemePickerUI() {
        document.querySelectorAll("#icon-variant-grid .icon-variant-card").forEach((card) => {
            card.classList.toggle("selected", card.getAttribute("data-icon-theme") === STATE.appIconTheme);
        });
    }

    function syncScribbleAccordionUI() {
        DOM.scribbleAccordionCard.classList.toggle("is-open", STATE.scribbleAccordionOpen);
        DOM.btnToggleScribbleAccordion.setAttribute("aria-expanded", STATE.scribbleAccordionOpen ? "true" : "false");
        DOM.scribbleAccordionMeta.textContent = `${STATE.selectedScribbles.length}/5 aktiv · Größe ${STATE.scribbleSizePct}% · ${STATE.scribbleAccordionOpen ? "Zuklappen" : "Aufklappen"}`;
        DOM.scribbleMiniStrip.innerHTML = "";
        if (STATE.selectedScribbles.length === 0) {
            DOM.scribbleMiniStrip.innerHTML = `<span style="font-size:0.68rem; color:#fff; opacity:0.9;">aus</span>`;
        } else {
            STATE.selectedScribbles.forEach((id) => {
                const found = SCRIBBLE_ICONS.find((ic) => ic.id === id);
                if (found) DOM.scribbleMiniStrip.innerHTML += makeScribbleSvg(found);
            });
        }
    }

    function renderScribblePicker() {
        DOM.scribbleCountTag.textContent = `${STATE.selectedScribbles.length} / 5`;
        syncScribbleAccordionUI();
        DOM.scribbleSvgGrid.innerHTML = "";
        SCRIBBLE_ICONS.forEach((item) => {
            const isSel = STATE.selectedScribbles.includes(item.id);
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "scribble-svg-chip" + (isSel ? " selected" : "");
            btn.title = item.label;
            btn.innerHTML = `${makeScribbleSvg(item)}<span>${item.label}</span>`;
            btn.addEventListener("click", () => {
                const idx = STATE.selectedScribbles.indexOf(item.id);
                if (idx >= 0) STATE.selectedScribbles.splice(idx, 1);
                else {
                    if (STATE.selectedScribbles.length >= 5) STATE.selectedScribbles.shift();
                    STATE.selectedScribbles.push(item.id);
                }
                renderScribblePicker();
            });
            DOM.scribbleSvgGrid.appendChild(btn);
        });
    }

    function syncPauseWatcherSettingsUI() {
        DOM.pauseWatcherOptionsWrap.style.opacity = STATE.pauseWatcherEnabled ? "1" : "0.45";
        DOM.pauseWatcherOptionsWrap.style.pointerEvents = STATE.pauseWatcherEnabled ? "auto" : "none";
        DOM.pauseWatcherModePills.querySelectorAll(".widget-mode-pill").forEach((pill) => {
            const isSel = pill.getAttribute("data-pw-mode") === STATE.pauseWatcherMode;
            pill.classList.toggle("selected", isSel);
            pill.setAttribute("aria-checked", isSel ? "true" : "false");
        });
    }

    function syncStyleControlsUI() {
        DOM.asymSliderWrap.style.display = DOM.styleModeSelect.value === "asymmetric" ? "block" : "none";
    }

    function updatePauseNotifyUI() {
        DOM.pauseNotifyMinsWrap.style.opacity = DOM.pauseNotifyCheck.checked ? "1" : "0.45";
        DOM.pauseNotifyLeadInput.disabled = !DOM.pauseNotifyCheck.checked;
    }

    function updateSettingsNavPreviews() {
        if (DOM.navWorkSummary) {
            const smokeTxt = STATE.isSmoker ? `Raucher ${STATE.smokeMinutesPerBreak}m` : "Raucher aus";
            const pushTxt = STATE.pauseNotifyEnabled ? ` · Push ${STATE.pauseNotifyLeadMins}m` : "";
            DOM.navWorkSummary.textContent = `${format2(STATE.sollHours)}:${format2(STATE.sollMinutes)}/Tag · ${STATE.weeklyHours}h/Wo · ${smokeTxt}${pushTxt}`;
        }
        if (DOM.navWidgetsSummary) {
            if (!STATE.pauseWatcherEnabled) {
                DOM.navWidgetsSummary.textContent = "Pausenwächter aus";
            } else {
                const modeLabels = { go: "Nur bei Gehen", come: "Nur bei Kommen", both: "Beides" };
                DOM.navWidgetsSummary.textContent = `Pausenwächter · ${modeLabels[STATE.pauseWatcherMode] || "Beides"}`;
            }
        }
        if (DOM.navDesignSummary) {
            const styleTxt = STATE.appStyleMode === "asymmetric" ? `Asymmetrisch (${STATE.appAsymIntensity}%)` : "Klassisch";
            const iconTxt = STATE.appIconTheme === "rose" ? "Icon Rosé" : "Icon Blau";
            DOM.navDesignSummary.textContent = `${styleTxt} · ${STATE.selectedScribbles.length} Scribbles · ${iconTxt}`;
        }
    }

    function persistAllSettings() {
        STATE.userName = DOM.userNameInput.value.trim();
        STATE.sollHours = Math.min(24, Math.max(0, parseInt(DOM.sollHoursInput.value, 10) || 0));
        STATE.sollMinutes = Math.min(59, Math.max(0, parseInt(DOM.sollMinutesInput.value, 10) || 0));
        DOM.sollHoursInput.value = STATE.sollHours;
        DOM.sollMinutesInput.value = STATE.sollMinutes;

        const parsedWeekly = parseFloat(String(DOM.weeklyHoursInput.value).replace(",", "."));
        STATE.weeklyHours = (!isNaN(parsedWeekly) && parsedWeekly > 0 && parsedWeekly <= 48) ? parsedWeekly : 40;
        DOM.weeklyHoursInput.value = String(STATE.weeklyHours).replace(".", ",");

        const parsedGlzBase = parseFloat(String(DOM.glzBaseInput.value).replace(",", "."));
        STATE.glzBaseHours = !isNaN(parsedGlzBase) ? parsedGlzBase : 0;
        DOM.glzBaseInput.value = String(STATE.glzBaseHours).replace(".", ",");

        STATE.glzBaseDate = DOM.glzBaseDateInput.value || "";

        STATE.pauseNotifyEnabled = DOM.pauseNotifyCheck.checked && ("Notification" in window) && Notification.permission === "granted";
        STATE.pauseNotifyLeadMins = Math.min(60, Math.max(1, parseInt(DOM.pauseNotifyLeadInput.value, 10) || 10));
        DOM.pauseNotifyLeadInput.value = STATE.pauseNotifyLeadMins;

        STATE.pauseWatcherEnabled = DOM.pauseWatcherEnabledCheck.checked;
        STATE.appStyleMode = DOM.styleModeSelect.value;
        STATE.appAsymIntensity = UI.applyAsymIntensity(DOM.asymIntensitySlider.value);
        document.documentElement.setAttribute("data-style", STATE.appStyleMode);

        STATE.isSmoker = DOM.isSmokerCheck.checked;
        STATE.smokeMinutesPerBreak = Math.min(60, Math.max(1, parseInt(DOM.smokeMinutesInput.value, 10) || 5));
        DOM.smokeMinutesInput.value = STATE.smokeMinutesPerBreak;

        STORAGE.persistSettingsFromState();

        if (window.applyAppIconTheme) window.applyAppIconTheme(STATE.appIconTheme);
        UI.applyThemeColors(STATE.appHue, STATE.appLightness);
        if (STATE.isSmoker) STORAGE.saveTodaySmokeOnly(STATE.activeDateStr);
        UI.updateSmokerUI();
        syncScribbleAccordionUI();
        updateSettingsNavPreviews();
        UI.calculateAllTimes();
        checkPauseNotifications();
        if (DOM.viewWeek.classList.contains("active")) UI.buildWeekView();
        else UI.updateAmpelPill();
    }

    function showSettingsSubpage(pageName) {
        closeCustomKeypad();
        DOM.settingsPageMain.style.display = pageName === "main" ? "block" : "none";
        DOM.settingsPageWork.style.display = pageName === "work" ? "block" : "none";
        DOM.settingsPageWidgets.style.display = pageName === "widgets" ? "block" : "none";
        DOM.settingsPageDesign.style.display = pageName === "design" ? "block" : "none";

        if (pageName === "design") {
            STATE.scribbleAccordionOpen = false;
            renderScribblePicker();
            syncIconThemePickerUI();
            UI.drawColorWheel();
        } else if (pageName === "widgets") {
            syncPauseWatcherSettingsUI();
        } else if (pageName === "main") {
            updateSettingsNavPreviews();
            updateBackupStatusBadge();
        }
    }

    function openSettingsMenu() {
        if (DOM.welcomeOverlay.classList.contains("active")) closeWelcomeScreen();
        closeCustomKeypad();
        DOM.userNameInput.value = STATE.userName;
        DOM.weeklyHoursInput.value = String(STATE.weeklyHours).replace(".", ",");
        DOM.glzBaseInput.value = String(STATE.glzBaseHours).replace(".", ",");
        DOM.glzBaseDateInput.value = STATE.glzBaseDate;
        DOM.pauseNotifyCheck.checked = STATE.pauseNotifyEnabled;
        DOM.pauseNotifyLeadInput.value = STATE.pauseNotifyLeadMins;
        DOM.pauseWatcherEnabledCheck.checked = STATE.pauseWatcherEnabled;
        syncPauseWatcherSettingsUI();
        updatePauseNotifyUI();
        syncStyleControlsUI();
        syncIconThemePickerUI();
        updateBackupStatusBadge();
        showSettingsSubpage("main");
        UI.syncBottomNavActive("menu");
        DOM.settingsModal.classList.add("active");
    }

    function closeSettings() {
        closeCustomKeypad();
        persistAllSettings();
        DOM.settingsModal.classList.remove("active");
        UI.syncBottomNavActive(DOM.viewWeek.classList.contains("active") ? "week" : "clock");
    }

    async function forceAppReload() {
        try {
            if ("serviceWorker" in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (const reg of regs) await reg.update();
            }
            if ("caches" in window) {
                const names = await caches.keys();
                await Promise.all(names.map((n) => caches.delete(n)));
            }
        } catch (err) {}
        window.location.replace(`${window.location.href.split("?")[0]}?v=${Date.now()}`);
    }

    /* =========================================================
       11. EVENTS — INTERAKTIONEN, WISCHGESTEN & LIVE-TICK
       ========================================================= */
    if (DOM.versionLabel) {
        DOM.versionLabel.textContent = `Version ${typeof APP_VERSION !== "undefined" ? APP_VERSION : "2.0.0"}`;
    }

    // 3-Sekunden-Notfall-Update auf der Uhrzeit
    if (DOM.liveClockBox) {
        let longPressTimer = null;
        const startHold = () => {
            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                if (confirm("Notfall-Update jetzt ausführen und Cache leeren?")) {
                    forceAppReload();
                }
            }, 3000);
        };
        const cancelHold = () => clearTimeout(longPressTimer);
        DOM.liveClockBox.addEventListener("pointerdown", startHold);
        DOM.liveClockBox.addEventListener("pointerup", cancelHold);
        DOM.liveClockBox.addEventListener("pointerleave", cancelHold);
        DOM.liveClockBox.addEventListener("pointercancel", cancelHold);
    }

    // Untere Daumen-Navigation
    DOM.btnNavToday.addEventListener("click", switchToClockView);
    DOM.btnToggleView.addEventListener("click", () => {
        if (DOM.viewClock.classList.contains("active")) switchToWeekView();
        else switchToClockView();
    });
    DOM.btnSettings.addEventListener("click", openSettingsMenu);

    // Stempel- & Undo-Buttons
    DOM.btnNowStart.addEventListener("click", triggerStampComeNow);
    DOM.btnNowEnd.addEventListener("click", triggerStampGoNow);
    DOM.btnUndo.addEventListener("click", () => {
        if (STATE.undoStack.length === 0) return;
        const prev = STATE.undoStack.pop();
        STATE.todaySessions = prev.sessions || [];
        STATE.todaySmokeCount = typeof prev.smokeCount === "number" ? prev.smokeCount : 0;
        UI.updateUndoButtonState();
        UI.updateSmokerUI();
        UI.syncInputsFromSessions();
        UI.renderSessionsBox();
        STORAGE.saveTodaySessionsAndDay(STATE.activeDateStr);
        UI.calculateAllTimes();
    });

    // Startscreen-Buttons
    DOM.btnWelcomeAction.addEventListener("click", () => {
        if (STATE.welcomeActionMode === "go") triggerStampGoNow();
        else triggerStampComeNow();
        closeWelcomeScreen();
    });
    DOM.btnWelcomeMenu.addEventListener("click", closeWelcomeScreen);

    // Raucherpausen
    document.getElementById("btn-add-smoke").addEventListener("click", () => {
        ensureCurrentDayActive();
        pushUndoSnapshot();
        STATE.todaySmokeCount++;
        UI.updateSmokerUI();
        STORAGE.saveTodaySmokeOnly(STATE.activeDateStr);
        UI.calculateAllTimes();
    });
    document.getElementById("btn-sub-smoke").addEventListener("click", () => {
        if (STATE.todaySmokeCount > 0) {
            ensureCurrentDayActive();
            pushUndoSnapshot();
            STATE.todaySmokeCount--;
            UI.updateSmokerUI();
            STORAGE.saveTodaySmokeOnly(STATE.activeDateStr);
            UI.calculateAllTimes();
        }
    });

    // K/G Pillen & Zahlentastatur
    DOM.startTimePill.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        pushUndoSnapshot();
        openGlobalKeypad({
            el: DOM.startTimePill,
            mode: "hhmm",
            label: "Kommen (hh:mm)",
            nextEl: DOM.endTimePill,
            onCommit: () => {
                onManualTimeInputChange();
                UI.calculateAllTimes();
            }
        });
    });

    DOM.endTimePill.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        pushUndoSnapshot();
        openGlobalKeypad({
            el: DOM.endTimePill,
            mode: "hhmm",
            label: "Gehen (hh:mm)",
            onCommit: () => {
                onManualTimeInputChange();
                UI.calculateAllTimes();
            }
        });
    });

    bindNumberKeypadInput(DOM.sollHoursInput, {
        mode: "number", label: "Soll-Stunden (0–24)", min: 0, max: 24, step: 1, nextEl: DOM.sollMinutesInput
    });
    bindNumberKeypadInput(DOM.sollMinutesInput, {
        mode: "number", label: "Soll-Minuten (0–59)", min: 0, max: 59, step: 5
    });
    bindNumberKeypadInput(DOM.pauseNotifyLeadInput, {
        mode: "number", label: "Vorwarnung (Minuten)", min: 1, max: 60, step: 5
    });
    bindNumberKeypadInput(DOM.smokeMinutesInput, {
        mode: "number", label: "Minuten pro Raucherpause", min: 1, max: 60, step: 1
    });
    bindNumberKeypadInput(DOM.glzBaseInput, {
        mode: "number", label: "GLZ-Startsaldo (h)", min: -200, max: 300, step: 0.5, allowDecimal: true, allowNegative: true
    });
    bindNumberKeypadInput(DOM.weeklyHoursInput, {
        mode: "number", label: "Wochenstunden (1–48)", min: 1, max: 48, step: 0.5, allowDecimal: true
    });

    document.getElementById("keypad-close-btn").addEventListener("click", closeCustomKeypad);
    DOM.keypadSheet.querySelectorAll(".kp-key").forEach((keyBtn) => {
        keyBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            handleKeypadPress(keyBtn.getAttribute("data-kp"));
        });
    });

    document.addEventListener("click", (e) => {
        if (DOM.keypadSheet.classList.contains("active")
            && !e.target.closest("#custom-keypad-sheet")
            && !e.target.closest(".keypad-bound-input")
            && !e.target.closest("#pill-start")
            && !e.target.closest("#pill-end")) {
            closeCustomKeypad();
        }
    });

    // Wochen-Navigation & KW-Swipebar
    document.getElementById("btn-prev-week").addEventListener("click", (e) => { e.stopPropagation(); changeWeek(-1); });
    document.getElementById("btn-next-week").addEventListener("click", (e) => { e.stopPropagation(); changeWeek(1); });
    document.getElementById("week-kw-badge").addEventListener("click", (e) => { e.stopPropagation(); jumpToCurrentWeek(); });
    DOM.weekDatePicker.addEventListener("change", () => jumpToDateStr(DOM.weekDatePicker.value));

    let kwBarStartX = 0;
    let kwBarDidSwipe = false;
    DOM.kwMergedSwipebar.addEventListener("touchstart", (e) => {
        if (e.touches.length === 1) {
            kwBarStartX = e.touches[0].clientX;
            kwBarDidSwipe = false;
        }
    }, { passive: true });
    DOM.kwMergedSwipebar.addEventListener("touchmove", (e) => {
        if (e.touches.length === 1 && Math.abs(e.touches[0].clientX - kwBarStartX) > 22) {
            kwBarDidSwipe = true;
        }
    }, { passive: true });
    DOM.kwMergedSwipebar.addEventListener("touchend", (e) => {
        if (e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - kwBarStartX;
        if (Math.abs(dx) > 36) {
            e.preventDefault();
            e.stopPropagation();
            changeWeek(dx < 0 ? 1 : -1);
        }
    });
    DOM.kwMergedSwipebar.addEventListener("click", (e) => {
        if (kwBarDidSwipe) {
            e.preventDefault();
            e.stopPropagation();
            kwBarDidSwipe = false;
        }
    }, true);

    // Nachtragen-Modal
    document.getElementById("btn-open-backfill-modal").addEventListener("click", () => {
        const refDate = new Date();
        refDate.setDate(refDate.getDate() + (STATE.weekOffset * 7));
        const monday = CALC.getMonday(refDate);

        const satDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 5);
        STATE.currentWeekSatStr = getDateStrFromObj(satDate);
        document.getElementById("quick-sat-date").textContent = `${format2(satDate.getDate())}.${format2(satDate.getMonth() + 1)}.${satDate.getFullYear()}`;

        const sunDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
        STATE.currentWeekSunStr = getDateStrFromObj(sunDate);
        document.getElementById("quick-sun-date").textContent = `${format2(sunDate.getDate())}.${format2(sunDate.getMonth() + 1)}.${sunDate.getFullYear()}`;

        DOM.backfillDateInput.value = STATE.currentWeekSatStr;
        DOM.backfillModal.classList.add("active");
    });
    document.getElementById("btn-close-backfill-modal").addEventListener("click", () => DOM.backfillModal.classList.remove("active"));
    document.getElementById("btn-quick-sat").addEventListener("click", () => {
        DOM.backfillModal.classList.remove("active");
        openEditorForAnyDate(STATE.currentWeekSatStr);
    });
    document.getElementById("btn-quick-sun").addEventListener("click", () => {
        DOM.backfillModal.classList.remove("active");
        openEditorForAnyDate(STATE.currentWeekSunStr);
    });
    document.getElementById("btn-confirm-backfill").addEventListener("click", () => {
        if (!DOM.backfillDateInput.value) return;
        const chosen = DOM.backfillDateInput.value;
        DOM.backfillModal.classList.remove("active");
        openEditorForAnyDate(chosen);
    });

    // Tages-Editor Events
    document.querySelectorAll("#day-status-chips .day-status-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            if (!STATE.editingDraft) return;
            closeCustomKeypad();
            STATE.editingDraft.status = chip.getAttribute("data-status");
            renderDayEditor();
        });
    });
    document.getElementById("btn-editor-add-block").addEventListener("click", () => {
        if (!STATE.editingDraft) return;
        closeCustomKeypad();
        STATE.editingDraft.sessions.push({ start: { h: "12", m: "30", s: "00" }, end: { h: "16", m: "00", s: "00" } });
        renderDayEditor();
    });
    document.getElementById("btn-editor-smoke-plus").addEventListener("click", () => {
        if (!STATE.editingDraft) return;
        STATE.editingDraft.smokeCount = (STATE.editingDraft.smokeCount || 0) + 1;
        DOM.editorSmokeVal.textContent = `${STATE.editingDraft.smokeCount}×`;
    });
    document.getElementById("btn-editor-smoke-minus").addEventListener("click", () => {
        if (!STATE.editingDraft || (STATE.editingDraft.smokeCount || 0) <= 0) return;
        STATE.editingDraft.smokeCount--;
        DOM.editorSmokeVal.textContent = `${STATE.editingDraft.smokeCount}×`;
    });
    document.getElementById("btn-reset-day-editor").addEventListener("click", () => {
        if (!STATE.editingDateStr) return;
        const targetDate = STATE.editingDateStr;
        STORAGE.removeDayData(targetDate);
        if (targetDate === getTodayStr()) {
            pushUndoSnapshot();
            STATE.todaySessions = [];
            STATE.todaySmokeCount = 0;
            UI.updateSmokerUI();
            UI.syncInputsFromSessions();
            UI.renderSessionsBox();
            localStorage.removeItem("savedTodaySessions");
            UI.calculateAllTimes();
        }
        closeDayEditor();
        UI.buildWeekView();
    });
    document.getElementById("btn-close-day-editor").addEventListener("click", closeDayEditor);
    document.getElementById("btn-save-day-editor").addEventListener("click", () => {
        closeCustomKeypad();
        if (!STATE.editingDateStr || !STATE.editingDraft) return;
        const validSessions = (STATE.editingDraft.sessions || []).filter((b) => b.start && b.start.h !== "");
        STATE.editingDraft.sessions = validSessions;

        if (validSessions.length > 0) {
            STATE.editingDraft.startH = validSessions[0].start.h;
            STATE.editingDraft.startM = validSessions[0].start.m;
            const lastB = validSessions[validSessions.length - 1];
            STATE.editingDraft.endH = (lastB.end && lastB.end.h !== "") ? lastB.end.h : "";
            STATE.editingDraft.endM = (lastB.end && lastB.end.h !== "") ? lastB.end.m : "";
            const { totalPresSecs } = CALC.getSessionMetricsFromList(validSessions, null);
            STATE.editingDraft.customPresSecs = totalPresSecs > 0 ? totalPresSecs : null;
        } else {
            STATE.editingDraft.startH = "";
            STATE.editingDraft.startM = "";
            STATE.editingDraft.endH = "";
            STATE.editingDraft.endM = "";
            STATE.editingDraft.customPresSecs = null;
        }
        STATE.editingDraft.smokeTotalMins = (STATE.editingDraft.smokeCount || 0) * STATE.smokeMinutesPerBreak;

        const parts = STATE.editingDateStr.split("-").map(Number);
        const dow = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
        if ((dow === 0 || dow === 6) && !CALC.hasWeekendBooking(STATE.editingDraft)) {
            STORAGE.removeDayData(STATE.editingDateStr);
        } else {
            STORAGE.saveDayData(STATE.editingDateStr, STATE.editingDraft);
        }

        if (STATE.editingDateStr === getTodayStr()) {
            pushUndoSnapshot();
            STATE.todaySessions = JSON.parse(JSON.stringify(validSessions));
            STATE.todaySmokeCount = STATE.editingDraft.smokeCount || 0;
            UI.updateSmokerUI();
            UI.syncInputsFromSessions();
            UI.renderSessionsBox();
            if (STATE.todaySessions.length > 0) {
                localStorage.setItem("savedTodaySessions", JSON.stringify({ date: STATE.editingDateStr, sessions: STATE.todaySessions }));
            } else {
                localStorage.removeItem("savedTodaySessions");
            }
            UI.calculateAllTimes();
        }
        closeDayEditor();
        UI.buildWeekView();
    });

    // Menü & Untermenüs
    document.getElementById("btn-open-work-subpage").addEventListener("click", () => showSettingsSubpage("work"));
    document.getElementById("btn-open-widgets-subpage").addEventListener("click", () => showSettingsSubpage("widgets"));
    document.getElementById("btn-open-design-subpage").addEventListener("click", () => showSettingsSubpage("design"));
    const leaveSubpageAndSave = () => { closeCustomKeypad(); persistAllSettings(); showSettingsSubpage("main"); };
    document.getElementById("btn-back-from-work").addEventListener("click", leaveSubpageAndSave);
    document.getElementById("btn-done-work").addEventListener("click", leaveSubpageAndSave);
    document.getElementById("btn-back-from-widgets").addEventListener("click", leaveSubpageAndSave);
    document.getElementById("btn-done-widgets").addEventListener("click", leaveSubpageAndSave);
    document.getElementById("btn-back-from-design").addEventListener("click", leaveSubpageAndSave);
    document.getElementById("btn-done-design").addEventListener("click", leaveSubpageAndSave);
    document.getElementById("btn-close-settings").addEventListener("click", closeSettings);
    document.getElementById("btn-save-settings").addEventListener("click", closeSettings);
    document.getElementById("btn-force-update").addEventListener("click", async () => {
        const btn = document.getElementById("btn-force-update");
        btn.textContent = "Suche...";
        btn.disabled = true;
        await forceAppReload();
    });

    // Einstellungen Controls
    DOM.pauseWatcherEnabledCheck.addEventListener("change", () => {
        STATE.pauseWatcherEnabled = DOM.pauseWatcherEnabledCheck.checked;
        syncPauseWatcherSettingsUI();
    });
    DOM.pauseWatcherModePills.querySelectorAll(".widget-mode-pill").forEach((pill) => {
        pill.addEventListener("click", () => {
            STATE.pauseWatcherMode = pill.getAttribute("data-pw-mode") || "both";
            syncPauseWatcherSettingsUI();
        });
    });
    DOM.styleModeSelect.addEventListener("change", () => {
        STATE.appStyleMode = DOM.styleModeSelect.value;
        document.documentElement.setAttribute("data-style", STATE.appStyleMode);
        syncStyleControlsUI();
    });
    DOM.asymIntensitySlider.addEventListener("input", () => {
        STATE.appAsymIntensity = UI.applyAsymIntensity(DOM.asymIntensitySlider.value);
        DOM.asymIntensityVal.textContent = STATE.appAsymIntensity;
    });
    DOM.pauseNotifyCheck.addEventListener("change", async () => {
        if (DOM.pauseNotifyCheck.checked) {
            if (!("Notification" in window)) {
                alert("Dieser Browser unterstützt leider keine System-Benachrichtigungen.");
                DOM.pauseNotifyCheck.checked = false;
                updatePauseNotifyUI();
                return;
            }
            let perm = Notification.permission;
            if (perm === "default") perm = await Notification.requestPermission();
            if (perm !== "granted") {
                alert("Benachrichtigungen wurden im Browser blockiert. Bitte erlaube sie in den Website-Einstellungen.");
                DOM.pauseNotifyCheck.checked = false;
            } else {
                STATE.pauseNotifyEnabled = true;
                STATE.pauseNotifyLeadMins = Math.min(60, Math.max(1, parseInt(DOM.pauseNotifyLeadInput.value, 10) || 10));
                showAppNotification(
                    "Stempeluhr: Vorwarnung aktiv",
                    `Du wirst ${STATE.pauseNotifyLeadMins} Min vor der 30-Min- und 45-Min-Pausengrenze erinnert.`,
                    "pause-test"
                );
            }
        } else {
            STATE.pauseNotifyEnabled = false;
        }
        updatePauseNotifyUI();
    });
    DOM.isSmokerCheck.addEventListener("change", () => {
        DOM.smokerMinsWrap.style.opacity = DOM.isSmokerCheck.checked ? "1" : "0.45";
        DOM.smokeMinutesInput.disabled = !DOM.isSmokerCheck.checked;
    });

    // Scribbles & Icon-Theme
    DOM.btnToggleScribbleAccordion.addEventListener("click", () => {
        STATE.scribbleAccordionOpen = !STATE.scribbleAccordionOpen;
        syncScribbleAccordionUI();
    });
    DOM.scribbleSizeSlider.addEventListener("input", () => {
        STATE.scribbleSizePct = parseInt(DOM.scribbleSizeSlider.value, 10);
        DOM.scribbleSizeVal.textContent = STATE.scribbleSizePct;
        syncScribbleAccordionUI();
    });
    document.querySelectorAll("#icon-variant-grid .icon-variant-card").forEach((card) => {
        card.addEventListener("click", () => {
            STATE.appIconTheme = card.getAttribute("data-icon-theme") === "rose" ? "rose" : "blue";
            localStorage.setItem("appIconTheme", STATE.appIconTheme);
            if (window.applyAppIconTheme) window.applyAppIconTheme(STATE.appIconTheme);
            syncIconThemePickerUI();
            updateSettingsNavPreviews();
        });
    });

    // OKLCH Farbrad
    const wheelRadius = DOM.colorWheelCanvas.width / 2;
    DOM.lightnessSlider.addEventListener("input", () => {
        STATE.appLightness = Math.min(52, Math.max(28, parseInt(DOM.lightnessSlider.value, 10)));
        DOM.lightnessVal.textContent = STATE.appLightness;
        UI.applyThemeColors(STATE.appHue, STATE.appLightness);
        UI.drawColorWheel();
    });

    function handleColorPick(e) {
        if (e.cancelable) e.preventDefault();
        const rect = DOM.colorWheelCanvas.getBoundingClientRect();
        const pt = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
        const x = pt.clientX - rect.left - wheelRadius;
        const y = pt.clientY - rect.top - wheelRadius;
        let angle = Math.atan2(y, x) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        STATE.appHue = Math.round(angle);
        UI.applyThemeColors(STATE.appHue, STATE.appLightness);
        UI.drawColorWheel();
    }
    DOM.colorWheelCanvas.addEventListener("mousedown", (e) => {
        handleColorPick(e);
        DOM.colorWheelCanvas.addEventListener("mousemove", handleColorPick);
    });
    window.addEventListener("mouseup", () => DOM.colorWheelCanvas.removeEventListener("mousemove", handleColorPick));
    DOM.colorWheelCanvas.addEventListener("touchstart", (e) => {
        handleColorPick(e);
        DOM.colorWheelCanvas.addEventListener("touchmove", handleColorPick, { passive: false });
    }, { passive: false });
    window.addEventListener("touchend", () => DOM.colorWheelCanvas.removeEventListener("touchmove", handleColorPick));

    // Backup & Monats-PDF
    document.getElementById("btn-export-backup").addEventListener("click", exportBackupJson);
    document.getElementById("btn-import-backup").addEventListener("click", () => {
        DOM.backupFileInput.value = "";
        DOM.backupFileInput.click();
    });
    DOM.backupFileInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!parsed || parsed.app !== "Stempeluhr" || typeof parsed.storage !== "object" || !parsed.storage) {
                    alert("Ungültige Datei: Dies ist kein gültiges Stempeluhr-Backup.");
                    return;
                }
                const keys = Object.keys(parsed.storage);
                const dayCount = keys.filter((k) => k.startsWith("day_")).length;
                const exportInfo = parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleDateString("de-DE") : "unbekannt";
                if (!confirm(`Backup vom ${exportInfo} (${dayCount} gespeicherte Tage) einspielen?\n\nAktuelle Einträge werden ersetzt.`)) return;

                localStorage.clear();
                keys.forEach((k) => {
                    if (typeof parsed.storage[k] === "string") localStorage.setItem(k, parsed.storage[k]);
                });
                alert("Backup erfolgreich wiederhergestellt! Die App wird neu geladen.");
                window.location.reload();
            } catch (err) {
                alert("Fehler beim Lesen der Backup-Datei.");
            }
        };
        reader.readAsText(file);
    });

    document.getElementById("btn-open-pdf-modal").addEventListener("click", () => {
        const refDate = new Date();
        refDate.setDate(refDate.getDate() + (STATE.weekOffset * 7));
        DOM.pdfMonthSelect.value = `${refDate.getFullYear()}-${format2(refDate.getMonth() + 1)}`;
        DOM.pdfUserNamePreview.value = STATE.userName;
        DOM.pdfExportModal.classList.add("active");
    });
    document.getElementById("btn-close-pdf-modal").addEventListener("click", () => DOM.pdfExportModal.classList.remove("active"));
    document.getElementById("btn-download-month-pdf").addEventListener("click", () => {
        if (!DOM.pdfMonthSelect.value) return;
        const enteredName = DOM.pdfUserNamePreview.value.trim();
        if (enteredName !== STATE.userName) {
            STATE.userName = enteredName;
            DOM.userNameInput.value = STATE.userName;
            localStorage.setItem("userName", STATE.userName);
        }
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert("PDF-Bibliothek konnte offline nicht geladen werden. Bitte einmal mit Internet öffnen.");
            return;
        }

        const [yearNum, monthNum] = DOM.pdfMonthSelect.value.split("-").map(Number);
        const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        const dayShortNames = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const sollSecsPerDay = (STATE.sollHours * 3600) + (STATE.sollMinutes * 60);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`Arbeitszeitnachweis – ${monthNames[monthNum - 1]} ${yearNum}`, 14, 17);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Mitarbeiter: ${STATE.userName || "__________________________"}`, 14, 24);
        doc.text(`Tagessoll (Mo–Fr): ${format2(STATE.sollHours)}:${format2(STATE.sollMinutes)} h`, 135, 24);
        doc.setDrawColor(120, 120, 120);
        doc.setLineWidth(0.3);
        doc.line(14, 27, 196, 27);

        let y = 33;
        const rowH = 6.2;
        const cols = [
            { label: "Datum", x: 15 }, { label: "Tag", x: 36 }, { label: "Status", x: 48 },
            { label: "Kommen", x: 78 }, { label: "Gehen", x: 98 }, { label: "Pause", x: 118 },
            { label: "Ist (Std)", x: 142 }, { label: "Saldo", x: 168 }
        ];

        doc.setFillColor(235, 240, 245);
        doc.rect(14, y - 4.3, 182, rowH, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.8);
        cols.forEach((c) => doc.text(c.label, c.x, y));
        y += rowH;

        const fmtHM = (s) => `${format2(Math.floor(Math.abs(s) / 3600))}:${format2(Math.floor((Math.abs(s) % 3600) / 60))}`;
        const fmtSignedHM = (s) => `${s < 0 ? "-" : "+"}${fmtHM(s)}`;

        let monthSollSecs = 0;
        let monthCreditedSecs = 0;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);

        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(yearNum, monthNum - 1, d);
            const dow = dt.getDay();
            const isWeekend = (dow === 0 || dow === 6);
            const dateStr = `${yearNum}-${format2(monthNum)}-${format2(d)}`;
            const dateDe = `${format2(d)}.${format2(monthNum)}.${yearNum}`;
            const holidayName = CALC.getHolidayName(dateStr);

            const rawSaved = localStorage.getItem("day_" + dateStr);
            const defaultStatus = holidayName ? "holiday" : (isWeekend ? "free" : "work");
            const saved = STORAGE.getDayData(dateStr) || { status: defaultStatus, startH: "", startM: "", endH: "", endM: "" };
            if (holidayName && !rawSaved) saved.status = "holiday";

            if (isWeekend) {
                doc.setFillColor(246, 246, 246);
                doc.rect(14, y - 4.3, 182, rowH, "F");
            }

            const daySoll = isWeekend ? 0 : sollSecsPerDay;
            monthSollSecs += daySoll;

            let statusText = STATUS_LABELS[saved.status] || "Arbeit";
            if (saved.status === "holiday" && holidayName) {
                statusText = holidayName.length > 15 ? holidayName.slice(0, 14) + "." : holidayName;
            }

            let startTxt = "-";
            let endTxt = "-";
            let pauseTxt = "-";
            let istTxt = "00:00";
            let dayCredited = 0;

            if (saved.status === "work") {
                if (saved.startH !== "" && saved.startH !== undefined) startTxt = `${saved.startH}:${saved.startM || "00"}`;
                if (saved.endH !== "" && saved.endH !== undefined) endTxt = `${saved.endH}:${saved.endM || "00"}`;
                if (saved.sessions && saved.sessions.length > 1) endTxt += ` (${saved.sessions.length}×)`;

                const breakdown = CALC.getDayBreakdown(saved, null);
                if (breakdown.presSecs > 0) {
                    const totalPauseMins = Math.round((breakdown.deductSecs + breakdown.gapSecs) / 60);
                    pauseTxt = `${totalPauseMins} min`;
                    istTxt = fmtHM(breakdown.netSecs);
                    dayCredited = breakdown.netSecs;
                }
            } else if (saved.status === "vacation" || saved.status === "sick" || saved.status === "holiday") {
                dayCredited = daySoll;
                istTxt = fmtHM(dayCredited);
            }

            monthCreditedSecs += dayCredited;
            const daySaldo = dayCredited - daySoll;
            const saldoTxt = (daySoll === 0 && dayCredited === 0) ? "-" : fmtSignedHM(daySaldo);

            doc.text(dateDe, cols[0].x, y);
            doc.text(dayShortNames[dow], cols[1].x, y);
            doc.text(statusText, cols[2].x, y);
            doc.text(startTxt, cols[3].x, y);
            doc.text(endTxt, cols[4].x, y);
            doc.text(pauseTxt, cols[5].x, y);
            doc.text(istTxt, cols[6].x, y);
            doc.text(saldoTxt, cols[7].x, y);

            doc.setDrawColor(225, 225, 225);
            doc.line(14, y + 1.5, 196, y + 1.5);
            y += rowH;
        }

        y += 2;
        const monthSaldoSecs = monthCreditedSecs - monthSollSecs;
        doc.setFillColor(235, 240, 245);
        doc.rect(14, y - 4.5, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text(`Monatssumme:   Soll: ${fmtHM(monthSollSecs)} h   |   Ist: ${fmtHM(monthCreditedSecs)} h (${(monthCreditedSecs / 3600).toFixed(2).replace(".", ",")} dez.)   |   Saldo: ${fmtSignedHM(monthSaldoSecs)} h (${(monthSaldoSecs / 3600).toFixed(2).replace(".", ",")})`, 16, y + 0.5);

        y += 16;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.line(14, y, 85, y);
        doc.text("Datum, Unterschrift Mitarbeiter", 14, y + 4.5);
        doc.line(120, y, 196, y);
        doc.text("Datum, Unterschrift Vorgesetzter", 120, y + 4.5);

        const safeName = (STATE.userName || "Stundenzettel").replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_");
        doc.save(`Stundenzettel_${yearNum}-${format2(monthNum)}_${safeName}.pdf`);

        if (DOM.pdfAlsoBackupCheck && DOM.pdfAlsoBackupCheck.checked) setTimeout(exportBackupJson, 450);
        DOM.pdfExportModal.classList.remove("active");
    });

    /* =========================================================
       WISCHGESTEN (IMMER AKTIV + 24-PX-RAND-SCHUTZZONE)
       ========================================================= */
    const EDGE_GUARD_PX = 24;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchBlocked = false;
    let stageScrollAtStart = 0;

    document.addEventListener("touchstart", (e) => {
        const anyModalOpen = DOM.settingsModal.classList.contains("active")
            || DOM.dayEditorModal.classList.contains("active")
            || DOM.pdfExportModal.classList.contains("active")
            || DOM.backfillModal.classList.contains("active");

        if (anyModalOpen || e.touches.length !== 1) {
            touchBlocked = true;
            return;
        }

        const startX = e.touches[0].clientX;
        const startY = e.touches[0].clientY;

        // 24-px-Rand-Schutzzone gegen Android/iOS System-Zurück-Geste
        if (startX <= EDGE_GUARD_PX || startX >= (window.innerWidth - EDGE_GUARD_PX)) {
            touchBlocked = true;
            return;
        }

        if (e.target.closest("canvas, input, select, textarea, #custom-keypad-sheet, #kw-merged-swipebar")) {
            touchBlocked = true;
            return;
        }

        touchBlocked = false;
        touchStartX = startX;
        touchStartY = startY;
        stageScrollAtStart = DOM.viewsStage.scrollTop;
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
        if (touchBlocked || e.changedTouches.length !== 1) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const threshold = 55;

        if (absX > threshold && absX > absY * 1.3) {
            if (dx < 0) {
                switchToWeekView();
            } else {
                if (DOM.viewWeek.classList.contains("active")) {
                    switchToClockView();
                } else if (DOM.welcomeOverlay.classList.contains("active")) {
                    closeWelcomeScreen();
                }
            }
            return;
        }

        if (absY > threshold && absY > absX * 1.3) {
            if (DOM.welcomeOverlay.classList.contains("active")) {
                if (dy < 0) openWelcomeScreen(STATE.welcomeActionMode === "come" ? "go" : "come");
                else openWelcomeScreen(STATE.welcomeActionMode === "go" ? "come" : "go");
            } else if (DOM.viewClock.classList.contains("active")) {
                openWelcomeScreen(dy < 0 ? "come" : "go");
            } else if (DOM.viewWeek.classList.contains("active")) {
                const maxScroll = Math.max(0, DOM.viewsStage.scrollHeight - DOM.viewsStage.clientHeight);
                const scrolledDuringSwipe = Math.abs(DOM.viewsStage.scrollTop - stageScrollAtStart) > 12;
                const atTopPullingDown = dy > 0 && stageScrollAtStart <= 2 && DOM.viewsStage.scrollTop <= 2;
                const atBottomPullingUp = dy < 0 && (maxScroll - stageScrollAtStart) <= 8 && (maxScroll - DOM.viewsStage.scrollTop) <= 8;

                if (!scrolledDuringSwipe && (atTopPullingDown || atBottomPullingUp || maxScroll <= 4)) {
                    openWelcomeScreen(dy < 0 ? "come" : "go");
                }
            }
        }
    }, { passive: true });

    /* =========================================================
       12. INITIALISIERUNG & LIVE-TICK
       ========================================================= */
    STORAGE.loadSettingsIntoState();
    STORAGE.loadTodayState(getTodayStr());

    // Formularfelder initial befüllen
    DOM.userNameInput.value = STATE.userName;
    DOM.sollHoursInput.value = STATE.sollHours;
    DOM.sollMinutesInput.value = STATE.sollMinutes;
    DOM.weeklyHoursInput.value = String(STATE.weeklyHours).replace(".", ",");
    DOM.glzBaseInput.value = String(STATE.glzBaseHours).replace(".", ",");
    DOM.glzBaseDateInput.value = STATE.glzBaseDate;
    DOM.pauseNotifyCheck.checked = STATE.pauseNotifyEnabled;
    DOM.pauseNotifyLeadInput.value = STATE.pauseNotifyLeadMins;
    DOM.pauseWatcherEnabledCheck.checked = STATE.pauseWatcherEnabled;
    DOM.styleModeSelect.value = STATE.appStyleMode;
    DOM.asymIntensitySlider.value = STATE.appAsymIntensity;
    DOM.asymIntensityVal.textContent = STATE.appAsymIntensity;
    DOM.isSmokerCheck.checked = STATE.isSmoker;
    DOM.smokeMinutesInput.value = STATE.smokeMinutesPerBreak;
    DOM.lightnessSlider.value = STATE.appLightness;
    DOM.lightnessVal.textContent = STATE.appLightness;
    DOM.scribbleSizeSlider.value = STATE.scribbleSizePct;
    DOM.scribbleSizeVal.textContent = STATE.scribbleSizePct;

    document.documentElement.setAttribute("data-style", STATE.appStyleMode);
    UI.applyAsymIntensity(STATE.appAsymIntensity);
    UI.applyThemeColors(STATE.appHue, STATE.appLightness);
    syncIconThemePickerUI();
    syncPauseWatcherSettingsUI();
    UI.updateSmokerUI();
    syncScribbleAccordionUI();
    updateSettingsNavPreviews();
    updateBackupStatusBadge();

    UI.syncInputsFromSessions();
    UI.renderSessionsBox();
    UI.calculateAllTimes();
    UI.updateAmpelPill();

    const todayAtInit = getTodayStr();
    const dismissedToday = localStorage.getItem("welcomeDismissedDate") === todayAtInit;
    const todayRecordAtInit = STORAGE.getDayData(todayAtInit);
    const hasTimesToday = STATE.todaySessions.length > 0
        || (todayRecordAtInit && (
            (todayRecordAtInit.startH !== "" && todayRecordAtInit.startH !== undefined)
            || (todayRecordAtInit.status && todayRecordAtInit.status !== "work" && todayRecordAtInit.status !== "free")
        ));

    if (!dismissedToday && !hasTimesToday) {
        openWelcomeScreen("come");
    }

    function tickLiveEngine() {
        ensureCurrentDayActive();

        const now = new Date();
        const hh = format2(now.getHours());
        const timeStr = `${hh}:${format2(now.getMinutes())}:${format2(now.getSeconds())}`;
        DOM.liveTime.textContent = timeStr;
        if (DOM.welcomeBigClock) DOM.welcomeBigClock.textContent = timeStr;
        if (DOM.bgHourWatermark) DOM.bgHourWatermark.textContent = hh;

        const dayLabel = `${WEEKDAYS_FULL[now.getDay()]}, ${format2(now.getDate())}.${format2(now.getMonth() + 1)}.${now.getFullYear()}`;
        if (DOM.liveDay.textContent !== dayLabel) DOM.liveDay.textContent = dayLabel;
        if (DOM.welcomeOverlay.classList.contains("active")) updateWelcomeGreetingText();

        if (UI.isClockedIn()) {
            checkPauseNotifications();
            UI.updateWelcomePauseWidget();
            if (DOM.viewClock.classList.contains("active")) {
                UI.calculateWorkingTime();
                if (STATE.todaySessions.length > 1) {
                    const { totalPresSecs } = CALC.getSessionMetricsFromList(STATE.todaySessions, CALC.getNowSecsOfDay());
                    DOM.sessionsPresSum.textContent = `Anwesenheit: ${CALC.formatSecsToHhMm(totalPresSecs)} h`;
                }
            }
        } else {
            UI.updateWelcomePauseWidget();
        }

        if (DOM.viewWeek.classList.contains("active") && STATE.weekHasLiveToday) {
            UI.renderWeekSummaryLive();
        }
    }

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            tickLiveEngine();
        }
    });

    window.addEventListener("focus", () => {
        tickLiveEngine();
    });

    /* SUBTILES HAPTIK-FEEDBACK BEI INTERAKTION (6 ms) */
    document.addEventListener("pointerdown", (e) => {
        if (!("vibrate" in navigator)) return;
        const target = e.target.closest("button, .kg-pill, .week-row, .settings-nav-card, .scribble-accordion-btn, .scribble-svg-chip, .day-status-chip, .widget-mode-pill, .icon-variant-card, .kp-key");
        if (target && !target.disabled) {
            try { navigator.vibrate(6); } catch (err) {}
        }
    }, { passive: true });

    tickLiveEngine();
    setInterval(tickLiveEngine, 1000);
});