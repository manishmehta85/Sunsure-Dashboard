import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ToastContext } from '../App';
import { useAuth } from '../lib/AuthContext';
import TaskModal from '../components/TaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { format, parseISO } from 'date-fns';
import './ProjectPage.css';

const STATUS_BADGE = {
  'Completed': 'badge-green', 'In Progress': 'badge-blue',
  'Not Started': 'badge-gray', 'On Hold': 'badge-amber',
};
const PRIORITY_BADGE = { High: 'badge-red', Medium: 'badge-amber', Low: 'badge-gray' };

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const showToast = useContext(ToastContext);
  const { can } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null);
  const [detailTask, setDetailTask] = useState(null);
  const [filter, setFilter] = useState('All');

  const load = async () => {
    const { data: proj } = await supabase.from('projects').select('*').eq('id', id).single();
    const { data: tks } = await supabase.from('tasks').select('*').eq('project_id', id).order('created_at', { ascending: false });
    setProject(proj);
    setTasks(tks || []);
    setLoading(false);
  };

  useEffect(() => { setLoading(true); load(); }, [id]);

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', taskId);
    showToast('Task deleted');
    load();
  };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = t => t.status !== 'Completed' && t.target_date && t.target_date < today;

  const filtered = filter === 'All' ? tasks
    : filter === 'Overdue' ? tasks.filter(isOverdue)
    : tasks.filter(t => t.status === filter);

  const stats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    inprogress: tasks.filter(t => t.status === 'In Progress').length,
    overdue: tasks.filter(isOverdue).length,
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><div className="spinner" /></div>;
  if (!project) return <div style={{ padding: 40, color: 'var(--text2)' }}>Project not found.</div>;

  return (
    <div className="project-page">
      <div className="page-header">
        <div>
          <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-sub">{[project.capacity, project.state].filter(Boolean).join(' · ')}</p>
        </div>
        {can.edit && (
          <button className="btn btn-primary" onClick={() => setTaskModal('new')}>+ Add Task</button>
        )}
      </div>

      <div className="proj-stat-row">
        {[['Total', stats.total, ''], ['Completed', stats.completed, 'var(--green)'],
          ['In Progress', stats.inprogress, 'var(--accent)'], ['Overdue', stats.overdue, 'var(--red)']].map(([l, v, c]) => (
          <div key={l} className="proj-stat">
            <div className="proj-stat-val" style={{ color: c || 'var(--text)' }}>{v}</div>
            <div className="proj-stat-label">{l}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        {['All', 'In Progress', 'Completed', 'On Hold', 'Not Started', 'Overdue'].map(f => (
          <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f}
            {f === 'Overdue' && stats.overdue > 0 && <span className="filter-badge">{stats.overdue}</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No tasks found. {filter === 'All' && can.edit && 'Click "+ Add Task" to get started.'}</p>
        </div>
      ) : (
        <div className="task-table-wrap">
          <table className="task-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Target Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id} className={isOverdue(t) ? 'row-overdue' : ''}>
                  <td>
                    <button className="task-title-btn" onClick={() => setDetailTask(t)}>{t.title}</button>
                    {isOverdue(t) && <span className="overdue-tag">Overdue</span>}
                  </td>
                  <td><span className="owner-chip">{t.responsible || '—'}</span></td>
                  <td><span className={`badge ${PRIORITY_BADGE[t.priority] || 'badge-gray'}`}>{t.priority}</span></td>
                  <td>
                    <span style={{ color: isOverdue(t) ? 'var(--red)' : 'var(--text2)', fontSize: 12, fontFamily: 'DM Mono' }}>
                      {t.target_date ? format(parseISO(t.target_date), 'dd MMM yy') : '—'}
                    </span>
                    {t.revised_date && (
                      <div style={{ fontSize: 11, color: 'var(--amber)', fontFamily: 'DM Mono' }}>
                        → {format(parseISO(t.revised_date), 'dd MMM yy')}
                      </div>
                    )}
                  </td>
                  <td><span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                  <td>
                    <div className="action-row">
                      <button className="action-btn" title="View History" onClick={() => setDetailTask(t)}>💬</button>
                      {can.edit && (
                        <button className="action-btn" title="Edit" onClick={() => setTaskModal(t)}>✏️</button>
                      )}
                      {can.admin && (
                        <button className="action-btn danger" title="Delete" onClick={() => deleteTask(t.id)}>🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {taskModal && can.edit && (
        <TaskModal
          projectId={id}
          task={taskModal === 'new' ? null : taskModal}
          onClose={() => setTaskModal(null)}
          onSave={() => { load(); showToast(taskModal === 'new' ? 'Task created!' : 'Task updated!'); setTaskModal(null); }}
        />
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
