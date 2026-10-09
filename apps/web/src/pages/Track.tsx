import { useSearchParams } from 'react-router-dom';
import { TrackTabs } from '../components';
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
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>
        Track
      </h1>
      <TrackTabs activeTab={tab} onChange={(next) => setParams({ tab: next }, { replace: true })} />
      <div role="tabpanel" aria-label={tab === 'drinks' ? 'Log drinks' : tab === 'meal' ? 'Log meals' : 'Log weight'}>
        {tab === 'drinks' ? <DrinksTab /> : tab === 'meal' ? <MealsTab /> : <WeightTab />}
      </div>
    </div>
  );
}
