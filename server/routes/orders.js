import db, { logAudit, recalculateAllocations } from '../database.js';
import { authenticateToken } from '../auth.js';

export function registerOrderRoutes(app) {
  // Get all orders with search and filter capabilities
  app.get('/api/orders', authenticateToken, (req, res) => {
    const { 
      search, 
      customerId, 
      location, 
      tankerType, 
      useType, 
      paymentStatus, 
      paymentMethod,
      startDate, 
      endDate 
    } = req.query;

    let sql = `
      SELECT 
        o.id, 
        o.customer_id, 
        c.name as customer_name, 
        c.phone as customer_phone, 
        o.delivery_location, 
        o.tanker_type, 
        o.use_type, 
        o.quantity, 
        o.use_breakdown,
        o.price, 
        o.order_date, 
        o.payment_status, 
        o.notes, 
        o.created_at,
        (SELECT COALESCE(SUM(amount_allocated), 0) FROM payment_allocations WHERE order_id = o.id) as amount_paid
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE 1=1
    `;
    
    const params = [];

    // Filter by Customer
    if (customerId) {
      sql += ` AND o.customer_id = ?`;
      params.push(customerId);
    }

    // Filter by Location
    if (location) {
      sql += ` AND o.delivery_location LIKE ?`;
      params.push(`%${location}%`);
    }

    // Filter by Tanker Type
    if (tankerType) {
      sql += ` AND o.tanker_type = ?`;
      params.push(tankerType);
    }

    // Filter by Use Type
    if (useType) {
      sql += ` AND o.use_type = ?`;
      params.push(useType);
    }

    // Filter by Payment Status
    if (paymentStatus) {
      sql += ` AND o.payment_status = ?`;
      params.push(paymentStatus);
    }

    // Filter by Payment Method (requires joining payments through allocations)
    if (paymentMethod) {
      sql += ` AND o.id IN (
        SELECT order_id FROM payment_allocations pa 
        JOIN payments p ON pa.payment_id = p.id 
        WHERE p.payment_method = ?
      )`;
      params.push(paymentMethod);
    }

    // Filter by Date Range
    if (startDate) {
      sql += ` AND o.order_date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND o.order_date <= ?`;
      params.push(endDate);
    }

    // Global Search
    if (search && search.trim()) {
      const searchPattern = `%${search.trim()}%`;
      sql += ` AND (
        c.name LIKE ? OR 
        c.phone LIKE ? OR 
        o.delivery_location LIKE ? OR 
        o.id = ? OR 
        o.order_date LIKE ?
      )`;
      params.push(searchPattern, searchPattern, searchPattern, parseInt(search.trim()) || -1, searchPattern);
    }

    sql += ` ORDER BY o.order_date DESC, o.id DESC`;

    db.all(sql, params, (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve orders.' });
      }

      // Add balance field on the fly
      const orders = rows.map(row => {
        let displayUseType = row.use_type;
        const breakdown = row.use_breakdown ? (() => { try { return JSON.parse(row.use_breakdown); } catch { return null; } })() : null;

        if (breakdown && (Number(breakdown.filled) > 0 || Number(breakdown.standby) > 0)) {
          const filled = Number(breakdown.filled || 0);
          const standby = Number(breakdown.standby || 0);
          if (filled > 0 && standby > 0) {
            displayUseType = `${filled} Filled / ${standby} Standby`;
          } else if (filled > 0) {
            displayUseType = 'Filled';
          } else if (standby > 0) {
            displayUseType = 'Standby';
          }
        }

        return {
          ...row,
          quantity: Number(row.quantity || 1),
          display_use_type: displayUseType,
          balance: Math.round((row.price - row.amount_paid) * 100) / 100
        };
      });

      res.json(orders);
    });
  });

  // Get specific order details
  app.get('/api/orders/:id', authenticateToken, (req, res) => {
    const orderId = req.params.id;
    const sql = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
        (SELECT COALESCE(SUM(amount_allocated), 0) FROM payment_allocations WHERE order_id = o.id) as amount_paid
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `;

    db.get(sql, [orderId], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!row) return res.status(404).json({ error: 'Order not found.' });

      row.balance = Math.round((row.price - row.amount_paid) * 100) / 100;
      res.json(row);
    });
  });

  // Add new order
  app.post('/api/orders', authenticateToken, (req, res) => {
    const { 
      customerId, 
      deliveryLocation, 
      tankerType, 
      useType, 
      quantity = 1,
      useBreakdown,
      price, 
      orderDate, 
      paymentStatus, 
      amountPaid, 
      paymentMethod, 
      notes 
    } = req.body;

    const qty = Number(quantity) || 1;
    const breakdown = typeof useBreakdown === 'string' ? (() => { try { return JSON.parse(useBreakdown); } catch { return {}; } })() : (useBreakdown || {});
    const filledCount = Number(breakdown.filled || 0);
    const standbyCount = Number(breakdown.standby || 0);
    const effectiveUseType = useType === 'Mixed' ? 'Mixed' : (useType || 'Filled');

    if (!customerId || !deliveryLocation || !tankerType || !effectiveUseType || price === undefined || !orderDate || !paymentStatus) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    if (qty < 1 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Quantity must be a whole number greater than 0.' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative.' });
    }

    const mixedSummary = (useType === 'Mixed' || (filledCount > 0 && standbyCount > 0))
      ? JSON.stringify({ filled: filledCount, standby: standbyCount })
      : null;

    if (useType === 'Mixed' && filledCount + standbyCount !== qty) {
      return res.status(400).json({ error: 'For a mixed order, the filled and standby quantities must add up to the total tanker quantity.' });
    }

    // Insert order in a transaction block (simulated serialize)
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      db.run(
        `INSERT INTO orders (customer_id, delivery_location, tanker_type, use_type, quantity, use_breakdown, price, order_date, payment_status, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customerId, deliveryLocation.trim(), tankerType, effectiveUseType, qty, mixedSummary, price, orderDate, paymentStatus, notes ? notes.trim() : null],
        function (err) {
          if (err) {
            console.error('Order insert failed:', err);
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to create order.' });
          }

          const orderId = this.lastID;

          // If immediate payment was logged
          const paymentAmt = parseFloat(amountPaid) || 0;
          if (paymentAmt > 0) {
            if (paymentAmt < 0) {
              db.run('ROLLBACK');
              return res.status(400).json({ error: 'Payment amount cannot be negative.' });
            }
            if (paymentAmt > price) {
              db.run('ROLLBACK');
              return res.status(400).json({ error: 'Immediate payment cannot exceed order price.' });
            }

            db.run(
              `INSERT INTO payments (customer_id, amount, payment_date, payment_method, notes, allocated_order_id)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [customerId, paymentAmt, orderDate, paymentMethod || 'Cash', `Immediate payment for order #${orderId}`, orderId],
              function (err) {
                if (err) {
                  db.run('ROLLBACK');
                  return res.status(500).json({ error: 'Failed to record immediate payment.' });
                }

                // Recalculate allocations inside the transaction
                recalculateAllocations(customerId, (err) => {
                  if (err) {
                    console.error('recalculateAllocations failed on create:', err);
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to calculate accounting ledger.' });
                  }

                  db.run('COMMIT');
                  
                  // Audit log
                  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, orderRecord) => {
                    logAudit(req.user.username, 'CREATE_ORDER', orderId, null, orderRecord);
                  });

                  res.status(201).json({ message: 'Order and immediate payment logged successfully.', orderId });
                });
              }
            );
          } else {
            // No immediate payment, just recalculate allocations (to apply any existing advance payments if available)
            recalculateAllocations(customerId, (err) => {
              if (err) {
                console.error('recalculateAllocations failed on create without payment:', err);
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to calculate accounting ledger.' });
              }

              db.run('COMMIT');

              db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, orderRecord) => {
                logAudit(req.user.username, 'CREATE_ORDER', orderId, null, orderRecord);
              });

              res.status(201).json({ message: 'Order logged successfully.', orderId });
            });
          }
        }
      );
    });
  });

  // Edit order
  app.put('/api/orders/:id', authenticateToken, (req, res) => {
    const orderId = req.params.id;
    const { 
      customerId,
      deliveryLocation, 
      tankerType, 
      useType, 
      quantity = 1,
      useBreakdown,
      price, 
      orderDate, 
      notes 
    } = req.body;

    const qty = Number(quantity) || 1;
    const breakdown = typeof useBreakdown === 'string' ? (() => { try { return JSON.parse(useBreakdown); } catch { return {}; } })() : (useBreakdown || {});
    const filledCount = Number(breakdown.filled || 0);
    const standbyCount = Number(breakdown.standby || 0);
    const effectiveUseType = useType === 'Mixed' ? 'Mixed' : (useType || 'Filled');

    if (!deliveryLocation || !tankerType || !effectiveUseType || price === undefined || !orderDate) {
      return res.status(400).json({ error: 'Missing required order fields.' });
    }

    if (qty < 1 || !Number.isInteger(qty)) {
      return res.status(400).json({ error: 'Quantity must be a whole number greater than 0.' });
    }

    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative.' });
    }

    const mixedSummary = (useType === 'Mixed' || (filledCount > 0 && standbyCount > 0))
      ? JSON.stringify({ filled: filledCount, standby: standbyCount })
      : null;

    if (useType === 'Mixed' && filledCount + standbyCount !== qty) {
      return res.status(400).json({ error: 'For a mixed order, the filled and standby quantities must add up to the total tanker quantity.' });
    }

    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, oldOrder) => {
      if (err || !oldOrder) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const originalCustomerId = oldOrder.customer_id;
      const targetCustomerId = customerId || originalCustomerId; // If customer changed

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run(
          `UPDATE orders 
           SET customer_id = ?, delivery_location = ?, tanker_type = ?, use_type = ?, quantity = ?, use_breakdown = ?, price = ?, order_date = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [targetCustomerId, deliveryLocation.trim(), tankerType, effectiveUseType, qty, mixedSummary, price, orderDate, notes ? notes.trim() : null, orderId],
          function (err) {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to update order.' });
            }

            // Recalculate allocation for original customer
            recalculateAllocations(originalCustomerId, (err) => {
              if (err) {
                db.run('ROLLBACK');
                return res.status(500).json({ error: 'Failed to recalculate old customer allocations.' });
              }

              // Recalculate allocation for new customer if changed
              if (originalCustomerId !== targetCustomerId) {
                recalculateAllocations(targetCustomerId, (err) => {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ error: 'Failed to recalculate new customer allocations.' });
                  }
                  
                  db.run('COMMIT');
                  db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, newOrder) => {
                    logAudit(req.user.username, 'EDIT_ORDER', orderId, oldOrder, newOrder);
                  });
                  res.json({ message: 'Order edited successfully and accounts updated.' });
                });
              } else {
                db.run('COMMIT');
                db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, newOrder) => {
                  logAudit(req.user.username, 'EDIT_ORDER', orderId, oldOrder, newOrder);
                });
                res.json({ message: 'Order edited successfully and accounts updated.' });
              }
            });
          }
        );
      });
    });
  });

  // Delete order
  app.delete('/api/orders/:id', authenticateToken, (req, res) => {
    const orderId = req.params.id;

    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
      if (err || !order) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      const customerId = order.customer_id;

      db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        db.run('DELETE FROM orders WHERE id = ?', [orderId], function (err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Failed to delete order.' });
          }

          // Recalculate allocations for customer (so payments bound to this order are released/re-allocated)
          recalculateAllocations(customerId, (err) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: 'Failed to re-allocate customer balances.' });
            }

            db.run('COMMIT');
            logAudit(req.user.username, 'DELETE_ORDER', orderId, order, null);
            res.json({ message: 'Order deleted successfully and accounts recalculated.' });
          });
        });
      });
    });
  });
}
