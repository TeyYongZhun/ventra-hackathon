import type { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { MetricsResponse } from '@ventra/core';
import { PageHeader } from '../components';
import { LoadError, Loading } from '../components/QueryState';
import { useFamilySettings, useMe, useMetrics } from '../lib/api';
import { ml } from '../lib/copy';
import { ContactStep, MedicinesStep, NumbersStep } from './Setup';

// My details: change set-up after sign-up, from Calendar (More) → "Change my setup".
// Unlike the sign-up set-up (/setup/1…5), each part is its own page, filled in with the current
// values; Back and Save both return here. Saves through the same /api/onboarding/* endpoints.
const HUB = '/settings';
const hubHeader = <PageHeader back={{ to: '/more', label: 'Back to More' }} title="My details" />;

export default function MyDetails() {
  const metrics = useMetrics();
  const family = useFamilySettings();
  const me = useMe();
  const location = useLocation();
  const saved = (location.state as { saved?: string } | null)?.saved;

  if (metrics.isLoading || family.isLoading) return <Loading what="your details" header={hubHeader} />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => { metrics.refetch(); family.refetch(); }} header={hubHeader} />;

  const { targets } = metrics.data;
  const meds = currentMeds(metrics.data);
  const contact = family.data?.family;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {hubHeader}
      {saved && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 20, background: 'var(--color-green-soft)', border: '3px solid var(--color-green)' }}>
          <svg style={{ flexShrink: 0, color: 'var(--color-green)' }} width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
          <span style={{ fontSize: 20, lineHeight: '27px', fontWeight: 600 }}>{saved} saved.</span>
        </div>
      )}
      <nav aria-label="My details" style={{ display: 'flex', flexDirection: 'column', padding: '4px 20px', borderRadius: 24, background: 'var(--color-surface)' }}>
        <Row first to={`${HUB}/numbers`} label="My numbers" value={targets.dryKg > 0 ? `Dry weight ${targets.dryKg.toFixed(1)} kg · drinks ${ml(targets.fluidMl)} ml · salt ${ml(targets.sodiumMg)} mg` : 'Not set yet'} />
        <Row to={`${HUB}/medicines`} label="My medicines" value={meds.length ? meds.map((m) => m.name).join(', ') : 'None yet'} />
        <Row to="/cap?from=settings" label="My cap size" value={targets.capMl > 0 ? `1 full cap = ${targets.capMl} ml` : 'Not set yet'} />
        <Row to={`${HUB}/contact`} label="Who we tell" value={contact ? `${contact.name} (${contact.relation})` : 'No one yet'} />
        <Row to="/settings/text" label="Text size and sound" value={me.data?.text_size === 'large' ? 'Large text' : 'Extra large text'} />
      </nav>
    </div>
  );
}

function Row({ to, label, value, first }: { to: string; label: string; value: string; first?: boolean }) {
  return (
    <Link to={to} style={{ minHeight: 84, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', color: 'var(--color-ink)', textDecoration: 'none', borderTop: first ? undefined : '2px solid var(--color-line)' }}>
      <span style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 18, lineHeight: '25px', color: 'var(--color-ink-muted)' }}>{value}</span>
      </span>
      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
  );
}

// The patient's medicines and times, from today's doses (every medicine is daily).
function currentMeds(metrics: MetricsResponse): Array<{ id: string; name: string; times: number[] }> {
  const byId = new Map<string, { id: string; name: string; times: number[] }>();
  for (const dose of metrics.pillsToday.all) {
    const entry = byId.get(dose.med.id) ?? { id: dose.med.id, name: dose.med.name, times: [] };
    if (!entry.times.includes(dose.time)) entry.times.push(dose.time);
    byId.set(dose.med.id, entry);
  }
  return [...byId.values()].map((med) => ({ ...med, times: med.times.sort((a, b) => a - b) }));
}

// One edit page: header with Back to My details, then the form.
function EditPage({ title, what, children }: { title: string; what: string; children: (done: () => void) => ReactNode }) {
  const navigate = useNavigate();
  const done = () => navigate(HUB, { state: { saved: what } });
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader back={{ to: HUB, label: 'Back to my details' }} title={title} titleSize={32} />
      {children(done)}
    </div>
  );
}

export function EditNumbers() {
  const metrics = useMetrics();
  const header = <PageHeader back={{ to: HUB, label: 'Back to my details' }} title="My numbers" titleSize={32} />;
  if (metrics.isLoading) return <Loading what="your numbers" header={header} />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} header={header} />;
  const { targets, patient } = metrics.data;
  const initial = {
    age: patient.age ? String(patient.age) : '',
    dryKg: targets.dryKg > 0 ? String(targets.dryKg) : '',
    fluidMl: String(targets.fluidMl || 1500),
    sodiumMg: String(targets.sodiumMg || 2000),
    alertGainKg: String(targets.alertGainKg || 2),
    alertDays: String(targets.alertDays || 3),
  };
  return (
    <EditPage title="My numbers" what="Your numbers">
      {(done) => <NumbersStep onDone={done} initial={initial} submitLabel="Save" showTitle={false} />}
    </EditPage>
  );
}

export function EditMedicines() {
  const metrics = useMetrics();
  const header = <PageHeader back={{ to: HUB, label: 'Back to my details' }} title="My medicines" titleSize={32} />;
  if (metrics.isLoading) return <Loading what="your medicines" header={header} />;
  if (metrics.isError || !metrics.data) return <LoadError onRetry={() => metrics.refetch()} header={header} />;
  const initial = Object.fromEntries(currentMeds(metrics.data).map((med) => [med.id, med.times]));
  return (
    <EditPage title="My medicines" what="Your medicines">
      {(done) => <MedicinesStep onDone={done} initial={initial} submitLabel="Save" showTitle={false} />}
    </EditPage>
  );
}

export function EditContact() {
  const family = useFamilySettings();
  const header = <PageHeader back={{ to: HUB, label: 'Back to my details' }} title="Who we tell" titleSize={32} />;
  if (family.isLoading) return <Loading what="your contact" header={header} />;
  if (family.isError) return <LoadError onRetry={() => family.refetch()} header={header} />;
  return (
    <EditPage title="Who we tell" what="Your contact">
      {(done) => <ContactStep onDone={done} initial={family.data?.family ?? undefined} submitLabel="Save" showTitle={false} />}
    </EditPage>
  );
}
