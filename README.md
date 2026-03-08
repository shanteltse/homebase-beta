# homebase-beta

Web-first rebuild of HomeBase using a Turbo monorepo.

## Strategy

We are rebuilding from scratch as a proper product, validating UX and technical quality on web first, then adding a React Native app once the product foundation is stable.

## Monorepo

- `apps/web`: primary product app (Next.js)
- `apps/docs`: internal docs/reference app
- `packages/ui`: shared UI primitives
- `packages/eslint-config`: shared lint config
- `packages/typescript-config`: shared TS config

## Principles

- Treat legacy code as requirements input only
- No client-side secret storage
- Typed domain models first
- Testable architecture from day one
- Security and data integrity before feature sprawl

## Audit

Legacy audit findings are documented in:

- `docs/AUDIT_FINDINGS.md`

## Next build milestones

1. Define domain model + state architecture
2. Rebuild auth/onboarding/task CRUD flows in `apps/web`
3. Add durable notifications + backend AI proxy
4. Add integration and e2e coverage
5. Introduce RN app package when web foundation is production-ready
