import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  ActivityDays,
  ActivityType,
  AdultAgeRange,
  DailyTimeRange,
  GoalReason,
  JogAbility,
  OnboardingSubmission,
  PlanSession,
  RaceDistance,
  RealisticFrequency,
  RecentRunningFrequency,
  RunningOnboardingDraft,
  RunningPlanDraft,
  Weekday,
  WeeklyActivityTime,
  weekdayNames,
} from './domain';
import { InitialCoachingWorkflow, PlanDifference, PlanFeedback } from './coaching';

type ChoiceValue = string | number;
type Choice<T extends ChoiceValue> = readonly [T, string];

const goalReasons: Choice<GoalReason>[] = [
  ['fat_loss', '減脂'], ['health', '健康'], ['fitness', '提升體能'], ['stress_relief', '減壓'],
  ['discipline', '建立紀律'], ['race', '5K／10K／半馬／全馬'], ['other', '其他'],
];
const ageRanges: Choice<AdultAgeRange>[] = [
  ['under_18', '未滿 18'], ['18_24', '18–24'], ['25_34', '25–34'], ['35_44', '35–44'],
  ['45_54', '45–54'], ['55_64', '55–64'], ['65_plus', '65+'],
];
const runningFrequencies: Choice<RecentRunningFrequency>[] = [
  ['none', '完全沒有'], ['occasional', '偶爾'], ['once_weekly', '每週 1 次'],
  ['two_to_three_weekly', '每週 2–3 次'], ['four_plus_weekly', '每週 4 次以上'],
];
const jogAbilities: Choice<JogAbility>[] = [
  ['walk_30', '可以步行 30 分鐘'], ['under_5', '未必能慢跑 5 分鐘'], ['5_10', '慢跑約 5–10 分鐘'],
  ['10_20', '慢跑約 10–20 分鐘'], ['20_30', '慢跑約 20–30 分鐘'], ['30_plus', '慢跑 30 分鐘以上'], ['unknown', '不確定'],
];
const activeDayChoices: Choice<ActivityDays>[] = [[0, '0 天'], [1, '1 天'], [2, '2 天'], [3, '3 天'], [4, '4 天'], ['5_plus', '5 天以上'], ['unknown', '不確定']];
const weeklyTimeChoices: Choice<WeeklyActivityTime>[] = [
  ['under_30', '少於 30 分鐘'], ['30_60', '30–60 分鐘'], ['1_2_hours', '1–2 小時'],
  ['2_3_hours', '2–3 小時'], ['3_plus_hours', '3 小時以上'], ['unknown', '不確定'],
];
const activityChoices: Choice<ActivityType>[] = [
  ['running', '跑步'], ['walking', '步行'], ['strength', '健身／重量訓練'], ['ball_sports', '球類'],
  ['swimming', '游泳'], ['cycling', '單車'], ['other', '其他'],
];
const timeChoices: Choice<DailyTimeRange>[] = [
  ['20_30', '20–30 分鐘'], ['30_45', '30–45 分鐘'], ['45_60', '45–60 分鐘'],
  ['60_90', '60–90 分鐘'], ['90_plus', '90 分鐘以上'], ['unknown', '不確定'],
];
const frequencyChoices: Choice<RealisticFrequency>[] = [[2, '2 次'], [3, '3 次'], [4, '4 次'], [5, '5 次以上'], ['coach', '讓 Coach 建議']];
const allDays: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

function ChoiceGroup<T extends ChoiceValue>({ choices, selected, onSelect, multi = false }: {
  choices: Choice<T>[];
  selected: T | T[];
  onSelect: (value: T) => void;
  multi?: boolean;
}) {
  const values = Array.isArray(selected) ? selected : [selected];
  return <View style={styles.choiceWrap}>{choices.map(([value, label]) => {
    const active = values.includes(value);
    return <Pressable
      key={String(value)}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: active }}
      onPress={() => onSelect(value)}
      style={[styles.choice, active && styles.choiceOn]}
    ><Text style={[styles.choiceText, active && styles.choiceTextOn]}>{label}</Text></Pressable>;
  })}</View>;
}

function LabeledInput({ label, value, onChangeText, placeholder, multiline = false, numeric = false, optional = false }: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  optional?: boolean;
}) {
  return <View style={styles.field}><Text style={styles.label}>{label}{optional && <Text style={styles.optional}>（選填）</Text>}</Text><TextInput
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor="#9B978E"
    multiline={multiline}
    keyboardType={numeric ? 'decimal-pad' : 'default'}
    style={[styles.input, multiline && styles.textarea]}
  /></View>;
}

function StepHeader({ step, title, intro }: { step: number; title: string; intro: string }) {
  return <><Text style={styles.kicker}>STEP {step} OF 5</Text><Text style={styles.title}>{title}</Text><Text style={styles.intro}>{intro}</Text></>;
}

function YesNoRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.yesNoRow}><Text style={styles.yesNoLabel}>{label}</Text><View style={styles.yesNoButtons}><Pressable accessibilityRole="radio" accessibilityState={{ checked: !value }} onPress={() => onChange(false)} style={[styles.yesNoButton, !value && styles.yesNoButtonOn]}><Text style={[styles.yesNoText, !value && styles.yesNoTextOn]}>沒有</Text></Pressable><Pressable accessibilityRole="radio" accessibilityState={{ checked: value }} onPress={() => onChange(true)} style={[styles.yesNoButton, value && styles.riskButtonOn]}><Text style={[styles.yesNoText, value && styles.riskTextOn]}>有</Text></Pressable></View></View>;
}

