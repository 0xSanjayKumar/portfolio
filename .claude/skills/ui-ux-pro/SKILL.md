---
name: ui-ux-pro
description: Use this skill to perform a professional-grade UI/UX audit of this portfolio (index.html, style.css, app.js) and apply fixes directly. Covers visual hierarchy, spacing/type scale, color & contrast, accessibility (WCAG), responsive/mobile behavior, interaction/motion design, and UI-affecting performance. Trigger on requests like "improve the UI/UX", "make this look more professional", "polish the design", "fix accessibility", "review the design", "design audit".
---

# UI/UX Pro

A professional UI/UX audit-and-fix pass for this portfolio site. The site is
vanilla HTML/CSS/JS (`index.html`, `style.css`, `app.js`) with a token-based
design system already in place in `style.css` (`--bg`, `--card`, `--ink`,
`--muted`, `--line`, `--accent`, etc., duplicated for light/dark themes, plus
separate `--font-display` / `--font-body` / `--font-mono` roles). Work with
that system — extend and reuse tokens, don't invent a parallel one.

## Process

1. **Read before judging.** Read `index.html`, `style.css`, and the relevant
   parts of `app.js` in full (or the section under discussion) before making
   claims about what's wrong. Don't guess from filenames.
2. **Audit against the checklist below.** For each category, note concrete
   issues tied to a file:line — not generic advice.
3. **Prioritize by impact vs. effort.** Fix in this order: accessibility
   blockers > broken/confusing hierarchy or responsive breakage > visual
   polish (spacing, type, color) > micro-interaction/motion refinement.
4. **Apply fixes directly** using the existing token system and CSS
   structure/naming conventions already in the file. Don't introduce a new
   framework, CSS methodology, or build step for a static site.
5. **Verify in a real browser.** Use the `run` skill (or start a local
   server) and check the golden path plus: mobile width (~375px), a mid
   breakpoint, dark mode toggle if present, and keyboard-only navigation.
   Don't claim a visual fix is done without having looked at it rendered.
6. **Report changes as a punch list**: what was wrong, what changed, and
   anything flagged but intentionally left alone (with why).

## Audit checklist

**Visual hierarchy & layout**
- Is there one clear focal point per section/viewport? Does size/weight/color
  correctly signal importance (H1 > H2 > body, primary CTA > secondary)?
- Consistent spacing scale — flag arbitrary one-off px values that don't
  match a rhythm (e.g. an 4/8px-based scale).
- Alignment: are edges/baselines consistent across a section, or do things
  look "almost" aligned?

**Typography**
- Line-length (~45–75ch for body copy), line-height, and paragraph spacing.
- Font-size scale is coherent (no near-duplicate sizes like 15px vs 16px
  used inconsistently).
- Correct semantic use of `--font-display` / `--font-body` / `--font-mono`
  per the existing convention — don't mix roles arbitrarily.

**Color & contrast**
- Check both light and dark token sets in `style.css`. Verify text/background
  contrast meets WCAG AA (4.5:1 body text, 3:1 large text/UI components).
- `--accent` used consistently for interactive/emphasis elements, not
  decoratively diluted.
- No color-only signal (e.g. error/success conveyed by color alone).

**Accessibility**
- Semantic HTML (headings in order, `<button>` vs `<a>` used correctly,
  landmark elements).
- All interactive elements keyboard-reachable with a visible focus state;
  tab order matches visual order.
- Images have meaningful `alt` (or `alt=""` if decorative); icon-only
  controls have `aria-label`.
- Respect `prefers-reduced-motion` for any non-trivial animation in
  `app.js`/`style.css`.

**Responsive behavior**
- Check `@media` breakpoints in `style.css` against actual content — look
  for cramped touch targets (<44px), overflow, or text reflow issues at
  narrow widths.
- Nothing depends on hover-only interaction for functionality on
  touch/mobile.

**Interaction & motion**
- Hover/active/focus/disabled states exist and are distinguishable for every
  interactive element.
- Transitions are short and purposeful (~150–250ms) — flag anything janky,
  missing, or gratuitous.
- Loading/empty/error states exist where `app.js` fetches or mutates data
  (e.g. the likes counter) rather than failing silently.

**Content & microcopy**
- Button/link labels describe the action ("Send message", not "Submit").
- No dead-end states without a next action.

## Constraints

- Preserve all existing content and functionality — this is a polish/fix
  pass, not a rewrite or redesign from scratch.
- Don't add a CSS framework, JS framework, or bundler to a project that
  currently has none, unless the user explicitly asks.
- Don't invent new design tokens when an existing one already fits.
- Keep diffs scoped to what's justified by the checklist — no drive-by
  refactors.
