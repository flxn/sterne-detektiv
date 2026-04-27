import { getGoogleMapsRoot } from "../content_script";

beforeEach(() => {
  document.body.innerHTML = "";
});

test("selects the Google Maps place panel when search results also have a main region", () => {
  document.body.innerHTML = `
    <main role="main">
      <div role="feed" aria-label="Ergebnisse für karls erdbeerhof"></div>
    </main>
    <main role="main" aria-label="Karls Erlebnis-Dorf - Elstal">
      <div role="tab" aria-label="Rezensionen zu „Karls Erlebnis-Dorf - Elstal“" aria-selected="true"></div>
      <div role="img" aria-label="4,5 Sterne"></div>
    </main>
  `;

  expect(getGoogleMapsRoot()?.getAttribute("aria-label")).toBe(
    "Karls Erlebnis-Dorf - Elstal"
  );
});

test("selects an English Google Maps place panel", () => {
  document.body.innerHTML = `
    <main role="main">
      <div role="feed" aria-label="Results for doy doy restaurant"></div>
    </main>
    <main role="main" aria-label="Doy Doy Restaurant">
      <div role="tab" aria-label="Reviews for Doy Doy Restaurant" aria-selected="true"></div>
      <div role="img" aria-label="4.7 stars"></div>
    </main>
  `;

  expect(getGoogleMapsRoot()?.getAttribute("aria-label")).toBe(
    "Doy Doy Restaurant"
  );
});
