// backend/src/controllers/adminController.js
import { pool } from '../db.js';
import { asyncHandler } from '../middleware/error.js';

class AdminController {
  // Get system settings
  getSettings = asyncHandler(async (req, res) => {
    const { rows } = await pool.query(`
      SELECT key, value FROM system_settings
      ORDER BY key
    `);

    const settings = {};
    rows.forEach(row => {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    });

    res.json({ success: true, data: settings });
  });

  // Update system settings
  updateSettings = asyncHandler(async (req, res) => {
    const settings = req.body;

    // Use transaction to update all settings
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of Object.entries(settings)) {
        const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
        
        await client.query(`
          INSERT INTO system_settings (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) 
          DO UPDATE SET value = $2, updated_at = NOW()
        `, [key, valueStr]);
      }

      await client.query('COMMIT');
      res.json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });

  // Get system logs
  getLogs = asyncHandler(async (req, res) => {
    const { level, search, limit = 100 } = req.query;

    let query = 'SELECT * FROM system_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (level && level !== 'ALL') {
      query += ` AND level = $${paramIndex}`;
      params.push(level);
      paramIndex++;
    }

    if (search) {
      query += ` AND (message ILIKE $${paramIndex} OR action ILIKE $${paramIndex} OR user_id::text ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const { rows } = await pool.query(query, params);
    res.json({ success: true, data: rows });
  });

  // Get system health
  getHealth = asyncHandler(async (req, res) => {
    // Get database stats
    const dbStats = await pool.query(`
      SELECT 
        pg_database.datname,
        pg_size_pretty(pg_database_size(pg_database.datname)) AS size
      FROM pg_database
      WHERE datname = current_database()
    `);

    const dbConnections = await pool.query(`
      SELECT 
        count(*) as connections,
        (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max_connections
      FROM pg_stat_activity
      WHERE datname = current_database()
    `);

    // Get business stats
    const businessStats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE is_active = true) as total_users,
        (SELECT COUNT(*) FROM don_hang WHERE DATE(created_at) = CURRENT_DATE) as total_orders_today,
        (SELECT COALESCE(SUM(grand_total), 0) FROM v_order_settlement 
         WHERE DATE(closed_at) = CURRENT_DATE AND trang_thai = 'PAID') as total_revenue_today,
        (SELECT COUNT(*) FROM ca_lam WHERE status = 'OPEN') as active_shifts
    `);

    const health = {
      system: {
        status: 'HEALTHY',
        uptime: process.uptime(),
        version: '1.0.0'
      },
      database: {
        status: 'CONNECTED',
        size: dbStats.rows[0]?.size || '0 MB',
        connections: parseInt(dbConnections.rows[0]?.connections || 0),
        max_connections: parseInt(dbConnections.rows[0]?.max_connections || 100)
      },
      performance: {
        response_time: '45ms',
        active_users: 0, // TODO: Implement active users tracking
        requests_per_minute: 0 // TODO: Implement request tracking
      },
      business: {
        total_users: parseInt(businessStats.rows[0]?.total_users || 0),
        total_orders_today: parseInt(businessStats.rows[0]?.total_orders_today || 0),
        total_revenue_today: parseFloat(businessStats.rows[0]?.total_revenue_today || 0),
        active_shifts: parseInt(businessStats.rows[0]?.active_shifts || 0)
      }
    };

    res.json({ success: true, data: health });
  });
}

export default new AdminController();

