# 🔧 Sửa lỗi "Rất tiếc! Đã xảy ra lỗi" khi nhập địa chỉ

## 🚨 Vấn đề

Khi nhập địa chỉ trong ô tìm kiếm, Google Maps hiển thị lỗi:
- "Rất tiếc! Đã xảy ra lỗi."
- "Trang này đã không tải Google Maps đúng cách."

## ✅ Nguyên nhân

Lỗi này thường xảy ra khi **Places API chưa được bật** trong Google Cloud Console.

---

## 🔧 Giải pháp (3 bước)

### **Bước 1: Kiểm tra và bật Places API**

1. Truy cập: **https://console.cloud.google.com/**
2. Chọn project của bạn (project chứa API key)
3. Vào **APIs & Services** → **Library**
4. Tìm và bật các API sau (nếu chưa bật):
   - ✅ **Maps JavaScript API** (Click "Enable")
   - ✅ **Places API** (Click "Enable") ← **QUAN TRỌNG!**
   - ✅ **Geocoding API** (Click "Enable")

### **Bước 2: Kiểm tra API Key Restrictions**

1. Vào **APIs & Services** → **Credentials**
2. Click vào API key của bạn (`AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0`)
3. Kiểm tra phần **API restrictions**:
   - Chọn **"Restrict key"**
   - Đảm bảo đã chọn:
     - ✅ Maps JavaScript API
     - ✅ Places API ← **QUAN TRỌNG!**
     - ✅ Geocoding API
4. Click **"Save"**

### **Bước 3: Đợi vài phút**

Sau khi bật API, Google cần vài phút để cập nhật. Đợi **2-3 phút** rồi thử lại.

---

## ✅ Kiểm tra

1. **Refresh trang** checkout (F5)
2. Chọn **"Giao hàng"**
3. Nhập địa chỉ vào ô tìm kiếm
4. Bạn sẽ thấy **danh sách gợi ý địa chỉ** xuất hiện! 🎉

---

## 🔍 Kiểm tra Console (F12)

Mở Console (F12) và kiểm tra:

### ✅ Nếu thấy lỗi:
```
This API key is not authorized to use this service
```

→ **Giải pháp:** Bật Places API trong Google Cloud Console (Bước 1)

### ✅ Nếu thấy lỗi:
```
Places API is not enabled
```

→ **Giải pháp:** Bật Places API trong Google Cloud Console (Bước 1)

### ✅ Nếu không có lỗi:
→ Có thể là vấn đề khác, kiểm tra lại API key restrictions (Bước 2)

---

## 📝 Tóm tắt nhanh

```bash
# 1. Vào Google Cloud Console
# 2. Bật Places API (APIs & Services → Library)
# 3. Thêm Places API vào API restrictions của API key
# 4. Đợi 2-3 phút
# 5. Refresh trang và thử lại
```

---

## ⚠️ Lưu ý

- **Places API** là **BẮT BUỘC** để tìm kiếm địa chỉ
- Nếu chỉ bật **Maps JavaScript API** mà không bật **Places API**, bạn sẽ gặp lỗi này
- Sau khi bật API, phải đợi vài phút để Google cập nhật

---

## 💡 Tip

Nếu vẫn không được sau khi làm các bước trên:
1. Kiểm tra lại API key trong file `.env` có đúng không
2. Restart frontend: `npm run dev`
3. Clear cache trình duyệt (Ctrl+Shift+Delete)
4. Thử trình duyệt khác

