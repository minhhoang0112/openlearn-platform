# OpenQuiz reconstruction — 20 October 2026

## Target and evidence

- Public target: https://openquiz.ai/
- REA browser scenario: `ev_d1b4ed907c23bde285162cc7d0e91e3b5f5f82f6b581dd8a25e6e9dcc8a0b735`.
- Browser scenario for `/courses`: `ev_34f1e9534e4e7e48e8810cb593d704e55c87191bb4ea68b866d4b202958cd64e`.
- REA static JavaScript analysis: `ev_ff4564b15f46b7c577fdac97cb5ec8148138c84a76aea290fabd6103d00df016`.
- Shipped bundle: `/assets/index-B-PTL6ee.js`, downloaded as `research/index.js` and parsed as inert text. It is an analysis input, not imported by the reconstructed app.

## Observations

The browser capture used Chrome, a 1440 × 1000 viewport, Vietnamese locale, and a light color scheme. The landing page uses a pale gray background, system fonts, black primary buttons, outlined cards, teal accents, and a hero with a large vocabulary card and an overlapping answer panel. Social cards form a horizontal strip. Four columns list English, Chinese, Korean, and Japanese learning paths.

Nineteen course names are visible in that rendered list: five English, six HSK, three TOPIK, and five JLPT. These names are recorded in `src/data/catalog.ts`. Lesson counts and word counts in the previous mock catalog were unverified and are no longer shown.

Opening `/courses` without authentication rendered the public landing page. This establishes only the unauthenticated behavior; it does not establish what a signed-in account sees. The shipped client references curriculum, lesson-detail, learning-path, and word-set endpoints. A request to the observed production API's `/courses/available` returned HTTP 403. No authentication bypass was attempted. No actual course lesson bodies were obtained.

Static analysis is partial: dynamic relationships remain unresolved and semantic graph retention reached its limit. Some network requests remained unfinished at the end of the original browser capture. Do not claim complete backend reconstruction or complete course recovery from these observations.

## Implemented locally

- Replacement SVG book logo, favicon, and public landing layout refinements.
- `/courses` library with the observed course names, language filters, and search.
- `/courses/:id` detail view, with an explicit empty state for unavailable lesson content.
- JSON/CSV/TSV import, browser-local persistence, vocabulary preview, and JSON export.
- Selected imported data flows into the study room instead of always opening the same mock set.
- Per-set mastered-word persistence, keyboard dialog support, speech language selection, and microphone error handling without fabricated transcripts or scores.

Google/Apple OAuth, AI generation, AI pronunciation assessment, payments, server-side accounts, and the original lesson database are not connected. Landing-page feature illustrations are demonstrations, not evidence that these services are integrated.

## Verification

- A production build passed after the main implementation.
- `node scripts/verify-library.mjs` passed after the later import refinements (CSV quoting/newlines, TSV, JSON, multilingual text, invalid records, persistence, corrupt storage).
- TypeScript passed on the final source with `node --max-old-space-size=256 --max-semi-space-size=1 node_modules/typescript/bin/tsc -b`.
- The local preview returned HTTP 200.
- The local REA screenshot attempt did not complete. Subsequent final build attempts failed with host memory-allocation errors. Final visual QA and a fresh final production bundle remain to be completed when memory is available. The existing `dist` is from the earlier successful build.

## To complete the original request

Provide an authorized signed-in browser session or a course export that may be reused. Inspect the signed-in screens and lesson structure, then import the actual dataset and compare desktop/mobile screenshots. Configure independent authentication, AI, storage, and payment services as required; do not reuse the original site's private backend or credentials.
