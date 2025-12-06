# 📊 PHÂN LOẠI BẢNG DATABASE CHO BÁO CÁO

*Tài liệu hướng dẫn bảng nào nên/nên không đưa vào báo cáo luận văn*

---

## 🎯 NGUYÊN TẮC PHÂN LOẠI

**Bảng NÊN đưa vào báo cáo:**
- ✅ Bảng chứa dữ liệu nghiệp vụ chính
- ✅ Bảng liên quan đến core features
- ✅ Bảng có ý nghĩa business quan trọng

**Bảng KHÔNG NÊN đưa vào báo cáo:**
- ❌ Bảng LOG/AUDIT (chỉ để tracking)
- ❌ Bảng SYSTEM/INFRASTRUCTURE (cài đặt kỹ thuật)
- ❌ Bảng JUNCTION đơn giản (chỉ liên kết)
- ❌ Bảng CHI TIẾT quá nhỏ (có thể gộp vào bảng chính)

---

## 📋 PHÂN LOẠI 47 BẢNG

### ✅ **NHÓM 1: BẢNG CẦN ĐƯA VÀO BÁO CÁO (35 bảng)**

#### **1.1. Nhóm Người dùng & Phân quyền (3 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 1 | `users` | Nhân viên hệ thống | ✅ Core - Quản lý nhân viên |
| 2 | `roles` | Vai trò | ✅ Core - Phân quyền |
| 3 | `user_roles` | Phân quyền user-role | ✅ Core - Liên kết quan trọng |

**Ghi chú:** `user_roles` là junction nhưng **QUAN TRỌNG** vì thể hiện phân quyền, nên đưa vào.

#### **1.2. Nhóm Khách hàng (3 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 4 | `customer_accounts` | Tài khoản khách hàng | ✅ Core - Customer Portal |
| 5 | `khach_hang` | Thông tin khách (đặt bàn) | ✅ Core - Reservation |
| 6 | `customer_cart` | Giỏ hàng online | ✅ Core - Shopping cart |

#### **1.3. Nhóm Thực đơn (7 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 7 | `loai_mon` | Danh mục món | ✅ Core - Menu structure |
| 8 | `mon` | Món/Sản phẩm | ✅ Core - Menu items |
| 9 | `mon_bien_the` | Biến thể size (S/M/L) | ✅ Core - Variants |
| 10 | `tuy_chon_mon` | Tùy chọn (Đường/Đá/Topping) | ✅ Core - Options |
| 11 | `tuy_chon_muc` | Mức độ tùy chọn | ✅ Core - Option levels |
| 12 | `tuy_chon_gia` | Giá tùy chọn theo món | ✅ Core - Pricing |
| 13 | `mon_tuy_chon_ap_dung` | Liên kết món-tùy chọn | ⚠️ **Junction nhưng quan trọng** |

**Ghi chú:** `mon_tuy_chon_ap_dung` là junction nhưng **QUAN TRỌNG** vì thể hiện quan hệ món-option, nên đưa vào.

#### **1.4. Nhóm Bàn & Khu vực (2 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 14 | `khu_vuc` | Khu vực quán | ✅ Core - Area management |
| 15 | `ban` | Bàn | ✅ Core - Table management |

#### **1.5. Nhóm Ca làm việc (2 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 16 | `ca_lam` | Ca làm việc | ✅ Core - Shift management |
| 17 | `bang_cong` | Bảng công nhân viên | ⚠️ **Có thể bỏ nếu không chi tiết** |

**Ghi chú:** `bang_cong` có thể bỏ nếu không muốn chi tiết về tracking nhân viên.

#### **1.6. Nhóm Đơn hàng (4 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 18 | `don_hang` | Đơn hàng | ✅ Core - Orders |
| 19 | `don_hang_chi_tiet` | Chi tiết đơn hàng | ✅ Core - Order details |
| 20 | `don_hang_chi_tiet_tuy_chon` | Tùy chọn của chi tiết đơn | ⚠️ **Chi tiết nhưng quan trọng** |
| 21 | `don_hang_khuyen_mai` | Khuyến mãi áp dụng cho đơn | ⚠️ **Junction nhưng quan trọng** |

**Ghi chú:** 2 bảng junction này **QUAN TRỌNG** vì thể hiện business logic (tùy chọn, khuyến mãi), nên đưa vào.

#### **1.7. Nhóm Thanh toán (4 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 23 | `payment_method` | Phương thức thanh toán | ✅ Core - Payment |
| 24 | `order_payment` | Thanh toán đơn hàng | ✅ Core - Payments |
| 25 | `order_payment_refund` | Hoàn tiền | ✅ Core - Refunds |
| 26 | `payment_transaction` | Giao dịch PayOS | ✅ Core - PayOS integration |

#### **1.8. Nhóm Đặt bàn (2 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 28 | `dat_ban` | Đặt bàn | ✅ Core - Reservations |
| 29 | `dat_ban_ban` | Liên kết đặt bàn-bàn | ⚠️ **Junction - có thể bỏ** |

**Ghi chú:** `dat_ban_ban` là junction đơn giản, có thể bỏ hoặc chỉ đề cập ngắn.

