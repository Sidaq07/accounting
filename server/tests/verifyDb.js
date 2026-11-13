import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'test.db');
// Delete test DB if exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new sqlite3.Database(dbPath);

console.log('--- RUNNING DB ACCOUNTING LOGIC VERIFICATION ---');

// Define table schemas (minimal subset required for calculations)
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON;');
  db.run(`
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      price REAL NOT NULL,
      order_date TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Unpaid'
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      payment_date TEXT NOT NULL,
      allocated_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount_allocated REAL NOT NULL,
      UNIQUE(payment_id, order_id)
    )
  `);

  // Recalculation algorithm (same as database.js)
  function recalculateAllocations(customerId, callback) {
    db.run(`
      DELETE FROM payment_allocations 
      WHERE payment_id IN (SELECT id FROM payments WHERE customer_id = ?)
    `, [customerId], (err) => {
      if (err) return callback(err);

      db.all(`
        SELECT id, price, order_date FROM orders 
        WHERE customer_id = ? 
        ORDER BY order_date ASC, id ASC
      `, [customerId], (err, orders) => {
        if (err) return callback(err);

        db.all(`
          SELECT id, amount, payment_date, allocated_order_id FROM payments 
          WHERE customer_id = ? 
          ORDER BY payment_date ASC, id ASC
        `, [customerId], (err, payments) => {
          if (err) return callback(err);

          const orderBalances = {};
          orders.forEach(o => {
            orderBalances[o.id] = o.price;
          });

          const paymentBalances = {};
          payments.forEach(p => {
            paymentBalances[p.id] = p.amount;
          });

          const allocationsToInsert = [];

          // Phase 1: Manual Overrides
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

          // Phase 2: FIFO
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
  }

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

  // Scenario 1: Create customer
  db.run("INSERT INTO customers (name) VALUES ('Aman Builders')", function (err) {
    if (err) throw err;
    const customerId = this.lastID;

    // Add Order 1 (₹2,000)
    db.run("INSERT INTO orders (customer_id, price, order_date) VALUES (?, 2000, '2026-08-01')", [customerId], function(err) {
      if (err) throw err;
      
      // Add Order 2 (₹3,000)
      db.run("INSERT INTO orders (customer_id, price, order_date) VALUES (?, 3000, '2026-08-03')", [customerId], function(err) {
        if (err) throw err;

        // Add Order 3 (₹1,500)
        db.run("INSERT INTO orders (customer_id, price, order_date) VALUES (?, 1500, '2026-08-05')", [customerId], function(err) {
          if (err) throw err;

          // Add a general payment of ₹4,000 (FIFO)
          db.run("INSERT INTO payments (customer_id, amount, payment_date) VALUES (?, 4000, '2026-08-06')", [customerId], function(err) {
            if (err) throw err;

            recalculateAllocations(customerId, (err) => {
              if (err) throw err;

              // Verify allocations:
              // Order 1 (2000): should be fully allocated (₹2000)
              // Order 2 (3000): should be partially allocated (₹2000)
              // Order 3 (1500): should be unallocated (₹0)
              db.all("SELECT order_id, amount_allocated FROM payment_allocations", [], (err, rows) => {
                if (err) throw err;

                console.log('\n--- FIFO ALLOCATION TEST (Payment: ₹4,000) ---');
                console.log('Allocations in DB:', rows);
                
                const alloc1 = rows.find(r => r.order_id === 1)?.amount_allocated;
                const alloc2 = rows.find(r => r.order_id === 2)?.amount_allocated;
                const alloc3 = rows.find(r => r.order_id === 3)?.amount_allocated;

                const pass1 = alloc1 === 2000;
                const pass2 = alloc2 === 2000;
                const pass3 = alloc3 === undefined || alloc3 === 0;

                console.log(`Order 1 (₹2000 price) allocated ₹${alloc1 || 0}: ${pass1 ? 'PASS ✅' : 'FAIL ❌'}`);
                console.log(`Order 2 (₹3000 price) allocated ₹${alloc2 || 0}: ${pass2 ? 'PASS ✅' : 'FAIL ❌'}`);
                console.log(`Order 3 (₹1500 price) allocated ₹${alloc3 || 0}: ${pass3 ? 'PASS ✅' : 'FAIL ❌'}`);

                // Test order statuses
                db.all("SELECT id, price, payment_status FROM orders", [], (err, orders) => {
                  if (err) throw err;
                  console.log('\nOrder Statuses in DB:', orders);
                  const o1Status = orders.find(o => o.id === 1)?.payment_status;
                  const o2Status = orders.find(o => o.id === 2)?.payment_status;
                  const o3Status = orders.find(o => o.id === 3)?.payment_status;

                  console.log(`Order 1 Status is '${o1Status}' (Expected: Paid): ${o1Status === 'Paid' ? 'PASS ✅' : 'FAIL ❌'}`);
                  console.log(`Order 2 Status is '${o2Status}' (Expected: Partially Paid): ${o2Status === 'Partially Paid' ? 'PASS ✅' : 'FAIL ❌'}`);
                  console.log(`Order 3 Status is '${o3Status}' (Expected: Unpaid): ${o3Status === 'Unpaid' ? 'PASS ✅' : 'FAIL ❌'}`);

                  // Add a manual override payment: ₹1,500 applied directly to Order 3
                  db.run("INSERT INTO payments (customer_id, amount, payment_date, allocated_order_id) VALUES (?, 1500, '2026-08-07', ?)", [customerId, 3], function(err) {
                    if (err) throw err;

                    recalculateAllocations(customerId, (err) => {
                      if (err) throw err;

                      db.all("SELECT order_id, SUM(amount_allocated) as total_alloc FROM payment_allocations GROUP BY order_id", [], (err, rows) => {
                        if (err) throw err;

                        console.log('\n--- MANUAL OVERRIDE TEST (Payment: ₹1,500 bound to Order 3) ---');
                        console.log('Grouped allocations:', rows);

                        const allocO3 = rows.find(r => r.order_id === 3)?.total_alloc;
                        const passO3 = allocO3 === 1500;

                        console.log(`Order 3 (₹1500 price) manual allocation ₹${allocO3 || 0}: ${passO3 ? 'PASS ✅' : 'FAIL ❌'}`);
                        
                        db.get("SELECT payment_status FROM orders WHERE id = 3", (err, row) => {
                          if (err) throw err;
                          console.log(`Order 3 Status is '${row.payment_status}' (Expected: Paid): ${row.payment_status === 'Paid' ? 'PASS ✅' : 'FAIL ❌'}`);
                          
                          // Cleanup test database
                          db.close((err) => {
                            if (err) throw err;
                            fs.unlinkSync(dbPath);
                            console.log('\nVerification DB tests completed successfully. Cleanup complete.');
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});
