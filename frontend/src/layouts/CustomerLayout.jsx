// Customer Portal Layout
import { Outlet } from 'react-router-dom';
import CustomerHeader from '../components/customer/CustomerHeader';
import CustomerFooter from '../components/customer/CustomerFooter';
import ChatbotWidget from '../components/customer/ChatbotWidget';

export default function CustomerLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <CustomerHeader />
      
      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>
      
      {/* Footer */}
      <CustomerFooter />
      
      {/* Chatbot Widget */}
      <ChatbotWidget />
    </div>
  );
}

