import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Phone, MapPin, Edit2, Trash2, Plus, CheckSquare, FileText, Activity, Calendar, User, AlertTriangle, X, ThumbsUp, CornerDownRight, ChevronRight, Filter } from 'lucide-react';
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

const formatPhone = (val) => {
  const digits = val.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) return '';
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0,3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
};
const isValidPhone = (val) => val.replace(/\D/g, '').length === 10;
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
  <div style={{ fontSize:10, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', padding:'10px 0 4px', marginTop:4 }}>{children}</div>
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
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionPos, setMentionPos] = useState(0);
  const [mentions, setMentions] = useState([]);
  const noteRef = React.useRef(null);
  const [replyingTo, setReplyingTo] = useState(null); // noteId
  const [sideLeads, setSideLeads] = useState([]);
  const [sideUsers, setSideUsers] = useState([]);
  const [sideMember, setSideMember] = useState('');
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [sideSort, setSideSort] = useState('next_task_date');
  const [sideDir, setSideDir] = useState('asc');
  const [sideStatus, setSideStatus] = useState('');
  const [sideLoading, setSideLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title:'', description:'', due_date:'', priority:'Medium', assigned_to:'' });
  const [users, setUsers] = useState([]);
  const [editingTask, setEditingTask] = useState(null);
  const [propDetails, setPropDetails] = useState(null); // {bedrooms, bathrooms, sqft, lot_sqft, property_notes}
  const [savingProp, setSavingProp] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [pendingOwner, setPendingOwner] = useState(null);
  const [changingOwner, setChangingOwner] = useState(false);

  const handleChangeOwner = async () => {
    if (!pendingOwner) return;
    setChangingOwner(true);
    try {
      await api.updateLead(id, { assigned_to: pendingOwner.id });
      setLead(l => ({ ...l, assigned_to: pendingOwner.id, assigned_to_name: pendingOwner.name }));
      setShowOwnerModal(false);
      setPendingOwner(null);
    } catch (e) { console.error(e); }
    finally { setChangingOwner(false); }
  };

  const initPropDetails = (l) => ({
    bedrooms: l.bedrooms || '',
    bathrooms: l.bathrooms || '',
    sqft: l.sqft || '',
    lot_sqft: l.lot_sqft || '',
    property_notes: l.property_notes || '',
  });

  const load = useCallback(async () => {
    try { const data = await api.getLead(id); setLead(data); setPropDetails(initPropDetails(data)); }
    catch { navigate('/leads'); }
    finally { setLoading(false); }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getUsers().catch(() => []).then(u => { setUsers(u || []); setSideUsers(u || []); }); }, []);

  const getStatusColor = (s) => {
    const map = { 'New Lead':'var(--accent)','Post-Appointment':'#f59e0b','Under Contract':'var(--purple)','Closed':'var(--green)','Dead':'#64748b' };
    return map[s] || 'var(--accent)';
  };

  const fmtTaskDate = (d) => {
    if (!d) return null;
    const due = new Date(d);
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const color = due < today ? 'var(--red)' : due < tomorrow ? 'var(--green)' : 'var(--text3)';
    return { text: due.toLocaleDateString(), color };
  };

  const loadSideLeads = React.useCallback(async () => {
    setSideLoading(true);
    try {
      const data = await api.getLeads({
        limit: 100,
        sortBy: sideSort,
        sortDir: sideDir,
        ...(sideMember ? { assigned_to: sideMember } : {}),
        ...(sideStatus ? { status: sideStatus } : {}),
      });
      setSideLeads(data.leads || []);
    } catch(e) { console.error(e); }
    finally { setSideLoading(false); }
  }, [sideSort, sideDir, sideMember, sideStatus]);

  useEffect(() => { loadSideLeads(); }, [loadSideLeads]);

  const handleStatusChange = async (status) => {
    if (status === lead.status) return;
    setPendingStatus(status);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus) return;
    try {
      await api.updateLead(id, { status: pendingStatus });
      setLead(l => ({ ...l, status: pendingStatus }));
      // If marked dead, clear all tasks locally
      if (pendingStatus === 'Dead') {
        setLead(l => ({ ...l, tasks: l.tasks?.map(t => ({ ...t, status: 'Completed' })) || [] }));
      }
    } catch (e) { console.error(e); }
    finally { setPendingStatus(null); }
  };
  const handleSavePropDetails = async () => {
    setSavingProp(true);
    try {
      await api.updateLead(id, propDetails);
      setLead(l => ({ ...l, ...propDetails }));
    } finally { setSavingProp(false); }
  };
  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNoteText(val);
    const cursor = e.target.selectionStart;
    const textUpToCursor = val.slice(0, cursor);
    const atMatch = textUpToCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionSearch(atMatch[1].toLowerCase());
      setShowMentions(true);
      setMentionPos(cursor - atMatch[0].length);
    } else {
      setShowMentions(false);
    }
  };

  const handleSelectMention = (u) => {
    const before = noteText.slice(0, mentionPos);
    const after = noteText.slice(noteRef.current?.selectionStart || noteText.length);
    const atIndex = before.lastIndexOf('@');
    const newText = before.slice(0, atIndex) + `@${u.name} ` + after;
    setNoteText(newText);
    setShowMentions(false);
    setMentions(m => m.includes(u.id) ? m : [...m, u.id]);
    noteRef.current?.focus();
  };

  const handleAddNote = async (e) => {
    e.preventDefault(); if (!noteText.trim()) return; setAddingNote(true);
    try {
      const note = await api.addNote(id, { content: noteText, mentions });
      setLead(l => ({ ...l, notes: [note, ...l.notes] }));
      setNoteText('');
      setMentions([]);
    }
    finally { setAddingNote(false); }
  };
  const handleDeleteNote = async (noteId) => { await api.deleteNote(id, noteId); setLead(l => ({ ...l, notes: l.notes.filter(n => n.id !== noteId) })); };

  const handleLike = async (noteId) => {
    try {
      const res = await api.likeNote(id, noteId);
      setLead(l => ({ ...l, notes: l.notes.map(n => {
        if (n.id !== noteId) return n;
        const likes = n.likes || [];
        const liked = res.liked;
        const newLikes = liked
          ? [...likes, { user_id: user.id, user_name: user.name }]
          : likes.filter(lk => lk.user_id !== user.id);
        return { ...n, likes: newLikes, like_count: res.count };
      })}));
    } catch(e) { console.error(e); }
  };

  const handleReply = async (noteId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const reply = await api.replyNote(id, noteId, { content: replyText });
      setLead(l => ({ ...l, notes: l.notes.map(n => {
        if (n.id !== noteId) return n;
        return { ...n, replies: [...(n.replies || []), reply] };
      })}));
      setReplyText('');
      setReplyingTo(null);
    } catch(e) { console.error(e); }
    finally { setSubmittingReply(false); }
  };

  const handleDeleteReply = async (noteId, replyId) => {
    try {
      await api.deleteReply(id, noteId, replyId);
      setLead(l => ({ ...l, notes: l.notes.map(n => {
        if (n.id !== noteId) return n;
        return { ...n, replies: (n.replies || []).filter(r => r.id !== replyId) };
      })}));
    } catch(e) { console.error(e); }
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
    <div style={{ display:"flex", minHeight:"100vh", background:"var(--bg)", alignItems:"flex-start" }}>
    <div className="page" style={{ flex:1, minWidth:0, padding:"20px 20px 28px 28px" }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button className="btn-icon" onClick={() => navigate(-1)}><ArrowLeft /></button>
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

          {/* Lead Owner */}
          {(() => {
            const ownerName = lead.assigned_to_name || lead.created_by_name || 'Unassigned';
            return (
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>Lead Owner</span>
                <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--accent)', color:'white', fontSize:9, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {ownerName.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                  </div>
                  <span style={{ fontSize:13, fontWeight:600, color:'var(--text2)' }}>{ownerName}</span>
                  {user?.role === 'admin' && (
                    <button onClick={() => setShowOwnerModal(true)}
                      style={{ marginLeft:4, background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:'2px 4px', borderRadius:4, fontSize:11, display:'flex', alignItems:'center' }}
                      title="Change owner">
                      <Edit2 size={11} />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

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
            {propDetails && <>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:4, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                {[
                  { label:'Beds', key:'bedrooms', placeholder:'3' },
                  { label:'Baths', key:'bathrooms', placeholder:'2' },
                  { label:'Sqft', key:'sqft', placeholder:'1800' },
                  { label:'Lot Sqft', key:'lot_sqft', placeholder:'6000' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key} style={{ minWidth:0 }}>
                    <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3, whiteSpace:'nowrap' }}>{label}</div>
                    <input
                      className="form-input"
                      style={{ padding:'3px 6px', fontSize:12, width:'100%', minWidth:0 }}
                      type="number"
                      placeholder={placeholder}
                      value={propDetails[key]}
                      onChange={e => setPropDetails(p => ({ ...p, [key]: e.target.value }))}
                      onBlur={handleSavePropDetails}
                    />
                  </div>
                ))}
              </div>
              <div style={{ padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>Property Notes</div>
                <textarea
                  className="form-input"
                  style={{ fontSize:12, minHeight:110, resize:'vertical', width:'100%', boxSizing:'border-box' }}
                  placeholder="Condition, access notes, anything relevant..."
                  value={propDetails.property_notes}
                  onChange={e => setPropDetails(p => ({ ...p, property_notes: e.target.value }))}
                  onBlur={handleSavePropDetails}
                />
              </div>
            </>}

            {lead.properties?.length > 0 && <>
              {lead.properties.map((p, i) => (
                <div key={p.id} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--border)', gap:12 }}>
                  <span style={{ fontSize:12, color:'var(--text3)', flexShrink:0 }}>Property {i + 2}</span>
                  <span style={{ fontSize:13, color:'var(--text2)', fontWeight:500, textAlign:'right', lineHeight:1.5 }}>
                    {p.address}{p.city ? <><br/>{[p.city, p.state].filter(Boolean).join(', ')} {p.zip}</> : ''}
                  </span>
                </div>
              ))}
            </>}

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
          <div style={{ display:'flex', borderRadius:'var(--radius)', overflow:'hidden', marginBottom:12, border:'1px solid var(--border)', background:'var(--bg2)' }}>
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
                <button key={s} onClick={() => handleStatusChange(s)} disabled={lead.status === s}
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
                <form onSubmit={handleAddNote} style={{ display:'flex', gap:8, marginBottom:16, position:'relative' }}>
                  <div style={{ flex:1, position:'relative' }}>
                    <textarea
                      ref={noteRef}
                      className="form-input"
                      style={{ width:'100%', minHeight:72, resize:'vertical' }}
                      value={noteText}
                      onChange={handleNoteChange}
                      placeholder="Add a note... type @ to mention a teammate"
                    />
                    {showMentions && (() => {
                      const filtered = users.filter(u => u.name.toLowerCase().includes(mentionSearch));
                      return filtered.length > 0 ? (
                        <div style={{ position:'absolute', top:'100%', left:0, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, boxShadow:'var(--shadow)', zIndex:100, minWidth:180 }}>
                          {filtered.map(u => (
                            <div key={u.id} onMouseDown={() => handleSelectMention(u)}
                              style={{ padding:'8px 14px', cursor:'pointer', fontSize:13, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}
                              onMouseEnter={e => e.currentTarget.style.background='var(--bg3)'}
                              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                              <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent)', color:'white', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {u.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                              </div>
                              {u.name}
                            </div>
                          ))}
                        </div>
                      ) : null;
                    })()}
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={addingNote || !noteText.trim()} style={{ alignSelf:'flex-end' }}>
                    <Plus size={14}/> Add
                  </button>
                </form>
                {lead.notes?.length === 0 && <div className="empty-state"><FileText /><p>No notes yet</p></div>}
                {lead.notes?.map(note => {
                  const likedByMe = (note.likes || []).some(lk => lk.user_id === user.id);
                  const likeCount = parseInt(note.like_count || 0);
                  return (
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

                    {/* Like + Reply actions */}
                    <div style={{ display:'flex', gap:12, marginTop:8, alignItems:'center' }}>
                      <button
                        onClick={() => handleLike(note.id)}
                        style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer',
                          color: likedByMe ? 'var(--accent)' : 'var(--text3)', fontSize:12, fontWeight: likedByMe ? 700 : 400,
                          padding:'2px 6px', borderRadius:4, transition:'all 0.15s' }}
                        title={(note.likes||[]).map(l=>l.user_name).join(', ') || 'Like'}
                      >
                        <ThumbsUp size={12} fill={likedByMe ? 'var(--accent)' : 'none'} />
                        {likeCount > 0 && <span>{likeCount}</span>}
                      </button>
                      <button
                        onClick={() => { setReplyingTo(replyingTo === note.id ? null : note.id); setReplyText(''); }}
                        style={{ display:'flex', alignItems:'center', gap:4, background:'none', border:'none', cursor:'pointer',
                          color:'var(--text3)', fontSize:12, padding:'2px 6px', borderRadius:4 }}
                      >
                        <CornerDownRight size={12} /> Reply
                      </button>
                    </div>

                    {/* Replies */}
                    {(note.replies || []).length > 0 && (
                      <div style={{ marginTop:8, paddingLeft:16, borderLeft:'2px solid var(--border)' }}>
                        {(note.replies || []).map(reply => (
                          <div key={reply.id} style={{ marginBottom:8, padding:'8px 10px', background:'var(--bg)', borderRadius:6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
                              <span style={{ fontSize:12, fontWeight:600, color:'var(--accent2)' }}>{reply.author_name}</span>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:11, color:'var(--text3)' }}>{fmtDateTime(reply.created_at)}</span>
                                {(reply.user_id === user.id || user.role === 'admin') && (
                                  <button className="btn-icon" style={{ padding:2 }} onClick={() => handleDeleteReply(note.id, reply.id)}>
                                    <Trash2 style={{ width:11, height:11 }}/>
                                  </button>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize:13, color:'var(--text2)' }}>{reply.content}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply input */}
                    {replyingTo === note.id && (
                      <div style={{ marginTop:8, paddingLeft:16, borderLeft:'2px solid var(--accent)', display:'flex', gap:8 }}>
                        <textarea
                          className="form-input"
                          style={{ flex:1, minHeight:52, fontSize:13, resize:'none' }}
                          placeholder="Write a reply..."
                          value={replyText}
                          onChange={e => setReplyText(e.target.value)}
                          autoFocus
                        />
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          <button className="btn btn-primary btn-sm" disabled={!replyText.trim() || submittingReply} onClick={() => handleReply(note.id)}>
                            {submittingReply ? '...' : 'Reply'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setReplyingTo(null); setReplyText(''); }}>Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })}
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
                          <input className="form-input" type="date" value={taskForm.due_date ? taskForm.due_date.slice(0,10) : ''} onChange={e => setTaskForm(f=>({...f,due_date:e.target.value}))} /></div>
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

      {/* Change Owner Modal */}
      {showOwnerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowOwnerModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title">Change Lead Owner</h2>
              <button className="btn-icon" onClick={() => { setShowOwnerModal(false); setPendingOwner(null); }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color:'var(--text2)', marginBottom:16, fontSize:13 }}>Select a new owner for this lead:</p>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {users.map(u => (
                  <div key={u.id} onClick={() => setPendingOwner(u)}
                    style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:8, border:`2px solid ${pendingOwner?.id === u.id ? 'var(--accent)' : 'var(--border)'}`, cursor:'pointer', background: pendingOwner?.id === u.id ? 'var(--accent-dim)' : 'var(--bg3)', transition:'all 0.15s' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--accent)', color:'white', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {u.name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>{u.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{u.role === 'admin' ? 'Admin' : 'Member'}</div>
                    </div>
                    {pendingOwner?.id === u.id && <div style={{ marginLeft:'auto', width:16, height:16, borderRadius:'50%', background:'var(--accent)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <svg viewBox="0 0 12 12" width="9" height="9" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round"/></svg>
                    </div>}
                  </div>
                ))}
              </div>
              {pendingOwner && (
                <div style={{ marginTop:16, padding:'12px 14px', background:'var(--yellow-dim)', border:'1px solid var(--yellow)', borderRadius:8, fontSize:12, color:'var(--text2)' }}>
                  ⚠️ This will reassign the lead to <strong>{pendingOwner.name}</strong>. They will be able to view and manage it.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => { setShowOwnerModal(false); setPendingOwner(null); }}>Cancel</button>
              <button className="btn btn-primary" disabled={!pendingOwner || changingOwner} onClick={handleChangeOwner}>
                {changingOwner ? 'Saving...' : 'Confirm Change'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Confirmation */}
      {pendingStatus && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setPendingStatus(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2 className="modal-title" style={{ color: pendingStatus === 'Dead' ? 'var(--red)' : 'var(--text)' }}>
                {pendingStatus === 'Dead' ? '⚠️ Mark as Dead?' : 'Change Status?'}
              </h2>
              <button className="btn-icon" onClick={() => setPendingStatus(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>
                {pendingStatus === 'Dead'
                  ? <>You're about to mark <strong>{lead.owner_first_name} {lead.owner_last_name}</strong> as <strong>Dead</strong>.</>
                  : <>Change status from <strong>{lead.status}</strong> to <strong>{pendingStatus}</strong>?</>
                }
              </p>
              {pendingStatus === 'Dead' && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                  ⚠️ All open tasks on this lead will be marked as completed.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPendingStatus(null)}>Cancel</button>
              <button
                className="btn"
                style={{ background: pendingStatus === 'Dead' ? 'var(--red)' : 'var(--accent)', color: 'white' }}
                onClick={confirmStatusChange}
              >
                {pendingStatus === 'Dead' ? 'Yes, Mark as Dead' : `Move to ${pendingStatus}`}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Lead Navigator Sidebar */}
      <div style={{
        width: sideCollapsed ? 36 : 260, minWidth: sideCollapsed ? 36 : 260,
        background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, overflow: 'hidden',
        transition: 'width 0.2s, min-width 0.2s',
      }}>
        <div style={{ height: 60 }} />{/* spacer to align with status bar */}
        {/* Sidebar Header */}
        <div style={{ padding: '10px 8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setSideCollapsed(c => !c)}
            title={sideCollapsed ? 'Expand' : 'Collapse'}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer',
              padding: '3px 5px', color: 'var(--text3)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {sideCollapsed ? '»' : '«'}
          </button>
          {!sideCollapsed && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Lead Navigator</div>}
        </div>
        {!sideCollapsed && <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
          {/* Member filter - admin only */}
          {user?.role === 'admin' && (
            <select className="select-filter" value={sideMember} onChange={e => setSideMember(e.target.value)}
              style={{ width: '100%', fontSize: 12, marginBottom: 6 }}>
              <option value="">All Members</option>
              {sideUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          {/* Stage filter dropdown */}
          <select value={sideStatus} onChange={e => setSideStatus(e.target.value)}
            className="select-filter" style={{ width: '100%', fontSize: 11, marginBottom: 4 }}>
            <option value="">All Stages</option>
            {['New Lead','Post-Appointment','Under Contract','Closed','Dead'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {/* Next Task sort */}
          <button onClick={() => {
              setSideSort('next_task_date');
              setSideDir(d => d === 'asc' ? 'desc' : 'asc');
            }}
            style={{
              width: '100%', padding: '5px 8px', fontSize: 11, fontWeight: 600, border: '1px solid var(--border)',
              borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-body)',
              background: sideSort === 'next_task_date' ? 'var(--accent)' : 'var(--bg3)',
              color: sideSort === 'next_task_date' ? 'white' : 'var(--text3)',
              transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}>
            Next Task {sideDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>}

        {/* Lead List */}
        {!sideCollapsed && <div style={{ flex: 1, overflowY: 'auto' }}>
          {sideLoading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Loading...</div>}
          {!sideLoading && sideLeads.map(l => {
            const isActive = l.id === id;
            const taskDate = fmtTaskDate(l.next_task_date);
            return (
              <div key={l.id} onClick={() => navigate(`/leads/${l.id}`)}
                style={{
                  padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--accent2)' : 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.owner_first_name || ''} {l.owner_last_name || ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.property_address || 'No address'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 10,
                    background: `${getStatusColor(l.status)}20`, color: getStatusColor(l.status)
                  }}>{l.status}</span>
                  {taskDate && (
                    <span style={{ fontSize: 10, color: taskDate.color, fontWeight: 500 }}>
                      📅 {taskDate.text}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {!sideLoading && sideLeads.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No leads found</div>
          )}
        </div>}
      </div>
    </div>
  );
}
