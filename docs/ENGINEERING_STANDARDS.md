# Engineering Standards

This project follows a lightweight set of standards aligned with ISO/IEC principles:

- **Quality (ISO/IEC 25010-inspired):** design for reliability, maintainability, usability, security, and portability. Every feature must state required inputs, outputs, and failure modes.
- **Lifecycle (ISO/IEC 12207-inspired):** plan → implement → verify → release. Each change must include validation and a rollback path.
- **Security & data handling (ISO/IEC 27001-inspired):** secrets stay in environment variables; least-privilege access; input is validated and sanitized; error logs avoid sensitive data.
- **Testing (ISO/IEC 29119-inspired):** validation rules and data mappers have unit coverage; primary flows have integration coverage.
- **Service management (ISO/IEC 20000-inspired):** define owners, basic SLOs for critical flows (auth, save, submit), and alert when breached.

## Architecture & Code Organization
- **Layering:** UI → domain (types/logic) → data/services (Supabase) → infra (supabase client). No cross-layer shortcuts.
- **Modules:** keep concerns in dedicated folders (`domain/`, `validation/`, `services/`, `observability/`, `components/`).
- **Contracts:** all request/response shapes live in `types/` or `domain/`; no `any`. External data is validated at the edge.
- **Validation:** shared validators in `validation/`; UI and services reuse them.
- **Styling:** prefer CSS modules or shared design primitives over ad-hoc inline styles.
- **Error handling:** no silent failures. All async operations are wrapped and logged with context.

## Observability & Logging
- **Structured logging:** use a central logger; include event name, context, and severity. Avoid PII.
- **Error capture:** wrap API calls and validation; surface actionable messages to users.
- **Metrics-ready:** logging shape should be compatible with later backends (e.g., Sentry/Datadog) without refactoring call sites.

## Data & Persistence
- **Deterministic shapes:** form data and persistence payloads use shared types.
- **Idempotent saves:** draft saves tolerate retries and partial data; schema changes require migrations for stored drafts.
- **Provenance:** when feasible, attach who/when/context to submissions.

## Testing & CI
- **Checks:** typecheck, lint, and tests must pass before release.
- **Coverage targets:** validators and mappers covered; critical submission flow exercised end-to-end.
- **Regression protection:** add tests when fixing defects in validation or data handling.

## Security & Access
- **Secrets:** never committed; loaded from env. Validate presence at startup.
- **Least privilege:** restrict Supabase keys/roles; never expose server-side keys in the client.
- **Input hygiene:** normalize and validate all user input before send/save.

## UX/Accessibility
- **Forms:** labeled inputs, keyboard-friendly, and clear validation feedback.
- **Empty/error states:** always provide guidance on how to resolve issues.
- **Consistency:** reuse components for inputs, buttons, and chips for predictable behavior.
