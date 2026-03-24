import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import {
  RiTeamLine, RiFileListLine, RiMoneyDollarCircleLine,
  RiToolsLine, RiArchiveLine, RiStarLine, RiTimeLine,
  RiArrowRightLine, RiHistoryLine, RiAwardLine, RiWalletLine, RiExchangeDollarLine, RiUserHeartLine
} from 'react-icons/ri';

const STAT_CONFIGS = [
  { key: 'totalCustomers',    label: 'Total Clients',   icon: <RiTeamLine />,      color: '#4F46E5', bg: '#EEF2FF' },
  { key: 'activeOrders',      label: 'Active Jobs',     icon: <RiFileListLine />,  color: '#0891B2', bg: '#ECFEFF' },
  { key: 'todayRevenue',      label: "Today's Revenue", icon: <RiMoneyDollarCircleLine />, color: '#059669', bg: '#ECFDF5' },
  { key: 'availableMechanics',label: 'Team On-Duty',    icon: <RiToolsLine />,     color: '#7C3AED', bg: '#F5F3FF' },
  { key: 'lowStockItems',     label: 'Stock Alerts',    icon: <RiArchiveLine />,   color: '#DC2626', bg: '#FEF2F2' },
  { key: 'avgRating',         label: 'Cust. Rating',    icon: <RiStarLine />,      color: '#D97706', bg: '#FFFBEB' },
];

const StatCard = ({ config, value }) => (
  <div className="stat-card">
    <div className="stat-card-row">
      <div className="stat-card-icon" style={{ backgroundColor: config.bg, color: config.color }}>
        {config.icon}
      </div>
    </div>
    <div className="stat-card-info">
      <p className="stat-card-label">{config.label}</p>
      <h3 className="stat-card-value">
        {config.key === 'todayRevenue' ? `Rs.${value?.toLocaleString()}` : value}
      </h3>
    </div>
  </div>
);

