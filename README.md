# Farm2Market Backend

This is the Express/Sequelize backend for the Farm2Market application.  It
provides authentication, listings, buyer needs, orders, bank accounts, a
chat system with Socket.IO, and a connection to a Python forecasting service.

## Architecture Overview

- **Express** handles HTTP routes separated into `controllers` and `routes`.
- **Sequelize** is used as ORM with **PostgreSQL** and is configured in
  `src/config/database.js`.
- **Socket.IO** powers real‑time chat; the server attaches an `io` instance to
the Express app (`app.set('io', io)`) and listens for `send-message`,
`typing-*` events.
- Environment variables are loaded via `dotenv` and used throughout the code
  for configuration.
- A separate forecasting service is queried via HTTP using `axios`.

The codebase is intentionally simple; models are defined in `src/models`,
middleware under `src/middleware`, and so on.  See the source files for
behavior details – nothing is hard‑coded except default development values.

## Preparing for Deployment on Render

The following steps ensure the backend can run on [Render](https://render.com)
and connect to a managed PostgreSQL instance.

### 1. Environment Variables

Render allows you to define environment variables via the dashboard or a
`.render.yaml` file.  The app supports two styles of database configuration:

1. **Separate variables** (used locally):
   - `POSTGRES_HOST`
   - `POSTGRES_PORT`
   - `POSTGRES_USER`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DB`

2. **Single `DATABASE_URL`** (Render automatically provides this when you
   add a Postgres service).  The code prefers `DATABASE_URL` if present and
   enables SSL with `rejectUnauthorized: false` to satisfy Render's TLS
   requirements.

Other variables you should set in Render:

| Name               | Description / Example                               |
|--------------------|-----------------------------------------------------|
| `PORT`             | Port the server listens on (Render sets this
                     automatically; default `4000` locally) |
| `CORS_ORIGIN`      | Comma‑separated front‑end URLs (e.g.
                     `https://app.example.com`)            |
| `JWT_SECRET`       | Secret for signing JSON Web Tokens                  |
| `JWT_EXPIRES_IN`   | Token lifetime (e.g. `7d`)                          |
| `PREDICTION_API_URL` | URL of the forecasting service                     |
| `EMAIL_USER`       | SMTP username for email notification service        |
| `EMAIL_APP_PASS`   | SMTP password/app‑specific password                 |

> **Note:** your local `.env` already contains development values; keep
> it out of source control (it's listed in `.gitignore`).

### 2. Render Configuration Files

A `Procfile` is included to instruct Render how to start the app:

```
web: npm start
```

A sample `.render.yaml` has also been added with a web service and a
Postgres database definition.  You can either use this file or configure the
services manually in the Render dashboard.

### 3. Deploying

1. Push your repository to GitHub or another Git provider.
2. On Render, create a new **Web Service** and connect it to the repo.
   - Build command: `npm install`
   - Start command: `npm start` (or left blank if using Procfile)
3. Add a **Postgres** database through Render's UI; it will expose a
   `DATABASE_URL` environment variable to the web service.
4. Add the other environment variables listed above (especially `CORS_ORIGIN`
   and `JWT_SECRET`).
5. Deploy – Render will build and start the container automatically.

### 4. Database Migrations

Currently the app uses `sequelize.sync({ alter: true })` at startup.  That's
fine for development, but on production you may want to migrate to a
`sequelize-cli` or similar solution before upgrading the schema.

## Local Development

Run the server locally with:

```bash
npm install
npm run dev   # uses nodemon
```

Be sure to create a `.env` file containing the POSTGRES and JWT variables
(see the sample at the top of this README).  The existing one you provided
works for development.

## Summary

- Codebase already reads critical configuration from `process.env`.
- Adjusted database configuration to accept `DATABASE_URL` and enable SSL
  for Render-style deployments.
- CORS origin list is now environment-driven.
- Added `Procfile` and `.render.yaml` to simplify deployment.
- Provided instructions and variable list to make the back end ready for
  deployment with minimal changes to behavior.

Good luck with your Render deployment!  Let me know if you need further
assistance configuring the front end or setting up migrations.
