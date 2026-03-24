import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { getApiError } from '../utils/apiErrors';
import {
  RiFileListLine, RiCalendarLine, RiUserLine, RiCarFill,
  RiTimeLine, RiInformationLine, RiAddLine, RiFilterLine
} from 'react-icons/ri';

const STATUS_OPTIONS = [
  { value: '',            label: 'All Statuses' },
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'delivered',   label: 'Delivered' },
  { value: 'cancelled',   label: 'Cancelled' },
];

function ServiceOrders() {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setPageError('');
    try {
      const response = await API.get(`/orders?status=${statusFilter}&page=${page}&limit=12`);
      setOrders(response.data || []);
      setPagination(response.pagination || { total: response.data?.length || 0, page: 1, pages: 1 });
    } catch (err) {
      setPageError(getApiError(err, 'Failed to load orders.').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, page]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Service Orders</h1>
          <p className="page-subtitle">{orders.length} {statusFilter ? statusFilter.replace('_', ' ') : 'total'} records</p>
        </div>
        <div className="page-header-actions">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <RiFilterLine size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-light)', pointerEvents: 'none' }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 16px 10px 34px',
                borderRadius: '10px',
                border: '1.5px solid var(--border)',
                background: 'white',
                fontWeight: 600,
                fontFamily: 'Manrope, sans-serif',
                fontSize: '0.875rem',
                color: 'var(--text-heading)',
                cursor: 'pointer',
                appearance: 'none',
                WebkitAppearance: 'none',
                paddingRight: 28,
              }}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <Link to="/orders/new" className="btn btn-primary">
            <RiAddLine size={17} /> Create Order
          </Link>
        </div>
      </div>

      {pageError && <div className="inline-banner">{pageError}</div>}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer &amp; Vehicle</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6">
                <div className="loading-state" style={{ padding: '60px 0' }}>
                  <div className="spinner" /><p>Fetching orders…</p>
                </div>
              </td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan="6">
                <div className="empty-state">
                  <RiFileListLine size={44} className="empty-state-icon" />
                  <h3>No orders found</h3>
                  <p>{statusFilter ? 'Try a different status filter' : 'Create your first service order'}</p>
                </div>
              </td></tr>
            ) : orders.map(order => (
              <tr key={order.order_id}>
                <td>
                  <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95rem' }}>
                    #{order.order_id}
                  </span>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-light)', marginTop: 2, fontFamily: 'Manrope', fontWeight: 600 }}>
                    REF-{order.order_id}-2026
                  </p>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--primary-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                      <RiUserLine size={14} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-heading)' }}>{order.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669', flexShrink: 0 }}>
                      <RiCarFill size={13} />
                    </div>
                    <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {order.vehicle} · {order.license_plate}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-body)' }}>
                    <RiCalendarLine size={14} color="var(--primary)" />
                    {new Date(order.order_date).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {order.actual_completion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 4 }}>
                      <RiTimeLine size={12} />
                      Done: {new Date(order.actual_completion).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                </td>
                <td>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-heading)' }}>
                    Rs.{parseFloat(order.total_amount).toLocaleString()}
                  </span>
                  <p style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 700, marginTop: 2 }}>Incl. tax</p>
                </td>
                <td>
                  <span className={`badge badge-${order.status}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <Link to={`/orders/${order.order_id}`} className="btn btn-icon" title="View detail">
                    <RiInformationLine size={17} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && pagination.pages > 1 && (
        <div className="pagination-bar">
          <span>Page {pagination.page} of {pagination.pages} · {pagination.total} total orders</span>
          <div className="pagination-actions">
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>Previous</button>
            <button className="btn btn-ghost" disabled={page >= pagination.pages} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ServiceOrders;
