# CHƯƠNG 2: CƠ SỞ LÝ THUYẾT

---

## 1. Tổng quan về hệ thống POS (Point of Sale)

### 1.1 Khái niệm

POS (Point of Sale) hay còn gọi là điểm bán hàng, là hệ thống phần mềm và phần cứng được sử dụng tại nơi diễn ra giao dịch mua bán giữa khách hàng và doanh nghiệp. Trong ngành F&B (Food & Beverage), hệ thống POS đóng vai trò quan trọng trong việc quản lý đơn hàng, thanh toán, kho hàng và phân tích kinh doanh.

### 1.2 Vai trò của POS trong quán cà phê

Hệ thống POS cho quán cà phê được thiết kế để:

- **Quản lý đơn hàng:** Ghi nhận và xử lý các loại đơn tại chỗ (dine-in), mang đi (takeaway) và giao hàng (delivery)
- **Quản lý bàn:** Theo dõi trạng thái bàn, khu vực phục vụ theo thời gian thực
- **Xử lý thanh toán:** Hỗ trợ đa phương thức thanh toán (tiền mặt, chuyển khoản, ví điện tử)
- **Quản lý kho:** Theo dõi nguyên liệu, tự động trừ kho khi hoàn thành đơn hàng
- **Báo cáo doanh thu:** Phân tích dữ liệu kinh doanh theo nhiều chiều

### 1.3 Đặc điểm của POS hiện đại

| Đặc điểm | Mô tả |
|----------|-------|
| **Cloud-based** | Dữ liệu lưu trữ trên server, truy cập từ nhiều thiết bị |
| **Real-time** | Cập nhật trạng thái đơn hàng, kho hàng tức thì |
| **Multi-platform** | Hoạt động trên web browser, không phụ thuộc hệ điều hành |
| **Integration** | Tích hợp với cổng thanh toán, hệ thống bếp, giao hàng |
| **Analytics** | Cung cấp báo cáo và phân tích dữ liệu kinh doanh |

---

## 2. Kiến trúc MVC (Model-View-Controller)

### 2.1 Khái niệm

MVC (Model-View-Controller) là một mẫu kiến trúc phần mềm phổ biến, được sử dụng để tổ chức code trong các ứng dụng web. Mẫu này phân tách ứng dụng thành ba thành phần chính có trách nhiệm riêng biệt.

### 2.2 Các thành phần

#### 2.2.1 Model (Mô hình dữ liệu)
- Quản lý dữ liệu và logic nghiệp vụ của ứng dụng
- Tương tác trực tiếp với cơ sở dữ liệu
- Thực hiện các thao tác CRUD (Create, Read, Update, Delete)
- Xác thực và xử lý dữ liệu

```
Ví dụ trong hệ thống:
- Order Model: Quản lý thông tin đơn hàng
- Product Model: Quản lý thông tin sản phẩm
- User Model: Quản lý thông tin người dùng
```

#### 2.2.2 View (Giao diện)
- Hiển thị dữ liệu cho người dùng
- Nhận tương tác từ người dùng (click, nhập liệu)
- Không chứa logic nghiệp vụ
- Có thể có nhiều View cho cùng một Model

```
Ví dụ trong hệ thống:
- Dashboard View: Hiển thị thống kê cho manager
- POS View: Giao diện bán hàng cho thu ngân
- KDS View: Màn hình hiển thị đơn cho bếp
```

#### 2.2.3 Controller (Bộ điều khiển)
- Nhận yêu cầu từ View
- Xử lý yêu cầu, gọi Model tương ứng
- Trả kết quả về View
- Điều phối luồng dữ liệu trong ứng dụng

```
Ví dụ trong hệ thống:
- OrderController: Xử lý tạo, cập nhật, hủy đơn hàng
- ProductController: Xử lý CRUD sản phẩm
- AuthController: Xử lý đăng nhập, đăng xuất
```

### 2.3 Luồng hoạt động

```
[User] → [View] → [Controller] → [Model] → [Database]
                        ↓
[User] ← [View] ← [Controller] ← [Model] ← [Database]
```

1. Người dùng tương tác với View (nhấn nút, nhập dữ liệu)
2. View gửi yêu cầu đến Controller
3. Controller xử lý logic, gọi Model nếu cần dữ liệu
4. Model thao tác với Database, trả kết quả về Controller
5. Controller định dạng dữ liệu, gửi về View
6. View render giao diện hiển thị cho người dùng

### 2.4 Lợi ích

| Lợi ích | Mô tả |
|---------|-------|
| **Separation of Concerns** | Phân tách trách nhiệm rõ ràng |
| **Maintainability** | Dễ bảo trì, sửa đổi từng phần độc lập |
| **Testability** | Dễ viết unit test cho từng component |
| **Reusability** | Có thể tái sử dụng Model cho nhiều View |
| **Scalability** | Dễ mở rộng khi thêm tính năng mới |