export function RunningOnboardingScreen({ draft, onChange, onBackRoot, onSubmit }: {
  draft: RunningOnboardingDraft;
  onChange: (draft: RunningOnboardingDraft) => void;
  onBackRoot: () => void;
  onSubmit: (submission: OnboardingSubmission) => void;
}) {
  const submission = draft.submission;
  const step = draft.currentStep;
  const [applyTime, setApplyTime] = useState<DailyTimeRange>('30_45');
  const setSubmission = (next: OnboardingSubmission) => onChange({ ...draft, submission: next, updatedAt: new Date().toISOString() });
  const setStep = (next: RunningOnboardingDraft['currentStep']) => onChange({ ...draft, currentStep: next, updatedAt: new Date().toISOString() });
  const updateGoal = (goal: OnboardingSubmission['goal']) => setSubmission({ ...submission, goal });
  const updateAbility = (ability: OnboardingSubmission['ability']) => setSubmission({ ...submission, ability });
  const updateActivity = (recentActivity: OnboardingSubmission['recentActivity']) => setSubmission({ ...submission, recentActivity });
  const updateAvailability = (availability: OnboardingSubmission['availability']) => setSubmission({ ...submission, availability });
  const updateSafety = (safety: OnboardingSubmission['safety']) => setSubmission({ ...submission, safety });

  const back = () => step === 0 ? onBackRoot() : setStep((step - 1) as RunningOnboardingDraft['currentStep']);
  const next = () => {
    if (step === 0 && submission.goal.primaryReason === 'other' && !submission.goal.otherReason?.trim()) return Alert.alert('請補充主要原因', '選擇「其他」時，請簡短說明你為甚麼想跑步。');
    if (step === 0 && submission.goal.primaryReason === 'race' && (!submission.goal.raceDistance || !submission.goal.targetDate)) return Alert.alert('請補充比賽目標', '請選擇距離並填寫比賽或目標日期。');
    if (step === 1 && submission.ability.ageRange === 'under_18') return Alert.alert('V1 暫不支援未成年人', '目前版本只為 18 歲或以上使用者建立計畫。');
    if (step === 3 && !submission.availability.availableDays.length) return Alert.alert('請選擇可跑日期', '至少選擇一個通常有時間跑步的日子。');
    if (step === 3 && submission.availability.availableDays.some((day) => !submission.availability.timeByDay[day])) return Alert.alert('請選擇每天可用時間', '每個可跑日都需要一個大概時間區間。');
    if (step < 4) setStep((step + 1) as RunningOnboardingDraft['currentStep']);
  };

  const finish = () => {
    const result = new InitialCoachingWorkflow().validateSubmission(submission);
    const nonSafetyErrors = result.errors.filter((message) => !message.includes('安全篩查'));
    if (nonSafetyErrors.length) return Alert.alert('請檢查資料', nonSafetyErrors[0]);
    onSubmit(submission);
  };

  let content: React.ReactNode;
  if (step === 0) {
    const primary = submission.goal.primaryReason;
    const selectedReasons = [primary, ...submission.goal.secondaryReasons];
    const toggleGoalReason = (reason: GoalReason) => {
      const nextReasons = selectedReasons.includes(reason)
        ? selectedReasons.filter((item) => item !== reason)
        : [...selectedReasons, reason];
      const [nextPrimary, ...nextSecondary] = nextReasons;
      if (!nextPrimary) return;
      updateGoal({
        ...submission.goal,
        primaryReason: nextPrimary,
        secondaryReasons: nextSecondary,
      });
    };
    content = <>
      <StepHeader step={1} title="你的目標" intro="先選最主要的原因，再補充其他重要動機。Coach 會知道哪個結果應該優先。" />
      <Text style={styles.sectionTitle}>你最主要為甚麼想開始跑步？ <Text style={styles.helper}>（可單選或多選）</Text></Text>
      <ChoiceGroup multi choices={goalReasons} selected={selectedReasons} onSelect={toggleGoalReason} />
      {primary === 'other' && <LabeledInput label="你的主要原因" value={submission.goal.otherReason ?? ''} onChangeText={(otherReason) => updateGoal({ ...submission.goal, otherReason })} placeholder="例如：陪伴家人建立運動習慣" />}
      {primary === 'race' && <><Text style={styles.sectionTitle}>你的比賽距離</Text><ChoiceGroup choices={([['5k', '5K'], ['10k', '10K'], ['half_marathon', '半馬'], ['marathon', '全馬']] as Choice<RaceDistance>[])} selected={submission.goal.raceDistance ?? '5k'} onSelect={(raceDistance) => updateGoal({ ...submission.goal, raceDistance })} /><LabeledInput label="比賽或目標日期" value={submission.goal.targetDate ?? ''} onChangeText={(targetDate) => updateGoal({ ...submission.goal, targetDate })} placeholder="YYYY-MM-DD" /></>}
      {primary === 'fat_loss' && <LabeledInput label="期望改變多少 kg" value={submission.goal.targetWeightChangeKg ? String(submission.goal.targetWeightChangeKg) : ''} onChangeText={(value) => updateGoal({ ...submission.goal, targetWeightChangeKg: Number(value) || undefined })} numeric optional />}
      {primary !== 'race' && <LabeledInput label="具體目標或目標日期" value={submission.goal.specificTarget ?? ''} onChangeText={(specificTarget) => updateGoal({ ...submission.goal, specificTarget })} placeholder="例如：連續跑 5 km；或每星期跑 3 次" multiline optional />}
      <LabeledInput label="如果三個月後順利，你希望自己變成怎樣？" value={submission.goal.desiredIdentityInThreeMonths ?? ''} onChangeText={(desiredIdentityInThreeMonths) => updateGoal({ ...submission.goal, desiredIdentityInThreeMonths })} multiline optional />
      <View style={styles.contextCard}><LabeledInput label="你現在的情況是怎樣？" value={submission.goal.currentSituation ?? ''} onChangeText={(currentSituation) => updateGoal({ ...submission.goal, currentSituation })} placeholder="例如：工作時間不固定、很久沒有運動" multiline optional /><Text style={styles.helper}>不知道怎樣寫也沒問題，我們會根據之後的實際跑步慢慢了解你。</Text></View>
    </>;
  } else if (step === 1) {
    const ability = submission.ability;
    const confidence = ability.recentRun?.confidence ?? 'UNKNOWN';
    content = <>
      <StepHeader step={2} title="你現在的跑步水平" intro="不記得精確數字也沒關係。大概而真實的資料，比為了完成問卷而猜一個數字更有用。" />
      <Text style={styles.sectionTitle}>年齡區間</Text><ChoiceGroup choices={ageRanges} selected={ability.ageRange} onSelect={(ageRange) => updateAbility({ ...ability, ageRange })} />
      {ability.ageRange === 'under_18' && <View style={styles.riskCard}><Text style={styles.riskTitle}>V1 暫時只支援 18 歲或以上</Text><Text style={styles.riskText}>我們不會為未成年人生成可承諾的跑步處方。</Text></View>}
      <Text style={styles.sectionTitle}>最近四週，你有跑步嗎？</Text><ChoiceGroup choices={runningFrequencies} selected={ability.recentRunningFrequency} onSelect={(recentRunningFrequency) => updateAbility({ ...ability, recentRunningFrequency, recentRun: recentRunningFrequency === 'none' ? undefined : ability.recentRun ?? { confidence: 'UNKNOWN' } })} />
      {ability.recentRunningFrequency !== 'none' && <><Text style={styles.sectionTitle}>你記得最近一次跑步的大概情況嗎？</Text><ChoiceGroup choices={([['EXACT', '記得，可以填寫'], ['APPROXIMATE', '只記得大概'], ['UNKNOWN', '不太記得']] as Choice<'EXACT' | 'APPROXIMATE' | 'UNKNOWN'>[])} selected={confidence} onSelect={(next) => updateAbility({ ...ability, recentRun: next === 'EXACT' ? { confidence: 'EXACT', distanceKm: 3, durationMinutes: 30, rpe: 5 } : next === 'APPROXIMATE' ? { confidence: 'APPROXIMATE', distanceRange: '2_5', durationRange: '20_40', effort: 'comfortable' } : { confidence: 'UNKNOWN' } })} />
      {ability.recentRun?.confidence === 'EXACT' && <View style={styles.inlineFields}><LabeledInput label="距離 km" value={String(ability.recentRun.distanceKm)} onChangeText={(value) => updateAbility({ ...ability, recentRun: { ...ability.recentRun as Extract<NonNullable<typeof ability.recentRun>, { confidence: 'EXACT' }>, distanceKm: Number(value) || 0 } })} numeric /><LabeledInput label="時間（分鐘）" value={String(ability.recentRun.durationMinutes)} onChangeText={(value) => updateAbility({ ...ability, recentRun: { ...ability.recentRun as Extract<NonNullable<typeof ability.recentRun>, { confidence: 'EXACT' }>, durationMinutes: Number(value) || 0 } })} numeric /><LabeledInput label="辛苦程度 0–10" value={String(ability.recentRun.rpe)} onChangeText={(value) => updateAbility({ ...ability, recentRun: { ...ability.recentRun as Extract<NonNullable<typeof ability.recentRun>, { confidence: 'EXACT' }>, rpe: Number(value) || 0 } })} numeric /></View>}
      {ability.recentRun?.confidence === 'APPROXIMATE' && <><Text style={styles.label}>大概距離</Text><ChoiceGroup choices={([['under_2', '少於 2 km'], ['2_5', '2–5 km'], ['5_10', '5–10 km'], ['10_plus', '10 km+']] as Choice<'under_2' | '2_5' | '5_10' | '10_plus'>[])} selected={ability.recentRun.distanceRange} onSelect={(distanceRange) => updateAbility({ ...ability, recentRun: { ...ability.recentRun as Extract<NonNullable<typeof ability.recentRun>, { confidence: 'APPROXIMATE' }>, distanceRange } })} /><Text style={styles.label}>大概時間</Text><ChoiceGroup choices={([['under_20', '少於 20 分鐘'], ['20_40', '20–40 分鐘'], ['40_60', '40–60 分鐘'], ['60_plus', '1 小時以上']] as Choice<'under_20' | '20_40' | '40_60' | '60_plus'>[])} selected={ability.recentRun.durationRange} onSelect={(durationRange) => updateAbility({ ...ability, recentRun: { ...ability.recentRun as Extract<NonNullable<typeof ability.recentRun>, { confidence: 'APPROXIMATE' }>, durationRange } })} /><Text style={styles.label}>當時的感覺</Text><ChoiceGroup choices={([['easy', '很輕鬆'], ['comfortable', '還可以'], ['hard', '有點辛苦'], ['very_hard', '很辛苦']] as Choice<'easy' | 'comfortable' | 'hard' | 'very_hard'>[])} selected={ability.recentRun.effort} onSelect={(effort) => updateAbility({ ...ability, recentRun: { ...ability.recentRun as Extract<NonNullable<typeof ability.recentRun>, { confidence: 'APPROXIMATE' }>, effort } })} /></>}
      </>}
      <Text style={styles.sectionTitle}>你覺得現在可以連續慢跑多久？</Text><ChoiceGroup choices={jogAbilities} selected={ability.jogAbility} onSelect={(jogAbility) => updateAbility({ ...ability, jogAbility })} />
      <LabeledInput label="目前最長大概能跑多少 km" value={ability.longestDistanceKm ? String(ability.longestDistanceKm) : ''} onChangeText={(value) => updateAbility({ ...ability, longestDistanceKm: Number(value) || undefined })} numeric optional />
      <YesNoRow label="以前有沒有固定跑步的經驗？" value={ability.hadRunningHabit} onChange={(hadRunningHabit) => updateAbility({ ...ability, hadRunningHabit, previousHabitDuration: hadRunningHabit ? ability.previousHabitDuration ?? '1_3_months' : undefined, previousRunsPerWeek: hadRunningHabit ? ability.previousRunsPerWeek : undefined })} />
      {ability.hadRunningHabit && <><Text style={styles.label}>最長維持多久？</Text><ChoiceGroup choices={([['under_1_month', '少於 1 個月'], ['1_3_months', '1–3 個月'], ['3_6_months', '3–6 個月'], ['6_12_months', '6–12 個月'], ['1_plus_years', '1 年以上']] as Choice<NonNullable<typeof ability.previousHabitDuration>>[])} selected={ability.previousHabitDuration ?? '1_3_months'} onSelect={(previousHabitDuration) => updateAbility({ ...ability, previousHabitDuration })} /><LabeledInput label="當時平均每週跑幾次" value={ability.previousRunsPerWeek ? String(ability.previousRunsPerWeek) : ''} onChangeText={(value) => updateAbility({ ...ability, previousRunsPerWeek: Number(value) || undefined })} numeric optional /></>}
    </>;
  } else if (step === 2) {
    const activity = submission.recentActivity;
    content = <>
      <StepHeader step={3} title="最近四週的活動量" intro="只問會真正改變起始計畫的三件事，不需要逐日回想。" />
      <Text style={styles.sectionTitle}>平均一星期有多少天會做至少 20 分鐘的運動或較活躍活動？</Text><ChoiceGroup choices={activeDayChoices} selected={activity.activeDays} onSelect={(activeDays) => updateActivity({ ...activity, activeDays })} />
      <Text style={styles.sectionTitle}>平均一星期大約運動多久？</Text><ChoiceGroup choices={weeklyTimeChoices} selected={activity.weeklyTime} onSelect={(weeklyTime) => updateActivity({ ...activity, weeklyTime })} />
      <Text style={styles.sectionTitle}>你平常主要做哪些運動？</Text><Text style={styles.helper}>可多選，這題選填。</Text><ChoiceGroup multi choices={activityChoices} selected={activity.activityTypes} onSelect={(item) => updateActivity({ ...activity, activityTypes: activity.activityTypes.includes(item) ? activity.activityTypes.filter((value) => value !== item) : [...activity.activityTypes, item] })} />
      {activity.activityTypes.includes('other') && <LabeledInput label="其他運動" value={activity.otherActivity ?? ''} onChangeText={(otherActivity) => updateActivity({ ...activity, otherActivity })} optional />}
    </>;
  } else if (step === 3) {
    const availability = submission.availability;
    const toggleDay = (day: Weekday) => {
      const active = availability.availableDays.includes(day);
      const timeByDay = { ...availability.timeByDay };
      if (active) delete timeByDay[day]; else timeByDay[day] = applyTime;
      updateAvailability({ ...availability, availableDays: active ? availability.availableDays.filter((item) => item !== day) : [...availability.availableDays, day], timeByDay });
    };
    content = <>
      <StepHeader step={4} title="你現實可做到的時間" intro="Availability 是可以安排的窗口，不等於所有選中的日子都要跑。Coach 會保留恢復日。" />
      <Text style={styles.sectionTitle}>哪些日子你通常有時間跑步？</Text><View style={styles.dayRow}>{allDays.map((day) => <Pressable key={day} accessibilityRole="checkbox" accessibilityState={{ checked: availability.availableDays.includes(day) }} onPress={() => toggleDay(day)} style={[styles.day, availability.availableDays.includes(day) && styles.dayOn]}><Text style={[styles.dayText, availability.availableDays.includes(day) && styles.dayTextOn]}>{weekdayNames[day].replace('週', '')}</Text></Pressable>)}</View>
      <Text style={styles.sectionTitle}>即使工作很忙，每星期穩定做到幾次最現實？</Text><ChoiceGroup choices={frequencyChoices} selected={availability.realisticFrequency} onSelect={(realisticFrequency) => updateAvailability({ ...availability, realisticFrequency })} />
      <View style={styles.applyCard}><Text style={styles.label}>快速套用同一時間</Text><ChoiceGroup choices={timeChoices} selected={applyTime} onSelect={setApplyTime} /><Pressable accessibilityRole="button" onPress={() => updateAvailability({ ...availability, timeByDay: Object.fromEntries(availability.availableDays.map((day) => [day, applyTime])) })} style={styles.smallButton}><Text style={styles.smallButtonText}>套用到所有可跑日</Text></Pressable></View>
      {availability.availableDays.map((day) => <View key={day} style={styles.dayTime}><Text style={styles.dayTimeTitle}>{weekdayNames[day]}</Text><ChoiceGroup choices={timeChoices} selected={availability.timeByDay[day] ?? 'unknown'} onSelect={(range) => updateAvailability({ ...availability, timeByDay: { ...availability.timeByDay, [day]: range } })} /></View>)}
    </>;
  } else {
    const safety = submission.safety;
    content = <>
      <StepHeader step={5} title="安全檢查與提交" intro="這不是診斷，只是決定 App 是否適合立即產生跑步處方。任何一項為『有』，我們會先請你向合資格專業人士確認。" />
      <YesNoRow label="近期運動時曾胸痛" value={safety.hasChestPain} onChange={(hasChestPain) => updateSafety({ ...safety, hasChestPain })} />
      <YesNoRow label="近期曾暈眩或失去知覺" value={safety.hasDizziness} onChange={(hasDizziness) => updateSafety({ ...safety, hasDizziness })} />
      <YesNoRow label="有已知心臟或肺部疾病" value={safety.hasHeartOrLungCondition} onChange={(hasHeartOrLungCondition) => updateSafety({ ...safety, hasHeartOrLungCondition })} />
      <YesNoRow label="有會影響走路或跑步的痛楚／不適" value={safety.hasRunningPain} onChange={(hasRunningPain) => updateSafety({ ...safety, hasRunningPain })} />
      <YesNoRow label="醫生曾限制我進行運動" value={safety.hasMedicalRestriction} onChange={(hasMedicalRestriction) => updateSafety({ ...safety, hasMedicalRestriction })} />
      {Object.values(safety).some(Boolean) && <View style={styles.riskCard}><Text style={styles.riskTitle}>先照顧身體，再決定下一步</Text><Text style={styles.riskText}>你的答案出現需要進一步確認的訊號。草案會保存，但 App 不會要求 Gemini 產生可承諾的加強型處方。</Text></View>}
      <View style={styles.dataCard}><Text style={styles.dataTitle}>交給 Coach 的必要資料</Text><Text style={styles.dataText}>Gemini 只會收到這次的目標、年齡區間、跑步能力、最近活動量、可用日期／時間及安全答案。</Text><Text style={styles.dataText}>不會傳送電郵、帳戶 ID、push token 或歷史相片。API key 只保留在本機開發後端。</Text></View>
    </>;
  }

  return <View style={styles.page}><View style={styles.topBar}><Pressable accessibilityRole="button" onPress={back} style={styles.back}><Text style={styles.backText}>‹ 返回</Text></Pressable><Text style={styles.topTitle}>Running 起點</Text><Text style={styles.stepCount}>{step + 1}/5</Text></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{content}<View style={styles.footer}>{step < 4 ? <Pressable accessibilityRole="button" onPress={next} style={styles.primary}><Text style={styles.primaryText}>下一步</Text></Pressable> : <Pressable accessibilityRole="button" onPress={finish} style={styles.primary}><Text style={styles.primaryText}>交給 Coach 制定計畫</Text></Pressable>}</View></ScrollView></View>;
}

