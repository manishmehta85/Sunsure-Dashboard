import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ToastContext } from '../App';
import { useAuth } from '../lib/AuthContext';
import ProjectModal from '../components/ProjectModal';
import { exportToExcel } from '../lib/exportExcel';
import { format, parseISO } from 'date-fns';
import './Dashboard.css';

const STATE_COLORS = {
  'Gujarat':'#F59E0B','Karnataka':'#16A34A','Maharashtra':'#2563EB',
  'Rajasthan':'#DC2626','Tamil Nadu':'#7C3AED','Uttar Pradesh':'#0891B2',
};

export default function Dashboard() {
  const [projects, setProjects]     = useState([]);
  const [stats, setStats]           = useState({});
  const [overdue, setOverdue]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [exporting, setExporting]   = useState(false);
  const navigate  = useNavigate();
  const showToast = useContext(ToastContext);
  const { can }   = useAuth();

  const load = async () => {
    const { data: projs } = await supabase.from('projects').select('*').order('name');
    const { data: tasks } = await supabase.from('tasks').select('*');
    const today = new Date().toISOString().split('T')[0];
    const s = {};
    const od = [];
    (tasks||[]).forEach(t => {
      if (!s[t.project_id]) s[t.project_id] = {total:0,completed:0,inprogress:0,overdue:0};
      s[t.project_id].total++;
      if (t.status==='Completed') s[t.project_id].completed++;
      if (t.status==='In Progress') s[t.project_id].inprogress++;
      if (t.status!=='Completed' && t.target_date && t.target_date < today) {
        s[t.project_id].overdue++;
        od.push(t);
      }
    });
    od.sort((a,b) => a.target_date > b.target_date ? 1:-1);
    setStats(s); setProjects(projs||[]); setOverdue(od.slice(0,8)); setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const fileName = await exportToExcel();
      showToast(`✓ Downloaded ${fileName}`);
    } catch (err) {
      showToast('Export failed: ' + err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  const deleteProject = async (e, id, name) => {
    e.stopPropagation();
    if (!window.confirm(`Delete project "${name}" and all its tasks?`)) return;
    await supabase.from('projects').delete().eq('id', id);
    showToast('Project deleted');
    load();
  };

  const projMap = {};
  projects.forEach(p => { projMap[p.id] = p; });
  const total_tasks   = Object.values(stats).reduce((a,b)=>a+b.total,0);
  const total_done    = Object.values(stats).reduce((a,b)=>a+b.completed,0);
  const total_overdue = Object.values(stats).reduce((a,b)=>a+b.overdue,0);
  const STATUS_BADGE   = {'Completed':'badge-green','In Progress':'badge-blue','Not Started':'badge-gray','On Hold':'badge-amber'};
  const PRIORITY_BADGE = {High:'badge-red',Medium:'badge-amber',Low:'badge-gray'};

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">{projects.length} solar projects · 6 states · {new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p>
        </div>
        <div style={{display:'flex',gap:10}}>
          <button
            className="btn btn-ghost"
            onClick={handleExport}
            disabled={exporting}
            title="Download Excel backup"
          >
            {exporting
              ? <><span className="spinner" style={{width:13,height:13,borderWidth:2}}/> Exporting…</>
              : <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3M2 10v2a1 1 0 001 1h8a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Export Excel
                </>
            }
          </button>
          {can.admin && (
            <button className="btn btn-primary" onClick={()=>setShowModal(true)}>+ New Project</button>
          )}
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-card orange">
          <div className="stat-label">Total Projects</div>
          <div className="stat-value orange">{projects.length}</div>
          <div className="stat-sub">across 6 states</div>
          <div className="stat-pill orange">● Active</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Total Tasks</div>
          <div className="stat-value dark">{total_tasks}</div>
          <div className="stat-sub">{Object.values(stats).reduce((a,b)=>a+b.inprogress,0)} in progress</div>
          <div className="stat-pill blue">● In progress</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Completed</div>
          <div className="stat-value green">{total_done}</div>
          <div className="stat-sub">{total_tasks ? Math.round(total_done/total_tasks*100) : 0}% completion rate</div>
          <div className="stat-pill green">↑ On track</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Overdue</div>
          <div className="stat-value red">{total_overdue}</div>
          <div className="stat-sub">needs immediate action</div>
          <div className="stat-pill red">⚠ Attention needed</div>
        </div>
      </div>

      <div className="section-header">
        <div className="section-title">Project overview</div>
        <div className="section-link" onClick={()=>navigate('/tasks')}>View all tasks →</div>
      </div>

      {loading ? (
        <div style={{textAlign:'center',padding:60}}><div className="spinner"/></div>
      ) : (
        <div className="project-grid">
          {projects.map(p => {
            const s = stats[p.id]||{total:0,completed:0,inprogress:0,overdue:0};
            const pct = s.total ? Math.round(s.completed/s.total*100) : 0;
            const color = STATE_COLORS[p.state]||'var(--orange)';
            return (
              <div key={p.id} className="project-card" onClick={()=>navigate(`/project/${p.id}`)}>
                <div className="project-card-header">
                  <div className="project-card-dot" style={{background:color}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="project-card-name">{p.name}</div>
                    <div className="project-card-meta">{[p.capacity,p.state].filter(Boolean).join(' · ')}</div>
                  </div>
                  {can.admin && (
                    <button className="action-btn danger" title="Delete project"
                      onClick={e=>deleteProject(e,p.id,p.name)}
                      style={{fontSize:12,padding:'3px 7px',marginLeft:6,flexShrink:0}}>
                      🗑
                    </button>
                  )}
                </div>
                <div className="progress-bar-wrap">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width:pct+'%',background:color}}/>
                  </div>
                  <span className="progress-pct">{pct}%</span>
                </div>
                <div className="project-card-stats">
                  <span>{s.total} tasks</span>
                  <span className="g">{s.completed} done</span>
                  {s.overdue>0 && <span className="r">{s.overdue} overdue</span>}
                  {s.inprogress>0 && <span className="b">{s.inprogress} active</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {overdue.length > 0 && (
        <>
          <div className="section-header" style={{marginTop:28}}>
            <div className="section-title">Overdue tasks — immediate attention needed</div>
            <div className="section-link" onClick={()=>navigate('/tasks')}>View all {total_overdue} →</div>
          </div>
          <div className="overdue-table-wrap">
            <table className="overdue-table">
              <thead>
                <tr><th>Task</th><th>Project</th><th>Owner</th><th>Target Date</th><th>Status</th><th>Priority</th></tr>
              </thead>
              <tbody>
                {overdue.map(t => (
                  <tr key={t.id} style={{cursor:'pointer'}} onClick={()=>navigate(`/project/${t.project_id}`)}>
                    <td><div className="od-title">{t.title.length>55?t.title.slice(0,55)+'…':t.title}</div></td>
                    <td><div className="od-project">{projMap[t.project_id]?.name||'—'}</div></td>
                    <td><span className="owner-chip">{t.responsible||'—'}</span></td>
                    <td><span className="od-date">{t.target_date?format(parseISO(t.target_date),'dd MMM yy'):'—'}</span></td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]||'badge-gray'}`}>{t.status}</span></td>
                    <td><span className={`badge ${PRIORITY_BADGE[t.priority]||'badge-gray'}`}>{t.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showModal && can.admin && (
        <ProjectModal onClose={()=>setShowModal(false)}
          onSave={()=>{ load(); showToast('Project created!'); setShowModal(false); }}/>
      )}
    </div>
  );
}
