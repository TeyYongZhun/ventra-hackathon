import { useState } from 'react';
import {
  SOSButton,
  StatusCard,
  IconTile,
  TrackTabs,
  BottomNav,
  ConfirmBox,
  LockedSwitch,
  ExpandCard,
} from '../components';

export default function Gallery() {
  const [trackTab, setTrackTab] = useState<'drinks' | 'meal' | 'weight'>('drinks');
  const [navTab, setNavTab] = useState<'home' | 'track' | 'ask' | 'medicine' | 'more'>('home');

  return (
    <div
      style={{
        maxWidth: 480,
        margin: '0 auto',
        padding: '28px 20px 120px',
        display: 'flex',
        flexDirection: 'column',
        gap: 36,
        background: 'var(--color-canvas)',
        color: 'var(--color-ink)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700 }}>
        Component Gallery
      </h1>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          SOSButton
        </h2>
        <SOSButton />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          StatusCard
        </h2>
        <StatusCard
          variant="green"
          headline="Green · You're on track"
          subText="All good, keep it up"
        />
        <StatusCard
          variant="yellow"
          headline="Yellow · Call the nurse today"
          subText="Warning — something to check"
        />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          IconTile
        </h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <IconTile
            icon={
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />
              </svg>
            }
            label="Drinks"
            bg="var(--color-sky)"
          />
          <IconTile
            icon={
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x={3} y={3} width={18} height={18} rx={4} />
                <path d="M7.5 10a6 6 0 0 1 9 0" />
                <path d="m12 10 1.6-2.2" />
              </svg>
            }
            label="Weight"
            bg="var(--color-butter)"
            badge={2}
          />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          TrackTabs
        </h2>
        <TrackTabs activeTab={trackTab} onChange={setTrackTab} />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          BottomNav
        </h2>
        <div style={{ position: 'relative', paddingBottom: 8 }}>
          <BottomNav activeTab={navTab} onChange={setNavTab} />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          ConfirmBox
        </h2>
        <div
          style={{
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            border: '2px solid var(--color-line)',
          }}
        >
          <ConfirmBox
            title="Call 995 now?"
            message="An ambulance will come to you. We will tell them where you are and about your heart."
            primaryAction={{ label: 'Yes, call 995', onClick: () => {} }}
            secondaryAction={{ label: 'No, go back', onClick: () => {} }}
          />
        </div>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          LockedSwitch
        </h2>
        <LockedSwitch label="Family sharing" />
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700 }}>
          ExpandCard
        </h2>
        <ExpandCard
          title="Medicine details"
          icon={
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
          }
          defaultOpen={false}
        >
          <p style={{ margin: 0 }}>
            Take one tablet every morning with food. Do not skip doses.
          </p>
        </ExpandCard>
        <ExpandCard
          title="What this means"
          defaultOpen={true}
        >
          <p style={{ margin: 0 }}>
            Your weight, drinks and medicine are on track. Your heart is doing well today.
          </p>
        </ExpandCard>
      </section>
    </div>
  );
}
