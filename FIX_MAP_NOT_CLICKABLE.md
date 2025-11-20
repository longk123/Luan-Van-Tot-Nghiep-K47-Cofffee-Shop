# 🔧 Sửa lỗi: Không thể click/chọn trên Google Maps

## 🚨 Vấn đề

Bạn không thể click hoặc chọn địa chỉ trên Google Maps, mặc dù bản đồ đã hiển thị.

## ✅ Nguyên nhân có thể

1. **Google Maps API chưa được cấu hình đúng**
   - Places API chưa được bật
   - API key chưa có quyền truy cập Places API
   - Lỗi khi khởi tạo map

2. **Map container bị che bởi overlay**
   - Error message overlay che mất map
   - CSS z-index hoặc pointer-events không đúng

3. **Map chưa được khởi tạo đúng cách**
   - Map instance chưa sẵn sàng
   - Event listeners chưa được đăng ký

---

## 🔧 Giải pháp

### **Bước 1: Kiểm tra Console (F12)**

Mở Console (F12) và kiểm tra:

1. **Có lỗi gì không?**
   - Nếu thấy: `Places API is not enabled` → Bật Places API (xem Bước 2)
   - Nếu thấy: `This API key is not authorized` → Kiểm tra API restrictions (xem Bước 3)
   - Nếu thấy: `Google Map đã sẵn sàng` → Map đã load thành công

2. **Kiểm tra Network tab:**
   - Xem có request nào đến `maps.googleapis.com` bị lỗi không
   - Status code phải là 200 (OK)

---

### **Bước 2: Bật Places API (QUAN TRỌNG!)**

1. Truy cập: **https://console.cloud.google.com/**
2. Chọn project của bạn
3. Vào **APIs & Services** → **Library**
4. Tìm và bật:
   - ✅ **Maps JavaScript API** (Click "Enable")
   - ✅ **Places API** (Click "Enable") ← **QUAN TRỌNG!**
   - ✅ **Geocoding API** (Click "Enable")
5. Đợi **2-3 phút** để Google cập nhật

---

### **Bước 3: Kiểm tra API Key Restrictions**

1. Vào **APIs & Services** → **Credentials**
2. Click vào API key của bạn
3. Kiểm tra:
   - **Application restrictions:** Chọn "HTTP referrers (web sites)"
   - **Website restrictions:** Có `http://localhost:5173/*` chưa?
   - **API restrictions:** Phải có:
     - ✅ Maps JavaScript API
     - ✅ Places API ← **QUAN TRỌNG!**
     - ✅ Geocoding API
4. Click **"Save"**

---

### **Bước 4: Restart Frontend**

Sau khi bật API, **PHẢI restart frontend**:

1. Dừng frontend (Ctrl+C)
2. Chạy lại:
   ```bash
   cd frontend
   npm run dev
   ```
3. Refresh trang (F5)

---

### **Bước 5: Kiểm tra lại**

1. Mở trang checkout: `http://localhost:5173/customer/checkout`
2. Chọn **"Giao hàng"**
3. **Thử các cách sau:**
   - ✅ **Nhập địa chỉ** vào ô tìm kiếm → Phải thấy danh sách gợi ý
   - ✅ **Click trên bản đồ** → Phải thấy marker và địa chỉ được cập nhật
   - ✅ **Kéo bản đồ** → Phải di chuyển được

---

## 🔍 Debug thêm

### **Nếu vẫn không click được:**

1. **Kiểm tra Console:**
   ```javascript
   // Mở Console (F12) và chạy:
   console.log(window.google);
   console.log(window.google.maps);
   console.log(window.google.maps.places);
   ```
   - Nếu `window.google` là `undefined` → API chưa load
   - Nếu `window.google.maps.places` là `undefined` → Places API chưa được load

2. **Kiểm tra mapRef:**
   ```javascript
   // Trong Console, kiểm tra:
   document.querySelector('[ref*="mapRef"]') // hoặc
   document.querySelectorAll('div').forEach(el => {
     if (el.style.height === '256px') console.log(el);
   });
   ```

3. **Clear cache trình duyệt:**
   - Ctrl+Shift+Delete
   - Chọn "Cached images and files"
   - Click "Clear data"

---

## ✅ Kết quả mong đợi

Sau khi sửa, bạn sẽ có thể:

1. ✅ **Nhập địa chỉ** → Thấy danh sách gợi ý
2. ✅ **Click trên bản đồ** → Thấy marker và địa chỉ được cập nhật
3. ✅ **Kéo bản đồ** → Bản đồ di chuyển được
4. ✅ **Zoom in/out** → Bản đồ zoom được

---

## 💡 Tip

- **Places API là BẮT BUỘC** để tìm kiếm địa chỉ
- Sau khi bật API, phải đợi vài phút để Google cập nhật
- Phải restart frontend sau khi thay đổi `.env` hoặc bật API mới

