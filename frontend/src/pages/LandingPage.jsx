import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  RiCarLine,
  RiTeamLine,
  RiFileListLine,
  RiCalendarEventLine,
  RiCheckboxCircleLine,
  RiBuildingLine,
  RiArchiveLine,
  RiBarChartLine,
  RiMenuLine,
  RiCloseLine,
  RiArrowRightLine,
  RiShieldCheckLine,
  RiFlashlightLine,
  RiUserStarLine,
  RiStore2Line,
  RiLineChartLine,
} from 'react-icons/ri';
import styles from './LandingPage.module.css';

/* ── Data ──────────────────────────────────────── */

const FEATURES = [
  {
    icon: <RiStore2Line size={26} />,
    title: 'Owner Setup With Company Workspace',
    desc: 'Each garage starts with owner signup, a unique company code, and its own dedicated workspace.',
    large: true,
    dark: false,
  },
  {
    icon: <RiUserStarLine size={26} />,
    title: 'Receptionist Access Control',
    desc: 'Owners create receptionist accounts and control who can handle front-desk operations.',
    large: false,
    dark: true,
  },
  {
    icon: <RiCalendarEventLine size={26} />,
    title: 'Appointment Scheduling',
    desc: 'Run bookings, intake, and delivery planning from a calendar built for busy service centers.',
    large: false,
    dark: false,
  },
  {
    icon: <RiArchiveLine size={26} />,
    title: 'Inventory Risk Control',
    desc: 'Track stock, low-quantity risk, and parts movement before shortages affect revenue.',
    large: false,
    dark: false,
  },
  {
    icon: <RiFileListLine size={26} />,
    title: 'Reception Desk Workflow',
    desc: 'Create customers, register vehicles, open orders, and complete payments with fewer clicks.',
    large: false,
    dark: true,
  },
  {
    icon: <RiLineChartLine size={26} />,
    title: 'Owner Business Insights',
    desc: 'See revenue, top customers, collections, retention, and workshop performance in one place.',
    large: true,
    dark: false,
  },
];

const STEPS = [
  {
    num: '01',
    icon: <RiFlashlightLine size={22} />,
    title: 'Owner Creates the Service Center',
    desc: 'Sign up with your garage name, launch a dedicated company workspace, and get your company code.',
  },
  {
    num: '02',
    icon: <RiTeamLine size={22} />,
    title: 'Receptionist Starts Operations',
    desc: 'Owners create receptionist logins, and front-desk staff use the company code to work inside the right garage.',
  },
  {
    num: '03',
    icon: <RiBarChartLine size={22} />,
    title: 'Owner Tracks the Business',
    desc: 'Monitor orders, revenue, customer retention, low stock risk, and business growth from the dashboard.',
  },
];

const BAR_HEIGHTS = [38, 62, 48, 85, 58, 94, 72];

const MOCK_STATS = [
  { label: 'Revenue', val: '₹8.9L', color: '#4E7ED7' },
  { label: 'Repeat Clients', val: '95.8%', color: '#10B981' },
  { label: 'Collections', val: 'On Track', color: '#F59E0B' },
];

const MOCK_ACTIVITY = [
  { label: 'Owner added a receptionist login', time: 'just now', color: '#10B981' },
  { label: 'Low stock: Brake Pads', time: '5m ago', color: '#F59E0B' },
  { label: '3 front-desk appointments confirmed', time: '12m ago', color: '#4E7ED7' },
];

const ROLE_PANELS = [
  {
    icon: <RiBarChartLine size={22} />,
    title: 'For Owners',
    points: [
      'Track revenue, collections, and retention',
      'Create receptionist logins with company access control',
      'Review top customers, service trends, and stock risk',
    ],
  },
  {
    icon: <RiTeamLine size={22} />,
    title: 'For Receptionists',
    points: [
      'Log in with company code and start work immediately',
      'Handle customers, vehicles, bookings, orders, and payments',
      'Work inside the correct company database every time',
    ],
  },
];


const HERO_TICKER = [
  'Built for growing garages',
  'Premium customer experience',
  'Owner-first business clarity',
  'Receptionist speed without chaos',
  'Separate company workspaces',
  'Revenue, stock, and job visibility',
];

