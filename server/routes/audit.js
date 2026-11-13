import db from '../database.js';
import { authenticateToken } from '../auth.js';

export function registerAuditRoutes(app) {
  // Get all audit log records
  app.get('/api/audit', authenticateToken, (req, res) => {
    const { limit = 100 } = req.query;

    const sql = `
      SELECT id, username, action, record_id, old_value, new_value, created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT ?
    `;

    db.all(sql, [parseInt(limit) || 100], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve audit log.' });
      }

      // Parse JSON fields on the fly
      const logs = rows.map(row => ({
        ...row,
        old_value: row.old_value ? JSON.parse(row.old_value) : null,
        new_value: row.new_value ? JSON.parse(row.new_value) : null
      }));

      res.json(logs);
    });
  });
}
