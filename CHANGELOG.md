# Changelog

All notable changes to this Coffee Shop POS project will be documented in this file.

## [1.1.0] - 2025-10-22

### Added

#### Complete Reservation System (Đặt Bàn)
- **Table Booking Feature**: Full-featured reservation system
  - 2-step wizard UI (Info → Select Tables)
  - Date/Time picker with smart defaults (+1 hour from now)
  - Duration selector (60-180 minutes)
  - People counter with stepper
  - Area/zone selector
  - Deposit amount tracking
  - Source tracking (Phone/Walkin/Online)
  - Notes field for special requests

- **Smart Table Search**:
  - Real-time availability check
  - Filter by area
  - Show only truly available tables in time range
  - Multi-table selection for large groups
  - Visual feedback for selected tables

- **Reservation Management**:
  - Timeline view by date
  - Filter by status (Pending/Confirmed/Seated)
  - Confirm reservation (PENDING → CONFIRMED)
  - Cancel with reason tracking
  - Mark no-show
  - Auto-refresh list

- **Seamless Check-in Flow**:
  - One-click check-in from reservation list
  - Automatically creates DINE_IN order
  - Opens OrderDrawer immediately
  - Updates table status
  - Links reservation to order

- **Visual Indicators**:
  - Indigo badge "📅 ĐẶT" on TableCard for upcoming reservations
  - Tooltip shows reservation time
  - Info card with time, people count, customer name
  - Status badges (6 states)

#### Database Features
- **New Tables**:
  - `khach_hang`: Customer information for repeat bookings
  - `dat_ban`: Reservation header with all details
  - `dat_ban_ban`: Reservation-Table link table (supports multi-table)

- **Exclusion Constraint**: Database-level double-booking prevention
  ```sql
  EXCLUDE USING gist (ban_id WITH =, tstzrange(start_at, end_at) WITH &&)
  ```
  - Hard protection at PostgreSQL level
  - Prevents overlapping bookings on same table
  - Works even with multiple concurrent requests

- **Database Functions**:
  - `fn_tables_available(start, end, area)`: Find available tables
  - Automatic time range validation

- **Triggers**:
  - Auto-sync start/end times to linked tables
  - Auto-sync status to all table links

- **Views**:
  - `v_reservation_calendar`: Timeline view with customer and table info

#### Backend APIs (12 endpoints)
```
POST   /api/v1/reservations                      # Create reservation
GET    /api/v1/reservations?date=&status=        # List by date
GET    /api/v1/reservations/:id                  # Get detail
PATCH  /api/v1/reservations/:id                  # Update info
POST   /api/v1/reservations/:id/tables           # Assign tables
DELETE /api/v1/reservations/:id/tables/:tableId  # Unassign table
POST   /api/v1/reservations/:id/confirm          # Confirm booking
POST   /api/v1/reservations/:id/check-in         # Check-in (create order)
POST   /api/v1/reservations/:id/cancel           # Cancel with reason
POST   /api/v1/reservations/:id/no-show          # Mark no-show
POST   /api/v1/reservations/:id/complete         # Complete
GET    /api/v1/tables/availability               # Search available tables
```

#### Frontend Components
- **ReservationPanel.jsx**: Beautiful 2-step booking wizard
  - Step 1: Customer info, date/time, people count, duration
  - Step 2: Smart table selection with visual feedback
  - Gradient design (blue to indigo)
  - Form validation
  - Error handling with toasts

- **ReservationsList.jsx**: Comprehensive reservation management
  - Date picker for viewing different days
  - Status filter (All/Pending/Confirmed/Seated)
  - Action buttons per reservation
  - One-click check-in
  - Confirm/Cancel/No-show actions
  - Responsive cards with all info

- **Enhanced TableCard.jsx**:
  - Upcoming reservation badge (indigo)
  - Tooltip with reservation time
  - Info card showing reservation details
  - Conditional rendering based on reservation state

- **Enhanced Dashboard.jsx**:
  - "📅 Đặt bàn" button (create new)
  - "📋 Danh sách đặt bàn" button (view/manage)
  - Check-in handler with auto OrderDrawer opening
  - Integrated with existing table flow

#### Business Logic & Validation
- **Time Validation**:
  - No past bookings allowed
  - Minimum duration: 15 minutes
  - Maximum duration: 4 hours
  - Auto-calculate end_at from duration

- **Customer Management**:
  - Upsert customer by phone (auto-update if exists)
  - Reuse customer info for returning customers

- **Smart Defaults**:
  - Default time: +1 hour from now (rounded)
  - Default duration: 90 minutes
  - Default source: PHONE

#### Documentation
- **RESERVATION_SYSTEM.md**: Complete system documentation
  - Database schema explained
  - All API endpoints with examples
  - User flows (phone booking, check-in)
  - UI design patterns
  - Testing guide
  - Troubleshooting
  - Future enhancements roadmap

### Technical Details

#### Backend Structure
```
backend/src/
├── controllers/reservationsController.js  # 12 endpoint handlers
├── services/reservationsService.js        # Business logic, validation
├── repositories/reservationsRepository.js # 15 database methods
└── routes/reservations.js                 # Route definitions
```

#### Frontend Structure
```
frontend/src/
├── api.js                              # +15 reservation methods
├── components/
│   ├── ReservationPanel.jsx           # Booking wizard
│   ├── ReservationsList.jsx           # Management interface
│   └── TableCard.jsx                  # Enhanced with badge
└── pages/
    └── Dashboard.jsx                   # Integrated buttons
```

