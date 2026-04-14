import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Phone, MapPin, Edit2, Trash2, Plus, CheckSquare, FileText, Activity, Calendar, User, AlertTriangle, X } from 'lucide-react';
import LeadModal from '../components/LeadModal';

const STATUSES = ['New Lead','Post-Appointment','Under Contract','Closed','Dead'];
const PRIORITIES = ['Low','Medium','High'];
const FU_OPTIONS = [
  { label: 'Today', days: 0 },{ label: '1 Week', days: 7 },
  { label: 'Tomorrow', days: 1 },{ label: '2 Weeks', days: 14 },
  { label: '2 Days', days: 2 },{ label: '3 Weeks', days: 21 },
  { label: '3 Days', days: 3 },{ label: '1 Month', days: 30 },
  { label: '4 Days', days: 4 },{ label: '2 Months', days: 60 },
  { label: '5 Days', days: 5 },{ label: '3 Months', days: 90 },
];

const getStatusClass = (s) => {
  const map = { 'New Lead':'status-new','Post-Appointment':'status-warm','Under Contract':'status-under-contract','Closed':'status-closed','Dead':'status-dead' };
  return map[s] || 'status-new';
};

const fmt$ = (n) => n ? '$' + Number(n).toLocaleString() : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : 'Unknown';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' }) : '';
const isOverdue = (d) => d && new Date(d) < new Date();

const InfoRow = ({ label, value, link }) => {
  if (!value) return null;
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
      <span style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>{label}</span>
      {link ? <a href={link} style={{ fontSize:13, color:'var(--accent2)', fontWeight:500, textAlign:'right' }}>{value}</a>
             : <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500, textAlign:'right', lineHeight:1.5 }}>{value}</span>}
    </div>
  );
};

