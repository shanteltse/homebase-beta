# Legacy App Audit Findings

Source audited: previous single-file HomeBase web app.

## Critical Findings

1. Stored XSS risk through task link rendering and inline `window.open(...)` handlers.
2. Stored XSS risk in toast/notification rendering via `innerHTML` with user-derived strings.
3. Anthropic API key handled in-browser (`localStorage` + direct API calls), creating key exfiltration risk.

## High Findings

1. Firestore household rules are broad; member updates are not tightly constrained.
2. Notification scheduling relies on service worker `setTimeout`, which is not lifecycle-durable.
3. Password-gate middleware uses deterministic hash cookie model with replay characteristics.

## Medium Findings

1. Missing modern browser hardening baseline (notably CSP).
2. Monolithic architecture (~7k line HTML file) mixing UI, state, auth, sync, AI, and notifications.

## UX / Product Findings

1. Overloaded home surface and interaction density.
2. Fragmented navigation model.
3. Voice and copy tone inconsistent with reliability-focused product posture.
4. Accessibility risk from heavy inline handlers and icon-driven controls.

## Migration Constraints for Beta

1. Do not reuse legacy implementation code.
2. Keep all LLM/API secrets server-side only.
3. Eliminate inline JS-event architecture.
4. Define typed domain boundaries (`Task`, `Tag`, `Settings`, `Household`, `User`) before feature coding.
5. Implement local-first data model with explicit sync layer.
6. Add tests early (unit + integration + smoke e2e).
