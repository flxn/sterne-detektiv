import {
  DEFAULT_REVIEW_EXTRACTION_PROFILE,
  extractReviewData,
  type ReviewData,
} from "./reviewExtraction";

type ScoreMode = "midpoint" | "range";

const SCORE_CLASS = "sterne-detektiv-score";
const DELETED_ROW_CLASS = "sterne-detektiv-deleted-row";
const OVERVIEW_NOTICE_CLASS = "sterne-detektiv-overview-notice";
const READY_ATTRIBUTE = "data-sterne-detektiv-ready";
const READY_FALLBACK_MS = 1500;
const SCORE_MODE_STORAGE_KEY = "sterne-detektiv-score-mode";
const EXTRACTION_PROFILE = DEFAULT_REVIEW_EXTRACTION_PROFILE;
const ROOT_SELECTOR = EXTRACTION_PROFILE.selectors.root;
const HISTOGRAM_ROW_SELECTOR = EXTRACTION_PROFILE.selectors.histogramRows;
const AVERAGE_RATING_SELECTOR = EXTRACTION_PROFILE.selectors.averageRating;
const REVIEWS_TAB_SELECTOR = EXTRACTION_PROFILE.selectors.reviewsTab;
const SELECTED_REVIEWS_TAB_SELECTOR =
  EXTRACTION_PROFILE.selectors.selectedReviewsTab;
const EXTRACTION_IGNORE_SELECTOR = `.${SCORE_CLASS}, .${DELETED_ROW_CLASS}`;

let scheduled = false;
let readyFallbackTimer: number | null = null;
let scoreMode: ScoreMode = readScoreMode();

function readScoreMode(): ScoreMode {
  try {
    const stored = window.localStorage.getItem(SCORE_MODE_STORAGE_KEY);
    return stored === "range" ? "range" : "midpoint";
  } catch {
    return "midpoint";
  }
}

function writeScoreMode(mode: ScoreMode): void {
  try {
    window.localStorage.setItem(SCORE_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore (private mode etc.)
  }
}

function markReady(root: Element): void {
  root.setAttribute(READY_ATTRIBUTE, "true");

  if (readyFallbackTimer !== null) {
    window.clearTimeout(readyFallbackTimer);
    readyFallbackTimer = null;
  }
}

function scheduleReadyFallback(root: Element): void {
  if (readyFallbackTimer !== null || root.hasAttribute(READY_ATTRIBUTE)) {
    return;
  }

  readyFallbackTimer = window.setTimeout(() => {
    readyFallbackTimer = null;
    markReady(root);
  }, READY_FALLBACK_MS);
}

function formatScore(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });
}

function formatReviewCount(value: number): string {
  return Math.round(value).toLocaleString("de-DE");
}

function formatDeletedReviewCount(value: number): string {
  return value.toLocaleString("de-DE", {
    maximumFractionDigits: 1,
  });
}

function formatDeletedReviewsLabel(data: ReviewData): string {
  const formatted = formatDeletedReviewCount(data.deletedReviews);
  return data.deletedReviewsIsLowerBound ? `≥${formatted}` : formatted;
}

function formatDeletionRate(rate: number, isLowerBound: boolean): string {
  const digits = rate >= 10 ? 0 : 1;
  const formatted = `${rate.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} %`;
  return isLowerBound ? `≥${formatted}` : formatted;
}

function calculateScoreForCount(
  data: ReviewData,
  deletedCount: number
): number {
  return (
    (data.totalReviews * data.averageRating + deletedCount * 1) /
    (data.totalReviews + deletedCount)
  );
}

function calculateScore(data: ReviewData): number {
  return calculateScoreForCount(data, data.deletedReviews);
}

function calculateScoreRange(data: ReviewData): { low: number; high: number } {
  // More deleted reviews → lower score (since deleted are counted as 1★).
  // High end of range = fewest deletions, Low end = most deletions.
  const high = calculateScoreForCount(data, data.deletedRange.min);
  const low = calculateScoreForCount(data, data.deletedRange.max);
  return { low, high };
}

