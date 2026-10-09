// Telegram Bot API client for family messages. The bot token is only ever part of the
// request URL; it is never logged or put in an error message.

export interface TelegramClient {
  // Resolves false (never throws) when Telegram cannot be reached or refuses the message.
  sendMessage(chatId: string, text: string): Promise<boolean>;
  setWebhook(url: string, secret: string): Promise<boolean>;
  botUsername(): Promise<string | null>;
}

export interface TelegramClientOptions {
  token: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  log?: (message: string) => void;
}

export function createTelegramClient(options: TelegramClientOptions): TelegramClient {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  const log = options.log ?? (() => {});
  let username: string | undefined;

  async function call(method: string, body?: object): Promise<{ ok: boolean; result?: unknown }> {
    try {
      const response = await fetchImpl(`https://api.telegram.org/bot${options.token}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(timeoutMs),
      });
      const json = (await response.json().catch(() => ({}))) as { ok?: boolean; result?: unknown; description?: string };
      if (!response.ok || !json.ok) {
        log(`Telegram ${method} failed: HTTP ${response.status}${json.description ? ` ${json.description}` : ''}`);
        return { ok: false };
      }
      return { ok: true, result: json.result };
    } catch (error) {
      log(`Telegram ${method} failed: ${error instanceof Error ? error.name : 'unknown error'}`);
      return { ok: false };
    }
  }

  return {
    async sendMessage(chatId, text) {
      return (await call('sendMessage', { chat_id: chatId, text, disable_web_page_preview: true })).ok;
    },
    async setWebhook(url, secret) {
      return (await call('setWebhook', { url, secret_token: secret, allowed_updates: ['message'] })).ok;
    },
    async botUsername() {
      if (username) return username;
      const me = await call('getMe');
      username = me.ok ? (me.result as { username?: string }).username : undefined;
      return username ?? null;
    },
  };
}