const COMPARISON = {
  before: [
    'Calls, notebooks, and WhatsApp threads control the day',
    'Owners ask for numbers and staff start guessing',
    'Receptionists jump between bookings, customers, parts, and payments manually',
    'Low stock and delayed jobs are noticed too late',
  ],
  after: [
    'One command center for bookings, jobs, payments, and workshop movement',
    'Owners open the dashboard and immediately see the business pulse',
    'Receptionists work faster with a cleaner, guided front-desk flow',
    'Critical stock, collections, and bottlenecks become visible before they hurt revenue',
  ],
};

/* ── Dashboard Mock ─────────────────────────────── */

function DashboardMock() {
  return (
    <div className={styles.mockWrapper}>
      <div className={styles.mockCard}>
        {/* Header row */}
        <div className={styles.mockHeader}>
          <div className={styles.mockDots}>
            <span /><span /><span />
          </div>
          <span className={styles.mockTitle}>Business Insight</span>
        </div>

        {/* Stat cells */}
        <div className={styles.mockStatRow}>
          {MOCK_STATS.map(s => (
            <div key={s.label} className={styles.mockStatCell}>
              <div className={styles.mockStatVal} style={{ color: s.color }}>{s.val}</div>
              <div className={styles.mockStatLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className={styles.mockChart}>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className={styles.mockBar}
              style={{ height: `${h}%`, '--bar-delay': `${i * 0.09}s` }}
            />
          ))}
        </div>

        {/* Activity feed */}
        <div className={styles.mockActivity}>
          {MOCK_ACTIVITY.map((a, i) => (
            <div key={i} className={styles.mockActivityRow}>
              <span className={styles.mockDot} style={{ background: a.color }} />
              <span className={styles.mockActivityLabel}>{a.label}</span>
              <span className={styles.mockActivityTime}>{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating notification cards */}
      <div className={styles.mockFloatCard} style={{ top: '-16px', right: '-12px' }}>
        <RiCarLine size={16} style={{ color: '#4E7ED7' }} />
        <span>+45 vehicles today</span>
      </div>
      <div className={styles.mockFloatCard} style={{ bottom: '12px', left: '12px' }}>
        <RiShieldCheckLine size={16} style={{ color: '#10B981' }} />
        <span>Order #1042 Completed</span>
      </div>
    </div>
  );
}

/* ── LandingPage ────────────────────────────────── */

function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={styles.page}>

      {/* ── Navbar ── */}
      <nav className={`${styles.navbar} ${scrolled ? styles.navbarScrolled : ''}`}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <span className={styles.navBrandIcon}><RiCarLine size={20} /></span>
            Garage Pilot
          </div>

          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#roles">Roles</a>
            <a href="#how-it-works">How It Works</a>
          </div>

          <Link to="/login" className={styles.navCta}>Owner Setup / Login →</Link>

          <button
            className={styles.navMobileToggle}
            onClick={() => setMobileMenu(prev => !prev)}
            aria-label="Toggle menu"
          >
            {mobileMenu ? <RiCloseLine size={20} /> : <RiMenuLine size={20} />}
          </button>
        </div>

        {mobileMenu && (
          <div className={styles.mobileMenu}>
            <a href="#features" onClick={() => setMobileMenu(false)}>Features</a>
            <a href="#roles" onClick={() => setMobileMenu(false)}>Roles</a>
            <a href="#how-it-works" onClick={() => setMobileMenu(false)}>How It Works</a>
            <Link to="/login" onClick={() => setMobileMenu(false)}>Owner Setup / Login →</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>

          {/* Left: Text */}
          <div className={styles.heroText}>
            <div className={styles.heroTag}>
              <RiShieldCheckLine size={13} />
              For garages that want premium operations and sharper business control
            </div>

            <h1 className={styles.heroHeadline}>
              Turn daily workshop chaos<br />
              <span className={styles.heroAccent}>into a premium service business</span>
            </h1>

            <p className={styles.heroSub}>
              Garage Pilot is the operating system for ambitious service centers. Run front-desk activity faster, make the workshop feel more professional, and give owners a live read on revenue, customer value, collections, and stock risk.
            </p>

            <div className={styles.heroCtas}>
              <Link to="/login" className={styles.ctaPrimary}>
                Launch Your Workspace <RiArrowRightLine size={17} />
              </Link>
              <a href="#features" className={styles.ctaSecondary}>
                Explore the Platform
              </a>
            </div>

          </div>

          {/* Right: Visual */}
          <div className={styles.heroVisual}>
            <DashboardMock />
          </div>
        </div>
      </section>

      <section className={styles.tickerBand}>
        <div className={styles.tickerTrack}>
          {[...HERO_TICKER, ...HERO_TICKER].map((item, index) => (
            <span key={`${item}-${index}`} className={styles.tickerItem}>{item}</span>
          ))}
        </div>
      </section>

      {/* ── Stats Strip ── */}
      <section className={styles.statsStrip}>
        {[
          { num: 'Front Desk', label: 'Move faster from booking to billing' },
          { num: 'Owner View', label: 'See live business signals without asking around' },
          { num: 'Separate DB', label: 'Every company stays protected in its own workspace' },
          { num: 'Live Ops', label: 'Catch stock, payment, and job issues before they grow' },
        ].map((s, i) => (
          <div key={i} className={styles.statItem}>
            <span className={styles.statNum}>{s.num}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </section>

      <section className={styles.comparisonSection}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2>Your garage should feel premium before the customer even reaches the counter</h2>
            <p>Garage Pilot is not just record-keeping. It changes how the business runs, how the team moves, and how professional the service center feels.</p>
          </div>
          <div className={styles.comparisonGrid}>
            <div className={styles.comparisonCard}>
              <div className={styles.comparisonBadge}>Without Garage Pilot</div>
              <h3>Busy day. Scattered system.</h3>
              <div className={styles.comparisonList}>
                {COMPARISON.before.map((item) => (
                  <div key={item} className={styles.comparisonItem}>
                    <span className={styles.comparisonDot} />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className={`${styles.comparisonCard} ${styles.comparisonCardActive}`}>
              <div className={`${styles.comparisonBadge} ${styles.comparisonBadgeActive}`}>With Garage Pilot</div>
              <h3>Clean flow. Faster team. Stronger business.</h3>
              <div className={styles.comparisonList}>
                {COMPARISON.after.map((item) => (
                  <div key={item} className={styles.comparisonItem}>
                    <RiCheckboxCircleLine size={18} />
                    <p>{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features} id="features">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2>Everything your garage needs to look sharper and run smarter</h2>
            <p>Operational speed for the team. Business clarity for the owner. A more premium experience for the customer.</p>
          </div>

          <div className={styles.bentoGrid}>
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={[
                  styles.bentoCard,
                  f.dark ? styles.bentoDark : '',
                  f.large ? styles.bentoLarge : '',
                ].join(' ')}
              >
                <div className={`${styles.bentoIcon} ${f.dark ? styles.bentoIconDark : ''}`}>
                  {f.icon}
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.roles} id="roles">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2>Two focused modes built for how real garages work</h2>
            <p>One platform, two clear experiences, zero confusion about who sees what.</p>
          </div>
          <div className={styles.roleGrid}>
            {ROLE_PANELS.map((panel) => (
              <div key={panel.title} className={styles.roleCard}>
                <div className={styles.roleIcon}>{panel.icon}</div>
                <h3>{panel.title}</h3>
                <div className={styles.roleList}>
                  {panel.points.map((point) => (
                    <p key={point}>{point}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <h2>Launch fast, operate clean, grow with numbers</h2>
            <p>The setup is simple. The daily workflow is faster. The business insight gets stronger every day.</p>
          </div>

          <div className={styles.steps}>
            {STEPS.map((s, i) => (
              <div key={i} className={styles.step}>
                <div className={styles.stepNum}>{s.num}</div>
                <div className={styles.stepIcon}>{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Band ── */}
      <section className={styles.ctaBand}>
        <div className={styles.ctaBandInner}>
          <h2>Give your garage the system it should have had from day one</h2>
          <p>Create the owner workspace, issue receptionist access, and run the business like a premium modern service center.</p>
          <Link to="/login" className={styles.ctaPrimary}>
            Start With Garage Pilot <RiArrowRightLine size={17} />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerBrandIcon}><RiCarLine size={18} /></span>
            Garage Pilot
          </div>
          <p className={styles.footerCopy}>© 2026 Garage Pilot. Built for multi-tenant garage operations.</p>
        </div>
      </footer>

    </div>
  );
}

export default LandingPage;
