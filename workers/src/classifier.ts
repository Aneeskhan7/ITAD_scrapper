const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'llama3.2';

export interface ClassifyResult {
  classification: 'bidding' | 'selling' | 'informational' | 'irrelevant';
  confidence: number;
  reason: string;
}

export async function classifyPage(url: string, title: string, bodySnippet: string): Promise<ClassifyResult> {
  const prompt = `Classify this web page for an ITAD procurement intelligence system.
URL: ${url}
Title: ${title}
Content: ${bodySnippet.slice(0, 500)}

Respond with JSON only:
{"classification":"bidding|selling|informational|irrelevant","confidence":0.0,"reason":"one sentence"}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const data = await res.json() as { response: string };
    const parsed = JSON.parse(data.response) as ClassifyResult;

    const valid = ['bidding', 'selling', 'informational', 'irrelevant'];
    if (!valid.includes(parsed.classification)) throw new Error('Invalid classification');

    return { classification: parsed.classification, confidence: Math.max(0, Math.min(1, parsed.confidence)), reason: parsed.reason };
  } catch {
    return { classification: 'informational', confidence: 0, reason: 'Ollama unavailable or parse error' };
  }
}
