import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, MapPin, User, AlertTriangle, CheckSquare } from 'lucide-react';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null;
const isOverdue = (d) => d && new Date(d) < new Date();
const isSoon = (d) => {
  if (!d) return false;
  const diff = new Date(d) - new Date();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
};

export default function Tasks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [users, setUsers] = useState([]);
  const [memberFilter, setMemberFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllTasks(user?.role === 'admin' && memberFilter ? { assigned_to: memberFilter } : {});
      setTasks(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, memberFilter]);
  useEffect(() => { if (user?.role === 'admin') { api.getUsers().then(setUsers).catch(() => {}); } }, [user]);

  const handleToggle = async (task) => {
    const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    await api.updateTask(task.lead_id, task.id, { status: newStatus });
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
  };

  const filtered = tasks.filter(t => {
    if (filter === 'pending') return t.status !== 'Completed';
    if (filter === 'completed') return t.status === 'Completed';
    if (filter === 'overdue') return t.status !== 'Completed' && isOverdue(t.due_date);
    if (filter === 'soon') return t.status !== 'Completed' && isSoon(t.due_date);
    return true;
  });

  const pendingCount = tasks.filter(t => t.status !== 'Completed').length;
  const overdueCount = tasks.filter(t => t.status !== 'Completed' && isOverdue(t.due_date)).length;
  const soonCount = tasks.filter(t => t.status !== 'Completed' && isSoon(t.due_date)).length;

  const grouped = {};
  filtered.forEach(task => {
    const key = task.property_address || `${task.owner_first_name || ''} ${task.owner_last_name || ''}`.trim() || 'Unlinked';
    if (!grouped[key]) grouped[key] = { leadId: task.lead_id, tasks: [] };
    grouped[key].tasks.push(task);
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tasks</h1>
          <p className="page-subtitle">{pendingCount} open task{pendingCount !== 1 ? 's' : ''}{overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}</p>
        </div>
      </div>

      {/* Member filter for admins */}
      {user?.role === 'admin' && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <select className="select-filter" value={memberFilter} onChange={e => { setMemberFilter(e.target.value); }} style={{ minWidth: 180 }}>
            <option value="">All Members</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          {memberFilter && <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            Showing tasks for {users.find(u => u.id === memberFilter)?.name}
          </span>}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Open Tasks', count: pendingCount, color: 'var(--accent)', filter: 'pending' },
          { label: 'Overdue', count: overdueCount, color: 'var(--red)', filter: 'overdue' },
          { label: 'Due Soon (3d)', count: soonCount, color: 'var(--yellow)', filter: 'soon' },
          { label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length, color: 'var(--green)', filter: 'completed' },
        ].map(({ label, count, color, filter: f }) => (
          <div
            key={label}
            className="stat-card"
            style={{ cursor: 'pointer', border: filter === f ? `1px solid ${color}` : undefined, transition: 'all 0.15s' }}
            onClick={() => setFilter(f)}
          >
            <div className="stat-value" style={{ color }}>{count}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      {loading && <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>Loading...</div>}

      {!loading && filtered.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <CheckSquare />
            <p>{filter === 'overdue' ? 'No overdue tasks!' : filter === 'completed' ? 'No completed tasks yet.' : 'No tasks found.'}</p>
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([group, { leadId, tasks: groupTasks }]) => (
        <div className="card" key={group} style={{ marginBottom: 14 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, cursor: leadId ? 'pointer' : 'default' }}
            onClick={() => leadId && navigate(`/leads/${leadId}`)}
          >
            <MapPin size={13} style={{ color: 'var(--text3)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent2)' }}>{group}</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 2 }}>({groupTasks.length})</span>
          </div>

          {groupTasks.map(task => (
            <div className={`task-item ${task.status === 'Completed' ? 'completed' : ''}`} key={task.id}>
              <div
                className={`task-checkbox ${task.status === 'Completed' ? 'checked' : ''}`}
                onClick={() => handleToggle(task)}
              >
                {task.status === 'Completed' && (
                  <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <div className="task-info">
                <div className="task-title" style={task.status === 'Completed' ? { textDecoration: 'line-through' } : {}}>
                  {task.title}
                </div>
                {task.description && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{task.description}</div>}
                <div className="task-meta">
                  {task.due_date && (
                    <span style={{ color: isOverdue(task.due_date) && task.status !== 'Completed' ? 'var(--red)' : isSoon(task.due_date) ? 'var(--yellow)' : 'var(--text3)' }}>
                      <Calendar />
                      {isOverdue(task.due_date) && task.status !== 'Completed' && <AlertTriangle />}
                      {fmtDate(task.due_date)}
                    </span>
                  )}
                  <span style={{ color: task.priority === 'High' ? 'var(--red)' : task.priority === 'Medium' ? 'var(--yellow)' : 'var(--text3)' }}>
                    {task.priority} priority
                  </span>
                  {task.assigned_to_name && (
                    <span><User />{task.assigned_to_name}</span>
                  )}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate(`/leads/${task.lead_id}`)}
                style={{ fontSize: 11, whiteSpace: 'nowrap' }}
              >
                View Lead
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
