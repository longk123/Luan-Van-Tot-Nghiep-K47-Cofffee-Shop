# Changelog

All notable changes to this Coffee Shop POS project will be documented in this file.

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

