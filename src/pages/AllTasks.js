import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ToastContext } from '../App';
import TaskDetailModal from '../components/TaskDetailModal';
import { format, parseISO } from 'date-fns';
import './AllTasks.css';

const STATUS_BADGE = {
  'Completed': 'badge-green', 'In Progress': 'badge-blue',
  'Not Started': 'badge-gray', 'On Hold': 'badge-amber',
};

export default function AllTasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterOwner, setFilterOwner] = useState('');
  const [detailTask, setDetailTask] = useState(null);
  const showToast = useContext(ToastContext);
  const navigate = useNavigate();

  const load = async () => {
    const { data: tks } = await supabase.from('tasks').select('*').order('target_date', { ascending: true, nullsFirst: false });
    const { data: projs } = await supabase.from('projects').select('id,name');
    const projMap = {};
    (projs || []).forEach(p => { projMap[p.id] = p; });
    setProjects(projMap);
    setTasks(tks || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = t => t.status !== 'Completed' && t.target_date && t.target_date < today;

  const owners = [...new Set(tasks.map(t => t.responsible).filter(Boolean))].sort();
  const projectList = Object.values(projects).sort((a, b) => a.name.localeCompare(b.name));

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) &&
        !(t.responsible || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'Overdue' && !isOverdue(t)) return false;
    if (filterStatus && filterStatus !== 'Overdue' && t.status !== filterStatus) return false;
    if (filterProject && t.project_id !== filterProject) return false;
    if (filterOwner && t.responsible !== filterOwner) return false;
    return true;
  });

  const overdueCount = tasks.filter(isOverdue).length;

  return (
    <div className="all-tasks">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-sub">{tasks.length} tasks across all projects · {overdueCount} overdue</p>
        </div>
      </div>

      <div className="all-filters">
        <input
          placeholder="Search tasks or owner..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Not Started">Not Started</option>
          <option value="On Hold">On Hold</option>
          <option value="Overdue">Overdue</option>
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}>
          <option value="">All projects</option>
          {projectList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}>
          <option value="">All owners</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {(search || filterStatus || filterProject || filterOwner) && (
          <button className="btn btn-ghost" onClick={() => { setSearch(''); setFilterStatus(''); setFilterProject(''); setFilterOwner(''); }}>
            Clear
          </button>
        )}
      </div>

      <div className="result-count">{filtered.length} tasks</div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No tasks match your filters.</p></div>
      ) : (
        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Owner</th>
                <th>Target Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className={isOverdue(t) ? 'row-overdue' : ''}>
                  <td>
                    <button className="task-title-btn" onClick={() => setDetailTask(t)}>{t.title}</button>
                    {isOverdue(t) && <span className="overdue-tag">Overdue</span>}
                  </td>
                  <td>
                    <button className="project-link" onClick={() => navigate(`/project/${t.project_id}`)}>
                      {projects[t.project_id]?.name || '—'}
                    </button>
                  </td>
                  <td><span className="owner-chip">{t.responsible || '—'}</span></td>
                  <td>
                    <span style={{ fontSize: 12, fontFamily: 'DM Mono', color: isOverdue(t) ? 'var(--red)' : 'var(--text2)' }}>
                      {t.target_date ? format(parseISO(t.target_date), 'dd MMM yy') : '—'}
                    </span>
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                  <td>
                    <button className="action-btn" onClick={() => setDetailTask(t)}>💬 History</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detailTask && (
        <TaskDetailModal
          task={detailTask}
          onClose={() => setDetailTask(null)}
          onUpdate={() => { load(); setDetailTask(null); }}
        />
      )}
    </div>
  );
}
