# Keyboard Accessibility Guide

## Objective

Ensure the product is fully usable when mouse/trackpad is unavailable and meets modern accessibility expectations.

---

## 1) Accessibility Standard Target

- WCAG 2.2 AA baseline
- Keyboard operability for all user journeys
- Assistive technology compatibility (screen readers, zoom, high contrast)

---

## 2) Keyboard-Only Functional Requirements

Every feature must support:
- keyboard focus entry/exit
- keyboard activation
- keyboard-only alternatives for drag-drop or pointer-only patterns
- non-blocking keyboard interactions in modals/drawers

Critical journeys to certify:
1. Create onboarding request
2. Complete questionnaire
3. Perform approval/reject/delegate actions
4. Trigger connector strategy and onboarding execution
5. Export configuration and review audit events

---

## 3) Focus and Navigation Rules

- Visible focus indicator on all interactive elements.
- Logical tab order matches visual and semantic order.
- Skip links for repetitive navigation.
- Focus trap within modal dialogs.
- Focus restoration to invoker after modal close.

---

## 4) Keyboard Shortcuts

Mandatory baseline shortcuts:
- `g a`: Applications
- `g t`: My Tasks
- `g d`: Dashboard
- `c`: Create onboarding request
- `/`: Global search
- `?`: Shortcut help

Guidelines:
- Avoid conflicting browser/OS shortcuts where possible.
- Provide remapping support for accessibility needs.
- Expose shortcut discoverability and disable options.

---

## 5) Screen Reader and Semantic Requirements

- Use semantic landmarks and headings.
- Provide accessible names, roles, and states.
- Announce async updates (for example, workflow status change).
- Ensure table/grid interactions are keyboard and screen-reader operable.

---

## 6) Accessibility Preferences

User-level settings:
- keyboard-only mode (default enabled for critical screens)
- high-contrast mode
- reduced motion
- focus ring style
- screen-reader optimized verbosity

Managed through:
- `GET /users/me/accessibility-preferences`
- `PUT /users/me/accessibility-preferences`

---

## 7) Testing and Release Gates

### Automated
- axe-based scans for critical pages
- lint rules for accessibility anti-patterns
- keyboard path integration tests

### Manual
- full keyboard walkthrough for top journeys
- screen-reader smoke tests
- high-contrast and reduced-motion checks

Release must be blocked on critical accessibility defects.

---

## 8) Incident Handling

If accessibility regression is detected:
1. open P1/P2 defect based on impact
2. provide temporary workaround guidance
3. patch and validate with keyboard + screen-reader tests
4. publish remediation note in release documentation
