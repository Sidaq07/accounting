# Business Booking and Accounting

## Deploy on Render

This project is a Node.js service that serves both the React application and its API.

1. Create a Render Blueprint from this repository. Render detects `render.yaml`.
2. Set `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` when prompted. They create the first administrator only when the database is empty.
3. Render generates `JWT_SECRET` and mounts persistent storage at `/var/data` for the SQLite database.
4. Open the deployed URL and confirm `https://<your-service>/api/health` responds with `{ "status": "ok" }`.

Do not remove the persistent disk: SQLite data is stored at `/var/data/rajindera.db`. Download database or CSV backups from the authenticated admin area regularly.

## Local development

```bash
cp .env.example .env
npm ci
npm run dev
```

Update the placeholder values in `.env` before starting the server.
