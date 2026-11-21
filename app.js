document.addEventListener("DOMContentLoaded", () => {
            const format2 = (val) => String(val).padStart(2, '0');
            const getTodayStr = () => {
                const now = new Date();
                return `${now.getFullYear()}-${format2(now.getMonth() + 1)}-${format2(now.getDate())}`;
            };

            document.getElementById("app-version-label").textContent = `Version ${APP_VERSION}`;

            const liveTimeEl = document.getElementById("live-clock-time");
            const liveDayEl = document.getElementById("live-clock-day");
            const bgHourWatermark = document.getElementById("bg-hour-watermark");
            const edgeBgLayer = document.getElementById("edge-bg-layer");
            const metaThemeColor = document.getElementById("meta-theme-color");
            const weekdaysFull = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

            function getCalendarWeek(date) {
                const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                const dayNum = d.getUTCDay() || 7;
                d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            }

            function applyThemeColors(hue, lightness) {
                document.documentElement.style.setProperty('--hue', hue);
                document.documentElement.style.setProperty('--lightness', lightness + '%');
                const bgHex = window.hslToHex(hue + 120, 50, 95);
                if (metaThemeColor) metaThemeColor.setAttribute("content", bgHex);
                document.documentElement.style.backgroundColor = bgHex;
                if (edgeBgLayer) edgeBgLayer.style.backgroundColor = bgHex;
            }

            function applyAsymIntensity(val) {
                const clamped = Math.min(100, Math.max(0, parseInt(val, 10) || 0));
                document.documentElement.style.setProperty('--asym-intensity', (clamped / 100).toFixed(3));
                return clamped;
            }

            async function showAppNotification(title, body, tag) {
                if (!("Notification" in window) || Notification.permission !== "granted") return;
                const options = { body, icon: "./favicon.png", badge: "./favicon.png", tag, renotify: true };
                try {
                    if ("serviceWorker" in navigator) {
                        const reg = await navigator.serviceWorker.ready;
                        if (reg && reg.showNotification) {
                            await reg.showNotification(title, options);
                            return;
                        }
                    }
                } catch (e) {}
                try { new Notification(title, options); } catch (e) {}
            }

            const holidaysNds = {
                "2026-01-01": "Neujahr", "2026-04-03": "Karfreitag", "2026-04-06": "Ostermontag",
                "2026-05-01": "Tag der Arbeit", "2026-05-14": "Christi Himmelfahrt", "2026-05-25": "Pfingstmontag",
                "2026-10-03": "Tag d. Dt. Einheit", "2026-10-31": "Reformationstag", "2026-12-25": "1. Weihnachtstag", "2026-12-26": "2. Weihnachtstag",
                "2027-01-01": "Neujahr", "2027-03-26": "Karfreitag", "2027-03-29": "Ostermontag",
                "2027-05-01": "Tag der Arbeit", "2027-05-06": "Christi Himmelfahrt", "2027-05-17": "Pfingstmontag",
                "2027-10-03": "Tag d. Dt. Einheit", "2027-10-31": "Reformationstag", "2027-12-25": "1. Weihnachtstag", "2027-12-26": "2. Weihnachtstag",
                "2028-01-01": "Neujahr", "2028-04-14": "Karfreitag", "2028-04-17": "Ostermontag",
                "2028-05-01": "Tag der Arbeit", "2028-05-25": "Christi Himmelfahrt", "2028-06-05": "Pfingstmontag",
                "2028-10-03": "Tag d. Dt. Einheit", "2028-10-31": "Reformationstag", "2028-12-25": "1. Weihnachtstag", "2028-12-26": "2. Weihnachtstag"
            };
            const getHolidayName = (dateStr) => holidaysNds[dateStr] || null;

            function getDayData(dateStr) {
                try { return JSON.parse(localStorage.getItem("day_" + dateStr)) || null; }
                catch (e) { return null; }
            }
            const saveDayData = (dateStr, data) => localStorage.setItem("day_" + dateStr, JSON.stringify(data));

            function hasWeekendBooking(saved) {
                if (!saved) return false;
                const hasTimes = (saved.startH !== '' && saved.startH !== undefined)
                    || (saved.endH !== '' && saved.endH !== undefined)
                    || (Array.isArray(saved.sessions) && saved.sessions.length > 0);
                const hasSmoke = typeof saved.smokeCount === 'number' && saved.smokeCount > 0;
                const hasNonFreeStatus = saved.status && saved.status !== 'free' && saved.status !== 'work';
                return hasTimes || hasSmoke || hasNonFreeStatus;
            }

            /* BACKUP-FUNKTIONEN */
            const backupStatusPill = document.getElementById("backup-status-pill");
            const backupFileInput = document.getElementById("backup-file-input");

            function updateBackupStatusBadge() {
                if (!backupStatusPill) return;
                const lastIso = localStorage.getItem("lastBackupDate");
                backupStatusPill.classList.remove("is-due");

                if (!lastIso) {
                    backupStatusPill.textContent = "Noch kein Backup";
                    backupStatusPill.classList.add("is-due");
                    return;
                }
                const lastMs = Date.parse(lastIso);
                if (isNaN(lastMs)) {
                    backupStatusPill.textContent = "Gesichert";
                    return;
                }
                const diffDays = Math.floor((Date.now() - lastMs) / 86400000);
                if (diffDays <= 0) backupStatusPill.textContent = "Heute gesichert";
                else if (diffDays === 1) backupStatusPill.textContent = "Vor 1 Tag";
                else if (diffDays >= 30) {
                    backupStatusPill.textContent = `Vor ${diffDays} Tagen!`;
                    backupStatusPill.classList.add("is-due");
                } else {
                    backupStatusPill.textContent = `Vor ${diffDays} Tagen`;
                }
            }

            function exportBackupJson() {
                const payload = {
                    app: "Stempeluhr",
                    version: APP_VERSION,
                    exportedAt: new Date().toISOString(),
                    storage: {}
                };
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key) payload.storage[key] = localStorage.getItem(key);
                }
                const todayStr = getTodayStr();
                const safeName = (localStorage.getItem("userName") || "").trim().replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_");
                const fileName = safeName ? `Stempeluhr_Backup_${todayStr}_${safeName}.json` : `Stempeluhr_Backup_${todayStr}.json`;

                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1500);

                localStorage.setItem("lastBackupDate", new Date().toISOString());
                updateBackupStatusBadge();
            }

            document.getElementById("btn-export-backup").addEventListener("click", exportBackupJson);
            document.getElementById("btn-import-backup").addEventListener("click", () => {
                backupFileInput.value = "";
                backupFileInput.click();
            });

            backupFileInput.addEventListener("change", (e) => {
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
                        const dayCount = keys.filter(k => k.startsWith("day_")).length;
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

            /* SCRIBBLE SVG-SET */
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
                { id: "planet", label: "Saturn", inner: `<circle cx="18" cy="18" r="7.5"/><path d="M5.5 22.5 C3.5 19.5, 8.5 15.5, 16.8 13.5 C25 11.5, 31.5 12, 30.8 15.2 C30 18.5, 24.5 22, 16.5 24 C10.5 25.5, 7 24.8, 5.5 22.5 Z"/>` }
            ];
            const makeScribbleSvg = (iconObj) => `<svg viewBox="0 0 36 36">${iconObj.inner}</svg>`;

            let userName = localStorage.getItem("userName") || "";
            let appStyleMode = localStorage.getItem("appStyleMode") === "asymmetric" ? "asymmetric" : "classic";
            let appAsymIntensity = parseInt(localStorage.getItem("appAsymIntensity"), 10);
            if (isNaN(appAsymIntensity)) appAsymIntensity = 55;

            let appHue = parseInt(localStorage.getItem("appHue"), 10);
            if (isNaN(appHue)) appHue = 195;

            let appLightness = parseInt(localStorage.getItem("appLightness"), 10);
            if (isNaN(appLightness)) appLightness = 46;
            appLightness = Math.min(52, Math.max(28, appLightness));

            let sollHours = parseInt(localStorage.getItem("sollHours"), 10);
            if (isNaN(sollHours)) sollHours = 8;
            let sollMinutes = parseInt(localStorage.getItem("sollMinutes"), 10);
            if (isNaN(sollMinutes)) sollMinutes = 0;

            let weeklyHours = parseFloat(localStorage.getItem("weeklyHours"));
            if (isNaN(weeklyHours) || weeklyHours <= 0) weeklyHours = 40;
            let glzBaseHours = parseFloat(localStorage.getItem("glzBaseHours"));
            if (isNaN(glzBaseHours)) glzBaseHours = 0;
            let glzBaseDate = localStorage.getItem("glzBaseDate") || "";

            let pauseNotifyEnabled = localStorage.getItem("pauseNotifyEnabled") === "true";
            let pauseNotifyLeadMins = parseInt(localStorage.getItem("pauseNotifyLeadMins"), 10);
            if (isNaN(pauseNotifyLeadMins) || pauseNotifyLeadMins < 1) pauseNotifyLeadMins = 10;

            let isSmoker = localStorage.getItem("isSmoker") === "true";
            let smokeMinutesPerBreak = parseInt(localStorage.getItem("smokeMinutesPerBreak"), 10);
            if (isNaN(smokeMinutesPerBreak) || smokeMinutesPerBreak < 1) smokeMinutesPerBreak = 5;

            let gesturesEnabled = localStorage.getItem("gesturesEnabled") !== "false";

            let selectedScribbles = ["bolt", "loop-arrow"];
            try {
                const rawArr = JSON.parse(localStorage.getItem("selectedScribbles"));
                if (Array.isArray(rawArr)) {
                    selectedScribbles = rawArr.filter(id => SCRIBBLE_ICONS.some(ic => ic.id === id)).slice(0, 5);
                }
            } catch (e) {}

            let scribbleSizePct = parseInt(localStorage.getItem("scribbleSizePct"), 10);
            if (isNaN(scribbleSizePct)) scribbleSizePct = 50;
            scribbleSizePct = Math.min(100, Math.max(15, scribbleSizePct));

            let todaySmokeCount = 0;
            const initialTodayData = getDayData(getTodayStr());
            if (initialTodayData && typeof initialTodayData.smokeCount === "number") {
                todaySmokeCount = initialTodayData.smokeCount;
            }

            document.documentElement.setAttribute("data-style", appStyleMode);
            applyAsymIntensity(appAsymIntensity);
            applyThemeColors(appHue, appLightness);

            /* =========================================================
               WIDGET-SYSTEM (KOMMEN & GEHEN GEMEINSAM)
               ========================================================= */
            const WIDGET_CATALOG = [
                { id: "action", label: "Stempel-Action (Kommen / Gehen)", desc: "Haupt-Button für den aktuellen Modus", defaultSpan: 2, defaultSize: "l" },
                { id: "clock", label: "Live-Uhrzeit", desc: "Große sekundengenaue Digitaluhr", defaultSpan: 1, defaultSize: "m" },
                { id: "menu", label: "Menü-Button", desc: "Direkter Wechsel ins Hauptmenü", defaultSpan: 1, defaultSize: "m" },
                { id: "kg_inputs", label: "K / G Direkt-Eingabe", desc: "Kommen & Gehen Stunden/Minuten direkt tippen", defaultSpan: 2, defaultSize: "m" },
                { id: "pauses", label: "Pausen-Rechner", desc: "Keine Pause, 30 min und 45 min Feierabend", defaultSpan: 2, defaultSize: "m" },
                { id: "day_balance", label: "Tages-Bilanz (Dezimal & +/-)", desc: "Aktuelle Netto-Zeit und Tagessaldo", defaultSpan: 2, defaultSize: "s" },
                { id: "glz_ampel", label: "GLZ-Ampel-Status", desc: "Aktueller Gleitzeitstand & Ampelfarbe", defaultSpan: 2, defaultSize: "s" },
                { id: "week_summary", label: "Wochen-Saldo", desc: "Wochen-Ist und Differenz zum Soll", defaultSpan: 1, defaultSize: "s" },
                { id: "smoke", label: "Raucherpause", desc: "Zähler & +1 Pause direkt stempeln", defaultSpan: 1, defaultSize: "s" },
                { id: "undo", label: "Rückgängig (Undo)", desc: "Letzte Stempel-Aktion widerrufen", defaultSpan: 1, defaultSize: "s" }
            ];

            const DEFAULT_HOME_WIDGETS = [
                { id: "action", span: 2, size: "l" },
                { id: "clock", span: 1, size: "m" },
                { id: "menu", span: 1, size: "m" }
            ];

            let homeWidgets = JSON.parse(JSON.stringify(DEFAULT_HOME_WIDGETS));
            try {
                const rawW = JSON.parse(localStorage.getItem("homeWidgetsV1"));
                if (Array.isArray(rawW) && rawW.length > 0) {
                    const valid = rawW.filter(w => w && WIDGET_CATALOG.some(c => c.id === w.id)).map(w => ({
                        id: w.id,
                        span: w.span === 1 ? 1 : 2,
                        size: ["s", "m", "l"].includes(w.size) ? w.size : "m"
                    }));
                    if (valid.length > 0) homeWidgets = valid;
                }
            } catch (e) {}

            function saveHomeWidgets() {
                localStorage.setItem("homeWidgetsV1", JSON.stringify(homeWidgets));
            }

            const homeWidgetGrid = document.getElementById("home-widget-grid");
            const widgetEditorBar = document.getElementById("widget-editor-bar");
            const btnToggleWidgetEdit = document.getElementById("btn-toggle-widget-edit");
            let isEditingHomeWidgets = false;
            let welcomeActionMode = "come";

            function computeWidgetHarmonyStyle(idx, total, colStart, span, mode) {
                const isGo = mode === "go";
                const baseHue = isGo ? (appHue + 150) : appHue;
                const altHue = isGo ? appHue : (appHue + 150);

                const hueShift = idx === 0 ? baseHue : (idx % 2 === 1 ? altHue : baseHue + ((idx * 18) % 36) - 18);
                const alpha = idx === 0 ? 0.78 : Math.max(0.56, 0.72 - idx * 0.03);
                const bg = `hsla(${((hueShift % 360) + 360) % 360}, 64%, ${appLightness}%, ${alpha.toFixed(2)})`;

                let radius = "20px";
                if (appStyleMode === "asymmetric") {
                    const k = appAsymIntensity / 100;
                    const big = Math.round(18 + k * 24);
                    const small = Math.max(6, Math.round(18 - k * 9));
                    if (span === 2) {
                        const even = (idx + (isGo ? 1 : 0)) % 2 === 0;
                        radius = even ? `${big}px ${small}px ${big}px ${small}px` : `${small}px ${big}px ${small}px ${big}px`;
                    } else {
                        const isLeft = colStart === 0;
                        const flip = isGo ? !isLeft : isLeft;
                        radius = flip ? `${big}px ${small}px ${small}px ${big}px` : `${small}px ${big}px ${big}px ${small}px`;
                    }
                }
                return { bg, radius };
            }

            function renderHomeWidgetGrid() {
                if (!homeWidgetGrid) return;
                homeWidgetGrid.innerHTML = "";

                let colCursor = 0;
                homeWidgets.forEach((wCfg, idx) => {
                    if (wCfg.span === 2 && colCursor === 1) colCursor = 0;
                    const colStart = colCursor;
                    colCursor = (colCursor + wCfg.span) % 2;

                    const { bg, radius } = computeWidgetHarmonyStyle(idx, homeWidgets.length, colStart, wCfg.span, welcomeActionMode);
                    const card = document.createElement("div");
                    card.className = `home-widget span-${wCfg.span} size-${wCfg.size}`;
                    card.dataset.widgetId = wCfg.id;
                    card.style.setProperty("--w-bg", bg);
                    card.style.setProperty("--w-radius", radius);

                    if (isEditingHomeWidgets) {
                        card.classList.add("is-editing-widget");

                        // 1. Android-Style Delete button (top-right red circle)
                        if (homeWidgets.length > 1) {
                            const delBtn = document.createElement("button");
                            delBtn.type = "button";
                            delBtn.className = "w-handle-del";
                            delBtn.title = "Widget entfernen";
                            delBtn.innerHTML = "×";
                            delBtn.addEventListener("click", (e) => {
                                e.stopPropagation();
                                homeWidgets.splice(idx, 1);
                                saveHomeWidgets();
                                renderHomeWidgetGrid();
                            });
                            card.appendChild(delBtn);
                        }

                        // 2. Android-Style Reorder handle (top-left circle)
                        const orderBtn = document.createElement("button");
                        orderBtn.type = "button";
                        orderBtn.className = "w-handle-order";
                        orderBtn.title = "Position wechseln";
                        orderBtn.innerHTML = "⇅";
                        orderBtn.addEventListener("click", (e) => {
                            e.stopPropagation();
                            if (idx < homeWidgets.length - 1) {
                                [homeWidgets[idx], homeWidgets[idx + 1]] = [homeWidgets[idx + 1], homeWidgets[idx]];
                            } else if (idx > 0) {
                                [homeWidgets[idx], homeWidgets[0]] = [homeWidgets[0], homeWidgets[idx]];
                            }
                            saveHomeWidgets();
                            renderHomeWidgetGrid();
                        });
                        card.appendChild(orderBtn);

                        // 3. Android-Style Horizontal Resize Handle (right edge dot ↔)
                        const handleX = document.createElement("div");
                        handleX.className = "w-resize-handle-x";
                        handleX.title = "Breite ändern (Klick oder Ziehen)";
                        const toggleSpan = (e) => {
                            if (e) e.stopPropagation();
                            wCfg.span = (wCfg.span === 2) ? 1 : 2;
                            saveHomeWidgets();
                            renderHomeWidgetGrid();
                        };
                        handleX.addEventListener("click", toggleSpan);
                        let hxStartX = 0;
                        handleX.addEventListener("pointerdown", (e) => {
                            e.stopPropagation();
                            hxStartX = e.clientX;
                            const onMove = (ev) => {
                                const dx = ev.clientX - hxStartX;
                                if (Math.abs(dx) > 30) {
                                    handleX.removeEventListener("pointermove", onMove);
                                    window.removeEventListener("pointerup", onUp);
                                    toggleSpan();
                                }
                            };
                            const onUp = () => {
                                handleX.removeEventListener("pointermove", onMove);
                                window.removeEventListener("pointerup", onUp);
                            };
                            handleX.addEventListener("pointermove", onMove);
                            window.addEventListener("pointerup", onUp);
                        });
                        card.appendChild(handleX);

                        // 4. Android-Style Vertical Resize Handle (bottom edge dot ↕)
                        const handleY = document.createElement("div");
                        handleY.className = "w-resize-handle-y";
                        handleY.title = "Höhe ändern (Klick oder Ziehen)";
                        const toggleSize = (e) => {
                            if (e) e.stopPropagation();
                            const sizes = ["s", "m", "l"];
                            wCfg.size = sizes[(sizes.indexOf(wCfg.size) + 1) % sizes.length];
                            saveHomeWidgets();
                            renderHomeWidgetGrid();
                        };
                        handleY.addEventListener("click", toggleSize);
                        let hyStartY = 0;
                        handleY.addEventListener("pointerdown", (e) => {
                            e.stopPropagation();
                            hyStartY = e.clientY;
                            const onMove = (ev) => {
                                const dy = ev.clientY - hyStartY;
                                if (Math.abs(dy) > 28) {
                                    handleY.removeEventListener("pointermove", onMove);
                                    window.removeEventListener("pointerup", onUp);
                                    toggleSize();
                                }
                            };
                            const onUp = () => {
                                handleY.removeEventListener("pointermove", onMove);
                                window.removeEventListener("pointerup", onUp);
                            };
                            handleY.addEventListener("pointermove", onMove);
                            window.addEventListener("pointerup", onUp);
                        });
                        card.appendChild(handleY);

                        // 5. Size Indicator badge
                        const sizeIndicator = document.createElement("div");
                        sizeIndicator.className = "w-resize-indicator";
                        sizeIndicator.textContent = `${wCfg.span === 2 ? "Voll" : "Halb"} · ${wCfg.size.toUpperCase()}`;
                        card.appendChild(sizeIndicator);
                    }

                    const body = document.createElement("div");
                    body.style.width = "100%";
                    body.style.marginTop = isEditingHomeWidgets ? "18px" : "0";

                    if (wCfg.id === "action") {
                        const isGo = welcomeActionMode === "go";
                        body.innerHTML = `<div class="w-title-lg">${isGo ? "Gehen" : "Kommen"}</div><div class="w-sub">${isGo ? "Jetzt direkt ausstempeln" : "Jetzt direkt einstempeln"}</div>`;
                        if (!isEditingHomeWidgets) {
                            card.classList.add("is-clickable");
                            card.addEventListener("click", () => {
                                if (welcomeActionMode === "go") triggerStampGoNow();
                                else triggerStampComeNow();
                                closeWelcomeScreen();
                            });
                        }
                    } else if (wCfg.id === "clock") {
                        const now = new Date();
                        const tStr = `${format2(now.getHours())}:${format2(now.getMinutes())}:${format2(now.getSeconds())}`;
                        body.innerHTML = `<div class="w-kicker">Uhrzeit</div><div class="w-clock-val" data-w-live="clock">${tStr}</div>`;
                    } else if (wCfg.id === "menu") {
                        body.innerHTML = `<div class="w-title-lg" style="font-size:1.35em;">Menü →</div><div class="w-sub">Zeiten & Übersicht</div>`;
                        if (!isEditingHomeWidgets) {
                            card.classList.add("is-clickable");
                            card.addEventListener("click", closeWelcomeScreen);
                        }
                    } else if (wCfg.id === "kg_inputs") {
                        body.innerHTML = `
                            <div class="w-kicker">Direkt-Eingabe (K / G)</div>
                            <div class="w-kg-grid">
                                <div class="w-kg-pair">
                                    <div class="w-kg-tag">K</div>
                                    <input type="number" inputmode="numeric" min="0" max="23" placeholder="hh" data-w-kg="sh" value="${startHoursInput.value}">
                                    <input type="number" inputmode="numeric" min="0" max="59" placeholder="mm" data-w-kg="sm" value="${startMinutesInput.value}">
                                </div>
                                <div class="w-kg-pair">
                                    <div class="w-kg-tag">G</div>
                                    <input type="number" inputmode="numeric" min="0" max="23" placeholder="hh" data-w-kg="eh" value="${endHoursInput.value}">
                                    <input type="number" inputmode="numeric" min="0" max="59" placeholder="mm" data-w-kg="em" value="${endMinutesInput.value}">
                                </div>
                            </div>
                        `;
                        body.querySelectorAll("input[data-w-kg]").forEach(inp => {
                            inp.addEventListener("click", e => e.stopPropagation());
                            inp.addEventListener("touchstart", e => e.stopPropagation(), { passive: true });
                            inp.addEventListener("focus", () => { inp.select(); manualEditSnapshotTaken = false; });
                            inp.addEventListener("input", () => {
                                if (!manualEditSnapshotTaken) { pushUndoSnapshot(); manualEditSnapshotTaken = true; }
                                if (inp.value.length > 2) inp.value = inp.value.slice(0, 2);
                                const role = inp.getAttribute("data-w-kg");
                                if (role === "sh") startHoursInput.value = inp.value;
                                else if (role === "sm") startMinutesInput.value = inp.value;
                                else if (role === "eh") endHoursInput.value = inp.value;
                                else if (role === "em") endMinutesInput.value = inp.value;
                                onManualTimeInputChange();
                                calculateAllTimes();
                                updateHomeWidgetsLiveData();
                            });
                            inp.addEventListener("blur", () => {
                                clampInput(inp);
                                const role = inp.getAttribute("data-w-kg");
                                if (role === "sh") startHoursInput.value = inp.value;
                                else if (role === "sm") startMinutesInput.value = inp.value;
                                else if (role === "eh") endHoursInput.value = inp.value;
                                else if (role === "em") endMinutesInput.value = inp.value;
                                onManualTimeInputChange();
                                calculateAllTimes();
                                updateHomeWidgetsLiveData();
                            });
                        });
                    } else if (wCfg.id === "pauses") {
                        body.innerHTML = `
                            <div class="w-kicker">Feierabend-Rechner</div>
                            <div class="w-pause-triple">
                                <div class="w-pause-cell"><span>0 Min</span><strong data-w-live="p0">-</strong></div>
                                <div class="w-pause-cell"><span>30 Min</span><strong data-w-live="p30">-</strong></div>
                                <div class="w-pause-cell"><span>45 Min</span><strong data-w-live="p45">-</strong></div>
                            </div>
                        `;
                    } else if (wCfg.id === "day_balance") {
                        body.innerHTML = `
                            <div class="w-kicker">Tages-Bilanz</div>
                            <div class="w-dual-row">
                                <div class="w-mini-pill"><span>Heute</span><strong data-w-live="dayDec">-</strong></div>
                                <div class="w-mini-pill"><span>Saldo</span><strong data-w-live="dayOver">-</strong></div>
                            </div>
                        `;
                    } else if (wCfg.id === "glz_ampel") {
                        body.innerHTML = `
                            <div class="w-kicker">Ampelkonto</div>
                            <div class="w-value-main" style="font-size:0.96em;" data-w-live="glzText">GLZ: +0,00h</div>
                        `;
                    } else if (wCfg.id === "week_summary") {
                        body.innerHTML = `
                            <div class="w-kicker">Woche</div>
                            <div class="w-value-main" data-w-live="weekSaldo">+00:00 h</div>
                            <div class="w-sub" data-w-live="weekWorked">Ist: 00:00 h</div>
                        `;
                    } else if (wCfg.id === "smoke") {
                        body.innerHTML = `
                            <div class="w-kicker">🚬 Raucherpause</div>
                            <div class="w-value-main" data-w-live="smokeVal">${todaySmokeCount}× (-${todaySmokeCount * smokeMinutesPerBreak}m)</div>
                            <div class="w-sub">+1 Pause tippen</div>
                        `;
                        if (!isEditingHomeWidgets) {
                            card.classList.add("is-clickable");
                            card.addEventListener("click", () => {
                                pushUndoSnapshot();
                                todaySmokeCount++;
                                updateSmokerUI();
                                saveTodaySmokeData();
                                calculateAllTimes();
                                updateHomeWidgetsLiveData();
                            });
                        }
                    } else if (wCfg.id === "undo") {
                        body.innerHTML = `
                            <div class="w-kicker">Korrektur</div>
                            <div class="w-value-main">↺ Undo</div>
                            <div class="w-sub" data-w-live="undoSub">${undoStack.length > 0 ? "Letzte Aktion zurück" : "Keine Aktion"}</div>
                        `;
                        if (!isEditingHomeWidgets) {
                            card.classList.add("is-clickable");
                            card.addEventListener("click", () => {
                                if (undoStack.length > 0) {
                                    btnUndo.click();
                                    updateHomeWidgetsLiveData();
                                }
                            });
                        }
                    }

                    card.appendChild(body);
                    homeWidgetGrid.appendChild(card);
                });

                updateHomeWidgetsLiveData();
            }

            function updateHomeWidgetsLiveData() {
                if (!homeWidgetGrid) return;
                const now = new Date();
                const clockStr = `${format2(now.getHours())}:${format2(now.getMinutes())}:${format2(now.getSeconds())}`;
                homeWidgetGrid.querySelectorAll('[data-w-live="clock"]').forEach(el => el.textContent = clockStr);

                const p0 = document.getElementById("output-no-pause").textContent || "-";
                const p30Raw = document.getElementById("output-30min-pause-range").textContent || "-";
                const p30 = p30Raw.includes(" bis ") ? p30Raw.split(" bis ")[0] : p30Raw;
                const p45 = document.getElementById("output-45min-pause").textContent || "-";
                homeWidgetGrid.querySelectorAll('[data-w-live="p0"]').forEach(el => el.textContent = p0);
                homeWidgetGrid.querySelectorAll('[data-w-live="p30"]').forEach(el => el.textContent = p30);
                homeWidgetGrid.querySelectorAll('[data-w-live="p45"]').forEach(el => el.textContent = p45);

                const dayDec = document.getElementById("output-decimal-time").textContent || "-";
                const dayOver = document.getElementById("output-overtime").textContent || "-";
                homeWidgetGrid.querySelectorAll('[data-w-live="dayDec"]').forEach(el => el.textContent = dayDec);
                homeWidgetGrid.querySelectorAll('[data-w-live="dayOver"]').forEach(el => el.textContent = dayOver);

                const glzTxt = document.getElementById("glzPillText").textContent || "GLZ: +0,00h";
                const glzPillEl = document.getElementById("glzPill");
                let dotColor = "#22c55e";
                if (glzPillEl && glzPillEl.classList.contains("ampel-gelb")) dotColor = "#f59e0b";
                else if (glzPillEl && glzPillEl.classList.contains("ampel-rot")) dotColor = "#ef4444";
                homeWidgetGrid.querySelectorAll('[data-w-live="glzText"]').forEach(el => {
                    el.innerHTML = `<span class="w-ampel-dot" style="background:${dotColor};"></span>${glzTxt}`;
                });

                const weekW = document.getElementById("output-week-worked").textContent || "-";
                const weekS = document.getElementById("output-week-total").textContent || "-";
                homeWidgetGrid.querySelectorAll('[data-w-live="weekSaldo"]').forEach(el => el.textContent = weekS);
                homeWidgetGrid.querySelectorAll('[data-w-live="weekWorked"]').forEach(el => el.textContent = `Ist: ${weekW}`);

                homeWidgetGrid.querySelectorAll('[data-w-live="smokeVal"]').forEach(el => {
                    el.textContent = `${todaySmokeCount}× (-${todaySmokeCount * smokeMinutesPerBreak}m)`;
                });
                homeWidgetGrid.querySelectorAll('[data-w-live="undoSub"]').forEach(el => {
                    el.textContent = undoStack.length > 0 ? `${undoStack.length} Schritt(e) zurück` : "Keine Aktion";
                });
            }

            function setWidgetEditMode(active) {
                isEditingHomeWidgets = !!active;
                btnToggleWidgetEdit.classList.toggle("active", isEditingHomeWidgets);
                widgetEditorBar.classList.toggle("active", isEditingHomeWidgets);
                welcomeOverlay.classList.toggle("is-editing", isEditingHomeWidgets);
                renderHomeWidgetGrid();
            }

            btnToggleWidgetEdit.addEventListener("click", (e) => {
                e.stopPropagation();
                setWidgetEditMode(!isEditingHomeWidgets);
            });
            document.getElementById("btn-done-widget-edit").addEventListener("click", () => setWidgetEditMode(false));
            document.getElementById("btn-preview-switch-mode").addEventListener("click", () => {
                openWelcomeScreen(welcomeActionMode === "come" ? "go" : "come", true);
            });
            document.getElementById("btn-reset-widgets").addEventListener("click", () => {
                homeWidgets = JSON.parse(JSON.stringify(DEFAULT_HOME_WIDGETS));
                saveHomeWidgets();
                renderHomeWidgetGrid();
            });

            /* WIDGET-KATALOG MODAL */
            const widgetCatalogModal = document.getElementById("widget-catalog-modal");
            const widgetCatalogList = document.getElementById("widget-catalog-list");

            function renderWidgetCatalogModal() {
                widgetCatalogList.innerHTML = "";
                WIDGET_CATALOG.forEach(item => {
                    const activeIdx = homeWidgets.findIndex(w => w.id === item.id);
                    const isAdded = activeIdx >= 0;
                    const row = document.createElement("div");
                    row.className = "widget-catalog-item";
                    row.innerHTML = `
                        <div class="widget-catalog-info">
                            <strong>${item.label}</strong>
                            <span>${item.desc}</span>
                        </div>
                        <button type="button" class="btn-catalog-toggle ${isAdded ? "is-added" : ""}">${isAdded ? "✓ Aktiv" : "+ Hinzufügen"}</button>
                    `;
                    row.querySelector("button").addEventListener("click", () => {
                        const idx = homeWidgets.findIndex(w => w.id === item.id);
                        if (idx >= 0) {
                            if (homeWidgets.length > 1) homeWidgets.splice(idx, 1);
                        } else {
                            homeWidgets.push({ id: item.id, span: item.defaultSpan, size: item.defaultSize });
                        }
                        saveHomeWidgets();
                        renderWidgetCatalogModal();
                        renderHomeWidgetGrid();
                    });
                    widgetCatalogList.appendChild(row);
                });
            }

            document.getElementById("btn-open-widget-catalog").addEventListener("click", () => {
                renderWidgetCatalogModal();
                widgetCatalogModal.classList.add("active");
            });
            document.getElementById("btn-close-widget-catalog").addEventListener("click", () => widgetCatalogModal.classList.remove("active"));
            document.getElementById("btn-done-widget-catalog").addEventListener("click", () => widgetCatalogModal.classList.remove("active"));

            /* SCRIBBLE PICKER & SETTINGS NAVIGATION */
            const scribbleSvgGrid = document.getElementById("scribble-svg-grid");
            const scribbleCountTag = document.getElementById("scribble-count-tag");
            const scribbleSizeSlider = document.getElementById("scribbleSizeSlider");
            const scribbleSizeVal = document.getElementById("scribbleSizeVal");
            const navWorkSummary = document.getElementById("nav-work-summary");
            const navDesignSummary = document.getElementById("nav-design-summary");

            function updateSettingsNavPreviews() {
                if (navWorkSummary) {
                    const smokeTxt = isSmoker ? `Raucher ${smokeMinutesPerBreak}m` : "Raucher aus";
                    const pushTxt = pauseNotifyEnabled ? ` · Push ${pauseNotifyLeadMins}m` : "";
                    navWorkSummary.textContent = `${format2(sollHours)}:${format2(sollMinutes)}/Tag · ${weeklyHours}h/Wo · ${smokeTxt}${pushTxt}`;
                }
                if (navDesignSummary) {
                    const styleTxt = appStyleMode === "asymmetric" ? `Asymmetrisch (${appAsymIntensity}%)` : "Klassisch";
                    navDesignSummary.textContent = `${styleTxt} · ${homeWidgets.length} Widgets · ${selectedScribbles.length} Scribbles`;
                }
            }

            function renderScribblePicker() {
                scribbleSvgGrid.innerHTML = "";
                scribbleCountTag.textContent = `${selectedScribbles.length} / 5`;
                SCRIBBLE_ICONS.forEach(item => {
                    const isSel = selectedScribbles.includes(item.id);
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "scribble-svg-chip" + (isSel ? " selected" : "");
                    btn.title = item.label;
                    btn.innerHTML = `${makeScribbleSvg(item)}<span>${item.label}</span>`;
                    btn.addEventListener("click", () => {
                        const idx = selectedScribbles.indexOf(item.id);
                        if (idx >= 0) selectedScribbles.splice(idx, 1);
                        else {
                            if (selectedScribbles.length >= 5) selectedScribbles.shift();
                            selectedScribbles.push(item.id);
                        }
                        renderScribblePicker();
                    });
                    scribbleSvgGrid.appendChild(btn);
                });
            }

            scribbleSizeSlider.addEventListener("input", () => {
                scribbleSizePct = parseInt(scribbleSizeSlider.value, 10);
                scribbleSizeVal.textContent = scribbleSizePct;
            });

            /* =========================================================
               VOLLBILD-HOME-SCREEN + SCRIBBLES + 4-RICHTUNGS-GESTEN
               ========================================================= */
            const welcomeOverlay = document.getElementById("welcome-overlay");
            const welcomeScatterField = document.getElementById("welcome-scatter-field");
            const welcomeModePill = document.getElementById("welcome-mode-pill");
            const welcomeGreetingEl = document.getElementById("welcome-greeting");
            const welcomeDateSubEl = document.getElementById("welcome-date-sub");

            let ambientAnimTimer = null;

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
                welcomeScatterField.innerHTML = "";
                if (selectedScribbles.length === 0) return;

                const activeIcons = selectedScribbles
                    .map(id => SCRIBBLE_ICONS.find(ic => ic.id === id))
                    .filter(Boolean);
                if (activeIcons.length === 0) return;

                const modeOffset = welcomeActionMode === "go" ? 7919 : 0;
                const todaySeed = parseInt(getTodayStr().replace(/-/g, ""), 10) + selectedScribbles.join("").length * 131 + modeOffset;
                const rng = createSeededRng(todaySeed);

                const scaleFactor = 0.62 + (scribbleSizePct / 100) * 0.98;
                const basePx = Math.round(42 * scaleFactor);
                const minDistPct = Math.max(7.5, 6.5 + (scribbleSizePct / 100) * 5.5);
                const targetCount = Math.round(34 - (scribbleSizePct / 100) * 12);

                const placed = [];
                let attempts = 0;

                while (placed.length < targetCount && attempts < 650) {
                    attempts++;
                    const x = 5 + rng() * 90;
                    const y = 4 + rng() * 92;

                    const inGreetingZone = (y > 6 && y < 22 && x > 10 && x < 84);
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
                    const sizeJitter = 0.50 + rng() * 1.05;
                    const finalPx = Math.round(basePx * sizeJitter);
                    const alpha = (0.24 + rng() * 0.26).toFixed(2);

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

                    welcomeScatterField.appendChild(node);

                    if (idx % 4 === 0) {
                        setTimeout(() => triggerNodeMicroAnim(node, "anim-pixel-spin"), 160 + idx * 75);
                    }
                });
            }

            function startAmbientPixelAnimations() {
                stopAmbientPixelAnimations();
                ambientAnimTimer = setInterval(() => {
                    if (!welcomeOverlay.classList.contains("active")) return;
                    const nodes = welcomeScatterField.querySelectorAll(".scatter-node");
                    if (nodes.length === 0) return;
                    const rndNode = nodes[Math.floor(Math.random() * nodes.length)];
                    const anims = ["anim-pixel-spin", "anim-pixel-spin", "anim-pixel-pop", "anim-pixel-wiggle"];
                    triggerNodeMicroAnim(rndNode, anims[Math.floor(Math.random() * anims.length)]);
                }, 2200);
            }

            function stopAmbientPixelAnimations() {
                if (ambientAnimTimer) {
                    clearInterval(ambientAnimTimer);
                    ambientAnimTimer = null;
                }
            }

            function updateWelcomeGreetingText() {
                const now = new Date();
                const hr = now.getHours();
                const cleanName = (userName || "").trim();

                if (welcomeActionMode === "go") {
                    const salutation = hr >= 16 ? "Schönen Feierabend" : "Bis später";
                    welcomeGreetingEl.textContent = cleanName ? `${salutation}, ${cleanName}!` : `${salutation}!`;
                    welcomeModePill.textContent = "Modus: Gehen";
                } else {
                    let salutation = "Guten Tag";
                    if (hr < 11) salutation = "Guten Morgen";
                    else if (hr >= 18) salutation = "Guten Abend";
                    welcomeGreetingEl.textContent = cleanName ? `${salutation}, ${cleanName}!` : `${salutation}!`;
                    welcomeModePill.textContent = "Modus: Kommen";
                }

                const dayName = weekdaysFull[now.getDay()];
                welcomeDateSubEl.textContent = `${dayName}, ${format2(now.getDate())}.${format2(now.getMonth() + 1)}.${now.getFullYear()}`;
            }

            function openWelcomeScreen(mode = "come", keepEditState = false) {
                welcomeActionMode = mode === "go" ? "go" : "come";
                if (!keepEditState && isEditingHomeWidgets) {
                    isEditingHomeWidgets = false;
                    btnToggleWidgetEdit.classList.remove("active");
                    widgetEditorBar.classList.remove("active");
                    welcomeOverlay.classList.remove("is-editing");
                }
                welcomeOverlay.style.transform = "";
                welcomeOverlay.style.opacity = "";
                welcomeOverlay.classList.toggle("mode-go", welcomeActionMode === "go");

                if (metaThemeColor) {
                    const barHue = welcomeActionMode === "go" ? (appHue + 150) : appHue;
                    metaThemeColor.setAttribute("content", window.hslToHex(barHue, 44, 22));
                }

                updateWelcomeGreetingText();
                renderWelcomeScatter();
                renderHomeWidgetGrid();
                welcomeOverlay.classList.add("active");
                startAmbientPixelAnimations();
            }

            function closeWelcomeScreen() {
                stopAmbientPixelAnimations();
                if (isEditingHomeWidgets) setWidgetEditMode(false);
                welcomeOverlay.style.transform = "";
                welcomeOverlay.style.opacity = "";
                welcomeOverlay.classList.remove("active");
                applyThemeColors(appHue, appLightness);
            }

            // Click listener for Home button & App Title
            const btnGoHome = document.getElementById("btn-go-home");
            const appTitleEl = document.getElementById("app-title");
            function returnToHomeScreen() {
                const isRunning = (startHoursInput.value !== "" && endHoursInput.value === "");
                openWelcomeScreen(welcomeActionMode || (isRunning ? "go" : "come"));
            }
            if (btnGoHome) btnGoHome.addEventListener("click", returnToHomeScreen);
            if (appTitleEl) appTitleEl.addEventListener("click", returnToHomeScreen);

            // Click on Mode Pill on Welcome Screen to toggle mode
            if (welcomeModePill) {
                welcomeModePill.style.cursor = "pointer";
                welcomeModePill.title = "Klicken, um Modus zu wechseln";
                welcomeModePill.addEventListener("click", () => {
                    openWelcomeScreen(welcomeActionMode === "come" ? "go" : "come");
                });
            }

            /* 4-RICHTUNGS-GESTEN IM WISCHSCHIRM (KOMMEN <-> GEHEN <-> MENÜ <-> WOCHE)
               Unterstützt Touch UND Maus-Drag flüssig ohne Viewport-Bouncing */
            let wDragStartX = 0;
            let wDragStartY = 0;
            let wDragging = false;
            let wAxis = null;

            function onSwipeDragStart(clientX, clientY, target) {
                if (!gesturesEnabled || isEditingHomeWidgets) return false;
                if (target.closest("input, select, textarea, button, .w-resize-handle-x, .w-resize-handle-y, .w-handle-del, .w-handle-order")) return false;
                wDragging = true;
                wAxis = null;
                wDragStartX = clientX;
                wDragStartY = clientY;
                return true;
            }

            function onSwipeDragMove(clientX, clientY) {
                if (!wDragging) return;
                const dx = clientX - wDragStartX;
                const dy = clientY - wDragStartY;
                const absX = Math.abs(dx);
                const absY = Math.abs(dy);

                if (!wAxis && (absX > 8 || absY > 8)) {
                    wAxis = absX >= absY ? "x" : "y";
                }

                if (wAxis === "y") {
                    const dampedY = Math.max(-80, Math.min(80, dy * 0.45));
                    welcomeOverlay.style.transition = "none";
                    welcomeOverlay.style.transform = `translateY(${dampedY}px)`;
                } else if (wAxis === "x") {
                    const dampedX = Math.max(-85, Math.min(85, dx * 0.45));
                    welcomeOverlay.style.transition = "none";
                    welcomeOverlay.style.transform = `translateX(${dampedX}px)`;
                }
            }

            function onSwipeDragEnd(clientX, clientY) {
                if (!wDragging) return;
                wDragging = false;
                const dx = clientX - wDragStartX;
                const dy = clientY - wDragStartY;
                const absX = Math.abs(dx);
                const absY = Math.abs(dy);

                welcomeOverlay.style.transition = "transform 0.22s cubic-bezier(0.2, 0.9, 0.3, 1)";
                welcomeOverlay.style.transform = "";

                if (wAxis === "y" && absY > 48 && absY > absX * 1.15) {
                    if (dy < 0) {
                        // Swipe UP -> Kommen
                        openWelcomeScreen("come");
                    } else {
                        // Swipe DOWN -> Gehen
                        openWelcomeScreen("go");
                    }
                } else if (wAxis === "x" && absX > 48 && absX > absY * 1.15) {
                    if (dx < 0) {
                        // Swipe LEFT -> Menü (view-clock)
                        closeWelcomeScreen();
                        switchToClockView();
                    } else {
                        // Swipe RIGHT -> Woche (view-week)
                        closeWelcomeScreen();
                        switchToWeekView();
                    }
                }
            }

            // Touch-Events
            welcomeOverlay.addEventListener("touchstart", (e) => {
                if (e.touches.length === 1) {
                    onSwipeDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
                }
            }, { passive: true });

            welcomeOverlay.addEventListener("touchmove", (e) => {
                if (wDragging && e.touches.length === 1) {
                    onSwipeDragMove(e.touches[0].clientX, e.touches[0].clientY);
                }
            }, { passive: true });

            welcomeOverlay.addEventListener("touchend", (e) => {
                if (wDragging && e.changedTouches.length === 1) {
                    onSwipeDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                }
            }, { passive: true });

            // Maus-Drag-Events (für Desktop/Testing)
            welcomeOverlay.addEventListener("mousedown", (e) => {
                if (e.button === 0 && onSwipeDragStart(e.clientX, e.clientY, e.target)) {
                    const onMouseMove = (ev) => onSwipeDragMove(ev.clientX, ev.clientY);
                    const onMouseUp = (ev) => {
                        window.removeEventListener("mousemove", onMouseMove);
                        window.removeEventListener("mouseup", onMouseUp);
                        onSwipeDragEnd(ev.clientX, ev.clientY);
                    };
                    window.addEventListener("mousemove", onMouseMove);
                    window.addEventListener("mouseup", onMouseUp);
                }
            });

            /* =========================================================
               ANSICHTEN-NAVIGATION (MENÜ <-> WOCHENBILANZ)
               ========================================================= */
            const viewClock = document.getElementById("view-clock");
            const viewWeek = document.getElementById("view-week");
            const toggleViewBtn = document.getElementById("btn-toggle-view");
            const iconViewWeek = document.getElementById("icon-view-week");
            const iconViewClock = document.getElementById("icon-view-clock");
            const btnJumpToday = document.getElementById("btn-jump-today");
            const weekDatePicker = document.getElementById("week-date-picker");
            let weekOffset = 0;

            function playViewAnim(el, animClass) {
                el.style.transform = "";
                el.style.opacity = "";
                el.style.transition = "";
                el.classList.remove("anim-slide-from-right", "anim-slide-from-left");
                void el.offsetWidth;
                el.classList.add(animClass);
            }

            function switchToClockView() {
                if (viewClock.classList.contains("active")) return;
                viewWeek.classList.remove("active");
                viewClock.classList.add("active");
                playViewAnim(viewClock, "anim-slide-from-left");
                iconViewWeek.style.display = "block";
                iconViewClock.style.display = "none";
                toggleViewBtn.title = "Wochenbilanz";
                calculateAllTimes();
            }

            function switchToWeekView() {
                if (viewWeek.classList.contains("active")) return;
                viewClock.classList.remove("active");
                viewWeek.classList.add("active");
                playViewAnim(viewWeek, "anim-slide-from-right");
                iconViewWeek.style.display = "none";
                iconViewClock.style.display = "block";
                toggleViewBtn.title = "Stempeluhr";
                weekOffset = 0;
                buildWeekView();
            }

            toggleViewBtn.addEventListener("click", () => {
                if (viewClock.classList.contains("active")) switchToWeekView();
                else switchToClockView();
            });

            function changeWeek(delta) {
                weekOffset += delta;
                buildWeekView(delta > 0 ? "next" : "prev");
            }

            function jumpToCurrentWeek() {
                if (weekOffset === 0) return;
                const dir = weekOffset > 0 ? "prev" : "next";
                weekOffset = 0;
                buildWeekView(dir);
            }

            function jumpToDateStr(dateStr) {
                if (!dateStr) return;
                const parts = dateStr.split("-").map(Number);
                const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);
                const todayMonday = getMonday(new Date());
                const targetMonday = getMonday(targetDate);
                todayMonday.setHours(12, 0, 0, 0);
                targetMonday.setHours(12, 0, 0, 0);
                const diffWeeks = Math.round((targetMonday - todayMonday) / (7 * 86400000));
                const dir = diffWeeks > weekOffset ? "next" : (diffWeeks < weekOffset ? "prev" : null);
                weekOffset = diffWeeks;
                buildWeekView(dir);
            }

            document.getElementById("btn-prev-week").addEventListener("click", () => changeWeek(-1));
            document.getElementById("btn-next-week").addEventListener("click", () => changeWeek(1));
            document.getElementById("week-kw-badge").addEventListener("click", jumpToCurrentWeek);
            btnJumpToday.addEventListener("click", jumpToCurrentWeek);
            weekDatePicker.addEventListener("change", () => jumpToDateStr(weekDatePicker.value));

            /* =========================================================
               EINSTELLUNGEN & UNTERMENÜS
               ========================================================= */
            const userNameInput = document.getElementById("userNameInput");
            const sollHoursInput = document.getElementById("sollHours");
            const sollMinutesInput = document.getElementById("sollMinutes");
            const weeklyHoursInput = document.getElementById("weeklyHoursInput");
            const glzBaseInput = document.getElementById("glzBaseInput");
            const glzBaseDateInput = document.getElementById("glzBaseDateInput");
            const pauseNotifyCheck = document.getElementById("pauseNotifyCheck");
            const pauseNotifyLeadInput = document.getElementById("pauseNotifyLeadInput");
            const pauseNotifyMinsWrap = document.getElementById("pauseNotifyMinsWrap");

            const styleModeSelect = document.getElementById("styleModeSelect");
            const asymSliderWrap = document.getElementById("asymSliderWrap");
            const asymIntensitySlider = document.getElementById("asymIntensitySlider");
            const asymIntensityVal = document.getElementById("asymIntensityVal");

            const isSmokerCheck = document.getElementById("isSmokerCheck");
            const smokeMinutesInput = document.getElementById("smokeMinutesInput");
            const smokerMinsWrap = document.getElementById("smokerMinsWrap");
            const smokeBar = document.getElementById("smoke-bar");
            const smokeCountDisplay = document.getElementById("smoke-count-display");
            const gesturesEnabledCheck = document.getElementById("gesturesEnabledCheck");
            const lightnessSlider = document.getElementById("lightnessSlider");
            const lightnessVal = document.getElementById("lightnessVal");

            userNameInput.value = userName;
            sollHoursInput.value = sollHours;
            sollMinutesInput.value = sollMinutes;
            weeklyHoursInput.value = weeklyHours;
            glzBaseInput.value = glzBaseHours;
            glzBaseDateInput.value = glzBaseDate;
            pauseNotifyCheck.checked = pauseNotifyEnabled;
            pauseNotifyLeadInput.value = pauseNotifyLeadMins;
            styleModeSelect.value = appStyleMode;
            asymIntensitySlider.value = appAsymIntensity;
            asymIntensityVal.textContent = appAsymIntensity;
            isSmokerCheck.checked = isSmoker;
            smokeMinutesInput.value = smokeMinutesPerBreak;
            gesturesEnabledCheck.checked = gesturesEnabled;
            lightnessSlider.value = appLightness;
            lightnessVal.textContent = appLightness;
            scribbleSizeSlider.value = scribbleSizePct;
            scribbleSizeVal.textContent = scribbleSizePct;

            function syncStyleControlsUI() {
                asymSliderWrap.style.display = styleModeSelect.value === "asymmetric" ? "block" : "none";
            }
            syncStyleControlsUI();

            styleModeSelect.addEventListener("change", () => {
                appStyleMode = styleModeSelect.value;
                document.documentElement.setAttribute("data-style", appStyleMode);
                syncStyleControlsUI();
                if (welcomeOverlay.classList.contains("active")) renderHomeWidgetGrid();
            });

            asymIntensitySlider.addEventListener("input", () => {
                appAsymIntensity = applyAsymIntensity(asymIntensitySlider.value);
                asymIntensityVal.textContent = appAsymIntensity;
                if (welcomeOverlay.classList.contains("active")) renderHomeWidgetGrid();
            });

            function updatePauseNotifyUI() {
                pauseNotifyMinsWrap.style.opacity = pauseNotifyCheck.checked ? "1" : "0.45";
                pauseNotifyLeadInput.disabled = !pauseNotifyCheck.checked;
            }
            updatePauseNotifyUI();

            pauseNotifyCheck.addEventListener("change", async () => {
                if (pauseNotifyCheck.checked) {
                    if (!("Notification" in window)) {
                        alert("Dieser Browser unterstützt leider keine System-Benachrichtigungen.");
                        pauseNotifyCheck.checked = false;
                        updatePauseNotifyUI();
                        return;
                    }
                    let perm = Notification.permission;
                    if (perm === "default") perm = await Notification.requestPermission();
                    if (perm !== "granted") {
                        alert("Benachrichtigungen wurden im Browser blockiert. Bitte erlaube sie in den Website-Einstellungen.");
                        pauseNotifyCheck.checked = false;
                    } else {
                        pauseNotifyEnabled = true;
                        pauseNotifyLeadMins = Math.min(60, Math.max(1, parseInt(pauseNotifyLeadInput.value, 10) || 10));
                        showAppNotification(
                            "Stempeluhr: Vorwarnung aktiv",
                            `Du wirst ${pauseNotifyLeadMins} Min vor der 30-Min- und 45-Min-Pausengrenze erinnert.`,
                            "pause-test"
                        );
                    }
                } else {
                    pauseNotifyEnabled = false;
                }
                updatePauseNotifyUI();
            });

            function updateSmokerUI() {
                smokerMinsWrap.style.opacity = isSmokerCheck.checked ? "1" : "0.45";
                smokeMinutesInput.disabled = !isSmokerCheck.checked;
                smokeBar.style.display = isSmoker ? "grid" : "none";
                smokeCountDisplay.textContent = `${todaySmokeCount}× (-${todaySmokeCount * smokeMinutesPerBreak}m)`;
            }
            isSmokerCheck.addEventListener("change", () => {
                smokerMinsWrap.style.opacity = isSmokerCheck.checked ? "1" : "0.45";
                smokeMinutesInput.disabled = !isSmokerCheck.checked;
            });

            function saveTodaySmokeData() {
                const todayStr = getTodayStr();
                const currentDay = getDayData(todayStr) || { status: 'work', startH: '', startM: '', endH: '', endM: '' };
                currentDay.smokeCount = todaySmokeCount;
                currentDay.smokeTotalMins = todaySmokeCount * smokeMinutesPerBreak;
                saveDayData(todayStr, currentDay);
            }

            document.getElementById("btn-add-smoke").addEventListener("click", () => {
                pushUndoSnapshot();
                todaySmokeCount++;
                updateSmokerUI();
                saveTodaySmokeData();
                calculateAllTimes();
            });
            document.getElementById("btn-sub-smoke").addEventListener("click", () => {
                if (todaySmokeCount > 0) {
                    pushUndoSnapshot();
                    todaySmokeCount--;
                    updateSmokerUI();
                    saveTodaySmokeData();
                    calculateAllTimes();
                }
            });

            updateSmokerUI();
            updateSettingsNavPreviews();
            updateBackupStatusBadge();

            /* FARBRAD (120° TRIADISCH) */
            const canvas = document.getElementById("colorWheel");
            const ctx = canvas.getContext("2d");
            const radius = canvas.width / 2;

            function drawWheelDot(hueAngle, dotRadius) {
                const rad = hueAngle * Math.PI / 180;
                const dotX = radius + Math.cos(rad) * (radius * 0.7);
                const dotY = radius + Math.sin(rad) * (radius * 0.7);
                ctx.beginPath();
                ctx.arc(dotX, dotY, dotRadius, 0, 2 * Math.PI);
                ctx.fillStyle = "white";
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.strokeStyle = "rgba(0,0,0,0.6)";
                ctx.stroke();
            }

            function drawColorWheel() {
                for (let angle = 0; angle < 360; angle++) {
                    ctx.beginPath();
                    ctx.moveTo(radius, radius);
                    ctx.arc(radius, radius, radius, (angle - 0.5) * Math.PI / 180, (angle + 1.5) * Math.PI / 180);
                    ctx.closePath();
                    ctx.fillStyle = `hsl(${angle}, 100%, ${appLightness}%)`;
                    ctx.fill();
                }
                drawWheelDot(appHue + 150, 5);
                drawWheelDot(appHue, 7);
            }

            lightnessSlider.addEventListener("input", () => {
                appLightness = Math.min(52, Math.max(28, parseInt(lightnessSlider.value, 10)));
                lightnessVal.textContent = appLightness;
                applyThemeColors(appHue, appLightness);
                drawColorWheel();
                if (welcomeOverlay.classList.contains("active")) renderHomeWidgetGrid();
            });

            function handleColorPick(e) {
                if (e.cancelable) e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const pt = (e.touches && e.touches.length > 0) ? e.touches[0] : e;
                const x = pt.clientX - rect.left - radius;
                const y = pt.clientY - rect.top - radius;
                let angle = Math.atan2(y, x) * 180 / Math.PI;
                if (angle < 0) angle += 360;
                appHue = Math.round(angle);
                applyThemeColors(appHue, appLightness);
                drawColorWheel();
                if (welcomeOverlay.classList.contains("active")) renderHomeWidgetGrid();
            }

            canvas.addEventListener("mousedown", (e) => {
                handleColorPick(e);
                canvas.addEventListener("mousemove", handleColorPick);
            });
            window.addEventListener("mouseup", () => canvas.removeEventListener("mousemove", handleColorPick));
            canvas.addEventListener("touchstart", (e) => {
                handleColorPick(e);
                canvas.addEventListener("touchmove", handleColorPick, { passive: false });
            }, { passive: false });
            window.addEventListener("touchend", () => canvas.removeEventListener("touchmove", handleColorPick));

            /* EINSTELLUNGS-PERSISTENZ */
            function persistAllSettings() {
                userName = userNameInput.value.trim();
                sollHours = Math.min(24, Math.max(0, parseInt(sollHoursInput.value, 10) || 0));
                sollMinutes = Math.min(59, Math.max(0, parseInt(sollMinutesInput.value, 10) || 0));
                sollHoursInput.value = sollHours;
                sollMinutesInput.value = sollMinutes;

                const parsedWeekly = parseFloat(String(weeklyHoursInput.value).replace(',', '.'));
                weeklyHours = (!isNaN(parsedWeekly) && parsedWeekly > 0 && parsedWeekly <= 48) ? parsedWeekly : 40;
                weeklyHoursInput.value = weeklyHours;

                const parsedGlzBase = parseFloat(String(glzBaseInput.value).replace(',', '.'));
                glzBaseHours = !isNaN(parsedGlzBase) ? parsedGlzBase : 0;
                glzBaseInput.value = glzBaseHours;

                glzBaseDate = glzBaseDateInput.value || "";

                pauseNotifyEnabled = pauseNotifyCheck.checked && ("Notification" in window) && Notification.permission === "granted";
                pauseNotifyLeadMins = Math.min(60, Math.max(1, parseInt(pauseNotifyLeadInput.value, 10) || 10));
                pauseNotifyLeadInput.value = pauseNotifyLeadMins;

                appStyleMode = styleModeSelect.value;
                appAsymIntensity = applyAsymIntensity(asymIntensitySlider.value);
                document.documentElement.setAttribute("data-style", appStyleMode);

                isSmoker = isSmokerCheck.checked;
                smokeMinutesPerBreak = Math.min(60, Math.max(1, parseInt(smokeMinutesInput.value, 10) || 5));
                smokeMinutesInput.value = smokeMinutesPerBreak;

                gesturesEnabled = gesturesEnabledCheck.checked;

                localStorage.setItem("userName", userName);
                localStorage.setItem("selectedScribbles", JSON.stringify(selectedScribbles));
                localStorage.setItem("scribbleSizePct", scribbleSizePct);
                localStorage.setItem("appStyleMode", appStyleMode);
                localStorage.setItem("appAsymIntensity", appAsymIntensity);
                localStorage.setItem("sollHours", sollHours);
                localStorage.setItem("sollMinutes", sollMinutes);
                localStorage.setItem("weeklyHours", weeklyHours);
                localStorage.setItem("glzBaseHours", glzBaseHours);
                localStorage.setItem("glzBaseDate", glzBaseDate);
                localStorage.setItem("pauseNotifyEnabled", pauseNotifyEnabled);
                localStorage.setItem("pauseNotifyLeadMins", pauseNotifyLeadMins);
                localStorage.setItem("isSmoker", isSmoker);
                localStorage.setItem("smokeMinutesPerBreak", smokeMinutesPerBreak);
                localStorage.setItem("gesturesEnabled", gesturesEnabled);
                localStorage.setItem("appHue", appHue);
                localStorage.setItem("appLightness", appLightness);

                applyThemeColors(appHue, appLightness);
                if (isSmoker) saveTodaySmokeData();
                updateSmokerUI();
                updateSettingsNavPreviews();
                calculateAllTimes();
                checkPauseNotifications();
                if (viewWeek.classList.contains("active")) buildWeekView();
                else updateAmpelPill();
                if (welcomeOverlay.classList.contains("active")) renderHomeWidgetGrid();
            }

            const settingsModal = document.getElementById("settings-modal");
            const settingsPageMain = document.getElementById("settings-page-main");
            const settingsPageWork = document.getElementById("settings-page-work");
            const settingsPageDesign = document.getElementById("settings-page-design");

            function showSettingsSubpage(pageName) {
                settingsPageMain.style.display = pageName === "main" ? "block" : "none";
                settingsPageWork.style.display = pageName === "work" ? "block" : "none";
                settingsPageDesign.style.display = pageName === "design" ? "block" : "none";

                if (pageName === "design") {
                    renderScribblePicker();
                    drawColorWheel();
                } else if (pageName === "main") {
                    updateSettingsNavPreviews();
                    updateBackupStatusBadge();
                }
            }

            function leaveSubpageAndSave() {
                persistAllSettings();
                showSettingsSubpage("main");
            }

            document.getElementById("btn-settings").addEventListener("click", () => {
                userNameInput.value = userName;
                weeklyHoursInput.value = weeklyHours;
                glzBaseInput.value = glzBaseHours;
                glzBaseDateInput.value = glzBaseDate;
                pauseNotifyCheck.checked = pauseNotifyEnabled;
                pauseNotifyLeadInput.value = pauseNotifyLeadMins;
                updatePauseNotifyUI();
                syncStyleControlsUI();
                updateBackupStatusBadge();
                showSettingsSubpage("main");
                settingsModal.classList.add("active");
            });

            document.getElementById("btn-open-home-widget-editor").addEventListener("click", () => {
                closeSettings();
                openWelcomeScreen(welcomeActionMode || "come");
                setWidgetEditMode(true);
            });

            document.getElementById("btn-open-work-subpage").addEventListener("click", () => showSettingsSubpage("work"));
            document.getElementById("btn-open-design-subpage").addEventListener("click", () => showSettingsSubpage("design"));
            document.getElementById("btn-back-from-work").addEventListener("click", leaveSubpageAndSave);
            document.getElementById("btn-done-work").addEventListener("click", leaveSubpageAndSave);
            document.getElementById("btn-back-from-design").addEventListener("click", leaveSubpageAndSave);
            document.getElementById("btn-done-design").addEventListener("click", leaveSubpageAndSave);

            function closeSettings() {
                persistAllSettings();
                settingsModal.classList.remove("active");
            }
            document.getElementById("btn-close-settings").addEventListener("click", closeSettings);
            document.getElementById("btn-save-settings").addEventListener("click", closeSettings);

            document.getElementById("btn-force-update").addEventListener("click", async () => {
                const btn = document.getElementById("btn-force-update");
                btn.textContent = "Suche...";
                btn.disabled = true;
                try {
                    if ('serviceWorker' in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (const reg of regs) await reg.update();
                    }
                    if ('caches' in window) {
                        const names = await caches.keys();
                        await Promise.all(names.map(n => caches.delete(n)));
                    }
                } catch (err) {}
                window.location.replace(`${window.location.href.split('?')[0]}?v=${Date.now()}`);
            });

            /* =========================================================
               STEMPEL-LOGIK, PAUSEN-VORWARNUNG & ZEITBERECHNUNG
               ========================================================= */
            const startHoursInput = document.getElementById("startHours");
            const startMinutesInput = document.getElementById("startMinutes");
            const endHoursInput = document.getElementById("endHours");
            const endMinutesInput = document.getElementById("endMinutes");
            const btnUndo = document.getElementById("btn-undo");
            const sessionsBox = document.getElementById("sessions-box");
            const sessionsList = document.getElementById("sessions-list");
            const sessionsPresSum = document.getElementById("sessions-pres-sum");
            const sessionsBreakInfo = document.getElementById("sessions-break-info");
            const sessionsGapSum = document.getElementById("sessions-gap-sum");

            let todaySessions = [];
            let undoStack = [];

            const updateUndoButtonState = () => { btnUndo.disabled = undoStack.length === 0; };
            function pushUndoSnapshot() {
                undoStack.push({ sessions: JSON.parse(JSON.stringify(todaySessions)), smokeCount: todaySmokeCount });
                if (undoStack.length > 20) undoStack.shift();
                updateUndoButtonState();
            }

            btnUndo.addEventListener("click", () => {
                if (undoStack.length === 0) return;
                const prev = undoStack.pop();
                todaySessions = prev.sessions || [];
                todaySmokeCount = typeof prev.smokeCount === "number" ? prev.smokeCount : 0;
                updateUndoButtonState();
                updateSmokerUI();
                saveTodaySmokeData();
                syncInputsFromSessions();
                saveSessionsAndDay();
                calculateAllTimes();
            });

            function timeObjToSecs(t) {
                if (!t || t.h === "" || isNaN(parseInt(t.h, 10))) return null;
                return (parseInt(t.h, 10) * 3600) + ((parseInt(t.m, 10) || 0) * 60) + (parseInt(t.s, 10) || 0);
            }
            const formatTimeObjWithSecs = (t) => (!t || t.h === "") ? "--:--" : `${format2(parseInt(t.h, 10))}:${format2(parseInt(t.m, 10) || 0)}:${format2(parseInt(t.s, 10) || 0)}`;
            function getNowSecsOfDay() {
                const now = new Date();
                return (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
            }

            function getSessionMetricsFromList(sessionsArr, liveEndSecs = null) {
                let totalPresSecs = 0, totalGapSecs = 0;
                for (let i = 0; i < sessionsArr.length; i++) {
                    const sSecs = timeObjToSecs(sessionsArr[i].start);
                    let eSecs = timeObjToSecs(sessionsArr[i].end);
                    if (eSecs === null && liveEndSecs !== null && i === sessionsArr.length - 1) eSecs = liveEndSecs;
                    if (sSecs !== null && eSecs !== null && eSecs > sSecs) totalPresSecs += (eSecs - sSecs);
                    if (i > 0) {
                        const prevEndSecs = timeObjToSecs(sessionsArr[i - 1].end);
                        if (prevEndSecs !== null && sSecs !== null && sSecs > prevEndSecs) totalGapSecs += (sSecs - prevEndSecs);
                    }
                }
                return { totalPresSecs, totalGapSecs };
            }
            const getSessionMetrics = (liveEndSecs = null) => getSessionMetricsFromList(todaySessions, liveEndSecs);

            function checkPauseNotifications() {
                if (!pauseNotifyEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
                const stH = parseInt(startHoursInput.value, 10);
                if (isNaN(stH) || endHoursInput.value !== "") return;

                const stM = parseInt(startMinutesInput.value, 10) || 0;
                const stS = (todaySessions.length > 0 && todaySessions[0].start) ? (parseInt(todaySessions[0].start.s, 10) || 0) : 0;
                const startSecs = (stH * 3600) + (stM * 60) + stS;
                const nowSecs = getNowSecsOfDay();
                if (nowSecs <= startSecs) return;

                let totalPresSecs = nowSecs - startSecs;
                if (todaySessions.length > 1) {
                    const metrics = getSessionMetrics(nowSecs);
                    if (metrics.totalPresSecs > 0) totalPresSecs = metrics.totalPresSecs;
                }

                const todayStr = getTodayStr();
                const leadSecs = pauseNotifyLeadMins * 60;

                const limit30Secs = 23400;
                if (totalPresSecs >= (limit30Secs - leadSecs) && totalPresSecs < (limit30Secs + 180)) {
                    const key30 = `notified_p30_${todayStr}`;
                    if (!localStorage.getItem(key30)) {
                        localStorage.setItem(key30, "1");
                        const remMins = Math.max(0, Math.ceil((limit30Secs - totalPresSecs) / 60));
                        const limit30Time = document.getElementById("output-30min-pause-range").textContent.split(" bis ")[0] || "";
                        showAppNotification(
                            "Achtung: 30-Min-Pause droht!",
                            remMins > 0
                                ? `In ca. ${remMins} Min (ab ${limit30Time}) greift der automatische 30-Min-Pausenabzug.`
                                : `Die 6:30-Std-Grenze (${limit30Time}) ist erreicht – 30 Min Pause werden jetzt abgezogen.`,
                            "pause-30"
                        );
                    }
                }

                const limit45Secs = 35100;
                if (totalPresSecs >= (limit45Secs - leadSecs) && totalPresSecs < (limit45Secs + 180)) {
                    const key45 = `notified_p45_${todayStr}`;
                    if (!localStorage.getItem(key45)) {
                        localStorage.setItem(key45, "1");
                        const remMins = Math.max(0, Math.ceil((limit45Secs - totalPresSecs) / 60));
                        const limit45Time = document.getElementById("output-45min-pause").textContent || "";
                        showAppNotification(
                            "Achtung: 45-Min-Pause droht!",
                            remMins > 0
                                ? `In ca. ${remMins} Min (ab ${limit45Time}) greift der automatische 45-Min-Pausenabzug.`
                                : `Die 9:45-Std-Grenze (${limit45Time}) ist erreicht – 45 Min Pause werden jetzt abgezogen.`,
                            "pause-45"
                        );
                    }
                }
            }

            function renderSessionsBox() {
                if (todaySessions.length <= 1) {
                    sessionsBox.style.display = "none";
                    return;
                }
                sessionsBox.style.display = "block";
                sessionsList.innerHTML = "";

                const hasOpenLast = !todaySessions[todaySessions.length - 1].end;
                const { totalPresSecs, totalGapSecs } = getSessionMetrics(hasOpenLast ? getNowSecsOfDay() : null);
                sessionsPresSum.textContent = `Anwesenheit: ${format2(Math.floor(totalPresSecs / 3600))}:${format2(Math.floor((totalPresSecs % 3600) / 60))} h`;

                todaySessions.forEach((sess, idx) => {
                    const row = document.createElement("div");
                    row.className = "session-item";
                    const endStr = sess.end ? formatTimeObjWithSecs(sess.end) : "läuft...";
                    row.innerHTML = `<span><strong>#${idx + 1}:</strong> ${formatTimeObjWithSecs(sess.start)} – ${endStr}</span><button type="button" class="session-del-btn" data-idx="${idx}" title="Block entfernen">×</button>`;
                    sessionsList.appendChild(row);
                });

                sessionsList.querySelectorAll(".session-del-btn").forEach(btn => {
                    btn.addEventListener("click", (e) => {
                        pushUndoSnapshot();
                        todaySessions.splice(parseInt(e.target.getAttribute("data-idx"), 10), 1);
                        syncInputsFromSessions();
                        saveSessionsAndDay();
                        calculateAllTimes();
                    });
                });

                if (totalGapSecs > 0) {
                    sessionsBreakInfo.style.display = "flex";
                    sessionsGapSum.textContent = `${Math.round(totalGapSecs / 60)} min`;
                } else {
                    sessionsBreakInfo.style.display = "none";
                }
            }

            function syncInputsFromSessions() {
                if (todaySessions.length === 0) {
                    startHoursInput.value = ""; startMinutesInput.value = "";
                    endHoursInput.value = ""; endMinutesInput.value = "";
                    return;
                }
                startHoursInput.value = todaySessions[0].start.h;
                startMinutesInput.value = todaySessions[0].start.m;
                const last = todaySessions[todaySessions.length - 1];
                endHoursInput.value = last.end ? last.end.h : "";
                endMinutesInput.value = last.end ? last.end.m : "";
            }

            function saveSessionsAndDay() {
                const todayStr = getTodayStr();
                renderSessionsBox();

                if (todaySessions.length > 0) {
                    localStorage.setItem("savedTodaySessions", JSON.stringify({ date: todayStr, sessions: todaySessions }));
                } else {
                    localStorage.removeItem("savedTodaySessions");
                }

                const dow = new Date().getDay();
                if (todaySessions.length === 0 && todaySmokeCount === 0 && (dow === 0 || dow === 6)) {
                    localStorage.removeItem("day_" + todayStr);
                    return;
                }

                const { totalPresSecs } = getSessionMetrics(null);
                let currentDay = getDayData(todayStr) || { status: 'work' };
                if (todaySessions.length > 0 && currentDay.status === 'free') currentDay.status = 'work';
                currentDay.startH = startHoursInput.value;
                currentDay.startM = startMinutesInput.value;
                currentDay.endH = endHoursInput.value;
                currentDay.endM = endMinutesInput.value;
                currentDay.sessions = todaySessions;
                currentDay.customPresSecs = totalPresSecs > 0 ? totalPresSecs : null;
                saveDayData(todayStr, currentDay);
            }

            let manualEditSnapshotTaken = false;
            function onManualTimeInputChange() {
                const stH = startHoursInput.value;
                const enH = endHoursInput.value;
                if (stH === "" && enH === "") {
                    todaySessions = [];
                    saveSessionsAndDay();
                    return;
                }
                const startObj = stH !== "" ? { h: format2(parseInt(stH, 10) || 0), m: format2(parseInt(startMinutesInput.value, 10) || 0), s: "00" } : null;
                const endObj = enH !== "" ? { h: format2(parseInt(enH, 10) || 0), m: format2(parseInt(endMinutesInput.value, 10) || 0), s: "00" } : null;

                if (todaySessions.length === 0) {
                    if (startObj) todaySessions.push({ start: startObj, end: endObj });
                } else {
                    if (startObj) {
                        const oldS = todaySessions[0].start;
                        todaySessions[0].start = { ...startObj, s: (oldS && oldS.h === startObj.h && oldS.m === startObj.m) ? (oldS.s || "00") : "00" };
                    }
                    if (endObj) {
                        const oldE = todaySessions[todaySessions.length - 1].end;
                        todaySessions[todaySessions.length - 1].end = { ...endObj, s: (oldE && oldE.h === endObj.h && oldE.m === endObj.m) ? (oldE.s || "00") : "00" };
                    } else {
                        todaySessions[todaySessions.length - 1].end = null;
                    }
                }
                saveSessionsAndDay();
            }

            function clampInput(input) {
                if (input.value === "") return;
                let val = parseInt(input.value, 10);
                const min = parseInt(input.min, 10), max = parseInt(input.max, 10);
                if (isNaN(val)) { input.value = ""; return; }
                if (!isNaN(min) && val < min) val = min;
                if (!isNaN(max) && val > max) val = max;
                input.value = format2(val);
            }

            function setupInput(currentInput, nextInput, onUpdate) {
                currentInput.addEventListener("focus", () => {
                    currentInput.select();
                    manualEditSnapshotTaken = false;
                    setTimeout(() => currentInput.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
                });
                currentInput.addEventListener("input", () => {
                    if (!manualEditSnapshotTaken) { pushUndoSnapshot(); manualEditSnapshotTaken = true; }
                    if (currentInput.value.length > 2) currentInput.value = currentInput.value.slice(0, 2);
                    if (currentInput.value.length === 2 && nextInput) nextInput.focus();
                    if (onUpdate) onUpdate();
                    calculateAllTimes();
                });
                currentInput.addEventListener("blur", () => {
                    clampInput(currentInput);
                    if (onUpdate) onUpdate();
                    calculateAllTimes();
                });
            }
            setupInput(startHoursInput, startMinutesInput, onManualTimeInputChange);
            setupInput(startMinutesInput, endHoursInput, onManualTimeInputChange);
            setupInput(endHoursInput, endMinutesInput, onManualTimeInputChange);
            setupInput(endMinutesInput, null, onManualTimeInputChange);

            function triggerStampComeNow() {
                pushUndoSnapshot();
                const now = new Date();
                const tObj = { h: format2(now.getHours()), m: format2(now.getMinutes()), s: format2(now.getSeconds()) };
                if (todaySessions.length === 0) todaySessions.push({ start: tObj, end: null });
                else {
                    const last = todaySessions[todaySessions.length - 1];
                    if (last.end !== null) todaySessions.push({ start: tObj, end: null });
                    else last.start = tObj;
                }
                if (!glzBaseDate) {
                    glzBaseDate = getTodayStr();
                    glzBaseDateInput.value = glzBaseDate;
                    localStorage.setItem("glzBaseDate", glzBaseDate);
                }
                syncInputsFromSessions();
                saveSessionsAndDay();
                calculateAllTimes();
                checkPauseNotifications();
            }

            function triggerStampGoNow() {
                pushUndoSnapshot();
                const now = new Date();
                const tObj = { h: format2(now.getHours()), m: format2(now.getMinutes()), s: format2(now.getSeconds()) };
                if (todaySessions.length === 0) todaySessions.push({ start: { h: "00", m: "00", s: "00" }, end: tObj });
                else todaySessions[todaySessions.length - 1].end = tObj;
                syncInputsFromSessions();
                saveSessionsAndDay();
                calculateAllTimes();
            }

            document.getElementById("btn-now-start").addEventListener("click", triggerStampComeNow);
            document.getElementById("btn-now-end").addEventListener("click", triggerStampGoNow);

            const getTodaySmokeSecs = () => isSmoker ? todaySmokeCount * smokeMinutesPerBreak * 60 : 0;

            function getDeductionDetails(totalPresSecs, smokeSecs) {
                let legalPauseSecs = 0;
                if (totalPresSecs >= 35100) legalPauseSecs = 45 * 60;
                else if (totalPresSecs >= 23400) legalPauseSecs = 30 * 60;
                const totalDeductSecs = Math.max(legalPauseSecs, smokeSecs);
                return { netSecs: Math.max(0, totalPresSecs - totalDeductSecs), totalDeductSecs };
            }

            function calculateAllTimes() {
                calculateEndTimes();
                calculateWorkingTime();
                updateAmpelPill();
                if (welcomeOverlay.classList.contains("active")) updateHomeWidgetsLiveData();
            }

            function calculateEndTimes() {
                const hours = parseInt(startHoursInput.value, 10);
                const minutes = parseInt(startMinutesInput.value, 10) || 0;
                const seconds = (todaySessions.length > 0 && todaySessions[0].start) ? (parseInt(todaySessions[0].start.s, 10) || 0) : 0;

                if (isNaN(hours)) {
                    document.getElementById("output-no-pause").textContent = "-";
                    document.getElementById("output-30min-pause-range").textContent = "-";
                    document.getElementById("output-45min-pause").textContent = "-";
                    return;
                }

                const { totalGapSecs } = getSessionMetrics(null);
                const startTime = new Date();
                startTime.setHours(hours, minutes, seconds, 0);

                const addS = (s) => new Date(startTime.getTime() + (s + totalGapSecs) * 1000);
                const formatT = (d) => `${format2(d.getHours())}:${format2(d.getMinutes())}:${format2(d.getSeconds())}`;

                document.getElementById("output-no-pause").textContent = formatT(addS(6 * 3600 + 29 * 60 + 59));
                document.getElementById("output-30min-pause-range").textContent = `${formatT(addS(6 * 3600 + 30 * 60))} bis ${formatT(addS(9 * 3600 + 44 * 60 + 59))}`;
                document.getElementById("output-45min-pause").textContent = formatT(addS(9 * 3600 + 45 * 60));
            }

            function calculateWorkingTime() {
                const stH = parseInt(startHoursInput.value, 10);
                const stM = parseInt(startMinutesInput.value, 10) || 0;
                const enH = parseInt(endHoursInput.value, 10);
                const enM = parseInt(endMinutesInput.value, 10) || 0;

                const labelDec = document.getElementById("label-decimal-time");
                const labelOver = document.getElementById("label-overtime");
                const decOutputEl = document.getElementById("output-decimal-time");
                const pauseHintEl = document.getElementById("output-pause-hint");

                if (isNaN(stH)) {
                    labelDec.textContent = "Dezimal (h)";
                    labelOver.textContent = "+/-";
                    decOutputEl.textContent = "-";
                    pauseHintEl.style.display = "none";
                    document.getElementById("output-overtime").textContent = "-";
                    return;
                }

                const isLiveRunning = isNaN(enH);
                const stS = (todaySessions.length > 0 && todaySessions[0].start) ? (parseInt(todaySessions[0].start.s, 10) || 0) : 0;
                const startSecs = (stH * 3600) + (stM * 60) + stS;

                let endSecs;
                if (isLiveRunning) {
                    endSecs = getNowSecsOfDay();
                    labelDec.innerHTML = `<span class="live-dot"></span>Bisher (Netto)`;
                    labelOver.innerHTML = `<span class="live-dot"></span>Bis Soll (+/-)`;
                } else {
                    const lastSess = todaySessions[todaySessions.length - 1];
                    const enS = (lastSess && lastSess.end) ? (parseInt(lastSess.end.s, 10) || 0) : 0;
                    endSecs = (enH * 3600) + (enM * 60) + enS;
                    labelDec.textContent = "Dezimal (h)";
                    labelOver.textContent = "+/-";
                }

                if (endSecs < startSecs) {
                    decOutputEl.textContent = isLiveRunning ? "00:00 h" : "Ungültig";
                    pauseHintEl.style.display = "none";
                    document.getElementById("output-overtime").textContent = "-";
                    return;
                }

                let totalPresSecs = endSecs - startSecs;
                if (todaySessions.length > 1) {
                    const metrics = getSessionMetrics(isLiveRunning ? endSecs : null);
                    if (metrics.totalPresSecs > 0) totalPresSecs = metrics.totalPresSecs;
                }

                const { netSecs, totalDeductSecs } = getDeductionDetails(totalPresSecs, getTodaySmokeSecs());
                const overSecs = netSecs - ((sollHours * 3600) + (sollMinutes * 60));

                const sign = overSecs < 0 ? "-" : "+";
                const aSecs = Math.abs(overSecs);
                document.getElementById("output-overtime").textContent = `${sign}${format2(Math.floor(aSecs / 3600))}:${format2(Math.floor((aSecs % 3600) / 60))}:${format2(aSecs % 60)}`;

                if (isLiveRunning) {
                    decOutputEl.textContent = `${format2(Math.floor(netSecs / 3600))}:${format2(Math.floor((netSecs % 3600) / 60))} h`;
                    if (totalDeductSecs > 0) {
                        pauseHintEl.textContent = `inkl. -${Math.round(totalDeductSecs / 60)}m Pause`;
                        pauseHintEl.style.display = "block";
                    } else {
                        pauseHintEl.style.display = "none";
                    }
                } else {
                    decOutputEl.textContent = (netSecs / 3600).toFixed(2);
                    pauseHintEl.style.display = "none";
                }
            }

            /* =========================================================
               WOCHENÜBERSICHT, AMPELKONTO, EDITOR & PDF-EXPORT
               ========================================================= */
            function getMonday(d) {
                d = new Date(d);
                const day = d.getDay();
                return new Date(d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)));
            }

            function getDayBreakdown(saved, liveEndSecs = null) {
                if (!saved) return { presSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                let totalPresSecs = 0, isLive = false;

                if (Array.isArray(saved.sessions) && saved.sessions.length > 0) {
                    const hasOpenLast = !saved.sessions[saved.sessions.length - 1].end || saved.sessions[saved.sessions.length - 1].end.h === "";
                    if (hasOpenLast && liveEndSecs !== null) {
                        isLive = true;
                        totalPresSecs = getSessionMetricsFromList(saved.sessions, liveEndSecs).totalPresSecs;
                    } else if (saved.customPresSecs && saved.customPresSecs > 0) {
                        totalPresSecs = saved.customPresSecs;
                    } else {
                        totalPresSecs = getSessionMetricsFromList(saved.sessions, null).totalPresSecs;
                    }
                } else if (saved.customPresSecs && saved.customPresSecs > 0) {
                    totalPresSecs = saved.customPresSecs;
                } else if (saved.startH !== '' && saved.startH !== undefined) {
                    const sh = parseInt(saved.startH, 10), sm = parseInt(saved.startM, 10) || 0;
                    if (isNaN(sh)) return { presSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                    const sSecs = sh * 3600 + sm * 60;
                    if (saved.endH !== '' && saved.endH !== undefined) {
                        const eh = parseInt(saved.endH, 10), em = parseInt(saved.endM, 10) || 0;
                        if (isNaN(eh)) return { presSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                        const eSecs = eh * 3600 + em * 60;
                        if (eSecs <= sSecs) return { presSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                        totalPresSecs = eSecs - sSecs;
                    } else if (liveEndSecs !== null && liveEndSecs > sSecs) {
                        isLive = true;
                        totalPresSecs = liveEndSecs - sSecs;
                    } else return { presSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };
                } else return { presSecs: 0, deductSecs: 0, netSecs: 0, isLive: false };

                const { netSecs, totalDeductSecs } = getDeductionDetails(totalPresSecs, (saved.smokeTotalMins || 0) * 60);
                return { presSecs: totalPresSecs, deductSecs: totalDeductSecs, netSecs, isLive };
            }

            function computeTotalGlzHours() {
                const todayStr = getTodayStr();
                const nowSecs = getNowSecsOfDay();
                const sollSecsPerDay = (sollHours * 3600) + (sollMinutes * 60);
                let deltaSecs = 0;

                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (!key || !key.startsWith("day_")) continue;
                    const dateStr = key.slice(4);
                    if (glzBaseDate && dateStr < glzBaseDate) continue;

                    const parts = dateStr.split("-").map(Number);
                    if (parts.length !== 3 || parts.some(isNaN)) continue;

                    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
                    const dow = dt.getDay();
                    const isWeekend = (dow === 0 || dow === 6);
                    const saved = getDayData(dateStr);
                    if (!saved) continue;

                    const daySoll = isWeekend ? 0 : sollSecsPerDay;
                    let dayCredited = 0;

                    if (saved.status === "work") {
                        const bd = getDayBreakdown(saved, dateStr === todayStr ? nowSecs : null);
                        dayCredited = bd.netSecs;
                        if (dayCredited === 0 && bd.presSecs === 0 && dateStr > todayStr) continue;
                    } else if (saved.status === "vacation" || saved.status === "sick" || saved.status === "holiday") {
                        dayCredited = daySoll;
                    } else if (saved.status === "free") {
                        dayCredited = 0;
                    }

                    deltaSecs += (dayCredited - daySoll);
                }

                return glzBaseHours + (deltaSecs / 3600);
            }

            function updateAmpelPill() {
                const pill = document.getElementById("glzPill");
                const pillText = document.getElementById("glzPillText");
                if (!pill || !pillText) return;

                const gesamtSaldo = computeTotalGlzHours();
                const faktor = (weeklyHours > 0 ? weeklyHours : 40) / 40;

                const gruenMin = -20 * faktor;
                const gruenMax =  40 * faktor;
                const gelbMin  = -40 * faktor;
                const gelbMax  =  80 * faktor;
                const rotMax   = 100 * faktor;

                pill.classList.remove("ampel-gruen", "ampel-gelb", "ampel-rot");

                const fmtSigned = (num) => (num >= 0 ? "+" : "") + num.toFixed(2).replace(".", ",");
                const fmtPlain = (num) => Math.abs(num).toFixed(1).replace(".", ",");

                let statusClass = "ampel-gruen";
                let infoText = "";

                if (gesamtSaldo >= gruenMin && gesamtSaldo <= gruenMax) {
                    statusClass = "ampel-gruen";
                    infoText = `Grün · noch ${fmtPlain(gruenMax - gesamtSaldo)}h bis Gelb`;
                } else if ((gesamtSaldo > gruenMax && gesamtSaldo <= gelbMax) || (gesamtSaldo < gruenMin && gesamtSaldo >= gelbMin)) {
                    statusClass = "ampel-gelb";
                    if (gesamtSaldo > gruenMax) infoText = `Gelb · noch ${fmtPlain(gelbMax - gesamtSaldo)}h bis Rot`;
                    else infoText = `Gelb (Minus) · noch ${fmtPlain(gesamtSaldo - gelbMin)}h Puffer`;
                } else {
                    statusClass = "ampel-rot";
                    if (gesamtSaldo > rotMax) infoText = `Rot (> ${rotMax.toFixed(0)}h Max!)`;
                    else if (gesamtSaldo < gelbMin) infoText = `Rot (Minus-Grenze!)`;
                    else infoText = `Rot · Rückführung nötig`;
                }

                pill.classList.add(statusClass);
                pillText.textContent = `GLZ: ${fmtSigned(gesamtSaldo)}h (${infoText})`;
            }

            const statusLabels = { work: "Arbeit", vacation: "Urlaub", sick: "Krank", holiday: "Feiertag", free: "Frei" };
            const dayFullNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

            function openEditorForAnyDate(dateStr) {
                if (!dateStr) return;
                jumpToDateStr(dateStr);
                const parts = dateStr.split("-").map(Number);
                const dt = new Date(parts[0], parts[1] - 1, parts[2]);
                const dowIdx = (dt.getDay() + 6) % 7;
                openDayEditor(dateStr, `${dayFullNames[dowIdx]}, ${format2(dt.getDate())}.${format2(dt.getMonth() + 1)}.${dt.getFullYear()}`, "work");
            }

            const backfillModal = document.getElementById("backfill-modal");
            const backfillDateInput = document.getElementById("backfillDateInput");
            let currentWeekSatStr = "", currentWeekSunStr = "";

            document.getElementById("btn-open-backfill-modal").addEventListener("click", () => {
                const refDate = new Date();
                refDate.setDate(refDate.getDate() + (weekOffset * 7));
                const monday = getMonday(refDate);

                const satDate = new Date(monday); satDate.setDate(monday.getDate() + 5);
                currentWeekSatStr = `${satDate.getFullYear()}-${format2(satDate.getMonth() + 1)}-${format2(satDate.getDate())}`;
                document.getElementById("quick-sat-date").textContent = `${format2(satDate.getDate())}.${format2(satDate.getMonth() + 1)}.${satDate.getFullYear()}`;

                const sunDate = new Date(monday); sunDate.setDate(monday.getDate() + 6);
                currentWeekSunStr = `${sunDate.getFullYear()}-${format2(sunDate.getMonth() + 1)}-${format2(sunDate.getDate())}`;
                document.getElementById("quick-sun-date").textContent = `${format2(sunDate.getDate())}.${format2(sunDate.getMonth() + 1)}.${sunDate.getFullYear()}`;

                backfillDateInput.value = currentWeekSatStr;
                backfillModal.classList.add("active");
            });

            document.getElementById("btn-close-backfill-modal").addEventListener("click", () => backfillModal.classList.remove("active"));
            document.getElementById("btn-quick-sat").addEventListener("click", () => { backfillModal.classList.remove("active"); openEditorForAnyDate(currentWeekSatStr); });
            document.getElementById("btn-quick-sun").addEventListener("click", () => { backfillModal.classList.remove("active"); openEditorForAnyDate(currentWeekSunStr); });
            document.getElementById("btn-confirm-backfill").addEventListener("click", () => {
                if (!backfillDateInput.value) return;
                const chosen = backfillDateInput.value;
                backfillModal.classList.remove("active");
                openEditorForAnyDate(chosen);
            });

            /* TAGES-EDITOR */
            const dayEditorModal = document.getElementById("day-editor-modal");
            const dayEditorTitle = document.getElementById("day-editor-title");
            const dayEditorWorkArea = document.getElementById("day-editor-work-area");
            const dayEditorNonWorkNote = document.getElementById("day-editor-nonwork-note");
            const dayEditorBlocksList = document.getElementById("day-editor-blocks-list");
            const editorSmokeVal = document.getElementById("editor-smoke-val");
            let editingDateStr = null, editingDraft = null;

            function openDayEditor(dateStr, titleText, defaultStatus) {
                editingDateStr = dateStr;
                dayEditorTitle.textContent = titleText;
                const existing = getDayData(dateStr);
                if (existing) {
                    editingDraft = JSON.parse(JSON.stringify(existing));
                    if (editingDraft.status === "free" && !hasWeekendBooking(editingDraft)) editingDraft.status = "work";
                } else {
                    editingDraft = { status: defaultStatus, startH: '', startM: '', endH: '', endM: '', sessions: [], smokeCount: 0 };
                }

                if (!editingDraft.sessions || editingDraft.sessions.length === 0) {
                    if (editingDraft.startH !== '' && editingDraft.startH !== undefined) {
                        editingDraft.sessions = [{
                            start: { h: format2(parseInt(editingDraft.startH, 10) || 0), m: format2(parseInt(editingDraft.startM, 10) || 0), s: '00' },
                            end: (editingDraft.endH !== '' && editingDraft.endH !== undefined)
                                ? { h: format2(parseInt(editingDraft.endH, 10) || 0), m: format2(parseInt(editingDraft.endM, 10) || 0), s: '00' } : null
                        }];
                    } else editingDraft.sessions = [];
                }
                if (typeof editingDraft.smokeCount !== 'number') editingDraft.smokeCount = 0;

                renderDayEditor();
                dayEditorModal.classList.add("active");
            }

            function closeDayEditor() {
                dayEditorModal.classList.remove("active");
                editingDateStr = null;
                editingDraft = null;
            }

            function nudgeTimeObj(tObj, deltaMins) {
                let h = parseInt(tObj.h, 10), m = parseInt(tObj.m, 10);
                if (isNaN(h)) h = 7;
                if (isNaN(m)) m = 30;
                const total = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + deltaMins));
                tObj.h = format2(Math.floor(total / 60));
                tObj.m = format2(total % 60);
                tObj.s = "00";
            }

            function renderDayEditor() {
                if (!editingDraft) return;
                document.querySelectorAll("#day-status-chips .day-status-chip").forEach(chip => {
                    chip.classList.toggle("selected", chip.getAttribute("data-status") === editingDraft.status);
                });

                if (editingDraft.status !== "work") {
                    dayEditorWorkArea.style.display = "none";
                    dayEditorNonWorkNote.style.display = "block";
                    return;
                }

                dayEditorWorkArea.style.display = "block";
                dayEditorNonWorkNote.style.display = "none";
                editorSmokeVal.textContent = `${editingDraft.smokeCount}×`;
                dayEditorBlocksList.innerHTML = "";

                if (editingDraft.sessions.length === 0) {
                    editingDraft.sessions.push({ start: { h: "07", m: "30", s: "00" }, end: { h: "16", m: "00", s: "00" } });
                }

                editingDraft.sessions.forEach((blk, idx) => {
                    const card = document.createElement("div");
                    card.className = "editor-block-card";
                    const sH = blk.start ? blk.start.h : "", sM = blk.start ? blk.start.m : "";
                    const eH = blk.end ? blk.end.h : "", eM = blk.end ? blk.end.m : "";

                    card.innerHTML = `
                        <div class="editor-block-header">
                            <span>Zeitblock #${idx + 1}</span>
                            ${editingDraft.sessions.length > 1 ? `<button type="button" class="editor-block-del" data-del-idx="${idx}">Entfernen</button>` : ''}
                        </div>
                        <div class="editor-time-row">
                            <div class="editor-time-col">
                                <span class="lbl">Kommen</span>
                                <div class="editor-hhmm-pair">
                                    <input type="number" inputmode="numeric" min="0" max="23" class="ed-sh" value="${sH}" placeholder="hh">
                                    <span>:</span>
                                    <input type="number" inputmode="numeric" min="0" max="59" class="ed-sm" value="${sM}" placeholder="mm">
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
                                    <input type="number" inputmode="numeric" min="0" max="23" class="ed-eh" value="${eH}" placeholder="hh">
                                    <span>:</span>
                                    <input type="number" inputmode="numeric" min="0" max="59" class="ed-em" value="${eM}" placeholder="mm">
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

                    const delBtn = card.querySelector(".editor-block-del");
                    if (delBtn) {
                        delBtn.addEventListener("click", () => {
                            editingDraft.sessions.splice(idx, 1);
                            renderDayEditor();
                        });
                    }

                    const inSh = card.querySelector(".ed-sh");
                    const inSm = card.querySelector(".ed-sm");
                    const inEh = card.querySelector(".ed-eh");
                    const inEm = card.querySelector(".ed-em");

                    function syncBlockFromInputs() {
                        if (inSh.value === "" && inSm.value === "") {
                            blk.start = null;
                        } else {
                            blk.start = {
                                h: inSh.value !== "" ? format2(parseInt(inSh.value, 10) || 0) : "",
                                m: inSm.value !== "" ? format2(parseInt(inSm.value, 10) || 0) : "00",
                                s: (blk.start && blk.start.s) || "00"
                            };
                        }
                        if (inEh.value === "" && inEm.value === "") {
                            blk.end = null;
                        } else {
                            blk.end = {
                                h: inEh.value !== "" ? format2(parseInt(inEh.value, 10) || 0) : "",
                                m: inEm.value !== "" ? format2(parseInt(inEm.value, 10) || 0) : "00",
                                s: (blk.end && blk.end.s) || "00"
                            };
                        }
                    }

                    [inSh, inSm, inEh, inEm].forEach(inp => {
                        inp.addEventListener("focus", () => inp.select());
                        inp.addEventListener("input", () => {
                            if (inp.value.length > 2) inp.value = inp.value.slice(0, 2);
                            syncBlockFromInputs();
                        });
                        inp.addEventListener("blur", () => {
                            clampInput(inp);
                            syncBlockFromInputs();
                        });
                    });

                    card.querySelectorAll(".nudge-btn").forEach(nBtn => {
                        nBtn.addEventListener("click", () => {
                            syncBlockFromInputs();
                            const side = nBtn.getAttribute("data-side");
                            const delta = parseInt(nBtn.getAttribute("data-delta"), 10);
                            if (side === "start") {
                                if (!blk.start || blk.start.h === "") blk.start = { h: "07", m: "30", s: "00" };
                                nudgeTimeObj(blk.start, delta);
                            } else {
                                if (!blk.end || blk.end.h === "") blk.end = { h: "16", m: "00", s: "00" };
                                nudgeTimeObj(blk.end, delta);
                            }
                            renderDayEditor();
                        });
                    });

                    dayEditorBlocksList.appendChild(card);
                });
            }

            document.querySelectorAll("#day-status-chips .day-status-chip").forEach(chip => {
                chip.addEventListener("click", () => {
                    if (!editingDraft) return;
                    editingDraft.status = chip.getAttribute("data-status");
                    renderDayEditor();
                });
            });

            document.getElementById("btn-editor-add-block").addEventListener("click", () => {
                if (!editingDraft) return;
                if (!Array.isArray(editingDraft.sessions)) editingDraft.sessions = [];
                let nextStartH = "12", nextStartM = "30";
                if (editingDraft.sessions.length > 0) {
                    const lastEnd = editingDraft.sessions[editingDraft.sessions.length - 1].end;
                    if (lastEnd && lastEnd.h !== "") {
                        const lastTotal = (parseInt(lastEnd.h, 10) * 60) + (parseInt(lastEnd.m, 10) || 0) + 30;
                        nextStartH = format2(Math.min(23, Math.floor(lastTotal / 60)));
                        nextStartM = format2(lastTotal % 60);
                    }
                }
                const endTotal = (parseInt(nextStartH, 10) * 60) + parseInt(nextStartM, 10) + 180;
                const nextEndH = format2(Math.min(23, Math.floor(endTotal / 60)));
                const nextEndM = format2(endTotal % 60);

                editingDraft.sessions.push({
                    start: { h: nextStartH, m: nextStartM, s: "00" },
                    end: { h: nextEndH, m: nextEndM, s: "00" }
                });
                renderDayEditor();
            });

            document.getElementById("btn-editor-smoke-minus").addEventListener("click", () => {
                if (!editingDraft) return;
                if (editingDraft.smokeCount > 0) {
                    editingDraft.smokeCount--;
                    editorSmokeVal.textContent = `${editingDraft.smokeCount}×`;
                }
            });

            document.getElementById("btn-editor-smoke-plus").addEventListener("click", () => {
                if (!editingDraft) return;
                editingDraft.smokeCount = (editingDraft.smokeCount || 0) + 1;
                editorSmokeVal.textContent = `${editingDraft.smokeCount}×`;
            });

            document.getElementById("btn-close-day-editor").addEventListener("click", closeDayEditor);

            document.getElementById("btn-reset-day-editor").addEventListener("click", () => {
                if (!editingDateStr) return;
                if (!confirm("Möchtest du die Eintragungen für diesen Tag wirklich löschen?")) return;
                localStorage.removeItem("day_" + editingDateStr);
                if (editingDateStr === getTodayStr()) {
                    todaySessions = [];
                    todaySmokeCount = 0;
                    updateSmokerUI();
                    syncInputsFromSessions();
                    saveSessionsAndDay();
                    calculateAllTimes();
                }
                closeDayEditor();
                buildWeekView();
                updateAmpelPill();
            });

            document.getElementById("btn-save-day-editor").addEventListener("click", () => {
                if (!editingDateStr || !editingDraft) return;

                const validSessions = (editingDraft.sessions || []).filter(s => s && s.start && s.start.h !== "");
                editingDraft.sessions = validSessions;

                if (validSessions.length > 0) {
                    editingDraft.startH = validSessions[0].start.h;
                    editingDraft.startM = validSessions[0].start.m;
                    const last = validSessions[validSessions.length - 1];
                    editingDraft.endH = (last.end && last.end.h !== "") ? last.end.h : "";
                    editingDraft.endM = (last.end && last.end.m !== "") ? last.end.m : "";
                } else {
                    editingDraft.startH = ""; editingDraft.startM = "";
                    editingDraft.endH = ""; editingDraft.endM = "";
                }

                editingDraft.smokeTotalMins = (editingDraft.smokeCount || 0) * smokeMinutesPerBreak;
                const { totalPresSecs } = getSessionMetricsFromList(validSessions, null);
                editingDraft.customPresSecs = totalPresSecs > 0 ? totalPresSecs : null;

                saveDayData(editingDateStr, editingDraft);

                if (editingDateStr === getTodayStr()) {
                    todaySessions = validSessions;
                    todaySmokeCount = editingDraft.smokeCount || 0;
                    updateSmokerUI();
                    syncInputsFromSessions();
                    saveSessionsAndDay();
                    calculateAllTimes();
                }

                closeDayEditor();
                buildWeekView();
                updateAmpelPill();
                if (welcomeOverlay.classList.contains("active")) updateHomeWidgetsLiveData();
            });

            const dayShortNames = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

            function formatSecsToHhMm(secs) {
                const a = Math.abs(secs);
                const h = Math.floor(a / 3600);
                const m = Math.floor((a % 3600) / 60);
                return `${format2(h)}:${format2(m)}`;
            }

            function formatSignedSecsToHhMm(secs) {
                const sign = secs < 0 ? "-" : "+";
                return `${sign}${formatSecsToHhMm(secs)}`;
            }

            function buildWeekView(animDir = null) {
                const refDate = new Date();
                refDate.setDate(refDate.getDate() + (weekOffset * 7));
                const monday = getMonday(refDate);
                const kwNum = getCalendarWeek(monday);
                const kwYear = monday.getFullYear();

                const kwBadge = document.getElementById("week-kw-badge");
                if (kwBadge) kwBadge.textContent = `KW ${format2(kwNum)} / ${kwYear}`;

                if (btnJumpToday) btnJumpToday.classList.toggle("visible", weekOffset !== 0);

                if (weekDatePicker) {
                    weekDatePicker.value = `${monday.getFullYear()}-${format2(monday.getMonth() + 1)}-${format2(monday.getDate())}`;
                }

                const daysContainer = document.getElementById("week-days-container");
                if (!daysContainer) return;
                daysContainer.innerHTML = "";

                if (animDir === "next") {
                    daysContainer.classList.remove("anim-kw-next", "anim-kw-prev");
                    void daysContainer.offsetWidth;
                    daysContainer.classList.add("anim-kw-next");
                } else if (animDir === "prev") {
                    daysContainer.classList.remove("anim-kw-next", "anim-kw-prev");
                    void daysContainer.offsetWidth;
                    daysContainer.classList.add("anim-kw-prev");
                }

                const todayStr = getTodayStr();
                const nowSecs = getNowSecsOfDay();
                const dailySollSecs = (sollHours * 3600) + (sollMinutes * 60);

                let totalWeekWorkedSecs = 0;
                let totalWeekSollSecs = 0;

                for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                    const curDate = new Date(monday);
                    curDate.setDate(monday.getDate() + dayIdx);
                    const dateStr = `${curDate.getFullYear()}-${format2(curDate.getMonth() + 1)}-${format2(curDate.getDate())}`;
                    const isWeekend = (dayIdx >= 5);
                    const isToday = (dateStr === todayStr);

                    const holidayName = getHolidayName(dateStr);
                    const saved = getDayData(dateStr);

                    let status = "work";
                    if (holidayName) status = "holiday";
                    else if (isWeekend) status = "free";

                    if (saved && saved.status) {
                        status = saved.status;
                    }

                    let daySoll = 0;
                    if (status === "free" || isWeekend) {
                        daySoll = 0;
                    } else {
                        daySoll = dailySollSecs;
                    }

                    let dayCredited = 0;
                    let timeDisplay = "";
                    let hasTimes = false;
                    let subNote = "";
                    let badgeHtml = "";

                    if (status === "work") {
                        const bd = getDayBreakdown(saved, isToday ? nowSecs : null);
                        dayCredited = bd.netSecs;

                        if (saved && Array.isArray(saved.sessions) && saved.sessions.length > 0) {
                            hasTimes = true;
                            timeDisplay = saved.sessions.map(s => {
                                const st = s.start ? `${s.start.h}:${s.start.m}` : "--:--";
                                const en = s.end ? `${s.end.h}:${s.end.m}` : (isToday ? "läuft..." : "--:--");
                                return `${st} – ${en}`;
                            }).join(", ");
                        } else if (saved && saved.startH !== "" && saved.startH !== undefined) {
                            hasTimes = true;
                            const st = `${format2(parseInt(saved.startH, 10))}:${format2(parseInt(saved.startM, 10) || 0)}`;
                            const en = (saved.endH !== "" && saved.endH !== undefined)
                                ? `${format2(parseInt(saved.endH, 10))}:${format2(parseInt(saved.endM, 10) || 0)}`
                                : (isToday ? "läuft..." : "--:--");
                            timeDisplay = `${st} – ${en}`;
                        } else {
                            timeDisplay = "–";
                        }

                        if (bd.isLive) {
                            subNote = `<span class="live-dot"></span> aktiv gestempelt`;
                        }
                        if (saved && saved.smokeCount > 0) {
                            subNote += (subNote ? " · " : "") + `🚬 ${saved.smokeCount}×`;
                        }

                        const netHoursFormatted = (dayCredited / 3600).toFixed(2).replace(".", ",");
                        badgeHtml = `<span class="status-badge-pill" style="min-width:58px; text-align:center;">${netHoursFormatted} h</span>`;
                    } else if (status === "vacation") {
                        dayCredited = daySoll;
                        timeDisplay = "Urlaub";
                        badgeHtml = `<span class="status-badge-pill" data-status="vacation">Urlaub</span>`;
                    } else if (status === "sick") {
                        dayCredited = daySoll;
                        timeDisplay = "Krank";
                        badgeHtml = `<span class="status-badge-pill" data-status="sick">Krank</span>`;
                    } else if (status === "holiday") {
                        dayCredited = daySoll;
                        timeDisplay = holidayName || "Feiertag";
                        badgeHtml = `<span class="status-badge-pill" data-status="holiday">Feiertag</span>`;
                    } else if (status === "free") {
                        dayCredited = 0;
                        timeDisplay = "Frei";
                        badgeHtml = `<span class="status-badge-pill" style="opacity:0.65;">Frei</span>`;
                    }

                    totalWeekWorkedSecs += dayCredited;
                    totalWeekSollSecs += daySoll;

                    // Weekend row: display if today or if it has booking/custom entry
                    if (isWeekend && !isToday && !hasWeekendBooking(saved)) {
                        continue;
                    }

                    const row = document.createElement("div");
                    row.className = "week-row" + (isToday ? " is-today" : "");
                    row.innerHTML = `
                        <div class="day-label">
                            <strong>${dayFullNames[dayIdx]}</strong>
                            <span>${format2(curDate.getDate())}.${format2(curDate.getMonth() + 1)}.</span>
                        </div>
                        <div>
                            <div class="day-time-display ${hasTimes ? "" : "empty"}">${timeDisplay}</div>
                            ${subNote ? `<div class="day-status-note">${subNote}</div>` : ""}
                        </div>
                        <div>
                            ${badgeHtml}
                        </div>
                    `;

                    row.addEventListener("click", () => {
                        openDayEditor(
                            dateStr,
                            `${dayFullNames[dayIdx]}, ${format2(curDate.getDate())}.${format2(curDate.getMonth() + 1)}.${curDate.getFullYear()}`,
                            status
                        );
                    });

                    daysContainer.appendChild(row);
                }

                // Update summary boxes
                document.getElementById("output-week-worked").textContent = `${formatSecsToHhMm(totalWeekWorkedSecs)} h`;
                document.getElementById("output-week-soll").textContent = `von ${formatSecsToHhMm(totalWeekSollSecs)} h Soll`;

                const weekSaldoSecs = totalWeekWorkedSecs - totalWeekSollSecs;
                document.getElementById("output-week-total").textContent = `${formatSignedSecsToHhMm(weekSaldoSecs)} h`;

                const decVal = (weekSaldoSecs / 3600).toFixed(2).replace(".", ",");
                document.getElementById("output-week-decimal").textContent = `${weekSaldoSecs >= 0 ? "+" : ""}${decVal} h`;

                updateAmpelPill();
            }

            const pdfExportModal = document.getElementById("pdf-export-modal");
            const pdfMonthSelect = document.getElementById("pdfMonthSelect");
            const pdfUserNamePreview = document.getElementById("pdfUserNamePreview");
            const pdfAlsoBackupCheck = document.getElementById("pdfAlsoBackupCheck");

            document.getElementById("btn-open-pdf-modal").addEventListener("click", () => {
                const now = new Date();
                pdfMonthSelect.value = `${now.getFullYear()}-${format2(now.getMonth() + 1)}`;
                pdfUserNamePreview.value = userName || "";
                pdfExportModal.classList.add("active");
            });

            document.getElementById("btn-close-pdf-modal").addEventListener("click", () => {
                pdfExportModal.classList.remove("active");
            });

            document.getElementById("btn-download-month-pdf").addEventListener("click", () => {
                if (!window.jspdf || !window.jspdf.jsPDF) {
                    alert("jsPDF-Bibliothek wurde noch nicht geladen. Bitte kurz warten oder Seite aktualisieren.");
                    return;
                }

                const selectedVal = pdfMonthSelect.value;
                if (!selectedVal) return;
                const [yearStr, monthStr] = selectedVal.split("-");
                const year = parseInt(yearStr, 10);
                const month = parseInt(monthStr, 10);

                const exportName = (pdfUserNamePreview.value || userName || "Mitarbeiter").trim();
                const monthNamesDe = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
                const monthTitle = `${monthNamesDe[month - 1]} ${year}`;

                const doc = new window.jspdf.jsPDF({
                    orientation: "portrait",
                    unit: "mm",
                    format: "a4"
                });

                const pageWidth = 210;
                const margin = 12;
                const usableWidth = pageWidth - (margin * 2);

                // Header
                doc.setFillColor(31, 41, 55);
                doc.rect(margin, 10, usableWidth, 16, "F");
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.setFontSize(13);
                doc.text("STEMPELUHR — MONATSÜBERSICHT & STUNDENZETTEL", margin + 4, 17);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8.5);
                doc.text(`Monat: ${monthTitle} | Erstellt am: ${new Date().toLocaleDateString("de-DE")}`, margin + 4, 22);

                // Info Box
                doc.setTextColor(30, 41, 59);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text(`Mitarbeiter: ${exportName}`, margin, 32);
                doc.text(`Tägliches Soll (Mo–Fr): ${format2(sollHours)}:${format2(sollMinutes)} h | Woche: ${weeklyHours} h`, margin + 85, 32);

                // Table Header
                let y = 37;
                doc.setFillColor(241, 245, 249);
                doc.rect(margin, y, usableWidth, 6.5, "F");
                doc.setFont("helvetica", "bold");
                doc.setFontSize(7.5);
                doc.setTextColor(51, 65, 85);

                const cols = [
                    { title: "Datum", x: margin + 2 },
                    { title: "Tag", x: margin + 20 },
                    { title: "Status", x: margin + 33 },
                    { title: "Kommen", x: margin + 55 },
                    { title: "Gehen", x: margin + 75 },
                    { title: "Pause", x: margin + 96 },
                    { title: "Ist (h)", x: margin + 116 },
                    { title: "Soll (h)", x: margin + 136 },
                    { title: "Saldo", x: margin + 156 }
                ];
                cols.forEach(c => doc.text(c.title, c.x, y + 4.5));

                y += 6.5;

                const daysInMonth = new Date(year, month, 0).getDate();
                const dailySollSecs = (sollHours * 3600) + (sollMinutes * 60);

                let monthWorkedSecs = 0;
                let monthSollSecs = 0;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(7.5);

                for (let d = 1; d <= daysInMonth; d++) {
                    const dt = new Date(year, month - 1, d);
                    const dow = dt.getDay();
                    const dowIdx = (dow + 6) % 7;
                    const isWeekend = (dow === 0 || dow === 6);
                    const dateStr = `${year}-${format2(month)}-${format2(d)}`;

                    const saved = getDayData(dateStr);
                    const holidayName = getHolidayName(dateStr);

                    let status = "work";
                    if (holidayName) status = "holiday";
                    else if (isWeekend) status = "free";

                    if (saved && saved.status) status = saved.status;

                    let daySoll = 0;
                    if (status === "free" || isWeekend) daySoll = 0;
                    else daySoll = dailySollSecs;

                    let dayCredited = 0;
                    let comeStr = "--:--";
                    let goStr = "--:--";
                    let pauseMins = 0;

                    if (status === "work") {
                        const bd = getDayBreakdown(saved, null);
                        dayCredited = bd.netSecs;
                        pauseMins = Math.round(bd.deductSecs / 60);

                        if (saved && Array.isArray(saved.sessions) && saved.sessions.length > 0) {
                            comeStr = saved.sessions.map(s => s.start ? `${s.start.h}:${s.start.m}` : "").filter(Boolean).join(", ");
                            goStr = saved.sessions.map(s => s.end ? `${s.end.h}:${s.end.m}` : "").filter(Boolean).join(", ");
                        } else if (saved && saved.startH !== "" && saved.startH !== undefined) {
                            comeStr = `${format2(parseInt(saved.startH, 10))}:${format2(parseInt(saved.startM, 10) || 0)}`;
                            if (saved.endH !== "" && saved.endH !== undefined) {
                                goStr = `${format2(parseInt(saved.endH, 10))}:${format2(parseInt(saved.endM, 10) || 0)}`;
                            }
                        }
                    } else if (status === "vacation" || status === "sick" || status === "holiday") {
                        dayCredited = daySoll;
                    }

                    monthWorkedSecs += dayCredited;
                    monthSollSecs += daySoll;

                    const daySaldoSecs = dayCredited - daySoll;

                    if (isWeekend) {
                        doc.setFillColor(248, 250, 252);
                        doc.rect(margin, y, usableWidth, 5.2, "F");
                    } else if (d % 2 === 0) {
                        doc.setFillColor(255, 255, 255);
                        doc.rect(margin, y, usableWidth, 5.2, "F");
                    } else {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(margin, y, usableWidth, 5.2, "F");
                    }

                    doc.setDrawColor(226, 232, 240);
                    doc.line(margin, y + 5.2, margin + usableWidth, y + 5.2);

                    doc.setTextColor(isWeekend ? 100 : 30, isWeekend ? 116 : 41, isWeekend ? 139 : 59);

                    const statusLabelsMap = {
                        work: "Arbeit", vacation: "Urlaub", sick: "Krank", holiday: (holidayName || "Feiertag"), free: "Frei"
                    };

                    doc.text(`${format2(d)}.${format2(month)}.`, cols[0].x, y + 3.8);
                    doc.text(dayFullNames[dowIdx].slice(0, 2), cols[1].x, y + 3.8);
                    doc.text((statusLabelsMap[status] || status).slice(0, 12), cols[2].x, y + 3.8);
                    doc.text(comeStr || "-", cols[3].x, y + 3.8);
                    doc.text(goStr || "-", cols[4].x, y + 3.8);
                    doc.text(pauseMins > 0 ? `${pauseMins} m` : "-", cols[5].x, y + 3.8);
                    doc.text(dayCredited > 0 ? `${formatSecsToHhMm(dayCredited)} (${(dayCredited/3600).toFixed(2)})` : "-", cols[6].x, y + 3.8);
                    doc.text(daySoll > 0 ? `${formatSecsToHhMm(daySoll)}` : "-", cols[7].x, y + 3.8);

                    if (daySaldoSecs !== 0 && status === "work") {
                        doc.text(formatSignedSecsToHhMm(daySaldoSecs), cols[8].x, y + 3.8);
                    } else {
                        doc.text("-", cols[8].x, y + 3.8);
                    }

                    y += 5.2;
                }

                // Month Summary Box
                y += 3;
                doc.setFillColor(241, 245, 249);
                doc.rect(margin, y, usableWidth, 14, "F");
                doc.setDrawColor(203, 213, 225);
                doc.rect(margin, y, usableWidth, 14, "S");

                const monthSaldoSecs = monthWorkedSecs - monthSollSecs;
                const glzGesamt = computeTotalGlzHours();

                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.5);
                doc.setTextColor(15, 23, 42);

                doc.text(`Monats-Ist: ${formatSecsToHhMm(monthWorkedSecs)} h (${(monthWorkedSecs / 3600).toFixed(2)} h)`, margin + 4, y + 5.5);
                doc.text(`Monats-Soll: ${formatSecsToHhMm(monthSollSecs)} h`, margin + 68, y + 5.5);
                doc.text(`Monatssaldo: ${formatSignedSecsToHhMm(monthSaldoSecs)} h (${(monthSaldoSecs / 3600).toFixed(2)} h)`, margin + 124, y + 5.5);

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.text(`Aktueller GLZ-Gesamtstand (Ampelkonto): ${(glzGesamt >= 0 ? "+" : "") + glzGesamt.toFixed(2).replace(".", ",")} h`, margin + 4, y + 10.5);

                // Signatures
                y += 20;
                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(71, 85, 105);

                doc.line(margin, y + 8, margin + 50, y + 8);
                doc.text("Datum", margin, y + 12);

                doc.line(margin + 60, y + 8, margin + 115, y + 8);
                doc.text("Unterschrift Mitarbeiter", margin + 60, y + 12);

                doc.line(margin + 125, y + 8, margin + usableWidth, y + 8);
                doc.text("Unterschrift Vorgesetzter / Prüfung", margin + 125, y + 12);

                if (pdfAlsoBackupCheck && pdfAlsoBackupCheck.checked) {
                    exportBackupJson();
                }

                const safeName = exportName.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_");
                doc.save(`Stundenzettel_${yearStr}-${monthStr}_${safeName || "Export"}.pdf`);
                pdfExportModal.classList.remove("active");
            });

            // Gestures on App Shell (3-Screen Navigation: Menü <-> Startbildschirm <-> Woche)
            // Unterstützt Touch & Maus-Drag
            let mainDragStartX = 0;
            let mainDragStartY = 0;
            let mainDragging = false;
            const appShell = document.querySelector(".app-shell");

            function onAppDragStart(clientX, clientY, target) {
                if (!gesturesEnabled || welcomeOverlay.classList.contains("active")) return false;
                if (target.closest("input, select, textarea, button, .modal-overlay, #colorWheel, .nudge-btn, .kw-v-btn")) return false;
                mainDragging = true;
                mainDragStartX = clientX;
                mainDragStartY = clientY;
                return true;
            }

            function onAppDragEnd(clientX, clientY) {
                if (!mainDragging) return;
                mainDragging = false;
                const dx = clientX - mainDragStartX;
                const dy = clientY - mainDragStartY;
                const absX = Math.abs(dx);
                const absY = Math.abs(dy);

                if (absX > 50 && absX > absY * 1.2) {
                    if (viewClock.classList.contains("active")) {
                        if (dx > 0) {
                            returnToHomeScreen(); // Swipe RIGHT: Zurück zum Wischschirm
                        } else {
                            switchToWeekView();   // Swipe LEFT: Zur Wochenbilanz
                        }
                    } else if (viewWeek.classList.contains("active")) {
                        if (dx < 0) {
                            returnToHomeScreen(); // Swipe LEFT: Zurück zum Wischschirm
                        } else {
                            switchToClockView();  // Swipe RIGHT: Zur Stempeluhr
                        }
                    }
                } else if (dy > 65 && absY > absX * 1.25 && mainDragStartY < 120) {
                    returnToHomeScreen(); // Pull DOWN am Header: Zurück zum Wischschirm
                }
            }

            if (appShell) {
                appShell.addEventListener("touchstart", (e) => {
                    if (e.touches.length === 1) {
                        onAppDragStart(e.touches[0].clientX, e.touches[0].clientY, e.target);
                    }
                }, { passive: true });

                appShell.addEventListener("touchend", (e) => {
                    if (mainDragging && e.changedTouches.length === 1) {
                        onAppDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
                    }
                }, { passive: true });

                appShell.addEventListener("mousedown", (e) => {
                    if (e.button === 0 && onAppDragStart(e.clientX, e.clientY, e.target)) {
                        const onUp = (ev) => {
                            window.removeEventListener("mouseup", onUp);
                            onAppDragEnd(ev.clientX, ev.clientY);
                        };
                        window.addEventListener("mouseup", onUp);
                    }
                });
            }

            // Live clock update loop
            function updateLiveClock() {
                const now = new Date();
                const hrs = format2(now.getHours());
                const mins = format2(now.getMinutes());
                const secs = format2(now.getSeconds());
                const timeStr = `${hrs}:${mins}:${secs}`;
                if (liveTimeEl) liveTimeEl.textContent = timeStr;
                if (bgHourWatermark) bgHourWatermark.textContent = hrs;
                if (liveDayEl) {
                    liveDayEl.textContent = `${weekdaysFull[now.getDay()]}, ${format2(now.getDate())}.${format2(now.getMonth() + 1)}.${now.getFullYear()}`;
                }

                if (startHoursInput.value !== "" && endHoursInput.value === "") {
                    calculateWorkingTime();
                    checkPauseNotifications();
                }

                if (welcomeOverlay.classList.contains("active")) {
                    updateHomeWidgetsLiveData();
                }
            }
            setInterval(updateLiveClock, 1000);
            updateLiveClock();

            // Load saved today sessions if any
            const todayStr = getTodayStr();
            const todaySaved = getDayData(todayStr);
            if (todaySaved && Array.isArray(todaySaved.sessions) && todaySaved.sessions.length > 0) {
                todaySessions = todaySaved.sessions;
                syncInputsFromSessions();
            } else {
                try {
                    const rawSess = JSON.parse(localStorage.getItem("savedTodaySessions"));
                    if (rawSess && rawSess.date === todayStr && Array.isArray(rawSess.sessions)) {
                        todaySessions = rawSess.sessions;
                        syncInputsFromSessions();
                    }
                } catch (e) {}
            }

            renderSessionsBox();
            calculateAllTimes();
            buildWeekView();
            updateSmokerUI();
            updateSettingsNavPreviews();
            updateBackupStatusBadge();

            // PWA Service Worker registration
            if ("serviceWorker" in navigator) {
                window.addEventListener("load", () => {
                    navigator.serviceWorker.register("./sw.js").catch(() => {});
                });
            }

            // Always start on the Startbildschirm (Home-Screen mit Scribbles)
            const isCurrentlyRunning = (startHoursInput.value !== "" && endHoursInput.value === "");
            openWelcomeScreen(isCurrentlyRunning ? "go" : "come");
        });
