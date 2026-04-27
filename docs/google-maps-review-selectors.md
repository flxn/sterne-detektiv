# Google Maps Review Selectors

These selectors were verified against the Google Maps reviews tab for the example place URL on 2026-04-27.

Prefer ARIA/text-based selectors over Google Maps generated classes. Classes such as `BHOKXe`, `YTkVxc`, and `zpEcLb` are implementation details and may change.

## Stable Anchors

```css
/* Reviews tab */
[role="tab"][aria-label^="Rezensionen zu"]

/* Rating histogram rows */
[role="main"] table tr[role="img"][aria-label*="Rezensionen"]

/* Average visible star rating */
[role="main"] div[role="img"][aria-label$="Sterne"]

/* Removed-reviews notice */
[role="main"] div:has(> div > button[aria-label="Details"]) > div:first-child
```

## Example Values

```json
{
  "avgRating": 4.5,
  "totalReviews": 1803,
  "distribution": {
    "5": 1307,
    "4": 253,
    "3": 175,
    "2": 58,
    "1": 10
  },
  "deletionNotice": "51 bis 100 Bewertungen aufgrund von Beschwerden wegen Diffamierung entfernt."
}
```

The removed-reviews notice currently exposes a range. SterneDetektiv uses the arithmetic mean of that range as the deleted review count.
