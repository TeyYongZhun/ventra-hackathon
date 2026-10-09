import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MetricsResponse } from '@ventra/core';
import { IconTile, StatusCard } from '../components';
import {
  AskAiIcon,
  CalendarIcon,
  DrinksIcon,
  FeelIcon,
  MealsIcon,
  MedicineIcon,
  ReportIcon,
  VisitPrepIcon,
  WeightIcon,
} from '../components/HomeIcons';
import { LoadError, Loading } from '../components/QueryState';
import { useMetrics } from '../lib/api';
import { calendarTile, dayHeading, greeting, pillsLeft, statusLine, streakText } from '../lib/copy';

// B1 · Home (design/Main.dc.html). Every number comes from GET /api/metrics.
export default function Home() {
  const metrics = useMetrics();

  if (metrics.isLoading) return <Loading />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} />;
  return <HomeView metrics={metrics.data} />;
}

function noteKey(today: string) {
  return `ventra.note.${today}`;
}

function noteSeen(today: string): boolean {
  try {
    return localStorage.getItem(noteKey(today)) === '1';
  } catch {
    return false;
  }
}

function HomeView({ metrics }: { metrics: MetricsResponse }) {
  const navigate = useNavigate();
  // The motivation note shows once a day: the first time Home opens that day.
  const [noteOpen, setNoteOpen] = useState(false);
  useEffect(() => {
    setNoteOpen(!noteSeen(metrics.today));
  }, [metrics.today]);

  function closeNote() {
    try {
      localStorage.setItem(noteKey(metrics.today), '1');
    } catch {
      // Storage blocked: the note will simply show again next time.
    }
    setNoteOpen(false);
  }

  const left = pillsLeft(metrics);
  const calendar = calendarTile(metrics.today);
  const isGreen = metrics.zone === 'green';

  // Screens not built yet open the closest existing page.
  const tiles = [
    { label: 'Drinks', bg: '#CFE6FC', icon: <DrinksIcon />, to: '/track?tab=drinks' },
    { label: 'Weight', bg: '#FBE3B4', icon: <WeightIcon />, to: '/track?tab=weight' },
    {
      label: 'Medicine',
      bg: '#FBD5CA',
      icon: <MedicineIcon />,
      to: '/medicine',
      badge: left > 0 ? left : undefined,
      ariaLabel: left > 0 ? `Medicine, ${left} pill${left === 1 ? '' : 's'} still to take today` : undefined,
    },
    { label: 'Meals', bg: '#CDEFD9', icon: <MealsIcon />, to: '/track?tab=meal' },
    { label: 'How I feel', bg: '#F9D3E3', icon: <FeelIcon />, to: '/feel' },
    { label: 'Ask AI', bg: '#DCDEFC', icon: <AskAiIcon />, to: '/ask' },
    {
      label: 'Calendar',
      bg: 'var(--color-surface)',
      icon: <CalendarIcon day={calendar.day} num={calendar.num} />,
      to: '/more',
      ariaLabel: `Calendar, today is ${dayHeading(metrics.today)}`,
    },
    { label: 'Visit prep', bg: '#C9EEE9', icon: <VisitPrepIcon />, to: '/more' },
    { label: 'My report', bg: '#D6DEF7', icon: <ReportIcon />, to: '/report' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <span style={{ fontSize: 18, lineHeight: '24px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>
          {dayHeading(metrics.today)}
        </span>
        <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>
          {greeting(new Date().getHours())}, {metrics.patient.name}
        </h1>
      </header>

      {isGreen ? (
        <StatusCard variant="green" chip="GREEN · ALL GOOD" headline="You're on track today" subText={statusLine(metrics)} />
      ) : (
        <StatusCard
          variant="yellow"
          chip="YELLOW · CALL TODAY"
          headline="Please call your nurse today"
          subText={
            <>
              <p style={{ margin: 0 }}>This can mean extra fluid in your body.</p>
              <ul style={{ margin: '8px 0 0', paddingLeft: 28 }}>
                {metrics.reasons.map((reason) => (
                  <li key={reason.chip}>{reason.chip}</li>
                ))}
              </ul>
            </>
          }
          footer={
            <Link
              to="/alert"
              style={{ minHeight: 'var(--touch-min)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: 'var(--color-yellow-ink)', textDecoration: 'none', fontSize: 21, fontWeight: 700 }}
            >
              What to do now
              <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          }
        />
      )}

      <nav
        aria-label="Go to"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '24px 8px',
          padding: '8px 0 12px',
        }}
      >
        {tiles.map((tile) => (
          <IconTile
            key={tile.label}
            label={tile.label}
            icon={tile.icon}
            bg={tile.bg}
            badge={tile.badge}
            ariaLabel={tile.ariaLabel}
            onClick={() => navigate(tile.to)}
          />
        ))}
      </nav>

      {noteOpen && <DailyNote text={streakText(metrics)} onClose={closeNote} />}
    </div>
  );
}

function DailyNote({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    // Sits above the bottom menu (40) but below the SOS button (50): SOS always stays reachable.
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        background: 'rgba(22,32,30,0.55)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-note-title"
        style={{
          width: '100%',
          maxWidth: 342,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 14,
          padding: '30px 24px 24px',
          borderRadius: 32,
          background: 'var(--color-butter)',
          color: 'var(--color-ink)',
          textAlign: 'center',
          boxShadow: 'var(--shadow-modal)',
          animation: 'vt-rise 360ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 84,
            height: 84,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--color-ink)',
          }}
        >
          <svg width={48} height={48} viewBox="0 0 24 24" fill="#F8DA98">
            <path d="M12 2c.6 4.8 2.4 7.2 10 10-7.6 2.8-9.4 5.2-10 10-.6-4.8-2.4-7.2-10-10 7.6-2.8 9.4-5.2 10-10z" />
          </svg>
        </span>
        <span style={{ fontSize: 16, lineHeight: '20px', fontWeight: 700, letterSpacing: '0.08em' }}>TODAY'S NOTE FOR YOU</span>
        <h2 id="daily-note-title" style={{ margin: 0, fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700, letterSpacing: '-0.015em' }}>
          You're doing so well!
        </h2>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>
          {text ? `${text} ` : ''}Every cup you measure and every pill you take keeps your heart strong.
        </p>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          style={{
            width: '100%',
            height: 'var(--touch-button)',
            marginTop: 6,
            borderRadius: 'var(--radius-pill)',
            border: 0,
            background: 'var(--color-ink)',
            color: 'var(--color-surface)',
            fontSize: 'var(--text-title)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Thank you!
        </button>
      </div>
    </div>
  );
}
