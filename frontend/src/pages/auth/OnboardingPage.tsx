import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';

interface Answers {
  firstName: string;
  lastName: string;
  hearAbout: string;
  company: string;
  agreeUpdates: boolean;
  workType: string;
  websiteCount: string;
  frequency: string;
  experience: string;
}

const TOTAL_STEPS = 5;

function RobotIcon({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: size, height: size, borderRadius: '50%', background: '#0f1923', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 5, position: 'absolute' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = (step / TOTAL_STEPS) * 100;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'var(--bg)', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #1a9e57 0%, #4ade80 100%)', transition: 'width 0.3s' }} />
    </div>
  );
}

const inputStyle = {
  width: '100%', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 14px', fontSize: '0.92rem', outline: 'none', fontFamily: 'DM Sans', color: 'var(--text)',
  boxSizing: 'border-box' as const,
};

function Step1({ answers, setAnswers, onNext }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void }) {
  const canContinue = answers.firstName.trim().length > 0;
  return (
    <>
      <div style={{ textAlign: 'center', marginBottom: 30 }}>
        <RobotIcon size={56} />
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em', marginTop: 22 }}>
          Create your free account to get started
        </h1>
      </div>
      <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 500, marginBottom: 6, display: 'block' }}>
              First name <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(required)</span>
            </label>
            <input value={answers.firstName} onChange={e => setAnswers({ ...answers, firstName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 500, marginBottom: 6, display: 'block' }}>Last name</label>
            <input value={answers.lastName} onChange={e => setAnswers({ ...answers, lastName: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 500, marginBottom: 6, display: 'block' }}>How did you hear about us?</label>
            <input value={answers.hearAbout} onChange={e => setAnswers({ ...answers, hearAbout: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '0.84rem', fontWeight: 500, marginBottom: 6, display: 'block' }}>Company name</label>
            <input value={answers.company} onChange={e => setAnswers({ ...answers, company: e.target.value })} style={inputStyle} />
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: '0.86rem', cursor: 'pointer', marginTop: 6 }}>
          <input type="checkbox" checked={answers.agreeUpdates} onChange={e => setAnswers({ ...answers, agreeUpdates: e.target.checked })}
            style={{ width: 16, height: 16, accentColor: '#1a9e57' }} />
          I'd like to receive tips, updates and offers.
          <span style={{ width: 14, height: 14, borderRadius: '50%', background: '#1a9e57', color: '#fff', fontSize: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>i</span>
        </label>

        <div style={{ fontSize: '0.79rem', color: 'var(--muted)' }}>
          By continuing, you agree with{' '}
          <a href="#" style={{ color: '#1a9e57' }}>terms of service</a> and{' '}
          <a href="#" style={{ color: '#1a9e57' }}>privacy policy</a>.
        </div>
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: 30 }}>
        <button onClick={onNext} disabled={!canContinue}
          style={{ padding: '11px 22px', background: canContinue ? '#1a9e57' : '#bbf7d0', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: canContinue ? 'pointer' : 'not-allowed', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          Agree and continue
          <span>›</span>
        </button>
      </div>
    </>
  );
}

function ChoiceStep({ title, options, value, onChange, onNext, onBack, columns = 3, finalStep = false }: {
  title: string;
  options: { key: string; icon: string; label: string; bg?: string }[];
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
  columns?: number;
  finalStep?: boolean;
}) {
  return (
    <>
      <div style={{ position: 'relative' }}>
        <button onClick={onBack} style={{ position: 'absolute', left: 0, top: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--text)', padding: 4 }}>←</button>
      </div>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <RobotIcon size={32} />
          <span style={{ color: '#1a9e57', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.08em' }}>PERSONALIZE YOUR EXPERIENCE</span>
        </div>
        <h1 style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: '1.55rem', letterSpacing: '-0.02em' }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 14, maxWidth: columns === 3 ? 760 : 760, margin: '0 auto' }}>
        {options.map(opt => {
          const selected = value === opt.key;
          return (
            <button key={opt.key} onClick={() => onChange(opt.key)}
              style={{ padding: '16px 18px', borderRadius: 10, border: `1.5px solid ${selected ? '#1a9e57' : 'var(--border)'}`, background: selected ? '#f0fdf4' : 'var(--bg2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between', transition: 'all 0.15s', boxShadow: selected ? '0 0 0 3px #e4f5ed' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {opt.icon && (
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: opt.bg ?? '#e4f5ed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                    {opt.icon}
                  </div>
                )}
                <span style={{ fontSize: '0.92rem', textAlign: 'left', fontWeight: 500, lineHeight: 1.4 }}
                  dangerouslySetInnerHTML={{ __html: opt.label }} />
              </div>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? '#1a9e57' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {selected && <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#1a9e57' }} />}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', paddingTop: 30 }}>
        <button onClick={onNext} disabled={!value}
          style={{ padding: '11px 32px', background: value ? '#1a9e57' : '#bbf7d0', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 700, cursor: value ? 'pointer' : 'not-allowed', fontSize: '0.88rem' }}>
          {finalStep ? 'Finish' : 'Continue'}
        </button>
      </div>
    </>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Answers>({
    firstName: '', lastName: '', hearAbout: '', company: '', agreeUpdates: true,
    workType: '', websiteCount: '', frequency: '', experience: '',
  });

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep(s => Math.max(s - 1, 1));

  const finish = async () => {
    try { await api.post('/auth/onboarding', answers); } catch { /* non-blocking */ }
    navigate('/app');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'DM Sans' }}>
      <div style={{ width: '100%', maxWidth: 880, background: 'var(--bg2)', borderRadius: 16, padding: '46px 44px 32px', minHeight: 480, position: 'relative', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <ProgressBar step={step} />

        {step === 1 && <Step1 answers={answers} setAnswers={setAnswers} onNext={next} />}

        {step === 2 && (
          <ChoiceStep
            title="What do you need web data for?"
            value={answers.workType}
            onChange={v => setAnswers({ ...answers, workType: v })}
            options={[
              { key: 'work-solo', icon: '👤', label: 'Work (just me)', bg: '#e4f5ed' },
              { key: 'work-team', icon: '👥', label: 'Work (with my team)', bg: '#dbeafe' },
              { key: 'personal', icon: '👤', label: 'Personal project', bg: '#fef3c7' },
            ]}
            onNext={next} onBack={back} columns={3}
          />
        )}

        {step === 3 && (
          <ChoiceStep
            title="How many websites do you plan to extract from or monitor?"
            value={answers.websiteCount}
            onChange={v => setAnswers({ ...answers, websiteCount: v })}
            options={[
              { key: '1-2', icon: '', label: '1 or 2 websites' },
              { key: '3-10', icon: '', label: '3 to 10 websites' },
              { key: '11-100', icon: '', label: '11 to 100 websites' },
              { key: '100+', icon: '', label: 'Over 100 websites' },
            ]}
            onNext={next} onBack={back} columns={2}
          />
        )}

        {step === 4 && (
          <ChoiceStep
            title="How often do you need this data?"
            value={answers.frequency}
            onChange={v => setAnswers({ ...answers, frequency: v })}
            options={[
              { key: 'ongoing', icon: '🖥️', label: 'I need ongoing extraction or monitoring.', bg: '#e4f5ed' },
              { key: 'one-time', icon: '📊', label: 'I need a one-time extraction.', bg: '#dbeafe' },
              { key: 'unsure', icon: '🔭', label: "I'm not sure yet.", bg: '#fef3c7' },
            ]}
            onNext={next} onBack={back} columns={1}
          />
        )}

        {step === 5 && (
          <ChoiceStep
            title="How would you prefer to extract or monitor this data?"
            value={answers.experience}
            onChange={v => setAnswers({ ...answers, experience: v })}
            options={[
              { key: 'new', icon: '🆕', label: 'I am <strong>new to web scraping</strong> and prefer to do it myself.', bg: '#e4f5ed' },
              { key: 'experienced', icon: '✋', label: 'I have <strong>experience with web scraping</strong> and prefer to do it myself.', bg: '#ede9fe' },
              { key: 'managed', icon: '🏆', label: 'I am open to <strong>paid expert setup</strong> or a <strong>fully managed</strong> solution.', bg: '#fef3c7' },
            ]}
            onNext={finish} onBack={back} columns={1} finalStep
          />
        )}
      </div>

      {/* Help bubble */}
      <div style={{ position: 'fixed', bottom: 20, right: 20, width: 44, height: 44, borderRadius: '50%', background: '#1a9e57', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>?</span>
      </div>
    </div>
  );
}
