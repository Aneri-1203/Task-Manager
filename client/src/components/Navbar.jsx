import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ListTodo,
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  Mail,
  LogOut,
  ShieldCheck,
  UserCheck,
  User,
  Clock
} from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isManager, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="badge-role admin">
            <ShieldCheck size={13} /> Admin
          </span>
        );
      case 'manager':
        return (
          <span className="badge-role manager">
            <UserCheck size={13} /> Manager
          </span>
        );
      case 'employee':
      case 'user':
      default:
        return (
          <span className="badge-role employee">
            <User size={13} /> Employee
          </span>
        );
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-container">
        {/* Brand */}
        <Link to={isAuthenticated ? '/dashboard' : '/login'} className="brand-logo">
          <div className="brand-icon-box">
            <ListTodo size={22} />
          </div>
          <span>TaskManager <span style={{ color: 'var(--primary)', fontSize: '14px', fontWeight: '700', background: 'var(--primary-light)', padding: '2px 8px', borderRadius: '12px' }}>v8.0</span></span>
        </Link>

        {/* Navigation Links */}
        {isAuthenticated && (
          <nav className="nav-links">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <LayoutDashboard size={16} /> Dashboard
            </NavLink>

            <NavLink
              to="/projects"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <FolderKanban size={16} /> Tasks & Projects
            </NavLink>

            {(isAdmin || isManager) && (
              <NavLink
                to="/team"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Users size={16} /> {isAdmin ? 'Team & Roles' : 'My Employees'}
              </NavLink>
            )}

            <NavLink
              to="/analytics"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <BarChart3 size={16} /> Analytics (Lazy)
            </NavLink>

            <NavLink
              to="/contact"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Mail size={16} /> Contact
            </NavLink>
          </nav>
        )}

        {/* User Session & Actions */}
        <div className="nav-user-section">
          {isAuthenticated ? (
            <>
              <div className="session-status-pill" title="Live Secure Session Active">
                <span className="session-dot"></span>
                <span>Session Active</span>
              </div>

              {getRoleBadge(user?.role)}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--slate-700)' }}>
                  {user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  title="Logout"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/login" className="btn btn-secondary btn-sm">
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
