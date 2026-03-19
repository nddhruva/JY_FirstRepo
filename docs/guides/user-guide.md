# User Guide

## Audience

- Application Owners
- Business Owners
- Security Reviewers
- Compliance Analysts
- Integration Engineers

---

## 1) Getting Started

1. Sign in with your organization SSO or federated IdP configured by your tenant.
2. Set profile preferences:
   - language/locale
   - timezone
   - accessibility preferences (keyboard mode, contrast, reduced motion)
3. Open **My Tasks** to view assigned onboarding items.

If your tenant has multiple configured IdPs, login may route automatically based on policy.

---

## 2) Create a New Onboarding Request

1. Go to **Applications -> New Application**.
2. Enter app profile:
   - application name
   - owner information
   - business criticality
   - data classification
   - target integration domains (IGA/IAM/PAM/SSO)
3. Choose intake source:
   - manual entry
   - data lake import
   - API-submitted data
4. Submit the onboarding request.

Optional:
- add one or more application instances (for example DEV/UAT/PROD) during creation, or after creation from Application 360.

---

## 3) Complete Questionnaires

1. Open assigned questionnaire task.
2. Complete required sections for your role.
3. Upload supporting evidence where required.
4. Resolve validation warnings and submit.

Tips:
- Use inline AI guidance for unclear questions.
- Save drafts and return later.
- Review completion progress by section.

---

## 4) Review Approvals and Workflow Status

- Open **Application 360** to see:
  - pending approvals
  - escalations
  - delegation actions
  - completed timeline with audit trail

Approvers can:
- approve
- reject with reason
- request rework
- delegate where policy allows

---

## 5) Connector Recommendation and Execution

When onboarding reaches integration stage:
1. View connector recommendation (OOTB/custom/web services).
2. Review rationale and confidence score.
3. Validate connector mapping and prerequisites.
4. Trigger onboarding execution when approvals are complete.

For multi-instance applications:
- execute onboarding separately per instance,
- validate non-prod instances first,
- then promote to production with approvals.

---

## 6) Keyboard-Only Usage

The product is fully usable without mouse/trackpad.

Core shortcuts:
- `g a` -> Applications
- `g t` -> My Tasks
- `g d` -> Dashboard
- `/` -> Global search
- `c` -> Create onboarding request
- `?` -> Show keyboard shortcut help

Navigation:
- `Tab` and `Shift+Tab` to move focus
- `Enter` or `Space` to activate controls
- `Esc` to close dialogs and overlays

---

## 7) Localization and Language Experience

- You can change locale from profile settings.
- All supported content (UI text, notifications, questionnaires) appears in your selected locale.
- Date/time and number formatting follow locale + timezone settings.

If translated content is unavailable:
- the system applies configured fallback locale,
- and flags missing translations for administrators.

---

## 8) Privacy and Data Handling

- Sensitive fields are protected and masked based on role.
- You can only access data permitted for your tenant and role.
- Provider-side product staff can access limited non-sensitive data only after your tenant approval.

---

## 9) Troubleshooting

### Cannot submit questionnaire
- Verify all required fields are completed.
- Ensure required evidence files are attached.
- Check if your role has submit permission for that stage.

### Task reassigned unexpectedly
- Review delegation and escalation events in the task timeline.

### Language not applied everywhere
- Confirm locale is enabled by tenant admin.
- Refresh session after profile locale update.

### Keyboard navigation appears stuck
- Press `Esc` to exit modal context.
- Use `?` to confirm available shortcuts.

---

## 10) Support

Provide the following when contacting support:
- application ID
- task/workflow run ID
- timestamp and timezone
- brief error description
- screenshot or copied error message (if permitted)
