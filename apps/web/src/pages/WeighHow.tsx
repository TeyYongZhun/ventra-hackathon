import { Link } from 'react-router-dom';
import { PageHeader } from '../components';
import { ReadAloudButton } from '../components/ReadAloudButton';

// C2a · How to weigh in (design/WeighHow.dc.html). Opened from "Weigh myself now".
// The design's "Use my Bluetooth scale" is left out: there is no scale connection yet.
const STEPS: Array<{ title: string; sub?: string }> = [
  { title: 'Use the toilet first' },
  { title: 'Before breakfast', sub: 'and before drinks and your morning pills' },
  { title: 'Light clothes, no shoes', sub: 'the same each day' },
  { title: 'Same scale, hard flat floor', sub: 'Not on a mat or carpet. Stand still and look straight ahead.' },
];

const INTRO = 'Weigh yourself the same way every morning, so each day can be compared.';
const SPOKEN = [INTRO, ...STEPS.map((step, i) => `${i + 1}. ${step.title}${step.sub ? `, ${step.sub}` : ''}.`)].join(' ');

export default function WeighHow() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* Title on its own line: next to back, read aloud and SOS it has no room on a phone. */}
      <PageHeader back={{ to: '/track?tab=weight', label: 'Back to weight' }} extra={<ReadAloudButton text={SPOKEN} />} />
      <h1 style={{ margin: 0, fontSize: 32, lineHeight: '38px', fontWeight: 700, letterSpacing: '-0.02em' }}>Morning weigh-in</h1>

      <p style={{ margin: 0, fontSize: 22, lineHeight: '32px' }}>{INTRO}</p>

      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {STEPS.map((step, i) => (
          <li key={step.title} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 18, borderRadius: 24, background: 'var(--color-surface)' }}>
            <span aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', fontSize: 26, fontWeight: 700 }}>
              {i + 1}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 22, lineHeight: '30px', fontWeight: 700 }}>{step.title}</span>
              {step.sub && <span style={{ fontSize: 19, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>{step.sub}</span>}
            </span>
          </li>
        ))}
      </ol>

      <Link to="/weigh" style={{ minHeight: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 24, fontWeight: 700 }}>
        I'm ready — type my weight
      </Link>
    </div>
  );
}
