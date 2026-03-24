import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import {
  RiToolsLine, RiMailLine, RiTimerLine,
  RiStarLine, RiCloseLine, RiAddLine,
  RiBriefcaseLine
} from 'react-icons/ri';

function Mechanics() {
  const toast = useToast();
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMechanic, setNewMechanic] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    specialization: '', hire_date: new Date().toISOString().split('T')[0], hourly_rate: ''
  });

  const emptyForm = { first_name: '', last_name: '', email: '', phone: '', specialization: '', hire_date: new Date().toISOString().split('T')[0], hourly_rate: '' };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/mechanics');
      setMechanics(data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOnboard = async (e) => {
    e.preventDefault();
    try {
      await API.post('/mechanics', newMechanic);
      setIsModalOpen(false);
      setNewMechanic(emptyForm);
      toast.success('Mechanic added successfully.');
      fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to add mechanic.').message);
    }
  };

  const update = (field, val) => setNewMechanic(m => ({ ...m, [field]: val }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Mechanics</h1>
          <p className="page-subtitle">{mechanics.length} team members</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => { setNewMechanic(emptyForm); setIsModalOpen(true); }}>
            <RiAddLine size={18} /> Add Mechanic
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner" /><p>Loading team…</p>
        </div>
      ) : mechanics.length === 0 ? (
        <div className="empty-state" style={{ background: 'white', borderRadius: 20, border: '1px dashed var(--border)', padding: '80px 20px' }}>
          <RiToolsLine size={48} className="empty-state-icon" />
          <h3>No mechanics yet</h3>
          <p>Add your first team member to start assigning jobs</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {mechanics.map(m => {
            const isAvail = m.current_status === 'available';
            return (
              <div key={m.mechanic_id} className="card" style={{ padding: '24px', transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                {/* Top row: avatar + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="avatar-chip avatar-chip-dark" style={{ fontSize: '1.25rem' }}>
                      {m.mechanic_name[0]}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-heading)' }}>{m.mechanic_name}</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                        {m.specialization}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    background: isAvail ? '#D1FAE5' : '#FEE2E2',
                    color: isAvail ? '#065F46' : '#991B1B',
                    padding: '4px 12px',
                    borderRadius: '8px',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontFamily: 'Manrope',
                    flexShrink: 0,
                  }}>
                    {m.current_status}
                  </span>
                </div>

                {/* Stats */}
                <div className="info-grid" style={{ marginBottom: '20px' }}>
                  <div className="info-cell">
                    <div className="info-cell-label">Total Jobs</div>
                    <div className="info-cell-value" style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                      <RiBriefcaseLine size={15} color="var(--primary)" />
                      {m.total_jobs}
                    </div>
                  </div>
                  <div className="info-cell">
                    <div className="info-cell-label">Rating</div>
                    <div className="info-cell-value" style={{ fontWeight: 800, fontSize: '1.1rem', color: '#D97706' }}>
                      {m.avg_customer_rating} <RiStarLine size={15} />
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <RiMailLine size={14} color="var(--primary)" />
                    {m.specialization.toLowerCase().replace(' ', '_')}@autoservice.pro
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <RiTimerLine size={14} color="var(--primary)" />
                    {m.total_hours_worked} hrs worked
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-title-icon"><RiToolsLine size={18} /></div>
                Add Mechanic
              </div>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}><RiCloseLine size={18} /></button>
            </div>

            <form onSubmit={handleOnboard}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" placeholder="John" required value={newMechanic.first_name} onChange={e => update('first_name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" placeholder="Doe" required value={newMechanic.last_name} onChange={e => update('last_name', e.target.value)} />
                </div>
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" placeholder="john@autoservice.pro" required value={newMechanic.email} onChange={e => update('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="+91 98765 43210" required value={newMechanic.phone} onChange={e => update('phone', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label>Specialization</label>
                <input type="text" placeholder="e.g. Engine Specialist" required value={newMechanic.specialization} onChange={e => update('specialization', e.target.value)} />
              </div>
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Hire Date</label>
                  <input type="date" required value={newMechanic.hire_date} onChange={e => update('hire_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Hourly Rate (Rs.)</label>
                  <input type="number" placeholder="0.00" min="0" step="0.01" required value={newMechanic.hourly_rate} onChange={e => update('hourly_rate', e.target.value)} />
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  Add to Team
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Mechanics;
