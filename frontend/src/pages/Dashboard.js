import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users2, CheckSquare, AlertCircle, Plus, Clock } from 'lucide-react';

const STATUS_ORDER = ['New Lead','Post-Appointment','Under Contract','Closed','Dead'];

const getStatusClass = (s) => {
  const map = { 'New Lead': 'status-new', 'Post-Appointment': 'status-warm', 'Under Contract': 'status-under-contract', 'Closed': 'status-closed', 'Dead': 'status-dead' };
  return map[s] || 'status-new';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [dueTasks, setDueTasks] = useState([]);

  useEffect(() => {
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
    Promise.all([
      api.getStats(),
      api.getLeads({ limit: 8 }),
      api.getAllTasks({ status: 'Pending' }),
    ]).then(([s, l, t]) => {
      setStats(s);
      setRecentLeads(l.leads);
      // Filter for today's tasks (due today or overdue)
      const todays = t.filter(task => {
        if (!task.due_date) return false;
        const due = new Date(task.due_date);
        return due <= todayEnd;
      });
      setDueTasks(todays);
    }).catch(console.error);
  }, []);

  const totalLeads = stats?.byStatus?.reduce((a, b) => a + parseInt(b.count), 0) || 0;
  const closedLeads = stats?.byStatus?.find(s => s.status === 'Closed')?.count || 0;
  const now = new Date();
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const tasksToday = dueTasks.filter(t => { const d = new Date(t.due_date); return d >= now && d <= todayEnd; }).length;
  const overdueTasks = dueTasks.filter(t => new Date(t.due_date) < now).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good morning, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your pipeline today.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/leads')}>
          <Plus size={15} /> New Lead
        </button>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { label: 'Total Leads', value: totalLeads, icon: Users2, color: 'var(--accent)', onClick: () => navigate('/leads') },
          { label: 'Added (30 days)', value: stats?.last30Days || 0, icon: TrendingUp, color: 'var(--green)', onClick: () => navigate('/leads') },
          { label: "Today's Tasks", value: tasksToday, icon: Clock, color: 'var(--yellow)', onClick: () => navigate('/tasks') },
          { label: 'Overdue Tasks', value: overdueTasks, icon: AlertCircle, color: 'var(--red)', onClick: () => navigate('/tasks') },
        ].map(({ label, value, icon: Icon, color, onClick }) => (
          <div className="stat-card" key={label} onClick={onClick}
            style={{ cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
            <div className="stat-value">{value}</div>
            <div className="stat-label">{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="section-title">Pipeline by Status</div>
          {STATUS_ORDER.map(status => {
            const item = stats?.byStatus?.find(s => s.status === status);
            const count = parseInt(item?.count || 0);
            const pct = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}
                onClick={() => navigate('/leads')}>
                <span className={`status-badge ${getStatusClass(status)}`} style={{ width: 150, justifyContent: 'center' }}>{status}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <span style={{ width: 28, textAlign: 'right', fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-2">
        {/* Recent leads */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>Recent Leads</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/leads')}>View all</button>
          </div>
          {recentLeads.length === 0 && <div className="empty-state"><p>No leads yet</p></div>}
          {recentLeads.map(lead => (
            <div key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.owner_first_name} {lead.owner_last_name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {lead.property_address || 'No address'}
                </div>
              </div>
              <span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status}</span>
            </div>
          ))}
        </div>

        {/* Today's tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="section-title" style={{ margin: 0 }}>Today's Tasks</div>
              {dueTasks.length > 0 && (
                <span style={{ background: dueTasks.some(t => new Date(t.due_date) < new Date()) ? 'var(--red)' : 'var(--accent)', color: 'white', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 10 }}>
                  {dueTasks.length}
                </span>
              )}
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          {dueTasks.length === 0 && <div className="empty-state"><p>No tasks due today 🎉</p></div>}
          {dueTasks.map(task => {
            const isOverdue = new Date(task.due_date) < new Date();
            return (
              <div key={task.id} onClick={() => navigate(`/leads/${task.lead_id}`)} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isOverdue && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--red)', background: 'var(--red-dim)', padding: '1px 6px', borderRadius: 4 }}>OVERDUE</span>}
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{task.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                  {task.property_address && <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{task.property_address}</span>}
                  {task.owner_first_name && !task.property_address && <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{task.owner_first_name} {task.owner_last_name}</span>}
                  {task.due_date && <span style={{ fontSize: 11.5, color: isOverdue ? 'var(--red)' : 'var(--text3)' }}>
                    Due {new Date(task.due_date).toLocaleDateString()}
                  </span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
