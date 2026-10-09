import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Report as ReportData } from '@ventra/core';
import { PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { WeightChart } from '../components/WeightChart';
import { useReport } from '../lib/api';
import { dayHeading, ml as num } from '../lib/copy';

// F2 · My report (design/Report.dc.html): ready banner, preview card, what's inside, Download PDF.
// F2a · Doctor report (design/DoctorReport.dc.html) at /report/full: the A4 sheet that prints.
// Every number comes from GET /api/report, built by the same core functions as Home and Medicine.
// "Send to my clinic" is left out: there is no clinic connection yet.
const header = <PageHeader back={{ to: '/more', label: 'Back' }} title="My report" />;
const fullHeader = <PageHeader back={{ to: '/report', label: 'Back to my report' }} title="Doctor report" titleSize={32} />;

export default function Report() {
  const report = useReport();
  if (report.isLoading) return <Loading what="your report" header={header} />;
  if (report.isError || !report.data) return <LoadError onRetry={() => report.refetch()} header={header} />;
  return <ReportSummary report={report.data} />;
}

export function ReportFull() {
  const report = useReport();
  if (report.isLoading) return <Loading what="your report" header={fullHeader} />;
  if (report.isError || !report.data) return <LoadError onRetry={() => report.refetch()} header={fullHeader} />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div data-noprint style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {fullHeader}
        <PrintButton />
      </div>
      <ReportSheet report={report.data} />
    </div>
  );
}

function shortDate(iso: string): string {
  return dayHeading(iso).replace(/^\w+, /, '');
}

const cell = { padding: '8px 10px', borderBottom: '1px solid #D9D5CC', textAlign: 'left' as const, verticalAlign: 'top' as const };
const head = { ...cell, borderBottom: '1.5px solid var(--color-ink)', fontSize: 15, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };

function ReportSummary({ report }: { report: ReportData }) {
  const { patient, targets, adherence, period } = report;
  const goingUp = report.weightChange != null && report.weightChange >= targets.alertGainKg;
  const inside = [
    'Weight trend and daily log',
    'Medicines and missed doses',
    'Drinks and salt',
    'How I felt and any alerts',
    'My targets from the care team',
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div data-noprint style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {header}

        <section style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 24, background: 'var(--color-green-soft)', border: '3px solid var(--color-green)' }}>
          <span aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-green)', color: 'var(--color-surface)' }}>
            <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>Your report is ready</span>
            <span style={{ fontSize: 19, lineHeight: '26px' }}>{rangeText(period.from, period.to)}</span>
          </span>
        </section>

        <Link to="/report/full" aria-label="Open the full report" style={{ display: 'block', padding: '6px 4px', color: 'var(--color-ink)', textDecoration: 'none' }}>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20, borderRadius: 16, background: 'var(--color-surface)', boxShadow: '0 14px 30px rgba(22,32,30,0.14), 0 0 0 1px #E3DFD6', transform: 'rotate(-1.5deg)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)' }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#16201E" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
              </span>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>Ventra</span>
              <span style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{shortDate(report.today)} {report.today.slice(0, 4)}</span>
            </span>
            <span style={{ fontSize: 22, lineHeight: '27px', fontWeight: 700, paddingBottom: 8, borderBottom: '2px solid var(--color-ink)' }}>Heart failure self-care summary</span>
            <span style={{ fontSize: 16, lineHeight: '22px', color: 'var(--color-ink-muted)' }}>{patient.name}{patient.age ? ` · ${patient.age}` : ''}</span>
            <span style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              <MiniKey
                label="Weight"
                value={report.weightToday != null ? `${report.weightToday.toFixed(1)} kg` : '—'}
                sub={report.weightToday != null ? (goingUp ? 'Going up' : 'Steady') : ''}
                subStyle={{ color: goingUp ? 'var(--color-yellow-ink)' : 'var(--color-green)', fontWeight: 700 }}
              />
              <MiniKey label="Medicine" value={`${adherence.pct}%`} sub={`${adherence.text} taken`} />
              <MiniKey label="Drinks" value={`${report.fluidDays.ok} of ${report.fluidDays.of}`} sub="days in limit" />
              <MiniKey label="Salt today" value={`${num(report.sodiumToday)} mg`} sub={targets.sodiumMg ? `of ${num(targets.sodiumMg)} mg` : ''} />
            </span>
            <Spark weights={report.weights.map((w) => w.kg)} dryKg={targets.dryKg} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 17, fontWeight: 700, color: 'var(--color-blue-ink)' }}>
              See the full report
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </span>
          </span>
        </Link>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 20, borderRadius: 24, background: 'var(--color-surface)' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>What's inside</h2>
          {inside.map((item) => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 52, borderTop: '2px solid var(--color-line)' }}>
              <svg style={{ flexShrink: 0, color: 'var(--color-green)' }} width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              <span style={{ fontSize: 20, lineHeight: '26px', fontWeight: 600 }}>{item}</span>
            </div>
          ))}
        </section>

        <PrintButton />

        <Link to="/privacy" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, fontSize: 19, lineHeight: '26px', color: 'var(--color-ink-muted)', textDecoration: 'none' }}>
          <svg style={{ flexShrink: 0 }} width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x={3} y={11} width={18} height={11} rx={2} />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>Only you and the people you choose can see this report.</span>
        </Link>
      </div>

      {/* The A4 sheet is what Download PDF prints; on screen it lives at /report/full. */}
      <div className="print-only">
        <ReportSheet report={report} />
      </div>
    </div>
  );
}

