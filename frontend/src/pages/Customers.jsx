import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import {
  RiSearchLine, RiAddLine, RiUserLine,
  RiMailLine, RiPhoneLine, RiMapPinLine,
  RiCarLine, RiCloseLine,
  RiDeleteBinLine, RiEditLine, RiInformationLine
} from 'react-icons/ri';
import { Link } from 'react-router-dom';

function Customers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    address_street: '', address_city: '', address_state: '', address_zip: ''
  });
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pageError, setPageError] = useState('');

  const emptyForm = { first_name: '', last_name: '', email: '', phone: '', address_street: '', address_city: '', address_state: '', address_zip: '' };

  const fetchCustomers = async () => {
    setLoading(true);
    setPageError('');
    try {
      const response = await API.get(`/customers?search=${encodeURIComponent(search)}&page=${page}&limit=10`);
      setCustomers(response.data || []);
      setPagination(response.pagination || { total: response.data?.length || 0, page: 1, pages: 1 });
    } catch (err) {
      const apiError = getApiError(err, 'Failed to load customers.');
      setPageError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openNew = () => { setEditId(null); setForm(emptyForm); setFormErrors({}); setShowModal(true); };
  const openEdit = (c) => {
    const { vehicle_count, ...clean } = c;
    setForm(clean);
    setEditId(c.customer_id);
    setFormErrors({});
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditId(null); setForm(emptyForm); setFormErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    try {
      if (editId) {
        await API.put(`/customers/${editId}`, form);
        toast.success('Customer updated successfully.');
      } else {
        await API.post('/customers', form);
        toast.success('Customer created successfully.');
      }
      closeModal();
      fetchCustomers();
    } catch (err) {
      const apiError = getApiError(err, 'Error saving customer.');
      setFormErrors(apiError.fields);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('This will permanently delete the customer and all their data. Proceed?')) return;
    try {
      await API.delete(`/customers/${id}`);
      toast.success('Customer deleted successfully.');
      fetchCustomers();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete customer.').message);
    }
  };

  const update = (field, val) => setForm(f => ({ ...f, [field]: val }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Customer Directory</h1>
          <p className="page-subtitle">{customers.length} total records</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <RiAddLine size={18} /> New Customer
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="search-bar-wrap">
        <span className="search-bar-icon"><RiSearchLine size={18} /></span>
        <input
          type="text"
          className="search-bar"
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      {pageError && <div className="inline-banner">{pageError}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Contact</th>
              <th>Location</th>
              <th>Vehicles</th>
              <th>Registered</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6">
                  <div className="loading-state" style={{ padding: '60px 0' }}>
                    <div className="spinner" />
                    <p>Syncing records…</p>
                  </div>
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan="6">
                  <div className="empty-state">
                    <RiUserLine size={44} className="empty-state-icon" />
                    <h3>No customers found</h3>
                    <p>{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
                  </div>
                </td>
              </tr>
            ) : customers.map(c => (
              <tr key={c.customer_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar-chip">
                      {c.first_name[0]}{c.last_name[0]}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>
                        {c.first_name} {c.last_name}
                      </p>
                      <p style={{ fontSize: '0.775rem', color: 'var(--text-light)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <RiMailLine size={12} /> {c.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.875rem', color: 'var(--text-body)', fontWeight: 600 }}>
                    <RiPhoneLine size={14} color="var(--primary)" /> {c.phone}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', color: 'var(--text-body)' }}>
                    <RiMapPinLine size={14} color="var(--text-light)" />
                    {c.address_city}{c.address_city && c.address_state ? ', ' : ''}{c.address_state}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#D1FAE5', color: '#065F46', borderRadius: 8, padding: '4px 10px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Manrope' }}>
                    <RiCarLine size={13} /> {c.vehicle_count}
                  </div>
                </td>
                <td style={{ fontSize: '0.82rem', color: 'var(--text-light)' }}>
                  {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link to={`/customers/${c.customer_id}`} className="btn btn-icon" title="View Profile">
                      <RiInformationLine size={16} />
                    </Link>
                    <button className="btn btn-icon" onClick={() => openEdit(c)} title="Edit">
                      <RiEditLine size={16} />
                    </button>
                    <button className="btn btn-icon-danger" onClick={() => handleDelete(c.customer_id)} title="Delete">
                      <RiDeleteBinLine size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && pagination.pages > 1 && (
        <div className="pagination-bar">
          <span>Page {pagination.page} of {pagination.pages} · {pagination.total} total customers</span>
          <div className="pagination-actions">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</button>
            <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-title-icon"><RiUserLine size={18} /></div>
                {editId ? 'Update Customer' : 'New Customer'}
              </div>
              <button className="modal-close" onClick={closeModal}><RiCloseLine size={18} /></button>
            </div>

            <form onSubmit={handleSubmit}>
              {Object.keys(formErrors).length > 0 && (
                <div className="inline-banner">Please fix the highlighted fields and try again.</div>
              )}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>First Name</label>
                  <input value={form.first_name} onChange={e => update('first_name', e.target.value)} placeholder="John" required />
                  {formErrors.first_name && <div className="form-error">{formErrors.first_name}</div>}
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input value={form.last_name} onChange={e => update('last_name', e.target.value)} placeholder="Doe" required />
                  {formErrors.last_name && <div className="form-error">{formErrors.last_name}</div>}
                </div>
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="client@domain.com" required />
                {formErrors.email && <div className="form-error">{formErrors.email}</div>}
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input value={form.phone} onChange={e => update('phone', e.target.value)} placeholder="+91 98765 43210" required />
                {formErrors.phone && <div className="form-error">{formErrors.phone}</div>}
              </div>

              <div className="modal-section-divider">
                <div className="modal-section-label">Mailing Address</div>
                <div className="form-group">
                  <label>Street Address</label>
                  <input value={form.address_street} onChange={e => update('address_street', e.target.value)} placeholder="123 Main Street" />
                  {formErrors.address_street && <div className="form-error">{formErrors.address_street}</div>}
                </div>
                <div className="form-grid-3">
                  <div className="form-group">
                    <label>City</label>
                    <input value={form.address_city} onChange={e => update('address_city', e.target.value)} placeholder="Mumbai" />
                    {formErrors.address_city && <div className="form-error">{formErrors.address_city}</div>}
                  </div>
                  <div className="form-group">
                    <label>State</label>
                    <input value={form.address_state} onChange={e => update('address_state', e.target.value)} placeholder="MH" />
                    {formErrors.address_state && <div className="form-error">{formErrors.address_state}</div>}
                  </div>
                  <div className="form-group">
                    <label>ZIP</label>
                    <input value={form.address_zip} onChange={e => update('address_zip', e.target.value)} placeholder="400001" />
                    {formErrors.address_zip && <div className="form-error">{formErrors.address_zip}</div>}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Saving…' : editId ? 'Save Changes' : 'Add Customer'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Customers;
