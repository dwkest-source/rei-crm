import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Phone, Mail, MapPin, Edit2, Trash2, Plus, CheckSquare, FileText, Activity, DollarSign, Calendar, User, AlertTriangle } from 'lucide-react';
import LeadModal from '../components/LeadModal';

const STATUSES = ['New Lead','Contacted','Warm','Hot','Negotiating','Under Contract','Closed','Dead'];
const PRIORITIES = ['Low','Medium','High'];

const getStatusClass = (s) => {
  const map = { 'New Lead':'status-new','Contacted':'status-contacted','Warm':'status-warm','Hot':'status-hot','Negotiating':'status-negotiating','Under Contract':'status-under-contract','Closed':'status-closed','Dead':'status-dead' };
  return map[s] || 'status-new';
};

const fmt$ = (n) => n ? `$${Number(n).toLocaleString()}` : '—';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '—';
const isOverdue = (d) => d && new Date(d) < new Date();

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [tab, setTab] = useState('notes');
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notes
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Tasks
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', due_date: '', priority: 'Medium', assigned_to: '' });
  const [users, setUsers] = useState([]);
  const [editingTask, setEditingTask] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getLead(id);
      setLead(data);
    } catch { navigate('/leads'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getUsers().catch(() => []).then(u => setUsers(u || [])); }, []);

  const handleStatusChange = async (status) => {
    await api.updateLead(id, { status });
    setLead(l => ({ ...l, status }));
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setAddingNote(true);
    try {
      const note = await api.addNote(id, { content: noteText });
      setLead(l => ({ ...l, notes: [note, ...l.notes] }));
      setNoteText('');
    } finally { setAddingNote(false); }
  };

  const handleDeleteNote = async (noteId) => {
    await api.deleteNote(id, noteId);
    setLead(l => ({ ...l, notes: l.notes.filter(n => n.id !== noteId) }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const updated = await api.updateTask(id, editingTask.id, taskForm);
        setLead(l => ({ ...l, tasks: l.tasks.map(t => t.id === editingTask.id ? updated : t) }));
        setEditingTask(null);
      } else {
        const task = await api.addTask(id, taskForm);
        setLead(l => ({ ...l, tasks: [...l.tasks, task] }));
      }
      setTaskForm({ title: '', description: '', due_date: '', priority: 'Medium', assigned_to: '' });
      setShowTaskForm(false);
    } catch (err) { alert(err.message); }
  };

  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updated = await api.updateTask(id, task.id, { status: newStatus });
    setLead(l => ({ ...l, tasks: l.tasks.map(t => t.id === task.id ? updated : t) }));
  };

  const handleDeleteTask = async (taskId) => {
    await api.deleteTask(id, taskId);
    setLead(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== taskId) }));
  };

  const handleDeleteLead = async () => {
    await api.deleteLead(id);
    navigate('/leads');
  };

  const startEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title, description: task.description || '',
      due_date: task.due_date ? task.due_date.slice(0,16) : '',
      priority: task.priority, assigned_to: task.assigned_to || '',
    });
    setShowTaskForm(true);
  };

  if (loading) return <div style={{ padding: 40, color: 'var(--text3)' }}>Loading...</div>;
  if (!lead) return null;

  const ownerName = [lead.owner_first_name, lead.owner_last_name].filter(Boolean).join(' ') || 'Unknown Owner';
  const openTasks = lead.tasks?.filter(t => t.status !== 'Completed') || [];
  const doneTasks = lead.tasks?.filter(t => t.status === 'Completed') || [];

  const dealMetrics = [
    { label: 'Asking Price', value: fmt$(lead.asking_price) },
    { label: 'Estimated ARV', value: fmt$(lead.estimated_arv) },
    { label: 'Est. Repairs', value: fmt$(lead.estimated_repair) },
    { label: 'Offer Price', value: fmt$(lead.offer_price) },
  ];

  const hasNumbers = lead.asking_price || lead.estimated_arv || lead.estimated_repair || lead.offer_price;
  const spread = lead.estimated_arv && lead.offer_price && lead.estimated_repair
    ? lead.estimated_arv - lead.offer_price - lead.estimated_repair
    : null;

  return (
    <div className="page">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn-icon" onClick={() => navigate('/leads')}><ArrowLeft /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{ownerName}</h1>
            <span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status}</span>
          </div>
          {lead.property_address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text3)', fontSize: 13, marginTop: 3 }}>
              <MapPin size={12} />
              {lead.property_address}{lead.property_city ? `, ${lead.property_city}` : ''}{lead.property_state ? `, ${lead.property_state}` : ''} {lead.property_zip || ''}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}><Edit2 size={13} /> Edit</button>
          {user?.role === 'admin' && (
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 size={13} /> Delete</button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        {/* Left column */}
        <div>
          {/* Quick status change */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-title">Update Status</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`status-badge ${getStatusClass(s)}`}
                  style={{ cursor: 'pointer', border: lead.status === s ? '2px solid currentColor' : '2px solid transparent', opacity: lead.status === s ? 1 : 0.6, transition: 'all 0.15s' }}
                  onClick={() => handleStatusChange(s)}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Tabs: Notes / Tasks / Activity */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: '0 20px' }}>
              <div className="tabs">
                {[
                  { id: 'notes', label: `Notes (${lead.notes?.length || 0})`, icon: FileText },
                  { id: 'tasks', label: `Tasks (${openTasks.length})`, icon: CheckSquare },
                  { id: 'activity', label: 'Activity', icon: Activity },
                ].map(({ id: tid, label, icon: Icon }) => (
                  <button key={tid} className={`tab ${tab === tid ? 'active' : ''}`} onClick={() => setTab(tid)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              {/* NOTES */}
              {tab === 'notes' && (
                <>
                  <form onSubmit={handleAddNote} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <textarea
                      className="form-input"
                      style={{ flex: 1, minHeight: 72, resize: 'vertical' }}
                      value={noteText}
                      onChange={e => setNoteText(e.target.value)}
                      placeholder="Add a note... (call notes, property condition, seller situation)"
                    />
                    <button type="submit" className="btn btn-primary" disabled={addingNote || !noteText.trim()} style={{ alignSelf: 'flex-end' }}>
                      <Plus size={14} /> Add
                    </button>
                  </form>
                  {lead.notes?.length === 0 && <div className="empty-state"><FileText /><p>No notes yet</p></div>}
                  {lead.notes?.map(note => (
                    <div className="note-item" key={note.id}>
                      <div className="note-meta">
                        <span className="note-author">{note.author_name}</span>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span className="note-time">{fmtDateTime(note.created_at)}</span>
                          {(note.user_id === user.id || user.role === 'admin') && (
                            <button className="btn-icon" style={{ padding: 3 }} onClick={() => handleDeleteNote(note.id)}><Trash2 style={{ width: 12, height: 12 }} /></button>
                          )}
                        </div>
                      </div>
                      <div className="note-content">{note.content}</div>
                    </div>
                  ))}
                </>
              )}

              {/* TASKS */}
              {tab === 'tasks' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => { setShowTaskForm(true); setEditingTask(null); setTaskForm({ title:'', description:'', due_date:'', priority:'Medium', assigned_to:'' }); }}>
                      <Plus size={13} /> Add Task
                    </button>
                  </div>

                  {showTaskForm && (
                    <div className="card" style={{ background: 'var(--bg3)', marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>{editingTask ? 'Edit Task' : 'New Task'}</div>
                      <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div className="form-group">
                          <label className="form-label">Title *</label>
                          <input className="form-input" value={taskForm.title} onChange={e => setTaskForm(f => ({...f, title: e.target.value}))} placeholder="e.g. Follow up call" required autoFocus />
                        </div>
                        <div className="grid grid-2" style={{ gap: 10 }}>
                          <div className="form-group">
                            <label className="form-label">Due Date</label>
                            <input className="form-input" type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(f => ({...f, due_date: e.target.value}))} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Priority</label>
                            <select className="form-input" value={taskForm.priority} onChange={e => setTaskForm(f => ({...f, priority: e.target.value}))}>
                              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Assign To</label>
                          <select className="form-input" value={taskForm.assigned_to} onChange={e => setTaskForm(f => ({...f, assigned_to: e.target.value}))}>
                            <option value="">Me</option>
                            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Description</label>
                          <textarea className="form-input" rows={2} value={taskForm.description} onChange={e => setTaskForm(f => ({...f, description: e.target.value}))} placeholder="Optional details..." />
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>Cancel</button>
                          <button type="submit" className="btn btn-primary btn-sm">{editingTask ? 'Save' : 'Create Task'}</button>
                        </div>
                      </form>
                    </div>
                  )}

                  {openTasks.length === 0 && !showTaskForm && <div className="empty-state"><CheckSquare /><p>No open tasks</p></div>}
                  {openTasks.map(task => (
                    <div className="task-item" key={task.id}>
                      <div className={`task-checkbox ${task.status === 'Completed' ? 'checked' : ''}`} onClick={() => handleToggleTask(task)}>
                        {task.status === 'Completed' && <svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                      </div>
                      <div className="task-info">
                        <div className="task-title">{task.title}</div>
                        {task.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{task.description}</div>}
                        <div className="task-meta">
                          {task.due_date && (
                            <span style={{ color: isOverdue(task.due_date) ? 'var(--red)' : 'var(--text3)' }}>
                              <Calendar />{isOverdue(task.due_date) && <AlertTriangle />}{fmtDate(task.due_date)}
                            </span>
                          )}
                          <span style={{ color: task.priority === 'High' ? 'var(--red)' : task.priority === 'Medium' ? 'var(--yellow)' : 'var(--text3)' }}>
                            {task.priority}
                          </span>
                          {task.assigned_to_name && <span><User />{task.assigned_to_name}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn-icon" style={{ padding: 4 }} onClick={() => startEditTask(task)}><Edit2 style={{ width: 12, height: 12 }} /></button>
                        <button className="btn-icon" style={{ padding: 4 }} onClick={() => handleDeleteTask(task.id)}><Trash2 style={{ width: 12, height: 12 }} /></button>
                      </div>
                    </div>
                  ))}

                  {doneTasks.length > 0 && (
                    <>
                      <div className="section-title" style={{ marginTop: 16 }}>Completed ({doneTasks.length})</div>
                      {doneTasks.map(task => (
                        <div className="task-item completed" key={task.id}>
                          <div className="task-checkbox checked" onClick={() => handleToggleTask(task)}>
                            <svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                          </div>
                          <div className="task-info">
                            <div className="task-title" style={{ textDecoration: 'line-through' }}>{task.title}</div>
                          </div>
                          <button className="btn-icon" style={{ padding: 4 }} onClick={() => handleDeleteTask(task.id)}><Trash2 style={{ width: 12, height: 12 }} /></button>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* ACTIVITY */}
              {tab === 'activity' && (
                <>
                  {lead.activities?.length === 0 && <div className="empty-state"><Activity /><p>No activity yet</p></div>}
                  {lead.activities?.map(a => (
                    <div className="activity-item" key={a.id}>
                      <div className="activity-icon"><Activity /></div>
                      <div>
                        <div className="activity-text">{a.description} {a.user_name && <span style={{ color: 'var(--text3)', fontSize: 12 }}>by {a.user_name}</span>}</div>
                        <div className="activity-time">{fmtDateTime(a.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="detail-sidebar">
          {/* Quick Follow-Up */}
          <div className="card">
            <div className="section-title">Quick Follow-Up Task</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: '2 Days', days: 2 },
                { label: '3 Days', days: 3 },
                { label: '4 Days', days: 4 },
                { label: '5 Days', days: 5 },
                { label: '1 Week', days: 7 },
                { label: '2 Weeks', days: 14 },
                { label: '3 Weeks', days: 21 },
                { label: '1 Month', days: 30 },
                { label: '2 Months', days: 60 },
                { label: '3 Months', days: 90 },
                { label: '6 Months', days: 180 },
              ].map(({ label, days }) => {
                const due = new Date();
                due.setDate(due.getDate() + days);
                due.setHours(9, 0, 0, 0);
                return (
                  <button
                    key={label}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '4px 10px' }}
                    onClick={async () => {
                      const task = await api.addTask(id, {
                        title: 'Follow-Up',
                        due_date: due.toISOString(),
                        priority: 'Medium',
                      });
                      setLead(l => ({ ...l, tasks: [...l.tasks, task] }));
                      setTab('tasks');
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contact info */}
          <div className="card">
            <div className="section-title">Contact Info</div>
            {[lead.owner_phone, lead.owner_phone2, lead.owner_phone3].filter(Boolean).map((ph, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Phone size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <a href={`tel:${ph}`} style={{ color: 'var(--accent2)', fontSize: 14 }}>{ph}</a>
              </div>
            ))}
            {lead.owner_email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Mail size={13} style={{ color: 'var(--text3)', flexShrink: 0 }} />
                <a href={`mailto:${lead.owner_email}`} style={{ color: 'var(--accent2)', fontSize: 14 }}>{lead.owner_email}</a>
              </div>
            )}
            {lead.owner_mailing_address && (
              <div style={{ display: 'flex', gap: 8 }}>
                <MapPin size={13} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>
                  {lead.owner_mailing_address}<br />
                  {lead.owner_mailing_city}{lead.owner_mailing_state ? `, ${lead.owner_mailing_state}` : ''} {lead.owner_mailing_zip}
                </div>
              </div>
            )}
            {!lead.owner_phone && !lead.owner_phone2 && !lead.owner_phone3 && !lead.owner_email && !lead.owner_mailing_address && (
              <div style={{ color: 'var(--text3)', fontSize: 13 }}>No contact info yet</div>
            )}
          </div>

          {/* Deal Numbers */}
          {hasNumbers && (
            <div className="card">
              <div className="section-title">Deal Numbers</div>
              {dealMetrics.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-display)', fontSize: 14 }}>{value}</span>
                </div>
              ))}
              {spread !== null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Estimated Profit</span>
                  <span style={{ fontWeight: 700, color: spread >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-display)', fontSize: 15 }}>{fmt$(spread)}</span>
                </div>
              )}
            </div>
          )}

          {/* Lead Info */}
          <div className="card">
            <div className="section-title">Lead Info</div>
            {[
              { label: 'Source', value: lead.source },
              { label: 'Property Type', value: lead.property_type },
              { label: 'Campaign', value: lead.campaign },
              { label: 'List Name', value: lead.list_name },
              { label: 'Assigned To', value: lead.assigned_to_name },
              { label: 'Created', value: fmtDate(lead.created_at) },
            ].map(({ label, value }) => value ? (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>{value}</span>
              </div>
            ) : null)}
          </div>

          {/* Motivation */}
          {lead.motivation && (
            <div className="card">
              <div className="section-title">Seller Motivation</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>{lead.motivation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <LeadModal
          lead={lead}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load(); }}
        />
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDeleteConfirm(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: 'var(--red)' }}>Delete Lead</h2>
              <button className="btn-icon" onClick={() => setShowDeleteConfirm(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)' }}>Are you sure you want to delete <strong>{ownerName}</strong>? This will permanently delete all notes, tasks, and activity. This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDeleteLead}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