---

## 3. Thư viện React.js

### 3.1 Giới thiệu

React.js là một thư viện JavaScript mã nguồn mở được phát triển bởi Facebook (nay là Meta), dùng để xây dựng giao diện người dùng (UI) cho các ứng dụng web động. React cho phép tạo ra các component tái sử dụng, giúp phát triển các ứng dụng phức tạp một cách hiệu quả và dễ bảo trì.

![React Logo](https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg)

### 3.2 Đặc điểm chính

#### 3.2.1 Component-based Architecture
- Giao diện được chia thành các component nhỏ, độc lập
- Mỗi component có thể có state và props riêng
- Component có thể tái sử dụng ở nhiều nơi trong ứng dụng

```jsx
// Ví dụ Component trong hệ thống
function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>{product.price.toLocaleString()}đ</p>
      <button onClick={() => onAddToCart(product)}>
        Thêm vào đơn
      </button>
    </div>
  );
}
```

#### 3.2.2 Virtual DOM
- React sử dụng Virtual DOM để tối ưu hóa việc cập nhật giao diện
- Chỉ render lại những phần bị thay đổi thay vì toàn bộ trang
- Giúp ứng dụng nhanh và mượt mà hơn

```
Real DOM vs Virtual DOM:
┌─────────────────┐    ┌─────────────────┐
│    Real DOM     │    │  Virtual DOM    │
│ (Browser)       │    │ (Memory)        │
├─────────────────┤    ├─────────────────┤
│ - Cập nhật chậm │    │ - Cập nhật nhanh│
│ - Re-render toàn│    │ - So sánh diff  │
│   bộ khi thay   │    │ - Chỉ cập nhật  │
│   đổi           │    │   phần thay đổi │
└─────────────────┘    └─────────────────┘
```

#### 3.2.3 Unidirectional Data Flow
- Dữ liệu trong React chảy theo một hướng (từ cha xuống con)
- Giúp quản lý state và logic ứng dụng rõ ràng
- Tránh lỗi khi cập nhật UI

#### 3.2.4 JSX (JavaScript XML)
- Cú pháp cho phép viết HTML trực tiếp trong JavaScript
- Giúp code dễ đọc và trực quan hơn
- Được compile thành JavaScript thuần khi build

```jsx
// JSX
const element = <h1>Hello, {user.name}</h1>;

// Compiled JavaScript
const element = React.createElement('h1', null, 'Hello, ', user.name);
```

### 3.3 React Hooks

React Hooks là các function đặc biệt cho phép sử dụng state và các tính năng React trong functional components.

| Hook | Mục đích |
|------|----------|
| `useState` | Quản lý state trong component |
| `useEffect` | Xử lý side effects (API calls, subscriptions) |
| `useContext` | Truy cập context không cần prop drilling |
| `useRef` | Tham chiếu đến DOM elements |
| `useMemo` | Tối ưu hóa tính toán tốn kém |
| `useCallback` | Tối ưu hóa callback functions |

### 3.4 Ứng dụng trong hệ thống

Trong hệ thống Coffee Shop POS, React.js được sử dụng để:
- Xây dựng giao diện POS với các component tái sử dụng
- Quản lý state đơn hàng, giỏ hàng
- Render realtime trạng thái bàn, đơn hàng
- Tạo các form nhập liệu, modal dialog
- Hiển thị biểu đồ báo cáo với Recharts

---

## 4. Môi trường Node.js

### 4.1 Giới thiệu

Node.js là một nền tảng mã nguồn mở, cho phép chạy JavaScript phía server dựa trên V8 Engine của Google Chrome. Node.js được thiết kế để xây dựng các ứng dụng mạng có khả năng mở rộng cao, đặc biệt là các ứng dụng web thời gian thực.

