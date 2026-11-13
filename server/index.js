import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import route builders
import { registerAuthRoutes } from './auth.js';
import { registerCustomerRoutes } from './routes/customers.js';
import { registerOrderRoutes } from './routes/orders.js';
import { registerPaymentRoutes } from './routes/payments.js';
import { registerReportRoutes } from './routes/reports.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerBackupRoutes } from './routes/backup.js';
import { databaseReady } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Used by hosting platforms to determine whether the service is ready.
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Register APIs
registerAuthRoutes(app);
registerCustomerRoutes(app);
registerOrderRoutes(app);
registerPaymentRoutes(app);
registerReportRoutes(app);
registerAuditRoutes(app);
registerBackupRoutes(app);

// Serve static assets from front-end production build
const clientBuildPath = path.join(__dirname, '..', 'dist');
app.use(express.static(clientBuildPath));

// Fallback all non-API GET requests to index.html for React Router compatibility
app.get('/{*splat}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start listening
databaseReady
  .then(() => app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
    console.log(`Production assets served from ${clientBuildPath}`);
  }))
  .catch(error => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
