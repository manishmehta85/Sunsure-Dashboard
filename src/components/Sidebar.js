import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, role, can, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('projects').select('id,name,state').order('name').then(({ data }) => {
      setProjects(data || []);
      setLoading(false);
    });
  }, []);

  const stateColors = {
    'Gujarat': '#f5a623', 'Karnataka': '#36c98e', 'Maharashtra': '#4f8ef7',
    'Rajasthan': '#f05c5c', 'Tamil Nadu': '#a78bfa', 'Uttar Pradesh': '#36c9c9',
  };

  const ROLE_COLOR = { admin: 'var(--red)', editor: 'var(--accent)', viewer: 'var(--text3)' };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-title">SunSure</div>
          <div className="logo-sub">Project Tracker</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">◉</span> Dashboard
        </NavLink>
        <NavLink to="/tasks" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
          <span className="nav-icon">☰</span> All Tasks
        </NavLink>
        {can.admin && (
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <span className="nav-icon">👤</span> Team
          </NavLink>
        )}
      </nav>

      <div className="sidebar-section-label">Projects</div>

      <div className="sidebar-projects">
        {loading ? (
          <div style={{ padding: '12px 16px' }}><div className="spinner" /></div>
        ) : (
          projects.map(p => (
            <NavLink
              key={p.id}
              to={`/project/${p.id}`}
              className={({ isActive }) => isActive ? 'proj-item active' : 'proj-item'}
            >
              <span className="proj-dot" style={{ background: stateColors[p.state] || '#555e78' }} />
              <span className="proj-name">{p.name}</span>
            </NavLink>
          ))
        )}
      </div>

      {can.edit && (
        <button className="sidebar-new-project" onClick={() => navigate('/')}>
          + New Project
        </button>
      )}

      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <div className="sidebar-user-email">{user?.email}</div>
          <div className="sidebar-user-role" style={{ color: ROLE_COLOR[role] }}>
            {role}
          </div>
        </div>
        <button className="sidebar-signout" onClick={handleSignOut} title="Sign out">⏻</button>
      </div>
    </aside>
  );
}
