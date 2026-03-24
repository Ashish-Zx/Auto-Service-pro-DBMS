import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  RiDashboardLine, RiTeamLine, RiCarLine, RiFileListLine,
  RiAddCircleLine, RiCalendarEventLine, RiArchiveLine,
  RiLogoutBoxLine, RiToolsLine, RiMenuLine, RiCloseLine, RiSettingsLine
} from 'react-icons/ri';
import API from './services/api';
import { onAuthExpired } from './services/authEvents';
import { useToast } from './components/ToastProvider';
import Dashboard     from './pages/Dashboard';
import Customers     from './pages/Customers';
import Vehicles      from './pages/Vehicles';
import ServiceOrders from './pages/ServiceOrders';
import OrderDetail   from './pages/OrderDetail';
import CreateOrder   from './pages/CreateOrder';
import Appointments  from './pages/Appointments';
import Mechanics     from './pages/Mechanics';
import Inventory     from './pages/Inventory';
import CustomerProfile from './pages/CustomerProfile';
import Login         from './pages/Login';
import LandingPage   from './pages/LandingPage';
import Receptionists from './pages/Receptionists';
import CompanySettings from './pages/CompanySettings';
import './index.css';

const NAV_ITEMS = [
  { to: '/dashboard',     icon: <RiDashboardLine size={18} />, label: 'Dashboard', roles: ['owner', 'receptionist'] },
  { to: '/receptionists', icon: <RiTeamLine      size={18} />, label: 'Receptionists', roles: ['owner'] },
  { to: '/company',       icon: <RiSettingsLine  size={18} />, label: 'Company', roles: ['owner'] },
  { to: '/customers',     icon: <RiTeamLine      size={18} />, label: 'Customers', roles: ['owner', 'receptionist'] },
  { to: '/vehicles',      icon: <RiCarLine       size={18} />, label: 'Vehicles', roles: ['owner', 'receptionist']  },
  { to: '/orders',        icon: <RiFileListLine  size={18} />, label: 'Orders', roles: ['owner', 'receptionist']    },
  { to: '/orders/new',    icon: <RiAddCircleLine size={18} />, label: 'New Order', roles: ['owner', 'receptionist'] },
  { to: '/appointments',  icon: <RiCalendarEventLine size={18} />, label: 'Appointments', roles: ['owner', 'receptionist'] },
  { to: '/mechanics',     icon: <RiToolsLine     size={18} />, label: 'Mechanics', roles: ['owner', 'receptionist'] },
  { to: '/inventory',     icon: <RiArchiveLine   size={18} />, label: 'Inventory', roles: ['owner', 'receptionist'] },
];

function getCompanyInitials(companyName) {
  if (!companyName) return 'AS';
  return companyName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatRole(role) {
  if (!role) return 'User';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function AppShell({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const visibleNavItems = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));
  const companyInitials = getCompanyInitials(user?.company_name);
  const companyName = user?.company_name || 'Garage Pilot';
  const roleLabel = formatRole(user?.role);

  // Close sidebar on route change (mobile nav)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app">
      {/* ── Mobile Topbar ── */}
      <div className="mobile-topbar">
        <button
          className="hamburger-btn"
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Toggle navigation"
        >
          {sidebarOpen ? <RiCloseLine size={20} /> : <RiMenuLine size={20} />}
        </button>
        <div className="mobile-topbar-brand">
          <span className="mobile-topbar-brand-mark">{companyInitials}</span>
          <div className="mobile-topbar-brand-copy">
            <strong>{companyName}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
        {/* spacer to centre brand */}
        <div style={{ width: 38 }} />
      </div>

      {/* ── Sidebar Backdrop (mobile) ── */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <nav className={`sidebar${sidebarOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <div className="workspace-label">Workspace</div>
          <div className="company-card">
            <div className="company-mark">{companyInitials}</div>
            <div className="company-copy">
              <h2>{companyName}</h2>
              <p>{user?.username || 'Signed in'} · {roleLabel}</p>
            </div>
          </div>
          <div className="company-meta">
            <span className="company-chip">{user?.company_code || 'COMPANY'}</span>
            <span className="company-chip company-chip-muted">Multi-tenant workspace</span>
          </div>
        </div>

        <ul className="nav-links">
          {visibleNavItems.map(item => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={location.pathname === item.to ? 'active' : ''}
              >
                {item.icon}
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <button onClick={onLogout} className="logout-btn">
            <RiLogoutBoxLine size={16} /> Sign out
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="main-content">
        <Routes>
          <Route path="/dashboard"     element={<Dashboard />}    />
          <Route path="/receptionists" element={<Receptionists />} />
          <Route path="/company"       element={<CompanySettings />} />
          <Route path="/customers"     element={<Customers />}    />
          <Route path="/customers/:id" element={<CustomerProfile />} />
          <Route path="/vehicles"      element={<Vehicles />}     />
          <Route path="/orders"        element={<ServiceOrders />}/>
          <Route path="/orders/new"    element={<CreateOrder />}  />
          <Route path="/orders/:id"    element={<OrderDetail />}  />
          <Route path="/appointments"  element={<Appointments />} />
          <Route path="/mechanics"     element={<Mechanics />}    />
          <Route path="/inventory"     element={<Inventory />}    />
          <Route path="*"              element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const toast = useToast();
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [authLoading, setAuthLoading] = useState(!!localStorage.getItem('token'));

  const handleLogin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsLoggedIn(true);
    setUser(userData);
  };

  const handleLogout = (showMessage = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
    if (showMessage) {
      toast.info('Your session expired. Please sign in again.');
    }
  };

  useEffect(() => onAuthExpired(() => handleLogout(true)), []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    let cancelled = false;

    const loadSession = async () => {
      try {
        const response = await API.get('/auth/me');
        if (cancelled) return;
        const currentUser = response.data?.user || null;
        if (currentUser) {
          const normalizedUser = {
            id: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
            company_id: currentUser.company_id,
            company_name: currentUser.company_name,
            company_code: currentUser.company_code,
          };
          localStorage.setItem('user', JSON.stringify(normalizedUser));
          setUser(normalizedUser);
          setIsLoggedIn(true);
        }
      } catch (error) {
        if (!cancelled) {
          handleLogout();
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    };

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="loading-state" style={{ height: '100vh' }}>
        <div className="spinner" />
        <p>Checking session…</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ── Public routes ── */}
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <LandingPage />}
        />
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} />}
        />

        {/* ── Protected routes ── */}
        <Route
          path="/*"
          element={
            isLoggedIn
              ? <AppShell user={user} onLogout={handleLogout} />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