const SectionHeading = ({ children }) => (
  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', letterSpacing:'0.07em', textTransform:'uppercase', margin:'14px 0 6px', paddingBottom:4, borderBottom:'2px solid var(--border)' }}>{children}</div>
);

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lead, setLead] = useState(null);
  const [tab, setTab] = useState('notes');
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFU, setSelectedFU] = useState(null);
  const [creatingFU, setCreatingFU] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title:'', description:'', due_date:'', priority:'Medium', assigned_to:'' });
  const [users, setUsers] = useState([]);
  const [editingTask, setEditingTask] = useState(null);

  const load = useCallback(async () => {
    try { const data = await api.getLead(id); setLead(data); }
    catch { navigate('/leads'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getUsers().catch(() => []).then(u => setUsers(u || [])); }, []);

  const handleStatusChange = async (status) => { await api.updateLead(id, { status }); setLead(l => ({ ...l, status })); };
  const handleAddNote = async (e) => {
    e.preventDefault(); if (!noteText.trim()) return; setAddingNote(true);
    try { const note = await api.addNote(id, { content: noteText }); setLead(l => ({ ...l, notes: [note, ...l.notes] })); setNoteText(''); }
    finally { setAddingNote(false); }
  };
  const handleDeleteNote = async (noteId) => { await api.deleteNote(id, noteId); setLead(l => ({ ...l, notes: l.notes.filter(n => n.id !== noteId) })); };
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
      setTaskForm({ title:'', description:'', due_date:'', priority:'Medium', assigned_to:'' });
      setShowTaskForm(false);
    } catch (err) { alert(err.message); }
  };
  const handleToggleTask = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    const updated = await api.updateTask(id, task.id, { status: newStatus });
    setLead(l => ({ ...l, tasks: l.tasks.map(t => t.id === task.id ? updated : t) }));
  };
  const handleDeleteTask = async (taskId) => { await api.deleteTask(id, taskId); setLead(l => ({ ...l, tasks: l.tasks.filter(t => t.id !== taskId) })); };
  const handleDeleteLead = async () => { await api.deleteLead(id); navigate('/leads'); };
  const startEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({ title: task.title, description: task.description || '', due_date: task.due_date ? task.due_date.slice(0,16) : '', priority: task.priority, assigned_to: task.assigned_to || '' });
    setShowTaskForm(true);
  };
  const handleCreateFU = async () => {
    if (selectedFU === null) return; setCreatingFU(true);
    try {
      const opt = FU_OPTIONS[selectedFU];
      const due = new Date(); due.setDate(due.getDate() + opt.days); due.setHours(9,0,0,0);
      const task = await api.addTask(id, { title: 'Follow-Up', due_date: due.toISOString(), priority: 'Medium' });
      setLead(l => ({ ...l, tasks: [...l.tasks, task] }));
      setTab('tasks'); setSelectedFU(null);
    } finally { setCreatingFU(false); }
  };

  if (loading) return <div style={{ padding:40, color:'var(--text3)' }}>Loading...</div>;
  if (!lead) return null;

  const ownerName = [lead.owner_first_name, lead.owner_last_name].filter(Boolean).join(' ') || 'Unknown Owner';
  const openTasks = lead.tasks?.filter(t => t.status !== 'Completed') || [];
  const doneTasks = lead.tasks?.filter(t => t.status === 'Completed') || [];
  const hasNumbers = lead.asking_price || lead.estimated_arv || lead.estimated_repair || lead.offer_price;
  const spread = lead.estimated_arv && lead.offer_price && lead.estimated_repair ? lead.estimated_arv - lead.offer_price - lead.estimated_repair : null;

  return (
    <div className="page">
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="btn-icon" onClick={() => navigate('/leads')}><ArrowLeft /></button>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:22, fontWeight:700 }}>{ownerName}</h1>
            <span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status}</span>
          </div>
          {lead.property_address && (
            <div style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text2)', fontSize:15, fontWeight:600, marginTop:4 }}>
              <MapPin size={14} style={{ color:'var(--accent)', flexShrink:0 }} />
              {lead.property_address}{lead.property_city ? ', '+lead.property_city : ''}{lead.property_state ? ', '+lead.property_state : ''} {lead.property_zip || ''}
            </div>
          )}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowEdit(true)}><Edit2 size={13}/> Edit</button>
          {user?.role === 'admin' && <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 size={13}/> Delete</button>}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:20, alignItems:'start' }}>

        {/* LEFT SIDEBAR */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Quick Follow-Up */}
          <div className="card">
            <div className="section-title">Quick Follow-Up Task</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:3, marginBottom:12 }}>
              {FU_OPTIONS.map((opt, i) => (
                <div key={opt.label}
                  onClick={() => setSelectedFU(selectedFU === i ? null : i)}
                  style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 8px', borderRadius:6, cursor:'pointer',
                    background: selectedFU === i ? 'var(--accent-dim)' : 'transparent', transition:'background 0.12s' }}>
                  <div style={{ width:15, height:15, borderRadius:3, border:`2px solid ${selectedFU === i ? 'var(--accent)' : 'var(--border2)'}`,
                    background: selectedFU === i ? 'var(--accent)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.12s' }}>
                    {selectedFU === i && <svg viewBox="0 0 12 12" width="8" height="8" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                  </div>
                  <span style={{ fontSize:12, color: selectedFU === i ? 'var(--accent2)' : 'var(--text2)', fontWeight: selectedFU === i ? 600 : 400 }}>{opt.label}</span>
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent:'center', opacity: selectedFU === null ? 0.5 : 1 }}
              disabled={selectedFU === null || creatingFU} onClick={handleCreateFU}>
              <Plus size={14}/> {creatingFU ? 'Creating...' : 'Create Follow-Up'}
            </button>
          </div>

          {/* Combined Lead Info */}
          <div className="card">
            <div className="section-title">Lead Info</div>

            <SectionHeading>Contact</SectionHeading>
            <InfoRow label="Name" value={ownerName !== 'Unknown Owner' ? ownerName : null} />
            {[lead.owner_phone, lead.owner_phone2, lead.owner_phone3].filter(Boolean).map((ph, i) => (
              <InfoRow key={i} label={i === 0 ? 'Phone' : `Phone ${i+1}`} value={ph} link={`tel:${ph}`} />
            ))}
            <InfoRow label="Email" value={lead.owner_email} link={lead.owner_email ? `mailto:${lead.owner_email}` : null} />
            {lead.owner_mailing_address && (
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
                <span style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>Mailing</span>
                <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500, textAlign:'right', lineHeight:1.6 }}>
                  {lead.owner_mailing_address}<br/>
                  {[lead.owner_mailing_city, lead.owner_mailing_state].filter(Boolean).join(', ')} {lead.owner_mailing_zip}
                </span>
              </div>
            )}

            <SectionHeading>Property</SectionHeading>
            {lead.property_address && (
              <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
                <span style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>Address</span>
                <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500, textAlign:'right', lineHeight:1.6 }}>
                  {lead.property_address}<br/>
                  {[lead.property_city, lead.property_state].filter(Boolean).join(', ')} {lead.property_zip}
                </span>
              </div>
            )}
            <InfoRow label="Type" value={lead.property_type} />
            {(lead.bedrooms || lead.bathrooms || lead.sqft) && (
              <InfoRow label="Bed / Bath / Sqft"
                value={[lead.bedrooms ? lead.bedrooms+'bd' : null, lead.bathrooms ? lead.bathrooms+'ba' : null, lead.sqft ? Number(lead.sqft).toLocaleString()+' sqft' : null].filter(Boolean).join(' · ')} />
            )}

            {hasNumbers && <>
              <SectionHeading>Deal Numbers</SectionHeading>
              <InfoRow label="Asking Price" value={fmt$(lead.asking_price)} />
              <InfoRow label="Est. ARV" value={fmt$(lead.estimated_arv)} />
              <InfoRow label="Est. Repairs" value={fmt$(lead.estimated_repair)} />
              <InfoRow label="Offer Price" value={fmt$(lead.offer_price)} />
              {spread !== null && (
                <div style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                  <span style={{ fontSize:12, color:'var(--text3)', fontWeight:600 }}>Est. Profit</span>
                  <span style={{ fontSize:14, fontWeight:700, color: spread >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt$(spread)}</span>
                </div>
              )}
            </>}

            <SectionHeading>Other</SectionHeading>
            <InfoRow label="Source" value={lead.source} />
            <InfoRow label="Campaign" value={lead.campaign} />
            <InfoRow label="List Name" value={lead.list_name} />
            <InfoRow label="Assigned To" value={lead.assigned_to_name} />
            <InfoRow label="Created" value={fmtDate(lead.created_at)} />
            {lead.motivation && (
              <div style={{ paddingTop:8 }}>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4 }}>Motivation</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>{lead.motivation}</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Main */}
        <div>
          {/* Status Bar */}
          <div style={{ display:'flex', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:16, border:'1px solid var(--border)', background:'var(--bg2)' }}>
            {STATUSES.map((s, i) => {
              const isActive = lead.status === s;
              const colors = {
                'New Lead': { bg: '#3b5bdb', text: '#fff' },
                'Post-Appointment': { bg: '#f59e0b', text: '#fff' },
                'Under Contract': { bg: '#7c3aed', text: '#fff' },
                'Closed': { bg: '#16a34a', text: '#fff' },
                'Dead': { bg: '#64748b', text: '#fff' },
              };
              const color = colors[s] || { bg: 'var(--bg3)', text: 'var(--text2)' };
              return (
                <button key={s} onClick={() => handleStatusChange(s)}
                  style={{
                    flex: 1, padding: '11px 4px', border: 'none', borderRight: i < STATUSES.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center', transition: 'all 0.15s', letterSpacing: '0.01em',
                    background: isActive ? color.bg : 'transparent',
                    color: isActive ? color.text : 'var(--text3)',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.target.style.background = 'var(--bg3)'; e.target.style.color = 'var(--text)'; }}}
                  onMouseLeave={e => { if (!isActive) { e.target.style.background = 'transparent'; e.target.style.color = 'var(--text3)'; }}}
                >{s}</button>
              );
            })}
          </div>

          <div className="card" style={{ padding:0 }}>
            <div style={{ padding:'0 20px' }}>
              <div className="tabs">
                {[{ id:'notes', label:`Notes (${lead.notes?.length||0})` },{ id:'tasks', label:`Tasks (${openTasks.length})` },{ id:'activity', label:'Activity' }].map(({ id:tid, label }) => (
                  <button key={tid} className={`tab ${tab===tid?'active':''}`} onClick={() => setTab(tid)}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ padding:'0 20px 20px' }}>

              {tab === 'notes' && <>
                <form onSubmit={handleAddNote} style={{ display:'flex', gap:8, marginBottom:16 }}>
                  <textarea className="form-input" style={{ flex:1, minHeight:72, resize:'vertical' }} value={noteText}
                    onChange={e => setNoteText(e.target.value)} placeholder="Add a note... (call notes, property condition, seller situation)" />
                  <button type="submit" className="btn btn-primary" disabled={addingNote || !noteText.trim()} style={{ alignSelf:'flex-end' }}>
                    <Plus size={14}/> Add
                  </button>
                </form>
                {lead.notes?.length === 0 && <div className="empty-state"><FileText /><p>No notes yet</p></div>}
                {lead.notes?.map(note => (
                  <div className="note-item" key={note.id}>
                    <div className="note-meta">
                      <span className="note-author">{note.author_name}</span>
                      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <span className="note-time">{fmtDateTime(note.created_at)}</span>
                        {(note.user_id === user.id || user.role === 'admin') && (
                          <button className="btn-icon" style={{ padding:3 }} onClick={() => handleDeleteNote(note.id)}><Trash2 style={{ width:12, height:12 }}/></button>
                        )}
                      </div>
                    </div>
                    <div className="note-content">{note.content}</div>
                  </div>
                ))}
              </>}

              {tab === 'tasks' && <>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowTaskForm(true); setEditingTask(null); setTaskForm({ title:'', description:'', due_date:'', priority:'Medium', assigned_to:'' }); }}>
                    <Plus size={13}/> Add Task
                  </button>
                </div>
                {showTaskForm && (
                  <div className="card" style={{ background:'var(--bg3)', marginBottom:14 }}>
                    <div style={{ fontWeight:600, fontSize:13, marginBottom:12 }}>{editingTask ? 'Edit Task' : 'New Task'}</div>
                    <form onSubmit={handleAddTask} style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      <div className="form-group"><label className="form-label">Title *</label>
                        <input className="form-input" value={taskForm.title} onChange={e => setTaskForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Follow up call" required autoFocus /></div>
                      <div className="grid grid-2" style={{ gap:10 }}>
                        <div className="form-group"><label className="form-label">Due Date</label>
                          <input className="form-input" type="datetime-local" value={taskForm.due_date} onChange={e => setTaskForm(f=>({...f,due_date:e.target.value}))} /></div>
                        <div className="form-group"><label className="form-label">Priority</label>
                          <select className="form-input" value={taskForm.priority} onChange={e => setTaskForm(f=>({...f,priority:e.target.value}))}>
                            {PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
                      </div>
                      <div className="form-group"><label className="form-label">Assign To</label>
                        <select className="form-input" value={taskForm.assigned_to} onChange={e => setTaskForm(f=>({...f,assigned_to:e.target.value}))}>
                          <option value="">Me</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                      <div className="form-group"><label className="form-label">Description</label>
                        <textarea className="form-input" rows={2} value={taskForm.description} onChange={e => setTaskForm(f=>({...f,description:e.target.value}))} placeholder="Optional details..." /></div>
                      <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>Cancel</button>
                        <button type="submit" className="btn btn-primary btn-sm">{editingTask ? 'Save' : 'Create Task'}</button>
                      </div>
                    </form>
                  </div>
                )}
                {openTasks.length === 0 && !showTaskForm && <div className="empty-state"><CheckSquare /><p>No open tasks</p></div>}
                {openTasks.map(task => (
                  <div className="task-item" key={task.id}>
                    <div className={`task-checkbox ${task.status==='Completed'?'checked':''}`} onClick={() => handleToggleTask(task)}>
                      {task.status==='Completed' && <svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>}
                    </div>
                    <div className="task-info">
                      <div className="task-title">{task.title}</div>
                      {task.description && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{task.description}</div>}
                      <div className="task-meta">
                        {task.due_date && <span style={{ color: isOverdue(task.due_date) ? 'var(--red)' : 'var(--text3)' }}><Calendar />{isOverdue(task.due_date) && <AlertTriangle />}{fmtDate(task.due_date)}</span>}
                        <span style={{ color: task.priority==='High' ? 'var(--red)' : task.priority==='Medium' ? 'var(--yellow)' : 'var(--text3)' }}>{task.priority}</span>
                        {task.assigned_to_name && <span><User />{task.assigned_to_name}</span>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn-icon" style={{ padding:4 }} onClick={() => startEditTask(task)}><Edit2 style={{ width:12, height:12 }}/></button>
                      <button className="btn-icon" style={{ padding:4 }} onClick={() => handleDeleteTask(task.id)}><Trash2 style={{ width:12, height:12 }}/></button>
                    </div>
                  </div>
                ))}
                {doneTasks.length > 0 && <>
                  <div className="section-title" style={{ marginTop:16 }}>Completed ({doneTasks.length})</div>
                  {doneTasks.map(task => (
                    <div className="task-item completed" key={task.id}>
                      <div className="task-checkbox checked" onClick={() => handleToggleTask(task)}>
                        <svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <div className="task-info"><div className="task-title" style={{ textDecoration:'line-through' }}>{task.title}</div></div>
                      <button className="btn-icon" style={{ padding:4 }} onClick={() => handleDeleteTask(task.id)}><Trash2 style={{ width:12, height:12 }}/></button>
                    </div>
                  ))}
                </>}
              </>}

              {tab === 'activity' && <>
                {lead.activities?.length === 0 && <div className="empty-state"><Activity /><p>No activity yet</p></div>}
                {lead.activities?.map(a => (
                  <div className="activity-item" key={a.id}>
                    <div className="activity-icon"><Activity /></div>
                    <div>
                      <div className="activity-text">{a.description} {a.user_name && <span style={{ color:'var(--text3)', fontSize:12 }}>by {a.user_name}</span>}</div>
                      <div className="activity-time">{fmtDateTime(a.created_at)}</div>
                    </div>
                  </div>
                ))}
              </>}
            </div>
          </div>
        </div>
      </div>

      {showEdit && <LeadModal lead={lead} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load(); }} />}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowDeleteConfirm(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color:'var(--red)' }}>Delete Lead</h2>
              <button className="btn-icon" onClick={() => setShowDeleteConfirm(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <p style={{ color:'var(--text2)' }}>Are you sure you want to delete <strong>{ownerName}</strong>? This will permanently delete all notes, tasks, and activity. This cannot be undone.</p>
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
