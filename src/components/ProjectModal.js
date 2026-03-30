import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const STATES = ['Gujarat', 'Karnataka', 'Maharashtra', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh',
  'Andhra Pradesh', 'Telangana', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Other'];

export default function ProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', capacity: '', state: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.name.trim()) { setError('Project name is required.'); return; }
    setSaving(true);
    const { error: err } = await supabase.from('projects').insert({
      name: form.name.trim(),
      capacity: form.capacity.trim() || null,
      state: form.state || null,
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>New Project</h2>
          <button className="btn btn-ghost" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ background: 'var(--red-dim)', color: 'var(--red)', padding: '10px 14px', borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label>Project Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. MH- Pune 200 MWp" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Capacity</label>
              <input value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 200 MWp" />
            </div>
            <div className="form-group">
              <label>State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">Select state...</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <span className="spinner" /> : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