// "Download PDF": the phone's print dialog, where "Save as PDF" is one of the choices.
function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-blue)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 25, fontWeight: 700, cursor: 'pointer' }}
    >
      <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></svg>
      Download PDF
    </button>
  );
}

function MiniKey({ label, value, sub, subStyle }: { label: string; value: string; sub: string; subStyle?: CSSProperties }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', padding: '10px 12px', borderRadius: 10, background: 'var(--color-canvas)' }}>
      <span style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{label}</span>
      <span style={{ fontSize: 21, lineHeight: '26px', fontWeight: 700 }}>{value}</span>
      {sub && <span style={{ fontSize: 14, color: 'var(--color-ink-muted)', ...subStyle }}>{sub}</span>}
    </span>
  );
}

// Small weight line for the preview card; the dashed line is the dry weight.
function Spark({ weights, dryKg }: { weights: number[]; dryKg: number }) {
  if (weights.length < 2) return null;
  const lo = Math.min(...weights, dryKg > 0 ? dryKg : Infinity) - 0.3;
  const hi = Math.max(...weights) + 0.3;
  const y = (kg: number) => 6 + ((hi - kg) / (hi - lo)) * 44;
  const x = (i: number) => 10 + (i * 250) / (weights.length - 1);
  const points = weights.map((kg, i) => `${x(i).toFixed(0)},${y(kg).toFixed(0)}`).join(' ');
  return (
    <svg width="100%" viewBox="0 0 270 56" aria-hidden="true" style={{ display: 'block' }}>
      {dryKg > 0 && <line x1={0} y1={y(dryKg)} x2={270} y2={y(dryKg)} stroke="#8C877B" strokeWidth={1.5} strokeDasharray="4 4" />}
      <polyline points={points} fill="none" stroke="#1F6FB2" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={260} cy={y(weights[weights.length - 1]!)} r={5} fill="#1F6FB2" />
    </svg>
  );
}

// "1 to 7 October", or "28 September to 4 October" across months.
function rangeText(from: string, to: string): string {
  const [a, b] = [shortDate(from), shortDate(to)];
  const [aDay, aMonth] = a.split(' ');
  return aMonth === b.split(' ')[1] ? `${aDay} to ${b}` : `${a} to ${b}`;
}

