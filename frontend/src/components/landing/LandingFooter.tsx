const SOLUTIONS = [
  'Web scraper & extractor', 'Website to spreadsheet', 'Website monitoring',
  'Website to API', 'Prebuilt robots', 'Price monitoring',
  'Integrations', 'Web scraping services', 'Pricing',
];

const RESOURCES = [
  'Help center', 'API documentation', 'Trust center', 'Blog', 'Careers',
  'Contact us', 'Schedule a demo', 'About us', 'Media kit', 'Glossary',
];

const PARTNERS = ['Affiliate program', 'ITAD Intel for startups'];

const LEGAL = ['Privacy policy', 'Terms of service', 'Affiliate terms & conditions'];

const colHeader = { fontFamily: 'Space Grotesk', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', color: '#fff', marginBottom: 18, textTransform: 'uppercase' as const };
const linkStyle = { fontSize: '0.84rem', color: '#9ca3af', cursor: 'pointer', display: 'block', padding: '4px 0', textDecoration: 'none', transition: 'color 0.15s' };

function LinkList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map(i => (
        <li key={i}>
          <a href="#" style={linkStyle}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
            {i}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function LandingFooter() {
  return (
    <footer style={{ background: '#0f1923', padding: '60px 6% 28px', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 40, paddingBottom: 44 }}>
        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#1a9e57', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13 }}>I</div>
            <span style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.05rem' }}>
              ITAD<span style={{ color: '#1a9e57' }}>Intel</span>
            </span>
          </div>
          <p style={{ fontSize: '0.86rem', color: '#9ca3af', lineHeight: 1.7, maxWidth: 320 }}>
            Distributed web intelligence for IT Asset Disposition professionals. Find bids. Never miss a procurement.
          </p>
        </div>

        {/* Solutions */}
        <div>
          <div style={colHeader}>Solutions</div>
          <LinkList items={SOLUTIONS} />
        </div>

        {/* Resources */}
        <div>
          <div style={colHeader}>Resources</div>
          <LinkList items={RESOURCES} />
        </div>

        {/* Partners + Legal */}
        <div>
          <div style={colHeader}>Partners</div>
          <LinkList items={PARTNERS} />
          <div style={{ ...colHeader, marginTop: 26 }}>Legal</div>
          <LinkList items={LEGAL} />
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', borderTop: '1px solid #1f2937', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>© 2026 ITAD Intel Inc.</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {[
            { label: 'Instagram', icon: '📷' },
            { label: 'X', icon: '𝕏' },
            { label: 'LinkedIn', icon: 'in' },
          ].map(s => (
            <a key={s.label} href="#" aria-label={s.label}
              style={{ width: 32, height: 32, borderRadius: '50%', background: '#1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 14, textDecoration: 'none', transition: 'background 0.15s,color 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#1a9e57'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#1f2937'; e.currentTarget.style.color = '#9ca3af'; }}>
              {s.icon}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