![Node.js Logo](https://nodejs.org/static/images/logo.svg)

### 4.2 Kiến trúc và đặc điểm

#### 4.2.1 Non-blocking I/O
- Node.js sử dụng cơ chế event-driven, non-blocking I/O
- Các thao tác đọc/ghi dữ liệu không làm tắc nghẽn luồng chính
- Giúp tăng hiệu suất xử lý nhiều yêu cầu đồng thời

```javascript
// Non-blocking I/O Example
const fs = require('fs');

// Không block - tiếp tục thực thi trong khi đọc file
fs.readFile('data.json', (err, data) => {
  console.log('File đã đọc xong');
});

console.log('Dòng này chạy trước khi file đọc xong');
```

#### 4.2.2 Single-threaded Event Loop
- Node.js chạy trên một luồng đơn
- Có khả năng xử lý hàng nghìn kết nối đồng thời nhờ event loop
- Phù hợp cho các ứng dụng I/O-intensive

```
Event Loop trong Node.js:
┌───────────────────────────┐
│        Event Loop         │
├───────────────────────────┤
│ ┌─────────────────────┐  │
│ │   Timers            │  │  setTimeout, setInterval
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │   I/O Callbacks     │  │  File system, network
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │   Poll              │  │  Retrieve new I/O events
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │   Check             │  │  setImmediate callbacks
│ └─────────────────────┘  │
│ ┌─────────────────────┐  │
│ │   Close Callbacks   │  │  socket.on('close', ...)
│ └─────────────────────┘  │
└───────────────────────────┘
```

#### 4.2.3 Mô-đun hóa (Modular)
- Node.js sử dụng hệ thống CommonJS và ES Modules
- Cho phép tách các phần chức năng thành các module riêng biệt
- Dễ dàng quản lý và tái sử dụng code

### 4.3 NPM (Node Package Manager)

NPM là trình quản lý package mặc định của Node.js, cho phép:
- Cài đặt các thư viện bên thứ ba
- Quản lý dependencies của dự án
- Chia sẻ code với cộng đồng

```bash
# Các lệnh NPM thường dùng
npm init                    # Khởi tạo dự án mới
npm install express         # Cài đặt package
npm install --save-dev jest # Cài dev dependency
npm run dev                 # Chạy script trong package.json
```

### 4.4 Ứng dụng trong hệ thống

Trong hệ thống Coffee Shop POS, Node.js được sử dụng để:
- Xây dựng RESTful API server
- Xử lý logic nghiệp vụ (tính toán hóa đơn, trừ kho)
- Kết nối và tương tác với PostgreSQL
- Triển khai Server-Sent Events cho real-time updates
- Xử lý upload file (hình ảnh sản phẩm)

---

## 5. Framework Express.js

### 5.1 Giới thiệu

Express.js là một framework web cho Node.js được thiết kế để xây dựng các ứng dụng web và API một cách nhanh chóng, linh hoạt và nhẹ nhàng. Express.js giúp đơn giản hóa việc xử lý các yêu cầu HTTP, quản lý routing và middleware.

![Express.js Logo](https://expressjs.com/images/express-facebook-share.png)

### 5.2 Kiến trúc và đặc điểm

#### 5.2.1 Middleware
- Express sử dụng middleware để xử lý các yêu cầu và phản hồi
- Middleware có thể thực hiện nhiều chức năng như xác thực, ghi log, xử lý lỗi

```javascript
// Middleware Example
const express = require('express');
const app = express();

// Middleware ghi log
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Middleware xác thực
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // Verify token...
  next();
};

// Áp dụng middleware cho route cụ thể
app.get('/api/orders', authMiddleware, (req, res) => {
  // Handle request
});
```

#### 5.2.2 Routing linh hoạt
- Express cho phép định nghĩa các route một cách dễ dàng
- Hỗ trợ các phương thức HTTP: GET, POST, PUT, PATCH, DELETE
- Hỗ trợ route parameters và query strings

```javascript
// Routing Example
const express = require('express');
const router = express.Router();

// GET - Lấy danh sách đơn hàng
router.get('/orders', orderController.getAll);

// GET - Lấy chi tiết đơn hàng theo ID
router.get('/orders/:id', orderController.getById);

// POST - Tạo đơn hàng mới
router.post('/orders', orderController.create);

// PUT - Cập nhật đơn hàng
router.put('/orders/:id', orderController.update);

// DELETE - Xóa đơn hàng
router.delete('/orders/:id', orderController.delete);
```

#### 5.2.3 Error Handling
- Express cung cấp cơ chế xử lý lỗi tập trung
- Có thể định nghĩa error middleware để catch và xử lý lỗi

```javascript
// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});
```

### 5.3 Ứng dụng trong hệ thống

Trong hệ thống Coffee Shop POS, Express.js được sử dụng để:
- Định nghĩa hơn 100 API endpoints
- Xử lý authentication với JWT middleware
- Validate request data
- Upload và serve file tĩnh
- Xử lý CORS cho frontend

---

## 6. Cơ sở dữ liệu PostgreSQL

### 6.1 Giới thiệu

PostgreSQL là hệ quản trị cơ sở dữ liệu quan hệ (RDBMS) mã nguồn mở, nổi tiếng với độ tin cậy cao, tính năng phong phú và hiệu suất mạnh mẽ. PostgreSQL hỗ trợ đầy đủ các tiêu chuẩn SQL và cung cấp nhiều tính năng nâng cao.

![PostgreSQL Logo](https://www.postgresql.org/media/img/about/press/elephant.png)

### 6.2 Đặc điểm chính

#### 6.2.1 ACID Compliance
- **Atomicity:** Giao dịch được thực hiện toàn bộ hoặc không thực hiện gì
- **Consistency:** Dữ liệu luôn ở trạng thái nhất quán
- **Isolation:** Các giao dịch đồng thời không ảnh hưởng lẫn nhau
- **Durability:** Dữ liệu được lưu trữ vĩnh viễn sau khi commit

#### 6.2.2 Các tính năng nâng cao

| Tính năng | Mô tả |
|-----------|-------|
| **Triggers** | Tự động thực thi code khi có sự kiện trên bảng |
| **Functions** | Định nghĩa hàm tùy chỉnh bằng PL/pgSQL |
| **Views** | Tạo bảng ảo từ các query phức tạp |
| **Indexes** | Tối ưu tốc độ truy vấn |
| **Constraints** | Đảm bảo toàn vẹn dữ liệu |
| **Foreign Keys** | Định nghĩa quan hệ giữa các bảng |

#### 6.2.3 Data Types đa dạng

```sql
-- PostgreSQL hỗ trợ nhiều kiểu dữ liệu
CREATE TABLE products (
  id SERIAL PRIMARY KEY,           -- Auto-increment integer
  name VARCHAR(255) NOT NULL,      -- Variable-length string
  price DECIMAL(10,2),             -- Exact numeric
  description TEXT,                -- Unlimited text
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB,                  -- JSON binary
  tags TEXT[]                      -- Array of text
);
```

### 6.3 Triggers và Functions

Triggers là một tính năng quan trọng được sử dụng trong hệ thống để tự động hóa các quy trình:

```sql
-- Trigger tự động trừ kho khi hoàn thành đơn hàng
CREATE OR REPLACE FUNCTION deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- Trừ nguyên liệu theo công thức của sản phẩm
  UPDATE inventory_batches
  SET quantity = quantity - (
    SELECT ri.quantity * NEW.quantity
    FROM recipe_ingredients ri
    WHERE ri.product_id = NEW.product_id
    AND ri.ingredient_id = inventory_batches.ingredient_id
  )
  WHERE ingredient_id IN (
    SELECT ingredient_id FROM recipe_ingredients
    WHERE product_id = NEW.product_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deduct_inventory
AFTER UPDATE OF status ON order_items
FOR EACH ROW
WHEN (NEW.status = 'completed')
EXECUTE FUNCTION deduct_inventory();
```

### 6.4 Ứng dụng trong hệ thống

Trong hệ thống Coffee Shop POS, PostgreSQL được sử dụng để:
- Lưu trữ 42 bảng dữ liệu có quan hệ phức tạp
- Sử dụng triggers cho tự động trừ kho, tính giá vốn
- Áp dụng constraints đảm bảo toàn vẹn dữ liệu
- Exclusion constraints cho tránh xung đột đặt bàn/ca làm
- Soft delete với cột `deleted_at` để bảo toàn dữ liệu lịch sử

---

## 7. Vite - Build Tool

### 7.1 Giới thiệu

Vite là một build tool thế hệ mới cho các dự án web frontend, được tạo bởi Evan You (tác giả Vue.js). Vite cung cấp trải nghiệm phát triển nhanh chóng với Hot Module Replacement (HMR) gần như tức thì.

### 7.2 Đặc điểm chính

#### 7.2.1 Native ES Modules
- Sử dụng ES Modules native của browser trong development
- Không cần bundle toàn bộ ứng dụng khi dev
- Chỉ transform code khi cần thiết

#### 7.2.2 Hot Module Replacement (HMR)
- Cập nhật module thay đổi mà không reload toàn trang
- Giữ nguyên state của ứng dụng
- Phản hồi thay đổi trong milliseconds

#### 7.2.3 Optimized Build
- Sử dụng Rollup cho production build
- Tree-shaking loại bỏ code không sử dụng
- Code splitting tự động

### 7.3 So sánh với Create React App (CRA)

| Tiêu chí | Vite | Create React App |
|----------|------|------------------|
| **Dev server start** | < 1 giây | 10-30 giây |
| **HMR speed** | Milliseconds | 1-3 giây |
| **Build time** | Nhanh hơn 10-100x | Chậm |
| **Bundle size** | Tối ưu hơn | Lớn hơn |
| **Configuration** | Đơn giản | Cần eject |

### 7.4 Ứng dụng trong hệ thống

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

---

## 8. TailwindCSS

### 8.1 Giới thiệu

TailwindCSS là một framework CSS theo hướng utility-first, cho phép xây dựng giao diện nhanh chóng bằng cách sử dụng các class tiện ích có sẵn trực tiếp trong HTML.

### 8.2 Đặc điểm chính

#### 8.2.1 Utility-first
- Mỗi class thực hiện một việc cụ thể
- Không cần viết CSS tùy chỉnh cho hầu hết các trường hợp
- Dễ đọc và maintain

```html
<!-- Ví dụ Tailwind CSS -->
<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Thanh toán
</button>

<!-- Thay vì viết CSS riêng -->
<style>
.btn-primary {
  background-color: #3b82f6;
  color: white;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
}
.btn-primary:hover {
  background-color: #1d4ed8;
}
</style>
```

#### 8.2.2 Responsive Design
- Hỗ trợ responsive với các breakpoint prefix
- Mobile-first approach

```html
<!-- Responsive với Tailwind -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- 1 cột trên mobile, 2 cột trên tablet, 4 cột trên desktop -->
</div>
```

#### 8.2.3 Customizable
- Dễ dàng tùy chỉnh theme trong `tailwind.config.js`
- Thêm colors, spacing, fonts riêng

### 8.3 Ứng dụng trong hệ thống

TailwindCSS được sử dụng để:
- Xây dựng giao diện responsive cho POS, Dashboard
- Tạo component library thống nhất
- Dark mode support (nếu cần)
- Tối ưu bundle size với PurgeCSS

---

## 9. RESTful API

### 9.1 Khái niệm

REST (Representational State Transfer) là một kiến trúc phần mềm định nghĩa các ràng buộc và quy ước cho việc xây dựng web services. RESTful API là API tuân theo các nguyên tắc của REST.

### 9.2 Nguyên tắc REST

#### 9.2.1 Stateless
- Mỗi request từ client phải chứa đầy đủ thông tin
- Server không lưu trữ session state của client
- Giúp scale hệ thống dễ dàng hơn

#### 9.2.2 Uniform Interface
- Sử dụng HTTP methods đúng mục đích
- Resource được định danh bằng URI
- Response có định dạng nhất quán

```
HTTP Methods và mục đích:
┌──────────┬──────────────────────────────────────┐
│  Method  │           Mục đích                   │
├──────────┼──────────────────────────────────────┤
│  GET     │ Lấy dữ liệu (Read)                   │
│  POST    │ Tạo mới dữ liệu (Create)             │
│  PUT     │ Cập nhật toàn bộ (Full Update)       │
│  PATCH   │ Cập nhật một phần (Partial Update)   │
│  DELETE  │ Xóa dữ liệu (Delete)                 │
└──────────┴──────────────────────────────────────┘
```

### 9.3 Thiết kế API trong hệ thống

```
API Endpoints trong hệ thống Coffee Shop POS:

Authentication:
  POST   /api/auth/login          - Đăng nhập
  POST   /api/auth/logout         - Đăng xuất
  POST   /api/auth/refresh        - Refresh token

Products:
  GET    /api/products            - Danh sách sản phẩm
  GET    /api/products/:id        - Chi tiết sản phẩm
  POST   /api/products            - Tạo sản phẩm mới
  PUT    /api/products/:id        - Cập nhật sản phẩm
  DELETE /api/products/:id        - Xóa sản phẩm

Orders:
  GET    /api/orders              - Danh sách đơn hàng
  GET    /api/orders/:id          - Chi tiết đơn hàng
  POST   /api/orders              - Tạo đơn hàng
  PATCH  /api/orders/:id/status   - Cập nhật trạng thái
  
Tables:
  GET    /api/tables              - Danh sách bàn
  PATCH  /api/tables/:id/status   - Cập nhật trạng thái bàn

Inventory:
  GET    /api/inventory           - Danh sách kho
  POST   /api/inventory/import    - Nhập kho
  POST   /api/inventory/export    - Xuất kho
```

### 9.4 Response Format

```json
// Success Response
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Cà phê sữa đá",
    "price": 29000
  },
  "message": "Thành công"
}

// Error Response
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Không tìm thấy sản phẩm"
  }
}

// Paginated Response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 10. JWT (JSON Web Token)

### 10.1 Khái niệm

JWT (JSON Web Token) là một tiêu chuẩn mở (RFC 7519) định nghĩa cách truyền thông tin an toàn giữa các bên dưới dạng JSON object. Token này được ký số để đảm bảo tính toàn vẹn.

### 10.2 Cấu trúc JWT

JWT gồm 3 phần, phân tách bởi dấu chấm (`.`):

```
xxxxx.yyyyy.zzzzz
  │      │     │
  │      │     └── Signature (Chữ ký)
  │      └──────── Payload (Dữ liệu)
  └─────────────── Header (Tiêu đề)
```

#### 10.2.1 Header
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

#### 10.2.2 Payload
```json
{
  "sub": "1234567890",
  "name": "Nguyen Van A",
  "role": "cashier",
  "iat": 1516239022,
  "exp": 1516242622
}
```

#### 10.2.3 Signature
```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

### 10.3 Luồng xác thực với JWT

```
1. Login Request
   ┌────────┐                    ┌────────┐
   │ Client │ ─── POST /login ──►│ Server │
   │        │    {email, pass}   │        │
   └────────┘                    └────────┘
   
2. Verify & Issue Token
   ┌────────┐                    ┌────────┐
   │ Client │ ◄── {accessToken, │ Server │
   │        │     refreshToken}  │        │
   └────────┘                    └────────┘

3. Authenticated Request
   ┌────────┐                    ┌────────┐
   │ Client │ ─── GET /orders ──►│ Server │
   │        │  Authorization:    │        │
   │        │  Bearer <token>    │        │
   └────────┘                    └────────┘

4. Verify Token & Response
   ┌────────┐                    ┌────────┐
   │ Client │ ◄── {orders: [...]}│ Server │
   └────────┘                    └────────┘
```

### 10.4 Ứng dụng trong hệ thống

```javascript
// Middleware xác thực JWT
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Route được bảo vệ
app.get('/api/orders', authMiddleware, orderController.getAll);
```

---

## 11. RBAC (Role-Based Access Control)

### 11.1 Khái niệm

RBAC (Role-Based Access Control) là mô hình kiểm soát truy cập dựa trên vai trò. Người dùng được gán vai trò, và mỗi vai trò có các quyền hạn cụ thể.

### 11.2 Cấu trúc RBAC

```
┌─────────────────────────────────────────────────────────┐
│                    RBAC Model                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  Users   │───►│  Roles   │───►│   Permissions    │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│                                                         │
│  User có thể có    Role chứa      Permission định      │
│  một hoặc nhiều    nhiều          nghĩa hành động      │
│  Role              Permissions    được phép            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 11.3 Các vai trò trong hệ thống

| Vai trò | Mô tả | Quyền hạn chính |
|---------|-------|-----------------|
| **Admin** | Quản trị viên hệ thống | Toàn quyền, cấu hình hệ thống |
| **Manager** | Quản lý quán | Báo cáo, quản lý kho, nhân viên, menu |
| **Cashier** | Thu ngân | POS, thanh toán, mở/đóng ca |
| **Waiter** | Phục vụ | Tạo đơn, cập nhật bàn |
| **Kitchen** | Nhân viên bếp | Xem và cập nhật trạng thái đơn |
| **Shipper** | Giao hàng | Nhận đơn, cập nhật giao hàng |
| **Customer** | Khách hàng | Đặt hàng online, xem lịch sử |

### 11.4 Ma trận phân quyền

```
                    Admin Manager Cashier Waiter Kitchen Shipper Customer
Dashboard             ✓      ✓       -       -       -       -       -
POS                   ✓      ✓       ✓       ✓       -       -       -
Quản lý menu          ✓      ✓       -       -       -       -       -
Quản lý kho           ✓      ✓       -       -       -       -       -
Quản lý nhân viên     ✓      ✓       -       -       -       -       -
Báo cáo               ✓      ✓       -       -       -       -       -
KDS                   ✓      ✓       -       -       ✓       -       -
Giao hàng             ✓      ✓       -       -       -       ✓       -
Đặt hàng online       -      -       -       -       -       -       ✓
Cấu hình hệ thống     ✓      -       -       -       -       -       -
```

### 11.5 Triển khai trong hệ thống

```javascript
// Middleware kiểm tra role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

// Sử dụng
app.get('/api/reports', 
  authMiddleware, 
  requireRole('admin', 'manager'),
  reportController.getRevenue
);

app.post('/api/orders',
  authMiddleware,
  requireRole('admin', 'manager', 'cashier', 'waiter'),
  orderController.create
);
```

---

## 12. Server-Sent Events (SSE)

### 12.1 Khái niệm

Server-Sent Events (SSE) là một công nghệ cho phép server gửi dữ liệu đến client qua kết nối HTTP một chiều. Khác với WebSocket, SSE chỉ cho phép server push dữ liệu xuống client.

### 12.2 So sánh SSE vs WebSocket

| Tiêu chí | SSE | WebSocket |
|----------|-----|-----------|
| **Hướng giao tiếp** | Một chiều (Server → Client) | Hai chiều |
| **Protocol** | HTTP | WS/WSS |
| **Reconnection** | Tự động | Phải tự implement |
| **Data format** | Text only | Text và Binary |
| **Browser support** | Tốt (trừ IE) | Tốt |
| **Use case** | Notifications, live feeds | Chat, gaming |

### 12.3 Ứng dụng trong hệ thống

SSE được sử dụng trong hệ thống để:
- Cập nhật trạng thái đơn hàng real-time trên KDS
- Thông báo khi có đơn hàng mới
- Cập nhật trạng thái bàn
- Thông báo cảnh báo tồn kho

```javascript
// Server - Gửi events
app.get('/api/events', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Gửi event khi có đơn hàng mới
  const sendOrderUpdate = (order) => {
    res.write(`event: new-order\n`);
    res.write(`data: ${JSON.stringify(order)}\n\n`);
  };
  
  // Subscribe to order events
  orderEmitter.on('new-order', sendOrderUpdate);
  
  req.on('close', () => {
    orderEmitter.off('new-order', sendOrderUpdate);
  });
});

// Client - Nhận events
const eventSource = new EventSource('/api/events');

eventSource.addEventListener('new-order', (event) => {
  const order = JSON.parse(event.data);
  console.log('New order received:', order);
  // Update UI
});
```

---

## 13. Thanh toán trực tuyến

### 13.1 Tổng quan

Hệ thống tích hợp các cổng thanh toán trực tuyến để hỗ trợ khách hàng thanh toán không dùng tiền mặt:
- **PayOS:** Thanh toán qua QR code
- **VNPay:** Cổng thanh toán đa năng

### 13.2 Luồng thanh toán

```
┌─────────────────────────────────────────────────────────────────┐
│                     Payment Flow                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Tạo đơn hàng                                                │
│     ┌────────┐         ┌────────┐                               │
│     │ Client │ ──────► │ Server │                               │
│     └────────┘         └────────┘                               │
│                                                                  │
│  2. Tạo payment link                                            │
│     ┌────────┐         ┌────────┐         ┌────────┐            │
│     │ Server │ ──────► │ PayOS  │ ──────► │ Server │            │
│     └────────┘         └────────┘         └────────┘            │
│                            │                                     │
│  3. Hiển thị QR code       ▼                                    │
│     ┌────────┐         ┌────────┐                               │
│     │ Client │ ◄────── │ Server │                               │
│     └────────┘         └────────┘                               │
│                                                                  │
│  4. Khách thanh toán                                            │
│     ┌────────┐         ┌────────┐                               │
│     │ Khách  │ ──────► │ PayOS  │                               │
│     └────────┘         └────────┘                               │
│                                                                  │
│  5. Webhook callback                                            │
│     ┌────────┐         ┌────────┐                               │
│     │ PayOS  │ ──────► │ Server │ ──► Cập nhật trạng thái       │
│     └────────┘         └────────┘                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 13.3 Tích hợp PayOS

```javascript
// Tạo payment link
const createPaymentLink = async (order) => {
  const paymentData = {
    orderCode: order.id,
    amount: order.total,
    description: `Thanh toán đơn hàng #${order.id}`,
    returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
    cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
  };
  
  const paymentLink = await payOS.createPaymentLink(paymentData);
  return paymentLink;
};