#### **1.9. Nhóm Kho (6 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 30 | `nguyen_lieu` | Nguyên liệu | ✅ Core - Ingredients |
| 31 | `batch_inventory` | Lô hàng | ✅ Core - Batch tracking |
| 32 | `nhap_kho` | Phiếu nhập kho | ✅ Core - Import |
| 33 | `xuat_kho` | Phiếu xuất kho | ✅ Core - Export |
| 34 | `phieu_xuat_kho` | Phiếu xuất kho (header) | ⚠️ **Có thể gộp với xuat_kho** |
| 35 | `chi_tiet_xuat_kho` | Chi tiết phiếu xuất | ⚠️ **Chi tiết - có thể bỏ** |
| 36 | `cong_thuc_mon` | Công thức/Recipe | ✅ Core - Recipe |

**Ghi chú:** 
- `phieu_xuat_kho` và `chi_tiet_xuat_kho` có thể bỏ nếu muốn đơn giản, chỉ cần `xuat_kho`.
- Hoặc gộp `xuat_kho` và `phieu_xuat_kho` thành 1 bảng.

#### **1.10. Nhóm Khuyến mãi (1 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 38 | `khuyen_mai` | Chương trình khuyến mãi | ✅ Core - Promotions |

#### **1.11. Nhóm Tài chính & Báo cáo (2 bảng)**
| STT | Tên bảng | Mô tả | Lý do |
|-----|----------|-------|-------|
| 43 | `chi_phi` | Chi phí vận hành | ✅ Core - Expenses |
| 44 | `muc_tieu` | Mục tiêu KPI | ✅ Core - Goals |

---

### ⚠️ **NHÓM 2: BẢNG CÓ THỂ BỎ HOẶC CHỈ ĐỀ CẬP NGẮN (7 bảng)**

#### **2.1. Bảng LOG/AUDIT (3 bảng)**
| STT | Tên bảng | Mô tả | Khuyến nghị |
|-----|----------|-------|-------------|
| 27 | `hoa_don_print_log` | Log in hóa đơn | ❌ **BỎ** - Chỉ để audit, không có business logic |
| 37 | `import_receipt_print_log` | Log in phiếu nhập | ❌ **BỎ** - Chỉ để audit |
| 46 | `system_logs` | Log hệ thống | ❌ **BỎ** - Infrastructure, không nghiệp vụ |

**Lý do:** 
- Chỉ dùng để tracking/audit
- Không có business logic
- Có thể đề cập ngắn: "Hệ thống có các bảng log để theo dõi..."

#### **2.2. Bảng SYSTEM/INFRASTRUCTURE (2 bảng)**
| STT | Tên bảng | Mô tả | Khuyến nghị |
|-----|----------|-------|-------------|
| 47 | `system_settings` | Cài đặt hệ thống | ⚠️ **ĐỀ CẬP NGẮN** - Infrastructure |
| 45 | `notifications` | Thông báo | ⚠️ **CÓ THỂ BỎ** - Chưa có UI đầy đủ |

**Lý do:**
- `system_settings`: Infrastructure, có thể đề cập 1 dòng
- `notifications`: Chưa có UI, có thể bỏ

#### **2.3. Bảng JUNCTION đơn giản (2 bảng)**
| STT | Tên bảng | Mô tả | Khuyến nghị |
|-----|----------|-------|-------------|
| 29 | `dat_ban_ban` | Liên kết đặt bàn-bàn | ⚠️ **CÓ THỂ BỎ** - Junction đơn giản |
| 17 | `bang_cong` | Bảng công nhân viên | ⚠️ **CÓ THỂ BỎ** - Chi tiết tracking |

**Lý do:**
- `dat_ban_ban`: Junction đơn giản, không có thuộc tính riêng
- `bang_cong`: Chi tiết tracking, có thể bỏ nếu không cần

---

### ❌ **NHÓM 3: BẢNG NÊN BỎ NẾU KHÔNG CẦN (5 bảng)**

#### **3.1. Bảng Delivery (nếu bỏ delivery) - 3 bảng**
| STT | Tên bảng | Mô tả | Khuyến nghị |
|-----|----------|-------|-------------|
| 22 | `don_hang_delivery_info` | Thông tin giao hàng | ❌ **BỎ nếu không có delivery** |
| 39 | `waiter_wallet` | Ví Waiter (thu COD) | ❌ **BỎ nếu không có delivery** |
| 40 | `wallet_transactions` | Giao dịch ví | ❌ **BỎ nếu không có delivery** |

#### **3.2. Bảng Chatbot (nếu không muốn chi tiết) - 2 bảng**
| STT | Tên bảng | Mô tả | Khuyến nghị |
|-----|----------|-------|-------------|
| 41 | `chatbot_conversations` | Hội thoại chatbot | ⚠️ **CÓ THỂ BỎ** - Tính năng phụ |
| 42 | `chatbot_messages` | Tin nhắn chatbot | ⚠️ **CÓ THỂ BỎ** - Tính năng phụ |

