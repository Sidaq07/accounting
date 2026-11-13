import db from '../database.js';
import { authenticateToken } from '../auth.js';

// Helper to format date as YYYY-MM-DD in IST timezone (Asia/Kolkata)
function getLocalDateString(dateObj = new Date()) {
  const options = { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' };
  const formatter = new Intl.DateTimeFormat('en-CA', options); // en-CA gives YYYY-MM-DD format
  return formatter.format(dateObj);
}

export function registerReportRoutes(app) {
  // Get dashboard stats summary
  app.get('/api/reports/dashboard-summary', authenticateToken, (req, res) => {
    const today = getLocalDateString();

    const queries = {
      todayOrders: `SELECT COUNT(*) as count FROM orders WHERE order_date = ?`,
      todaySales: `SELECT COALESCE(SUM(price), 0) as total FROM orders WHERE order_date = ?`,
      totalCustomers: `SELECT COUNT(*) as count FROM customers`,
      totalOrders: `SELECT COUNT(*) as count FROM orders`,
      totalBusiness: `SELECT COALESCE(SUM(price), 0) as total FROM orders`,
      totalReceived: `SELECT COALESCE(SUM(amount), 0) as total FROM payments`,
      paidOrders: `SELECT COUNT(*) as count FROM orders WHERE payment_status = 'Paid'`,
      unpaidOrders: `SELECT COUNT(*) as count FROM orders WHERE payment_status = 'Unpaid'`,
      recentOrders: `
        SELECT o.id, o.order_date, c.name as customer_name, o.delivery_location, o.tanker_type, o.use_type, o.price, o.payment_status
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        ORDER BY o.order_date DESC, o.id DESC
        LIMIT 10
      `
    };

    const results = {};
    let completed = 0;
    const queryKeys = Object.keys(queries);

    queryKeys.forEach(key => {
      const sql = queries[key];
      const params = (key === 'todayOrders' || key === 'todaySales') ? [today] : [];

      db.all(sql, params, (err, rows) => {
        if (err) {
          console.error(`Error in dashboard query ${key}:`, err);
          return res.status(500).json({ error: `Database error in summary card ${key}.` });
        }

        if (key === 'recentOrders') {
          results[key] = rows;
        } else {
          results[key] = rows[0].count !== undefined ? rows[0].count : rows[0].total;
        }

        completed++;
        if (completed === queryKeys.length) {
          // Calculate Outstanding dynamically
          const outstanding = results.totalBusiness - results.totalReceived;
          res.json({
            todayOrders: results.todayOrders,
            todaySales: results.todaySales,
            totalCustomers: results.totalCustomers,
            totalOrders: results.totalOrders,
            totalBusiness: results.totalBusiness,
            totalReceived: results.totalReceived,
            totalOutstanding: Math.round(outstanding * 100) / 100,
            paidOrders: results.paidOrders,
            unpaidOrders: results.unpaidOrders,
            recentOrders: results.recentOrders
          });
        }
      });
    });
  });

  // Date-wise reports endpoint
  app.get('/api/reports/business-report', authenticateToken, (req, res) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and End date are required.' });
    }

    const reportSql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(price), 0) as total_sales,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE payment_date >= ? AND payment_date <= ?
        ) as total_received,
        SUM(CASE WHEN tanker_type = 'Normal' THEN 1 ELSE 0 END) as normal_tankers,
        SUM(CASE WHEN tanker_type = 'Motor' THEN 1 ELSE 0 END) as motor_tankers,
        SUM(CASE WHEN use_type = 'Filled' THEN 1 ELSE 0 END) as filled_orders,
        SUM(CASE WHEN use_type = 'Standby' THEN 1 ELSE 0 END) as standby_orders
      FROM orders
      WHERE order_date >= ? AND order_date <= ?
    `;

    db.get(reportSql, [startDate, endDate, startDate, endDate], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to generate date-wise report.' });
      }

      // Calculate outstanding for orders placed in this period
      // Outstanding = sum of prices in range - sum of allocations to these orders
      const allocationSql = `
        SELECT COALESCE(SUM(amount_allocated), 0) as allocated
        FROM payment_allocations
        WHERE order_id IN (
          SELECT id FROM orders WHERE order_date >= ? AND order_date <= ?
        )
      `;

      db.get(allocationSql, [startDate, endDate], (err, allocRow) => {
        if (err) return res.status(500).json({ error: 'Failed to retrieve period allocations.' });

        const outstandingForPeriod = row.total_sales - allocRow.allocated;

        res.json({
          totalOrders: row.total_orders,
          totalSales: row.total_sales,
          totalReceived: row.total_received, // payments entered within date range
          outstanding: Math.round(outstandingForPeriod * 100) / 100, // outstanding of orders created in range
          normalTankers: row.normal_tankers || 0,
          motorTankers: row.motor_tankers || 0,
          filledOrders: row.filled_orders || 0,
          standbyOrders: row.standby_orders || 0
        });
      });
    });
  });

  // Monthly account report
  app.get('/api/reports/monthly', authenticateToken, (req, res) => {
    const { month, year } = req.query; // format: MM (01-12) and YYYY

    if (!month || !year) {
      return res.status(400).json({ error: 'Month and year are required.' });
    }

    const monthPattern = `${year}-${month}-%`;

    const monthlySql = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(price), 0) as total_business,
        (
          SELECT COALESCE(SUM(amount), 0) 
          FROM payments 
          WHERE payment_date LIKE ?
        ) as total_received,
        SUM(CASE WHEN tanker_type = 'Normal' THEN 1 ELSE 0 END) as normal_tankers,
        SUM(CASE WHEN tanker_type = 'Motor' THEN 1 ELSE 0 END) as motor_tankers,
        SUM(CASE WHEN use_type = 'Filled' THEN 1 ELSE 0 END) as filled_orders,
        SUM(CASE WHEN use_type = 'Standby' THEN 1 ELSE 0 END) as standby_orders
      FROM orders
      WHERE order_date LIKE ?
    `;

    db.get(monthlySql, [monthPattern, monthPattern], (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to retrieve monthly stats.' });
      }

      // Calculate outstanding on monthly orders
      const allocSql = `
        SELECT COALESCE(SUM(amount_allocated), 0) as allocated
        FROM payment_allocations
        WHERE order_id IN (
          SELECT id FROM orders WHERE order_date LIKE ?
        )
      `;

      db.get(allocSql, [monthPattern], (err, allocRow) => {
        if (err) return res.status(500).json({ error: 'Failed to calculate monthly allocations.' });

        const outstanding = row.total_business - allocRow.allocated;

        res.json({
          totalOrders: row.total_orders,
          totalBusiness: row.total_business,
          totalReceived: row.total_received,
          outstanding: Math.round(outstanding * 100) / 100,
          normalTankers: row.normal_tankers || 0,
          motorTankers: row.motor_tankers || 0,
          filledOrders: row.filled_orders || 0,
          standbyOrders: row.standby_orders || 0
        });
      });
    });
  });

  // Business Analytics chart data (Revenue, Payments, Outstanding, and Counts per Month)
  app.get('/api/reports/analytics', authenticateToken, (req, res) => {
    // Generate dates of the last 6 months
    const months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const yStr = String(d.getFullYear());
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      months.push({ year: yStr, month: mStr, label, pattern: `${yStr}-${mStr}-%` });
    }

    const analyticsData = [];
    let completed = 0;

    months.forEach((m, idx) => {
      // For each month, query total sales, total payments, orders count, and outstanding
      const sql = `
        SELECT 
          COALESCE(SUM(price), 0) as revenue,
          COUNT(*) as orders_count,
          (
            SELECT COALESCE(SUM(amount), 0)
            FROM payments
            WHERE payment_date LIKE ?
          ) as payments,
          (
            SELECT COALESCE(SUM(o.price - (SELECT COALESCE(SUM(amount_allocated), 0) FROM payment_allocations WHERE order_id = o.id)), 0)
            FROM orders o
            WHERE o.order_date LIKE ?
          ) as outstanding
        FROM orders
        WHERE order_date LIKE ?
      `;

      db.get(sql, [m.pattern, m.pattern, m.pattern], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to retrieve analytics data.' });
        }

        analyticsData[idx] = {
          monthLabel: m.label,
          revenue: row.revenue,
          payments: row.payments,
          outstanding: Math.round(row.outstanding * 100) / 100,
          ordersCount: row.orders_count
        };

        completed++;
        if (completed === months.length) {
          // Add aggregates for Pie Charts
          const pieSql = `
            SELECT 
              SUM(CASE WHEN tanker_type = 'Normal' THEN 1 ELSE 0 END) as normal_tankers,
              SUM(CASE WHEN tanker_type = 'Motor' THEN 1 ELSE 0 END) as motor_tankers,
              SUM(CASE WHEN use_type = 'Filled' THEN 1 ELSE 0 END) as filled_orders,
              SUM(CASE WHEN use_type = 'Standby' THEN 1 ELSE 0 END) as standby_orders
            FROM orders
          `;

          db.get(pieSql, [], (err, pieRow) => {
            if (err) return res.status(500).json({ error: 'Failed to load distribution stats.' });

            res.json({
              monthlyTrend: analyticsData,
              tankerDistribution: {
                normal: pieRow.normal_tankers || 0,
                motor: pieRow.motor_tankers || 0
              },
              useDistribution: {
                filled: pieRow.filled_orders || 0,
                standby: pieRow.standby_orders || 0
              }
            });
          });
        }
      });
    });
  });
}