// Webhook handler
app.post('/api/payment/webhook', async (req, res) => {
  const { orderCode, status } = req.body;
  
  if (status === 'PAID') {
    await Order.update(orderCode, { 
      payment_status: 'paid',
      paid_at: new Date()
    });
  }
  
  res.json({ success: true });
});
```

---

## 14. Tích hợp bản đồ (Leaflet)

### 14.1 Giới thiệu

Leaflet là một thư viện JavaScript mã nguồn mở để tạo bản đồ tương tác. Trong hệ thống, Leaflet được sử dụng để:
- Hiển thị địa chỉ giao hàng trên bản đồ
- Cho phép khách hàng chọn địa điểm giao hàng
- Tính khoảng cách để xác định phí ship

### 14.2 Tích hợp với OpenStreetMap

```javascript
// Khởi tạo bản đồ
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

function DeliveryMap({ address, position }) {
  return (
    <MapContainer center={position} zoom={15}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <Marker position={position}>
        <Popup>{address}</Popup>
      </Marker>
    </MapContainer>
  );
}
```

### 14.3 Geocoding

```javascript
// Chuyển địa chỉ thành tọa độ
const geocodeAddress = async (address) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
  );
  const data = await response.json();
  
  if (data.length > 0) {
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon)
    };
  }
  return null;
};
```

---

## 15. Chatbot AI

### 15.1 Giới thiệu

Hệ thống tích hợp Chatbot AI để hỗ trợ khách hàng tự động, sử dụng Google Gemini API để xử lý ngôn ngữ tự nhiên.

### 15.2 Chức năng

- Trả lời câu hỏi về menu, giá cả
- Hỗ trợ tư vấn chọn món
- Giải đáp thắc mắc về khuyến mãi
- Hướng dẫn đặt hàng

### 15.3 Kiến trúc

```
┌───────────────────────────────────────────────────────┐
│                 Chatbot Architecture                   │
├───────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐ │
│  │  User    │───►│ Backend  │───►│  Gemini API      │ │
│  │  Input   │    │ Server   │    │  (NLP Processing)│ │
│  └──────────┘    └──────────┘    └──────────────────┘ │
│       ▲                │                  │           │
│       │                ▼                  │           │
│       │         ┌──────────┐              │           │
│       │         │ Context  │◄─────────────┘           │
│       │         │ Manager  │                          │
│       │         └──────────┘                          │
│       │                │                              │
│       │                ▼                              │
│       │         ┌──────────┐                          │
│       └─────────│ Response │                          │
│                 │ Generator│                          │
│                 └──────────┘                          │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### 15.4 Tích hợp Gemini API

