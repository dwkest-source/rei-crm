import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, X, Shield, User } from 'lucide-react';

export default function Team() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = () => api.getUsers().then(setUsers).catch(console.error);
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: 'user' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (editing) {
        const update = { name: form.name, role: form.role };
        if (form.password) update.password = form.password;
        await api.updateUser(editing.id, update);
      } else {
        if (!form.password) { setError('Password is required'); setLoading(false); return; }
        await api.createUser(form);
      }
      await load();
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteUser(id);
    await load();
    setDeleteConfirm(null);
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Team</h1>
          <p className="page-subtitle">Manage team members and their access</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Add Member
        </button>
      </div>

      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Members', value: users.length },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length },
          { label: 'Team Members', value: users.filter(u => u.role === 'user').length },
        ].map(({ label, value }) => (
          <div className="stat-card" key={label}>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Member Since</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ cursor: 'default' }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                        {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <span style={{ fontWeight: 600 }}>
                        {u.name} {u.id === me.id && <span style={{ fontSize: 11, color: 'var(--text3)' }}>(you)</span>}
                      </span>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: u.role === 'admin' ? 'var(--purple-dim)' : 'var(--bg4)',
                      color: u.role === 'admin' ? 'var(--purple)' : 'var(--text2)',
                    }}>
                      {u.role === 'admin' ? <Shield size={11} /> : <User size={11} />}
                      {u.role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text3)', fontSize: 13 }}>{fmtDate(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-icon" onClick={() => openEdit(u)}><Edit2 /></button>
                      {u.id !== me.id && (
                        <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => setDeleteConfirm(u)}><Trash2 /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">{editing ? 'Edit Member' : 'Add Team Member'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            {error && <div className="error-msg" style={{ margin: '0 24px 8px' }}>{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Jane Smith" required autoFocus />
                </div>
                {!editing && (
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="jane@yourbiz.com" required />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{editing ? 'New Password (leave blank to keep)' : 'Password'}</label>
                  <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" required={!editing} />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-input" value={form.role} onChange={e => setForm(f => ({...f, role: e.target.value}))}>
                    <option value="user">Member — can view and manage leads</option>
                    <option value="admin">Admin — full access + user management</option>
                  </select>
                </div>
                <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--text2)' }}>Member</strong> can add/edit leads, notes, tasks.<br />
                  <strong style={{ color: 'var(--text2)' }}>Admin</strong> can also manage team members and delete leads.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Saving...' : editing ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--red)' }}>Remove Member</h2>
              <button className="btn-icon" onClick={() => setDeleteConfirm(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)' }}>Remove <strong>{deleteConfirm.name}</strong> from the team? They will no longer be able to log in. Their leads, notes, and tasks will remain.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm.id)}>Remove Member</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
