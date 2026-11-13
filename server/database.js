import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set to the Neon Postgres connection string.');
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function toPostgresPlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function normalizeArgs(params, callback) {
  if (typeof params === 'function') return { params: [], callback: params };
  return { params: params || [], callback: callback || (() => {}) };
}

// The routes retain sqlite3's callback API while queries run on Neon Postgres.
const db = {
  run(sql, params, callback) {
    const args = normalizeArgs(params, callback);
    let query = toPostgresPlaceholders(sql);
    if (/^\s*INSERT\b/i.test(query) && !/\bRETURNING\b/i.test(query)) query = `${query.trim()} RETURNING id`;
    client.query(query, args.params)
      .then(result => args.callback.call({ lastID: result.rows[0]?.id, changes: result.rowCount }, null))
      .catch(error => args.callback.call({ lastID: undefined, changes: 0 }, error));
  },
  get(sql, params, callback) {
    const args = normalizeArgs(params, callback);
    client.query(toPostgresPlaceholders(sql), args.params)
      .then(result => args.callback(null, result.rows[0]))
      .catch(error => args.callback(error));
  },
  all(sql, params, callback) {
    const args = normalizeArgs(params, callback);
    client.query(toPostgresPlaceholders(sql), args.params)
      .then(result => args.callback(null, result.rows))
      .catch(error => args.callback(error));
  },
  serialize(callback) { callback(); },
};

async function initializeDatabase() {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'admin', created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, phone TEXT, default_location TEXT, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      delivery_location TEXT NOT NULL, tanker_type TEXT CHECK(tanker_type IN ('Normal', 'Motor')) NOT NULL,
      use_type TEXT CHECK(use_type IN ('Filled', 'Standby', 'Mixed')) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1), use_breakdown TEXT,
      price DOUBLE PRECISION NOT NULL CHECK(price >= 0), order_date TEXT NOT NULL,
      payment_status TEXT CHECK(payment_status IN ('Paid', 'Unpaid', 'Partially Paid')) NOT NULL,
      notes TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY, customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL CHECK(amount >= 0), payment_date TEXT NOT NULL,
      payment_method TEXT CHECK(payment_method IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Other')) NOT NULL,
      notes TEXT, allocated_order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS payment_allocations (
      id SERIAL PRIMARY KEY, payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      amount_allocated DOUBLE PRECISION NOT NULL CHECK(amount_allocated >= 0), UNIQUE(payment_id, order_id)
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY, username TEXT NOT NULL, action TEXT NOT NULL, record_id INTEGER NOT NULL,
      old_value TEXT, new_value TEXT, created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn('No initial admin was seeded. Set ADMIN_USERNAME and ADMIN_PASSWORD for a new database.');
    return;
  }
  const existing = await client.query('SELECT id FROM users WHERE username = $1', [username]);
  if (!existing.rowCount) {
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query('INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)', [username, passwordHash, 'admin']);
    console.log(`Seeded initial admin user: ${username}`);
  }
}

export const databaseReady = initializeDatabase();

export function recalculateAllocations(customerId, callback) {
  db.run('DELETE FROM payment_allocations WHERE payment_id IN (SELECT id FROM payments WHERE customer_id = ?)', [customerId], err => {
    if (err) return callback(err);
    db.all('SELECT id, price FROM orders WHERE customer_id = ? ORDER BY order_date ASC, id ASC', [customerId], (err, orders) => {
      if (err) return callback(err);
      db.all('SELECT id, amount, allocated_order_id FROM payments WHERE customer_id = ? ORDER BY payment_date ASC, id ASC', [customerId], (err, payments) => {
        if (err) return callback(err);
        const orderBalances = Object.fromEntries(orders.map(order => [order.id, order.price]));
        const paymentBalances = Object.fromEntries(payments.map(payment => [payment.id, payment.amount]));
        const allocations = [];
        for (const payment of payments) {
          const orderId = payment.allocated_order_id;
          if (orderId && orderBalances[orderId] !== undefined && paymentBalances[payment.id] > 0 && orderBalances[orderId] > 0) {
            const amount = Math.min(paymentBalances[payment.id], orderBalances[orderId]);
            paymentBalances[payment.id] -= amount; orderBalances[orderId] -= amount;
            allocations.push({ paymentId: payment.id, orderId, amount });
          }
        }
        for (const payment of payments) for (const order of orders) {
          if (paymentBalances[payment.id] <= 0) break;
          if (orderBalances[order.id] <= 0) continue;
          const amount = Math.min(paymentBalances[payment.id], orderBalances[order.id]);
          paymentBalances[payment.id] -= amount; orderBalances[order.id] -= amount;
          const prior = allocations.find(item => item.paymentId === payment.id && item.orderId === order.id);
          if (prior) prior.amount += amount; else allocations.push({ paymentId: payment.id, orderId: order.id, amount });
        }
        if (!allocations.length) return updateOrderStatuses(customerId, callback);
        let completed = 0; let insertError = null;
        allocations.forEach(allocation => db.run(
          'INSERT INTO payment_allocations (payment_id, order_id, amount_allocated) VALUES (?, ?, ?)',
          [allocation.paymentId, allocation.orderId, allocation.amount], error => {
            if (error) insertError = error;
            if (++completed === allocations.length) insertError ? callback(insertError) : updateOrderStatuses(customerId, callback);
          },
        ));
      });
    });
  });
}

function updateOrderStatuses(customerId, callback) {
  db.all(`SELECT o.id, o.price, COALESCE(SUM(pa.amount_allocated), 0) AS total_allocated
    FROM orders o LEFT JOIN payment_allocations pa ON o.id = pa.order_id
    WHERE o.customer_id = ? GROUP BY o.id`, [customerId], (err, orders) => {
    if (err || !orders.length) return callback(err);
    let completed = 0; let updateError = null;
    orders.forEach(order => {
      const status = order.total_allocated >= order.price ? 'Paid' : order.total_allocated > 0 ? 'Partially Paid' : 'Unpaid';
      db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [status, order.id], error => {
        if (error) updateError = error;
        if (++completed === orders.length) callback(updateError);
      });
    });
  });
}

export function logAudit(username, action, recordId, oldValue, newValue, callback = () => {}) {
  db.run('INSERT INTO audit_log (username, action, record_id, old_value, new_value) VALUES (?, ?, ?, ?, ?)',
    [username, action, recordId, oldValue ? JSON.stringify(oldValue) : null, newValue ? JSON.stringify(newValue) : null], callback);
}

export default db;
