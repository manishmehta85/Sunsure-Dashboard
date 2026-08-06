import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const STATES = ['Gujarat', 'Karnataka', 'Maharashtra', 'Rajasthan', 'Tamil Nadu', 'Uttar Pradesh',
  'Andhra Pradesh', 'Telangana', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Other'];

export default function ProjectModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', capacity: '', state: '', layout: 'normal' });
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
      layout: form.layout,           // 'normal' (tasks) or 'wind' (HOTO milestone tracker)
    });
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave();
  };

  const LAYOUTS = [
    { key: 'normal', title: 'Normal layout', desc: 'Task list with owners, priorities, dates & status.' },
    { key: 'wind',   title: 'Wind layout',   desc: 'WTG locations tracked across land/HOTO milestones.' },
  ];

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

          {/* Layout picker */}
          <div className="form-group">
            <label>Layout</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {LAYOUTS.map(l => {
                const active = form.layout === l.key;
                return (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => set('layout', l.key)}
                    style={{
                      flex: 1, textAlign: 'left', cursor: 'pointer',
                      border: `1.5px solid ${active ? 'var(--accent, #EA580C)' : 'var(--border, #ECE4DA)'}`,
                      background: active ? 'var(--accent-dim, #FBEADD)' : '#fff',
                      borderRadius: 10, padding: '12px 14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                      <span style={{
                        width: 14, height: 14, borderRadius: '50%', flex: '0 0 auto',
                        border: `4px solid ${active ? 'var(--accent, #EA580C)' : '#CBC3B8'}`,
                        background: '#fff', boxShadow: active ? 'inset 0 0 0 2px #fff' : 'none',
                      }} />
                      {l.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text2, #7A7268)', marginTop: 4, paddingLeft: 22 }}>{l.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label>Project Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder={form.layout === 'wind' ? 'e.g. KA- Bijapur 300 MW' : 'e.g. MH- Pune 200 MWp'} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Capacity</label>
              <input value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 300 MW" />
            </div>
            <div className="form-group">
              <label>State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)}>
                <option value="">Select state...</option>
                {STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {form.layout === 'wind' && (
            <div style={{ fontSize: 12, color: 'var(--text2, #7A7268)', background: '#FBF7F1', border: '1px solid #ECE4DA', borderRadius: 8, padding: '10px 12px' }}>
              A Wind project opens the HOTO milestone tracker. It starts empty — open it and use
              <b> Import CSV/JSON</b> to load this farm’s WTG list (or run the seed for the default Bijapur project).
            </div>
          )}
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