function formatScoreOneDecimal(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function isReviewsTabSelected(root: Element): boolean {
  return Boolean(root.querySelector(SELECTED_REVIEWS_TAB_SELECTOR));
}

function getReviewsTab(root: Element): HTMLElement | null {
  return root.querySelector(REVIEWS_TAB_SELECTOR);
}

export function getGoogleMapsRoot(): Element | null {
  const roots = [...document.querySelectorAll(ROOT_SELECTOR)];
  return (
    roots.find((root) => root.querySelector(REVIEWS_TAB_SELECTOR)) ??
    roots.find((root) => root.querySelector(AVERAGE_RATING_SELECTOR)) ??
    roots[0] ??
    null
  );
}

function renderScore(root: Element, data: ReviewData): void {
  const score = calculateScore(data);
  const range = calculateScoreRange(data);
  const deletionRate = (data.deletedReviews / data.totalReviews) * 100;
  const existingScore = root.querySelector(`.${SCORE_CLASS}`);
  const ratingSummary =
    existingScore?.parentElement ??
    root.querySelector(AVERAGE_RATING_SELECTOR)?.parentElement;

  if (!ratingSummary) {
    return;
  }

  ratingSummary.querySelector(`.${SCORE_CLASS}`)?.remove();

  const isRange = scoreMode === "range";
  const valueHtml = isRange
    ? `<span class="sterne-detektiv-range">${formatScoreOneDecimal(
        range.low
      )}<span class="sterne-detektiv-range-sep">–</span>${formatScoreOneDecimal(
        range.high
      )}</span>`
    : `${
        data.deletedReviewsIsLowerBound
          ? '<span class="sterne-detektiv-bound">~</span>'
          : ""
      }${formatScore(score)}`;

  const ariaLabel = isRange
    ? `SterneDetektiv Score zwischen ${formatScoreOneDecimal(
        range.low
      )} und ${formatScoreOneDecimal(
        range.high
      )} Sternen. Originale Google-Bewertung ${formatScore(
        data.averageRating
      )} Sterne. Klicken, um zum Mittelwert zu wechseln.`
    : `SterneDetektiv Score ${formatScore(
        score
      )} Sterne. Originale Google-Bewertung ${formatScore(
        data.averageRating
      )} Sterne. Klicken, um den Wertebereich anzuzeigen.`;

  const modeHint = isRange
    ? "Bereich · zum Wechseln klicken"
    : "Mittelwert · zum Wechseln klicken";

  const scoreElement = document.createElement("div");
  scoreElement.className = SCORE_CLASS;
  scoreElement.innerHTML = `
    <div class="sterne-detektiv-label">SterneDetektiv</div>
    <button
      type="button"
      class="sterne-detektiv-value sterne-detektiv-value--${
        isRange ? "range" : "midpoint"
      }"
      aria-label="${ariaLabel}"
      title="${modeHint}"
    >${valueHtml}<span class="sterne-detektiv-original-rating">Original: ${formatScore(
    data.averageRating
  )}</span></button>
    <div class="sterne-detektiv-meta">
      ${formatReviewCount(
        data.totalReviews
      )} Bewertungen + ${formatDeletedReviewsLabel(data)} gelöschte Bewertungen
    </div>
    <div class="sterne-detektiv-rate" title="Anteil gelöschter Bewertungen an sichtbaren Bewertungen">
      <span class="sterne-detektiv-rate-value">${formatDeletionRate(
        deletionRate,
        data.deletedReviewsIsLowerBound
      )}</span>
      <span class="sterne-detektiv-rate-label">Löschquote</span>
    </div>
  `;

  scoreElement
    .querySelector(".sterne-detektiv-value")
    ?.addEventListener("click", () => {
      scoreMode = scoreMode === "range" ? "midpoint" : "range";
      writeScoreMode(scoreMode);
      renderScore(root, data);
    });

  ratingSummary.replaceChildren(scoreElement);
  ratingSummary.setAttribute("aria-label", ariaLabel);
}

function renderOverviewNotice(root: Element): void {
  const existingNotice = root.querySelector(`.${OVERVIEW_NOTICE_CLASS}`);

  if (isReviewsTabSelected(root)) {
    existingNotice?.remove();
    return;
  }

  const reviewsTab = getReviewsTab(root);
  const tabList = reviewsTab?.closest('[role="tablist"]');

  if (!reviewsTab || !tabList || existingNotice) {
    return;
  }

  const notice = document.createElement("div");
  notice.className = OVERVIEW_NOTICE_CLASS;
  notice.innerHTML = `
    <img class="sterne-detektiv-overview-logo" src="${chrome.runtime.getURL(
      "logo32.png"
    )}" alt="" aria-hidden="true">
    <div class="sterne-detektiv-overview-copy">
      <strong>SterneDetektiv</strong>
      <span>Öffne den Rezensionen-Tab, damit gelöschte Bewertungen ausgelesen werden können.</span>
    </div>
    <button class="sterne-detektiv-overview-button" type="button">Rezensionen öffnen</button>
  `;
  notice
    .querySelector(".sterne-detektiv-overview-button")
    ?.addEventListener("click", () => reviewsTab.click());
  tabList.insertAdjacentElement("afterend", notice);
}

function renderDeletedBar(root: Element, data: ReviewData): void {
  const histogramBody = root.querySelector(
    `${HISTOGRAM_ROW_SELECTOR}`
  )?.parentElement;

  if (!histogramBody) {
    return;
  }

  histogramBody.querySelector(`.${DELETED_ROW_CLASS}`)?.remove();

  const maxReviews = Math.max(
    data.deletedReviews,
    ...Object.values(data.distribution).map((value) => value ?? 0)
  );
  const percentage =
    maxReviews > 0 ? (data.deletedReviews / maxReviews) * 100 : 0;
  const row = document.createElement("tr");
  row.className = DELETED_ROW_CLASS;
  row.setAttribute("role", "img");
  row.setAttribute(
    "aria-label",
    `${formatDeletedReviewsLabel(data)} gelöschte Bewertungen`
  );
  row.innerHTML = `
    <td class="sterne-detektiv-deleted-label" role="presentation"></td>
    <td class="sterne-detektiv-deleted-cell" role="presentation">
      <div class="sterne-detektiv-deleted-track">
        <div class="sterne-detektiv-deleted-fill" style="padding-left: ${percentage}%;"></div>
      </div>
    </td>
  `;

  histogramBody.append(row);
}

function applySterneDetektiv(): void {
  scheduled = false;

  if (!location.pathname.includes("/maps/")) {
    return;
  }

  const root = getGoogleMapsRoot();

  if (!root) {
    return;
  }

  scheduleReadyFallback(root);

  renderOverviewNotice(root);

  if (!isReviewsTabSelected(root)) {
    // Overview tab: nothing to render in the rating area, fade in immediately
    // so the user isn't staring at a blank header.
    markReady(root);
    return;
  }

  const data = extractReviewData(root, EXTRACTION_PROFILE, {
    ignoredSelector: EXTRACTION_IGNORE_SELECTOR,
  });

  if (!data) {
    return;
  }

  renderScore(root, data);
  renderDeletedBar(root, data);
  markReady(root);
}

function scheduleApply(): void {
  if (scheduled) {
    return;
  }

  scheduled = true;
  window.setTimeout(applySterneDetektiv, 250);
}

scheduleApply();

const observer = new MutationObserver(scheduleApply);
observer.observe(document.body, {
  childList: true,
  subtree: true,
});