### Files Changed
- **Backend**: 5 new files
  - migrate-add-reservations.cjs
  - reservationsController.js
  - reservationsService.js
  - reservationsRepository.js
  - reservations.js (routes)
  - index.js (updated)

- **Frontend**: 4 files
  - api.js (updated +32 lines)
  - ReservationPanel.jsx (new)
  - ReservationsList.jsx (new)
  - TableCard.jsx (updated)
  - Dashboard.jsx (updated)

- **Documentation**: 1 file
  - RESERVATION_SYSTEM.md (new, 400+ lines)

### Statistics
- **13 files** changed
- **2,702 insertions**, **15 deletions**
- **12 API endpoints** added
- **3 database tables** created
- **1 exclusion constraint** for data integrity
- **0 linter errors**

---

## [1.0.0] - 2025-10-22

### Added

#### Order Creation Features
- **Order Confirmation Dialog**: Added confirmation dialog when creating new orders (both table orders and takeaway)
  - Beautiful modal with gradient design (emerald theme)
  - Shows order details (table name, area, capacity for dine-in)
  - Shows order type for takeaway
  - Prevents accidental order creation
  - Success toast notification after order creation

#### Promotion Features
- **Promotion Suggestions Dialog**: Complete promotion management interface in OrderDrawer
  - "💡 Gợi ý mã khuyến mãi" button with purple-pink gradient design
  - Full-screen responsive dialog showing all active promotions
  - Smart filtering and validation:
    - Green cards for already applied promotions
    - White cards with purple border for applicable promotions
    - Gray cards for promotions not meeting requirements
    - Real-time calculation showing how much more needed to qualify
  - One-click promotion application
  - Detailed promotion information:
    - Promotion code and discount amount
    - Description
    - Minimum order requirement
    - Usage count (used/max)
    - Valid date range
  - Loading states with spinner
  - Empty state with helpful message
  - Toast notifications for all actions

#### UI/UX Improvements
- Gradient button designs (purple-pink for promotions, emerald for orders)
- Smooth transitions and hover effects
- Responsive dialogs with scrollable content
- Icon-rich interface with SVG icons
- Accessibility features (focus states, outline management)
- Vietnamese language support throughout

### Technical Details

#### Frontend Changes
- **Dashboard.jsx**:
  - Added state for confirmation dialog (`showCreateConfirm`, `pendingOrderCreation`)
  - Implemented `confirmCreateTableOrder()` and `confirmCreateTakeawayOrder()` functions
  - Updated `handleTableClick()` to show confirmation before creating order
  - Updated `handleCreateTakeaway()` to show confirmation dialog
  - Added styled confirmation dialog component

- **OrderDrawer.jsx**:
  - Added state for promotions dialog (`showPromotionsDialog`, `availablePromotions`, `loadingPromotions`)
  - Implemented `handleShowPromotions()` to fetch and display active promotions
  - Implemented `handleApplyPromoFromList()` for one-click promotion application
  - Added comprehensive promotions dialog component with:
    - Smart status indicators
    - Conditional rendering based on order total
    - Real-time validation
    - Detailed promotion cards
  - Added purple-pink gradient button in promo section

- **api.js**: Already includes `getActivePromotions()` API endpoint

#### Backend
- Complete Node.js + Express backend with PostgreSQL
- RESTful API for POS operations
- Authentication and authorization
- Real-time updates via Server-Sent Events (SSE)
- Comprehensive database schema with views and triggers

#### Database
- Complete PostgreSQL schema setup
- User roles: admin, manager, cashier, kitchen, customer
- Tables, orders, menu items, promotions, shifts management
- Per-cup options and topping pricing
- Views for efficient querying

### Files Changed
- `frontend/src/pages/Dashboard.jsx`: +120 lines (confirmation dialog)
- `frontend/src/components/OrderDrawer.jsx`: +200 lines (promotions feature)
- `.gitignore`: Created with comprehensive ignore rules
- `CHANGELOG.md`: Created this changelog

### Statistics
- **83 files** added/changed
- **12,354 insertions**
- **2 major features** implemented
- **0 linter errors**

### Commit
- Hash: `4c36295dfc3aeb5e4a04864f447f2a31c6cde79f`
- Tag: `v1.0.0`
- Author: Coffee Shop POS
- Date: Wed Oct 22 00:37:53 2025 +0700

---

## Project Structure

```
my-thesis/
├── backend/               # Node.js + Express API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── services/      # Business logic
│   │   ├── repositories/  # Database access
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, error handling, etc.
│   │   └── utils/         # Utilities
│   ├── setup-db.js        # Database initialization
│   └── index.js           # Server entry point
│
├── frontend/              # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── layouts/       # Layout components
│   │   ├── api.js         # API client
│   │   └── auth.js        # Authentication utilities
│   └── package.json
│
└── README.md              # Project documentation
```

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL with complex views
- JWT authentication
- Server-Sent Events (SSE)
- bcrypt for password hashing

### Frontend
- React 18
- Vite
- Tailwind CSS
- React Hooks (useState, useEffect, useCallback, useMemo)
- Custom hooks for SSE and order management

### Features
- Multi-role authentication (admin, manager, cashier, kitchen, customer)
- Real-time table status updates
- Per-cup customization with options (sugar, ice) and toppings
- Promotion system with automatic validation
- Order confirmation workflow
- Beautiful, responsive UI with gradient designs

