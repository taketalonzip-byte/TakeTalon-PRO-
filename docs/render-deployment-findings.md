# Render deployment findings

Date: 2026-08-31

Render's official Node/Express guide says to create a new Web Service in the Render Dashboard, connect the GitHub repository, and provide build and start commands. The guide allows using the project's own commands; for this repository those are `pnpm install`/`pnpm run build` or equivalent and `pnpm start`, subject to the repository's package manager setup.

Render's official free-tier guide states that Web Services are available at no charge, but free instances have important limitations and are intended for testing, hobby projects, or learning rather than production. The page also documents service sleep behavior and monthly included usage limits. The deployment must therefore be described as a free/testing deployment, not guaranteed production infrastructure.

Sources:
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/free
