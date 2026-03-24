import React, { useEffect, useState } from 'react';
import API from '../services/api';
import { useToast } from '../components/ToastProvider';
import { getApiError } from '../utils/apiErrors';
import { RiAddLine, RiCloseLine, RiTeamLine } from 'react-icons/ri';

const EMPTY_FORM = { username: '', password: '' };

function Receptionists() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await API.get('/auth/receptionists');
      setUsers(response.data || []);
    } catch (error) {
      toast.error(getApiError(error, 'Failed to load receptionists.').message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/auth/receptionists', form);
      toast.success('Receptionist account created.');
      setForm(EMPTY_FORM);
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to create receptionist.').message);
    }
  };

  const toggleStatus = async (user) => {
    try {
      await API.put(`/auth/receptionists/${user.user_id}/status`, { is_active: !user.is_active });
      toast.success(`Receptionist ${user.is_active ? 'deactivated' : 'activated'}.`);
      fetchUsers();
    } catch (error) {
      toast.error(getApiError(error, 'Failed to update receptionist.').message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Receptionist Accounts</h1>
          <p className="page-subtitle">Create and manage front-desk staff access</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <RiAddLine size={18} /> Add Receptionist
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5"><div className="loading-state" style={{ padding: '50px 0' }}><div className="spinner" /></div></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="5"><div className="empty-state"><RiTeamLine size={40} className="empty-state-icon" /><h3>No receptionist accounts</h3><p>Create the first receptionist login for your service center.</p></div></td></tr>
            ) : users.map((user) => (
              <tr key={user.user_id}>
                <td style={{ fontWeight: 700 }}>{user.username}</td>
                <td><span className={`badge ${user.is_active ? 'badge-completed' : 'badge-cancelled'}`}>{user.is_active ? 'active' : 'inactive'}</span></td>
                <td>{user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}</td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td><button className="btn btn-ghost" onClick={() => toggleStatus(user)}>{user.is_active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Receptionist</div>
              <button className="modal-close" onClick={() => setShowModal(false)}><RiCloseLine size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Username</label>
                <input value={form.username} onChange={(e) => setForm((current) => ({ ...current, username: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} required />
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" type="submit">Create Account</button>
                <button className="btn btn-ghost" type="button" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Receptionists;
