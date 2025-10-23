-- Test query tables với grand total
WITH open_order AS (
  SELECT ban_id, id AS order_id
  FROM don_hang
  WHERE trang_thai = 'OPEN' AND order_type = 'DINE_IN'
),
last_paid AS (
  SELECT DISTINCT ON (ban_id)
         ban_id, id AS last_paid_order_id
  FROM don_hang
  WHERE ban_id IS NOT NULL AND trang_thai = 'PAID'
  ORDER BY ban_id, closed_at DESC
),
latest_order_for_using_table AS (
  SELECT DISTINCT ON (dh.ban_id)
         dh.ban_id, dh.id AS latest_order_id
  FROM don_hang dh
  INNER JOIN ban b ON b.id = dh.ban_id
  WHERE dh.ban_id IS NOT NULL 
    AND dh.trang_thai IN ('OPEN', 'PAID')
    AND b.trang_thai = 'DANG_DUNG'
  ORDER BY dh.ban_id, dh.opened_at DESC
),
summary AS (
  SELECT lo.ban_id,
         COUNT(items.line_id) AS item_count,
         COALESCE(SUM(items.line_total_with_addons), 0) AS subtotal,
         COUNT(*) FILTER (WHERE items.trang_thai_che_bien='QUEUED') AS q_count,
         COUNT(*) FILTER (WHERE items.trang_thai_che_bien='MAKING') AS m_count,
         COUNT(*) FILTER (WHERE items.trang_thai_che_bien='DONE') AS done_count
  FROM latest_order_for_using_table lo
  INNER JOIN don_hang ON don_hang.id = lo.latest_order_id
  LEFT JOIN v_all_order_items_with_addons items ON don_hang.id = items.order_id
  GROUP BY lo.ban_id
)
SELECT b.ten_ban, 
       COALESCE(s.item_count,0)::int AS item_count,
       COALESCE(s.subtotal,0)::int AS subtotal
FROM ban b
LEFT JOIN summary s ON s.ban_id = b.id
WHERE b.id <= 5
ORDER BY b.ten_ban;

