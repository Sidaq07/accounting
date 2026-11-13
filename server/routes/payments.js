import db, { logAudit, recalculateAllocations } from '../database.js';
import { authenticateToken } from '../auth.js';

export function registerPaymentRoutes(app) {
  // Get payments with filters
  app.get('/api/payments', authenticateToken, (req, res) => {
    const { search, customerId, paymentMethod, startDate, endDate } = req.query;

    let sql = `
      SELECT 
        p.id, 
        p.customer_id, 
        c.name as customer_name, 
        c.phone as customer_phone, 
        p.amount, 
        p.payment_date, 
        p.payment_method, 
        p.notes,
        p.allocated_order_id,
        p.created_at
      FROM payments p
      JOIN customers c ON p.customer_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by Customer
    if (customerId) {
      sql += ` AND p.customer_id = ?`;
      params.push(customerId);
    }

    // Filter by Payment Method
    if (paymentMethod) {
      sql += ` AND p.payment_method = ?`;
      params.push(paymentMethod);
    }

    // Filter by Date Range
    if (startDate) {
      sql += ` AND p.payment_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND p.payment_date <= ?`;
      params.push(endDate);
    }

    // Search
    if (search && search.trim()) {
      const pattern = `%${search.trim()}%`;
      sql += ` AND (
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        p.notes LIKE ? OR 
        p.id = ?
      )`;
      params.push(pattern, pattern, pattern, parseInt(search.trim()) || -1);
    }

    sql += ` ORDER BY p.payment_date DESC, p.id DESC`;

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve payments.' });
      }
      res.json(rows);
    });
  });

  // Record a payment
  app.post('/api/payments', authenticateToken, (req, res) => {
    const { 
      customerId, 
      amount, 
      paymentDate, 
      paymentMethod, 
      notes, 
      allocatedOrderId 
    } = req.body;

    if (!customerId || amount === undefined || !paymentDate || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required payment fields.' });
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res.status(400).json({ error: 'Payment amount must be a positive number.' });
    }

    db.serialize(() => {
      // Calculate outstanding balances before payment
      const balSql = `
        SELECT 
          (SELECT COALESCE(SUM(price), 0) FROM orders WHERE customer_id = ?) as total_business,
          (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = ?) as total_received
      `;

      db.get(balSql, [customerId, customerId], (err, balances) => {
        if (err) return res.status(500).json({ error: 'Database error while checking balance.' });

        const previousOutstanding = balances.total_business - balances.total_received;

        db.run('BEGIN TRANSACTION');

        db.run(
          `INSERT INTO payments (customer_id, amount, payment_date, payment_method, notes, allocated_order_id)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [customerId, amt, paymentDate, paymentMethod, notes ? notes.trim() : null, allocatedOrderId || null],
          function (err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to record payment.' });
            }

            const paymentId = this.lastID;

            recalculateAllocations(customerId, (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to allocate payment.' });
              }

              db.run('COMMIT');

              const newOutstanding = previousOutstanding - amt;

              db.get('SELECT * FROM payments WHERE id = ?', [paymentId], (err, paymentRecord) => {
                logAudit(req.user.username, 'RECORD_PAYMENT', paymentId, null, paymentRecord);
              });

              res.status(201).json({
                message: 'Payment recorded successfully.',
                paymentId,
                previousOutstanding: Math.round(previousOutstanding * 100) / 100,
                newOutstanding: Math.round(newOutstanding * 100) / 100
              });
            });
          }
        );
      });
    });
  });

  // Delete payment (reverses allocations and recalculates)
  app.delete('/api/payments/:id', authenticateToken, (req, res) => {
    const paymentId = req.params.id;

    db.get('SELECT * FROM payments WHERE id = ?', [paymentId], (err, payment) => {
      if (err || !payment) {
        return res.status(404).json({ error: 'Payment record not found.' });
      }

      const customerId = payment.customer_id;

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run('DELETE FROM payments WHERE id = ?', [paymentId], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete payment.' });
          }

          recalculateAllocations(customerId, (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update allocations after payment delete.' });
            }

            db.run('COMMIT');
            logAudit(req.user.username, 'REVERSE_PAYMENT', paymentId, payment, null);
            res.json({ message: 'Payment deleted and ledger updated successfully.' });
          });
        });
      });
    });
  });
}
