// === src/main.jsx (REPLACE) ===
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/CustomerToast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import POS from './pages/POS.jsx'
import Kitchen from './pages/Kitchen.jsx'
import TakeawayOrders from './pages/TakeawayOrders.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import PaymentCancel from './pages/PaymentCancel.jsx'
import ManagerDashboard from './pages/ManagerDashboard.jsx'
import InventoryManagement from './pages/InventoryManagement.jsx'
import MenuManagement from './pages/MenuManagement.jsx'
import AreaTableManagement from './pages/AreaTableManagement.jsx'
import EmployeeManagement from './pages/EmployeeManagement.jsx'
import PromotionManagement from './pages/PromotionManagement.jsx'
import RoleGuard from './components/RoleGuard.jsx'
import ShiftReportPrint from './components/manager/ShiftReportPrint.jsx'

// Customer Portal Imports
import CustomerLayout from './layouts/CustomerLayout.jsx'
import HomePage from './pages/customer/HomePage.jsx'
import MenuPage from './pages/customer/MenuPage.jsx'
import ProductDetailPage from './pages/customer/ProductDetailPage.jsx'
import CartPage from './pages/customer/CartPage.jsx'
import CheckoutPage from './pages/customer/CheckoutPage.jsx'
import OrderHistoryPage from './pages/customer/OrderHistoryPage.jsx'
import OrderSuccessPage from './pages/customer/OrderSuccessPage.jsx'
import CustomerReservationPage from './pages/customer/CustomerReservationPage.jsx'
import CustomerLogin from './pages/customer/CustomerLogin.jsx'
import CustomerRegister from './pages/customer/CustomerRegister.jsx'

const router = createBrowserRouter([
  { path: '/', element: <Login /> },
  { path: '/login', element: <Login /> },
  { 
    path: '/dashboard', 
    element: (
      <RoleGuard allowedRoles={['cashier', 'manager', 'admin']}>
        <Dashboard />
      </RoleGuard>
    )
  },
  { 
    path: '/manager', 
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <ManagerDashboard />
      </RoleGuard>
    )
  },
  { 
    path: '/inventory', 
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <InventoryManagement />
      </RoleGuard>
    )
  },
  {
    path: '/menu-management',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <MenuManagement />
      </RoleGuard>
    )
  },
  {
    path: '/areas',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <AreaTableManagement />
      </RoleGuard>
    )
  },
  {
    path: '/employees',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <EmployeeManagement />
      </RoleGuard>
    )
  },
  {
    path: '/promotion-management',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <PromotionManagement />
      </RoleGuard>
    )
  },
  {
    path: '/pos',
    element: (
      <RoleGuard allowedRoles={['cashier', 'manager', 'admin']}>
        <POS />
      </RoleGuard>
    )
  },
  { 
    path: '/kitchen', 
    element: (
      <RoleGuard allowedRoles={['kitchen', 'manager', 'admin']}>
        <Kitchen />
      </RoleGuard>
    )
  },
  { 
    path: '/takeaway', 
    element: (
      <RoleGuard allowedRoles={['cashier', 'manager', 'admin']}>
        <TakeawayOrders />
      </RoleGuard>
    )
  },
  { path: '/payment-success', element: <PaymentSuccess /> },
  { path: '/payment-cancel', element: <PaymentCancel /> },
  {
    path: '/shift-report-print',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <ShiftReportPrint />
      </RoleGuard>
    )
  },
  // Customer Portal Routes
  {
    path: '/customer',
    element: <CustomerLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'menu', element: <MenuPage /> },
      { path: 'menu/:id', element: <ProductDetailPage /> },
      { path: 'cart', element: <CartPage /> },
      { path: 'checkout', element: <CheckoutPage /> },
      { path: 'orders', element: <OrderHistoryPage /> },
      { path: 'orders/success', element: <OrderSuccessPage /> },
      { path: 'reservation', element: <CustomerReservationPage /> },
    ]
  },
  // Customer Auth (outside layout)
  { path: '/customer/login', element: <CustomerLogin /> },
  { path: '/customer/register', element: <CustomerRegister /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
