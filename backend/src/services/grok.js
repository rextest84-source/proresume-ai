const XAI_CHAT_URL = 'https://api.x.ai/v1/chat/completions';
const DEFAULT_MODEL = 'grok-4.20-0309-non-reasoning';

export function isGrokConfigured() {
  return Boolean(process.env.XAI_API_KEY?.trim());
}

export function getGrokModel() {
  return process.env.XAI_MODEL?.trim() || DEFAULT_MODEL;
}

export async function grokChat(messages, { maxTokens = 1200, temperature = 0.65 } = {}) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('Grok is not configured');

  const res = await fetch(XAI_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: getGrokModel(),
      messages,
      max_tokens: maxTokens,
      temperature
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error?.message || data.error || res.statusText || 'Unknown error';
    throw new Error(`Grok API error: ${msg}`);
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty Grok response');
  return content;
}

export function parseJsonFromModel(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1].trim());
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('Could not parse JSON from Grok response');
  }
}
