import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AskReplyKind } from '@ventra/core';
import { useAsk, useMe } from '../lib/api';

// E1 · Ask AI (design/Talk.dc.html). Every question goes through POST /api/ask, where the
// code guardrail answers emergencies and dose questions itself; the UI only shows the result.

type AiKind = AskReplyKind | 'error' | 'pending';

type Message =
  | { id: number; from: 'me'; text: string }
  | { id: number; from: 'ai'; kind: AiKind; text: string };

const IDEAS = ['What is my water pill for?', 'How much can I drink today?', 'Why are my ankles swollen?'];

export default function AskAI() {
  const me = useMe();
  const ask = useAsk();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const nextId = useRef(1);
  const endRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  function send(text: string) {
    const question = text.trim();
    if (!question || ask.isPending) return;
    const myId = nextId.current++;
    const aiId = nextId.current++;
    setDraft('');
    setMessages((current) => [
      ...current,
      { id: myId, from: 'me', text: question },
      { id: aiId, from: 'ai', kind: 'pending', text: '' },
    ]);

    const settle = (kind: AiKind, reply: string) =>
      setMessages((current) => current.map((message) => (message.id === aiId ? { id: aiId, from: 'ai', kind, text: reply } : message)));

    ask.mutate({ question }, {
      onSuccess: (result) => settle(result.kind, result.reply),
      onError: (error) => settle(
        'error',
        error.code === 'RATE_LIMITED'
          ? 'Many people are asking right now. Please try again in a minute.'
          : "I couldn't reach Ventra. Please check your internet and try again.",
      ),
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <h1 style={{ margin: 0, fontSize: 'var(--text-h1)', lineHeight: 'var(--lh-h1)', fontWeight: 700, letterSpacing: '-0.02em' }}>Ask AI</h1>

      {messages.length === 0 && (
        <section
          aria-label="Welcome"
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '28px 20px 26px', borderRadius: 32, background: 'var(--color-iris-soft)', textAlign: 'center' }}
        >
          <div
            role="img"
            aria-label="Ventra bot"
            style={{ width: 148, height: 148, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', boxShadow: '0 0 0 10px rgba(141,147,246,0.18), 0 16px 36px rgba(74,79,194,0.22)' }}
          >
            <BotFace size={118} />
          </div>
          <h2 style={{ margin: '6px 0 0', fontSize: 'var(--text-h2)', lineHeight: 'var(--lh-h2)', fontWeight: 700, letterSpacing: '-0.015em' }}>
            Hello{me.data?.name ? `, ${me.data.name}` : ''}
          </h2>
          <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: '30px' }}>How can I help you today?</p>
        </section>
      )}

      {messages.length > 0 && (
        <div role="log" aria-label="Conversation" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {messages.map((message) => <ChatItem key={message.id} message={message} />)}
        </div>
      )}

      <section aria-label="Ideas" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-ink-muted)' }}>You can ask me:</span>
        {IDEAS.map((idea) => (
          <button
            key={idea}
            type="button"
            onClick={() => send(idea)}
            disabled={ask.isPending}
            style={{
              minHeight: 'var(--touch-min)',
              padding: '10px 22px',
              textAlign: 'left',
              borderRadius: 'var(--radius-pill)',
              border: '2.5px solid var(--color-ink)',
              background: 'var(--color-surface)',
              color: 'var(--color-ink)',
              fontFamily: 'inherit',
              fontSize: 21,
              lineHeight: '28px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {idea}
          </button>
        ))}
      </section>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: 10 }}
      >
        <input
          type="text"
          aria-label="Ask a question"
          placeholder="Type your question…"
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            height: 'var(--touch-min)',
            padding: '0 20px',
            borderRadius: 'var(--radius-pill)',
            border: '2.5px solid var(--color-ink)',
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            fontFamily: 'inherit',
            fontSize: 21,
            fontWeight: 500,
          }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || ask.isPending}
          style={{
            width: 64,
            height: 64,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-pill)',
            border: 0,
            background: draft.trim() && !ask.isPending ? '#4A4FC2' : 'var(--color-sunken)',
            color: draft.trim() && !ask.isPending ? 'var(--color-surface)' : 'var(--color-ink-muted)',
            cursor: 'pointer',
          }}
        >
          <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="m5 12 7-7 7 7" />
          </svg>
        </button>
      </form>

      <p style={{ margin: 0, display: 'flex', gap: 10, fontSize: 'var(--text-caption)', lineHeight: '27px', color: 'var(--color-ink-muted)' }}>
        <svg style={{ flexShrink: 0 }} width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
        I explain things simply. I never change doses or timing — your nurse decides that.
      </p>
      <span ref={endRef} aria-hidden="true" />
    </div>
  );
}