function SessionCard({ session }: { session: PlanSession }) {
  return <View style={styles.sessionCard}><View style={styles.rowBetween}><Text style={styles.sessionDay}>{weekdayNames[session.weekday]}</Text><Text style={styles.sessionMinutes}>{session.totalMinutes} 分鐘 · RPE {session.rpe.min}–{session.rpe.max}</Text></View><Text style={styles.sessionTitle}>{session.title}</Text><Text style={styles.sessionFocus}>今天重點：{session.focus}</Text>{session.instructions.map((instruction, index) => <View key={`${session.id}-${index}`} style={styles.instructionRow}><Text style={styles.instructionNumber}>{index + 1}</Text><Text style={styles.instructionText}>{instruction}</Text></View>)}<Text style={styles.talkTest}>說話測試：{session.talkTest}</Text><View style={styles.easier}><Text style={styles.easierTitle}>跟不上時怎樣做</Text><Text style={styles.easierText}>{session.easierFallback}</Text></View><Text style={styles.reasonText}>Coach 為甚麼這樣安排：{session.coachingReason}</Text></View>;
}

export type PendingPlanRevision = { draft: RunningPlanDraft; difference: PlanDifference };

export function InitialPlanReviewScreen({ draft, pendingRevision, onBack, onFeedback, onConfirmRevision, onCancelRevision, onCommit }: {
  draft: RunningPlanDraft;
  pendingRevision: PendingPlanRevision | null;
  onBack: () => void;
  onFeedback: (feedback: PlanFeedback, reason: string) => void;
  onConfirmRevision: () => void;
  onCancelRevision: () => void;
  onCommit: () => void;
}) {
  const review = useMemo(() => new InitialCoachingWorkflow().projectReview(draft), [draft]);
  const [expandedWeeks, setExpandedWeeks] = useState<number[]>([1]);
  const [feedbackReason, setFeedbackReason] = useState('');
  const toggleWeek = (week: number) => setExpandedWeeks((current) => current.includes(week) ? current.filter((item) => item !== week) : [...current, week]);
  return <View style={styles.page}><View style={styles.topBar}><Pressable accessibilityRole="button" onPress={onBack} style={styles.back}><Text style={styles.backText}>‹ 修改答案</Text></Pressable><Text style={styles.topTitle}>Initial Plan</Text><View style={styles.back} /></View><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.kicker}>{review.sourceLabel.toUpperCase()}</Text><Text style={styles.title}>{review.title}</Text><Text style={styles.intro}>{review.goalSummary}</Text>
    <View style={[styles.overviewCard, draft.safetyBlocked && styles.overviewRisk]}><Text style={styles.overviewLabel}>{draft.safetyBlocked ? '安全提醒' : 'PLAN OVERVIEW'}</Text><Text style={styles.overviewTitle}>{draft.safetyBlocked ? '目前不建立可承諾的跑步處方' : `${draft.cycleWeeks} 週 · 每週 ${draft.weekdays.length} 次`}</Text><Text style={styles.overviewText}>{draft.safetyBlocked ? '請先向醫生或合資格專業人士確認適合的運動方式，再回來更新安全答案。' : draft.summary}</Text></View>
    {!draft.safetyBlocked && <>
      <View style={styles.metrics}><View style={styles.metric}><Text style={styles.metricValue}>{draft.weekdays.map((day) => weekdayNames[day].replace('週', '')).join(' · ')}</Text><Text style={styles.metricLabel}>建議訓練日</Text></View><View style={styles.metric}><Text style={styles.metricValue}>約 {review.estimatedWeeklyMinutes} 分鐘</Text><Text style={styles.metricLabel}>第一週投入</Text></View></View>
      <View style={[styles.feasibility, review.feasibility.status === 'ADJUSTED' && styles.feasibilityAdjusted]}><Text style={styles.feasibilityTitle}>{review.feasibility.status === 'REALISTIC' ? '這是一個現實的起點' : 'Coach 已調整成安全階段目標'}</Text><Text style={styles.feasibilityText}>{review.feasibility.message}</Text></View>
      <Text style={styles.sectionTitle}>Coach 的計畫策略</Text><Text style={styles.body}>{review.coachingSummary}</Text><Text style={styles.reasoning}>{review.reasoningSummary}</Text>
      <Text style={styles.sectionTitle}>八週 Phase Roadmap</Text>{review.phases.map((phase) => <View key={phase.id} style={styles.phaseCard}><Text style={styles.phaseWeeks}>WEEKS {phase.startWeek}–{phase.endWeek}</Text><Text style={styles.phaseTitle}>{phase.name}</Text><Text style={styles.body}>{phase.purpose}</Text><Text style={styles.phaseProgress}>{phase.progressionSummary}</Text></View>)}
      <View style={styles.rowBetween}><Text style={styles.sectionTitle}>每週訓練</Text><Text style={styles.helper}>未來週是目前 roadmap</Text></View>{review.weeks.map((week) => {
        const expanded = expandedWeeks.includes(week.weekNumber);
        return <View key={week.id} style={styles.weekCard}><Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => toggleWeek(week.weekNumber)} style={styles.weekHeader}><View><Text style={styles.weekLabel}>WEEK {week.weekNumber} · {week.weekNumber === 1 ? '本週草案' : '暫定計畫'}</Text><Text style={styles.weekTitle}>{week.focus}</Text><Text style={styles.weekMeta}>{week.sessions.length} 課 · 約 {week.estimatedTotalMinutes} 分鐘</Text></View><Text style={styles.chevron}>{expanded ? '−' : '+'}</Text></Pressable>{expanded && <View style={styles.weekSessions}>{week.sessions.map((session) => <SessionCard key={session.id} session={session} />)}</View>}</View>;
      })}
      <View style={styles.feedbackCard}><Text style={styles.sectionTitle}>這個起始安排對你來說如何？</Text><LabeledInput label="有甚麼想讓 Coach 知道嗎？" value={feedbackReason} onChangeText={setFeedbackReason} multiline optional /><View style={styles.feedbackButtons}><Pressable onPress={() => onFeedback('START_EASIER', feedbackReason)} style={styles.feedbackButton}><Text style={styles.feedbackText}>我想從更輕鬆開始</Text></Pressable><Pressable onPress={() => onFeedback('SUITABLE', feedbackReason)} style={styles.feedbackButton}><Text style={styles.feedbackText}>這個程度適合</Text></Pressable><Pressable onPress={() => onFeedback('MORE_CHALLENGE', feedbackReason)} style={styles.feedbackButton}><Text style={styles.feedbackText}>我希望增加一點挑戰</Text></Pressable><Pressable onPress={() => onFeedback('ADJUST_DAY', feedbackReason)} style={styles.feedbackButton}><Text style={styles.feedbackText}>有一天需要調整</Text></Pressable></View></View>
      {pendingRevision && <View style={styles.diffCard}><Text style={styles.diffTitle}>修改前 → 修改後</Text><Text style={styles.diffLine}>每週建議次數：{pendingRevision.difference.frequency.before} → {pendingRevision.difference.frequency.after}</Text><Text style={styles.diffLine}>八週總分鐘：{pendingRevision.difference.totalMinutes.before} → {pendingRevision.difference.totalMinutes.after}</Text><Text style={styles.diffLine}>訓練日：{pendingRevision.difference.trainingDays.before.map((day) => weekdayNames[day]).join('、')} → {pendingRevision.difference.trainingDays.after.map((day) => weekdayNames[day]).join('、')}</Text>{pendingRevision.difference.sessionChanges.map((change) => <Text key={change} style={styles.diffBullet}>• {change}</Text>)}<View style={styles.diffActions}><Pressable onPress={onCancelRevision} style={styles.cancel}><Text style={styles.cancelText}>保留原計畫</Text></Pressable><Pressable onPress={onConfirmRevision} style={styles.accept}><Text style={styles.acceptText}>使用更新後計畫</Text></Pressable></View></View>}
      <View style={styles.commitNotice}><Text style={styles.commitTitle}>按下後才正式承諾</Text><Text style={styles.commitText}>Week 1 會成為 Committed；Week 2–8 保持 Planned。目標不能直接刪除，但你仍可暫停、完成或放棄並留下原因。</Text></View><Pressable accessibilityRole="button" onPress={onCommit} style={styles.primary}><Text style={styles.primaryText}>開始我的計畫</Text></Pressable>
    </>}
  </ScrollView></View>;
}

