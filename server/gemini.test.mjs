import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGeminiRequest, generateWithGemini, parseGeminiJson } from './gemini.mjs';

const assessment = {
  ageRange: '25–34',
  recentActivity: '偶爾散步',
  availableDays: [1, 3, 6],
  minutesPerRun: 30,
  desiredAbility: '建立習慣',
};

test('計畫請求只使用 structured JSON output', () => {
  const request = buildGeminiRequest({ kind: 'running-plan', assessment });
  assert.equal(request.generationConfig.responseFormat.text.mimeType, 'application/json');
  assert.match(request.contents[0].parts[0].text, /availableDays/);
});

test('相片請求把 base64 放進 inline_data', () => {
  const request = buildGeminiRequest({ kind: 'photo-encouragement', imageBase64: 'YWJj', mimeType: 'image/jpeg' });
  assert.equal(request.contents[0].parts[0].inline_data.data, 'YWJj');
  assert.equal(request.contents[0].parts[0].inline_data.mime_type, 'image/jpeg');
});

test('解析 Gemini candidate JSON', () => {
  const result = parseGeminiJson({ candidates: [{ content: { parts: [{ text: '{"text":"繼續前進！"}' }] } }] });
  assert.deepEqual(result, { text: '繼續前進！' });
});

test('計畫結果不可加入使用者沒有選擇的跑步日', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        title: '穩定跑步', summary: '保持舒服節奏。', weekdays: [1, 2, 6], minutesPerRun: 25, cycleWeeks: 8, targetRate: 0.8,
      }) }] } }],
    }),
  });
  const result = await generateWithGemini({ kind: 'running-plan', assessment }, { apiKey: 'test-key', fetchImpl });
  assert.deepEqual(result.weekdays, [1, 6]);
});
