import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ToastContext } from '../App';
import { format, parseISO } from 'date-fns';
import './AdminPanel.css';

const ROLE_BADGE = { admin:'badge-orange', editor:'badge-blue', viewer:'badge-gray' };

export default function AdminPanel() {
  const { can } = useAuth();
  const showToast = useContext(ToastContext);
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [form, setForm]         = useState({ email:'', name:'', password:'', role:'viewer' });
  const [formError, setFormError] = useState('');

  const load = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateRole = async (id, newRole) => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: newRole })
      .eq('id', id);
    if (error) { showToast('Failed to update role', 'error'); return; }
    showToast('Role updated!');
    load();
  };

  const addUser = async () => {
    setFormError('');
    if (!form.email.trim())    { setFormError('Email is required.'); return; }
    if (!form.password.trim()) { setFormError('Password is required.'); return; }
    setInviting(true);
    try {
      const { error } = await supabase.from('user_roles').insert({
        email:     form.email.trim().toLowerCase(),
        full_name: form.name || null,
        role:      form.role,
        password:  form.password,
        user_id:   crypto.randomUUID(),
      });
      if (error) throw error;
      showToast(`✓ ${form.email} added as ${form.role}`);
      setForm({ email:'', name:'', password:'', role:'viewer' });
      setShowInvite(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Failed to add user.');
    } finally {
      setInviting(false);
    }
  };

  if (!can.admin) return (
    <div style={{ padding:40, color:'var(--text2)', textAlign:'center' }}>
      You need admin access to view this page.
    </div>
  );

  return (
    <div className="admin-panel">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team Management</h1>
          <p className="page-sub">Add users and manage their access roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowInvite(true); setFormError(''); }}>
          + Add User
        </button>
      </div>

      <div className="role-legend">
        {[
          ['admin',  'badge-orange', 'Full access — create, edit, delete everything and manage team'],
          ['editor', 'badge-blue',   'Can add and edit tasks, post weekly updates. Cannot delete.'],
          ['viewer', 'badge-gray',   'Read-only — can view all projects and history. No edit controls.'],
        ].map(([r, b, desc]) => (
          <div key={r} className="role-card">
            <span className={`badge ${b}`}>{r}</span>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:60 }}><div className="spinner"/></div>
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
                  <td style={{ fontSize:12, color:'var(--text2)', fontFamily:'JetBrains Mono' }}>
                    {u.created_at ? format(parseISO(u.created_at), 'dd MMM yyyy') : '—'}
                  </td>
                  <td>
                    <select
                      value={u.role}
                      onChange={e => updateRole(u.id, e.target.value)}
                      style={{ width:'auto', minWidth:100 }}
                    >
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
              {formError && (
                <div style={{ background:'var(--red-lt)', color:'var(--red)', padding:'10px 14px', borderRadius:6, marginBottom:16, fontSize:13 }}>
                  ⚠ {formError}
                </div>
              )}
              <div className="form-group">
                <label>Full Name</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Aastha Bajaj"/>
              </div>
              <div className="form-group">
                <label>Email Address *</label>
                <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} placeholder="aastha@sunsure.com"/>
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input type="password" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="min 6 characters"/>
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.role} onChange={e => setForm(f=>({...f,role:e.target.value}))}>
                  <option value="viewer">viewer — read only</option>
                  <option value="editor">editor — can add and edit tasks</option>
                  <option value="admin">admin — full access</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addUser} disabled={inviting}>
                {inviting ? <span className="spinner"/> : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
