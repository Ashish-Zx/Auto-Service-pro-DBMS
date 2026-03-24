import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';

function CompanySettings() {
  const toast = useToast();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCompany = async () => {
      try {
        const response = await API.get('/auth/company');
        setCompany(response.data || null);
      } catch (error) {
        toast.error(getApiError(error, 'Failed to load company settings.').message);
      } finally {
        setLoading(false);
      }
    };
    loadCompany();
  }, []);

  if (loading) return <div className="loading-state"><div className="spinner" /></div>;
  if (!company) return <div className="empty-state"><h3>Company not found</h3></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Company Settings</h1>
          <p className="page-subtitle">Your service center identity and tenant access information</p>
        </div>
      </div>

      <div className="section-card">
        <div className="section-card-header">
          <span className="section-card-title">Service Center Profile</span>
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <div><strong>Name:</strong> {company.company_name}</div>
          <div><strong>Owner:</strong> {company.owner_name}</div>
          <div><strong>Company Code:</strong> <span style={{ fontWeight: 800, color: 'var(--primary)' }}>{company.company_code}</span></div>
          <div><strong>Status:</strong> {company.status}</div>
          <div><strong>Created:</strong> {new Date(company.created_at).toLocaleString()}</div>
          <div className="form-hint">Receptionists use the company code together with their own username and password to access this service center.</div>
        </div>
      </div>
    </div>
  );
}

export default CompanySettings;
