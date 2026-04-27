import {
  GOOGLE_MAPS_REVIEW_PROFILES,
  extractReviewData,
  parseDeletedReviews,
} from "../reviewExtraction";

function createRoot(): Element {
  document.body.innerHTML = `
    <main role="main">
      <div>
        <div role="img" aria-label="4,5 Sterne"></div>
      </div>
      <table>
        <tbody>
          <tr role="img" aria-label="5 Sterne, 1.307 Rezensionen"></tr>
          <tr role="img" aria-label="4 Sterne, 253 Rezensionen"></tr>
          <tr role="img" aria-label="3 Sterne, 175 Rezensionen"></tr>
          <tr role="img" aria-label="2 Sterne, 58 Rezensionen"></tr>
          <tr role="img" aria-label="1 Stern, 10 Rezensionen"></tr>
        </tbody>
      </table>
      <div>51 bis 100 Bewertungen aufgrund von Beschwerden wegen Diffamierung entfernt.</div>
    </main>
  `;

  return document.querySelector('[role="main"]')!;
}

test("extracts German Google Maps review data", () => {
  const data = extractReviewData(createRoot());

  expect(data).toEqual({
    averageRating: 4.5,
    totalReviews: 1803,
    deletedReviews: 76,
    deletedReviewsIsLowerBound: false,
    deletedRange: { min: 51, max: 100, isLowerBound: false },
    deletionNotice:
      "51 bis 100 Bewertungen aufgrund von Beschwerden wegen Diffamierung entfernt",
    distribution: {
      1: 10,
      2: 58,
      3: 175,
      4: 253,
      5: 1307,
    },
  });
});

test("parses open-ended deleted-review notices as a lower-bound range", () => {
  expect(parseDeletedReviews("Über 250 Bewertungen entfernt.")).toEqual({
    min: 251,
    max: 375,
    isLowerBound: true,
  });
});

test("extracts English Google Maps review data", () => {
  document.body.innerHTML = `
    <main role="main">
      <div>
        <div role="img" aria-label="4.7 stars"></div>
      </div>
      <table>
        <tbody>
          <tr role="img" aria-label="5 stars, 1,958 reviews"></tr>
          <tr role="img" aria-label="4 stars, 748 reviews"></tr>
          <tr role="img" aria-label="3 stars, 77 reviews"></tr>
          <tr role="img" aria-label="2 stars, 3 reviews"></tr>
          <tr role="img" aria-label="1 stars, 11 reviews"></tr>
        </tbody>
      </table>
      <div>Over 250 reviews removed due to defamation complaints.</div>
    </main>
  `;

  const data = extractReviewData(document.querySelector('[role="main"]')!);

  expect(data).toEqual({
    averageRating: 4.7,
    totalReviews: 2797,
    deletedReviews: 313,
    deletedReviewsIsLowerBound: true,
    deletedRange: { min: 251, max: 375, isLowerBound: true },
    deletionNotice: "Over 250 reviews removed",
    distribution: {
      1: 11,
      2: 3,
      3: 77,
      4: 748,
      5: 1958,
    },
  });
});

test("parses English deleted-review ranges", () => {
  expect(
    parseDeletedReviews(
      "51 to 100 reviews removed.",
      GOOGLE_MAPS_REVIEW_PROFILES.en
    )
  ).toEqual({
    min: 51,
    max: 100,
    isLowerBound: false,
  });
});
