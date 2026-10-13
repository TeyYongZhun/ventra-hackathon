import { useEffect, useState, type ReactNode } from 'react';
import { symptomLabel, type Report as ReportData } from '@ventra/core';
import { PageHeader } from '../components';
import { DateBox } from '../components/VisitCards';
import { LoadError, Loading } from '../components/QueryState';
import { useDeleteVisitQuestion, useMetrics, useReport, useVisitQuestions, useVisits } from '../lib/api';
import { dayHeading } from '../lib/copy';

// E2 · Doctor visit prep (design/VisitPrep.dc.html), from the Home tile "Visit prep".
// Built from GET /api/report and the weight history in /api/metrics. Questions are made from
// the patient's own logs, plus the ones the AI added when something they asked in Ask AI needs
// their doctor (GET /api/visit-questions, removable). The next visit (GET /api/visits) sits at
// the top. Left out (no connection yet): "Send to doctor or family".
const header = <PageHeader back={{ to: '/more', label: 'Back to calendar' }} title="For my doctor" titleSize={32} />;
const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

export default function VisitPrep() {
  const report = useReport();
  const metrics = useMetrics();
  if (report.isLoading || metrics.isLoading) return <Loading what="your visit notes" header={header} />;
  if (report.isError || !report.data || !metrics.data) {
    return <LoadError onRetry={() => { report.refetch(); metrics.refetch(); }} header={header} />;
  }
  return <VisitPrepView report={report.data} history={metrics.data.weightHistory} />;
}