function ReportSheet({ report }: { report: ReportData }) {
  const { patient, targets, adherence, period } = report;
  const periodText = `${shortDate(period.from)} – ${shortDate(period.to)}`;
  return (
    <article aria-label="Doctor report" className="report-sheet" style={{ display: 'flex', flexDirection: 'column', gap: 22, padding: 20, borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', fontSize: 17, lineHeight: '25px', color: 'var(--color-ink)' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 12, borderBottom: '3px solid var(--color-ink)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-ink-muted)' }}>
          Ventra · Patient-generated report · {dayHeading(report.today)}
        </span>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>Heart failure self-care summary</h2>
      </header>

      <section aria-label="Patient details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 20px' }}>
        <Detail label="Patient" value={`${patient.name}${patient.age ? ` · ${patient.age} years` : ''}`} />
        <Detail label="Condition" value={patient.condition || '—'} />
        <Detail label="Discharged" value={report.discharge ? shortDate(report.discharge) : '—'} />
        <Detail label="Report period" value={periodText} />
        <Detail label="Data source" value="Entered by the patient in the app" />
      </section>

      <Section title="Summary for the clinician">
        <ul style={{ margin: 0, paddingLeft: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {report.summary.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </Section>

      <section aria-label="Key numbers" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <Key label="Weight today" value={report.weightToday != null ? `${report.weightToday.toFixed(1)} kg` : '—'} sub={report.vsDry != null ? `${report.vsDry >= 0 ? '+' : '−'}${Math.abs(report.vsDry).toFixed(1)} kg vs dry` : ''} />
        <Key label="Medicines taken" value={`${adherence.pct}%`} sub={`${adherence.text} doses`} />
        <Key label="Fluid limit kept" value={`${report.fluidDays.ok} of ${report.fluidDays.of}`} sub="days" />
        <Key label="Salt today" value={`${num(report.sodiumToday)} mg`} sub={targets.sodiumMg ? `of ${num(targets.sodiumMg)} mg` : ''} />
      </section>

      <Section title="Weight">
        <WeightChart points={report.weights} dryKg={targets.dryKg} alertGainKg={targets.alertGainKg} />
      </Section>

      <Section title={`Daily log, ${periodText}`}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr>{['Date', 'Status', 'Weight', 'Fluid', 'Medicines', 'Symptoms'].map((h) => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {report.days.map((day) => (
                <tr key={day.date} style={{ background: day.zone === 'yellow' ? 'var(--color-yellow-soft)' : undefined }}>
                  <td style={cell}>{shortDate(day.date)}</td>
                  <td style={{ ...cell, fontWeight: 700, color: day.zone === 'yellow' ? 'var(--color-yellow-ink)' : 'var(--color-green)' }}>{day.zone === 'yellow' ? 'Yellow' : 'Green'}</td>
                  <td style={cell}>{day.weightKg != null ? day.weightKg.toFixed(1) : '—'}</td>
                  <td style={{ ...cell, fontWeight: day.fluidOver ? 700 : 400 }}>{day.fluid}</td>
                  <td style={{ ...cell, fontWeight: day.missed ? 700 : 400 }}>{day.medicines}</td>
                  <td style={cell}>{day.symptoms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Medicines">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr>{['Medicine', 'Dose and time', `Taken, ${periodText}`, 'Missed'].map((h) => <th key={h} style={head}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {report.medicines.map((med) => (
                <tr key={med.generic}>
                  <td style={cell}><strong>{med.generic}</strong><br />{med.name}</td>
                  <td style={cell}>{med.dose}</td>
                  <td style={{ ...cell, fontWeight: med.taken < med.due ? 700 : 400 }}>{med.taken} of {med.due}</td>
                  <td style={cell}>{med.missedDates.length ? med.missedDates.map(shortDate).join(', ') : 'None'}</td>
                </tr>
              ))}
              {report.medicines.length === 0 && <tr><td style={cell} colSpan={4}>No medicines set up.</td></tr>}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title={`Meals today (${shortDate(report.today)})`}>
        {report.meals.length ? (
          <ul style={{ margin: 0, paddingLeft: 22 }}>
            {report.meals.map((meal) => (
              <li key={`${meal.time}${meal.what}`}>{meal.meal} {meal.time} · {meal.what} · about {num(meal.sodiumMg)} mg sodium</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>No meals logged today.</p>
        )}
        <p style={{ margin: '6px 0 0', fontSize: 15, color: 'var(--color-ink-muted)' }}>Sodium values are estimates from a standard food list.</p>
      </Section>

      <Section title="Targets set by the care team">
        <ul style={{ margin: 0, paddingLeft: 22 }}>
          <li>Dry weight: {targets.dryKg ? `${targets.dryKg.toFixed(1)} kg` : 'not set'}</li>
          <li>Fluid: {targets.fluidMl ? `${num(targets.fluidMl)} ml a day` : 'not set'}</li>
          <li>Sodium: {targets.sodiumMg ? `${num(targets.sodiumMg)} mg a day` : 'not set'}</li>
          <li>Alert rule: weight up {targets.alertGainKg} kg or more in {targets.alertDays} days</li>
        </ul>
      </Section>

      <footer style={{ paddingTop: 10, borderTop: '1px solid #D9D5CC', fontSize: 14, lineHeight: '20px', color: 'var(--color-ink-muted)' }}>
        Generated by Ventra, a prototype self-care app, from what the patient logged. Not a medical device; please confirm with clinical records.
      </footer>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function Key({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: 12, borderRadius: 12, border: '2px solid var(--color-ink)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--color-ink-muted)', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: 14, color: 'var(--color-ink-muted)' }}>{sub}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <h3 style={{ margin: 0, fontSize: 20, lineHeight: '26px', fontWeight: 700 }}>{title}</h3>
      {children}
    </section>
  );
}
