# MesaFácil – Copilot Instructions

## Project Overview
SaaS restaurant self-service platform. Customers scan a QR code at their table and interact via a public web UI (no install required). Restaurant operators manage orders, menus, and staff via a private dashboard.

## Architecture: Two Distinct User Flows

### Operator Flow (authenticated)
- Firebase Auth → reads `users/{uid}` doc to get `role` and `idRestaurante`
- Routes under `<Layout>` (Sidebar + Header), protected by `<PrivateRoute>` and `<RequireFeature>`/`<RequirePermission>`
- Features: `dashboard`, `order`, `foodList`, `kitchen`, `reports`, `promotions`, `users`, `items`, `movements`, `integrations`

### Customer Flow (public)
- Accessed via QR code URL (e.g. `/mesa/{id}`)
- Uses `<ClienteLayout>` under `src/features/cliente/`
- Client data (name, address) stored **locally** via Dexie IndexedDB (`src/config/dexieConfig.js`), not Firestore

## Key Conventions

### Path Alias
`@` maps to `src/`. Always use `@/` imports instead of relative paths (e.g. `import { useAuth } from '@/contexts/AuthContext'`).

### Feature-Scoped Structure
Each feature lives in `src/features/{name}/` with subfolders `components/`, `context/`, `hooks/`, `pages/`, `services/`. Keep feature code self-contained; share only via `src/components/`, `src/hooks/`, `src/contexts/`.

### Plan/Feature Access
- Plans: `free`, `monthly`, `bimonthly`, `quarterly`, `semiannual`
- Feature flags defined in `src/constants/planFeatures.js` (`FEATURE_FLAGS`, `PLAN_LIMITS`, `PLAN_FEATURE_MAP`)
- Gate routes with `<RequireFeature feature={FEATURE_FLAGS.X} requiredPlan="monthly">` in `src/routes/index.jsx`
- Inside components, use `const { hasFeatureAccess, canAddProduct } = usePlan()` (from `PlanContext`)
- **Stripe is currently disabled** (`STRIPE_TEMPORARILY_DISABLED = true` in `src/services/stripeService.js`) — all plan features are unlocked; when this flag is `true`, treat all users as premium

### Role/Permission System
- `role` in Firestore `users/{uid}` is either the string `"admin"` or an object `{ canManageOrders: true, ... }`
- Use `usePermissions()` → `hasPermission('canManageOrders')` or `<RequirePermission permission="..." />`
- `isAdmin()` is shorthand for `role === "admin"`

### Firestore Data Model
- Restaurant data: `restaurantes/{idRestaurante}/`
- Sub-collections per restaurant: `mesas/` (tables), `pedidos/` (orders), `cardapio/` (menu items)
- User document: `users/{uid}` — holds `role` and `idRestaurante`
- Real-time listeners via `onSnapshot` are the standard pattern (see `src/features/config/context/TablesContext.jsx`)

### Firebase Functions (Backend)
- Located in `functions/` (CommonJS, separate `package.json`)
- Stripe checkout and webhook handlers live here
- iFood integration split across: `ifood-auth-distributed.js`, `ifood-polling.js`, `ifood-catalog.js`, `ifood-actions.js`
- Secret `STRIPE_SECRET_KEY` via Firebase secrets in production; `.env.local` for local dev

## Developer Workflows

```bash
# Development
npm run dev          # Vite dev server (http://localhost:5173)

# Production build (runs copy-server.mjs postbuild)
npm run build
npm run start        # Serves dist/ via Node (dist/server.mjs)

# Linting
npm run lint
```

**Environment**: Copy `env.example` → `.env` and fill Firebase + Stripe keys. `VITE_API_BASE_URL` must point to Firebase Functions emulator for local Stripe flows.

## i18n
- Default locale: `pt-BR`. Supported: `en`, `es`, `it`, `fr`
- Translation files: `src/i18n/locales/{lang}/`. Namespace: `common` (default)
- Always use `useTranslation()` hook; never hardcode Portuguese strings in new UI

## External Integrations
- **Stripe**: Subscription billing — currently disabled; toggle `STRIPE_TEMPORARILY_DISABLED` in `src/services/stripeService.js`
- **iFood**: Order polling + catalog sync via Firebase Functions (see `docs/INTEGRACAO_IFOOD.md`)
- **WhatsApp**: Link generation utility in `src/components/WhatsAppLinkGenerator.jsx`

## Styling
- TailwindCSS v4 (`@tailwindcss/vite` plugin — no `tailwind.config.js` file)
- Theme tokens in `src/config/theme.js`; dynamic restaurant brand color via `useCorDoRestaurante()` hook
