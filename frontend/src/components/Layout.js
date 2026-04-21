import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users2, CheckSquare, UsersRound, LogOut } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const nav = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/leads', label: 'Leads', icon: Users2 },
    { path: '/tasks', label: 'My Tasks', icon: CheckSquare },
  ];
  if (user?.role === 'admin') {
    nav.push({ path: '/team', label: 'Team', icon: UsersRound });
  }

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>REI<span>Flow</span></h1>
          <p>Deal Machine CRM</p>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-label">Menu</div>
          {nav.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              className={`nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="avatar">{initials}</div>
            <div className="user-info-text">
              <div className="name">{user?.name}</div>
              <div className="role">{user?.role}</div>
            </div>
          </div>
          <button className="nav-item" onClick={logout} style={{ color: 'var(--red)', marginTop: 4 }}>
            <LogOut />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div style={{ display:'flex', justifyContent:'flex-end', alignItems:'center', padding:'12px 32px 0', gap:8 }}>
          <NotificationBell />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
