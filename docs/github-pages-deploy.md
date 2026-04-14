# GitHub Pages Deploy Plan

## What Will Be Deployed

The React frontend in `web/` will be deployed to GitHub Pages.

The QGIS files, CSV exports, and Dify design documents stay in the repository for reference.

## Static Hosting Constraint

GitHub Pages is static hosting.

That means:

- it can host the React app and the CSV-backed demo UI
- it cannot host the Dify API proxy by itself

If you want live Dify chat on Pages, the proxy must be hosted somewhere else and the frontend must point to that public proxy URL at build time.

## Current Build Adjustments

The app now uses the repository base path when it is built for GitHub Pages.

It also loads the summary CSV with `import.meta.env.BASE_URL` so the asset path works under the repository subpath.

## GitHub Actions Flow

A Pages workflow is included in:

- `.github/workflows/pages.yml`

It builds the app from `web/` and publishes `web/dist`.

## Repository Settings

In GitHub repository settings, Pages should be set to use GitHub Actions.

## Build Modes

Local development:

- `cd web`
- `npm run dev`

GitHub Pages build:

- `GITHUB_PAGES=true npm run build`

## Dify Note

For the current demo, the UI can still work in local fallback mode.

For live Dify integration on Pages, set `VITE_DIFY_CHAT_ENDPOINT` to a public proxy URL before the Pages build runs.
