const ADP_KEY = process.env.ADP_KEY_GENERAL;
if (!ADP_KEY) {
  throw new Error("Environment variable ADP_KEY_GENERAL is required.");
}

const url = "https://wss.lke.tencentcloud.com/v1/qbot/chat/sse";
const body = {
  request_id: "test-" + Date.now(),
  session_id: "ventra-test-1",
  bot_app_key: ADP_KEY,
  visitor_biz_id: "visitor-test-1",
  content: "What is bisoprolol for?",
  stream: "enable",
  incremental: false,
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

console.log(`HTTP ${res.status}`);

let text = await res.text();
text = text.replaceAll(ADP_KEY, "[REDACTED]");
console.log(text.slice(0, 500));

let answer = "";
let sessionId = "";
let lastTokenCount = "";
let lastElapsed = "";

const blocks = text.split(/\r?\n\r?\n/);
for (const block of blocks) {
  if (!block.trim()) continue;

  const lines = block.split(/\r?\n/);
  let eventName = "";
  let dataLine = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      dataLine = line.slice(5).trim();
    }
  }

  if (!dataLine) continue;

  try {
    const parsed = JSON.parse(dataLine);
    const payload = parsed.payload ?? {};

    if (eventName === "reply") {
      if (payload.is_from_self === false) {
        answer = payload.content ?? answer;
        sessionId = payload.session_id ?? sessionId;
      }
    } else if (eventName === "token_stat") {
      lastTokenCount = payload.token_count ?? lastTokenCount;
      lastElapsed = payload.elapsed ?? lastElapsed;
    } else if (eventName === "error") {
      console.log(`error.code: ${payload.error?.code ?? "unknown"}`);
      console.log(`error.message: ${payload.error?.message ?? "unknown"}`);
    }
  } catch {
    // ignore unparsable blocks
  }
}

console.log(`ANSWER: ${answer}`);
console.log(`SESSION: ${sessionId}`);
console.log(`LAST token_stat: ${lastTokenCount} tokens, ${lastElapsed} ms`);
