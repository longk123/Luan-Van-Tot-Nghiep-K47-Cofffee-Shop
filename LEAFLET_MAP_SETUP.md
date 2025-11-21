# Hướng Dẫn Sử Dụng Bản Đồ Miễn Phí (Leaflet + OpenStreetMap)

## Tổng Quan

Hệ thống đã được cập nhật để sử dụng **Leaflet + OpenStreetMap** thay vì Google Maps. Giải pháp này:
- ✅ **Hoàn toàn miễn phí** - Không cần API key
- ✅ **Không cần billing** - Không cần thẻ tín dụng
- ✅ **Không giới hạn** - Sử dụng không giới hạn
- ✅ **Tính năng đầy đủ** - Tìm kiếm địa chỉ, click chọn vị trí, tính khoảng cách

## Đã Cài Đặt

Các package đã được cài đặt:
- `leaflet` - Thư viện bản đồ
- `react-leaflet` - React wrapper cho Leaflet

## Tính Năng

### 1. Tìm Kiếm Địa Chỉ
- Nhập địa chỉ vào ô tìm kiếm
- Hệ thống sẽ tự động tìm kiếm và hiển thị kết quả
- Chọn địa chỉ từ danh sách gợi ý

### 2. Click Chọn Vị Trí
- Click trực tiếp trên bản đồ để chọn vị trí
- Hệ thống sẽ tự động lấy địa chỉ từ tọa độ

### 3. Validation Khoảng Cách
- Tự động kiểm tra khoảng cách từ quán
- Chỉ cho phép đặt hàng trong bán kính 2km
- Hiển thị cảnh báo nếu vượt quá bán kính

### 4. Hiển Thị Bản Đồ
- Marker đỏ: Vị trí quán
- Marker xanh: Địa chỉ giao hàng
- Vòng tròn đỏ: Bán kính giao hàng 2km

## So Sánh với Google Maps

| Tính năng | Google Maps | Leaflet (OpenStreetMap) |
|-----------|-------------|-------------------------|
| API Key | ✅ Cần | ❌ Không cần |
| Billing | ✅ Cần | ❌ Không cần |
| Chi phí | 💰 Có thể phát sinh | 🆓 Miễn phí |
| Tìm kiếm địa chỉ | ✅ Places API | ✅ Nominatim API |
| Reverse geocoding | ✅ Geocoding API | ✅ Nominatim API |
| Bản đồ | ✅ Google Maps | ✅ OpenStreetMap |
| Tốc độ | ⚡ Nhanh | ⚡ Nhanh |
| Độ chính xác | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

## Lưu Ý

1. **Nominatim API** (dịch vụ geocoding miễn phí):
   - Có giới hạn 1 request/giây
   - Nếu cần sử dụng nhiều, có thể tự host Nominatim server
   - Hiện tại đủ dùng cho mục đích thương mại nhỏ

2. **OpenStreetMap**:
   - Dữ liệu bản đồ do cộng đồng đóng góp
   - Độ chính xác tốt ở Việt Nam
   - Có thể cập nhật dữ liệu nếu cần

3. **Không cần cấu hình**:
   - Không cần file `.env`
   - Không cần API key
   - Hoạt động ngay sau khi cài đặt

## Troubleshooting

### Bản đồ không hiển thị
- Kiểm tra console browser có lỗi không
- Đảm bảo `leaflet` và `react-leaflet` đã được cài đặt
- Kiểm tra CSS của Leaflet đã được import

### Tìm kiếm địa chỉ không hoạt động
- Kiểm tra kết nối internet
- Nominatim có thể bị rate limit nếu tìm kiếm quá nhiều
- Đợi vài giây rồi thử lại

### Click trên bản đồ không lấy được địa chỉ
- Kiểm tra kết nối internet
- Thử click lại vị trí khác
- Kiểm tra console có lỗi không

## Kết Luận

Giải pháp Leaflet + OpenStreetMap là lựa chọn tốt cho:
- ✅ Dự án nhỏ/trung bình
- ✅ Không muốn phát sinh chi phí
- ✅ Không muốn cấu hình phức tạp
- ✅ Cần tính năng cơ bản về bản đồ

Nếu sau này cần tính năng nâng cao hơn (như chỉ đường, traffic, v.v.), có thể cân nhắc chuyển lại Google Maps khi đã có billing account.

