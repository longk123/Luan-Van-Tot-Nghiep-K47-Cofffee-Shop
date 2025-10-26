import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../auth.js';

export default function RoleGuard({ children, allowedRoles = [], fallbackPath = '/dashboard' }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return; // Tránh infinite loop
    
    const checkAccess = async () => {
      try {
        const user = getUser();
        console.log('🔍 RoleGuard - Local user data:', user);
        
        if (!user) {
          console.log('❌ RoleGuard - No local user data, redirecting to login');
          navigate('/login');
          return;
        }

        // Sử dụng roles từ token thay vì gọi API
        const userRoles = user.roles || [];
        
        console.log('🔍 RoleGuard - User roles from token:', userRoles);
        console.log('🔍 RoleGuard - Allowed roles:', allowedRoles);

        // Normalize roles to lowercase for comparison
        const normalizedUserRoles = userRoles.map(role => 
          typeof role === 'string' ? role.toLowerCase() : role
        );
        const normalizedAllowedRoles = allowedRoles.map(role => role.toLowerCase());

        // Kiểm tra quyền truy cập
        const hasPermission = allowedRoles.length === 0 || 
          normalizedAllowedRoles.some(role => normalizedUserRoles.includes(role));

        console.log('🔍 RoleGuard - Normalized user roles:', normalizedUserRoles);
        console.log('🔍 RoleGuard - Normalized allowed roles:', normalizedAllowedRoles);
        console.log('🔍 RoleGuard - Has permission:', hasPermission);

        if (!hasPermission) {
          console.log('❌ RoleGuard - No permission, redirecting...');
          // Redirect theo role mặc định
          if (userRoles.includes('manager') || userRoles.includes('admin')) {
            console.log('🔄 Redirecting to /manager');
            navigate('/manager');
          } else if (userRoles.includes('kitchen')) {
            console.log('🔄 Redirecting to /kitchen');
            navigate('/kitchen');
          } else if (userRoles.includes('cashier')) {
            console.log('🔄 Redirecting to /dashboard');
            navigate('/dashboard');
          } else {
            console.log('🔄 Redirecting to fallback:', fallbackPath);
            navigate(fallbackPath);
          }
          return;
        }
        
        console.log('✅ RoleGuard - Permission granted');
        setHasAccess(true);
        setChecked(true);
      } catch (error) {
        console.error('Error checking access:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate, allowedRoles, fallbackPath, checked]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return children;
}
