# Firebase Environments

Use separate Firebase projects for development and production.

- `dev`: `realx-dev` by default. Replace this alias in `.firebaserc` if the created dev project uses a different project ID.
- `prod`: `reelx-backend`.
- `default`: points to `dev` so local Firebase CLI commands do not target production by accident.

## Web Config

Create local env files from the tracked examples:

```bash
cp .env.development.local.example .env.development.local
cp .env.production.local.example .env.production.local
```

Fill each file from the matching Firebase web app. Vite selects the file by mode:

- `npm run dev` and `npm run build:dev` use `.env.development.local`.
- `npm run dev:prod`, `npm run build:prod`, and `npm run deploy:prod` use `.env.production.local`.

Deploys must name the target alias:

```bash
npm run deploy:dev
npm run deploy:prod
```

Function-only deploys are also explicit:

```bash
cd functions
npm run deploy:dev
npm run deploy:prod
```

## Dev Project Setup

Create or select the dev project, then update aliases in both child repos if the ID differs from `realx-dev`:

```bash
firebase use --add
firebase use dev
```

Enable the same services used in production: Firestore, Auth, Storage, Functions, Hosting where needed, and App Check. Deploy rules, indexes, and Functions to `dev` first.

## Sanitized Firestore Refresh

Use the Admin SDK refresh script from `realX-web/functions` instead of managed export/import for routine dev data. Managed import/export copies raw documents and is only appropriate for an internal raw clone.

```bash
cd functions
PROD_SERVICE_ACCOUNT=/path/prod-readonly.json \
DEV_SERVICE_ACCOUNT=/path/dev-writer.json \
DEV_PROJECT_ID=realx-dev \
npm run refresh:dev:dry-run
```

Run without `--dry-run` only after reviewing the count and redaction log:

```bash
PROD_SERVICE_ACCOUNT=/path/prod-readonly.json \
DEV_SERVICE_ACCOUNT=/path/dev-writer.json \
DEV_PROJECT_ID=realx-dev \
npm run refresh:dev
```

Set `MIGRATION_COLLECTIONS=students,vendors,categories` to limit the copied collections. The script preserves document IDs, redacts common PII and side-effect fields, and logs counts per collection.

## Cost Measurement

- Enable Cloud Billing export to BigQuery for standard usage export. Add detailed usage export if resource-level cost attribution is needed.
- Create a low monthly budget for the dev project with alerts at 50%, 75%, 90%, and 100%.
- Use Firebase and Cloud Monitoring Firestore metrics for read/write/delete trends, snapshot listeners, active connections, and rules evaluations.
- Treat Firebase usage dashboards as estimates. Billing export is the source of truth for cost.
- Keep using dev-only admin read logging for route-level Firestore read behavior.

Suggested BigQuery grouping: `project.id`, `service.description`, `sku.description`, `usage.unit`, and day. Compare `realx-dev` with `reelx-backend`.
