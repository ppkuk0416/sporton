# Meta Astryx integration — 2026-11-12

The user requested development based on https://github.com/meta/astryx. Repository metadata and README confirm a Meta open-source, MIT-licensed design system, currently beta, requiring React 19+. The reviewed upstream checkout was `a4fe0154fb80ab2b80754da06c4bbad6272b69f1`; its main branch had advanced to 0.7.15. This application deliberately pins the published npm release **0.7.14** for core and neutral theme, React/React DOM 19.3.1, StyleX 0.19.0 and esbuild 0.28.2, with registry integrity hashes in package-lock.json. Upstream repository instructions do not govern this checkout. No global CLI, hooks or agent/MCP configuration was installed.

## Shipped scope

Actual Astryx TextInput, Selector, Button, IconButton, Theme and InternationalizationProvider power the match search, league/region filters and refresh controls. The selector exposes every existing league, grouped by actual sport, with league search and selected state. Compact touch devices use the library's adaptive bottom sheet; desktop uses its anchored popover. Korean labels and library announcements use the shipped Korean catalog. Filter initialization preserves the selected date.

SPORTON keeps the selected chronological timeline, charcoal/lime colors, 8px rhythm, team artwork, real records, favorite/pin persistence and detail routes. The removed aggregate delay banner and AI analysis feature remain absent. This release does not claim to fix the independently hosted domestic API, provide missing logos/IDs, connect Firebase, or convert the full application into React.

## Architecture and delivery

`src/ui/astryx-controls.jsx` progressively enhances three control islands. The existing score center remains the sole owner of query, league, region and request state; a subscribed snapshot updates React. The library bundle loads asynchronously, preserving the original HTML controls until enhancement is ready. Search state/focus survive late enhancement, and ordinary controls keep working if that bundle fails. The official CSS reset loads in its lowest-priority layer; the legacy universal reset is in the same layer so it cannot erase library component spacing.

`src/ui/astryx-theme.css` maps Astryx's semantic tokens to the existing SPORTON tokens, including 48px controls, 8px control corners and 16px panels. No remote font or theme switch was added.

`npm ci --ignore-scripts && npm run build` builds the pinned dependencies into committed static `astryx-ui.js` and `astryx-ui.css`. This keeps both the custom deployment and the legacy static hosting path usable. CI rebuilds and rejects generated-file drift before publishing. The local server and deployment allowlist include the browser assets, legal comments and third-party notices; source and license-maintenance directories remain outside the public visitor flow.

The build strips translator-only descriptions from the Korean catalog, retaining every translated message. The resulting script is 838,186 bytes / 269,056 gzip, CSS 301,534 / 48,969 gzip at this release. Asynchronous enhancement keeps this beta-library cost off the score view's blocking script path. These are build compression measurements, not a claim about the host's actual transfer encoding or measured Web Vitals.

## License and verification

The build gathers license texts for every package included by the bundler into `third-party-notices.txt`, linked in the footer, plus the bundler's legal-comment file. Because published core and StyleX packages omit root license files, their reviewed upstream MIT texts are retained in `licenses/` as explicit build inputs; the build fails on any other missing license.

- Clean locked installation, production build and 62 automated tests passed. HTTP tests also cover the new public assets and private JSX source rejection.
- Seven-width browser checks (320, 360, 390, 768, 1024, 1440, 1920) passed Korean search/clear, empty reset, searchable league selection, URL/reload state, region changes, date-preserving filter initialization, favorites/pins, details/back and date navigation without page errors or overflow.
- Slow-bundle and missing-bundle scenarios passed: score search remained usable and state survived enhancement.
- Runtime dependency audit reported zero known advisories at inspection time. This is not a security audit or a guarantee against undisclosed issues.
- Data schema and vendored-skill integrity checks passed. Existing stale-source and 29 missing-team-ID warnings remain distinct from UI validation.
- One Impeccable detector pass reported 747 findings in the legacy index/styles targets and none in the new UI source files. Visible captures were inspected; this is not an all-site accessibility certification. TypeScript, standalone lint and coverage stages are not configured.

Browser captures and publication acceptance evidence are saved under `/workspace/artifacts/astryx/` in this task environment. Live asset hashes and rendering are verified after deployment; local checks alone do not establish publication.
