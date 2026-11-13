import 'dotenv/config';
import sqlite3 from 'sqlite3';
import pg from 'pg';

const sourcePath = process.argv[2] || 'server/db/rajindera.db';
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('Set DATABASE_URL before running this import.');
}

const sqlite = new sqlite3.Database(sourcePath);
const { Client } = pg;
const target = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

function all(sql) {
  return new Promise((resolve, reject) => sqlite.all(sql, (error, rows) => error ? reject(error) : resolve(rows)));
}

async function copyTable(table, columns) {
  const rows = await all(`SELECT ${columns.join(', ')} FROM ${table}`);
  if (!rows.length) return;
  const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  const updates = columns.filter(column => column !== 'id').map(column => `${column} = EXCLUDED.${column}`).join(', ');
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
  for (const row of rows) await target.query(sql, columns.map(column => row[column]));
  await target.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`);
  console.log(`Imported ${rows.length} ${table} record(s).`);
}

try {
  await target.connect();
  await copyTable('customers', ['id', 'name', 'phone', 'default_location', 'notes', 'created_at', 'updated_at']);
  await copyTable('orders', ['id', 'customer_id', 'delivery_location', 'tanker_type', 'use_type', 'quantity', 'use_breakdown', 'price', 'order_date', 'payment_status', 'notes', 'created_at', 'updated_at']);
  await copyTable('payments', ['id', 'customer_id', 'amount', 'payment_date', 'payment_method', 'notes', 'allocated_order_id', 'created_at']);
  await copyTable('payment_allocations', ['id', 'payment_id', 'order_id', 'amount_allocated']);
  await copyTable('audit_log', ['id', 'username', 'action', 'record_id', 'old_value', 'new_value', 'created_at']);
} finally {
  sqlite.close();
  await target.end();
}
