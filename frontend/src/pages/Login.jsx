import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import { getApiError } from '../utils/apiErrors';
import {
  RiArrowLeftLine,
  RiBuildingLine,
  RiCarLine,
  RiEyeLine,
  RiEyeOffLine,
  RiLockLine,
  RiShieldUserLine,
  RiUserLine,
  RiTeamLine,
} from 'react-icons/ri';
import styles from './Login.module.css';

const INITIAL_OWNER_SIGNUP = { company_name: '', owner_name: '', username: '', password: '' };
const INITIAL_OWNER_LOGIN = { username: '', password: '' };
const INITIAL_RECEPTIONIST_LOGIN = { company_code: '', username: '', password: '' };

const MODE_META = {
  'owner-signup': {
    eyebrow: 'New owner workspace',
    title: 'Create your workspace',
    desc: 'Launch a new service center, generate a company code, and set up the owner account.',
  },
  'owner-login': {
    eyebrow: 'Owner access',
    title: 'Welcome back, owner',
    desc: 'Open the business dashboard, receptionist controls, and company settings.',
  },
  'receptionist-login': {
    eyebrow: 'Front desk access',
    title: 'Receptionist sign in',
    desc: 'Use the company code, username, and password to enter your workspace.',
  },
};

function Login({ onLogin }) {
  const [mode, setMode] = useState('owner-signup');
  const [ownerSignup, setOwnerSignup] = useState(INITIAL_OWNER_SIGNUP);
  const [ownerLogin, setOwnerLogin] = useState(INITIAL_OWNER_LOGIN);
  const [receptionistLogin, setReceptionistLogin] = useState(INITIAL_RECEPTIONIST_LOGIN);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (setter, field) => (e) =>
    setter((current) => ({ ...current, [field]: e.target.value }));

  const changeRole = (role) => {
    setMode(role === 'owner' ? 'owner-signup' : 'receptionist-login');
    setError('');
    setInfo('');
  };

  const changeOwnerSubtab = (value) => {
    setMode(value);
    setError('');
    setInfo('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');
    try {
      if (mode === 'owner-signup') {
        const { data } = await API.post('/auth/owner/signup', ownerSignup);
        onLogin(data.token, data.user);
        setInfo(`Company created. Receptionists will use code ${data.companyCode}.`);
      } else if (mode === 'owner-login') {
        const { data } = await API.post('/auth/owner/login', ownerLogin);
        onLogin(data.token, data.user);
      } else {
        const payload = {
          ...receptionistLogin,
          company_code: receptionistLogin.company_code.toUpperCase(),
        };
        const { data } = await API.post('/auth/receptionist/login', payload);
        onLogin(data.token, data.user);
      }
    } catch (err) {
      setError(getApiError(err, 'Authentication failed.').message);
    } finally {
      setLoading(false);
    }
  };

  const isOwner       = mode === 'owner-signup' || mode === 'owner-login';
  const isOwnerSignup = mode === 'owner-signup';
  const isOwnerLogin  = mode === 'owner-login';
  const isReceptionist = mode === 'receptionist-login';
  const meta = MODE_META[mode];

  const activeOwnerForm = isOwnerSignup ? ownerSignup : ownerLogin;

  const submitLabel = loading
    ? 'Working…'
    : isOwnerSignup
    ? 'Create Service Center'
    : isOwnerLogin
    ? 'Sign In as Owner'
    : 'Sign In as Receptionist';

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.backLink}>
        <RiArrowLeftLine size={14} /> Back to Home
      </Link>

      <div className={styles.card}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <RiCarLine size={24} color="white" />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>Garage Pilot</span>
            <span className={styles.brandSub}>Secure multi-tenant workspace</span>
          </div>
        </div>

        {/* Role tabs */}
        <div className={styles.roleTabs}>
          <button
            type="button"
            className={`${styles.roleTab} ${isOwner ? styles.roleTabActive : ''}`}
            onClick={() => changeRole('owner')}
          >
            <RiShieldUserLine size={16} /> Owner
          </button>
          <button
            type="button"
            className={`${styles.roleTab} ${isReceptionist ? styles.roleTabActive : ''}`}
            onClick={() => changeRole('receptionist')}
          >
            <RiTeamLine size={16} /> Receptionist
          </button>
        </div>

        {/* Owner sub-tabs */}
        {isOwner && (
          <div className={styles.ownerSubtabs}>
            <button
              type="button"
              className={`${styles.ownerSubtab} ${isOwnerSignup ? styles.ownerSubtabActive : ''}`}
              onClick={() => changeOwnerSubtab('owner-signup')}
            >
              Create workspace
            </button>
            <button
              type="button"
              className={`${styles.ownerSubtab} ${isOwnerLogin ? styles.ownerSubtabActive : ''}`}
              onClick={() => changeOwnerSubtab('owner-login')}
            >
              Sign in
            </button>
          </div>
        )}

        {/* Context heading */}
        <div className={styles.eyebrow}>{meta.eyebrow}</div>
        <h1 className={styles.heading}>{meta.title}</h1>
        <p className={styles.subText}>{meta.desc}</p>

        {/* Banners */}
        {error && <div className={styles.errorBanner}>{error}</div>}
        {info  && <div className={styles.infoBanner}>{info}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isOwnerSignup && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Garage / Service Center Name</label>
                <div className={styles.fieldWrap}>
                  <span className={styles.fieldIcon}><RiBuildingLine size={16} /></span>
                  <input
                    className={styles.field}
                    required
                    placeholder="Ashish Auto Care"
                    value={ownerSignup.company_name}
                    onChange={update(setOwnerSignup, 'company_name')}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Owner Full Name</label>
                <div className={styles.fieldWrap}>
                  <span className={styles.fieldIcon}><RiShieldUserLine size={16} /></span>
                  <input
                    className={styles.field}
                    required
                    placeholder="Ashish Shah"
                    value={ownerSignup.owner_name}
                    onChange={update(setOwnerSignup, 'owner_name')}
                  />
                </div>
              </div>
            </>
          )}

          {(isOwnerSignup || isOwnerLogin) && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Owner Username</label>
              <div className={styles.fieldWrap}>
                <span className={styles.fieldIcon}><RiUserLine size={16} /></span>
                <input
                  className={styles.field}
                  required
                  placeholder="owner_login"
                  value={activeOwnerForm.username}
                  onChange={
                    isOwnerSignup
                      ? update(setOwnerSignup, 'username')
                      : update(setOwnerLogin, 'username')
                  }
                />
              </div>
            </div>
          )}

          {isReceptionist && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Company Code</label>
                <div className={styles.fieldWrap}>
                  <span className={styles.fieldIcon}><RiBuildingLine size={16} /></span>
                  <input
                    className={styles.field}
                    required
                    placeholder="GAR-AB12CD"
                    value={receptionistLogin.company_code}
                    onChange={update(setReceptionistLogin, 'company_code')}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Receptionist Username</label>
                <div className={styles.fieldWrap}>
                  <span className={styles.fieldIcon}><RiUserLine size={16} /></span>
                  <input
                    className={styles.field}
                    required
                    placeholder="frontdesk1"
                    value={receptionistLogin.username}
                    onChange={update(setReceptionistLogin, 'username')}
                  />
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div className={styles.formGroup} style={{ marginBottom: 20 }}>
            <label className={styles.label}>Password</label>
            <div className={styles.fieldWrap}>
              <span className={styles.fieldIcon}><RiLockLine size={16} /></span>
              <input
                className={styles.field}
                type={showPass ? 'text' : 'password'}
                required
                placeholder="••••••••"
                style={{ paddingRight: 44 }}
                value={
                  isOwnerSignup
                    ? ownerSignup.password
                    : isOwnerLogin
                    ? ownerLogin.password
                    : receptionistLogin.password
                }
                onChange={
                  isOwnerSignup
                    ? update(setOwnerSignup, 'password')
                    : isOwnerLogin
                    ? update(setOwnerLogin, 'password')
                    : update(setReceptionistLogin, 'password')
                }
              />
              <button
                type="button"
                className={styles.fieldToggle}
                onClick={() => setShowPass((prev) => !prev)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <RiEyeOffLine size={17} /> : <RiEyeLine size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submit} disabled={loading}>
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
