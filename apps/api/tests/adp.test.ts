import { describe, expect, it, vi } from 'vitest';
import { AdpError, createAdpClient, parseAdpStream } from '../src/services/adp.js';

const APP_KEY = 'test-app-key-SECRET';
const input = {
  question: 'What is bisoprolol for?',
  requestId: 'req-1',
  sessionId: 'sess-1',
  visitorId: 'visitor-1',
};

function event(name: string, payload: Record<string, unknown>): string {
  return `event: ${name}\ndata: ${JSON.stringify({ type: name, payload, message_id: 'm' })}\n\n`;
}

// Shape copied from a real ADP v1 stream: our question echoed, token stats, then the answer.
function realisticStream(answer: string, extra: Record<string, unknown> = {}): string {
  return [
    event('reply', { content: input.question, is_from_self: true, is_final: true, is_evil: false }),
    event('token_stat', { elapsed: 1689, status_summary: 'processing', token_count: 0 }),
    event('token_stat', { elapsed: 2601, status_summary: 'success', token_count: 3758 }),
    event('reply', { content: answer, is_from_self: false, is_final: true, is_evil: false, ...extra }),
  ].join('');
}

function fakeFetch(body: string, status = 200) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => new Response(body, {
    status,
    headers: { 'Content-Type': 'text/event-stream' },
  }));
}

describe('parseAdpStream', () => {
  it('takes the bot answer and ignores the echoed question', () => {
    const parsed = parseAdpStream(realisticStream('Bisoprolol slows your heart rate.'));
    expect(parsed).toEqual({ answer: 'Bisoprolol slows your heart rate.', final: true, flagged: false });
  });

  it('keeps the last reply when non-incremental replies stream in', () => {
    const raw = event('reply', { content: 'Bisoprolol', is_from_self: false, is_final: false })
      + event('reply', { content: 'Bisoprolol slows your heart.', is_from_self: false, is_final: true });
    expect(parseAdpStream(raw)).toMatchObject({ answer: 'Bisoprolol slows your heart.', final: true });
  });

  it('reads error events', () => {
    const raw = event('error', { error: { code: 460004, message: 'quota exceeded' } });
    expect(parseAdpStream(raw).error).toEqual({ code: '460004', message: 'quota exceeded' });
  });

  it('handles CRLF line endings and skips unparsable blocks', () => {
    const raw = 'event: reply\r\ndata: not-json\r\n\r\n'
      + realisticStream('Fine.').replace(/\n/g, '\r\n');
    expect(parseAdpStream(raw)).toMatchObject({ answer: 'Fine.', final: true });
  });
});

describe('createAdpClient', () => {
  it('sends the verified v1 request body and returns the tidied answer', async () => {
    const fetchImpl = fakeFetch(realisticStream('Your water pill removes extra water .'));
    const client = createAdpClient({ url: 'https://adp.test/sse', appKey: APP_KEY, fetchImpl });

    await expect(client.ask(input)).resolves.toBe('Your water pill removes extra water.');

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://adp.test/sse');
    expect(JSON.parse(String(init?.body))).toEqual({
      request_id: 'req-1',
      session_id: 'sess-1',
      bot_app_key: APP_KEY,
      visitor_biz_id: 'visitor-1',
      content: 'What is bisoprolol for?',
      stream: 'enable',
      incremental: false,
    });
  });

  it.each([
    ['http', fakeFetch('oops', 500)],
    ['api', fakeFetch(event('error', { error: { code: 400, message: 'bad' } }))],
    ['flagged', fakeFetch(realisticStream('Something risky', { is_evil: true }))],
    ['empty', fakeFetch(realisticStream('   '))],
    ['incomplete', fakeFetch(realisticStream('Half an ans', { is_final: false }))],
    ['network', vi.fn(async () => { throw new TypeError('fetch failed'); })],
  ])('throws AdpError(%s) and never puts the key in the message', async (code, fetchImpl) => {
    const client = createAdpClient({ url: 'https://adp.test/sse', appKey: APP_KEY, fetchImpl });
    const error = await client.ask(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AdpError);
    expect((error as AdpError).code).toBe(code);
    expect((error as AdpError).message).not.toContain(APP_KEY);
  });

  it('times out when ADP is too slow', async () => {
    const fetchImpl = vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise<Response>((_, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    }));
    const client = createAdpClient({ url: 'https://adp.test/sse', appKey: APP_KEY, timeoutMs: 20, fetchImpl });
    await expect(client.ask(input)).rejects.toMatchObject({ code: 'timeout' });
  });
});
