// === src/main.jsx (REPLACE) ===
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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
import BatchExpiryDashboard from './pages/BatchExpiryDashboard.jsx'
import BatchInventoryReport from './pages/BatchInventoryReport.jsx'
import RoleGuard from './components/RoleGuard.jsx'

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
    path: '/batch-expiry',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <BatchExpiryDashboard />
      </RoleGuard>
    )
  },
  {
    path: '/batch-report',
    element: (
      <RoleGuard allowedRoles={['manager', 'admin']}>
        <BatchInventoryReport />
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
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
