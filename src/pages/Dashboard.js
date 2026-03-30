import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ToastContext } from '../App';
import { useAuth } from '../lib/AuthContext';
import ProjectModal from '../components/ProjectModal';
import './Dashboard.css';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const { can } = useAuth();

  const load = async () => {
    const { data: projs } = await supabase.from('projects').select('*').order('name');
    const { data: tasks } = await supabase.from('tasks').select('project_id,status,target_date');
    const today = new Date().toISOString().split('T')[0];
    const s = {};
    (tasks || []).forEach(t => {
      if (!s[t.project_id]) s[t.project_id] = { total: 0, completed: 0, inprogress: 0, overdue: 0 };
      s[t.project_id].total++;
      if (t.status === 'Completed') s[t.project_id].completed++;
      if (t.status === 'In Progress') s[t.project_id].inprogress++;
      if (t.status !== 'Completed' && t.target_date && t.target_date < today) s[t.project_id].overdue++;
    });
    setStats(s);
    setProjects(projs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total_tasks = Object.values(stats).reduce((a, b) => a + b.total, 0);
  const total_done = Object.values(stats).reduce((a, b) => a + b.completed, 0);
  const total_overdue = Object.values(stats).reduce((a, b) => a + b.overdue, 0);

  const stateColors = {
    'Gujarat': '#f5a623', 'Karnataka': '#36c98e', 'Maharashtra': '#4f8ef7',
    'Rajasthan': '#f05c5c', 'Tamil Nadu': '#a78bfa', 'Uttar Pradesh': '#36c9c9',
  };

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Overview of all solar projects</p>
        </div>
        {can.admin && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Project</button>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Projects</div>
          <div className="stat-value">{projects.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value">{total_tasks}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Completed</div>
          <div className="stat-value" style={{ color: 'var(--green)' }}>{total_done}</div>
          <div className="stat-pct">{total_tasks ? Math.round(total_done / total_tasks * 100) : 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Overdue</div>
          <div className="stat-value" style={{ color: 'var(--red)' }}>{total_overdue}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : (
        <div className="project-grid">
          {projects.map(p => {
            const s = stats[p.id] || { total: 0, completed: 0, inprogress: 0, overdue: 0 };
            const pct = s.total ? Math.round(s.completed / s.total * 100) : 0;
            return (
              <div key={p.id} className="project-card" onClick={() => navigate(`/project/${p.id}`)}>
                <div className="project-card-header">
                  <div className="project-card-dot" style={{ background: stateColors[p.state] || '#555' }} />
                  <div>
                    <div className="project-card-name">{p.name}</div>
                    <div className="project-card-meta">{[p.capacity, p.state].filter(Boolean).join(' · ')}</div>
                  </div>
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: pct + '%' }} />
                  </div>
                  <span className="progress-pct">{pct}%</span>
                </div>
                <div className="project-card-stats">
                  <span>{s.total} tasks</span>
                  <span style={{ color: 'var(--green)' }}>{s.completed} done</span>
                  {s.overdue > 0 && <span style={{ color: 'var(--red)' }}>{s.overdue} overdue</span>}
                  {s.inprogress > 0 && <span style={{ color: 'var(--accent)' }}>{s.inprogress} active</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && can.admin && (
        <ProjectModal onClose={() => setShowModal(false)} onSave={() => { load(); showToast('Project created!'); setShowModal(false); }} />
      )}
    </div>
  );
}
