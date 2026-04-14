import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import LeadModal from '../components/LeadModal';

const STATUSES = ['New Lead','Post-Appointment','Under Contract','Closed','Dead'];
const SOURCES = ['Direct Mail','Cold Call','Cold Text','LaunchControl','Driving for Dollars','Referral','Website','MLS','Wholesaler','Other'];

const getStatusClass = (s) => {
  const map = { 'New Lead': 'status-new','Contacted': 'status-contacted','Warm': 'status-warm','Hot': 'status-hot','Negotiating': 'status-negotiating','Under Contract': 'status-under-contract','Closed': 'status-closed','Dead': 'status-dead' };
  return map[s] || 'status-new';
};

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getLeads({ search, status, source, page, limit });
      setLeads(data.leads);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, status, source, page]);

  useEffect(() => { setPage(1); }, [search, status, source]);
  useEffect(() => { load(); }, [load]);

  const fmt = (n) => n ? `$${Number(n).toLocaleString()}` : '—';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{total} total leads in your pipeline</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Lead
        </button>
      </div>

      <div className="filter-bar">
        <div className="search-wrap">
          <Search />
          <input className="search-input" placeholder="Search name, address, phone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select-filter" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="select-filter" value={source} onChange={e => setSource(e.target.value)}>
          <option value="">All Sources</option>
          {SOURCES.map(s => <option key={s}>{s}</option>)}
        </select>
        {(search || status || source) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setStatus(''); setSource(''); }}>Clear</button>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Owner</th>
                <th>Property Address</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Status</th>
                <th>Open Tasks</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="table-empty">Loading...</td></tr>}
              {!loading && leads.length === 0 && <tr><td colSpan={7} className="table-empty">No leads found. Add your first lead!</td></tr>}
              {leads.map(lead => (
                <tr key={lead.id} onClick={() => navigate(`/leads/${lead.id}`)}>
                  <td style={{ fontWeight: 600 }}>{lead.owner_first_name || ''} {lead.owner_last_name || ''}</td>
                  <td>{lead.property_address ? `${lead.property_address}${lead.property_city ? ', ' + lead.property_city : ''}` : '—'}</td>
                  <td>{lead.owner_phone || '—'}</td>
                  <td><span className="source-badge">{lead.source || '—'}</span></td>
                  <td><span className={`status-badge ${getStatusClass(lead.status)}`}>{lead.status}</span></td>
                  <td>{lead.open_tasks || 0}</td>
                  <td style={{ color: 'var(--text3)', fontSize: 12 }}>{new Date(lead.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > limit && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 13, color: 'var(--text3)' }}>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-icon" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft /></button>
              <button className="btn-icon" onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}><ChevronRight /></button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <LeadModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
