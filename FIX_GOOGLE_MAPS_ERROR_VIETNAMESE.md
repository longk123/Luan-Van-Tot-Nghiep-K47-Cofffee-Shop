# 🔧 Sửa lỗi: "Trang này không thể tải Google Maps đúng cách"

## 🚨 Vấn đề

Bạn thấy lỗi: **"Trang này không thể tải Google Maps đúng cách. Bạn có sở hữu trang web này không?"**

Lỗi này **chặn hoàn toàn** việc tương tác với bản đồ (không click, không chọn được).

---

## ✅ Nguyên nhân

Lỗi này xảy ra khi:

1. **Places API chưa được bật** trong Google Cloud Console
2. **API key restrictions không đúng** - chưa thêm `http://localhost:5173/*`
3. **API key chưa có quyền** truy cập Places API

---

## 🔧 Giải pháp (Làm theo thứ tự)

### **Bước 1: Bật Places API (QUAN TRỌNG NHẤT!)**

1. Truy cập: **https://console.cloud.google.com/**
2. Chọn **project** chứa API key của bạn
3. Vào **APIs & Services** → **Library**
4. Tìm và **bật** các API sau (nếu chưa bật):
   - ✅ **Maps JavaScript API** → Click "Enable"
   - ✅ **Places API** → Click "Enable" ← **QUAN TRỌNG NHẤT!**
   - ✅ **Geocoding API** → Click "Enable"
5. **Đợi 2-3 phút** để Google cập nhật

---

### **Bước 2: Kiểm tra và sửa API Key Restrictions**

1. Vào **APIs & Services** → **Credentials**
2. Click vào **API key** của bạn (`AIzaSyAPyWkkHroqbo35NUd0yV5Kaog3rxWxuM0`)
3. Kiểm tra và sửa:

   **a) Application restrictions:**
   - Chọn: **"HTTP referrers (web sites)"**
   
   **b) Website restrictions:**
   - Phải có dòng này:
     ```
     http://localhost:5173/*
     ```
   - Nếu chưa có, click **"+ ADD AN ITEM"** và thêm vào
   
   **c) API restrictions:**
   - Chọn: **"Restrict key"**
   - Đảm bảo đã chọn **ĐẦY ĐỦ** 3 API:
     - ✅ Maps JavaScript API
     - ✅ Places API ← **QUAN TRỌNG!**
     - ✅ Geocoding API
   
4. Click **"Save"**

---

### **Bước 3: Đợi vài phút**

Sau khi bật API và sửa restrictions, Google cần **2-3 phút** để cập nhật.

---

### **Bước 4: Restart Frontend**

**QUAN TRỌNG:** Sau khi sửa, phải restart frontend:

1. **Dừng frontend** (Ctrl+C trong terminal)
2. **Chạy lại:**
   ```bash
   cd frontend
   npm run dev
   ```
3. **Refresh trang** (F5 hoặc Ctrl+R)

---

### **Bước 5: Kiểm tra lại**

1. Mở: `http://localhost:5173/customer/checkout`
2. Chọn **"Giao hàng"**
3. **Kiểm tra:**
   - ✅ Lỗi "Trang này không thể tải Google Maps..." **phải biến mất**
   - ✅ Bản đồ hiển thị bình thường
   - ✅ Có thể **click trên bản đồ** được
   - ✅ **Nhập địa chỉ** → Thấy danh sách gợi ý

---

## 🔍 Kiểm tra Console (F12)

Mở Console (F12) và kiểm tra:

### ✅ Nếu thấy lỗi:
```
Places API is not enabled
```
→ **Giải pháp:** Bật Places API (Bước 1)

### ✅ Nếu thấy lỗi:
```
This API key is not authorized to use this service
```
→ **Giải pháp:** Kiểm tra API restrictions (Bước 2)

### ✅ Nếu thấy:
```
Google Map đã sẵn sàng
```
→ **Tốt!** Map đã load thành công

---

## ⚠️ Lưu ý quan trọng

1. **Places API là BẮT BUỘC** - Không có Places API, bạn sẽ gặp lỗi này
2. **Phải đợi 2-3 phút** sau khi bật API để Google cập nhật
3. **Phải restart frontend** sau khi sửa API restrictions
4. **URL phải đúng:** `http://localhost:5173/*` (không có `https://`)

---

## 📝 Checklist nhanh

- [ ] Đã bật **Maps JavaScript API**
- [ ] Đã bật **Places API** ← **QUAN TRỌNG!**
- [ ] Đã bật **Geocoding API**
- [ ] Đã thêm `http://localhost:5173/*` vào **Website restrictions**
- [ ] Đã chọn **Places API** trong **API restrictions**
- [ ] Đã **đợi 2-3 phút** sau khi bật API
- [ ] Đã **restart frontend**
- [ ] Đã **refresh trang** (F5)

---

## 💡 Tip

Nếu vẫn không được sau khi làm tất cả các bước trên:

1. **Clear cache trình duyệt:**
   - Ctrl+Shift+Delete
   - Chọn "Cached images and files"
   - Click "Clear data"

2. **Thử trình duyệt khác:**
   - Chrome, Firefox, Edge

3. **Kiểm tra lại API key trong file `.env`:**
   ```bash
   cd frontend
   cat .env
   ```
   Phải thấy: `VITE_GOOGLE_MAPS_API_KEY=AIzaSy...`

---

## ✅ Kết quả mong đợi

Sau khi sửa, bạn sẽ thấy:

1. ✅ **Không còn lỗi** "Trang này không thể tải Google Maps..."
2. ✅ **Bản đồ hiển thị bình thường** với marker đỏ (quán) và vòng tròn đỏ (2km)
3. ✅ **Click trên bản đồ** → Thấy marker xanh và địa chỉ được cập nhật
4. ✅ **Nhập địa chỉ** → Thấy danh sách gợi ý từ Google Places
5. ✅ **Kéo bản đồ** → Bản đồ di chuyển được

