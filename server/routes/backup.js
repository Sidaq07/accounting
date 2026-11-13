import db, { dbPath } from '../database.js';
import { authenticateToken } from '../auth.js';
import fs from 'fs';

// Helper to escape values for CSV
function cleanCsvValue(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert JSON array of objects to CSV string
function jsonToCsv(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const headerRow = headers.map(cleanCsvValue).join(',');
  
  const dataRows = data.map(row => 
    headers.map(header => cleanCsvValue(row[header])).join(',')
  );
  
  return [headerRow, ...dataRows].join('\r\n');
}

export function registerBackupRoutes(app) {
  // Export Customers CSV
  app.get('/api/backup/export/customers', authenticateToken, (req, res) => {
    db.all('SELECT id, name, phone, default_location, notes, created_at FROM customers ORDER BY name ASC', [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database export failed.' });
      
      const csv = jsonToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customers_export.csv');
      res.send(csv);
    });
  });

  // Export Orders CSV
  app.get('/api/backup/export/orders', authenticateToken, (req, res) => {
    db.all(`
      SELECT o.id, c.name as customer_name, o.delivery_location, o.tanker_type, o.use_type, o.price, o.order_date, o.payment_status, o.notes, o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.order_date DESC, o.id DESC
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database export failed.' });

      const csv = jsonToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders_export.csv');
      res.send(csv);
    });
  });

  // Export Payments CSV
  app.get('/api/backup/export/payments', authenticateToken, (req, res) => {
    db.all(`
      SELECT p.id, c.name as customer_name, p.amount, p.payment_date, p.payment_method, p.notes, p.allocated_order_id, p.created_at
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      ORDER BY p.payment_date DESC, p.id DESC
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database export failed.' });

      const csv = jsonToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=payments_export.csv');
      res.send(csv);
    });
  });

  // Export Pending Payments CSV
  app.get('/api/backup/export/pending-payments', authenticateToken, (req, res) => {
    db.all(`
      SELECT 
        o.id as order_id, 
        c.name as customer_name, 
        c.phone as customer_phone, 
        o.order_date, 
        o.delivery_location, 
        o.price as original_amount,
        (SELECT COALESCE(SUM(amount_allocated), 0) FROM payment_allocations WHERE order_id = o.id) as amount_paid,
        (o.price - (SELECT COALESCE(SUM(amount_allocated), 0) FROM payment_allocations WHERE order_id = o.id)) as outstanding_amount
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.payment_status != 'Paid'
      ORDER BY o.order_date ASC, o.id ASC
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database export failed.' });

      const csv = jsonToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=pending_payments_export.csv');
      res.send(csv);
    });
  });

  // Export Customer Accounts CSV
  app.get('/api/backup/export/accounts', authenticateToken, (req, res) => {
    db.all(`
      SELECT 
        c.name as customer_name,
        c.phone as customer_phone,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(price), 0) FROM orders WHERE customer_id = c.id) as total_business,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as total_received,
        ((SELECT COALESCE(SUM(price), 0) FROM orders WHERE customer_id = c.id) - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id)) as outstanding
      FROM customers c
      ORDER BY customer_name ASC
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database export failed.' });

      const csv = jsonToCsv(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customer_accounts_export.csv');
      res.send(csv);
    });
  });

  // Download raw SQLite Database backup file
  app.get('/api/backup/database-file', authenticateToken, (req, res) => {
    if (fs.existsSync(dbPath)) {
      res.download(dbPath, 'rajindera_database_backup.db', (err) => {
        if (err) {
          res.status(500).json({ error: 'Failed to download database file.' });
        }
      });
    } else {
      res.status(404).json({ error: 'Database file not found.' });
    }
  });
}
