# Business Booking and Accounting

## Deploy on Render

This project is a Node.js service that serves both the React application and its API.

1. Create a free Neon project. Click **Connect**, enable **Pooled connection**, and copy that URI.
2. Create a Render Blueprint from this repository. Render detects `render.yaml`.
3. Set `DATABASE_URL` to the Neon pooled URI, plus `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD`. These create the first administrator only when the database is empty.
4. Render generates `JWT_SECRET`. The application creates its Postgres schema automatically on first start.
5. Open the deployed URL and confirm `https://<your-service>/api/health` responds with `{ "status": "ok" }`.

Neon owns the database, so Render restarts do not erase data. Download CSV backups from the authenticated admin area regularly.

## Import existing SQLite records into Neon

After the deployed app has started once and created its tables, set `DATABASE_URL` locally and run:

```bash
npm run migrate:sqlite -- server/db/rajindera.db
```

The script copies customers, orders, payments, allocations, and audit records to Neon while retaining their IDs.

## Local development

```bash
cp .env.example .env
npm ci
npm run dev
```

Update the placeholder values in `.env` before starting the server.
