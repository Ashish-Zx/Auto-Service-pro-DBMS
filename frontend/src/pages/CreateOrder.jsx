import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import {
  RiAddLine, RiDeleteBinLine,
  RiToolsLine, RiUserLine, RiCheckLine,
  RiArchiveLine, RiArrowLeftLine
} from 'react-icons/ri';

function CreateOrder() {
  const navigate = useNavigate();
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [mechanics, setMechanics] = useState([]);

  const [form, setForm] = useState({
    customer_id: '', vehicle_id: '', mechanic_id: '',
    estimated_days: 1, selectedServices: [], selectedParts: []
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [pageError, setPageError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cRes, sRes, pRes, mRes] = await Promise.all([
          API.get('/customers?limit=100'),
          API.get('/services'),
          API.get('/inventory'),
          API.get('/mechanics/available')
        ]);
        setCustomers(cRes.data || []);
        setServices(sRes.data || []);
        setParts(pRes.data || []);
        setMechanics(mRes.data || []);
      } catch (err) {
        setPageError(getApiError(err, 'Failed to load order form data.').message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const fetchVehiclesByCustomer = async (cid) => {
    if (!cid) return setVehicles([]);
    try {
      const { data } = await API.get(`/customers/${cid}`);
      setVehicles(data.vehicles || []);
    } catch (err) { console.error(err); }
  };

  const addService = (svc) => {
    if (form.selectedServices.find(s => s.service_id === svc.service_id)) return;
    setForm(f => ({ ...f, selectedServices: [...f.selectedServices, { ...svc, quantity: 1, unit_price: svc.base_price, discount_percent: 0 }] }));
  };

  const removeService = (id) => setForm(f => ({ ...f, selectedServices: f.selectedServices.filter(s => s.service_id !== id) }));

  const addPart = (part) => {
    if (form.selectedParts.find(p => p.part_id === part.part_id)) return;
    setForm(f => ({ ...f, selectedParts: [...f.selectedParts, { ...part, quantity_used: 1, unit_price: part.unit_price }] }));
  };

  const removePart = (id) => setForm(f => ({ ...f, selectedParts: f.selectedParts.filter(p => p.part_id !== id) }));

  const updatePartQty = (id, delta) => setForm(f => ({
    ...f,
    selectedParts: f.selectedParts.map(p => p.part_id === id ? { ...p, quantity_used: Math.max(1, p.quantity_used + delta) } : p)
  }));

  const totalLabor = form.selectedServices.reduce((sum, s) => sum + (s.unit_price * s.quantity * (1 - s.discount_percent / 100)), 0);
  const totalParts = form.selectedParts.reduce((sum, p) => sum + (p.unit_price * p.quantity_used), 0);
  const grandTotal = (totalLabor + totalParts) * 1.13;
  const stockWarnings = form.selectedParts
    .filter((part) => part.quantity_used > part.quantity_in_stock)
    .map((part) => `${part.part_name} only has ${part.quantity_in_stock} in stock.`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!form.customer_id || !form.vehicle_id || form.selectedServices.length === 0) {
      setFormErrors({
        customer_id: !form.customer_id ? 'Customer is required.' : undefined,
        vehicle_id: !form.vehicle_id ? 'Vehicle is required.' : undefined,
        services: form.selectedServices.length === 0 ? 'Select at least one service.' : undefined,
      });
      toast.error('Please select a customer, vehicle, and at least one service.');
      return;
    }
    if (stockWarnings.length > 0) {
      toast.error(stockWarnings[0]);
      return;
    }
    setSubmitting(true);
    try {
      const response = await API.post('/orders', {
        ...form,
        services: form.selectedServices,
        parts: form.selectedParts
      });
      toast.success('Service order created successfully.');
      navigate(`/orders/${response.data.orderId}`);
    } catch (err) {
      const apiError = getApiError(err, 'Failed to create order.');
      setFormErrors(apiError.fields);
      toast.error(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="loading-state" style={{ height: '60vh' }}>
      <div className="spinner" />
      <p>Loading data…</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {pageError && <div className="inline-banner">{pageError}</div>}
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="button" className="btn btn-ghost" style={{ padding: '9px' }} onClick={() => navigate('/orders')}>
            <RiArrowLeftLine size={18} />
          </button>
          <div>
            <h1>New Service Order</h1>
            <p className="page-subtitle">Fill in the details to create an order</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <><div className="spinner-sm" /> Creating…</> : <><RiCheckLine size={17} /> Create Order</>}
          </button>
        </div>
      </div>

      <div className="create-layout">
        {/* Left column */}
        <div className="stack">
          {/* Customer & Vehicle */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title"><RiUserLine size={16} /> Customer &amp; Vehicle</span>
            </div>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Customer</label>
                <select
                  value={form.customer_id}
                  onChange={e => { setForm(f => ({ ...f, customer_id: e.target.value })); fetchVehiclesByCustomer(e.target.value); }}
                  required
                >
                  <option value="">Select customer…</option>
                  {customers.map(c => (
                    <option key={c.customer_id} value={c.customer_id}>{c.first_name} {c.last_name} — {c.phone}</option>
                  ))}
                </select>
                {formErrors.customer_id && <div className="form-error">{formErrors.customer_id}</div>}
              </div>
              <div className="form-group">
                <label>Vehicle</label>
                <select
                  value={form.vehicle_id}
                  onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}
                  required
                  disabled={!form.customer_id}
                >
                  <option value="">Select vehicle…</option>
                  {vehicles.map(v => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>{v.license_plate} — {v.make} {v.model}</option>
                  ))}
                </select>
                {formErrors.vehicle_id && <div className="form-error">{formErrors.vehicle_id}</div>}
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title"><RiToolsLine size={16} /> Services</span>
              <span className="section-label">{services.length} available</span>
            </div>

            {/* Service chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: form.selectedServices.length > 0 ? 20 : 0 }}>
              {services.map(s => {
                const selected = form.selectedServices.find(x => x.service_id === s.service_id);
                return (
                  <button
                    key={s.service_id}
                    type="button"
                    onClick={() => selected ? removeService(s.service_id) : addService(s)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      background: selected ? 'var(--primary-pale)' : 'white',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      fontFamily: 'Manrope, sans-serif',
                      color: selected ? 'var(--primary)' : 'var(--text-body)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {selected && <RiCheckLine size={12} style={{ marginRight: 4 }} />}
                    {s.service_name} · Rs.{s.base_price}
                  </button>
                );
              })}
            </div>

            {form.selectedServices.length > 0 && (
              <table className="data-table" style={{ minWidth: 'unset' }}>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Rate</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.selectedServices.map(s => (
                    <tr key={s.service_id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{s.service_name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>Rs.{s.base_price}</td>
                      <td>
                        <button type="button" onClick={() => removeService(s.service_id)} className="btn btn-icon-danger" style={{ padding: '6px' }}>
                          <RiDeleteBinLine size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {formErrors.services && <div className="form-error">{formErrors.services}</div>}
          </div>

          {/* Parts */}
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title"><RiArchiveLine size={16} /> Parts</span>
              <span className="section-label">{parts.filter(p => p.quantity_in_stock > 0).length} in stock</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: form.selectedParts.length > 0 ? 20 : 0 }}>
              {parts.filter(p => p.quantity_in_stock > 0).map(p => {
                const selected = form.selectedParts.find(x => x.part_id === p.part_id);
                return (
                  <button
                    key={p.part_id}
                    type="button"
                    onClick={() => selected ? removePart(p.part_id) : addPart(p)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '12px',
                      border: `1.5px solid ${selected ? '#059669' : '#D1FAE5'}`,
                      background: selected ? '#D1FAE5' : '#F0FDF4',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      fontFamily: 'Manrope, sans-serif',
                      color: selected ? '#065F46' : '#15803D',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {selected && <RiCheckLine size={12} style={{ marginRight: 4 }} />}
                    {p.part_name} ({p.quantity_in_stock})
                  </button>
                );
              })}
            </div>

            {form.selectedParts.length > 0 && (
              <table className="data-table" style={{ minWidth: 'unset' }}>
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {form.selectedParts.map(p => (
                    <tr key={p.part_id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-heading)' }}>{p.part_name}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button type="button" onClick={() => updatePartQty(p.part_id, -1)}
                            style={{ width: 26, height: 26, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <span style={{ fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{p.quantity_used}</span>
                          <button type="button" onClick={() => updatePartQty(p.part_id, 1)}
                            style={{ width: 26, height: 26, background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>Rs.{p.unit_price}</td>
                      <td>
                        <button type="button" onClick={() => removePart(p.part_id)} className="btn btn-icon-danger" style={{ padding: '6px' }}>
                          <RiDeleteBinLine size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {stockWarnings.length > 0 && (
              <div className="inline-banner" style={{ marginTop: 16 }}>
                {stockWarnings.join(' ')}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div>
          <div className="dark-panel" style={{ position: 'sticky', top: 28 }}>
            <h2>Order Summary</h2>

            <div className="form-group">
              <label>Assign Mechanic</label>
              <select
                value={form.mechanic_id}
                onChange={e => setForm(f => ({ ...f, mechanic_id: e.target.value }))}
                required
                >
                  <option value="">Select mechanic…</option>
                  {mechanics.map(m => (
                    <option key={m.mechanic_id} value={m.mechanic_id}>
                      {m.first_name} {m.last_name} — {m.specialization}
                    </option>
                  ))}
                </select>
                {formErrors.mechanic_id && <div className="form-error">{formErrors.mechanic_id}</div>}
              </div>

            <div className="form-group">
              <label>Estimated Days</label>
              <input
                type="number"
                min="1"
                value={form.estimated_days}
                onChange={e => setForm(f => ({ ...f, estimated_days: e.target.value }))}
              />
              {formErrors.estimated_days && <div className="form-error">{formErrors.estimated_days}</div>}
            </div>

            <div className="billing-summary">
              <div className="billing-row">
                <span className="billing-row-label">Labour</span>
                <span className="billing-row-value">Rs.{totalLabor.toLocaleString()}</span>
              </div>
              <div className="billing-row">
                <span className="billing-row-label">Parts</span>
                <span className="billing-row-value">Rs.{totalParts.toLocaleString()}</span>
              </div>
              <div className="billing-row">
                <span className="billing-row-label">Tax (13%)</span>
                <span className="billing-row-value">Rs.{((totalLabor + totalParts) * 0.13).toLocaleString()}</span>
              </div>
              <div className="billing-total-row">
                <span className="billing-total-label">Total</span>
                <span className="billing-total-value">Rs.{Math.round(grandTotal).toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ width: '100%', justifyContent: 'center', marginTop: 20, padding: '14px' }}
            >
              {submitting ? <><div className="spinner-sm" /> Creating…</> : <><RiCheckLine size={17} /> Create Order</>}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

export default CreateOrder;
