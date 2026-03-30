import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function TaskModal({ projectId, task, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    responsible: task?.responsible || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'Not Started',
    target_date: task?.target_date || '',
    revised_date: task?.revised_date || '',
    completed_on: task?.completed_on || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.title.trim()) { setError('Task title is required.'); return; }
    setSaving(true);
    const payload = { ...form, project_id: projectId };
    if (!payload.target_date) delete payload.target_date;
    if (!payload.revised_date) delete payload.revised_date;
    if (!payload.completed_on) delete payload.completed_on;

    let err;
    if (task) {
      ({ error: err } = await supabase.from('tasks').update(payload).eq('id', task.id));
    } else {
      ({ error: err } = await supabase.from('tasks').insert(payload));
    }
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>{error}</div>}

          <div className="form-group">
            <label>Task Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Describe the task..." />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Responsible</label>
              <input value={form.responsible} onChange={e => set('responsible', e.target.value)} placeholder="Owner name" />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Completed</option>
                <option>On Hold</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target Date</label>
              <input type="date" value={form.target_date} onChange={e => set('target_date', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Revised Date</label>
              <input type="date" value={form.revised_date} onChange={e => set('revised_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Completed On</label>
              <input type="date" value={form.completed_on} onChange={e => set('completed_on', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : task ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}
