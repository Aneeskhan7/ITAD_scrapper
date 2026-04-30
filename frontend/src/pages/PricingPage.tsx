import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingFooter } from '@/components/landing/LandingFooter';

const PLANS = [
  {
    name: 'FREE',
    color: '#1a9e57',
    price: { annual: 'Free', monthly: 'Free' },
    sub: '',
    creditOptions: ['50', '100'],
    cta: 'Select plan',
    ctaStyle: 'outline',
    features: ['1 project', '5 websites', '5 concurrent agents', 'Tier 3 proxy pool (shared)', 'Basic keyword matching', 'DLQ dashboard (read-only)', '7-day job history'],
  },
  {
    name: 'PERSONAL',
    color: '#1a9e57',
    price: { annual: '$19', monthly: '$24' },
    sub: 'Per month, billed annually',
    creditOptions: ['12,000', '24,000', '48,000'],
    cta: 'Select plan',
    ctaStyle: 'outline',
    features: ['5 projects', '25 websites', '10 concurrent agents', 'Tier 2 + Tier 3 proxies', 'AI page classification', 'Full DLQ management', '30-day history', 'Email support'],
  },
  {
    name: 'PROFESSIONAL',
    color: '#1a9e57',
    price: { annual: '$129', monthly: '$159' },
    sub: 'Per month, billed annually',
    creditOptions: ['120,000', '240,000', '480,000'],
    popular: true,
    cta: 'Select plan',
    ctaStyle: 'primary',
    features: ['Unlimited projects', '100 websites', '20 concurrent agents', 'Tier 1 + Tier 2 proxies', 'Pattern learner', 'Priority queue', '90-day history + exports', 'Webhook alerts', 'API access', 'Priority email support'],
  },
  {
    name: 'PREMIUM',
    color: '#d97706',
    price: { annual: 'Starting at $500', monthly: 'Starting at $625' },
    sub: 'Per month, billed annually',
    creditOptions: ['600,000+'],
    cta: 'Book a call',
    ctaStyle: 'primary-amber',
    features: ['Custom limits on users, websites, agents', 'Dedicated infrastructure', 'Fully managed onboarding', 'Custom AI model fine-tuning', 'Data transformations', 'Compute budget controls', 'Dedicated Account Manager', 'SLA guarantee (99.9%)'],
  },
];

const COMPARISON_ROWS: { section: string; rows: { label: string; values: (string | boolean)[] }[] }[] = [
  {
    section: 'Core',
    rows: [
      { label: 'Robots / Crawlers', values: ['Unlimited', 'Unlimited', 'Unlimited', 'Unlimited'] },
      { label: 'Websites', values: ['5', '25', '100', 'Custom'] },
      { label: 'Users', values: ['1', '3', '10', 'Custom'] },
      { label: 'AI page classifier', values: [true, true, true, true] },
      { label: 'Live monitoring', values: [true, true, true, true] },
      { label: 'Deep crawling', values: [true, true, true, true] },
      { label: 'Access to all features', values: [true, true, true, true] },
    ],
  },
  {
    section: 'Add-ons',
    rows: [
      { label: 'Extra websites', values: ['N/A', '$4 / mo paid annually', '$2.4 / mo paid annually', 'Custom'] },
      { label: 'Extra credits', values: ['N/A', '$0.024 per credit on annual plans', '$0.017 to $0.013 per credit on annual plans', 'Custom'] },
    ],
  },
  {
    section: 'Integrations',
    rows: [
      { label: 'REST API', values: [true, true, true, true] },
      { label: 'Webhooks', values: [true, true, true, true] },
      { label: 'Zapier', values: [true, true, true, true] },
      { label: 'Make.com', values: [true, true, true, true] },
      { label: 'Google Sheets', values: [true, true, true, true] },
      { label: 'Airtable', values: [true, true, true, true] },
      { label: 'Pabbly Connect', values: [true, true, true, true] },
      { label: 'Amazon S3', values: [true, true, true, true] },
    ],
  },
  {
    section: 'Support',
    rows: [
      { label: 'Support level', values: ['Basic (Email)', 'Basic (Email)', 'Priority (Email)', 'Premium'] },
      { label: 'Fully managed onboarding', values: [false, false, false, true] },
      { label: 'Ongoing data management', values: [false, false, false, true] },
      { label: 'Data transformation', values: [false, false, false, true] },
      { label: 'Custom setup & configuration', values: [false, false, false, true] },
      { label: 'Dedicated Account Manager', values: [false, false, false, true] },
    ],
  },
  {
    section: 'Platform',
    rows: [
      { label: 'Data retention', values: ['7 days', '30 days', '90 days', 'Custom'] },
      { label: 'Max task execution time', values: ['10 minutes', '30 minutes', '60 minutes', 'Custom'] },
      { label: 'Minimum monitor frequency', values: ['Daily', 'Hourly', '5 minutes', 'Custom'] },
      { label: 'Residential proxies', values: [false, true, true, true] },
      { label: 'Captcha resolver', values: [false, true, true, true] },
    ],
  },
];

