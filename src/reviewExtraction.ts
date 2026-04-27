export type RatingDistribution = Partial<Record<1 | 2 | 3 | 4 | 5, number>>;

export type DeletedRange = {
  min: number;
  max: number;
  isLowerBound: boolean;
};

export type ReviewData = {
  averageRating: number;
  totalReviews: number;
  deletedReviews: number;
  deletedReviewsIsLowerBound: boolean;
  deletedRange: DeletedRange;
  deletionNotice: string;
  distribution: RatingDistribution;
};

export type ReviewExtractionProfile = {
  language: string;
  locale: string;
  selectors: {
    root: string;
    reviewsTab: string;
    selectedReviewsTab: string;
    histogramRows: string;
    averageRating: string;
  };
  numberFormat: {
    integerGroupSeparators: RegExp;
    decimalSeparator: string;
  };
  patterns: {
    deletionNotice: RegExp;
    averageRating: RegExp;
    histogramRow: RegExp;
    deletedRange: RegExp;
    deletedLowerBound: RegExp;
    deletedSingle: RegExp;
  };
  textSearch: {
    maxAncestorDepth: number;
    maxNoticeTextLength: number;
  };
  openEndedRangeWidth: number;
};

export type ExtractReviewDataOptions = {
  ignoredSelector?: string;
};

export const GOOGLE_MAPS_REVIEW_PROFILES = {
  de: {
    language: "de",
    locale: "de-DE",
    selectors: {
      root: '[role="main"]',
      reviewsTab: '[role="tab"][aria-label^="Rezensionen zu"]',
      selectedReviewsTab:
        '[role="tab"][aria-selected="true"][aria-label^="Rezensionen zu"]',
      histogramRows: 'table tr[role="img"][aria-label*="Rezensionen"]',
      averageRating: 'div[role="img"][aria-label$="Sterne"]',
    },
    numberFormat: {
      integerGroupSeparators: /[.\s]/g,
      decimalSeparator: ",",
    },
    patterns: {
      deletionNotice:
        /(?:über\s+|mehr\s+als\s+)?[\d.\s]+(?:\s+bis\s+[\d.\s]+)?\s+Bewertungen?[\s\S]{0,180}?entfernt/i,
      averageRating: /^([\d,.]+)\s+Sterne/i,
      histogramRow: /^(\d+)\s+Sterne?,\s*([\d.\s]+)\s+Rezensionen/i,
      deletedRange: /([\d.\s]+)\s+bis\s+([\d.\s]+)/i,
      deletedLowerBound: /(?:^|\D)(?:über|mehr\s+als)\s+([\d.\s]+)/i,
      deletedSingle: /^([\d.\s]+)/,
    },
    textSearch: {
      maxAncestorDepth: 3,
      maxNoticeTextLength: 320,
    },
    openEndedRangeWidth: 125,
  },
} satisfies Record<string, ReviewExtractionProfile>;

export const DEFAULT_REVIEW_EXTRACTION_PROFILE = GOOGLE_MAPS_REVIEW_PROFILES.de;

export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseLocalizedInt(
  value: string,
  profile: ReviewExtractionProfile = DEFAULT_REVIEW_EXTRACTION_PROFILE
): number {
  return Number(value.replace(profile.numberFormat.integerGroupSeparators, ""));
}

export function parseLocalizedFloat(
  value: string,
  profile: ReviewExtractionProfile = DEFAULT_REVIEW_EXTRACTION_PROFILE
): number {
  return Number(
    value
      .replace(profile.numberFormat.integerGroupSeparators, "")
      .replace(profile.numberFormat.decimalSeparator, ".")
  );
}

