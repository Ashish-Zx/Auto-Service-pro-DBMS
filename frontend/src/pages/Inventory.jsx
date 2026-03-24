import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import {
  RiArchiveLine, RiAddLine, RiAlertLine,
  RiTruckLine, RiStockLine, RiCloseLine, RiPencilLine, RiSearchLine
} from 'react-icons/ri';

const StockBadge = ({ status }) => {
  const map = {
    'IN STOCK':    { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
    'LOW STOCK':   { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    'OUT OF STOCK':{ bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  };
  const s = map[status] || map['IN STOCK'];
  return (
    <span style={{
      background: s.bg, color: s.text, padding: '5px 12px',
      borderRadius: '8px', fontSize: '0.68rem', fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontFamily: 'Manrope', textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      {status}
    </span>
  );
};

function Inventory() {
  const toast = useToast();
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [isNewSupplier, setIsNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockId, setRestockId] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [pageError, setPageError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newPart, setNewPart] = useState({
    part_name: '', part_number: '', description: '', unit_price: '',
    quantity_in_stock: '', reorder_level: '', supplier_id: ''
  });

  const emptyPart = { part_name: '', part_number: '', description: '', unit_price: '', quantity_in_stock: '', reorder_level: '', supplier_id: '' };

  const fetchData = async () => {
    setLoading(true);
    setPageError('');
    try {
      const response = await API.get(`/inventory?status=${encodeURIComponent(statusFilter)}&search=${encodeURIComponent(search)}&page=${page}&limit=12`);
      setParts(response.data || []);
      setPagination(response.pagination || { total: response.data?.length || 0, page: 1, pages: 1 });
    } catch (err) {
      setPageError(getApiError(err, 'Failed to load inventory.').message);
    }
    finally { setLoading(false); }
  };

  const fetchSuppliers = async () => {
    try {
      const { data } = await API.get('/inventory/suppliers');
      setSuppliers(data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchData(); fetchSuppliers(); }, [search, statusFilter, page]);
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const openNew = () => {
    setEditId(null); setNewPart(emptyPart);
    setIsNewSupplier(false); setNewSupplierName('');
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (part) => {
    setNewPart({
      part_name: part.part_name, part_number: part.part_number,
      description: part.description || '', unit_price: part.unit_price,
      quantity_in_stock: part.quantity_in_stock, reorder_level: part.reorder_level,
      supplier_id: part.supplier_id || ''
    });
    setEditId(part.part_id);
    setIsNewSupplier(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false); setEditId(null);
    setNewPart(emptyPart); setIsNewSupplier(false); setNewSupplierName('');
    setFormErrors({});
  };

  const handleRestock = async () => {
    if (!restockId) return;
    try {
      await API.put(`/inventory/${restockId}/restock`, { quantity: parseInt(restockQty, 10) });
      toast.success('Inventory restocked successfully.');
      setRestockId(null);
      setRestockQty('');
      fetchData();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to restock part.').message);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({});
    try {
      let finalSupplierId = newPart.supplier_id;
      if (isNewSupplier && newSupplierName.trim()) {
        const suppRes = await API.post('/inventory/suppliers', {
          company_name: newSupplierName, contact_person: '', phone: '', email: ''
        });
        finalSupplierId = suppRes.data?.supplier_id;
      }
      const payload = { ...newPart, supplier_id: finalSupplierId };
      if (editId) {
        await API.put(`/inventory/${editId}`, payload);
        toast.success('Inventory item updated successfully.');
      } else {
        await API.post('/inventory', payload);
        toast.success('Inventory item added successfully.');
      }
      closeModal();
      fetchData(); fetchSuppliers();
    } catch (err) {
      const apiError = getApiError(err, 'Failed to save inventory item.');
      setFormErrors(apiError.fields);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const update = (field, val) => setNewPart(p => ({ ...p, [field]: val }));
  const alertCount = parts.filter(p => p.stock_status !== 'IN STOCK').length;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p className="page-subtitle">{parts.length} component lines tracked</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={openNew}>
            <RiAddLine size={18} /> Add Component
          </button>
        </div>
      </div>

      <div className="table-toolbar">
        <div className="search-bar-wrap">
          <span className="search-bar-icon"><RiSearchLine size={18} /></span>
          <input
            type="text"
            className="search-bar"
            placeholder="Search parts, part numbers, or suppliers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All stock states</option>
          <option value="IN STOCK">In stock</option>
          <option value="LOW STOCK">Low stock</option>
          <option value="OUT OF STOCK">Out of stock</option>
        </select>
      </div>

      {pageError && <div className="inline-banner">{pageError}</div>}

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Component</th>
              <th>Stock</th>
              <th>Unit Price</th>
              <th>Supplier</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6">
                <div className="loading-state" style={{ padding: '60px 0' }}>
                  <div className="spinner" /><p>Loading inventory…</p>
                </div>
              </td></tr>
            ) : parts.length === 0 ? (
              <tr><td colSpan="6">
                <div className="empty-state">
                  <RiArchiveLine size={44} className="empty-state-icon" />
                  <h3>No components yet</h3>
                  <p>Add your first inventory item to start tracking</p>
                </div>
              </td></tr>
            ) : parts.map(p => (
              <tr key={p.part_id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--primary-pale)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <RiArchiveLine size={17} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{p.part_name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-light)', fontWeight: 600, marginTop: 2 }}>PN: {p.part_number}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <RiStockLine size={15} color="var(--primary)" />
                    <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>{p.quantity_in_stock}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>units</span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-light)', fontWeight: 700, marginTop: 3 }}>
                    Reorder at: {p.reorder_level}
                  </p>
                </td>
                <td>
                  <span style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                    Rs.{parseFloat(p.unit_price).toLocaleString()}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    <RiTruckLine size={14} color="var(--text-light)" /> {p.supplier}
                  </div>
                </td>
                <td>
                  <StockBadge status={p.stock_status} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn"
                      style={{ background: 'var(--primary-pale)', color: 'var(--primary)', padding: '8px 12px', borderRadius: 9, fontSize: '0.75rem', fontWeight: 700, fontFamily: 'Manrope' }}
                      onClick={() => { setRestockId(p.part_id); setRestockQty(''); }}
                    >
                      Restock
                    </button>
                    <button className="btn btn-icon" onClick={() => openEdit(p)} title="Edit">
                      <RiPencilLine size={16} />
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
          <span>Page {pagination.page} of {pagination.pages} · {pagination.total} total parts</span>
          <div className="pagination-actions">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</button>
            <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      )}

      {/* Alert banner */}
      {alertCount > 0 && (
        <div className="alert-banner alert-banner-warning">
          <div className="alert-banner-icon alert-banner-icon-warning">
            <RiAlertLine size={20} />
          </div>
          <div className="alert-banner-content">
            <h4>Stock Alert — {alertCount} component{alertCount > 1 ? 's' : ''} need attention</h4>
            <p>{alertCount} item{alertCount > 1 ? 's have' : ' has'} reached critical reorder levels. Place restocking orders to avoid service delays.</p>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <div className="modal-title-icon"><RiArchiveLine size={18} /></div>
                {editId ? 'Update Component' : 'Add Component'}
              </div>
              <button className="modal-close" onClick={closeModal}><RiCloseLine size={18} /></button>
            </div>

            <form onSubmit={handleRegister}>
              {Object.keys(formErrors).length > 0 && (
                <div className="inline-banner">Please fix the highlighted fields and try again.</div>
              )}
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Part Name</label>
                  <input type="text" placeholder="Brake Pad Set" required value={newPart.part_name} onChange={e => update('part_name', e.target.value)} />
                  {formErrors.part_name && <div className="form-error">{formErrors.part_name}</div>}
                </div>
                <div className="form-group">
                  <label>Part Number</label>
                  <input type="text" placeholder="BRK-PAD-FRT" required value={newPart.part_number} onChange={e => update('part_number', e.target.value)} />
                  {formErrors.part_number && <div className="form-error">{formErrors.part_number}</div>}
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="Front brake pads – ceramic" required value={newPart.description} onChange={e => update('description', e.target.value)} />
                {formErrors.description && <div className="form-error">{formErrors.description}</div>}
              </div>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Unit Price (Rs.)</label>
                  <input type="number" placeholder="0.00" min="0" step="0.01" required value={newPart.unit_price} onChange={e => update('unit_price', e.target.value)} />
                  {formErrors.unit_price && <div className="form-error">{formErrors.unit_price}</div>}
                </div>
                <div className="form-group">
                  <label>Initial Stock</label>
                  <input type="number" placeholder="0" min="0" required value={newPart.quantity_in_stock} onChange={e => update('quantity_in_stock', e.target.value)} />
                  {formErrors.quantity_in_stock && <div className="form-error">{formErrors.quantity_in_stock}</div>}
                </div>
                <div className="form-group">
                  <label>Reorder Level</label>
                  <input type="number" placeholder="10" min="0" required value={newPart.reorder_level} onChange={e => update('reorder_level', e.target.value)} />
                  {formErrors.reorder_level && <div className="form-error">{formErrors.reorder_level}</div>}
                </div>
              </div>
              <div className="form-group">
                <label>Supplier</label>
                <select
                  required={!isNewSupplier}
                  value={isNewSupplier ? 'new' : newPart.supplier_id}
                  onChange={e => {
                    if (e.target.value === 'new') { setIsNewSupplier(true); update('supplier_id', ''); }
                    else { setIsNewSupplier(false); update('supplier_id', e.target.value); }
                  }}
                >
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.supplier_name}</option>
                  ))}
                  <option value="new">+ Add new supplier…</option>
                </select>
                {isNewSupplier && (
                  <input
                    type="text"
                    placeholder="Company name (e.g. AutoParts Inc.)"
                    required
                    value={newSupplierName}
                    onChange={e => setNewSupplierName(e.target.value)}
                    style={{ marginTop: 10, width: '100%', padding: '11px 14px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: '0.925rem', fontFamily: 'Source Sans 3, sans-serif' }}
                  />
                )}
                {formErrors.supplier_id && <div className="form-error">{formErrors.supplier_id}</div>}
              </div>

              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} disabled={submitting}>
                  {submitting ? 'Saving…' : editId ? 'Save Changes' : 'Add to Inventory'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restockId && (
        <div className="modal-overlay" onClick={() => setRestockId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Restock Inventory</div>
              <button className="modal-close" onClick={() => setRestockId(null)}><RiCloseLine size={18} /></button>
            </div>
            <div className="form-group">
              <label>Quantity to add</label>
              <input type="number" min="1" value={restockQty} onChange={(e) => setRestockQty(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" disabled={!restockQty || Number(restockQty) < 1} onClick={handleRestock}>Confirm Restock</button>
              <button className="btn btn-ghost" onClick={() => setRestockId(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
