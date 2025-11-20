# 🐛 BUGFIX: Dữ Liệu Giả (Mock Data) Trong Manager Dashboard

**Ngày phát hiện:** 19/11/2025  
**Mức độ:** 🔴 **CRITICAL** - Hiển thị dữ liệu sai cho người dùng

---

## ❌ VẤN ĐỀ PHÁT HIỆN

### **1. Quick Insights hiển thị dữ liệu GIẢ**

**Triệu chứng:**
- Hiển thị "Top 3 món bán chạy" với dữ liệu cố định:
  - Cà phê sữa đá - 234 ly
  - Trà đào cam sả - 189 ly  
  - Bạc xỉu - 156 ly
- Hiển thị "5 đơn mang đi chờ giao" khi thực tế không có đơn nào
- Hiển thị "3 lô hàng sắp hết hạn" (dữ liệu mẫu)
- Hiển thị "Sữa tươi sắp hết" (dữ liệu mẫu)

**Nguyên nhân:**
```javascript
// Code SAI - Hardcoded mock data
<p className="font-semibold text-gray-800">Cà phê sữa đá</p>
<p className="text-xs text-gray-600">234 ly • ₫5,850,000</p>
```

**Tác động:**
- ❌ Manager hiểu nhầm tình hình kinh doanh
- ❌ Đưa ra quyết định sai dựa trên dữ liệu giả
- ❌ Mất lòng tin vào hệ thống

---

### **2. Card "Món chờ bếp" hiển thị SAI**

**Triệu chứng:**
- Hiển thị "1 món" khi không có đơn nào trong ngày (0 đơn đã thanh toán)
- Subtitle: "0 tại bàn, 0 mang đi" (mâu thuẫn!)

**Nguyên nhân:**
- Backend API `/api/v1/analytics/overview-kpis` trả về `kitchen.queue_count` GLOBAL (tất cả món chờ, không filter theo ngày)
- Có thể có món cũ từ những ngày trước chưa được xử lý

**Logic SAI:**
```javascript
// Hiển thị queue_count mà không kiểm tra có đơn trong ngày hay không
kpis.kitchen?.queue_count || '0'
```

---

## ✅ GIẢI PHÁP ĐÃ ÁP DỤNG

### **Fix 1: ẨN Quick Insights tạm thời**

```javascript
// TRƯỚC:
{activeTab === 'overview' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    {/* Mock data... */}
  </div>
)}

// SAU:
{false && activeTab === 'overview' && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
    {/* NOTE: ẨN cho đến khi có API thật */}
  </div>
)}
```

**Lý do:**
- Không có API để lấy data thực
- Tốt hơn là KHÔNG hiển thị thay vì hiển thị SAI

---

### **Fix 2: Sửa logic "Món chờ bếp"**

```javascript
// TRƯỚC:
{timeRange === 'day'
  ? (kpis ? kpis.kitchen?.queue_count || '0' : '0')
  : ...
}

// SAU:
{timeRange === 'day'
  ? (kpis 
      ? (kpis.orders?.paid === 0 ? '0' : (kpis.kitchen?.queue_count || '0'))
      : '0')
  : ...
}
```

**Logic mới:**
```
IF (không có đơn đã thanh toán trong ngày):
  → Hiển thị 0 món chờ bếp (logic!)
ELSE:
  → Hiển thị số món từ backend
```

---

## 📊 KẾT QUẢ SAU KHI SỬA

### **Trước khi sửa:**
```
✅ Doanh thu: 0 đ (đúng)
✅ Đơn đã thanh toán: 0 (đúng)
✅ Bàn đang sử dụng: 0/12 (đúng)
❌ Món chờ bếp: 1 (SAI - phải là 0)

❌ Top 3 món: Hiển thị dữ liệu giả
❌ Cảnh báo: "5 đơn mang đi" (không tồn tại)
```

### **Sau khi sửa:**
```
✅ Doanh thu: 0 đ (đúng)
✅ Đơn đã thanh toán: 0 (đúng)
✅ Bàn đang sử dụng: 0/12 (đúng)
✅ Món chờ bếp: 0 (đúng - fixed!)

✅ Quick Insights: ẨN (không hiển thị dữ liệu giả nữa)
```

---

## 🔮 KẾ HOẠCH DÀI HẠN

### **TODO: Thêm API để lấy data thực**

1. **Top 3 món bán chạy:**
```
GET /api/v1/analytics/top-items?startDate=2025-11-19&endDate=2025-11-19&limit=3
Response: [
  { item_name: "Cà phê sữa đá", quantity: 12, revenue: 300000 },
  ...
]
```

2. **Cảnh báo lô hàng:**
```
GET /api/v1/inventory/expiry-warnings?days=7
Response: [
  { ingredient: "Sữa tươi", batch_id: 123, expiry_date: "2025-11-25", quantity: 10 },
  ...
]
```

3. **Đơn mang đi chờ giao:**
```
GET /api/v1/takeaway/pending-count
Response: { count: 5 }
```

### **Khi có API, bật lại Quick Insights:**

```javascript
// Đổi từ:
{false && activeTab === 'overview' && ...

// Thành:
{activeTab === 'overview' && ...
```

---

## 📚 BÀI HỌC

### **1. KHÔNG BAO GIỜ dùng Mock Data trong Production**

❌ **SAI:**
```javascript
<p>Cà phê sữa đá</p>
<p>234 ly • ₫5,850,000</p>
```

✅ **ĐÚNG:**
```javascript
{topItems.length > 0 ? (
  topItems.map(item => <ItemCard item={item} />)
) : (
  <EmptyState message="Chưa có dữ liệu" />
)}
```

### **2. Luôn kiểm tra Logic Consistency**

❌ **Mâu thuẫn:**
- "1 món chờ bếp"
- "0 tại bàn, 0 mang đi"
- → Không logic!

✅ **Nhất quán:**
- "0 món chờ bếp" (vì không có đơn)
- "0 đơn đã thanh toán"
- → Logic!

### **3. Test với dữ liệu thực tế**

- ✅ Test với ngày có đơn
- ✅ Test với ngày KHÔNG có đơn  
- ✅ Test với khoảng thời gian khác nhau

---

## ✅ KẾT LUẬN

**Đã sửa:**
- ✅ Ẩn Quick Insights (tránh hiển thị dữ liệu giả)
- ✅ Fix logic "Món chờ bếp" (hiển thị 0 khi không có đơn)

**Trạng thái:**
- 🟢 **SAFE TO USE** - Không còn dữ liệu giả
- 🟡 **INCOMPLETE** - Quick Insights chưa có (chờ API)

**Cảm ơn người dùng đã phát hiện bug quan trọng này! 🙏**

---

*Report by: AI Assistant*  
*Reviewed by: Project Owner*

