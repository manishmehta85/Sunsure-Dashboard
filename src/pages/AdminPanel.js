import React, { useEffect, useState, useContext } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ToastContext } from '../App';
import { format, parseISO } from 'date-fns';
import './AdminPanel.css';

const ROLE_BADGE = { admin:'badge-red', editor:'badge-blue', viewer:'badge-gray' };

export default function AdminPanel() {
  const { can } = useAuth();
  const showToast = useContext(ToastContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form, setForm] = useState({ email:'', name:'', password:'', role:'viewer' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    const { data, error } = await supabase.from('user_roles').select('*').order('created_at', { ascending: false });
    if (error) console.error('Load users error:', error);
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (userId, newRole) => {
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) { showToast('Failed to update role', 'error'); return; }
    showToast('Role updated!');
    load();
  };

  const inviteUser = async () => {
    setFormError('');
    if (!form.email.trim()) { setFormError('Email is required.'); return; }
    if (form.password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }

    setInviting(true);
    try {
      if (!supabaseAdmin) throw new Error('Admin client not configured. Add REACT_APP_SUPABASE_SERVICE_KEY to Vercel.');

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: form.email.trim(),
        password: form.password,
        email_confirm: true,
        user_metadata: { full_name: form.name },
      });
      if (error) throw error;

      // upsert role (trigger auto-creates a viewer row, we override it)
      await supabase.from('user_roles').upsert({
        user_id: data.user.id,
        email: form.email.trim(),
        full_name: form.name || null,
        role: form.role,
      }, { onConflict: 'user_id' });

      showToast(`✓ ${form.email} added as ${form.role}`);
      setForm({ email:'', name:'', password:'', role:'viewer' });
      setShowInvite(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Failed to create user.');
    } finally {
      setInviting(false);
    }
  };

  if (!can.admin) {
    return <div style={{ padding:40, color:'var(--text2)', textAlign:'center' }}>You need admin access to view this page.</div>;
  }

  return (
    <div className="admin-panel">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-sub">Add users and manage their access roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowInvite(true); setFormError(''); }}>+ Add User</button>
      </div>

      <div className="role-legend">
        {[
          ['admin',  'badge-red',  'Full access — create, edit, delete everything, manage team'],
          ['editor', 'badge-blue', 'Can add & edit tasks, post weekly updates. Cannot delete or manage users.'],
          ['viewer', 'badge-gray', 'Read-only — can view all projects and history, no edit controls shown.'],
        ].map(([r, b, desc]) => (
          <div key={r} className="role-card">
            <span className={`badge ${b}`}>{r}</span>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state"><p>No users yet. Click "+ Add User" to get started.</p></div>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Current Role</th>
                <th>Joined</th>
                <th>Change Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="user-name">{u.full_name || '—'}</div>
                    <div className="user-email">{u.email}</div>
                  </td>
                  <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                  <td style={{ fontSize:12, color:'var(--text2)', fontFamily:'DM Mono' }}>
                    {u.created_at ? format(parseISO(u.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <select value={u.role} onChange={e => updateRole(u.user_id, e.target.value)} style={{ width:'auto', minWidth:100 }}>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowInvite(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New User</h2>
              <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>✕</button>
            </div>
            <div className="modal-body">
              {formError && <div style={{ background:'var(--red-dim)', color:'var(--red)', padding:'10px 14px', borderRadius:6, marginBottom:16, fontSize:13 }}>⚠ {formError}</div>}
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))} placeholder="e.g. Aastha Bajaj" />
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))} placeholder="aastha@sunsure.com" />
              </div>
              <div className="form-group">
                <label>Password * (min 6 characters)</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password:e.target.value}))} placeholder="min 6 characters" />
                <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Share this with the user. They can change it after logging in via Supabase.</p>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm(f => ({...f, role:e.target.value}))}>
                  <option value="viewer">viewer — read only</option>
                  <option value="editor">editor — can add & edit tasks</option>
                  <option value="admin">admin — full access</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={inviteUser} disabled={inviting}>
                {inviting ? <span className="spinner" /> : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
