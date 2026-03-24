import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import {
  RiCalendarCheckLine, RiAddLine, RiTimeLine,
  RiUserLine, RiCarLine, RiCloseLine,
  RiCheckboxCircleLine, RiCloseCircleLine, RiInformationLine, RiFilterLine
} from 'react-icons/ri';

function Appointments() {
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customer_id: '', vehicle_id: '',
    appointment_date: '', appointment_time: '', notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [notePreview, setNotePreview] = useState('');

  const emptyForm = { customer_id: '', vehicle_id: '', appointment_date: '', appointment_time: '', notes: '' };

  const fetchData = async () => {
    setLoading(true);
    setPageError('');
    try {
      const [aRes, cRes] = await Promise.all([
        API.get(`/appointments?status=${statusFilter}&page=${page}&limit=12`),
        API.get('/customers?limit=100')
      ]);
      setAppointments(aRes.data || []);
      setPagination(aRes.pagination || { total: aRes.data?.length || 0, page: 1, pages: 1 });
      setCustomers(cRes.data || []);
    } catch (err) {
      setPageError(getApiError(err, 'Failed to load appointments.').message);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [statusFilter, page]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const fetchVehiclesByCustomer = async (cid) => {
    if (!cid) return setVehicles([]);
    try {
      const { data } = await API.get(`/customers/${cid}`);
      setVehicles(data.vehicles || []);
    } catch (err) { console.error(err); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    try {
      await API.post('/appointments', form);
      setShowModal(false);
      setForm(emptyForm);
      toast.success('Appointment booked successfully.');
      fetchData();
    } catch (err) {
      const apiError = getApiError(err, 'Booking failed.');
      setFormErrors(apiError.fields);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus, existingNotes) => {
    try {
      await API.put(`/appointments/${id}`, { status: newStatus, notes: existingNotes });
      toast.success(`Appointment marked as ${newStatus.replace('_', ' ')}.`);
      fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update appointment.').message);
    }
  };

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const getStatusBadge = (status) => {
    const map = {
      confirmed:  'badge-completed',
      scheduled:  'badge-in_progress',
      completed:  'badge-completed',
      cancelled:  'badge-cancelled',
    };
    return map[status] || 'badge-pending';
  };

  const getStatusLabel = (status) => {
    if (status === 'confirmed') return 'scheduled';
    return status.replace('_', ' ');
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Appointments</h1>
          <p className="page-subtitle">{appointments.length} scheduled slots</p>
        </div>
        <div className="page-header-actions">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <RiFilterLine size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-light)', pointerEvents: 'none' }} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '10px 16px 10px 34px', borderRadius: '10px', border: '1.5px solid var(--border)', background: 'white', fontWeight: 600 }}>
              <option value="">All statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm(emptyForm); setShowModal(true); }}>
            <RiAddLine size={18} /> Schedule Appointment
          </button>
        </div>
      </div>

      {pageError && <div className="inline-banner">{pageError}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date &amp; Time</th>
              <th>Customer</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5">
                <div className="loading-state" style={{ padding: '60px 0' }}>
                  <div className="spinner" /><p>Syncing schedule…</p>
                </div>
              </td></tr>
            ) : appointments.length === 0 ? (
              <tr><td colSpan="5">
                <div className="empty-state">
                  <RiCalendarCheckLine size={44} className="empty-state-icon" />
                  <h3>No appointments scheduled</h3>
                  <p>Schedule your first appointment to get started</p>
                </div>
              </td></tr>
            ) : appointments.map(a => (
              <tr key={a.appointment_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                    <RiCalendarCheckLine size={15} color="var(--primary)" />
                    {new Date(a.appointment_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-light)', marginTop: 4, fontWeight: 600 }}>
                    <RiTimeLine size={12} /> {a.appointment_time}
                  </div>
                </td>
                <td>
                  <p style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{a.customer_name}</p>
                  <p style={{ fontSize: '0.775rem', color: 'var(--text-light)', marginTop: 2 }}>{a.phone}</p>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-body)' }}>
                    <RiCarLine size={14} color="var(--primary)" /> {a.vehicle}
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 700, marginTop: 3 }}>{a.license_plate}</p>
                </td>
                <td>
                  <span className={`badge ${getStatusBadge(a.status)}`}>
                    {getStatusLabel(a.status)}
                  </span>
                  {a.notes && (
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', marginTop: 4, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.notes}
                    </p>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {['scheduled', 'confirmed'].includes(a.status) ? (
                      <>
                        <button
                          className="btn"
                          style={{ background: '#D1FAE5', color: '#065F46', padding: '8px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700 }}
                          onClick={() => handleStatusUpdate(a.appointment_id, 'completed', a.notes)}
                          title="Mark Completed"
                        >
                          <RiCheckboxCircleLine size={16} />
                        </button>
                        <button
                          className="btn"
                          style={{ background: '#FEE2E2', color: 'var(--danger)', padding: '8px 10px', borderRadius: 10, fontSize: '0.8rem', fontWeight: 700 }}
                          onClick={() => handleStatusUpdate(a.appointment_id, 'cancelled', a.notes)}
                          title="Cancel"
                        >
                          <RiCloseCircleLine size={16} />
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-icon"
                        onClick={() => setNotePreview(a.notes || 'No notes added for this appointment.')}
                        title="View notes"
                      >
                        <RiInformationLine size={17} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && pagination.pages > 1 && (
        <div className="pagination-bar">
          <span>Page {pagination.page} of {pagination.pages} · {pagination.total} total appointments</span>
          <div className="pagination-actions">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</button>
            <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-title-icon"><RiCalendarCheckLine size={18} /></div>
                Schedule Appointment
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><RiCloseLine size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {Object.keys(formErrors).length > 0 && (
                <div className="inline-banner">Please fix the highlighted fields and try again.</div>
              )}
              <div className="form-group">
                <label>Customer</label>
                <select
                  value={form.customer_id}
                  onChange={e => { update('customer_id', e.target.value); fetchVehiclesByCustomer(e.target.value); }}
                  required
                >
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>
                      {c.first_name} {c.last_name} — {c.phone}
                    </option>
                  ))}
                </select>
                {formErrors.customer_id && <div className="form-error">{formErrors.customer_id}</div>}
              </div>

              <div className="form-group">
                <label>Vehicle</label>
                <select
                  value={form.vehicle_id}
                  onChange={e => update('vehicle_id', e.target.value)}
                  required
                  disabled={!form.customer_id}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map(v => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.license_plate} — {v.make} {v.model}
                    </option>
                  ))}
                </select>
                {formErrors.vehicle_id && <div className="form-error">{formErrors.vehicle_id}</div>}
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={form.appointment_date}
                    onChange={e => update('appointment_date', e.target.value)}
                    required
                  />
                  {formErrors.appointment_date && <div className="form-error">{formErrors.appointment_date}</div>}
                </div>
                <div className="form-group">
                  <label>Time Slot</label>
                  <select value={form.appointment_time} onChange={e => update('appointment_time', e.target.value)} required>
                    <option value="">Select slot…</option>
                    <option value="09:00:00">09:00 AM</option>
                    <option value="10:00:00">10:00 AM</option>
                    <option value="11:00:00">11:00 AM</option>
                    <option value="12:00:00">12:00 PM</option>
                    <option value="14:00:00">02:00 PM</option>
                    <option value="15:00:00">03:00 PM</option>
                    <option value="16:00:00">04:00 PM</option>
                  </select>
                  {formErrors.appointment_time && <div className="form-error">{formErrors.appointment_time}</div>}
                </div>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                  placeholder="Describe the issue or service required…"
                  rows="3"
                />
                {formErrors.notes && <div className="form-error">{formErrors.notes}</div>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Confirm Booking'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notePreview && (
        <div className="modal-overlay" onClick={() => setNotePreview('')}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Appointment Notes</div>
              <button className="modal-close" onClick={() => setNotePreview('')}><RiCloseLine size={18} /></button>
            </div>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-body)' }}>{notePreview}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Appointments;