```javascript
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatWithAI = async (message, context) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  
  const systemPrompt = `
    Bạn là trợ lý ảo của quán cà phê. Nhiệm vụ của bạn là:
    - Giới thiệu menu và tư vấn chọn món
    - Trả lời câu hỏi về giá cả, khuyến mãi
    - Hướng dẫn khách đặt hàng
    
    Menu hiện tại: ${JSON.stringify(context.menu)}
    Khuyến mãi: ${JSON.stringify(context.promotions)}
  `;
  
  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Xin chào! Tôi sẵn sàng hỗ trợ.' }] }
    ]
  });
  
  const result = await chat.sendMessage(message);
  return result.response.text();
};
```

---

## 16. Biểu đồ và trực quan hóa dữ liệu (Recharts)

### 16.1 Giới thiệu

Recharts là thư viện biểu đồ React được xây dựng trên D3.js, cung cấp các component biểu đồ có thể tái sử dụng và tùy chỉnh dễ dàng.

### 16.2 Các loại biểu đồ sử dụng

| Loại biểu đồ | Mục đích |
|--------------|----------|
| **LineChart** | Doanh thu theo thời gian |
| **BarChart** | So sánh doanh thu theo ngày/tháng |
| **PieChart** | Tỷ lệ sản phẩm bán chạy |
| **AreaChart** | Xu hướng đơn hàng |

