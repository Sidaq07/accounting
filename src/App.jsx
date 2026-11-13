import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Public Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import QuickContact from './components/QuickContact';
import About from './components/About';
import Services from './components/Services';
import BookingForm from './components/BookingForm';
import WhyChooseUs from './components/WhyChooseUs';
import ServiceAreas from './components/ServiceAreas';
import Reviews from './components/Reviews';
import Contact from './components/Contact';
import Footer from './components/Footer';
import FloatingContactButtons from './components/FloatingContactButtons';

// Admin Components
import AdminRoute from './admin/AdminRoute';
import AdminLayout from './admin/AdminLayout';
import Login from './admin/Login';
import Dashboard from './admin/Dashboard';
import Customers from './admin/Customers';
import CustomerLedger from './admin/CustomerLedger';
import CustomerAccounts from './admin/CustomerAccounts';
import Orders from './admin/Orders';
import Payments from './admin/Payments';
import PendingPayments from './admin/PendingPayments';
import Reports from './admin/Reports';
import AuditHistory from './admin/AuditHistory';
import SettingsView from './admin/Settings';
import StatementPrint from './admin/StatementPrint';

// Wrapper for the public client landing page
function PublicPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main id="home">
        <Hero />
        <QuickContact />
        <About />
        <Services />
        <BookingForm />
        <WhyChooseUs />
        <ServiceAreas />
        <Reviews />
        <Contact />
      </main>
      <Footer />
      <FloatingContactButtons />
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Website */}
        <Route path="/" element={<PublicPage />} />

        {/* Private Login */}
        <Route path="/login" element={<Login />} />

        {/* Secure Admin Dashboard Area */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerLedger />} />
          <Route path="accounts" element={<CustomerAccounts />} />
          <Route path="payments" element={<Payments />} />
          <Route path="pending-payments" element={<PendingPayments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit-log" element={<AuditHistory />} />
          <Route path="settings" element={<SettingsView />} />
        </Route>

        {/* Print statement preview */}
        <Route
          path="/admin/statement-print/:id"
          element={
            <AdminRoute>
              <StatementPrint />
            </AdminRoute>
          }
        />

        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
