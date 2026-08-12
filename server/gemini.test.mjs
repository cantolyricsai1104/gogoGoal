import assert from 'node:assert/strict';
import test from 'node:test';

import { buildGeminiRequest, buildVertexRequest, generateWithGemini, parseGeminiJson } from './gemini.mjs';

const assessment = {
  ageRange: '25–34',
  recentActivity: '偶爾散步',
  availableDays: [1, 3, 6],
  minutesPerRun: 30,
  desiredAbility: '建立習慣',
};

const submission = {
  schemaVersion: 'initial-coaching-onboarding/v1',
  goal: { primaryReason: 'health', secondaryReasons: ['discipline'], currentSituation: '工作很忙' },
  ability: { ageRange: '25_34', recentRunningFrequency: 'none', jogAbility: 'under_5', hadRunningHabit: false },
  recentActivity: { activeDays: 1, weeklyTime: '30_60', activityTypes: ['walking'] },
  availability: { availableDays: [1, 3, 6], realisticFrequency: 3, timeByDay: { 1: '30_45', 3: '30_45', 6: '45_60' } },
  safety: { hasChestPain: false, hasDizziness: false, hasHeartOrLungCondition: false, hasRunningPain: false, hasMedicalRestriction: false },
};

const growthSubmission = {
  schemaVersion: 'personal-growth-onboarding/v1',
  classification: { category: 'personal_growth', subcategory: 'growth' },
  focus: { primary: 'new_skill', secondary: ['focus_time'] }, // legacy input: server must omit it from Gemini context
  outcome: '完成一個可以展示的小工具',
  successDefinition: '有一個可以運作並能向朋友展示的作品',
  currentLevel: 'starting',
  cycleWeeks: 4,
  weeklyMinutes: 90,
  availableDays: [2, 4, 6],
  timeByDay: { 2: '30_45', 4: '30_45', 6: '30_45' },
  preferredFormats: ['practice', 'project'],
  preferredLanguage: '繁體中文',
  constraints: '只能晚上',
  obstacles: '工作忙',
  templateAnswers: { skill_category: 'coding', skill_outcome: 'small_project' },
  templateOtherAnswers: { skill_method: '用自己的筆記練習' },
  startDate: '2026-08-11',
  preferredTimeSlot: 'evening',
};

test('Initial Coaching request 只傳必要資料並要求完整八週 schema', () => {
  const request = buildGeminiRequest({
    kind: 'initial-coaching-plan',
    submission,
    email: 'private@example.com',
    accountId: 'account-secret',
    photos: ['base64-secret'],
  });
  const prompt = request.contents[0].parts[0].text;

  assert.match(prompt, /initial-coaching-onboarding\/v1/);
  assert.doesNotMatch(prompt, /private@example.com|account-secret|base64-secret/);
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.generationConfig.responseSchema.properties.weeks.type, 'array');
});

test('Personal Growth request 只傳必要資料並要求可驗證的週任務 schema', () => {
  const request = buildGeminiRequest({ kind: 'personal-growth-plan', submission: growthSubmission, email: 'private@example.com', accountId: 'secret' });
  const prompt = request.contents[0].parts[0].text;
  assert.match(prompt, /personal-growth-onboarding\/v1/);
  assert.doesNotMatch(prompt, /private@example.com|secret/);
  assert.match(prompt, /"secondary":\s*\[\]/);
  assert.doesNotMatch(prompt, /focus_time/);
  assert.match(prompt, /"skill_category":"coding"/);
  assert.match(prompt, /"startDate":"2026-08-11"/);
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.generationConfig.responseSchema.properties.weeks.type, 'array');
});

test('Gemini generation config uses the REST structured-output fields', () => {
  const request = buildGeminiRequest({ kind: 'personal-growth-plan', submission: growthSubmission });
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
  assert.equal(request.generationConfig.responseSchema.type, 'object');
  assert.equal('additionalProperties' in request.generationConfig.responseSchema, false);
  assert.equal('minItems' in request.generationConfig.responseSchema.properties.weeks, false);
  assert.equal('maxItems' in request.generationConfig.responseSchema.properties.weeks, false);
  assert.equal('responseFormat' in request.generationConfig, false);
});

