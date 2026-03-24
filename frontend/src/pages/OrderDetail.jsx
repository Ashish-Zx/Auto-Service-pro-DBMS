import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import {
  RiArrowLeftLine, RiUserLine, RiCarLine, RiToolsLine,
  RiArchiveLine, RiBillLine, RiCheckLine, RiStarFill, RiStarLine
} from 'react-icons/ri';

const STATUS_STYLES = {
  pending:     { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF', label: 'In Progress' },
  completed:   { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
  delivered:   { bg: '#EDE9FE', text: '#3730A3', label: 'Delivered' },
  cancelled:   { bg: '#FEE2E2', text: '#991B1B', label: 'Cancelled' },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pending;
  return (
    <span style={{
      background: s.bg, color: s.text,
      padding: '6px 18px', borderRadius: '10px',
      fontSize: '0.78rem', fontWeight: 800,
      fontFamily: 'Manrope', letterSpacing: '0.04em',
      textTransform: 'uppercase',
    }}>{s.label}</span>
  );
}

function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [pageError, setPageError] = useState('');

  const fetchDetail = async () => {
    setLoading(true);
    setPageError('');
    try {
      const res = await API.get(`/orders/${id}`);
      setData(res.data);
    } catch (err) {
      setPageError(getApiError(err, 'Failed to load order detail.').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDetail(); }, [id]);

  const handleComplete = async (e) => {
    if (e) e.preventDefault();
    if (!window.confirm('Mark this order as completed and process final billing?')) return;
    setCompleting(true);
    try {
      await API.put(`/orders/${id}/complete`, { payment_method: paymentMethod });
      toast.success('Order completed successfully.');
      fetchDetail();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to complete order.').message);
    } finally { setCompleting(false); }
  };

  const handleDeliver = async () => {
    if (!window.confirm('Mark this vehicle as delivered to the customer?')) return;
    setDelivering(true);
    try {
      await API.put(`/orders/${id}/deliver`);
      toast.success('Vehicle marked as delivered.');
      fetchDetail();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to mark order as delivered.').message);
    } finally { setDelivering(false); }
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setSubmittingFeedback(true);
    try {
      await API.post('/reports/feedback', {
        order_id: id,
        rating,
        comments: comment
      });
      fetchDetail();
      toast.success('Feedback submitted successfully.');
    } catch (err) {
      toast.error(getApiError(err, 'Failed to submit feedback.').message);
    } finally { setSubmittingFeedback(false); }
  };

  if (loading) return (
    <div className="loading-state" style={{ height: '60vh' }}>
      <div className="spinner" /><p>Loading order…</p>
    </div>
  );
  if (!data) return (
    <div className="empty-state" style={{ height: '60vh' }}>
      <h3>Order not found</h3>
      <p>{pageError || "The order you're looking for doesn't exist."}</p>
    </div>
  );

  const { order, lineItems, partsUsed, mechanics, payments, feedback } = data;
  const laborCost = parseFloat(order.total_labor_cost) || 0;
  const partsCost = parseFloat(order.total_parts_cost) || 0;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost" style={{ padding: '9px' }} onClick={() => navigate('/orders')}>
            <RiArrowLeftLine size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ margin: 0 }}>Order #{order.order_id}</h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="page-subtitle">
              {new Date(order.order_date).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
        <div className="page-header-actions">
          {order.status === 'in_progress' && (
            <>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
              <button type="button" className="btn btn-primary" onClick={handleComplete} disabled={completing}>
                {completing ? <><div className="spinner-sm" /> Completing…</> : <><RiCheckLine size={16} /> Mark Completed</>}
              </button>
            </>
          )}
          {order.status === 'completed' && (
            <button className="btn btn-success" onClick={handleDeliver} disabled={delivering}>
              {delivering ? <><div className="spinner-sm" /> Updating…</> : 'Mark Delivered'}
            </button>
          )}
          <button className="btn btn-ghost no-print" onClick={() => window.print()}>
            <RiBillLine size={16} /> Print Invoice
          </button>
        </div>
      </div>

      <div className="order-layout">
        {/* Left column */}
        <div className="stack">
          {/* Customer + Vehicle */}
          <div className="card-two-col">
            <div className="section-card">
              <div className="section-label" style={{ marginBottom: 14 }}>Customer</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--primary-pale)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RiUserLine size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{order.customer_name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', marginTop: 2 }}>{order.phone}</p>
                </div>
              </div>
            </div>
            <div className="section-card">
              <div className="section-label" style={{ marginBottom: 14 }}>Vehicle</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#D1FAE5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <RiCarLine size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{order.vehicle}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontWeight: 700, marginTop: 2 }}>{order.license_plate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Services table */}
          <div className="table-container">
            <div className="table-header">
              <span className="table-header-title"><RiToolsLine size={16} color="var(--primary)" /> Labour &amp; Services</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(item => (
                  <tr key={item.line_number}>
                    <td style={{ fontWeight: 600 }}>{item.service_name}</td>
                    <td>{item.quantity}</td>
                    <td>Rs.{parseFloat(item.unit_price).toLocaleString()}</td>
                    <td>{item.discount_percent}%</td>
                    <td style={{ fontWeight: 800, color: 'var(--text-heading)' }}>Rs.{parseFloat(item.line_total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Parts table */}
          <div className="table-container">
            <div className="table-header">
              <span className="table-header-title"><RiArchiveLine size={16} color="var(--accent)" /> Parts Used</span>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Part No.</th>
                  <th>Qty</th>
                  <th>Unit Rate</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {partsUsed.length > 0 ? partsUsed.map(p => (
                  <tr key={p.usage_id}>
                    <td style={{ fontWeight: 600 }}>{p.part_name}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-light)', fontWeight: 700 }}>{p.part_number}</td>
                    <td>{p.quantity_used}</td>
                    <td>Rs.{parseFloat(p.unit_price).toLocaleString()}</td>
                    <td style={{ fontWeight: 800, color: 'var(--text-heading)' }}>
                      Rs.{parseFloat(p.quantity_used * p.unit_price).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-light)' }}>
                      No parts used in this order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="stack">
          {/* Billing */}
          <div className="dark-panel">
            <h2>Financial Summary</h2>
            <div className="billing-summary">
              <div className="billing-row">
                <span className="billing-row-label">Labour Cost</span>
                <span className="billing-row-value">Rs.{laborCost.toLocaleString()}</span>
              </div>
              <div className="billing-row">
                <span className="billing-row-label">Parts Cost</span>
                <span className="billing-row-value">Rs.{partsCost.toLocaleString()}</span>
              </div>
              <div className="billing-row">
                <span className="billing-row-label">Tax (13%)</span>
                <span className="billing-row-value">Rs.{((laborCost + partsCost) * 0.13).toLocaleString()}</span>
              </div>
              <div className="billing-total-row">
                <span className="billing-total-label">Grand Total</span>
                <span className="billing-total-value">Rs.{parseFloat(order.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Mechanic */}
          <div className="section-card">
            <div className="section-label" style={{ marginBottom: 16 }}>Assigned Mechanic</div>
            {mechanics.map(m => (
              <div key={m.mechanic_id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                  <RiToolsLine size={18} />
                </div>
                <div>
                  <p style={{ fontWeight: 800, color: 'var(--text-heading)', fontSize: '0.9rem' }}>{m.mechanic_name}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>
                    {m.specialization}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Payment info */}
          {payments && payments.length > 0 && (
            <div className="section-card">
              <div className="section-label" style={{ marginBottom: 12 }}>Payment</div>
              {payments.map((pay) => (
                <div key={pay.payment_id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '6px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize' }}>{pay.payment_method}</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-heading)' }}>Rs.{parseFloat(pay.amount).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* CUSTOMER FEEDBACK SECTION (NEW) */}
          {order.status === 'delivered' && (
            <div className="section-card" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              <div className="section-label" style={{ marginBottom: 16 }}>Customer Experience</div>
              
              {!feedback ? (
                <form onSubmit={handleSubmitFeedback}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button key={star} type="button" onClick={() => setRating(star)} className="btn-icon" style={{ padding: 4 }}>
                        {star <= rating ? <RiStarFill size={22} color="#D97706" /> : <RiStarLine size={22} color="#94A3B8" />}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    placeholder="Describe service quality (optional)..."
                    style={{ width: '100%', borderRadius: 12, border: '1px solid #CBD5E1', padding: 12, fontSize: '0.85rem', marginBottom: 12, resize: 'none', height: 80, fontFamily: 'Source Sans 3' }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={submittingFeedback}>
                    {submittingFeedback ? 'Posting...' : 'Submit Satisfaction Rating'}
                  </button>
                </form>
              ) : (
                <div style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {[1, 2, 3, 4, 5].map(star => (
                       star <= feedback.rating ? <RiStarFill size={16} color="#D97706" key={star} /> : <RiStarLine size={16} color="#CBD5E1" key={star} />
                    ))}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-body)', fontStyle: 'italic', marginBottom: 4 }}>
                    "{feedback.comments || 'No comment provided'}"
                  </p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-light)', fontWeight: 700 }}>
                    RECORDED ON: {new Date(feedback.created_at).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetail;
