const planSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    weekdays: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 6 } },
    minutesPerRun: { type: 'integer', minimum: 15, maximum: 120 },
    cycleWeeks: { type: 'integer', minimum: 2, maximum: 16 },
    targetRate: { type: 'number', minimum: 0.5, maximum: 1 },
  },
  required: ['title', 'summary', 'weekdays', 'minutesPerRun', 'cycleWeeks', 'targetRate'],
};

const encouragementSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { text: { type: 'string' } },
  required: ['text'],
};

function jsonGenerationConfig(schema) {
  return {
    temperature: 0.4,
    maxOutputTokens: 512,
    responseFormat: { text: { mimeType: 'application/json', schema } },
  };
}

export function buildGeminiRequest(input) {
  if (input?.kind === 'running-plan') {
    if (!input.assessment || typeof input.assessment !== 'object') throw new Error('Invalid running assessment');
    return {
      system_instruction: {
        parts: [{
          text: 'You create conservative, editable beginner running plan drafts. Reply in Traditional Chinese. Never diagnose, prescribe medical treatment, or override safety screening. Use only weekdays the user says are available. Keep the intensity conversational and the plan realistic.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [{ text: `Create a running plan draft from this assessment:\n${JSON.stringify(input.assessment)}` }],
      }],
      generationConfig: jsonGenerationConfig(planSchema),
    };
  }

  if (input?.kind === 'photo-encouragement') {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(input.mimeType)) {
      throw new Error('Unsupported image type');
    }
    if (typeof input.imageBase64 !== 'string' || !input.imageBase64.length) throw new Error('Missing image');
    return {
      system_instruction: {
        parts: [{
          text: 'Reply in Traditional Chinese with exactly one short, positive exercise encouragement. Do not identify anyone or infer age, gender, identity, body shape, health, disability, emotion, location, or whether exercise truly occurred. Do not mention other people. The photo is only context for a supportive message.',
        }],
      },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: input.mimeType, data: input.imageBase64 } },
          { text: 'Provide one brief positive encouragement for this private running check-in.' },
        ],
      }],
      generationConfig: jsonGenerationConfig(encouragementSchema),
    };
  }

  throw new Error('Unsupported request kind');
}

export function parseGeminiJson(response) {
  const text = response?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini returned no text');
  return JSON.parse(text);
}

function cleanPlan(value, assessment) {
  const available = new Set(Array.isArray(assessment.availableDays) ? assessment.availableDays : []);
  const weekdays = Array.isArray(value.weekdays)
    ? [...new Set(value.weekdays.filter((day) => Number.isInteger(day) && available.has(day)))]
    : [];
  return {
    title: String(value.title ?? '').trim().slice(0, 80),
    summary: String(value.summary ?? '').trim().slice(0, 500),
    weekdays: weekdays.length ? weekdays : [...available],
    minutesPerRun: Math.min(120, Math.max(15, Number(value.minutesPerRun) || Number(assessment.minutesPerRun) || 30)),
    cycleWeeks: Math.min(16, Math.max(2, Number(value.cycleWeeks) || 8)),
    targetRate: Math.min(1, Math.max(0.5, Number(value.targetRate) || 0.8)),
  };
}

export async function generateWithGemini(input, options) {
  const { apiKey, model = 'gemini-3.5-flash', fetchImpl = fetch } = options;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const request = buildGeminiRequest(input);
  const response = await fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Gemini API ${response.status}: ${details.slice(0, 300)}`);
  }
  const value = parseGeminiJson(await response.json());
  if (input.kind === 'running-plan') return cleanPlan(value, input.assessment);
  const text = String(value.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!text) throw new Error('Gemini returned an empty encouragement');
  return { text };
}