const c = { ink: '#20211E', muted: '#6F706A', paper: '#F7F5EF', white: '#FFFDF9', orange: '#F26B38', pale: '#FBE7DC', line: '#E4E0D6', green: '#2F6D58', red: '#A43E34' };
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: c.paper }, topBar: { minHeight: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }, back: { width: 92, minHeight: 42, justifyContent: 'center' }, backText: { color: c.orange, fontSize: 14, fontWeight: '800' }, topTitle: { color: c.ink, fontWeight: '900' }, stepCount: { width: 92, textAlign: 'right', color: c.muted, fontWeight: '800' }, content: { padding: 20, paddingBottom: 48, gap: 14 },
  kicker: { color: c.orange, fontSize: 11, fontWeight: '900', letterSpacing: 1.3 }, title: { color: c.ink, fontSize: 30, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8 }, intro: { color: c.muted, fontSize: 15, lineHeight: 23 }, sectionTitle: { color: c.ink, fontSize: 18, lineHeight: 24, fontWeight: '900', marginTop: 8 }, helper: { color: '#858279', fontSize: 12, lineHeight: 18 }, body: { color: c.muted, lineHeight: 22 }, reasoning: { color: c.green, lineHeight: 22, backgroundColor: '#E5F0EB', padding: 14, borderRadius: 14 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 13, borderWidth: 1, borderColor: c.line, backgroundColor: c.white }, choiceOn: { borderColor: c.ink, backgroundColor: c.ink }, choiceText: { color: c.muted, fontSize: 13, fontWeight: '700' }, choiceTextOn: { color: '#fff' },
  field: { gap: 7 }, label: { color: c.ink, fontSize: 13, fontWeight: '800' }, optional: { color: c.muted, fontWeight: '500' }, input: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: c.ink, fontSize: 15 }, textarea: { minHeight: 82, textAlignVertical: 'top' }, contextCard: { backgroundColor: '#EEEAE1', padding: 15, borderRadius: 18, gap: 8 }, inlineFields: { gap: 12 },
  yesNoRow: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 16, padding: 14, gap: 11 }, yesNoLabel: { color: c.ink, lineHeight: 21, fontWeight: '700' }, yesNoButtons: { flexDirection: 'row', gap: 8 }, yesNoButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#ECE9E1' }, yesNoButtonOn: { backgroundColor: c.ink }, riskButtonOn: { backgroundColor: '#F2D8D3' }, yesNoText: { color: c.muted, fontWeight: '800' }, yesNoTextOn: { color: '#fff' }, riskTextOn: { color: c.red }, riskCard: { backgroundColor: '#F3DCD7', borderRadius: 17, padding: 15, gap: 6 }, riskTitle: { color: '#752E28', fontSize: 16, fontWeight: '900' }, riskText: { color: '#7E4741', lineHeight: 21 },
  dayRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, day: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9E6DF' }, dayOn: { backgroundColor: c.ink }, dayText: { color: c.muted, fontWeight: '900' }, dayTextOn: { color: '#fff' }, applyCard: { borderRadius: 18, padding: 15, backgroundColor: c.pale, gap: 10 }, smallButton: { alignSelf: 'flex-start', borderRadius: 11, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: c.orange }, smallButtonText: { color: '#fff', fontWeight: '900', fontSize: 12 }, dayTime: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 17, padding: 14, gap: 10 }, dayTimeTitle: { color: c.ink, fontSize: 16, fontWeight: '900' },
  dataCard: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, gap: 8 }, dataTitle: { color: c.ink, fontWeight: '900', fontSize: 17 }, dataText: { color: c.muted, lineHeight: 21 }, footer: { paddingTop: 8 }, primary: { minHeight: 54, alignItems: 'center', justifyContent: 'center', backgroundColor: c.orange, borderRadius: 16, paddingHorizontal: 16 }, primaryText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  overviewCard: { backgroundColor: c.ink, borderRadius: 23, padding: 20, gap: 8 }, overviewRisk: { backgroundColor: '#71322D' }, overviewLabel: { color: '#F5A27F', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, overviewTitle: { color: '#fff', fontSize: 22, lineHeight: 28, fontWeight: '900' }, overviewText: { color: '#D6D4CE', lineHeight: 22 }, metrics: { flexDirection: 'row', gap: 9 }, metric: { flex: 1, backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 15, padding: 13, gap: 3 }, metricValue: { color: c.ink, fontSize: 15, fontWeight: '900' }, metricLabel: { color: c.muted, fontSize: 10 }, feasibility: { backgroundColor: '#E5F0EB', padding: 15, borderRadius: 16, gap: 5 }, feasibilityAdjusted: { backgroundColor: '#F6E8CE' }, feasibilityTitle: { color: c.green, fontWeight: '900' }, feasibilityText: { color: c.muted, lineHeight: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, phaseCard: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, padding: 16, gap: 6 }, phaseWeeks: { color: c.orange, fontSize: 10, fontWeight: '900', letterSpacing: 1 }, phaseTitle: { color: c.ink, fontWeight: '900', fontSize: 17 }, phaseProgress: { color: c.green, fontSize: 13, lineHeight: 19 }, weekCard: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 18, overflow: 'hidden' }, weekHeader: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, weekLabel: { color: c.orange, fontSize: 10, fontWeight: '900' }, weekTitle: { color: c.ink, fontSize: 16, fontWeight: '900', marginTop: 3 }, weekMeta: { color: c.muted, fontSize: 11, marginTop: 4 }, chevron: { color: c.orange, fontSize: 25, fontWeight: '800' }, weekSessions: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.line, padding: 12, gap: 11 },
  sessionCard: { backgroundColor: '#F1EEE7', borderRadius: 16, padding: 14, gap: 9 }, sessionDay: { color: c.orange, fontSize: 11, fontWeight: '900' }, sessionMinutes: { color: c.muted, fontSize: 10, fontWeight: '700' }, sessionTitle: { color: c.ink, fontSize: 18, fontWeight: '900' }, sessionFocus: { color: c.green, fontSize: 12, lineHeight: 18, fontWeight: '700' }, instructionRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' }, instructionNumber: { width: 22, height: 22, borderRadius: 8, textAlign: 'center', textAlignVertical: 'center', backgroundColor: c.ink, color: '#fff', fontSize: 11, fontWeight: '900' }, instructionText: { flex: 1, color: c.ink, lineHeight: 20, fontSize: 13 }, talkTest: { color: c.muted, lineHeight: 20, fontSize: 12 }, easier: { backgroundColor: c.white, borderRadius: 12, padding: 11, gap: 3 }, easierTitle: { color: c.orange, fontWeight: '900', fontSize: 12 }, easierText: { color: c.muted, lineHeight: 19, fontSize: 12 }, reasonText: { color: '#77746C', fontSize: 11, lineHeight: 17 },
  feedbackCard: { backgroundColor: c.white, borderWidth: 1, borderColor: c.line, borderRadius: 19, padding: 16, gap: 12 }, feedbackButtons: { gap: 8 }, feedbackButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 13, borderRadius: 12, backgroundColor: '#ECE9E1' }, feedbackText: { color: c.ink, fontWeight: '800', fontSize: 13 }, diffCard: { backgroundColor: '#E7F0EC', borderRadius: 19, padding: 16, gap: 7 }, diffTitle: { color: c.green, fontSize: 18, fontWeight: '900' }, diffLine: { color: c.ink, lineHeight: 20 }, diffBullet: { color: c.muted, fontSize: 12 }, diffActions: { flexDirection: 'row', gap: 9, marginTop: 7 }, cancel: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#D9E1DD' }, cancelText: { color: c.ink, fontWeight: '800', fontSize: 12 }, accept: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: c.green }, acceptText: { color: '#fff', fontWeight: '900', fontSize: 12 }, commitNotice: { backgroundColor: c.pale, borderRadius: 17, padding: 15, gap: 5 }, commitTitle: { color: '#7B391F', fontWeight: '900' }, commitText: { color: '#82513D', lineHeight: 20, fontSize: 12 },
});
