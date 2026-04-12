import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Users2, CheckSquare, AlertCircle, Plus } from 'lucide-react';

const STATUS_ORDER = ['New Lead','Contacted','Warm','Hot','Negotiating','Under Contract','Closed','Dead'];

const getStatusClass = (s) => {
  const map = { 'New Lead': 'status-new', 'Contacted': 'status-contacted', 'Warm': 'status-warm', 'Hot': 'status-hot', 'Negotiating': 'status-negotiating', 'Under Contract': 'status-under-contract', 'Closed': 'status-closed', 'Dead': 'status-dead' };
  return map[s] || 'status-new';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentLeads, setRecentLeads] = useState([]);
  const [dueTasks, setDueTasks] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getStats(),
      api.getLeads({ limit: 8 }),
      api.getAllTasks({ status: 'Pending' }),
    ]).then(([s, l, t]) => {
      setStats(s);
      setRecentLeads(l.leads);
      setDueTasks(t.slice(0, 5));
    }).catch(console.error);
  }, []);

  const totalLeads = stats?.byStatus?.reduce((a, b) => a + parseInt(b.count), 0) || 0;
  const hotLeads = stats?.byStatus?.find(s => s.status === 'Hot')?.count || 0;
  const closedLeads = stats?.byStatus?.find(s => s.status === 'Closed')?.count || 0;

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
          { label: 'Total Leads', value: totalLeads, icon: Users2, color: 'var(--accent)' },
          { label: 'Added (30 days)', value: stats?.last30Days || 0, icon: TrendingUp, color: 'var(--green)' },
          { label: 'Hot Leads', value: hotLeads, icon: AlertCircle, color: 'var(--red)' },
          { label: 'Closed Deals', value: closedLeads, icon: CheckSquare, color: 'var(--purple)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div className="stat-card" key={label}>
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

      <div className="grid grid-2" style={{ marginBottom: 24 }}>
        {/* Pipeline by status */}
        <div className="card">
          <div className="section-title">Pipeline by Status</div>
          {STATUS_ORDER.map(status => {
            const item = stats?.byStatus?.find(s => s.status === status);
            const count = parseInt(item?.count || 0);
            const pct = totalLeads ? Math.round((count / totalLeads) * 100) : 0;
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className={`status-badge ${getStatusClass(status)}`} style={{ width: 130, justifyContent: 'center' }}>{status}</span>
                <div style={{ flex: 1, height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width 0.4s' }} />
                </div>
                <span style={{ width: 28, textAlign: 'right', fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* Pipeline by source */}
        <div className="card">
          <div className="section-title">Pipeline by Source</div>
          {stats?.bySource?.length === 0 && <div className="empty-state"><p>No leads yet</p></div>}
          {stats?.bySource?.map(({ source, count }) => (
            <div key={source || 'Unknown'} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span className="source-badge" style={{ width: 130, textAlign: 'center' }}>{source || 'Unknown'}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--bg4)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${totalLeads ? Math.round((count/totalLeads)*100) : 0}%`, background: 'var(--green)', borderRadius: 3 }} />
              </div>
              <span style={{ width: 28, textAlign: 'right', fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{count}</span>
            </div>
          ))}
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

        {/* Due tasks */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0 }}>Upcoming Tasks</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all</button>
          </div>
          {dueTasks.length === 0 && <div className="empty-state"><p>No pending tasks</p></div>}
          {dueTasks.map(task => (
            <div key={task.id} onClick={() => navigate(`/leads/${task.lead_id}`)} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{task.title}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                {task.property_address && <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>{task.property_address}</span>}
                {task.due_date && <span style={{ fontSize: 11.5, color: new Date(task.due_date) < new Date() ? 'var(--red)' : 'var(--text3)' }}>
                  Due {new Date(task.due_date).toLocaleDateString()}
                </span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
