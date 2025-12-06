# Kitchen Display Improvements

## Các cải tiến đã thực hiện

### 1. ✅ Hiển thị Mã Đơn Hàng (Order ID)
- Mỗi món hiển thị mã đơn hàng `#123` nổi bật với badge màu tím (indigo)
- Dễ dàng liên kết món với đơn hàng tương ứng

### 2. ✅ Hiển thị Loại Đơn Hàng
- 🍽️ **Tại bàn** - Badge màu xám
- 🥡 **Mang đi (Takeaway)** - Badge màu cyan
- 🚚 **Giao hàng (Delivery)** - Badge màu cam

### 3. ✅ Thời Gian Chờ với Màu Sắc
- **Xanh lá (Green)**: < 5 phút - Bình thường
- **Vàng (Yellow)**: 5-10 phút - Cần chú ý
- **Đỏ (Red) + nhấp nháy**: > 10 phút - Ưu tiên cao

### 4. ✅ Border & Background theo Thời Gian Chờ
- Item viền xám bình thường khi < 5 phút
- Item viền + nền vàng khi 5-10 phút
- Item viền + nền đỏ khi > 10 phút

### 5. ✅ Chế Độ Gom Theo Đơn (Group by Order)
- Nút toggle "Gom theo đơn" ở góc phải
- Khi bật, các món cùng đơn được nhóm lại
- Header của nhóm hiển thị:
  - Mã đơn hàng (#123)
  - Loại đơn (Giao/Đi/Bàn)
  - Tên bàn (nếu có)
  - Số món trong đơn
  - Thời gian chờ lâu nhất (max)
- UI compact hơn cho từng món trong nhóm
- Dễ dàng làm các món cùng đơn một lần

### 6. ✅ Thông Tin Bàn Được Tối Ưu
- Chỉ hiển thị tên bàn khi là đơn tại bàn
- Bỏ text "Mang đi" thừa (đã có loại đơn ở trên)

## Hiệu Suất Làm Việc
1. **Nhận diện nhanh**: Mã đơn + loại đơn ngay đầu item
2. **Ưu tiên đúng**: Màu sắc giúp nhận biết món cần làm gấp
3. **Gom đơn hiệu quả**: Làm tất cả món cùng đơn để giao nhanh hơn
4. **Giảm sai sót**: Thông tin rõ ràng, không bỏ sót ghi chú

## Technical Changes
- File: `frontend/src/pages/Kitchen.jsx`
- Added state: `groupByOrder`
- Updated: `KitchenColumn` component with grouping logic
- Data used: `don_hang_id`, `wait_seconds`, `order_type` (already available from backend)