function countDays(report: ReportData, label: string): number {
  return report.days.filter((day) => day.symptoms.includes(label)).length;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function VisitPrepView({ report, history }: { report: ReportData; history: Array<{ date: string; kg: number }> }) {
  const next = useVisits().data?.visits[0];
  const ankles = countDays(report, symptomLabel('ankles'));
  const tired = countDays(report, symptomLabel('tired'));
  const missed = report.medicines.filter((med) => med.missedDates.length > 0);
  const first = history[0];
  const last = history[history.length - 1];
  const change = first && last ? last.kg - first.kg : null;
  const steady = report.weightChange == null || Math.abs(report.weightChange) < 1;

  const fromAsk = useVisitQuestions().data?.questions ?? [];
  const removeQuestion = useDeleteVisitQuestion();
  const questions: Array<{ text: string; askId?: number }> = [
    ...fromAsk.map((q) => ({ text: q.question, askId: q.id })),
    ...[
      ankles > 0 ? `My ankles were swollen on ${plural(ankles, 'day')}. Is that a problem?` : '',
      tired > 0 ? `I felt tired on ${plural(tired, 'day')}. Is it my medicine?` : '',
      ...missed.map((med) => `I missed my ${med.generic.toLowerCase()} ${plural(med.missedDates.length, 'time')}. What should I do if I miss it?`),
      'Are my drink and salt limits still right for me?',
    ].filter(Boolean).map((text) => ({ text })),
  ];

  // Every question starts ticked; the patient unticks the ones they won't ask.
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());
  const asked = (text: string) => !skipped.has(text);
  const toggle = (text: string) => setSkipped((current) => {
    const next = new Set(current);
    if (next.has(text)) next.delete(text);
    else next.add(text);
    return next;
  });
  const [speaking, setSpeaking] = useState(false);
  useEffect(() => () => { if (canSpeak()) window.speechSynthesis.cancel(); }, []);

  function readAloud() {
    if (!canSpeak()) return;
    window.speechSynthesis.cancel();
    if (speaking) { setSpeaking(false); return; }
    const chosen = questions.map((q) => q.text).filter(asked);
    const utterance = new SpeechSynthesisUtterance(chosen.length ? `Questions for my doctor. ${chosen.join(' ')}` : 'No questions picked.');
    utterance.lang = 'en-SG';
    utterance.rate = 0.9;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div data-noprint>{header}</div>

      {next && (
        <div aria-label={`Next visit: ${next.title}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, borderRadius: 24, background: 'var(--color-blue)', color: 'var(--color-ink)' }}>
          <DateBox iso={next.date} size="small" tone="white" />
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <span style={{ fontSize: 24, lineHeight: '30px', fontWeight: 700 }}>{next.title}</span>
            <span style={{ fontSize: 20, lineHeight: '28px' }}>{[next.time, next.doctor].filter(Boolean).join(' · ')}</span>
          </div>
        </div>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>Since you left hospital</h2>
        <span style={{ marginTop: -6, fontSize: 19, lineHeight: '26px', color: 'var(--color-ink-muted)' }}>
          {report.discharge ? `${dayHeading(report.discharge).replace(/^\w+, /, '')} to today` : 'Your logs so far'}
        </span>
        <Fact bg="var(--color-yellow-soft)" iconBg="var(--color-yellow)" title={steady ? 'Weight steady' : 'Weight changing'} icon={<><rect x={3} y={3} width={18} height={18} rx={4} /><path d="M7.5 10a6 6 0 0 1 9 0" /><path d="m12 10 1.6-2.2" /></>}>
          {change != null && first && last
            ? `${change <= 0 ? 'Down' : 'Up'} ${Math.abs(change).toFixed(1)} kg: ${first.kg.toFixed(1)} kg → ${last.kg.toFixed(1)} kg`
            : 'No weights logged yet'}
        </Fact>
        <Fact bg="var(--color-sky-soft)" iconBg="var(--color-sky)" title="Drinks" icon={<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 0 0 7 7z" />}>
          Under limit {report.fluidDays.ok} of {report.fluidDays.of} days
        </Fact>
        <Fact bg="var(--color-coral-soft)" iconBg="var(--color-coral)" title="Medicine" icon={<><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>}>
          {report.adherence.text} doses taken
          {missed.length > 0 && ` · ${missed.map((med) => `${plural(med.missedDates.length, med.name.toLowerCase())} missed`).join(' · ')}`}
        </Fact>
        <Fact bg="var(--color-surface)" iconBg="var(--color-sunken)" title="How I felt" icon={<><circle cx={12} cy={12} r={10} /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></>}>
          Swollen ankles {plural(ankles, 'day')} · tired {plural(tired, 'day')}
        </Fact>
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 20, borderRadius: 24, background: 'var(--color-surface)' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>Questions to ask</h2>
        {questions.map(({ text, askId }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 8, borderTop: '2px solid var(--color-line)' }}>
            <button
              type="button"
              role="checkbox"
              aria-checked={asked(text)}
              onClick={() => toggle(text)}
              style={{ flex: 1, minWidth: 0, minHeight: 84, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', border: 0, background: 'var(--color-surface)', color: 'var(--color-ink)', fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            >
              <span aria-hidden="true" style={{ width: 48, height: 48, flexShrink: 0, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, background: asked(text) ? 'var(--color-blue)' : 'var(--color-surface)', border: '3px solid var(--color-ink)' }}>
                {asked(text) && <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 21, lineHeight: '29px', fontWeight: 600 }}>{text}</span>
                {askId != null && (
                  <span style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '2px 10px', borderRadius: 'var(--radius-pill)', background: 'var(--color-iris-soft)', fontSize: 16, lineHeight: '22px', fontWeight: 700 }}>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c.6 4.8 2.4 7.2 10 10-7.6 2.8-9.4 5.2-10 10-.6-4.8-2.4-7.2-10-10 7.6-2.8 9.4-5.2 10-10z" /></svg>
                    From Ask AI
                  </span>
                )}
              </span>
            </button>
            {askId != null && (
              <button
                type="button"
                data-noprint
                aria-label={`Remove question: ${text}`}
                disabled={removeQuestion.isPending}
                onClick={() => removeQuestion.mutate(askId)}
                style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)', color: 'var(--color-ink)', cursor: 'pointer' }}
              >
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            )}
          </div>
        ))}
        {fromAsk.length === 0 && (
          <p style={{ margin: '4px 0 0', fontSize: 18, lineHeight: '25px', color: 'var(--color-ink-muted)' }}>
            When you ask something in Ask AI that your doctor should answer, we'll add it here.
          </p>
        )}
      </section>

      <div data-noprint style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {canSpeak() && (
          <button type="button" onClick={readAloud} aria-pressed={speaking} style={{ ...wide, border: 0, background: 'var(--color-iris)' }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            {speaking ? 'Stop reading' : 'Read aloud'}
          </button>
        )}
        <button type="button" onClick={() => window.print()} style={{ ...wide, border: '2.5px solid var(--color-ink)', background: 'var(--color-surface)' }}>
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 9V2h12v7" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x={6} y={14} width={12} height={8} />
          </svg>
          Print
        </button>
      </div>
    </div>
  );
}

const wide = { height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', color: 'var(--color-ink)', fontFamily: 'inherit', fontSize: 24, fontWeight: 700, cursor: 'pointer' } as const;

function Fact({ bg, iconBg, title, icon, children }: { bg: string; iconBg: string; title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, borderRadius: 24, background: bg }}>
      <span aria-hidden="true" style={{ width: 56, height: 56, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14, background: iconBg }}>
        <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </span>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 22, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 19, lineHeight: '26px' }}>{children}</span>
      </span>
    </div>
  );
}
