# Chức năng Xem & In lại Hoá đơn (Manager)

## Tổng quan
Chức năng cho phép Manager xem chi tiết và in lại hoá đơn từ Manager Dashboard, với đầy đủ audit log để theo dõi lịch sử in.

## Triển khai

### Frontend (`ManagerDashboard.jsx`)
- **Nút thao tác**: Mỗi dòng invoice trong danh sách có 2 nút:
  - 👁️ **Xem**: Mở modal hiển thị chi tiết hoá đơn
  - 🖨️ **In lại**: Mở modal xác nhận in lại

- **Modal chi tiết hoá đơn** (`InvoiceDetailModal`):
  - Thông tin: Bàn, trạng thái, thời gian, tổng tiền
  - Danh sách món (items + options/toppings)
  - Thông tin thanh toán (payments by method)
  - Nút: **Xem PDF** (mở tab mới), **In lại hoá đơn**

- **Modal xác nhận in lại** (`ReprintConfirmModal`):
  - Xác nhận in hoá đơn #{id}
  - Textarea nhập lý do (optional): "khách yêu cầu", "in bị lỗi"...
  - Nút: **Hủy**, **Xác nhận in**

### Backend
- Endpoints đã có sẵn trong `backend/src/routes/invoice.js`:
  - `GET /api/v1/hoa-don/:orderId` — lấy dữ liệu hoá đơn (JSON)
  - `GET /api/v1/hoa-don/:orderId/pdf` — lấy PDF hoá đơn
  - `POST /api/v1/hoa-don/:orderId/print-log` — ghi log in/reprint

- **Middleware**: `cashierOnly` = `['cashier', 'manager', 'admin']` → Manager có quyền.

- **Table audit log**: `hoa_don_print_log`
  ```sql
  id           SERIAL PRIMARY KEY,
  order_id     INT NOT NULL REFERENCES don_hang(id),
  invoice_no   BIGINT NOT NULL DEFAULT nextval('seq_invoice_no'),
  printed_by   INT REFERENCES users(user_id),
  printed_at   TIMESTAMPTZ DEFAULT now(),
  copy_no      INT DEFAULT 1,  -- số bản sao (1, 2, 3...)
  note         TEXT             -- lý do in lại
  ```

## Workflow

### Xem chi tiết hoá đơn
1. User click **Xem** trên dòng invoice
2. Frontend gọi `api.getInvoiceData(invoice.id)`
3. Modal hiển thị full detail: items, payments, metadata
4. User có thể:
   - **Xem PDF**: mở `/api/v1/hoa-don/{id}/pdf?token=...` trong tab mới
   - **In lại**: chuyển sang modal xác nhận

### In lại hoá đơn
1. User click **In lại** (từ danh sách hoặc từ modal chi tiết)
2. Modal xác nhận hiện lên, nhập lý do (optional)
3. User click **Xác nhận in**:
   - Frontend fetch PDF blob từ `/api/v1/hoa-don/{id}/pdf`
   - Tạo object URL từ blob
   - Mở cửa sổ mới (`window.open`) → trigger print dialog
   - Gọi `api.logInvoicePrint(id, { printed_by: null, note: reason })`
   - Backend auto tăng `copy_no` (1→2→3...) và ghi timestamp

4. Log được lưu vào DB với:
   - `order_id`, `printed_by` (user_id từ token nếu có), `note` (lý do), `copy_no`
   - Dùng để audit: ai in, khi nào, lần thứ mấy, lý do gì

## Bảo mật & Audit
- **Role-based**: chỉ manager/admin có quyền (middleware `cashierOnly`)
- **Audit trail**: mỗi lần in ghi log vào `hoa_don_print_log` với timestamp, user, reason
- **Copy numbering**: tự động đếm số lần in (`copy_no`) để phân biệt bản gốc vs bản sao
- **Không thay đổi dữ liệu tài chính**: reprint không tạo payment mới, không đổi invoice_no/status

## Testing
1. Login với role manager/admin
2. Vào Manager Dashboard → tab Invoices
3. Click **Xem** → kiểm tra modal hiển thị đầy đủ thông tin
4. Click **In lại** → nhập lý do → **Xác nhận in**
5. Kiểm tra:
   - Print dialog mở (hoặc PDF download tùy browser)
   - Console log: `✅ Invoice reprinted: {id}`
   - DB: query `SELECT * FROM hoa_don_print_log WHERE order_id={id}` → check `copy_no`, `note`, `printed_at`

## Edge cases
- **Hoá đơn đã hủy**: vẫn cho xem, nhưng cân nhắc disable nút "In lại" (hiện tại: vẫn cho phép)
- **PDF không tồn tại**: backend trả 404/500 → frontend hiện alert lỗi
- **Offline/network error**: catch error, hiện thông báo "Không thể in lại hoá đơn"
- **Token hết hạn**: middleware trả 401 → redirect login (đã handle trong loadData)

## Mở rộng tương lai
- [ ] Thêm filter: "Chỉ xem hoá đơn đã in X lần trở lên"
- [ ] Hiển thị "Đã in X lần" ngay trên dòng invoice (query count từ print_log)
- [ ] Export print log report (CSV/Excel): ai in, bao nhiêu lần, khi nào
- [ ] Require manager password cho hoá đơn cũ > 7 ngày (security)
- [ ] Watermark "BẢN SAO - Lần {copy_no}" trên PDF (backend PDF generation)
- [ ] Notification/SSE: thông báo realtime khi có reprint (cho admin tracking)

## Files changed
- `frontend/src/pages/ManagerDashboard.jsx`
  - Added state: `showInvoiceDetail`, `showReprintConfirm`, `selectedInvoice`, `invoiceDetail`, `reprintReason`
  - Added handlers: `handleViewInvoice`, `handleReprintConfirm`, `handleReprint`
  - Added UI: column "Thao tác" với nút Xem/In lại, 2 modals (detail + reprint confirm)

- Backend: không cần thay đổi (endpoints & table đã có sẵn)

## Dependencies
- Không có dependency mới
- Dùng native Fetch API cho PDF blob
- Dùng `window.open` + `print()` cho print dialog

---
**Version**: 1.0  
**Date**: 2025-10-26  
**Author**: GitHub Copilot  
**Status**: ✅ Completed & Ready for testing
