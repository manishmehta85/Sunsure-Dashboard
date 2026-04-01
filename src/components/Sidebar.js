import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import './Sidebar.css';

export default function Sidebar() {
  const [projects, setProjects] = useState([]);
  const { user, role, can, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from('projects').select('id,name,state').order('name')
      .then(({ data }) => setProjects(data || []));
  }, []);

  const STATE_COLORS = {
    'Gujarat':'#F59E0B','Karnataka':'#16A34A','Maharashtra':'#2563EB',
    'Rajasthan':'#DC2626','Tamil Nadu':'#7C3AED','Uttar Pradesh':'#0891B2',
  };

  const initials = (email) => email ? email.slice(0,2).toUpperCase() : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="5" fill="#fff"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
              stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="logo-title">SunSure</div>
          <div className="logo-sub">Project Tracker</div>
        </div>
      </div>

      <div className="sidebar-section-label">Menu</div>
      <div className="sidebar-nav">
        <NavLink to="/" end className={({isActive})=>isActive?'nav-item active':'nav-item'}>
          <span className="nav-icon">◉</span> Dashboard
        </NavLink>
        <NavLink to="/tasks" className={({isActive})=>isActive?'nav-item active':'nav-item'}>
          <span className="nav-icon">☰</span> All Tasks
        </NavLink>
        {can.admin && (
          <NavLink to="/admin" className={({isActive})=>isActive?'nav-item active':'nav-item'}>
            <span className="nav-icon">👤</span> Team
          </NavLink>
        )}
      </div>

      <div className="sidebar-section-label">Projects</div>
      <div className="sidebar-projects">
        {projects.map(p => (
          <NavLink key={p.id} to={`/project/${p.id}`}
            className={({isActive})=>isActive?'proj-item active':'proj-item'}>
            <span className="proj-dot" style={{background: STATE_COLORS[p.state]||'#B0A398'}}/>
            <span className="proj-name">{p.name}</span>
          </NavLink>
        ))}
      </div>

      {can.edit && (
        <button className="sidebar-new-project" onClick={()=>navigate('/')}>
          + New Project
        </button>
      )}

      <div className="sidebar-user">
        <div className="sidebar-avatar">{initials(user?.email)}</div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-email">{user?.email}</div>
          <div className="sidebar-user-role">{role}</div>
        </div>
        <button className="sidebar-signout" onClick={signOut} title="Sign out">⏻</button>
      </div>
    </aside>
  );
}
