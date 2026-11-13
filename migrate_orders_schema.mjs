import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('server/db/rajindera.db');

const ensureTable = () => new Promise((resolve, reject) => {
  db.get("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'orders'", (err, row) => {
    if (err) return reject(err);
    const schema = row?.sql || '';
    const hasMixed = schema.includes("'Filled', 'Standby', 'Mixed'") || schema.includes('Mixed');
    const hasQuantity = schema.includes('quantity');
    if (hasMixed && hasQuantity) {
      console.log('Orders table already supports mixed use and quantity.');
      return resolve();
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
      if (err) return reject(err);
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
      `, (err2) => {
        if (err2) return reject(err2);
        db.run('DROP TABLE orders', (err3) => {
          if (err3) return reject(err3);
          db.run('ALTER TABLE orders_new RENAME TO orders', (err4) => {
            if (err4) return reject(err4);
            console.log('Migrated orders table successfully.');
            resolve();
          });
        });
      });
    });
  });
});

ensureTable()
  .then(() => db.close())
  .catch((err) => {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  });