**Lý do:**
- Chatbot là tính năng phụ, không core
- Nếu muốn đơn giản, có thể bỏ
- Hoặc chỉ đề cập: "Hệ thống có 2 bảng để lưu lịch sử chatbot..."

---

## 📊 TỔNG HỢP

### **PHƯƠNG ÁN 1: ĐẦY ĐỦ (47 bảng)**
- Đưa tất cả 47 bảng vào báo cáo
- **Ưu điểm:** Đầy đủ, chi tiết
- **Nhược điểm:** Dài, có thể quá chi tiết

### **PHƯƠNG ÁN 2: TỐI ƯU (35-38 bảng)** ⭐ **KHUYẾN NGHỊ**

**Bỏ các bảng sau:**
1. ❌ `hoa_don_print_log` - Log audit
2. ❌ `import_receipt_print_log` - Log audit
3. ❌ `system_logs` - Log hệ thống
4. ❌ `system_settings` - Infrastructure (hoặc chỉ 1 dòng)
5. ❌ `notifications` - Chưa có UI
6. ❌ `dat_ban_ban` - Junction đơn giản
7. ❌ `bang_cong` - Chi tiết tracking (nếu không cần)
8. ❌ `phieu_xuat_kho` - Có thể gộp với `xuat_kho`
9. ❌ `chi_tiet_xuat_kho` - Chi tiết quá nhỏ

**Nếu bỏ delivery:**
10. ❌ `don_hang_delivery_info`
11. ❌ `waiter_wallet`
12. ❌ `wallet_transactions`

**Nếu bỏ chatbot chi tiết:**
13. ❌ `chatbot_conversations` (hoặc chỉ đề cập ngắn)
14. ❌ `chatbot_messages` (hoặc chỉ đề cập ngắn)

**Kết quả:** **35-38 bảng** (phù hợp cho báo cáo)

**Ưu điểm:**
- ✅ Tập trung vào core business logic
- ✅ Không quá dài dòng
- ✅ Dễ trình bày và thuyết phục giám khảo
- ✅ Vẫn đầy đủ tính năng chính

### **PHƯƠNG ÁN 3: TỐI THIỂU (25-30 bảng)**
- Chỉ giữ các bảng core nhất
- Bỏ tất cả junction, log, detail tables
- **Không khuyến nghị** - quá đơn giản

---

## 🎯 KHUYẾN NGHỊ CUỐI CÙNG

### **✅ NÊN ĐƯA VÀO BÁO CÁO (35-38 bảng):**

**Core Tables (32-35 bảng):**
- Tất cả bảng nghiệp vụ chính
- Junction tables quan trọng (có business logic)
- Bảng integration (PayOS, Chatbot nếu có)

**Có thể thêm (3 bảng nếu muốn chi tiết):**
- `chatbot_conversations` + `chatbot_messages` (nếu muốn thể hiện AI)
- `bang_cong` (nếu muốn thể hiện tracking nhân viên)

### **❌ KHÔNG NÊN ĐƯA VÀO BÁO CÁO CHÍNH (9-12 bảng):**

**Log/Audit (3 bảng):**
- `hoa_don_print_log`
- `import_receipt_print_log`
- `system_logs`

**Infrastructure (2 bảng):**
- `system_settings` (chỉ đề cập 1 dòng)
- `notifications` (bỏ hoàn toàn)

**Junction đơn giản (2 bảng):**
- `dat_ban_ban`
- `bang_cong` (nếu không cần chi tiết)

**Delivery (3 bảng - nếu bỏ delivery):**
- `don_hang_delivery_info`
- `waiter_wallet`
- `wallet_transactions`

**Chi tiết quá nhỏ (2 bảng):**
- `phieu_xuat_kho` (có thể gộp)
- `chi_tiet_xuat_kho` (chi tiết quá nhỏ)

---

## 📝 CÁCH TRÌNH BÀY TRONG BÁO CÁO

### **Chương 3 - Thiết kế cơ sở dữ liệu:**

#### **3.1. Tổng quan (1-2 trang)**
- Tổng số bảng: **35-38 bảng**
- Phân loại theo nhóm chức năng

#### **3.2. Các bảng chính (15-20 trang)**
- Đưa vào **12-15 bảng quan trọng nhất** với từ điển dữ liệu đầy đủ
- Các bảng còn lại: chỉ liệt kê tên, mô tả ngắn

#### **3.3. Phụ lục (nếu cần)**
- Danh sách đầy đủ 47 bảng
- Các bảng log/infrastructure (đề cập ngắn)

---

## ✅ KẾT LUẬN

**Khuyến nghị: Đưa 35-38 bảng vào báo cáo**

**Bỏ 9-12 bảng sau:**
1. Log/Audit tables (3)
2. Infrastructure tables (2)
3. Junction đơn giản (2)
4. Delivery tables (3 - nếu bỏ delivery)
5. Chi tiết quá nhỏ (2)

**Kết quả:** Báo cáo gọn gàng, tập trung, nhưng vẫn đầy đủ!

---

*Tài liệu này giúp bạn quyết định bảng nào nên đưa vào báo cáo luận văn*

