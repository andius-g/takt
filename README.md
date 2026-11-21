# Stempeluhr (PWA)

Eine moderne, progressive Web-App zur mobilen Arbeitszeiterfassung mit widgetbasiertem Startbildschirm, automatischen Pausenabzügen, Gleitzeit-Ampelkonto (GBV § 5) und PDF-Monatsexport.

---

## 📁 Projektstruktur

```text
stempeluhr/
├── index.html                   # Haupt-Einstiegsseite (PWA Shell)
├── style.css                    # Gesamte Stylesheets, Themes & Animationen
├── app.js                       # Vollständige Applikations- & Berechnungslogik
├── sw.js                        # Service Worker für Offline-Fähigkeit & Caching
├── manifest.json                # Web App Manifest für Installation (iOS / Android / Desktop)
├── favicon.png                  # App-Icon (64x64)
├── icon-192.png                 # PWA-Icon (192x192)
├── icon-512.png                 # PWA-Icon (512x512)
├── stempeluhr.standalone.html   # Einzeldatei-Version (läuft direkt ohne Webserver via file://)
└── README.md                    # Dokumentation
```

---

## 🚀 Starten & Ausführen

### Option A: Über einen lokalen Webserver (Empfohlen für PWA & Service Worker)
Da Browser Service Worker und PWA-Funktionen aus Sicherheitsgründen nur über `http://` oder `https://` ausführen, empfiehlt sich ein lokaler Webserver:

```bash
# Mit Python (standardmäßig auf macOS vorhanden):
cd /Users/andreas/.gemini/antigravity/scratch/stempeluhr
python3 -m http.server 8000
```
Anschließend im Browser öffnen: **`http://localhost:8000`**

### Option B: Direkt im Browser (Standalone)
Die Datei `stempeluhr.standalone.html` bündelt HTML, CSS und JavaScript in einer einzigen autarken Datei und kann per Doppelklick direkt im Browser geöffnet werden (auch ohne Webserver).

---

## ✨ Funktionsübersicht

1. **Vollbild-Home-Screen mit Widget-Baukasten & Scribbles**
   - Animierte Doodles/Scribbles (Blitz, Schleife, Stern, Spirale, Wolke, Kaffee, Krone, Herz, etc.) mit Interaktion.
   - Frei konfigurierbare Widgets (Kommen/Gehen-Action, Live-Uhr, Schnelltippen, Pausen-Rechner, Tagessaldo, Ampelstand, Raucherzähler, Undo).
   - 4-Richtungs-Wischgesten:
     - **↑ Wischen:** Modus Kommen
     - **↓ Wischen:** Modus Gehen
     - **← Wischen:** Menü / Zeiterfassung
     - **→ Wischen:** Wochenbilanz

2. **Stempeluhr & Mehrfach-Zeitblöcke**
   - Einstempeln („Kommen“) und Ausstempeln („Gehen“) mit Sekundengenauigkeit.
   - Automatische Erkennung und Anzeige mehrerer Zeitblöcke pro Tag (inkl. Unterbrechungs-/Pausenzeiten).
   - Undo-Funktion (bis zu 20 Schritte rückgängig machen).
   - Optionaler Raucherpausen-Zähler mit einstellbarer Minuten-Dauer pro Gang.

3. **Gesetzliche Pausen & Push-Vorwarnungen**
   - Automatische Abzugsberechnung (30 Min ab 6:30 Std, 45 Min ab 9:45 Std Anwesenheit).
   - Feierabend-Rechner (ohne Pause, 30 Min-Bereich, 45 Min-Grenze).
   - Push-Benachrichtigung 10 Min vor Erreichen der Pausenschwellen.

4. **Wochenbilanz & Kalenderwochen (KW)**
   - Übersicht aller Wochentage mit Anzeige von Ist, Soll und Saldo.
   - KW-Navigation (Vor/Zurück, Sprung zu aktuellem Datum).
   - Schnelles Nachtragen von Wochenend-Arbeitstagen (Samstag / Sonntag).
   - Detaillierter Tages-Editor mit Feineinstellung (+/- 1 Min, +/- 5 Min) und Statuswahl (Arbeit, Urlaub, Krank, Feiertag, Frei).

5. **Gleitzeit-Ampelkonto (GBV § 5)**
   - Farbige Ampel-Status-Pille (Grün, Gelb, Rot) mit verbleibenden Pufferstunden.
   - Skalierung anhand der vereinbarten Wochenarbeitszeit (z. B. 40h-Basis).
   - Einstellbarer Startsaldo und Stichtag.

6. **Druckfertiger PDF-Monatsexport (DIN A4)**
   - Druckfertiger Monats-Stundenzettel mit Monats-Ist, Monats-Soll, Monatssaldo und Unterschriftsfeldern.
   - Integriertes automatisches JSON-Backup beim PDF-Download.

7. **Design & Farbharmonien**
   - 120° triadisches Farbrad zur stufenlosen Anpassung aller UI-Farben.
   - Umschaltbar zwischen **Klassisch** und **Asymmetrisch & Organisch** (mit Intensitätsregler).
   - Dunkle Menüleiste und automatische Anpassung der Browser-Theme-Farbe.
