---
name: frontend-ui-ux
description: Guide for frontend development with accessibility and UX best practices. Use when working on UI components, layouts, or frontend architecture.
---

## Semantic HTML

Use elements for their meaning: `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<header>`, `<footer>`, `<figure>`. Use `<button>` for actions, `<a>` for navigation. Never use `<div>` with click handlers as a button substitute.

## WCAG 2.1 AA Compliance

- **Color contrast**: Minimum 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold). Use tools like axe-core or Lighthouse to verify.
- **Keyboard navigation**: Every interactive element must be reachable via Tab. Provide visible focus indicators (outline, ring). Never use `outline: none` without a replacement.
- **Focus management**: When modals open, trap focus inside. On close, return focus to the trigger element. Use `aria-modal="true"` and manage with `inert` attribute on background content.
- **Alt text**: Every `<img>` needs `alt`. Decorative images use `alt=""`. Informative images describe the content, not the format.
- **Screen reader support**: Use `aria-label`, `aria-describedby`, `aria-live` (for dynamic updates), and `aria-expanded` (for toggles). Test with VoiceOver (macOS) or NVDA (Windows).

## Responsive Design (Mobile-First)

Write base styles for mobile, then add `min-width` media queries for larger screens. Use `clamp()` for fluid typography: `font-size: clamp(1rem, 2.5vw, 1.5rem)`. Use CSS Grid for page layouts, Flexbox for component-level alignment. Set `<meta name="viewport" content="width=device-width, initial-scale=1">`.

## Component Architecture

- Build small, composable components with a single responsibility.
- Separate presentational (UI) from container (logic/data) components.
- Use composition over prop drilling — leverage context, slots, or render props.
- Co-locate styles, tests, and types with each component.

## State Management

- **Local state**: Use for UI-only state (open/close, form inputs).
- **Shared state**: Lift state to nearest common ancestor, or use context/stores.
- **Server state**: Use data-fetching libraries (React Query, SWR, TanStack Query) — they handle caching, revalidation, and loading states.
- Avoid duplicating server data in client state.

## CSS Methodology

- **Utility-first** (Tailwind): Fast iteration, consistent spacing/colors. Use `@apply` sparingly.
- **BEM** (`.block__element--modifier`): Clear structure for custom CSS. Good for design systems.
- Scope styles to components via CSS Modules or scoped styles to prevent leaks.

## Performance

- Lazy-load routes and heavy components with dynamic imports.
- Use `loading="lazy"` on images below the fold. Serve responsive images via `srcset`.
- Code-split by route. Preload critical assets with `<link rel="preload">`.
- Minimize layout shifts: set explicit `width`/`height` on images and embeds.