export function parseDeletedReviews(
  notice: string,
  profile: ReviewExtractionProfile = DEFAULT_REVIEW_EXTRACTION_PROFILE
): DeletedRange | null {
  const normalized = normalizeText(notice);
  const rangeMatch = normalized.match(profile.patterns.deletedRange);

  if (rangeMatch) {
    const min = parseLocalizedInt(rangeMatch[1], profile);
    const max = parseLocalizedInt(rangeMatch[2], profile);

    if (Number.isFinite(min) && Number.isFinite(max)) {
      return { min, max, isLowerBound: false };
    }
  }

  const lowerBoundMatch = normalized.match(profile.patterns.deletedLowerBound);

  if (lowerBoundMatch) {
    const parsed = parseLocalizedInt(lowerBoundMatch[1], profile);

    if (Number.isFinite(parsed)) {
      return {
        min: parsed + 1,
        max: parsed + profile.openEndedRangeWidth,
        isLowerBound: true,
      };
    }
  }

  const singleMatch = normalized.match(profile.patterns.deletedSingle);

  if (!singleMatch) {
    return null;
  }

  const parsed = parseLocalizedInt(singleMatch[1], profile);
  return Number.isFinite(parsed)
    ? { min: parsed, max: parsed, isLowerBound: false }
    : null;
}

function findDeletionNotice(
  root: Element,
  profile: ReviewExtractionProfile,
  ignoredSelector?: string
): string {
  const ownerDocument = root.ownerDocument;
  const showText = ownerDocument.defaultView?.NodeFilter.SHOW_TEXT ?? 4;
  const walker = ownerDocument.createTreeWalker(root, showText);
  let node = walker.nextNode();

  while (node) {
    let element = node.parentElement;

    for (
      let depth = 0;
      element && depth < profile.textSearch.maxAncestorDepth;
      depth += 1
    ) {
      if (ignoredSelector && element.closest(ignoredSelector)) {
        break;
      }

      const text = normalizeText(element.textContent);

      if (text.length <= profile.textSearch.maxNoticeTextLength) {
        const match = text.match(profile.patterns.deletionNotice);

        if (match) {
          return match[0];
        }
      }

      element = element.parentElement;
    }

    node = walker.nextNode();
  }

  return "";
}

function parseHistogram(
  root: Element,
  profile: ReviewExtractionProfile
): RatingDistribution {
  const distribution: RatingDistribution = {};

  root.querySelectorAll(profile.selectors.histogramRows).forEach((row) => {
    const label = normalizeText(row.getAttribute("aria-label"));
    const match = label.match(profile.patterns.histogramRow);

    if (!match) {
      return;
    }

    const stars = Number(match[1]) as 1 | 2 | 3 | 4 | 5;
    const reviews = parseLocalizedInt(match[2], profile);

    if (stars >= 1 && stars <= 5 && Number.isFinite(reviews)) {
      distribution[stars] = reviews;
    }
  });

  return distribution;
}

export function extractReviewData(
  root: Element,
  profile: ReviewExtractionProfile = DEFAULT_REVIEW_EXTRACTION_PROFILE,
  options: ExtractReviewDataOptions = {}
): ReviewData | null {
  const averageLabel = normalizeText(
    root
      .querySelector(profile.selectors.averageRating)
      ?.getAttribute("aria-label")
  );
  const averageMatch = averageLabel.match(profile.patterns.averageRating);
  const averageRating = averageMatch
    ? parseLocalizedFloat(averageMatch[1], profile)
    : NaN;
  const distribution = parseHistogram(root, profile);
  const totalReviews = Object.values(distribution).reduce(
    (sum, value) => sum + (value ?? 0),
    0
  );
  const deletionNotice = findDeletionNotice(
    root,
    profile,
    options.ignoredSelector
  );
  const deletedRange = parseDeletedReviews(deletionNotice, profile);

  if (
    !Number.isFinite(averageRating) ||
    totalReviews <= 0 ||
    deletedRange === null ||
    deletedRange.max <= 0
  ) {
    return null;
  }

  return {
    averageRating,
    totalReviews,
    deletedReviews: Math.ceil((deletedRange.min + deletedRange.max) / 2),
    deletedReviewsIsLowerBound: deletedRange.isLowerBound,
    deletedRange,
    deletionNotice,
    distribution,
  };
}
