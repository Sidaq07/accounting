import db, { logAudit } from '../database.js';
import { authenticateToken } from '../auth.js';

export function registerCustomerRoutes(app) {
  // Get all customers with accounts summary
  app.get('/api/customers', authenticateToken, (req, res) => {
    const sql = `
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.default_location, 
        c.notes, 
        c.created_at,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(price), 0) FROM orders WHERE customer_id = c.id) as total_business,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as total_received,
        (SELECT MAX(order_date) FROM orders WHERE customer_id = c.id) as last_order_date
      FROM customers c
      ORDER BY c.name ASC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve customers.' });
      }

      // Calculate outstanding and status on the fly
      const customers = rows.map(row => {
        const outstanding = row.total_business - row.total_received;
        return {
          ...row,
          outstanding: Math.round(outstanding * 100) / 100,
          account_status: outstanding > 0 ? 'Pending' : 'Cleared'
        };
      });

      res.json(customers);
    });
  });

  // Get customer by ID with detailed transaction ledger
  app.get('/api/customers/:id', authenticateToken, (req, res) => {
    const customerId = req.params.id;

    // 1. Get customer basic info and summary
    const summarySql = `
      SELECT 
        c.id, 
        c.name, 
        c.phone, 
        c.default_location, 
        c.notes, 
        c.created_at,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(price), 0) FROM orders WHERE customer_id = c.id) as total_business,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE customer_id = c.id) as total_received
      FROM customers c
      WHERE c.id = ?
    `;

    db.get(summarySql, [customerId], (err, customer) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!customer) return res.status(404).json({ error: 'Customer not found.' });

      customer.outstanding = Math.round((customer.total_business - customer.total_received) * 100) / 100;
      customer.account_status = customer.outstanding > 0 ? 'Pending' : 'Cleared';

      // 2. Get customer orders
      db.all(`
        SELECT id, delivery_location, tanker_type, use_type, price, order_date, payment_status, notes,
          (SELECT COALESCE(SUM(amount_allocated), 0) FROM payment_allocations WHERE order_id = orders.id) as amount_paid
        FROM orders 
        WHERE customer_id = ? 
        ORDER BY order_date DESC, id DESC
      `, [customerId], (err, orders) => {
        if (err) return res.status(500).json({ error: 'Failed to retrieve customer orders.' });

        // Add outstanding balance to each order object
        const enrichedOrders = orders.map(o => ({
          ...o,
          balance: Math.round((o.price - o.amount_paid) * 100) / 100
        }));

        // 3. Get customer payments
        db.all(`
          SELECT id, amount, payment_date, payment_method, notes, allocated_order_id, created_at
          FROM payments 
          WHERE customer_id = ? 
          ORDER BY payment_date DESC, id DESC
        `, [customerId], (err, payments) => {
          if (err) return res.status(500).json({ error: 'Failed to retrieve customer payments.' });

          // 4. Combine into chronological transaction list (Statement Ledger)
          // Debit = Tanker Order, Credit = Payment Received
          const transactions = [];

          enrichedOrders.forEach(o => {
            transactions.push({
              id: `O-${o.id}`,
              dbId: o.id,
              type: 'Order',
              date: o.order_date,
              description: `Tanker Delivery: ${o.tanker_type} / ${o.use_type}`,
              location: o.delivery_location,
              debit: o.price,
              credit: 0,
              payment_status: o.payment_status,
              amount_paid: o.amount_paid,
              balance: o.balance,
              notes: o.notes
            });
          });

          payments.forEach(p => {
            transactions.push({
              id: `P-${p.id}`,
              dbId: p.id,
              type: 'Payment',
              date: p.payment_date,
              description: `Payment Received via ${p.payment_method}${p.allocated_order_id ? ` (Applied to Order #${p.allocated_order_id})` : ''}`,
              location: '',
              debit: 0,
              credit: p.amount,
              payment_status: '',
              amount_paid: 0,
              balance: 0,
              notes: p.notes
            });
          });

          // Sort chronologically ascending to calculate running balance
          transactions.sort((a, b) => {
            if (a.date !== b.date) {
              return new Date(a.date) - new Date(b.date);
            }
            // If dates are equal, put orders before payments or use ID string comparison
            return a.id.localeCompare(b.id);
          });

          let runningBalance = 0;
          const ledgerWithRunningBalance = transactions.map(t => {
            runningBalance += t.debit;
            runningBalance -= t.credit;
            return {
              ...t,
              runningBalance: Math.round(runningBalance * 100) / 100
            };
          });

          // Return sorted descending for UI table view, but keep running balance calculated chronologically
          ledgerWithRunningBalance.reverse();

          res.json({
            customer,
            orders: enrichedOrders,
            payments,
            ledger: ledgerWithRunningBalance
          });
        });
      });
    });
  });

  // Add new customer
  app.post('/api/customers', authenticateToken, (req, res) => {
    const { name, phone, default_location, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    db.run(
      'INSERT INTO customers (name, phone, default_location, notes) VALUES (?, ?, ?, ?)',
      [name.trim(), phone ? phone.trim() : null, default_location ? default_location.trim() : null, notes ? notes.trim() : null],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to create customer.' });
        }

        const newCustomerId = this.lastID;
        db.get('SELECT * FROM customers WHERE id = ?', [newCustomerId], (err, row) => {
          if (err) return res.status(500).json({ error: 'Failed to fetch new customer.' });

          logAudit(req.user.username, 'CREATE_CUSTOMER', newCustomerId, null, row);
          res.status(201).json(row);
        });
      }
    );
  });

  // Edit customer
  app.put('/api/customers/:id', authenticateToken, (req, res) => {
    const customerId = req.params.id;
    const { name, phone, default_location, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }

    db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, oldCustomer) => {
      if (err || !oldCustomer) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      db.run(
        `UPDATE customers 
         SET name = ?, phone = ?, default_location = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name.trim(), phone ? phone.trim() : null, default_location ? default_location.trim() : null, notes ? notes.trim() : null, customerId],
        function (err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to update customer.' });
          }

          db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, newCustomer) => {
            logAudit(req.user.username, 'EDIT_CUSTOMER', customerId, oldCustomer, newCustomer);
            res.json(newCustomer);
          });
        }
      );
    });
  });

  // Delete customer (and its orders/payments automatically via foreign keys cascades)
  app.delete('/api/customers/:id', authenticateToken, (req, res) => {
    const customerId = req.params.id;

    db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, customer) => {
      if (err || !customer) {
        return res.status(404).json({ error: 'Customer not found.' });
      }

      db.run('DELETE FROM customers WHERE id = ?', [customerId], function (err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete customer.' });
        }

        logAudit(req.user.username, 'DELETE_CUSTOMER', customerId, customer, null);
        res.json({ message: 'Customer and all associated records deleted successfully.' });
      });
    });
  });
}