const FAQS = [
  { q: 'How can I get started?', a: 'Sign up for a free account in seconds. No credit card required. Add your first website and let the AI agents discover bid pages automatically.' },
  { q: 'Do I need to know how to code?', a: 'No. ITAD Intel is fully no-code. Paste a URL, set the depth, and the platform handles crawling, classification, and result delivery.' },
  { q: 'What is a Credit?', a: 'A credit equals one scraped page that goes through AI classification. Your monthly plan includes a credit pool, and you can purchase additional credits as needed.' },
  { q: 'What is a Robot (or Task)?', a: 'A Robot represents a single website you monitor. Each Robot can run on a schedule, crawl thousands of pages, and surface classified results into your dashboard.' },
  { q: 'Which sites does ITAD Intel support?', a: 'ITAD Intel works on the vast majority of public websites — government procurement portals, ITAD exchanges, surplus auctions, federal contract feeds, and enterprise RFP boards.' },
  { q: 'How do you make sure my data is secure?', a: 'All scraped data is encrypted at rest and in transit. Authentication uses JWT with short-lived access tokens. SOC 2 Type II compliance is in progress for Enterprise customers.' },
  { q: 'Can you charge me in my local currency?', a: 'Yes. ITAD Intel supports billing in USD, EUR, GBP, AUD, and CAD on annual Professional and Enterprise plans.' },
  { q: 'Do you offer any discounts?', a: 'Yes — annual plans receive a 20% discount and full credits upfront. Educational and non-profit organizations qualify for additional discounts.' },
  { q: 'What is the refund policy?', a: 'We offer a 14-day money-back guarantee on all paid plans. After that, you can cancel anytime; access remains until your billing cycle ends.' },
  { q: 'What if I have more questions?', a: 'Talk to our team. Book a call from the Resources menu or email support@itadintel.io and we\'ll get back to you within 24 hours.' },
];

const COMPANIES = ['Zapier', 'Google', 'METRO', 'salesforce', 'amazon', 'RE/MAX', 'RayWhite'];

function CheckIcon({ on }: { on: boolean }) {
  if (on) {
    return (
      <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: '50%', background: '#1a9e57', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </span>
    );
  }
  return <span style={{ color: 'var(--muted)', fontSize: 16 }}>—</span>;
}

