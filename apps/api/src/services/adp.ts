// Tencent Cloud ADP chat client (v1 SSE endpoint).
// The app key only ever goes into the request body; it is never logged or put in an error.

export const DEFAULT_ADP_CHAT_URL = 'https://wss.lke.tencentcloud.com/v1/qbot/chat/sse';
const DEFAULT_TIMEOUT_MS = 15_000;

export interface AdpAskInput {
  question: string;
  requestId: string;
  sessionId: string;
  visitorId: string;
}

export interface AdpClient {
  ask(input: AdpAskInput): Promise<string>;
}

export interface AdpClientOptions {
  url: string;
  appKey: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export type AdpErrorCode = 'timeout' | 'network' | 'http' | 'api' | 'flagged' | 'empty' | 'incomplete';

export class AdpError extends Error {
  constructor(public readonly code: AdpErrorCode, message: string) {
    super(message);
    this.name = 'AdpError';
  }
}

export interface ParsedAdpStream {
  answer: string;
  final: boolean;
  flagged: boolean;
  error?: { code: string; message: string };
}

// Parses the whole SSE body. With incremental=false every bot `reply` event carries the
// full answer so far, so the last one wins. Our own question is echoed with is_from_self=true.
export function parseAdpStream(raw: string): ParsedAdpStream {
  const result: ParsedAdpStream = { answer: '', final: false, flagged: false };

  for (const block of raw.split(/\r?\n\r?\n/)) {
    let event = '';
    const dataLines: string[] = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (dataLines.length === 0) continue;

    let payload: Record<string, unknown>;
    try {
      const parsed = JSON.parse(dataLines.join('\n')) as { payload?: Record<string, unknown> };
      payload = parsed.payload ?? {};
    } catch {
      continue;
    }

    if (event === 'reply' && payload.is_from_self === false) {
      if (typeof payload.content === 'string') result.answer = payload.content;
      result.final = payload.is_final === true;
      result.flagged = payload.is_evil === true;
    } else if (event === 'error') {
      const error = (payload.error ?? {}) as { code?: unknown; message?: unknown };
      result.error = {
        code: String(error.code ?? 'unknown'),
        message: String(error.message ?? 'unknown'),
      };
    }
  }

  return result;
}

// ADP leaves a space where it strips citation marks ("extra water ."); tidy that for display.
function tidy(answer: string): string {
  return answer.replace(/[ \t]+([.,!?;:])/g, '$1').trim();
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

export function createAdpClient(options: AdpClientOptions): AdpClient {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async ask(input) {
      let raw: string;
      try {
        const response = await fetchImpl(options.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_id: input.requestId,
            session_id: input.sessionId,
            bot_app_key: options.appKey,
            visitor_biz_id: input.visitorId,
            content: input.question,
            stream: 'enable',
            incremental: false,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) {
          throw new AdpError('http', `ADP returned HTTP ${response.status}`);
        }
        raw = await response.text();
      } catch (error) {
        if (error instanceof AdpError) throw error;
        if (isAbort(error)) throw new AdpError('timeout', `ADP did not answer within ${timeoutMs} ms`);
        throw new AdpError('network', 'ADP request failed');
      }

      const parsed = parseAdpStream(raw);
      if (parsed.error) {
        throw new AdpError('api', `ADP error ${parsed.error.code}: ${parsed.error.message}`);
      }
      if (parsed.flagged) throw new AdpError('flagged', 'ADP flagged the reply as unsafe');
      const answer = tidy(parsed.answer);
      if (!answer) throw new AdpError('empty', 'ADP returned no answer');
      if (!parsed.final) throw new AdpError('incomplete', 'ADP stream ended before the final reply');

      return answer;
    },
  };
}
