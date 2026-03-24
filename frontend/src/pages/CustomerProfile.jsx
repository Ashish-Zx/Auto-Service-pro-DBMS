import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API from '../services/api';
import {
  RiUserLine, RiCarLine, RiFileListLine, RiMoneyDollarCircleLine,
  RiArrowLeftLine, RiTimeLine, RiMapPinLine, RiMailLine, RiPhoneLine,
  RiLineChartLine, RiToolsLine
} from 'react-icons/ri';

function CustomerProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get(`/customers/${id}`);
        setData(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;
  if (!data) return <div className="error-state">Customer not found</div>;

  const { customer, vehicles, serviceHistory } = data;

  // Calculate Aggregates (DBMS proof of data calculation)
  const totalSpent = serviceHistory.reduce((sum, h) => sum + parseFloat(h.total_amount || 0), 0);
  const avgOrder = serviceHistory.length > 0 ? totalSpent / serviceHistory.length : 0;

  return (
    <div className="customer-profile">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Link to="/customers" className="btn btn-ghost" style={{ paddingLeft: 0 }}>
          <RiArrowLeftLine /> Back to Records
        </Link>
        <div style={{ marginTop: 16 }}>
          <h1>{customer.first_name} {customer.last_name}</h1>
          <p className="page-subtitle">Client ID: #CUST-{customer.customer_id}</p>
        </div>
      </div>

      <div className="profile-grid" style={{ marginBottom: 0 }}>
        {/* Basic Info */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiUserLine /> Contact Details</span>
          </div>
          <div className="profile-info-list stack" style={{ gap: 16 }}>
            <div className="info-item">
              <RiMailLine size={18} />
              <div><label>Email</label><p>{customer.email}</p></div>
            </div>
            <div className="info-item">
              <RiPhoneLine size={18} />
              <div><label>Phone</label><p>{customer.phone}</p></div>
            </div>
            <div className="info-item">
              <RiMapPinLine size={18} />
              <div><label>Address</label><p>{customer.address_street}, {customer.address_city}</p></div>
            </div>
          </div>
        </div>

        {/* Business Insights (Calculated via Logic) */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiLineChartLine /> Business Insight</span>
          </div>
          <div className="info-grid" style={{ marginTop: 8 }}>
            <div className="lite-stat">
              <label>Lifetime Value</label>
              <h3>Rs.{totalSpent.toLocaleString()}</h3>
            </div>
            <div className="lite-stat">
              <label>Avg. Ticket</label>
              <h3>Rs.{avgOrder.toLocaleString()}</h3>
            </div>
          </div>
          <div className="lite-stat" style={{ marginTop: 16 }}>
            <label>Service Loyalty</label>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-body)', fontWeight: 600, marginTop: 4 }}>
              {serviceHistory.length} total workshop visits
            </p>
          </div>
        </div>
      </div>

      <div className="profile-row-main">
        {/* Vehicles Sidebar */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiCarLine /> Registered Assets</span>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {vehicles.map(v => (
              <div key={v.vehicle_id} className="vehicle-mini-card">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{v.make} {v.model}</p>
                  <span className="badge badge-pending" style={{ fontSize: '0.6rem' }}>{v.license_plate}</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: 4 }}>
                  Year: {v.year} · {v.mileage.toLocaleString()} km
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full History Timeline (USING THE SQL VIEW) */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiFileListLine /> Clinical Service History</span>
            <span className="badge-in_progress" style={{ fontSize: '0.7rem' }}>POWERED BY SQL VIEW</span>
          </div>
          
          <div className="timeline">
            {serviceHistory.length > 0 ? serviceHistory.map(h => (
              <div key={h.order_id} className="timeline-item">
                <div className="timeline-date">
                  {new Date(h.order_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="timeline-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Order #{h.order_id} <span style={{ fontWeight: 500, color: 'var(--text-light)', fontSize: '0.85rem' }}>— {h.vehicle}</span></h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-body)', marginTop: 4 }}>
                         Status: <strong style={{ textTransform: 'uppercase' }}>{h.order_status}</strong>
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, color: 'var(--primary)' }}>Rs.{parseFloat(h.total_amount).toLocaleString()}</p>
                      <p style={{ fontSize: '0.65rem', color: 'var(--text-light)', marginTop: 2 }}>{h.payment_method} · {h.payment_status}</p>
                    </div>
                  </div>
                  <Link to={`/orders/${h.order_id}`} className="btn-link" style={{ fontSize: '0.72rem', marginTop: 8, display: 'inline-block' }}>
                    View Full Details
                  </Link>
                </div>
              </div>
            )) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>
                <RiTimeLine size={32} color="var(--text-light)" />
                <p>No service history recorded for this client</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfile;
