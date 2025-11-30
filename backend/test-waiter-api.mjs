// Test Waiter API - Chạy với node
const API_BASE = 'http://localhost:5000/api/v1';

async function loginWaiter() {
  console.log('🔐 Đang đăng nhập với waiter01...');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'waiter01',
      password: 'waiter123'
    })
  });
  
  const data = await response.json();
  
  // Backend trả về { user, token } chứ không phải { success, data }
  if (!data.token) {
    console.error('❌ Đăng nhập thất bại:', data);
    return null;
  }
  
  console.log('✅ Đăng nhập thành công!');
  console.log('   - User:', data.user.username);
  console.log('   - Roles:', data.user.roles);
  console.log('   - Token:', data.token.substring(0, 30) + '...');
  
  return data.token;
}

async function getCurrentShiftOrders(token) {
  console.log('\n📊 Lấy đơn hàng ca hiện tại...');
  
  const response = await fetch(`${API_BASE}/pos/orders/current-shift`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('❌ Lỗi:', data);
    return;
  }
  
  console.log('✅ Dữ liệu nhận được:');
  console.log('   - Shift ID:', data.data.shift?.id);
  console.log('   - Shift Type:', data.data.shift?.shift_type);
  console.log('   - isWaiter flag:', data.data.isWaiter);
  console.log('   - Tổng đơn:', data.data.orders?.length);
  console.log('   - Stats:', JSON.stringify(data.data.stats, null, 2));
  
  // Kiểm tra chi tiết đơn
  if (data.data.orders && data.data.orders.length > 0) {
    console.log('\n📦 Chi tiết đơn hàng:');
    data.data.orders.forEach((order, idx) => {
      console.log(`   ${idx + 1}. Đơn #${order.id}:`);
      console.log(`      - Loại: ${order.order_type}`);
      console.log(`      - Trạng thái: ${order.trang_thai}`);
      console.log(`      - Số món: ${order.so_mon}`);
      console.log(`      - Tổng tiền: ${order.tong_tien}`);
      if (order.order_type === 'DELIVERY') {
        console.log(`      - Delivery Status: ${order.delivery_status}`);
        console.log(`      - Shipper ID: ${order.shipper_id}`);
      }
    });
  }
  
  return data.data;
}

async function getMyAssignedDeliveries(token) {
  console.log('\n🚚 Lấy đơn giao hàng đã nhận...');
  
  const response = await fetch(`${API_BASE}/pos/delivery/my-assigned`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('❌ Lỗi:', data);
    return;
  }
  
  console.log('✅ Đơn giao hàng đã nhận:');
  console.log('   - Tổng đơn:', data.data?.length || 0);
  
  if (data.data && data.data.length > 0) {
    data.data.forEach((order, idx) => {
      console.log(`   ${idx + 1}. Đơn #${order.id}:`);
      console.log(`      - Địa chỉ: ${order.delivery_address?.substring(0, 50)}...`);
      console.log(`      - Trạng thái: ${order.delivery_status}`);
      console.log(`      - Tổng tiền: ${order.grand_total}`);
    });
  }
  
  return data.data;
}

async function getWalletInfo(token) {
  console.log('\n💰 Lấy thông tin ví...');
  
  const response = await fetch(`${API_BASE}/wallet/me`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    console.error('❌ Lỗi:', data);
    return;
  }
  
  console.log('✅ Thông tin ví:');
  console.log('   - Số dư hiện tại:', data.data.current_balance);
  console.log('   - Tổng thu:', data.data.total_collected);
  console.log('   - Tổng nộp:', data.data.total_settled);
  
  return data.data;
}

async function runTests() {
  try {
    const token = await loginWaiter();
    if (!token) return;
    
    await getCurrentShiftOrders(token);
    await getMyAssignedDeliveries(token);
    await getWalletInfo(token);
    
    console.log('\n✅ Tất cả test API đã hoàn thành!');
    
  } catch (err) {
    console.error('❌ Lỗi:', err);
  }
}

runTests();