function ChatItem({ message }: { message: Message }) {
  if (message.from === 'me') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ maxWidth: 280, padding: '16px 20px', borderRadius: '24px 6px 24px 24px', background: 'var(--color-blue)', color: 'var(--color-ink)', fontSize: 'var(--text-body)', lineHeight: '30px', fontWeight: 600, overflowWrap: 'anywhere' }}>
          {message.text}
        </div>
      </div>
    );
  }

  if (message.kind === 'emergency') {
    return (
      <section aria-label="Get help now" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-red-soft)', border: '4px solid var(--color-red)' }}>
        <p style={{ margin: 0, fontSize: 28, lineHeight: '34px', fontWeight: 700 }}>{message.text}</p>
        <p style={{ margin: 0, fontSize: 'var(--text-title)', lineHeight: '32px', fontWeight: 700 }}>This could be serious. Please get help now.</p>
        <Link
          to="/emergency"
          style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-red)', color: 'var(--color-surface)', textDecoration: 'none', fontSize: 26, fontWeight: 700 }}
        >
          Press SOS
        </Link>
      </section>
    );
  }

  if (message.kind === 'dose') {
    return (
      <section aria-label="Please ask your nurse" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: 22, borderRadius: 'var(--radius-lg)', background: 'var(--color-surface)', border: '4px solid var(--color-blue-ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span aria-hidden="true" style={{ width: 60, height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)' }}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </span>
          <span style={{ fontSize: 'var(--text-h3)', lineHeight: 'var(--lh-h3)', fontWeight: 700 }}>Please ask your nurse</span>
        </div>
        <p style={{ margin: 0, fontSize: 'var(--text-body)', lineHeight: 'var(--lh-body)' }}>{message.text}</p>
        <Link
          to="/nurse"
          style={{ height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: 'var(--radius-pill)', background: 'var(--color-blue)', color: 'var(--color-ink)', textDecoration: 'none', fontSize: 23, fontWeight: 700 }}
        >
          <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call my nurse
        </Link>
      </section>
    );
  }

  const pending = message.kind === 'pending';
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span aria-hidden="true" style={{ width: 48, height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)', background: 'var(--color-surface)', boxShadow: '0 0 0 3px var(--color-iris)' }}>
        <BotFace size={36} />
      </span>
      <div
        aria-busy={pending}
        style={{
          flex: 1,
          padding: '16px 20px',
          borderRadius: '6px 24px 24px 24px',
          background: message.kind === 'error' ? 'var(--color-yellow-soft)' : 'var(--color-iris-soft)',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--lh-body)',
        }}
      >
        {pending ? 'Thinking…' : message.text}
      </div>
    </div>
  );
}

function BotFace({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <path d="M64 26V14" stroke="#4A4FC2" strokeWidth={7} strokeLinecap="round" />
      <circle cx={64} cy={12} r={8} fill="#F2785C" />
      <rect x={16} y={26} width={96} height={90} rx={36} fill="#C9CCFB" stroke="#4A4FC2" strokeWidth={5} />
      <rect x={28} y={46} width={72} height={52} rx={26} fill="#16201E" />
      <ellipse cx={49} cy={68} rx={9} ry={11} fill="#7CC7FE" />
      <ellipse cx={79} cy={68} rx={9} ry={11} fill="#7CC7FE" />
      <path d="M54 84q10 8 20 0" fill="none" stroke="#7CC7FE" strokeWidth={6} strokeLinecap="round" />
    </svg>
  );
}
