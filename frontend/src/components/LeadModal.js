import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { X, Plus, Trash2 } from 'lucide-react';
import AddressAutocomplete from './AddressAutocomplete';

const STATUSES = ['New Lead','Post-Appointment','Under Contract','Closed','Dead'];
const SOURCES = ['Direct Mail','Cold Call','Cold Text','LaunchControl','Driving for Dollars','Referral','Website','MLS','Wholesaler','Other'];
const PROPERTY_TYPES = ['Single Family','Multi-Family','Duplex','Triplex','Fourplex','Condo','Townhouse','Mobile Home','Land','Commercial','Other'];
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

export default function LeadModal({ lead, onClose, onSaved }) {
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('owner');
  const [extraProps, setExtraProps] = useState(
    lead?.id ? [] : []
  );
  const addExtraProp = () => setExtraProps(p => [...p, { address:'', city:'', state:'', zip:'' }]);
  const removeExtraProp = (i) => setExtraProps(p => p.filter((_, idx) => idx !== i));
  const updateExtraProp = (i, field, val) => setExtraProps(p => p.map((item, idx) => idx === i ? {...item, [field]: val} : item));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    owner_first_name: '', owner_last_name: '', owner_email: '', owner_phone: '', owner_phone2: '', owner_phone3: '',
    bedrooms: '', bathrooms: '', sqft: '',
    owner_mailing_address: '', owner_mailing_city: '', owner_mailing_state: '', owner_mailing_zip: '',
    property_address: '', property_city: '', property_state: '', property_zip: '', property_type: '',
    source: '', status: 'New Lead', motivation: '',
    asking_price: '', estimated_arv: '', estimated_repair: '', offer_price: '',
    campaign: '', list_name: '', assigned_to: '',
    ...lead,
  });

  useEffect(() => {
    api.getUsers().catch(() => []).then(u => setUsers(u || []));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const inp = (key, label, opts = {}) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input className="form-input" value={form[key] || ''} onChange={e => set(key, e.target.value)} {...opts} />
    </div>
  );
  const sel = (key, label, options, placeholder = 'Select...') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className="form-input" value={form[key] || ''} onChange={e => set(key, e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let savedLead;
      if (lead?.id) {
        savedLead = await api.updateLead(lead.id, form);
        savedLead = { id: lead.id };
      } else {
        savedLead = await api.createLead(form);
      }
      // Save extra properties
      for (const ep of extraProps) {
        if (ep.address.trim()) {
          await api.addProperty(savedLead.id, ep);
        }
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'owner', label: 'Owner Info' },
    { id: 'property', label: 'Property' },
    { id: 'deal', label: 'Deal Info' },
    { id: 'marketing', label: 'Marketing' },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{lead?.id ? 'Edit Lead' : 'Add New Lead'}</h2>
          <button className="btn-icon" onClick={onClose}><X /></button>
        </div>

        <div style={{ padding: '0 24px' }}>
          <div className="tabs">
            {tabs.map(t => (
              <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>

        {error && <div className="error-msg" style={{ margin: '0 24px 12px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ paddingTop: 8 }}>

            {tab === 'owner' && (
              <div className="grid grid-2" style={{ gap: 12 }}>
                {inp('owner_first_name', 'First Name', { placeholder: 'John', autoFocus: true })}
                {inp('owner_last_name', 'Last Name', { placeholder: 'Smith' })}
                {inp('owner_phone', 'Phone 1', { type: 'tel', placeholder: '(555) 000-0000' })}
                {inp('owner_phone2', 'Phone 2', { type: 'tel', placeholder: '(555) 000-0000' })}
                {inp('owner_phone3', 'Phone 3', { type: 'tel', placeholder: '(555) 000-0000' })}
                {inp('owner_email', 'Email', { type: 'email', placeholder: 'owner@email.com' })}
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="form-group">
                    <label className="form-label">Mailing Address</label>
                    <AddressAutocomplete
                      value={form.owner_mailing_address || ''}
                      onChange={v => set('owner_mailing_address', v)}
                      onSelect={({ street, city, state, zip }) => {
                        set('owner_mailing_address', street);
                        set('owner_mailing_city', city);
                        set('owner_mailing_state', state);
                        set('owner_mailing_zip', zip);
                      }}
                      placeholder="123 Main St"
                    />
                  </div>
                </div>
                {inp('owner_mailing_city', 'City', { placeholder: 'Phoenix' })}
                <div className="grid grid-2" style={{ gap: 12 }}>
                  {sel('owner_mailing_state', 'State', STATES)}
                  {inp('owner_mailing_zip', 'ZIP', { placeholder: '85001' })}
                </div>
              </div>
            )}

            {tab === 'property' && (
              <div className="grid grid-2" style={{ gap: 12 }}>
                {/* Primary property */}
                <div style={{ gridColumn: 'span 2', fontWeight: 600, fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: 4, borderBottom: '1px solid var(--border)' }}>Primary Property</div>
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <AddressAutocomplete
                      value={form.property_address || ''}
                      onChange={v => set('property_address', v)}
                      onSelect={({ street, city, state, zip }) => {
                        set('property_address', street);
                        set('property_city', city);
                        set('property_state', state);
                        set('property_zip', zip);
                      }}
                      placeholder="456 Oak Ave"
                    />
                  </div>
                </div>
                {inp('property_city', 'City', { placeholder: 'Scottsdale' })}
                <div className="grid grid-2" style={{ gap: 12 }}>
                  {sel('property_state', 'State', STATES)}
                  {inp('property_zip', 'ZIP', { placeholder: '85251' })}
                </div>
                <div style={{ gridColumn: 'span 2' }}>{sel('property_type', 'Property Type', PROPERTY_TYPES)}</div>
                {inp('bedrooms', 'Beds', { type: 'number', placeholder: '3' })}
                {inp('bathrooms', 'Baths', { type: 'number', placeholder: '2' })}
                <div style={{ gridColumn: 'span 2' }}>{inp('sqft', 'Square Footage', { type: 'number', placeholder: '1800' })}</div>

                {/* Additional properties */}
                {extraProps.map((ep, i) => (
                  <div key={i} style={{ gridColumn: 'span 2', background: 'var(--bg3)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Additional Property {i + 1}</span>
                      <button type="button" className="btn-icon" onClick={() => removeExtraProp(i)}><Trash2 style={{ width: 13, height: 13 }} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ gridColumn: 'span 2' }} className="form-group">
                        <label className="form-label">Address</label>
                        <AddressAutocomplete
                          value={ep.address}
                          onChange={v => updateExtraProp(i, 'address', v)}
                          onSelect={({ street, city, state, zip }) => {
                            updateExtraProp(i, 'address', street);
                            updateExtraProp(i, 'city', city);
                            updateExtraProp(i, 'state', state);
                            updateExtraProp(i, 'zip', zip);
                          }}
                          placeholder="123 Main St"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">City</label>
                        <input className="form-input" value={ep.city} onChange={e => updateExtraProp(i, 'city', e.target.value)} placeholder="City" />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div className="form-group">
                          <label className="form-label">State</label>
                          <select className="form-input" value={ep.state} onChange={e => updateExtraProp(i, 'state', e.target.value)}>
                            <option value="">—</option>
                            {STATES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">ZIP</label>
                          <input className="form-input" value={ep.zip} onChange={e => updateExtraProp(i, 'zip', e.target.value)} placeholder="85251" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div style={{ gridColumn: 'span 2' }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={addExtraProp}>
                    <Plus size={13} /> Add Another Property
                  </button>
                </div>
              </div>
            )}

            {tab === 'deal' && (
              <div className="grid grid-2" style={{ gap: 12 }}>
                {sel('status', 'Status', STATUSES)}
                {sel('assigned_to', 'Assigned To', users.map(u => ({ value: u.id, label: u.name })), 'Unassigned')}
                {inp('asking_price', 'Asking Price', { type: 'number', placeholder: '200000' })}
                {inp('estimated_arv', 'Estimated ARV', { type: 'number', placeholder: '280000' })}
                {inp('estimated_repair', 'Est. Repair Cost', { type: 'number', placeholder: '35000' })}
                {inp('offer_price', 'Offer Price', { type: 'number', placeholder: '155000' })}
                <div style={{ gridColumn: 'span 2' }}>
                  <div className="form-group">
                    <label className="form-label">Seller Motivation</label>
                    <textarea className="form-input" value={form.motivation || ''} onChange={e => set('motivation', e.target.value)} placeholder="Why are they selling? Any urgency?" rows={3} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'marketing' && (
              <div className="grid grid-2" style={{ gap: 12 }}>
                {sel('source', 'Lead Source', SOURCES)}
                {inp('campaign', 'Campaign Name', { placeholder: 'Q1 Absentee Owner Mailer' })}
                {inp('list_name', 'List Name', { placeholder: 'Probate List Jan 2024' })}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : lead?.id ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