test('完整個人成長計畫保留足夠輸出預算，避免十二週 JSON 被截斷', () => {
  const request = buildGeminiRequest({ kind: 'personal-growth-plan', submission: { ...growthSubmission, cycleWeeks: 8 } });
  assert.equal(request.generationConfig.maxOutputTokens, 32768);
});

test('Vertex request preserves the structured-output contract without an API key', () => {
  const request = buildVertexRequest({ kind: 'personal-growth-plan', submission: growthSubmission });
  const developerRequest = buildGeminiRequest({ kind: 'personal-growth-plan', submission: growthSubmission });
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.deepEqual(request.config.responseJsonSchema, developerRequest.generationConfig.responseSchema);
  assert.equal(request.config.responseSchema, undefined);
  assert.match(request.config.systemInstruction, /Traditional Chinese/);
});

function completeGrowthPlan() {
  return {
    title: '四週小工具起步',
    summary: '用四週完成第一個可展示的小作品。',
    goalSummary: '完成一個可以展示的小工具',
    feasibility: { status: 'REALISTIC', message: '每週三次、每次約三十分鐘。' },
    coachingSummary: '先小步練習，再完成作品。',
    reasoningSummary: '安排在可用日子，保留每週時間上限。',
    milestones: [{ weekNumber: 1, title: '開始', purpose: '了解基礎', successSignal: '完成第一項練習' }, { weekNumber: 4, title: '輸出', purpose: '完成作品', successSignal: '有可展示成果' }],
    weeks: Array.from({ length: 4 }, (_, index) => ({
      weekNumber: index + 1,
      focus: '完成本週一個小步驟',
      tasks: [2, 4, 6].map((weekday) => ({
        weekday,
        startTime: '19:00',
        title: '短時間練習',
        totalMinutes: 30,
        instructions: ['準備今天的小主題', '專注練習一個步驟', '記下完成內容和下一步'],
        completionCriteria: '留下練習紀錄',
        easierFallback: '只做第一步十分鐘',
        coachingReason: '小步驟有助維持節奏',
      })),
    })),
  };
}

test('Personal Growth response 會由 server 固定為 Draft 並保留週任務', async () => {
  const fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(completeGrowthPlan()) }] } }] }) });
  const result = await generateWithGemini({ kind: 'personal-growth-plan', submission: growthSubmission }, { apiKey: 'test-key', fetchImpl });
  assert.equal(result.weeks.length, 4);
  assert.deepEqual(result.weeks.map((week) => week.status), Array(4).fill('DRAFT'));
  assert.equal(result.weeks[0].tasks[0].status, 'DRAFT');
});

test('Personal Growth keeps AI content while normalising an invalid AI schedule', async () => {
  const generated = completeGrowthPlan();
  generated.title = 'AI-specific interpersonal communication plan';
  generated.weeks[0].tasks[0].weekday = 1;
  generated.weeks[0].tasks[0].totalMinutes = 120;
  const fetchImpl = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(generated) }] } }] }) });

  const result = await generateWithGemini({ kind: 'personal-growth-plan', submission: growthSubmission }, { apiKey: 'test-key', fetchImpl });

  assert.equal(result.title, 'AI-specific interpersonal communication plan');
  assert.ok(growthSubmission.availableDays.includes(result.weeks[0].tasks[0].weekday));
  assert.ok(result.weeks[0].tasks[0].totalMinutes <= 45);
  assert.ok(result.weeks[0].estimatedTotalMinutes <= growthSubmission.weeklyMinutes);
});

