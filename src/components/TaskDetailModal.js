import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { ToastContext } from '../App';
import { format, parseISO } from 'date-fns';
import './TaskDetailModal.css';

const STATUS_BADGE = {
  'Completed': 'badge-green', 'In Progress': 'badge-blue',
  'Not Started': 'badge-gray', 'On Hold': 'badge-amber',
};

export default function TaskDetailModal({ task, onClose, onUpdate }) {
  const [updates, setUpdates] = useState([]);
  const [remark, setRemark] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [newStatus, setNewStatus] = useState(task.status);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const showToast = useContext(ToastContext);

  const loadUpdates = async () => {
    const { data } = await supabase
      .from('task_updates')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false });
    setUpdates(data || []);
    setLoading(false);
  };

  useEffect(() => { loadUpdates(); }, [task.id]);

  const submit = async () => {
    if (!remark.trim()) return;
    setSaving(true);

    // Save update remark
    const { error: e1 } = await supabase.from('task_updates').insert({
      task_id: task.id,
      remark: remark.trim(),
      updated_by: updatedBy.trim() || null,
    });

    // Update task status if changed
    if (newStatus !== task.status) {
      await supabase.from('tasks').update({
        status: newStatus,
        completed_on: newStatus === 'Completed' ? new Date().toISOString().split('T')[0] : null,
      }).eq('id', task.id);
    }

    setSaving(false);
    if (e1) { showToast('Error saving update', 'error'); return; }
    showToast('Update added!');
    setRemark('');
    setUpdatedBy('');
    loadUpdates();
    if (newStatus !== task.status) onUpdate();
  };

  const deleteUpdate = async (id) => {
    await supabase.from('task_updates').delete().eq('id', id);
    loadUpdates();
  };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = task.status !== 'Completed' && task.target_date && task.target_date < today;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <span className={`badge ${STATUS_BADGE[task.status] || 'badge-gray'}`}>{task.status}</span>
              {isOverdue && <span className="badge badge-red">Overdue</span>}
              {task.priority && <span className="badge badge-gray">{task.priority}</span>}
            </div>
            <h2 style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>{task.title}</h2>
            <div style={{ display: 'flex', gap: 16, marginTop: 6, flexWrap: 'wrap' }}>
              {task.responsible && (
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>👤 {task.responsible}</span>
              )}
              {task.target_date && (
                <span style={{ fontSize: 12, color: isOverdue ? 'var(--red)' : 'var(--text2)', fontFamily: 'DM Mono' }}>
                  📅 {format(parseISO(task.target_date), 'dd MMM yyyy')}
                  {task.revised_date && ` → ${format(parseISO(task.revised_date), 'dd MMM yyyy')}`}
                </span>
              )}
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ flexShrink: 0 }}>✕</button>
        </div>

        <div className="detail-body">
          {/* Add Update Form */}
          <div className="update-form">
            <div className="update-form-title">Add Weekly Update</div>
            <textarea
              placeholder="What's the current status? What was done this week? Any blockers?"
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
            />
            <div className="update-form-row">
              <input
                placeholder="Your name (optional)"
                value={updatedBy}
                onChange={e => setUpdatedBy(e.target.value)}
                style={{ maxWidth: 200 }}
              />
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={saving || !remark.trim()}
              >
                {saving ? <span className="spinner" /> : '+ Post Update'}
              </button>
            </div>
          </div>

          {/* History Timeline */}
          <div className="timeline-section">
            <div className="timeline-label">Update History ({updates.length})</div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 30 }}><div className="spinner" /></div>
            ) : updates.length === 0 ? (
              <div className="no-updates">No updates yet. Add the first one above.</div>
            ) : (
              <div className="timeline">
                {updates.map((u, i) => (
                  <div key={u.id} className="tl-item">
                    <div className="tl-left">
                      <div className={`tl-dot ${i === 0 ? 'dot-latest' : ''}`} />
                      {i < updates.length - 1 && <div className="tl-line" />}
                    </div>
                    <div className="tl-content">
                      <div className="tl-meta">
                        <span className="tl-date">
                          {format(parseISO(u.created_at), 'dd MMM yyyy · HH:mm')}
                        </span>
                        {u.updated_by && <span className="tl-by">by {u.updated_by}</span>}
                        <button
                          className="tl-delete"
                          onClick={() => deleteUpdate(u.id)}
                          title="Delete update"
                        >✕</button>
                      </div>
                      <div className="tl-remark">{u.remark}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