### 16.3 Ví dụ sử dụng

```jsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

function RevenueChart({ data }) {
  return (
    <LineChart width={800} height={400} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip formatter={(value) => `${value.toLocaleString()}đ`} />
      <Legend />
      <Line 
        type="monotone" 
        dataKey="revenue" 
        stroke="#8884d8" 
        name="Doanh thu"
      />
      <Line 
        type="monotone" 
        dataKey="profit" 
        stroke="#82ca9d" 
        name="Lợi nhuận"
      />
    </LineChart>
  );
}
```

---

## 17. Lưu trữ file với Supabase Storage

### 17.1 Giới thiệu

Supabase Storage là dịch vụ lưu trữ file của Supabase, được sử dụng để lưu trữ hình ảnh sản phẩm trong hệ thống.

### 17.2 Tính năng

- Upload và download file
- Tạo public URLs cho hình ảnh
- Quản lý bucket và policies
- Tối ưu hình ảnh tự động

### 17.3 Tích hợp

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Upload hình ảnh sản phẩm
const uploadProductImage = async (file, productId) => {
  const fileName = `products/${productId}-${Date.now()}.jpg`;
  
  const { data, error } = await supabase.storage
    .from('images')
    .upload(fileName, file, {
      contentType: 'image/jpeg',
      upsert: true
    });
    
  if (error) throw error;
  
  // Lấy public URL
  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);
    
  return urlData.publicUrl;
};
```

---

## 18. Tổng kết

Chương này đã trình bày các cơ sở lý thuyết và công nghệ được sử dụng trong hệ thống quản lý quán cà phê:

| Thành phần | Công nghệ | Mục đích |
|------------|-----------|----------|
| **Frontend** | React.js + Vite | Giao diện người dùng |
| **Styling** | TailwindCSS | Thiết kế responsive |
| **Backend** | Node.js + Express | API Server |
| **Database** | PostgreSQL | Lưu trữ dữ liệu |
| **Auth** | JWT + RBAC | Xác thực và phân quyền |
| **Real-time** | SSE | Cập nhật trạng thái |
| **Payment** | PayOS, VNPay | Thanh toán trực tuyến |
| **Maps** | Leaflet | Bản đồ giao hàng |
| **AI** | Gemini API | Chatbot hỗ trợ |
| **Charts** | Recharts | Biểu đồ báo cáo |
| **Storage** | Supabase | Lưu trữ hình ảnh |

Việc kết hợp các công nghệ hiện đại này giúp hệ thống:
- Đáp ứng các yêu cầu nghiệp vụ phức tạp của quán cà phê
- Cung cấp trải nghiệm người dùng mượt mà
- Dễ dàng bảo trì và mở rộng trong tương lai
- Đảm bảo bảo mật và hiệu suất cao

---

*Chương tiếp theo sẽ trình bày chi tiết về thiết kế và cài đặt giải pháp.*
