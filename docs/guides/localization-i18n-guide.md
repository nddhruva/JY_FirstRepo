# Localization and Internationalization (i18n/l10n) Guide

## Objective

Enable a globally usable product with consistent behavior across languages, regions, scripts, and regulatory contexts.

---

## 1) Design Principles

- Separate content from business logic.
- Store canonical values in locale-neutral form.
- Render locale-specific presentation at the edge/UI layer.
- Provide deterministic fallback strategy.

---

## 2) Supported Concepts

- Locale code format: BCP 47 (for example, `en-US`, `fr-FR`, `pt-BR`, `ar-SA`)
- Text direction: LTR and RTL
- ICU message formatting for pluralization and interpolation
- Locale-specific formatting:
  - date/time
  - numeric values
  - currencies

---

## 3) Locale Resolution Order

1. Explicit user profile locale
2. Tenant default locale
3. Request header (`Accept-Language`)
4. Product fallback locale (`en-US`)

---

## 4) What Must Be Localized

- Navigation labels and page titles
- Forms and validation messages
- Questionnaire questions/help text
- Workflow and notification messages
- AI guidance content (where supported)
- Error messages intended for end users

Do not localize:
- internal IDs and immutable keys
- canonical enum storage values

---

## 5) Translation Bundle Lifecycle

1. Draft translation bundle
2. Linguistic review
3. Product/UX QA review
4. Accessibility review (screen-reader quality)
5. Publish as active version
6. Monitor missing/unused keys

---

## 6) Admin Configuration

Tenant admins can:
- define default locale
- define supported locales
- enable locale override permissions
- schedule translation rollout windows

---

## 7) API Integration

Use:
- `GET /i18n/locales`
- `GET /i18n/translations/{namespace}?locale=<locale>`

Pass:
- `Accept-Language` header for locale preference

---

## 8) QA Requirements

- Verify no hardcoded user-facing strings.
- Test key workflows in each supported locale.
- Validate layout expansion for long strings.
- Validate RTL support for supported locales.
- Validate date/number/currency correctness.

---

## 9) Compliance Considerations

- Respect regional legal text and consent language requirements.
- Ensure privacy notices and policy text are localized where mandated.
- Keep legal versions versioned and auditable per locale.

---

## 10) Operational Metrics

- Translation coverage by namespace
- Missing key rate
- Localization defect rate
- Locale adoption by tenant/user
