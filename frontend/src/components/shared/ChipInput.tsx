import { useState, type KeyboardEvent } from 'react';

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxChips?: number;
};

/**
 * Compact chip-input. Adds chips on Enter/comma; removes via × button or Backspace
 * when the draft is empty.
 */
export function ChipInput({ value, onChange, placeholder, disabled, maxChips = 50 }: Props) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const cleaned = raw.trim().replace(/^,+|,+$/g, '').trim();
    if (!cleaned) return;
    if (value.length >= maxChips) return;
    if (value.includes(cleaned)) { setDraft(''); return; }
    onChange([...value, cleaned]);
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg2)',
        border: '1.5px solid var(--border)',
        borderRadius: 7,
        padding: '6px 8px',
        minHeight: 38,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {value.map((chip, i) => (
        <span
          key={`${chip}-${i}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--mint)',
            color: 'var(--green)',
            border: '1px solid #bbf7d0',
            borderRadius: 5,
            padding: '2px 6px 2px 8px',
            fontFamily: 'DM Mono',
            fontSize: '0.75rem',
            fontWeight: 600,
          }}
        >
          {chip}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label={`Remove ${chip}`}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--green)',
                cursor: 'pointer',
                padding: '0 2px',
                fontSize: '0.85rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={() => commit(draft)}
        disabled={disabled || value.length >= maxChips}
        placeholder={value.length === 0 ? placeholder : ''}
        style={{
          flex: 1,
          minWidth: 120,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '4px 2px',
          fontSize: '0.8rem',
          fontFamily: 'DM Mono',
          color: 'var(--text)',
        }}
      />
    </div>
  );
}