function completeInitialPlan(weekday = 1) {
  return {
    title: '八週健康跑步起點',
    summary: '每週三課，先建立舒服節奏。',
    goalSummary: '建立長期健康的跑步習慣',
    feasibility: { status: 'REALISTIC', message: '八週起始階段適合目前能力。' },
    coachingSummary: '先穩定出席，再小幅增加時間。',
    reasoningSummary: '訓練日分開，保留恢復時間。',
    recommendedDays: [1, 3, 6],
    estimatedWeeklyMinutes: 90,
    phases: [
      { startWeek: 1, endWeek: 3, name: '建立節奏', purpose: '穩定開始', progressionSummary: '跑走交替' },
      { startWeek: 4, endWeek: 6, name: '延長時間', purpose: '增加耐力', progressionSummary: '小幅增加' },
      { startWeek: 7, endWeek: 8, name: '穩定完成', purpose: '完成起點', progressionSummary: '保留恢復' },
    ],
    weeks: Array.from({ length: 8 }, (_, index) => ({
      weekNumber: index + 1,
      focus: '舒服完成本週',
      sessions: [{
        weekday,
        type: 'RUN_WALK',
        title: '輕鬆跑走 25 分鐘',
        totalMinutes: 25,
        instructions: ['步行 5 分鐘熱身', '慢跑 2 分鐘、步行 2 分鐘並重複', '步行 5 分鐘放鬆'],
        rpe: { min: 3, max: 4 },
        talkTest: '能說完整句子',
        focus: '建立舒服節奏',
        easierFallback: '改為快步行 20 分鐘',
        coachingReason: '跑走交替讓身體逐步適應',
      }],
    })),
  };
}

test('完整 Gemini 計畫會由 server 加上不可由模型控制的 Draft 狀態', async () => {
  const fetchImpl = async () => ({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(completeInitialPlan()) }] } }] }),
  });

  const result = await generateWithGemini({ kind: 'initial-coaching-plan', submission }, { apiKey: 'test-key', fetchImpl });

  assert.equal(result.weeks.length, 8);
  assert.deepEqual(result.weeks.map((week) => week.status), Array(8).fill('DRAFT'));
  assert.equal(result.weeks[0].sessions[0].status, 'DRAFT');
  assert.equal(result.phases[0].id, 'phase-1');
});

test('計畫調整 request 只提供受控 feedback，並要求重新輸出完整可驗證計畫', () => {
  const request = buildGeminiRequest({
    kind: 'initial-coaching-revision',
    submission,
    currentPlan: completeInitialPlan(),
    feedback: 'START_EASIER',
    reason: '第一週看起來有點多',
    email: 'do-not-send@example.com',
  });
  const prompt = request.contents[0].parts[0].text;

  assert.match(prompt, /START_EASIER/);
  assert.match(prompt, /第一週看起來有點多/);
  assert.doesNotMatch(prompt, /do-not-send@example.com/);
  assert.equal(request.generationConfig.responseSchema.properties.weeks.type, 'array');
});

test('backend 會拒絕初學者連續跑步日，但容許在非可跑日標示 Rest', async () => {
  const beginnerSubmission = structuredClone(submission);
  beginnerSubmission.availability = { availableDays: [1, 2, 6], realisticFrequency: 3, timeByDay: { 1: '30_45', 2: '30_45', 6: '45_60' } };
  const consecutive = completeInitialPlan(1);
  for (const week of consecutive.weeks) week.sessions.push({ ...structuredClone(week.sessions[0]), weekday: 2, title: '星期二跑走' });
  const consecutiveFetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(consecutive) }] } }] }) });

  await assert.rejects(
    generateWithGemini({ kind: 'initial-coaching-plan', submission: beginnerSubmission }, { apiKey: 'test-key', fetchImpl: consecutiveFetch }),
    /恢復|recovery/i,
  );

  const withRest = completeInitialPlan(1);
  for (const week of withRest.weeks) week.sessions.push({ ...structuredClone(week.sessions[0]), weekday: 2, type: 'REST', title: '休息與輕鬆活動' });
  const restFetch = async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(withRest) }] } }] }) });
  const result = await generateWithGemini({ kind: 'initial-coaching-plan', submission }, { apiKey: 'test-key', fetchImpl: restFetch });
  assert.equal(result.weeks[0].sessions[1].type, 'REST');
});

test('計畫請求只使用 structured JSON output', () => {
  const request = buildGeminiRequest({ kind: 'running-plan', assessment });
  assert.equal(request.generationConfig.responseMimeType, 'application/json');
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
