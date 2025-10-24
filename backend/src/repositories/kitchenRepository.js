// src/repositories/kitchenRepository.js
import { pool } from '../db.js';

// State transition rules
const TRANSITION_MAP = {
  start: { from: ['QUEUED'], to: 'MAKING', setTime: 'started_at' },
  done: { from: ['MAKING'], to: 'DONE', setTime: 'finished_at' },
  cancel: { from: ['QUEUED', 'MAKING'], to: 'CANCELLED', setTime: null }
};

/**
 * Fetch kitchen queue with filters
 * Lấy hàng đợi bếp/pha chế
 */
export async function fetchQueue({ areaId = null, tableId = null }) {
  const params = [];
  const conditions = [`ct.trang_thai_che_bien IN ('QUEUED','MAKING')`];
  
  if (tableId) {
    params.push(tableId);
    conditions.push(`dh.ban_id = $${params.length}`);
  }
  
  if (areaId) {
    params.push(areaId);
    conditions.push(`b.khu_vuc_id = $${params.length}`);
  }

  const sql = `
    SELECT
      ct.id,
      ct.don_hang_id,
      ct.mon_id,
      ct.bien_the_id,
      ct.so_luong,
      ct.ghi_chu,
      ct.trang_thai_che_bien,
      ct.created_at,
      ct.started_at,
      ct.finished_at,
      EXTRACT(EPOCH FROM (COALESCE(ct.started_at, NOW()) - ct.created_at))::INT AS wait_seconds,
      m.ten AS mon_ten,
      m.ma AS mon_ma,
      btm.ten_bien_the AS bien_the_ten,
      dh.ban_id,
      dh.order_type,
      b.ten_ban,
      b.khu_vuc_id,
      kv.ten AS khu_vuc_ten
    FROM don_hang_chi_tiet ct
    JOIN don_hang dh ON dh.id = ct.don_hang_id
    LEFT JOIN ban b ON b.id = dh.ban_id
    LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
    LEFT JOIN mon m ON m.id = ct.mon_id
    LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
    WHERE ${conditions.join(' AND ')}
      AND dh.trang_thai IN ('OPEN', 'PAID')
    ORDER BY 
      CASE ct.trang_thai_che_bien 
        WHEN 'QUEUED' THEN 1
        WHEN 'MAKING' THEN 2
      END,
      ct.created_at
  `;

  const { rows } = await pool.query(sql, params);
  return rows;
}

/**
 * Update line status with transaction
 * Cập nhật trạng thái món với transaction lock
 */
export async function updateLineTx({ lineId, action, userId }) {
  const rule = TRANSITION_MAP[action];
  if (!rule) {
    throw new Error('INVALID_ACTION');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock line
    const { rows: [line] } = await client.query(
      `SELECT id, don_hang_id, trang_thai_che_bien FROM don_hang_chi_tiet WHERE id=$1 FOR UPDATE`,
      [lineId]
    );
    
    if (!line) {
      throw new Error('LINE_NOT_FOUND');
    }
    
    if (!rule.from.includes(line.trang_thai_che_bien)) {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot ${action} from ${line.trang_thai_che_bien}`);
    }

    // Build update query
    const sets = [`trang_thai_che_bien='${rule.to}'`];
    if (rule.setTime === 'started_at') {
      sets.push(`started_at = NOW()`);
      sets.push(`maker_id = ${userId}`); // Set maker_id khi bắt đầu làm
    } else if (rule.setTime === 'finished_at') {
      sets.push(`finished_at = NOW()`);
      sets.push(`maker_id = ${userId}`); // Set maker_id khi hoàn thành
    }

    const { rows: [updated] } = await client.query(
      `UPDATE don_hang_chi_tiet 
       SET ${sets.join(', ')} 
       WHERE id=$1 
       RETURNING *`,
      [lineId]
    );

    await client.query('COMMIT');
    return updated;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get completed items (for monitoring)
 */
export async function fetchCompleted({ limit = 20 }) {
  const sql = `
    SELECT
      ct.id,
      ct.don_hang_id,
      ct.so_luong,
      ct.trang_thai_che_bien,
      ct.started_at,
      ct.finished_at,
      EXTRACT(EPOCH FROM (ct.finished_at - ct.started_at))::INT AS making_time_seconds,
      m.ten AS mon_ten,
      btm.ten_bien_the AS bien_the_ten,
      b.ten_ban,
      kv.ten AS khu_vuc_ten
    FROM don_hang_chi_tiet ct
    JOIN don_hang dh ON dh.id = ct.don_hang_id
    LEFT JOIN ban b ON b.id = dh.ban_id
    LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
    LEFT JOIN mon m ON m.id = ct.mon_id
    LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
    WHERE ct.trang_thai_che_bien = 'DONE'
      AND ct.finished_at > NOW() - INTERVAL '2 hours'
    ORDER BY ct.finished_at DESC
    LIMIT $1
  `;

  const { rows } = await pool.query(sql, [limit]);
  return rows;
}

