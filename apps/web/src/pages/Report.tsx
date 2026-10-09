import type { Report as ReportData } from '@ventra/core';
import { LoadError, Loading } from '../components/QueryState';
import { WeightChart } from '../components/WeightChart';
import { useReport } from '../lib/api';
import { dayHeading, ml as num } from '../lib/copy';

// F2 / F2a · My report and the doctor report (design/Report + DoctorReport .dc.html).
// One page: a doctor-friendly summary that prints (or saves as PDF) on A4. Every number
// comes from GET /api/report, built by the same core functions as Home and Medicine.
export default function Report() {
  const report = useReport();
  if (report.isLoading) return <Loading what="your report" />;
  if (report.isError || !report.data) return <LoadError onRetry={() => report.refetch()} />;
  return <ReportView report={report.data} />;
}

function shortDate(iso: string): string {
  return dayHeading(iso).replace(/^\w+, /, '');
}

const cell = { padding: '8px 10px', borderBottom: '1px solid #D9D5CC', textAlign: 'left' as const, verticalAlign: 'top' as const };
const head = { ...cell, borderBottom: '1.5px solid var(--color-ink)', fontSize: 15, textTransform: 'uppercase' as const, letterSpacing: '0.04em' };

function ReportView({ report }: { report: ReportData }) {
  const { patient, targets, adherence, period } = report;
  const periodText = `${shortDate(period.from)} – ${shortDate(period.to)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div data-noprint style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>My report</h1>
        <p style={{ margin: 0, fontSize: 20, lineHeight: '28px' }}>
          Your report for {periodText} is ready. Show it at your clinic visit, or print it.
        </p>
        <button
          type="button"
          onClick={() => window.print()}
          style={{ minHeight: 'var(--touch-button)', borderRadius: 'var(--radius-pill)', border: 0, background: 'var(--color-blue)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 'var(--text-title)', fontWeight: 700, cursor: 'pointer' }}
        >
          Print or save as PDF
        </button>
        <p style={{ margin: 0, fontSize: 18, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>
          Only you and the people you choose can see this report.
        </p>
      </div>

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
    </div>
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
