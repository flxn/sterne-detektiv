# SterneDetektiv

Chrome-Erweiterung, die im Rezensionen-Tab eines Google-Maps-Eintrags die sichtbare Sterneanzeige durch einen SterneDetektiv Score ersetzt.

Der Score behandelt die von Google gemeldeten gelöschten Bewertungen als 1-Stern-Bewertungen:

```text
SterneDetektiv Score = (Anzahl Bewertungen * aktuelle Sterne + gelöschte Bewertungen) / (Anzahl Bewertungen + gelöschte Bewertungen)
```

Wenn Google eine Spanne meldet, z. B. `51 bis 100 Bewertungen ... entfernt`, nutzt die Erweiterung den Mittelwert dieser Spanne.

Zusätzlich wird unter dem 1-Stern-Balken ein blauer Balken für gelöschte Bewertungen angezeigt.

## Build

```bash
npm install
npm run build
```

## In Chrome Laden

1. `chrome://extensions` öffnen.
2. Entwicklermodus aktivieren.
3. `Load unpacked` / `Entpackte Erweiterung laden` wählen.
4. Den Ordner `dist` aus diesem Projekt auswählen.

## Selektoren

Die aktuell ermittelten Google-Maps-Selektoren sind in `docs/google-maps-review-selectors.md` dokumentiert.

Die Extraktionslogik liegt in `src/reviewExtraction.ts`. Neue Sprachen oder geänderte Google-Maps-Strukturen sollten dort als neues `ReviewExtractionProfile` ergänzt werden, damit Rendering und DOM-Integration im Content Script getrennt bleiben.
