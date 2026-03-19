# 06. UI/UX Experience Blueprint

## Design Principles

- Enterprise-grade, modern, minimal visual language
- Fast task completion with low cognitive load
- Clear trust signals (status, approvals, audit, evidence)
- Accessibility-first (WCAG 2.2 AA target)
- Keyboard-only usability for all tasks
- Internationalized experience from first release

---

## Core Screens

1. **Executive Dashboard**
   - onboarding pipeline by stage
   - SLA breach risk
   - risk score distribution
   - connector strategy mix (OOTB/custom/web services)

2. **Application 360 View**
   - profile, environments, owners, risk posture
   - questionnaire progress by stakeholder
   - approval timeline and evidence panel
   - integration targets and execution logs

3. **Questionnaire Workspace**
   - role-specific sections
   - AI copilot assistance inline
   - attachment uploads + validation feedback
   - autosave and completion guidance

4. **Workflow Studio (Admin)**
   - visual drag-and-drop workflow editor
   - SLA/escalation/delegation controls
   - condition builder and simulation mode

5. **Connector Console**
   - connector catalog search
   - recommendation explanation panel
   - custom connector scaffold wizard
   - test run and health diagnostics

---

## UX Features Required for "Stunning and Professional"

- Real-time status chips and progress bars
- Interactive timelines for approvals/escalations
- Explainable AI cards (why this recommendation)
- Consistent typography scale and spacing system
- Theme support (light/dark + tenant branding)
- Keyboard-first navigation and global command palette
- Clear empty/loading/error states with remediation guidance
- Locale switcher and culturally appropriate formatting defaults
- Live region announcements for asynchronous status changes

---

## Keyboard-Only Usability Baseline

- No mandatory mouse interactions for any action.
- Every interactive element has:
  - visible focus ring,
  - logical tab position,
  - keyboard activation (`Enter`/`Space`),
  - accessible name and role.
- Modal dialogs trap focus and restore focus on close.
- Drag-and-drop alternatives provide keyboard move actions.
- Provide shortcut discoverability overlay (for example, `?` command help).

Recommended global shortcuts:
- `g a` -> Applications list
- `g t` -> My tasks
- `g d` -> Dashboard
- `c` -> Create onboarding request
- `/` -> Focus global search
- `?` -> Open shortcut guide

---

## Localization and Internationalization UX

- Support locale-specific content and formatting for:
  - date/time (with timezone),
  - number and currency,
  - language and script variants.
- Support right-to-left rendering for applicable languages.
- Ensure truncation handling for longer translated strings.
- Localize validation, error, and help text consistently.
- Permit tenant-level default locale and per-user overrides.

---

## Front-End Technology Direction

- React + TypeScript
- Design system foundation:
  - tokens (color/spacing/typography/radius)
  - reusable components
  - accessibility test harness
  - localization-ready component primitives
- Data layer:
  - API-first integration using generated SDK from OpenAPI
- Observability:
  - client-side telemetry + session diagnostics
