<p align="center">
  <img src="public/logo256.png" alt="SterneDetektiv Logo" width="128" height="128">
</p>

<h1 align="center">SterneDetektiv</h1>

<p align="center">
  Chrome-Erweiterung, die gelöschte Google-Maps-Bewertungen sichtbar macht und in einen ehrlicheren Score einrechnet.
</p>

<p align="center">
  <a href="https://flxn.de/sternedetektiv">Website</a>
</p>

![SterneDetektiv Score im Google-Maps-Rezensionen-Tab](_assets/screen1.png)

Der Score behandelt die von Google gemeldeten gelöschten Bewertungen als 1-Stern-Bewertungen:

```text
SterneDetektiv Score = (Anzahl Bewertungen * aktuelle Sterne + gelöschte Bewertungen) / (Anzahl Bewertungen + gelöschte Bewertungen)
```

Wenn Google eine Spanne meldet, z. B. `51 bis 100 Bewertungen ... entfernt`, nutzt die Erweiterung den Mittelwert dieser Spanne.

Zusätzlich wird unter dem 1-Stern-Balken ein blauer Balken für gelöschte Bewertungen angezeigt.

## Screenshots

| Mittelwert | Größerer Datensatz |
| --- | --- |
| ![SterneDetektiv Mittelwert mit Löschquote](_assets/screen1.png) | ![SterneDetektiv bei vielen Rezensionen](_assets/screen2.png) |

| Wertebereich | Hinweis im Übersichts-Tab |
| --- | --- |
| ![SterneDetektiv Wertebereich für gelöschte Bewertungen](_assets/screen3.png) | ![SterneDetektiv Hinweis zum Öffnen des Rezensionen-Tabs](_assets/screen4.png) |

## Build

```bash
npm install
npm run build
```

## In Chrome Laden

1. Rechts in der Seitenleiste den aktuellen Release auswählen.
2. Die `sternedetektiv.zip`-Datei herunterladen und entpacken.
4. `chrome://extensions` öffnen.
5. Entwicklermodus aktivieren.
6. `Load unpacked` / `Entpackte Erweiterung laden` wählen.
7. Den entpackten Ordner auswählen.

## Selektoren

Die aktuell ermittelten Google-Maps-Selektoren sind in `docs/google-maps-review-selectors.md` dokumentiert.

Die Extraktionslogik liegt in `src/reviewExtraction.ts`. Neue Sprachen oder geänderte Google-Maps-Strukturen sollten dort als neues `ReviewExtractionProfile` ergänzt werden, damit Rendering und DOM-Integration im Content Script getrennt bleiben.
