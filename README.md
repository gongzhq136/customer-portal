# Customer Portal (Nuxt)

A Nuxt application (Nuxt 4) with authentication (Better Auth), organizations, and a PostgreSQL database via Drizzle.

## Quick start (scaffold from GitHub template)

Use Nuxt’s initializer (powered by `unjs/giget`) to create a new project from this repository:

```bash
npx nuxi init -t github:<org>/<repo> my-customer-portal
```

If you prefer the `create-nuxt` wrapper:

```bash
npm create nuxt@latest -- -t github:<org>/<repo> my-customer-portal
```

Tip: pin a stable tag/branch if you publish releases for your template:

```bash
npx nuxi init -t github:<org>/<repo>#<tag-or-branch> my-customer-portal
```

## Setup

Install dependencies:

```bash
pnpm install
```

Create your local env file from the example:

```bash
# macOS / Linux
cp .env.example .env

# Windows (cmd)
copy .env.example .env
```

At minimum, set `DATABASE_URL` in `.env`. Optional providers (Resend, GitHub OAuth) can be left empty until you enable them.

## Development

Start the dev server:

```bash
pnpm dev
```

By default this repo runs on `http://localhost:3051` (see `nuxt.config.ts` → `devServer.port`).

## Production

Build:

```bash
pnpm build
```

Preview:

```bash
pnpm preview
```

## Docker

Build the image:

```bash
docker build -t customer-portal .
```

Run (provide your own `DATABASE_URL`):

```bash
docker run --rm -p 3000:3000 -e DATABASE_URL="postgresql://user:pass@host:5432/dbname?schema=public" customer-portal
```

