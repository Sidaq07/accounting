import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DATABASE_PATH should point to a persistent volume in production. The local
// path remains the default for development.
const defaultDbPath = path.join(__dirname, 'db', 'rajindera.db');
export const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : defaultDbPath;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath);

// Enable foreign keys
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;');

  // 1. Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Customers Table
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      default_location TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Orders Table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      delivery_location TEXT NOT NULL,
      tanker_type TEXT CHECK(tanker_type IN ('Normal', 'Motor')) NOT NULL,
      use_type TEXT CHECK(use_type IN ('Filled', 'Standby')) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
      use_breakdown TEXT,
      price REAL NOT NULL CHECK(price >= 0),
      order_date TEXT NOT NULL, -- YYYY-MM-DD
      payment_status TEXT CHECK(payment_status IN ('Paid', 'Unpaid', 'Partially Paid')) NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const migrateOrdersTable = () => {
    db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'", (err, row) => {
      if (err) {
        console.error('Error reading orders schema:', err);
        return;
      }

      const schemaSql = row?.sql || '';
      const hasMixedUse = schemaSql.includes("'Filled', 'Standby', 'Mixed'") || schemaSql.includes('Mixed');
      const hasQuantity = schemaSql.includes('quantity');

      if (hasMixedUse && hasQuantity) {
        return;
      }

      const migrateSql = `
        CREATE TABLE orders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          delivery_location TEXT NOT NULL,
          tanker_type TEXT CHECK(tanker_type IN ('Normal', 'Motor')) NOT NULL,
          use_type TEXT CHECK(use_type IN ('Filled', 'Standby', 'Mixed')) NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
          use_breakdown TEXT,
          price REAL NOT NULL CHECK(price >= 0),
          order_date TEXT NOT NULL,
          payment_status TEXT CHECK(payment_status IN ('Paid', 'Unpaid', 'Partially Paid')) NOT NULL,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `;

      db.run(migrateSql, (err) => {
        if (err) {
          console.error('Error creating migrated orders table:', err);
          return;
        }

        db.run(`
          INSERT INTO orders_new (
            id, customer_id, delivery_location, tanker_type, use_type, quantity, use_breakdown,
            price, order_date, payment_status, notes, created_at, updated_at
          )
          SELECT
            id, customer_id, delivery_location, tanker_type,
            CASE
              WHEN use_type IN ('Filled', 'Standby', 'Mixed') THEN use_type
              ELSE 'Filled'
            END,
            COALESCE(quantity, 1),
            use_breakdown,
            price, order_date, payment_status, notes, created_at, updated_at
          FROM orders;
        `, (err) => {
          if (err) {
            console.error('Error copying orders into migrated table:', err);
            return;
          }

          db.run('DROP TABLE orders', (err) => {
            if (err) {
              console.error('Error dropping legacy orders table:', err);
              return;
            }

            db.run('ALTER TABLE orders_new RENAME TO orders', (err) => {
              if (err) {
                console.error('Error renaming migrated orders table:', err);
              } else {
                console.log('Migrated orders table to support quantity and mixed tanker use.');
              }
            });
          });
        });
      });
    });
  };

  migrateOrdersTable();

  // 4. Payments Table
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      amount REAL NOT NULL CHECK(amount >= 0),
      payment_date TEXT NOT NULL, -- YYYY-MM-DD
      payment_method TEXT CHECK(payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')) NOT NULL,
      notes TEXT,
      allocated_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL, -- optional manual override
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Payment Allocations Table
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount_allocated REAL NOT NULL CHECK(amount_allocated >= 0),
      UNIQUE(payment_id, order_id)
    )
  `);

  // 6. Audit Log Table
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      action TEXT NOT NULL,
      record_id INTEGER NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed an administrator only for a new database. Existing passwords are
  // never changed automatically, including on service restarts.
  const adminUsername = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminUsername || !adminPassword) {
    console.warn('No initial admin was seeded. Set ADMIN_USERNAME and ADMIN_PASSWORD for a new database.');
    return;
  }

  db.get('SELECT * FROM users WHERE username = ?', [adminUsername], (err, user) => {
    if (err) {
      console.error('Error querying admin user:', err);
      return;
    }

    if (!user) {
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        if (err) {
          console.error('Error hashing default password:', err);
          return;
        }

        db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [adminUsername, hash, 'admin'], (err) => {
          if (err) {
            console.error('Error seeding default admin:', err);
          } else {
          console.log(`Seeded initial admin user: ${adminUsername}`);
          }
        });
      });
      return;
    }

    console.log(`Initial admin user already exists: ${adminUsername}`);
  });
});

/**
 * Recalculate payment allocations for a customer.
 * This guarantees the integrity of our double-entry style accounting.
 */
export function recalculateAllocations(customerId, callback) {
  db.serialize(() => {
    // 1. Delete all existing allocations for this customer
    db.run(`
      DELETE FROM payment_allocations 
      WHERE payment_id IN (SELECT id FROM payments WHERE customer_id = ?)
    `, [customerId], (err) => {
      if (err) return callback(err);

      // 2. Fetch all orders for this customer ordered by date ASC, id ASC
      db.all(`
        SELECT id, price, order_date FROM orders 
        WHERE customer_id = ? 
        ORDER BY order_date ASC, id ASC
      `, [customerId], (err, orders) => {
        if (err) return callback(err);

        // 3. Fetch all payments for this customer ordered by date ASC, id ASC
        db.all(`
          SELECT id, amount, payment_date, allocated_order_id FROM payments 
          WHERE customer_id = ? 
          ORDER BY payment_date ASC, id ASC
        `, [customerId], (err, payments) => {
          if (err) return callback(err);

          // Track order remaining balances
          const orderBalances = {};
          orders.forEach(o => {
            orderBalances[o.id] = o.price;
          });

          // Track payment remaining balances
          const paymentBalances = {};
          payments.forEach(p => {
            paymentBalances[p.id] = p.amount;
          });

          const allocationsToInsert = [];

          // Phase 1: Handle Manual Overrides first
          payments.forEach(p => {
            if (p.allocated_order_id && orderBalances[p.allocated_order_id] !== undefined) {
              const orderId = p.allocated_order_id;
              const availablePayment = paymentBalances[p.id];
              const outstandingOrder = orderBalances[orderId];
              
              if (availablePayment > 0 && outstandingOrder > 0) {
                const allocated = Math.min(availablePayment, outstandingOrder);
                orderBalances[orderId] -= allocated;
                paymentBalances[p.id] -= allocated;
                allocationsToInsert.push({
                  payment_id: p.id,
                  order_id: orderId,
                  amount_allocated: allocated
                });
              }
            }
          });

          // Phase 2: Handle FIFO for the remaining payments and orders
          payments.forEach(p => {
            let availablePayment = paymentBalances[p.id];
            if (availablePayment <= 0) return;

            for (let i = 0; i < orders.length; i++) {
              const o = orders[i];
              const outstandingOrder = orderBalances[o.id];
              if (outstandingOrder <= 0) continue;

              const allocated = Math.min(availablePayment, outstandingOrder);
              orderBalances[o.id] -= allocated;
              availablePayment -= allocated;
              paymentBalances[p.id] = availablePayment;

              // Check if we already have an allocation for this payment-order pair (due to manual override)
              const existing = allocationsToInsert.find(x => x.payment_id === p.id && x.order_id === o.id);
              if (existing) {
                existing.amount_allocated += allocated;
              } else {
                allocationsToInsert.push({
                  payment_id: p.id,
                  order_id: o.id,
                  amount_allocated: allocated
                });
              }

              if (availablePayment <= 0) break;
            }
          });

          // 4. Insert all computed allocations
          if (allocationsToInsert.length === 0) {
            return updateOrderStatuses(customerId, callback);
          }

          let completed = 0;
          let insertErr = null;

          allocationsToInsert.forEach(alloc => {
            db.run(`
              INSERT INTO payment_allocations (payment_id, order_id, amount_allocated)
              VALUES (?, ?, ?)
            `, [alloc.payment_id, alloc.order_id, alloc.amount_allocated], (err) => {
              if (err) insertErr = err;
              completed++;
              if (completed === allocationsToInsert.length) {
                if (insertErr) return callback(insertErr);
                updateOrderStatuses(customerId, callback);
              }
            });
          });
        });
      });
    });
  });
}

/**
 * Update the payment status (Paid, Unpaid, Partially Paid) of all orders for a customer.
 */
function updateOrderStatuses(customerId, callback) {
  db.all(`
    SELECT o.id, o.price, COALESCE(SUM(pa.amount_allocated), 0) as total_allocated
    FROM orders o
    LEFT JOIN payment_allocations pa ON o.id = pa.order_id
    WHERE o.customer_id = ?
    GROUP BY o.id
  `, [customerId], (err, orders) => {
    if (err) return callback(err);

    if (orders.length === 0) return callback(null);

    let completed = 0;
    let updateErr = null;

    orders.forEach(o => {
      let status = 'Unpaid';
      if (o.total_allocated >= o.price) {
        status = 'Paid';
      } else if (o.total_allocated > 0) {
        status = 'Partially Paid';
      }

      db.run(`
        UPDATE orders 
        SET payment_status = ? 
        WHERE id = ?
      `, [status, o.id], (err) => {
        if (err) updateErr = err;
        completed++;
        if (completed === orders.length) {
          callback(updateErr);
        }
      });
    });
  });
}

/**
 * Log administrative operations for audit trail
 */
export function logAudit(username, action, recordId, oldValue, newValue, callback = () => {}) {
  db.run(`
    INSERT INTO audit_log (username, action, record_id, old_value, new_value)
    VALUES (?, ?, ?, ?, ?)
  `, [
    username,
    action,
    recordId,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null
  ], callback);
}

export default db;