function Dashboard() {
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isOwner = currentUser?.role === 'owner';
  const [stats, setStats] = useState(null);
  const [ownerSummary, setOwnerSummary] = useState(null);
  const [topCustomers, setTopCustomers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [revenueData, setRevenueData] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const requests = [
          API.get('/reports/dashboard'),
          API.get('/orders?limit=6'),
          API.get('/reports/revenue'),
          API.get('/inventory/low-stock'),
          API.get('/reports/audit-log'),
          API.get('/reports/service-popularity')
        ];

        if (isOwner) {
          requests.push(API.get('/reports/owner-summary'));
          requests.push(API.get('/reports/top-customers'));
        }

        const [
          statsRes,
          ordersRes,
          revenueRes,
          stockRes,
          auditRes,
          servicesRes,
          ownerSummaryRes,
          topCustomersRes
        ] = await Promise.all(requests);
        setStats(statsRes.data);
        setRecentOrders(ordersRes.data || []);
        
        // Revenue Chart Formatting: Only 7 days as requested for clean look
        const rawRevenue = revenueRes.data || [];
        const sortedRevenue = [...rawRevenue].sort((a, b) => new Date(a.payment_date) - new Date(b.payment_date));
        const formatted = sortedRevenue.slice(-7).map(item => ({
          ...item,
          total_revenue: parseFloat(item.total_revenue)
        }));
        setRevenueData(formatted);
        
        setLowStock(stockRes.data || []);
        setAuditLog(auditRes.data || []);
        
        // Final Top Services Sort: Force Revenue DESC for perfect BI
        const sortedServices = (servicesRes.data || [])
          .sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue))
          .slice(0, 5);
        setTopServices(sortedServices);

        if (isOwner) {
          setOwnerSummary(ownerSummaryRes?.data || null);
          setTopCustomers(topCustomersRes?.data || []);
        }
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;

  const ownerCards = ownerSummary ? [
    { label: 'Monthly Revenue', value: `Rs.${Math.round(ownerSummary.monthlyRevenue || 0).toLocaleString()}`, icon: <RiWalletLine />, accent: '#14532D', bg: '#DCFCE7' },
    { label: 'Pending Collections', value: `Rs.${Math.round(ownerSummary.pendingCollections || 0).toLocaleString()}`, icon: <RiExchangeDollarLine />, accent: '#9A3412', bg: '#FFEDD5' },
    { label: 'Avg Order Value', value: `Rs.${Math.round(ownerSummary.avgOrderValue || 0).toLocaleString()}`, icon: <RiMoneyDollarCircleLine />, accent: '#1D4ED8', bg: '#DBEAFE' },
    { label: 'Customer Retention', value: `${ownerSummary.retentionRate || 0}%`, icon: <RiUserHeartLine />, accent: '#7C2D12', bg: '#FDE68A' },
  ] : [];
  const headlineMetric = isOwner
    ? `Rs.${Math.round(ownerSummary?.monthlyRevenue || 0).toLocaleString()} this month`
    : `${stats?.activeOrders || 0} active jobs in progress`;

  return (
    <div>
      <div className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="dashboard-eyebrow">{isOwner ? 'Owner workspace' : 'Reception desk workspace'}</div>
          <h1>{isOwner ? 'Business board for your service center' : 'Daily operations at a glance'}</h1>
          <p className="page-subtitle">
            {isOwner
              ? `Monitor revenue, customer retention, collections, and service performance for ${currentUser?.company_name || 'your service center'}.`
              : `Track appointments, customers, active jobs, and inventory blockers for ${currentUser?.company_name || 'your service center'}.`}
          </p>
        </div>
        <div className="dashboard-hero-panel">
          <span className="dashboard-hero-chip">{currentUser?.company_code || 'SYSTEM LIVE'}</span>
          <strong>{headlineMetric}</strong>
          <p>{isOwner ? 'Owner metrics refresh from live workshop data.' : 'Front-desk progress updates from current orders and bookings.'}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-grid">
        {STAT_CONFIGS.map(config => (
          <StatCard key={config.key} config={config} value={stats?.[config.key]} />
        ))}
      </div>

      {isOwner && ownerSummary && (
        <div style={{ marginTop: 18 }}>
          <div className="section-card" style={{ paddingBottom: 22 }}>
            <div className="section-card-header">
              <span className="section-card-title"><RiWalletLine /> Owner Business Snapshot</span>
              <span className="badge-completed" style={{ fontSize: '0.7rem' }}>MONTH TO DATE</span>
            </div>
            <div className="stats-grid" style={{ marginBottom: 0 }}>
              {ownerCards.map((card) => (
                <div key={card.label} className="stat-card">
                  <div className="stat-card-icon" style={{ backgroundColor: card.bg, color: card.accent }}>
                    {card.icon}
                  </div>
                  <div className="stat-card-info">
                    <p className="stat-card-label">{card.label}</p>
                    <h3 className="stat-card-value">{card.value}</h3>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 20 }}>
              <div className="lite-stat">
                <label>Estimated Gross Margin</label>
                <h3>Rs.{Math.round(ownerSummary.estimatedGrossMargin || 0).toLocaleString()}</h3>
              </div>
              <div className="lite-stat">
                <label>Monthly Orders</label>
                <h3>{ownerSummary.monthlyOrders || 0}</h3>
              </div>
              <div className="lite-stat">
                <label>Repeat Customers</label>
                <h3>{ownerSummary.repeatCustomers || 0}</h3>
              </div>
              <div className="lite-stat">
                <label>Top Payment Method</label>
                <h3 style={{ textTransform: 'capitalize' }}>{String(ownerSummary.topPaymentMethod || 'n/a').replace('_', ' ')}</h3>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-chart-panel-grid">
        {/* Revenue Performance */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiMoneyDollarCircleLine /> Revenue Performance (Daily)</span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="payment_date" 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  tickFormatter={d => new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={v => `Rs.${v}`} />
                <Tooltip 
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [`Rs.${value.toLocaleString()}`, 'Revenue']}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="var(--primary)" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiArchiveLine /> Critical Inventory</span>
            <Link to="/inventory" className="btn-link">Restock <RiArrowRightLine /></Link>
          </div>
          <div className="stack" style={{ gap: 12 }}>
            {lowStock.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)', fontSize: '0.9rem' }}>Stock levels healthy</p>
            ) : lowStock.slice(0, 4).map(p => (
              <div key={p.part_id} className="lite-item">
                <div>
                  <p style={{ fontWeight: 700, fontSize: '0.875rem' }}>{p.part_name}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>PN: {p.part_number} · {p.supplier}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '0.9rem' }}>{p.quantity_in_stock}</p>
                  <p style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 700 }}>LEFT</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isOwner && (
        <div className="dashboard-two-col-grid">
          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title"><RiUserHeartLine /> Top Customers By Spend</span>
              <Link to="/customers" className="btn-link">Open directory <RiArrowRightLine /></Link>
            </div>
            <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
              <table className="data-table">
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th>Customer</th>
                    <th>Orders</th>
                    <th style={{ textAlign: 'right' }}>Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.length === 0 ? (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-light)' }}>No customer spend data yet</td></tr>
                  ) : topCustomers.map((customer) => (
                    <tr key={customer.customer_id} onClick={() => navigate(`/customers/${customer.customer_id}`)} style={{ cursor: 'pointer' }}>
                      <td>
                        <p style={{ fontWeight: 700, fontSize: '0.85rem' }}>{customer.customer_name}</p>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{customer.phone}</p>
                      </td>
                      <td style={{ fontWeight: 700 }}>{customer.total_orders}</td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                        Rs.{Math.round(parseFloat(customer.total_spent || 0)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card">
            <div className="section-card-header">
              <span className="section-card-title"><RiAwardLine /> Owner Notes</span>
              <span className="badge-pending" style={{ fontSize: '0.7rem' }}>FOCUS AREAS</span>
            </div>
            <div className="stack" style={{ gap: 14 }}>
              <div className="lite-item">
                <div>
                  <p style={{ fontWeight: 700 }}>Collections Risk</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    Pending collections currently total Rs.{Math.round(ownerSummary?.pendingCollections || 0).toLocaleString()}.
                  </p>
                </div>
              </div>
              <div className="lite-item">
                <div>
                  <p style={{ fontWeight: 700 }}>Margin Watch</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    Estimated month-to-date gross margin is Rs.{Math.round(ownerSummary?.estimatedGrossMargin || 0).toLocaleString()}.
                  </p>
                </div>
              </div>
              <div className="lite-item">
                <div>
                  <p style={{ fontWeight: 700 }}>Customer Retention</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-light)' }}>
                    {ownerSummary?.repeatCustomers || 0} repeat customers tracked so far with a retention rate of {ownerSummary?.retentionRate || 0}%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginTop: 24 }}>
        {/* Recent Orders Table */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiFileListLine /> Recent Orders</span>
            <Link to="/orders" className="btn-link">View all <RiArrowRightLine /></Link>
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 6).map(o => (
                  <tr key={o.order_id} onClick={() => navigate(`/orders/${o.order_id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 800 }}>#{o.order_id}</td>
                    <td style={{ fontSize: '0.82rem' }}>{o.customer_name}</td>
                    <td><div className={`badge badge-${o.status}`} style={{ fontSize: '0.65rem' }}>{o.status.replace('_', ' ')}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Services BI Card */}
        <div className="section-card">
          <div className="section-card-header">
            <span className="section-card-title"><RiAwardLine color="#D97706" /> Top Services (By Revenue)</span>
            <span className="badge-pending" style={{ fontSize: '0.7rem' }}>DBMS ANALYSIS VIEW</span>
          </div>
          <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
            <table className="data-table">
              <thead>
                <tr style={{ background: 'transparent' }}>
                  <th>Service</th>
                  <th>Orders</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topServices.map(s => (
                  <tr key={s.service_id}>
                    <td>
                      <p style={{ fontWeight: 700, fontSize: '0.82rem' }}>{s.service_name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>{s.category_name}</p>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.times_ordered}x</td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '0.82rem' }}>Rs.{(parseFloat(s.total_revenue) || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity Log Row */}
      <div className="section-card" style={{ marginTop: 24 }}>
        <div className="section-card-header">
          <span className="section-card-title"><RiHistoryLine /> System Activity (Audit Log)</span>
          <span className="badge-completed" style={{ fontSize: '0.7rem' }}>DBMS AUDIT FEATURE</span>
        </div>
        <div className="table-container" style={{ border: 'none', boxShadow: 'none' }}>
          <table className="data-table">
            <thead>
              <tr style={{ background: 'transparent' }}>
                <th>Operation</th>
                <th>Target Table</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-light)' }}>No activity recorded yet</td></tr>
              ) : auditLog.slice(0, 10).map(log => (
                <tr key={log.log_id}>
                  <td>
                    <span style={{ 
                      padding: '4px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800,
                      background: log.operation === 'INSERT' ? '#DBEAFE' : '#F1F5F9',
                      color: log.operation === 'INSERT' ? '#1E40AF' : '#475569'
                    }}>
                      {log.operation}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, fontSize: '0.85rem' }}>{log.table_name}</td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-body)', fontFamily: 'monospace' }}>
                    {log.new_values ? (
                      typeof log.new_values === 'string' 
                        ? log.new_values.substring(0, 60) 
                        : JSON.stringify(log.new_values).substring(0, 60)
                    ) : '---'}...
                  </td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>
                    {new Date(log.changed_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