export function PricingPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<'annual' | 'monthly'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedCredits, setSelectedCredits] = useState<Record<string, string>>({});

  return (
    <div style={{ background: 'var(--bg2)', minHeight: '100vh', fontFamily: 'DM Sans' }}>
      <LandingNav />

      {/* Heading */}
      <section style={{ padding: '60px 6% 40px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 'clamp(2.2rem, 4vw, 3rem)', letterSpacing: '-0.04em', marginBottom: 12 }}>
          Plans &amp; Pricing
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '1rem', marginBottom: 28 }}>Plans that scale with you.</p>

        {/* Annual toggle + interest line */}
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setBilling(billing === 'annual' ? 'monthly' : 'annual')}
              style={{ width: 38, height: 22, borderRadius: 11, background: billing === 'annual' ? '#1a9e57' : 'var(--border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, left: billing === 'annual' ? 19 : 3, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </button>
            <span style={{ fontSize: '0.92rem', fontWeight: 500 }}>Pay annual</span>
            <span style={{ background: '#e4f5ed', color: '#1a9e57', borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700 }}>20% discount &amp; all credits upfront</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Interested in managed services or higher limits? <a href="#premium" style={{ color: '#1a9e57', fontWeight: 600, textDecoration: 'none' }}>Check out our Premium Plan</a>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 6% 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, position: 'relative', alignItems: 'stretch' }}>
          {PLANS.map(p => {
            const isPopular = !!p.popular;
            const ctaBg = p.ctaStyle === 'primary' ? '#1a9e57' : p.ctaStyle === 'primary-amber' ? '#d97706' : '#1a9e57';
            const ctaColor = p.ctaStyle === 'outline' ? '#fff' : '#fff';
            return (
              <div key={p.name} style={{
                background: isPopular ? '#f0fdf4' : 'var(--bg2)',
                border: isPopular ? '2px solid #1a9e57' : '1.5px solid var(--border)',
                borderRadius: 16, padding: '24px 22px', position: 'relative', display: 'flex', flexDirection: 'column',
              }}>
                {isPopular && (
                  <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#1a9e57', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    Most popular
                  </div>
                )}
                <div style={{ textAlign: 'center', color: p.color, fontSize: '0.92rem', fontWeight: 700, letterSpacing: '0.04em', marginBottom: 14 }}>{p.name}</div>
                <div style={{ textAlign: 'center', marginBottom: 6 }}>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: p.price.annual.length > 8 ? '1.4rem' : '2.2rem', color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
                    {p.price[billing]}
                  </div>
                </div>
                <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 20, minHeight: 20 }}>
                  {p.sub || ' '}
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>Credits {billing === 'annual' ? 'per year' : 'per month'}</div>
                  <select value={selectedCredits[p.name] ?? p.creditOptions[0]} onChange={e => setSelectedCredits({ ...selectedCredits, [p.name]: e.target.value })}
                    style={{ width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: '0.86rem', fontFamily: 'DM Sans', color: 'var(--text)', cursor: 'pointer', outline: 'none' }}>
                    {p.creditOptions.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <button onClick={() => navigate(p.name === 'PREMIUM' ? '/login' : '/register')}
                  style={{ width: '100%', padding: '11px 0', background: ctaBg, border: 'none', borderRadius: 9, color: ctaColor, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', marginBottom: 18 }}>
                  {p.cta}
                </button>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, marginBottom: 10 }}>This plan includes:</div>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.features.map(f => (
                      <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4 }}>
                        <span style={{ color: '#1a9e57', flexShrink: 0, marginTop: 1 }}>
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.5 12L13 4.5" stroke="#1a9e57" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--muted)', marginTop: 18 }}>* Prices are in USD.</div>
      </section>

      {/* Premium banner */}
      <section id="premium" style={{ maxWidth: 1180, margin: '0 auto', padding: '0 6% 60px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0, border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ background: '#0f1923', color: '#fff', padding: '28px 26px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 800, fontSize: '1.7rem', letterSpacing: '-0.03em', marginBottom: 16 }}>Premium</div>
            <div style={{ fontSize: '0.86rem', color: '#9ca3af', lineHeight: 1.6, marginBottom: 22, flex: 1 }}>
              Fully managed and complex data extraction starting at $500 a month paid annually.
            </div>
            <button style={{ padding: '11px 20px', background: '#fff', border: 'none', borderRadius: 9, color: '#0f1923', fontWeight: 700, cursor: 'pointer', fontSize: '0.86rem' }}>
              Book a consultation call
            </button>
          </div>
          <div style={{ background: '#f7f8f5', padding: '28px 30px' }}>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.05rem', marginBottom: 18 }}>Managed web scraping extraction and management</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
              {[
                { icon: '⚡', title: 'Reliable data delivery at scale', desc: 'Get the data you need reliably and accurately at scale.' },
                { icon: '🛡️', title: 'Fully managed data pipelines', desc: 'Customized and accurate data pipelines designed for your needs — built and managed by our experts.' },
                { icon: '🚀', title: 'Get up and running in 10 days', desc: 'Rapid and accurate deployment by data extraction experts powered by ITAD Intel.' },
              ].map(b => (
                <div key={b.title}>
                  <div style={{ width: 32, height: 32, borderRadius: 7, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 10 }}>{b.icon}</div>
                  <div style={{ fontFamily: 'Space Grotesk', fontWeight: 600, fontSize: '0.92rem', marginBottom: 6 }}>{b.title}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>{b.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 6% 30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 30, alignItems: 'center', background: '#f7f8f5', border: '1px solid var(--border)', borderRadius: 14, padding: '24px 28px' }}>
          <div>
            <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.15rem', marginBottom: 8 }}>Built with security in mind.</div>
            <div style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>
              Discover how we safeguard your information with industry-leading practices and compliance certifications. Visit ITAD Intel's{' '}
              <a href="#" style={{ color: '#1a9e57', fontWeight: 500 }}>Trust Center</a> to request our SOC 2 report.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {[
              { label: 'SOC 2 - Type II', bg: '#dbeafe', color: '#1d4ed8' },
              { label: 'GDPR', bg: '#dcfce7', color: '#16a34a' },
              { label: 'CCPA', bg: '#fef3c7', color: '#d97706' },
            ].map(b => (
              <div key={b.label} style={{ textAlign: 'center' }}>
                <div style={{ width: 50, height: 50, borderRadius: '50%', background: b.bg, color: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, margin: '0 auto 6px', border: `2px solid ${b.color}` }}>
                  ✓
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logos */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 6% 60px' }}>
        <div style={{ background: '#f7f8f5', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 30, marginBottom: 14 }}>
            {COMPANIES.map(c => (
              <div key={c} style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.05rem', color: 'var(--muted)', opacity: 0.7 }}>{c}</div>
            ))}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--muted)' }}>
            Discover how 770,000+ individuals and teams are turning websites into live structured datasets using ITAD Intel.
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '0 6% 60px' }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {/* Plan headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: '1px solid var(--border)' }}>
            <div />
            {['Free', 'Personal', 'Professional', 'Premium'].map((n, i) => (
              <div key={n} style={{ background: i === 2 ? '#f0fdf4' : 'transparent', padding: '20px 14px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                <div style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1rem', color: i === 2 ? '#1a9e57' : 'var(--text)', marginBottom: 10 }}>{n}</div>
                <button onClick={() => navigate(n === 'Premium' ? '/login' : '/register')}
                  style={{ padding: '7px 16px', background: i === 2 ? '#1a9e57' : 'transparent', border: i === 2 ? 'none' : '1.5px solid var(--border)', borderRadius: 7, color: i === 2 ? '#fff' : 'var(--text)', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}>
                  {i === 0 ? 'Get started' : i === 3 ? 'Talk to sales' : 'Try for free'}
                </button>
              </div>
            ))}
          </div>

          {COMPARISON_ROWS.map(group => (
            <div key={group.section}>
              <div style={{ padding: '16px 22px 8px', fontSize: '0.84rem', fontWeight: 600, color: '#1a9e57', borderBottom: '1px solid var(--border)' }}>{group.section}</div>
              {group.rows.map((r, i) => (
                <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', borderBottom: i === group.rows.length - 1 ? 'none' : '1px solid var(--border)', alignItems: 'center', minHeight: 52 }}>
                  <div style={{ padding: '10px 22px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {r.label}
                    <span style={{ width: 14, height: 14, borderRadius: '50%', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--muted)' }}>i</span>
                  </div>
                  {r.values.map((v, idx) => (
                    <div key={idx} style={{ padding: '10px 14px', textAlign: 'center', fontSize: '0.82rem', color: typeof v === 'string' ? 'var(--text)' : 'inherit', background: idx === 2 ? '#f0fdf4' : 'transparent', borderLeft: '1px solid var(--border)', alignSelf: 'stretch', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {typeof v === 'boolean' ? <CheckIcon on={v} /> : <span style={{ lineHeight: 1.3 }}>{v}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 880, margin: '0 auto', padding: '20px 6% 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: 10 }}>Frequently Asked Questions</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.92rem' }}>Everything you need to know about ITAD Intel's pricing.</p>
        </div>
        <div style={{ borderTop: '1px solid var(--border)' }}>
          {FAQS.map((f, i) => (
            <div key={f.q} style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', padding: '20px 4px', background: 'none', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'DM Sans', color: 'var(--text)', textAlign: 'left' }}>
                <span>{f.q}</span>
                <span style={{ width: 22, height: 22, borderRadius: '50%', border: '1.5px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'transform 0.15s', transform: openFaq === i ? 'rotate(45deg)' : 'none', fontSize: 14, color: 'var(--muted)' }}>+</span>
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 4px 22px', fontSize: '0.88rem', color: 'var(--muted)', lineHeight: 1.7 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
