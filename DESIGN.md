---
name: SPORTON charcoal glass
description: Korean sports score dashboard with clear data states
colors:
  primary: "#D3F897"
  neutral-bg: "#191D1C"
  surface: "rgba(30, 34, 32, .82)"
  text: "#F1F3EC"
  secondary-text: "#ADB8B1"
  on-primary: "#1B2418"
rounded:
  control: "999px"
  panel: "24px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
---

## Overview

Preserve the visual world selected from the user's reference video. `score-center.css` and its `--score-*` / `--ui-space-*` tokens are the implementation authority. The detailed component contract is in `docs/DESIGN_SYSTEM.md`.

## Colors

Use charcoal surfaces and lime selection states, with dark text on filled lime controls. Keep explicit text for live, delayed and unavailable data. Win/draw/loss badge foregrounds have separate semantic tokens because secondary text on dark panels does not contrast on their light badge surfaces.

## Typography

Use the existing system Korean sans stack and tabular score/time numerals. Titles are 36px on desktop and 28px on mobile. Avoid decorative uppercase kickers; give the actual page title a clear hierarchy.

## Layout

Use the 8px spacing grid and capped centered layout. Match cards use two columns on desktop and one on mobile. Mobile navigation respects the safe area. Filters and tables scroll within their own regions rather than causing page overflow.

## Elevation & Depth

Keep the requested diffuse background lighting and translucent header/panel surfaces. Restrict effects to existing containers; avoid adding blur to every repeated row.

## Shapes

Use 24px content panels, 16px nested panels, capsule controls and a consistent SVG stroke system. Keep artwork proportions intact.

## Components

Preserve keyboard focus, empty/error/loading states, 48px mobile control height and the reduced-motion alternative. Keep team artwork slots stable on failure. Data display rules come from `docs/DATA_OPERATIONS.md`.

## Do's and Don'ts

Maintain the user's visual choice while fixing measurable contrast, semantics, wrapping and interaction defects. Never fabricate visual proof, scores, team logos or model performance. Avoid new fonts, frameworks or decorative charts without a product need.
