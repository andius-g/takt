# Stempeluhr (PWA) v1.22

Eine moderne, progressive Web-App zur mobilen Arbeitszeiterfassung mit widgetbasiertem Startbildschirm, animierten Scribbles, automatischen Pausenabzügen, Gleitzeit-Ampelkonto (GBV § 5) und PDF-Monatsexport.

---

## 📁 Projektstruktur

```text
stempeluhr/
├── index.html                   # Haupt-Einstiegsseite (PWA Shell) mit Home-Navigation
├── style.css                    # Gesamte Stylesheets, Themes & Animationen
├── app.js                       # Vollständige Applikations-, Berechnungs- & Navigationslogik
├── sw.js                        # Service Worker für Offline-Fähigkeit & Caching (v1.22)
├── manifest.json                # Web App Manifest für Installation (iOS / Android / Desktop)
├── favicon.png                  # App-Icon (64x64)
├── icon-192.png                 # PWA-Icon (192x192)
├── icon-512.png                 # PWA-Icon (512x512)
├── stempeluhr.standalone.html   # Autarke Einzeldatei (läuft direkt via file://)
└── README.md                    # Dokumentation
```

---

## 🧭 Navigation zwischen den Bildschirmen

Die App besitzt drei Hauptansichten, zwischen denen du sowohl per Button als auch per Wischgeste nahtlos wechseln kannst:

```
[ Stempeluhr / Menü ]  <═════>  [ Startbildschirm (Home & Scribbles) ]  <═════>  [ Wochenbilanz ]
```

### 1. Auf dem Startbildschirm (Home & Scribbles):
* **Wischen nach links (`←`):** Öffnet das **Stempelmenü** (Zeiterfassung / Zeitblöcke).
* **Wischen nach rechts (`→`):** Öffnet die **Wochenbilanz** (Kalenderwoche).
* **Wischen nach oben (`↑`):** Schaltet auf Modus **Kommen**.
* **Wischen nach unten (`↓`):** Schaltet auf Modus **Gehen**.
* **Klick auf das Widget `Menü →`:** Wechselt direkt ins Menü.
* **Klick auf das Widget `Stempel-Action`:** Stempelt sofort (Kommen oder Gehen).
* **Klick auf die Modus-Pille oben:** Schaltet zwischen Kommen und Gehen um.

### 2. In der Haupt-App (Stempelmenü & Wochenbilanz):
* **Home-Button (`⌂`) im Header:** Bringt dich **jederzeit direkt zurück auf den Startbildschirm** mit deinen Scribbles!
* **Klick auf den Titel „Stempeluhr“:** Bringt dich ebenfalls direkt zum Startbildschirm.
* **Wischgeste zurück zum Startbildschirm:**
  * Im Stempelmenü: **Wischen nach rechts (`→`)** führt zurück zum Startbildschirm.
  * In der Wochenbilanz: **Wischen nach links (`←`)** führt zurück zum Startbildschirm.
  * Von ganz oben nach unten ziehen (Pull-Down): Führt ebenfalls zurück zum Startbildschirm.
* **Wechseln zwischen Menü & Woche:**
  * Im Header: Klick auf das Kalender-/Uhr-Icon (`btn-toggle-view`).
  * Per Geste: Im Menü nach links wischen (`←`) bzw. in der Woche nach rechts wischen (`→`).

---

## 🚀 Starten & Ausführen

### Lokaler Webserver (PWA-Betrieb):
```bash
cd /Users/andreas/.gemini/antigravity/scratch/stempeluhr
python3 -m http.server 8000
```
Anschließend im Browser öffnen: **`http://localhost:8000`**

### GitHub Pages / Smartphone-Installation:
1. Den Inhalt des Ordners in dein GitHub-Repository pushen.
2. In den Repository-Einstellungen unter **Pages** den Branch `main` (Root `/`) auswählen.
3. Auf dem Smartphone aufrufen und im Browsermenü auf **„Zum Home-Bildschirm hinzufügen“** tippen.
4. *Hinweis zum PWA-Cache:* Nach einem Update in den Einstellungen der App auf **„↻ Update erzwingen“** tippen, um sofort die neuste Version (v1.22) zu laden.
