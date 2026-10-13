import { Link } from 'react-router-dom';
import type { TodoItem } from '../lib/todo';

// Today's morning routine (lib/todo.ts): a card on Home that stays until every step is done.
// Each step opens its page.

function Rows({ items, onOpen }: { items: TodoItem[]; onOpen?: () => void }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => (
        <li key={item.key}>
          <Link
            to={item.to}
            onClick={onOpen}
            aria-label={`${item.label}${item.done ? ', done' : ''}`}
            style={{ minHeight: 76, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 20, background: item.done ? 'var(--color-green-soft)' : 'var(--color-surface)', border: item.done ? '2.5px solid transparent' : '2.5px solid var(--color-ink)', color: 'var(--color-ink)', textDecoration: 'none', textAlign: 'left' }}
          >
            <span aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: item.done ? 'var(--color-green)' : 'var(--color-surface)', border: item.done ? 0 : '3px solid var(--color-ink)', color: 'var(--color-surface)' }}>
              {item.done && <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.25} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
            </span>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 22, lineHeight: '28px', fontWeight: 700, textDecoration: item.done ? 'line-through' : 'none' }}>{item.label}</span>
              <span style={{ fontSize: 18, lineHeight: '24px', color: 'var(--color-ink-muted)' }}>{item.done ? 'Done' : item.hint}</span>
            </span>
            {!item.done && (
              <svg style={{ flexShrink: 0 }} width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const doneCount = (items: TodoItem[]) => items.filter((item) => item.done).length;

export function TodoCard({ items }: { items: TodoItem[] }) {
  return (
    <section aria-label="Today's to-do" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 20, borderRadius: 28, background: 'var(--color-butter-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 26, lineHeight: '32px', fontWeight: 700 }}>Today's to-do</h2>
        <span style={{ fontSize: 19, lineHeight: '24px', fontWeight: 700, color: 'var(--color-ink-muted)' }}>{doneCount(items)} of {items.length} done</span>
      </div>
      <Rows items={items} />
    </section>
  );
}
