import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, TrackTabs } from '../components';
import { DrinksTab } from './DrinksTab';
import { MealsTab } from './MealsTab';
import { WeightTab } from './WeightTab';

type TrackTab = 'drinks' | 'meal' | 'weight';

function isTrackTab(value: string | null): value is TrackTab {
  return value === 'drinks' || value === 'meal' || value === 'weight';
}

// Track hub (design/Fluid.dc.html header and tabs). The tab lives in the URL (?tab=)
// so Home tiles can open the right one.
export default function Track() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: TrackTab = isTrackTab(requested) ? requested : 'drinks';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <PageHeader title="Track" />
      <Link
        to="/feel"
        style={{ minHeight: 88, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--color-coral-soft)', color: 'var(--color-ink)', textDecoration: 'none', border: '3px solid var(--color-coral)' }}
      >
        <span aria-hidden="true" style={{ width: 60, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-coral)', color: 'var(--color-ink)' }}>
          <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10} />
            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
            <path d="M9 9h.01" />
            <path d="M15 9h.01" />
          </svg>
        </span>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 'var(--text-title)', lineHeight: 'var(--lh-title)', fontWeight: 700 }}>How I feel</span>
          <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>Breathing, swelling, tiredness</span>
        </span>
        <span aria-hidden="true" style={{ width: 44, height: 44, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)' }}>
          <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </Link>
      <TrackTabs activeTab={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />
      <div role="tabpanel" aria-label={tab === 'drinks' ? 'Log drinks' : tab === 'meal' ? 'Scan meal' : 'Log weight'}>
        {tab === 'drinks' ? <DrinksTab /> : tab === 'meal' ? <MealsTab /> : <WeightTab />}
      </div>
    </div>
  );
}
