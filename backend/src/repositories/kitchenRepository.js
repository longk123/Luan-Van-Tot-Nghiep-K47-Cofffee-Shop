// src/repositories/kitchenRepository.js
import { pool } from '../db.js';

// State transition rules
const TRANSITION_MAP = {
  start: { from: ['QUEUED'], to: 'MAKING', setTime: 'started_at' },
  done: { from: ['MAKING'], to: 'DONE', setTime: 'finished_at' },
  cancel: { from: ['QUEUED'], to: 'CANCELLED', setTime: null } // Chỉ cho phép hủy khi còn QUEUED
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
      dh.trang_thai AS don_hang_trang_thai,
      b.ten_ban,
      b.khu_vuc_id,
      kv.ten AS khu_vuc_ten,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'ma', tc.ma,
            'ten', tc.ten,
            'loai', tc.loai,
            'don_vi', tc.don_vi,
            'muc_ten', tcm.ten,
            'he_so', o.he_so,
            'so_luong', o.so_luong
          )
          ORDER BY tc.ma, tcm.thu_tu
        ) FILTER (WHERE o.id IS NOT NULL),
        '[]'::jsonb
      ) AS options
    FROM don_hang_chi_tiet ct
    JOIN don_hang dh ON dh.id = ct.don_hang_id
    LEFT JOIN ban b ON b.id = dh.ban_id
    LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
    LEFT JOIN mon m ON m.id = ct.mon_id
    LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
    LEFT JOIN don_hang_chi_tiet_tuy_chon o ON o.line_id = ct.id
    LEFT JOIN tuy_chon_mon tc ON tc.id = o.tuy_chon_id
    LEFT JOIN tuy_chon_muc tcm ON tcm.id = o.muc_id
    WHERE ${conditions.join(' AND ')}
      AND dh.trang_thai IN ('OPEN', 'PAID')
    GROUP BY 
      ct.id, ct.don_hang_id, ct.mon_id, ct.bien_the_id, ct.so_luong, ct.ghi_chu,
      ct.trang_thai_che_bien, ct.created_at, ct.started_at, ct.finished_at,
      m.ten, m.ma, btm.ten_bien_the, dh.ban_id, dh.order_type, dh.trang_thai,
      b.ten_ban, b.khu_vuc_id, kv.ten
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
export async function updateLineTx({ lineId, action, userId, reason = null }) {
  const rule = TRANSITION_MAP[action];
  if (!rule) {
    throw new Error('INVALID_ACTION');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Lock line và lấy thông tin đơn hàng
    const { rows: [line] } = await client.query(
      `SELECT 
         ct.id, 
         ct.don_hang_id, 
         ct.trang_thai_che_bien,
         dh.trang_thai AS don_hang_trang_thai
       FROM don_hang_chi_tiet ct
       JOIN don_hang dh ON dh.id = ct.don_hang_id
       WHERE ct.id=$1 FOR UPDATE`,
      [lineId]
    );
    
    if (!line) {
      throw new Error('LINE_NOT_FOUND');
    }
    
    // Không cho phép hủy món thuộc đơn đã thanh toán
    if (action === 'cancel' && line.don_hang_trang_thai === 'PAID') {
      throw new Error('Không thể hủy món thuộc đơn đã thanh toán');
    }
    
    if (!rule.from.includes(line.trang_thai_che_bien)) {
      throw new Error(`INVALID_STATE_TRANSITION: Cannot ${action} from ${line.trang_thai_che_bien}`);
    }

    // Build update query
    const sets = [`trang_thai_che_bien='${rule.to}'`];
    const params = [lineId];
    let paramIndex = 2; // Start from $2 (lineId is $1)
    
    if (rule.setTime === 'started_at') {
      sets.push(`started_at = NOW()`);
      sets.push(`maker_id = $${paramIndex}`); // Set maker_id khi bắt đầu làm
      params.push(userId);
      paramIndex++;
    } else if (rule.setTime === 'finished_at') {
      sets.push(`finished_at = NOW()`);
      sets.push(`maker_id = $${paramIndex}`); // Set maker_id khi hoàn thành
      params.push(userId);
      paramIndex++;
    } else if (action === 'cancel') {
      // Set maker_id khi hủy món để có thể tính vào thống kê ca
      sets.push(`maker_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }
    
    // Lưu lý do hủy vào ghi_chu nếu có
    if (action === 'cancel' && reason) {
      sets.push(`ghi_chu = COALESCE(ghi_chu, '') || E'\\n[Hủy bởi pha chế] ' || $${paramIndex}`);
      params.push(reason);
      paramIndex++;
    }

    const { rows: [updated] } = await client.query(
      `UPDATE don_hang_chi_tiet 
       SET ${sets.join(', ')} 
       WHERE id=$1 
       RETURNING *`,
      params
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

