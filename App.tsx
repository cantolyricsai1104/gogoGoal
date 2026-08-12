import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageStyle,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { encouragePhoto, generateInitialPlanWithGemini, generateNextPersonalGrowthWeekWithGemini, generatePersonalGrowthPlanWithGemini, requestInitialPlanRevision } from './src/ai';
import {
  Account,
  AppData,
  defaultOnboardingSubmission,
  OnboardingSubmission,
  RecoveryType,
  RunRecord,
  RunningGoal,
  RunningOnboardingDraft,
  RunningPlanDraft,
  PersonalGrowthFocus,
  PersonalGrowthGoal,
  PersonalGrowthOnboardingDraft,
  PersonalGrowthPlanDraft,
  PersonalGrowthWeeklyReview,
  defaultPersonalGrowthSubmission,
  Weekday,
  weekdayNames,
} from './src/domain';
import { InitialCoachingWorkflow, PlanFeedback } from './src/coaching';
import { InitialPlanReviewScreen, PendingPlanRevision, RunningOnboardingScreen } from './src/coaching-ui';
import { classificationLabels, lifeWheelCategories } from './src/life-wheel';
import { cleanupExpiredPhotos, deleteAllAccountPhotos, deleteStoredPhoto, pickAndStorePhoto } from './src/media';
import { cancelRunningReminders, requestNotificationPermission, scheduleRunningReminders } from './src/notifications';
import { emptyAppData, loadAppData, loginLocally, replaceAccount, saveAppData } from './src/storage';
import { addDays, dateKeyInZone, isValidTimezone, minutesUntilSecondPhoto } from './src/time';
import { RunningCommitmentWorkflow } from './src/workflow';
import { PersonalGrowthWorkflow, personalGrowthFocusOptions } from './src/personal-growth';
import { PersonalGrowthCategoryScreen, PersonalGrowthGoalScreen, PersonalGrowthOnboardingScreen, PersonalGrowthPlanReviewScreen } from './src/personal-growth-ui';

type Screen = 'workspace' | 'health' | 'keep-fit' | 'personal-growth' | 'growth-assessment' | 'growth-draft' | 'growth-goal' | 'assessment' | 'draft' | 'goal' | 'calendar' | 'archive' | 'settings' | 'revise';
type Notice = { title: string; message: string } | null;

const workflow = new RunningCommitmentWorkflow();
const coachingWorkflow = new InitialCoachingWorkflow();
const personalGrowthWorkflow = new PersonalGrowthWorkflow();
const allDays: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const statusLabel: Record<RunningGoal['status'], string> = { active: '進行中', paused: '已暫停', completed: '已完成', abandoned: '已放棄' };
const runStatusLabel: Record<RunRecord['status'], string> = { planned: '待完成', in_progress: '已開始', completed: '已完成', absent: '缺席', skipped: '已跳過' };

const localTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Hong_Kong';
const formatDate = (value: string) => new Intl.DateTimeFormat('zh-Hant-HK', { month: 'short', day: 'numeric', weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00.000Z`));
const currentVersion = (goal: RunningGoal) => {
  const version = goal.planVersions[goal.planVersions.length - 1];
  const classification = goal.classification ?? { category: 'health' as const, subcategory: 'exercise' as const, activity: 'running' as const };
  const categoryLabel = lifeWheelCategories.find(([category]) => category === classification.category)?.[1] ?? '健康（身心）';
  const suffix = `${categoryLabel} ／ 運動 ／ ${classificationLabels[classification.activity]}`;
  return version.summary.includes(suffix) ? version : { ...version, summary: `${version.summary} · ${suffix}` };
};

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

function AppContent() {
  const [data, setData] = useState<AppData>(emptyAppData());
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>('workspace');
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedGrowthGoalId, setSelectedGrowthGoalId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [growthDraftId, setGrowthDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [pendingRevision, setPendingRevision] = useState<PendingPlanRevision | null>(null);

  const account = useMemo(() => data.accounts.find((item) => item.id === data.sessionAccountId) ?? null, [data]);
  const selectedGoal = account?.goals.find((goal) => goal.id === selectedGoalId) ?? account?.goals.find((goal) => goal.status === 'active' || goal.status === 'paused') ?? null;
  const draft = account?.drafts.find((item) => item.id === draftId) ?? (screen === 'draft' ? account?.drafts[0] ?? null : null);
  const growthGoal = account?.personalGrowthGoals?.find((goal) => goal.id === selectedGrowthGoalId) ?? account?.personalGrowthGoals?.find((goal) => goal.status === 'active' || goal.status === 'paused') ?? null;
  const growthDraft = account?.personalGrowthDrafts?.find((item) => item.id === growthDraftId) ?? (screen === 'growth-draft' ? account?.personalGrowthDrafts?.[0] ?? null : null);

  useEffect(() => {
    loadAppData()
      .then(async (loaded) => {
        const now = new Date();
        const deletionCutoff = now.getTime() - 30 * 24 * 60 * 60_000;
        const dueForDeletion = loaded.accounts.filter((item) => item.deletionRequestedAt && new Date(item.deletionRequestedAt).getTime() <= deletionCutoff);
        for (const doomed of dueForDeletion) await deleteAllAccountPhotos(doomed);
        const dueIds = new Set(dueForDeletion.map((item) => item.id));
        const pruned: AppData = {
          sessionAccountId: loaded.sessionAccountId && !dueIds.has(loaded.sessionAccountId) ? loaded.sessionAccountId : undefined,
          accounts: loaded.accounts.filter((item) => !dueIds.has(item.id)),
        };
        const active = pruned.accounts.find((item) => item.id === pruned.sessionAccountId);
        if (!active) return pruned;
        const settled = workflow.settleAbsences(active, new Date());
        const cleaned = await cleanupExpiredPhotos(settled, new Date());
        return replaceAccount(pruned, cleaned);
      })
      .then(setData)
      .catch(() => setNotice({ title: '無法載入資料', message: '你仍可重新登入；現有本機資料未被覆寫。' }))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveAppData(data).catch(() => setNotice({ title: '暫時無法儲存', message: '請保持 App 開啟並稍後再試。' }));
  }, [data, ready]);

  const updateAccount = (next: Account) => setData((current) => replaceAccount(current, next));
  const showMessage = (message: string, title = 'Go Go Goal') => setNotice({ title, message });

  const openGoal = (goal: RunningGoal) => {
    setSelectedGoalId(goal.id);
    setScreen('goal');
  };

  const saveDraft = async (submission: OnboardingSubmission) => {
    if (!account) return;
    setBusy('Coach 正在建立完整八週起始計畫…');
    const base = coachingWorkflow.createFallbackPlan(submission, new Date());
    const nextDraft = base.safetyBlocked ? base : await generateInitialPlanWithGemini(submission, base);
    updateAccount(workflow.saveDraft(account, nextDraft));
    setDraftId(nextDraft.id);
    setPendingRevision(null);
    setBusy(null);
    setScreen('draft');
  };

  const saveOnboardingDraft = (next: RunningOnboardingDraft) => {
    if (!account) return;
    updateAccount({ ...account, onboardingDraft: next });
  };

  const savePersonalGrowthOnboardingDraft = (next: PersonalGrowthOnboardingDraft) => {
    if (!account) return;
    updateAccount({ ...account, personalGrowthOnboardingDraft: next });
  };

  const startPersonalGrowth = (focus: PersonalGrowthFocus, otherFocus = '') => {
    if (!account) return;
    const existing = account.personalGrowthOnboardingDraft;
    if (existing?.submission.focus.primary === focus && (existing.submission.otherFocus ?? '') === otherFocus.trim()) {
      setScreen('growth-assessment');
      return;
    }
    const submission = { ...defaultPersonalGrowthSubmission, focus: { primary: focus, secondary: [] }, otherFocus: otherFocus.trim() || undefined, startDate: dateKeyInZone(new Date(), account.timezone) };
    updateAccount({ ...account, personalGrowthOnboardingDraft: { currentStep: 0, submission, updatedAt: new Date().toISOString() } });
    setScreen('growth-assessment');
  };

  const savePersonalGrowthDraft = async (submission: PersonalGrowthOnboardingDraft['submission']) => {
    if (!account) return;
    setData((current) => {
      const active = current.accounts.find((item) => item.id === current.sessionAccountId);
      if (!active) return current;
      return replaceAccount(current, {
        ...active,
        personalGrowthOnboardingDraft: { currentStep: 3, submission, updatedAt: new Date().toISOString() },
      });
    });
    setBusy('Coach 正在整理你的個人成長計畫…');
    const base = personalGrowthWorkflow.createFallbackPlan(submission, new Date());
    try {
      const generated = await generatePersonalGrowthPlanWithGemini(submission, base);
      if (!(generated.submission.focus.primary === submission.focus.primary
        && generated.cycleWeeks === submission.cycleWeeks
        && generated.weeklyMinutes === submission.weeklyMinutes
        && generated.weeks.length === 1
        && generated.weeks[0]?.weekNumber === 1)) throw new Error('Gemini returned an invalid Week 1 plan');
      const nextDraft = generated;
      setData((current) => {
        const active = current.accounts.find((item) => item.id === current.sessionAccountId);
        if (!active) return current;
        const withDraft = personalGrowthWorkflow.saveDraft(active, nextDraft);
        return replaceAccount(current, {
          ...withDraft,
          // Keep the submitted answers available for a safe retry or edit.
          personalGrowthOnboardingDraft: { currentStep: 3, submission, updatedAt: new Date().toISOString() },
        });
      });
      setGrowthDraftId(nextDraft.id);
      setScreen('growth-draft');
    } catch (error) {
      const detail = error instanceof Error && error.message ? `\n原因：${error.message}` : '';
      showMessage(`已保留你選擇的答案和排程。請按「生成我的計畫」重試。${detail}`, '暫時未能生成計畫');
    } finally {
      setBusy(null);
    }
  };

  const savePersonalGrowthDraftEdits = (nextDraft: PersonalGrowthPlanDraft) => {
    if (!account) return;
    updateAccount({ ...account, personalGrowthDrafts: (account.personalGrowthDrafts ?? []).map((item) => item.id === nextDraft.id ? nextDraft : item) });
  };

  const savePersonalGrowthGoal = (nextGoal: PersonalGrowthGoal) => {
    if (!account) return;
    updateAccount({ ...account, personalGrowthGoals: (account.personalGrowthGoals ?? []).map((item) => item.id === nextGoal.id ? nextGoal : item) });
  };

  const commitPersonalGrowthDraft = () => {
    if (!account || !growthDraft) return;
    const result = growthDraft.continuationGoalId
      ? personalGrowthWorkflow.applyWeeklyDraft(account, growthDraft)
      : personalGrowthWorkflow.commit(account, growthDraft, new Date());
    if (!result.ok) return showMessage(result.message, '尚未確認計畫');
    updateAccount(result.value);
    const goal = result.value.personalGrowthGoals?.find((item) => item.id === growthDraft.continuationGoalId) ?? result.value.personalGrowthGoals?.[0];
    if (goal) setSelectedGrowthGoalId(goal.id);
    setScreen('growth-goal');
    showMessage(result.message, '個人成長目標已保存');
  };

  const prepareNextPersonalGrowthWeek = async (review: PersonalGrowthWeeklyReview) => {
    if (!account || !growthGoal) return;
    setBusy(`Coach 正在根據你的回顧準備第 ${review.weekNumber + 1} 週…`);
    try {
      const base = personalGrowthWorkflow.createContinuationFallbackPlan(growthGoal, review, new Date());
      const generated = await generateNextPersonalGrowthWeekWithGemini(growthGoal, review, base);
      const expectedWeek = review.weekNumber + 1;
      if (!(generated.continuationGoalId === growthGoal.id && generated.weeks.length === 1 && generated.weeks[0]?.weekNumber === expectedWeek && generated.weeklyReview?.weekNumber === review.weekNumber)) throw new Error('Gemini returned an invalid next-week plan');
      setData((current) => {
        const active = current.accounts.find((item) => item.id === current.sessionAccountId);
        if (!active) return current;
        return replaceAccount(current, personalGrowthWorkflow.saveDraft(active, generated));
      });
      setGrowthDraftId(generated.id);
      setScreen('growth-draft');
    } catch (error) {
      const detail = error instanceof Error && error.message ? `\n原因：${error.message}` : '';
      showMessage(`本週進度尚未被覆蓋。請稍後再試，或保留目前計畫再回來。${detail}`, '暫時未能準備下一週');
    } finally {
      setBusy(null);
    }
  };

  const archivePersonalGrowthGoal = () => {
    if (!growthGoal) return;
    savePersonalGrowthGoal({ ...growthGoal, status: 'abandoned' });
    setScreen('workspace');
  };

  const completePersonalGrowthGoal = () => {
    if (!growthGoal) return;
    savePersonalGrowthGoal({ ...growthGoal, status: 'completed' });
    setScreen('workspace');
  };

  const extendPersonalGrowthGoal = () => {
    if (!growthGoal) return;
    const nextEnd = addDays(growthGoal.endDate, 7);
    savePersonalGrowthGoal({
      ...growthGoal,
      endDate: nextEnd,
      cycleWeeks: growthGoal.cycleWeeks + 1,
      plan: {
        ...growthGoal.plan,
        cycleWeeks: growthGoal.cycleWeeks + 1,
        submission: { ...growthGoal.plan.submission, cycleWeeks: growthGoal.cycleWeeks + 1 },
        weeks: growthGoal.plan.weeks.map((week) => ({
          ...week,
          tasks: week.tasks.map((task) => task.status === 'PLANNED' && task.date ? { ...task, date: addDays(task.date, 7) } : task),
        })),
      },
    });
    showMessage('未完成任務已順延一週。', '計畫已延長');
  };

  const reviseInitialDraft = async (feedback: PlanFeedback, reason: string) => {
    if (!draft) return;
    if (feedback === 'SUITABLE') {
      showMessage('很好。Coach 會保持目前的安全起點，只有你按下「開始我的計畫」後才正式承諾。', '這個程度保持不變');
      return;
    }
    setBusy('Coach 正在評估你提出的調整…');
    const revised = await requestInitialPlanRevision(draft, feedback, reason);
    setBusy(null);
    if (!revised) {
      showMessage('原本的草案完全沒有被修改。請確認本機 Gemini 後端可用後再試。', '暫時未能產生安全調整');
      return;
    }
    setPendingRevision({ draft: revised, difference: coachingWorkflow.comparePlans(draft, revised) });
  };

  const finishCommit = async (nextPermission: Account['notificationPermission']) => {
    if (!account || !draft) return;
    const prepared = { ...account, notificationPermission: nextPermission, onboardingDraft: undefined };
    const result = workflow.commit(prepared, draft, new Date());
    if (!result.ok) return showMessage(result.message, '尚未建立承諾');
    updateAccount(result.value);
    const goal = result.value.goals[0];
    setSelectedGoalId(goal.id);
    setScreen('goal');
    await scheduleRunningReminders(goal, result.value).catch(() => undefined);
    showMessage(nextPermission === 'granted' ? '承諾已啟動，跑步日的 10:00 與 20:00 提醒已安排。' : '承諾已啟動。你未啟用通知，請主動回到 Workspace 查看今天的任務。', '你的承諾已生效');
  };

  const commitDraft = () => {
    if (!account || !draft) return;
    if (account.notificationPermission === 'undetermined') {
      if (Platform.OS === 'web') {
        finishCommit('unavailable');
        return;
      }
      Alert.alert(
        '是否啟用承諾提醒？',
        '若不啟用，你仍可承諾，但不會收到跑步日 10:00 與 20:00 的提醒。',
        [
          { text: '繼續但不通知', style: 'cancel', onPress: () => finishCommit('denied') },
          { text: '啟用通知', onPress: async () => finishCommit(await requestNotificationPermission()) },
        ],
      );
      return;
    }
    finishCommit(account.notificationPermission);
  };

  const uploadPhoto = async () => {
    if (!account || !selectedGoal) return;
    const start = async (analysisEnabled: boolean) => {
      setBusy('正在保存相片…');
      let uri: string | null = null;
      try {
        uri = await pickAndStorePhoto();
        if (!uri) return;
        const encouragement = await encouragePhoto(uri, analysisEnabled);
        const result = workflow.checkIn({ ...account, photoAnalysisConsent: analysisEnabled }, selectedGoal.id, uri, encouragement.text, encouragement.analysis, new Date());
        if (!result.ok) {
          await deleteStoredPhoto(uri);
          return showMessage(result.message, '未能打卡');
        }
        updateAccount(result.value);
        showMessage(`${encouragement.text}\n\n${result.message}`, result.message.includes('完成') ? '今天完成了' : '第一張已記錄');
      } catch (error) {
        if (uri) await deleteStoredPhoto(uri);
        showMessage(error instanceof Error ? error.message : '相片上傳失敗，請再試一次。', '未能保存相片');
      } finally {
        setBusy(null);
      }
    };
    if (!account.photoAnalysisConsent) {
      Alert.alert(
        '相片鼓勵需要你的同意',
        '若啟用，相片會傳送到已設定的 Gemini 後端，只用來產生一則簡短正向鼓勵，不會判定你是否真的跑步。你可隨時在設定關閉。',
        [
          { text: '不分析，照常打卡', style: 'cancel', onPress: () => start(false) },
          { text: '同意並啟用', onPress: () => start(true) },
        ],
      );
      return;
    }
    start(true);
  };

  const applyGoalResult = (result: ReturnType<typeof workflow.pause>) => {
    if (!result.ok) return showMessage(result.message, '未能更新目標');
    updateAccount(result.value);
    showMessage(result.message);
  };

  if (!ready) {
    return <SafeAreaView style={styles.loading}><ActivityIndicator size="large" color="#F26B38" /><Text style={styles.muted}>正在打開你的 Workspace…</Text></SafeAreaView>;
  }

  if (!account) {
    return <LoginScreen data={data} onLogin={(email, timezone) => {
      try {
        const result = loginLocally(data, email, timezone);
        setData(result.data);
        setScreen('workspace');
      } catch (error) {
        showMessage(error instanceof Error ? error.message : '登入失敗。', '請檢查資料');
      }
    }} notice={notice} dismissNotice={() => setNotice(null)} />;
  }

  let content: React.ReactNode;
  if (screen === 'health') {
    content = <HealthScreen onBack={() => setScreen('workspace')} onExercise={() => setScreen('keep-fit')} />;
  } else if (screen === 'personal-growth') {
    content = <PersonalGrowthCategoryScreen onBack={() => setScreen('workspace')} onStart={startPersonalGrowth} />;
  } else if (screen === 'growth-assessment') {
    const onboardingDraft: PersonalGrowthOnboardingDraft = account.personalGrowthOnboardingDraft ?? {
      currentStep: 0,
      submission: defaultPersonalGrowthSubmission,
      updatedAt: new Date().toISOString(),
    };
    content = <PersonalGrowthOnboardingScreen draft={onboardingDraft} onChange={savePersonalGrowthOnboardingDraft} onBackRoot={() => setScreen('personal-growth')} onSubmit={savePersonalGrowthDraft} />;
  } else if (screen === 'keep-fit') {
    content = <KeepFitScreen onBack={() => setScreen('health')} onRunning={() => {
      const current = account.goals.find((goal) => goal.status === 'active' || goal.status === 'paused');
      if (current) openGoal(current);
      else if (account.drafts[0]) {
        setDraftId(account.drafts[0].id);
        setScreen('draft');
      } else setScreen('assessment');
    }} />;
  } else if (screen === 'assessment') {
    const onboardingDraft: RunningOnboardingDraft = account.onboardingDraft ?? {
      currentStep: 0,
      submission: defaultOnboardingSubmission,
      updatedAt: new Date().toISOString(),
    };
    content = <RunningOnboardingScreen draft={onboardingDraft} onChange={saveOnboardingDraft} onBackRoot={() => setScreen('keep-fit')} onSubmit={saveDraft} />;
  } else if (screen === 'draft' && draft) {
    content = <InitialPlanReviewScreen
      draft={draft}
      pendingRevision={pendingRevision}
      onBack={() => setScreen('assessment')}
      onFeedback={reviseInitialDraft}
      onCancelRevision={() => setPendingRevision(null)}
      onConfirmRevision={() => {
        if (!pendingRevision) return;
        updateAccount(workflow.saveDraft(account, pendingRevision.draft));
        setDraftId(pendingRevision.draft.id);
        setPendingRevision(null);
      }}
      onCommit={commitDraft}
    />;
  } else if (screen === 'growth-draft' && growthDraft) {
    content = <PersonalGrowthPlanReviewScreen draft={growthDraft} onBack={() => setScreen(growthDraft.continuationGoalId ? 'growth-goal' : 'growth-assessment')} onChange={savePersonalGrowthDraftEdits} onCommit={commitPersonalGrowthDraft} />;
  } else if (screen === 'growth-goal' && growthGoal) {
    content = <PersonalGrowthGoalScreen
      goal={growthGoal}
      onBack={() => setScreen('workspace')}
      onChange={savePersonalGrowthGoal}
      onPrepareNextWeek={prepareNextPersonalGrowthWeek}
      onComplete={completePersonalGrowthGoal}
      onExtend={extendPersonalGrowthGoal}
      onArchive={archivePersonalGrowthGoal}
      onDelete={() => Alert.alert('永久刪除此計畫？', '此操作無法復原。', [{ text: '取消', style: 'cancel' }, { text: '永久刪除', style: 'destructive', onPress: () => { if (!account || !growthGoal) return; updateAccount({ ...account, personalGrowthGoals: (account.personalGrowthGoals ?? []).filter((item) => item.id !== growthGoal.id) }); setScreen('workspace'); } }])}
    />;
  } else if (screen === 'goal' && selectedGoal) {
    content = <GoalScreen
      account={account}
      goal={selectedGoal}
      onBack={() => setScreen('workspace')}
      onCheckIn={uploadPhoto}
      onDeletePhoto={(date, photoId, uri) => Alert.alert('刪除這張相片？', '完成／缺席的文字紀錄仍會保留。', [
        { text: '取消', style: 'cancel' },
        { text: '刪除相片', style: 'destructive', onPress: async () => {
          await deleteStoredPhoto(uri);
          const result = workflow.removePhoto(account, selectedGoal.id, date, photoId);
          if (result.ok) updateAccount(result.value);
          showMessage(result.message);
        } },
      ])}
      onCalendar={() => setScreen('calendar')}
      onRevise={() => setScreen('revise')}
      onPause={(reason, resumeDate) => applyGoalResult(workflow.pause(account, selectedGoal.id, reason, resumeDate, new Date()))}
      onResume={() => applyGoalResult(workflow.resume(account, selectedGoal.id, new Date()))}
      onAbandon={(reason) => applyGoalResult(workflow.abandon(account, selectedGoal.id, reason, new Date()))}
      onComplete={() => applyGoalResult(workflow.complete(account, selectedGoal.id, new Date()))}
      onRecover={(date, type, reason, rescheduledDate) => applyGoalResult(workflow.recoverAbsence(account, selectedGoal.id, date, type, reason, rescheduledDate, new Date()))}
    />;
  } else if (screen === 'revise' && selectedGoal) {
    content = <ReviseScreen goal={selectedGoal} onBack={() => setScreen('goal')} onSave={async (days, minutes, summary, reason) => {
      const result = workflow.revise(account, selectedGoal.id, days, minutes, summary, reason, new Date());
      if (!result.ok) return showMessage(result.message, '未能修改計畫');
      updateAccount(result.value);
      setScreen('goal');
      await cancelRunningReminders().catch(() => undefined);
      const goal = result.value.goals.find((item) => item.id === selectedGoal.id);
      if (goal) await scheduleRunningReminders(goal, result.value).catch(() => undefined);
      showMessage(result.message);
    }} />;
  } else if (screen === 'calendar') {
    content = <CalendarScreen account={account} goal={selectedGoal} onBack={() => setScreen('workspace')} onOpen={openGoal} />;
  } else if (screen === 'archive') {
    content = <ArchiveScreen account={account} onOpen={openGoal} />;
  } else if (screen === 'settings') {
    content = <SettingsScreen account={account} onUpdate={updateAccount} onLogout={() => {
      setData((current) => ({ ...current, sessionAccountId: undefined }));
      setScreen('workspace');
    }} showMessage={showMessage} />;
  } else {
    content = <WorkspaceScreen account={account} onHealth={() => setScreen('health')} onPersonalGrowth={() => setScreen('personal-growth')} onOpenGrowth={(goal) => { setSelectedGrowthGoalId(goal.id); setScreen('growth-goal'); }} onOpen={openGoal} />;
  }

  const activeTab: Screen = screen === 'calendar' ? 'calendar' : screen === 'archive' ? 'archive' : screen === 'settings' ? 'settings' : 'workspace';
  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <View style={styles.main}>{content}</View>
      {!['assessment', 'draft', 'goal', 'revise', 'health', 'keep-fit', 'personal-growth', 'growth-assessment', 'growth-draft', 'growth-goal'].includes(screen) && <BottomTabs active={activeTab} onSelect={setScreen} />}
      {busy && <BusyOverlay message={busy} />}
      {notice && <NoticeModal notice={notice} onClose={() => setNotice(null)} />}
    </SafeAreaView>
  );
}

function LoginScreen({ data, onLogin, notice, dismissNotice }: { data: AppData; onLogin: (email: string, timezone: string) => void; notice: Notice; dismissNotice: () => void }) {
  const [email, setEmail] = useState(data.accounts[0]?.email ?? 'runner@example.com');
  const [timezone, setTimezone] = useState(localTimezone());
  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.loginScreen} keyboardShouldPersistTaps="handled">
        <View style={styles.logoMark}><Text style={styles.logoMarkText}>GG</Text></View>
        <Text style={styles.loginTitle}>Go Go Goal</Text>
        <Text style={styles.loginSubtitle}>不是再寫一張願望清單。是把承諾留下來，然後每天如實面對。</Text>
        <View style={styles.formCard}>
          <Text style={styles.fieldLabel}>電郵地址</Text>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} placeholder="you@example.com" />
          <Text style={styles.fieldLabel}>主時區</Text>
          <TextInput value={timezone} onChangeText={setTimezone} autoCapitalize="none" style={styles.input} placeholder="Asia/Hong_Kong" />
          <PrimaryButton label="登入私人 Workspace" onPress={() => onLogin(email, timezone)} />
          <Text style={styles.helper}>此版本以本機帳戶 adapter 示範完整流程；正式發布前可替換為安全的後端驗證。</Text>
        </View>
      </ScrollView>
      {notice && <NoticeModal notice={notice} onClose={dismissNotice} />}
    </SafeAreaView>
  );
}

function WorkspaceScreen({ account, onHealth, onPersonalGrowth, onOpenGrowth, onOpen }: { account: Account; onHealth: () => void; onPersonalGrowth: () => void; onOpenGrowth: (goal: PersonalGrowthGoal) => void; onOpen: (goal: RunningGoal) => void }) {
  const [growthFilter, setGrowthFilter] = useState<'ongoing' | 'completed' | 'archived'>('ongoing');
  const current = account.goals.find((goal) => goal.status === 'active' || goal.status === 'paused');
  const today = dateKeyInZone(new Date(), account.timezone);
  const todayRecord = current?.records.find((record) => record.date === today);
  const filteredGrowth = (account.personalGrowthGoals ?? [])
    .filter((goal) => growthFilter === 'ongoing' ? goal.status === 'active' || goal.status === 'paused' : growthFilter === 'completed' ? goal.status === 'completed' : goal.status === 'abandoned')
    .sort((left, right) => {
      const nextDate = (goal: PersonalGrowthGoal) => goal.plan.weeks.flatMap((week) => week.tasks).filter((task) => task.status === 'PLANNED' && task.date).map((task) => task.date as string).sort()[0] ?? '9999-12-31';
      return nextDate(left).localeCompare(nextDate(right));
    });
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.headerRow}><View><Text style={styles.kicker}>PRIVATE WORKSPACE</Text><Text style={styles.pageTitle}>今天，照承諾做。</Text></View><View style={styles.avatar}><Text style={styles.avatarText}>{account.email[0].toUpperCase()}</Text></View></View>
      {current ? (
        <Pressable onPress={() => onOpen(current)} style={styles.commitmentHero}>
          <View style={styles.rowBetween}><StatusPill status={current.status} /><Text style={styles.heroArrow}>→</Text></View>
          <Text style={styles.commitmentTitle}>{current.title}</Text>
          <Text style={styles.commitmentMeta}>{currentVersion(current).weekdays.map((day) => weekdayNames[day]).join('、')} · 每次 {currentVersion(current).minutesPerRun} 分鐘</Text>
          <View style={styles.todayBar}><View><Text style={styles.todayLabel}>今天</Text><Text style={styles.todayStatus}>{todayRecord ? runStatusLabel[todayRecord.status] : '休息日'}</Text></View><Text style={styles.todayCount}>{todayRecord?.photos.length ?? 0}<Text style={styles.todayCountSmall}> / 2 相片</Text></Text></View>
        </Pressable>
      ) : (
        <View style={styles.emptyHero}><Text style={styles.emptyEyebrow}>沒有進行中的承諾</Text><Text style={styles.emptyTitle}>先建立一個你願意留下紀錄的目標。</Text><Text style={styles.muted}>一旦承諾，目標不能直接刪除；只能完成、暫停或放棄並說明原因。</Text></View>
      )}
      <View style={styles.growthHeader}><Text style={styles.sectionTitle}>個人成長計畫</Text><Pressable onPress={onPersonalGrowth}><Text style={styles.growthStart}>＋ 新增</Text></Pressable></View>
      <View style={styles.growthFilters}>{([['ongoing', '進行中'], ['completed', '已完成'], ['archived', '已封存']] as const).map(([value, label]) => <Pressable key={value} onPress={() => setGrowthFilter(value)} style={[styles.growthFilter, growthFilter === value && styles.growthFilterOn]}><Text style={[styles.growthFilterText, growthFilter === value && styles.growthFilterTextOn]}>{label}</Text></Pressable>)}</View>
      {filteredGrowth.length ? filteredGrowth.map((goal) => { const tasks = goal.plan.weeks.flatMap((week) => week.tasks); const next = tasks.filter((task) => task.status === 'PLANNED' && task.date).sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0]; const completed = tasks.filter((task) => task.status === 'COMPLETED').length; const focus = personalGrowthFocusOptions.find(([value]) => value === goal.plan.submission.focus.primary)?.[1] ?? '個人成長'; return <Pressable key={goal.id} onPress={() => onOpenGrowth(goal)} style={styles.categoryCard}><View style={styles.categoryIcon}><Text style={styles.categoryIconText}>成</Text></View><View style={styles.flex}><Text style={styles.categoryTitle}>{goal.title}</Text><Text style={styles.categoryText}>{focus} · {next ? `${next.date} ${next.startTime} · ${next.title}` : '沒有待完成任務'}</Text><Text style={styles.helper}>完成率：{tasks.length ? Math.round(completed / tasks.length * 100) : 0}%</Text></View><Text style={styles.cardArrow}>›</Text></Pressable>; }) : <Text style={styles.helper}>這個篩選中暫時沒有計畫。</Text>}
      <Text style={styles.sectionTitle}>生命之輪</Text>
      <Text style={styles.pageIntro}>把生活不同面向放在一起，先從最想改善的一格開始。</Text>
      {lifeWheelCategories.map(([category, title, description], index) => category === 'health' ? (
        <Pressable key={category} onPress={onHealth} style={styles.categoryCard}>
          <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{index + 1}</Text></View>
          <View style={styles.flex}><Text style={styles.categoryTitle}>{title}</Text><Text style={styles.categoryText}>{description}</Text><Text style={styles.helper}>健康 → 運動 → 跑步可用</Text></View>
          <Text style={styles.cardArrow}>›</Text>
        </Pressable>
      ) : category === 'personal_growth' ? (
        <Pressable key={category} onPress={onPersonalGrowth} style={styles.categoryCard}>
          <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{index + 1}</Text></View>
          <View style={styles.flex}><Text style={styles.categoryTitle}>{title}</Text><Text style={styles.categoryText}>{description}</Text><Text style={styles.helper}>個人成長規劃 V1 可用</Text></View>
          <Text style={styles.cardArrow}>›</Text>
        </Pressable>
      ) : (
        <View key={category} style={styles.categoryCard}>
          <View style={styles.categoryIcon}><Text style={styles.categoryIconText}>{index + 1}</Text></View>
          <View style={styles.flex}><Text style={styles.categoryTitle}>{title}</Text><Text style={styles.categoryText}>{description}</Text></View>
          <Text style={styles.comingTag}>即將推出</Text>
        </View>
      ))}
      <View style={styles.principleCard}><Text style={styles.principleTitle}>承諾規則</Text><Text style={styles.principleText}>不能直接刪除目標。每次修改、暫停或放棄都會留下原因，讓你看清真正的節奏。</Text></View>
    </ScrollView>
  );
}

function HealthScreen({ onBack, onExercise }: { onBack: () => void; onExercise: () => void }) {
  return <ScreenShell title="健康（身心）" onBack={onBack}><Text style={styles.kicker}>生命之輪 ／ 健康</Text><Text style={styles.pageTitle}>先照顧身體，才有餘力完成其他目標。</Text><Text style={styles.pageIntro}>健康包含生理作息、運動、皮膚、睡眠與情緒心理。V1 先從運動開始。</Text><Pressable onPress={onExercise} style={styles.categoryCard}><View style={styles.categoryIcon}><Text style={styles.categoryIconText}>運</Text></View><View style={styles.flex}><Text style={styles.categoryTitle}>運動</Text><Text style={styles.categoryText}>用適合你的運動方式建立可持續的節奏。</Text></View><Text style={styles.cardArrow}>›</Text></Pressable><View style={styles.comingRow}><SmallComing title="睡眠" /><SmallComing title="作息" /><SmallComing title="情緒心理" /></View></ScreenShell>;
}

function KeepFitScreen({ onBack, onRunning }: { onBack: () => void; onRunning: () => void }) {
  return <ScreenShell title="運動" onBack={onBack}><Text style={styles.kicker}>生命之輪 ／ 健康 ／ 運動</Text><Text style={styles.pageTitle}>你想用哪種方式保持健康？</Text><Text style={styles.pageIntro}>每種運動需要不同的承諾與驗證方式。V1 先把 Running 做好。</Text><Pressable onPress={onRunning} style={styles.runningCard}><Text style={styles.runningNumber}>01</Text><View style={styles.flex}><Text style={styles.runningTitle}>Running</Text><Text style={styles.runningText}>跑步日內完成兩張相片打卡，至少相隔 15 分鐘。</Text></View><Text style={styles.runningArrow}>→</Text></Pressable><ComingSoonCard title="Strength Training" /><ComingSoonCard title="Swimming" /><ComingSoonCard title="Cycling" /></ScreenShell>;
}

function GoalScreen({ account, goal, onBack, onCheckIn, onDeletePhoto, onCalendar, onRevise, onPause, onResume, onAbandon, onComplete, onRecover }: {
  account: Account; goal: RunningGoal; onBack: () => void; onCheckIn: () => void; onDeletePhoto: (date: string, photoId: string, uri: string) => void; onCalendar: () => void; onRevise: () => void; onPause: (reason: string, resumeDate: string) => void; onResume: () => void; onAbandon: (reason: string) => void; onComplete: () => void; onRecover: (date: string, type: RecoveryType, reason: string, rescheduledDate?: string) => void;
}) {
  const [action, setAction] = useState<'pause' | 'abandon' | 'recover' | null>(null);
  const [reason, setReason] = useState('');
  const [resumeDate, setResumeDate] = useState(addDays(dateKeyInZone(new Date(), account.timezone), 7));
  const [recoveryType, setRecoveryType] = useState<RecoveryType>('skip');
  const [, refreshTimer] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refreshTimer((value) => value + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  const today = dateKeyInZone(new Date(), account.timezone);
  const todayRecord = goal.records.find((record) => record.date === today);
  const unresolved = goal.records.find((record) => record.status === 'absent' && !record.recovery);
  const progress = workflow.progress(goal);
  const firstPhoto = todayRecord?.photos[0];
  const remaining = minutesUntilSecondPhoto(firstPhoto?.uploadedAt, new Date());
  return <><ScreenShell title="Running 承諾" onBack={onBack}><View style={styles.rowBetween}><StatusPill status={goal.status} /><Text style={styles.goalDates}>{goal.startDate} → {goal.endDate}</Text></View><Text style={styles.pageTitle}>{goal.title}</Text><Text style={styles.pageIntro}>{currentVersion(goal).summary}</Text><View style={styles.progressCard}><View style={styles.rowBetween}><Text style={styles.progressTitle}>目前完成率</Text><Text style={styles.progressValue}>{Math.round(progress.rate * 100)}%</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, progress.rate * 100)}%` }]} /></View><Text style={styles.helper}>{progress.completed} / {progress.planned} 次完成 · 達標門檻 {Math.round(goal.targetRate * 100)}%</Text></View>{unresolved && <Pressable style={styles.absenceCard} onPress={() => setAction('recover')}><Text style={styles.absenceTitle}>你在 {formatDate(unresolved.date)} 缺席了</Text><Text style={styles.absenceText}>請現在補登說明、標記跳過，或重新安排。不要讓一次缺席變成放棄。</Text><Text style={styles.absenceLink}>立即處理 →</Text></Pressable>}{todayRecord && goal.status === 'active' ? <View style={styles.checkInCard}><Text style={styles.kicker}>TODAY · {formatDate(today)}</Text><Text style={styles.checkInTitle}>{todayRecord.status === 'completed' ? '今天的承諾已完成。' : todayRecord.photos.length ? `第一張已記錄，再等 ${remaining} 分鐘。` : '今天需要兩次相片打卡。'}</Text><Text style={styles.checkInText}>兩張相片須在今天內上傳，至少相隔 15 分鐘。相片只作自我紀錄，不驗證你是否跑步。</Text><View style={styles.photoRow}>{[0, 1].map((index) => { const photo = todayRecord.photos[index]; return <View key={index} style={styles.photoSlot}>{photo ? <Pressable onLongPress={() => onDeletePhoto(today, photo.id, photo.uri)} style={styles.photoPressable}><Image source={{ uri: photo.uri }} style={styles.photo as ImageStyle} /><Text style={styles.deletePhotoHint}>長按刪除</Text></Pressable> : <Text style={styles.photoPlaceholder}>{index + 1}</Text>}<Text style={styles.photoCaption}>{photo ? new Date(photo.uploadedAt).toLocaleTimeString('zh-Hant', { hour: '2-digit', minute: '2-digit' }) : index ? '15 分鐘後' : '開始'}</Text></View>; })}</View>{todayRecord.photos.at(-1)?.encouragement && <Text style={styles.encouragement}>「{todayRecord.photos.at(-1)?.encouragement}」</Text>}<PrimaryButton label={todayRecord.status === 'completed' ? '今天已完成 ✓' : todayRecord.photos.length ? `上傳第二張${remaining ? `（尚需 ${remaining} 分鐘）` : ''}` : '上傳第一張相片'} onPress={onCheckIn} disabled={todayRecord.status === 'completed' || remaining > 0} /></View> : <View style={styles.restCard}><Text style={styles.restTitle}>{goal.status === 'paused' ? `目標暫停至 ${goal.pause?.resumeDate}` : '今天不是計畫跑步日'}</Text><Text style={styles.muted}>回顧你的進度，為下一個跑步日保留空間。</Text></View>}<View style={styles.actionGrid}><ActionButton label="日曆紀錄" onPress={onCalendar} /><ActionButton label="下週調整" onPress={onRevise} disabled={goal.status !== 'active'} />{goal.status === 'paused' ? <ActionButton label="恢復目標" onPress={onResume} /> : <ActionButton label="暫停目標" onPress={() => setAction('pause')} disabled={goal.status !== 'active'} />}<ActionButton label="完成目標" onPress={onComplete} disabled={goal.status === 'completed' || goal.status === 'abandoned'} /></View>{goal.status === 'active' || goal.status === 'paused' ? <SecondaryButton label="放棄並歸檔" onPress={() => setAction('abandon')} danger /> : null}<Text style={styles.sectionTitle}>最近紀錄</Text>{goal.events.slice(-6).reverse().map((entry) => <View key={entry.id} style={styles.timelineItem}><View style={styles.timelineDot} /><View style={styles.flex}><Text style={styles.timelineText}>{entry.message}</Text><Text style={styles.timelineDate}>{new Date(entry.at).toLocaleString('zh-Hant-HK')}</Text></View></View>)}</ScreenShell>{action && <ActionModal title={action === 'pause' ? '暫停目標' : action === 'abandon' ? '放棄並歸檔' : `處理 ${unresolved?.date ?? ''} 的缺席`} onClose={() => { setAction(null); setReason(''); }}><Text style={styles.modalIntro}>{action === 'pause' ? '暫停最長 30 天，到期後必須恢復、延長或放棄。' : action === 'abandon' ? '這個目標會保留在歸檔中，不能當作從未發生。' : '原始缺席會保留，以下選擇只會新增處理紀錄。'}</Text>{action === 'recover' && <View style={styles.segment}>{(['backfill', 'skip', 'reschedule'] as RecoveryType[]).map((type) => <Pressable key={type} onPress={() => setRecoveryType(type)} style={[styles.segmentButton, recoveryType === type && styles.segmentButtonOn]}><Text style={[styles.segmentText, recoveryType === type && styles.segmentTextOn]}>{type === 'backfill' ? '補登' : type === 'skip' ? '跳過' : '重排'}</Text></Pressable>)}</View>}<Field label="原因" value={reason} onChangeText={setReason} multiline placeholder="請誠實留下原因" />{action === 'pause' && <Field label="恢復日期（YYYY-MM-DD）" value={resumeDate} onChangeText={setResumeDate} />}{action === 'recover' && recoveryType === 'reschedule' && <Field label="重新安排日期（YYYY-MM-DD）" value={resumeDate} onChangeText={setResumeDate} />}<PrimaryButton label="確認並留下紀錄" onPress={() => { if (action === 'pause') onPause(reason, resumeDate); else if (action === 'abandon') onAbandon(reason); else if (unresolved) onRecover(unresolved.date, recoveryType, reason, recoveryType === 'reschedule' ? resumeDate : undefined); setAction(null); setReason(''); }} /></ActionModal>}</>;
}

function ReviseScreen({ goal, onBack, onSave }: { goal: RunningGoal; onBack: () => void; onSave: (days: Weekday[], minutes: number, summary: string, reason: string) => void }) {
  const version = currentVersion(goal);
  const [days, setDays] = useState(version.weekdays);
  const [minutes, setMinutes] = useState(version.minutesPerRun);
  const [summary, setSummary] = useState(version.summary);
  const [reason, setReason] = useState('');
  return <ScreenShell title="調整下週計畫" onBack={onBack}><Text style={styles.pageTitle}>可以調整，但不能改寫今天。</Text><Text style={styles.pageIntro}>修改會從下週一生效，原本版本與原因會永久留在時間軸。</Text><Text style={styles.fieldLabel}>新的跑步日</Text><DayPicker days={days} onToggle={(day) => setDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day])} /><Field label="每次分鐘" value={String(minutes)} keyboardType="number-pad" onChangeText={(text) => setMinutes(Math.max(15, Number(text) || 15))} /><Field label="計畫說明" value={summary} onChangeText={setSummary} multiline /><Field label="為甚麼要修改？" value={reason} onChangeText={setReason} multiline placeholder="例如：新的工作時間令週三不可行" /><PrimaryButton label="保存為下週的新版本" onPress={() => onSave(days, minutes, summary, reason)} /></ScreenShell>;
}

function CalendarScreen({ account, goal, onBack, onOpen }: { account: Account; goal: RunningGoal | null; onBack: () => void; onOpen: (goal: RunningGoal) => void }) {
  const target = goal ?? account.goals.find((item) => item.status === 'active' || item.status === 'paused') ?? account.goals[0];
  return <ScrollView contentContainerStyle={styles.screen}><View style={styles.headerRow}><View><Text style={styles.kicker}>CALENDAR</Text><Text style={styles.pageTitle}>承諾紀錄</Text></View>{target && <SecondaryButton label="查看目標" onPress={() => onOpen(target)} />}</View>{target ? <><View style={styles.legend}><Legend color="#F26B38" label="完成" /><Legend color="#B83C31" label="缺席" /><Legend color="#E9E6DE" label="待完成" /></View>{target.records.map((record) => <View key={record.id} style={styles.recordRow}><View style={[styles.recordDate, record.status === 'completed' && styles.recordDateDone, record.status === 'absent' && styles.recordDateAbsent]}><Text style={[styles.recordDay, (record.status === 'completed' || record.status === 'absent') && styles.recordDayOn]}>{record.date.slice(8)}</Text><Text style={[styles.recordMonth, (record.status === 'completed' || record.status === 'absent') && styles.recordDayOn]}>{record.date.slice(5, 7)}月</Text></View><View style={styles.flex}><Text style={styles.recordTitle}>{formatDate(record.date)} · {runStatusLabel[record.status]}</Text><Text style={styles.recordMeta}>{record.photos.length} / 2 相片{record.recovery ? ` · 已處理：${record.recovery.reason}` : ''}</Text></View></View>)}</> : <View style={styles.emptyHero}><Text style={styles.emptyTitle}>尚未有跑步紀錄</Text><Text style={styles.muted}>承諾 Running 計畫後，預定日期會出現在這裡。</Text></View>}</ScrollView>;
}

function ArchiveScreen({ account, onOpen }: { account: Account; onOpen: (goal: RunningGoal) => void }) {
  const archived = account.goals.filter((goal) => goal.status === 'completed' || goal.status === 'abandoned');
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.kicker}>ARCHIVE</Text><Text style={styles.pageTitle}>完成與放棄，都值得被看見。</Text><Text style={styles.pageIntro}>歸檔不是懲罰；它讓下一次承諾建立在真實紀錄上。</Text>{archived.length ? archived.map((goal) => <Pressable key={goal.id} onPress={() => onOpen(goal)} style={styles.archiveCard}><View style={styles.rowBetween}><StatusPill status={goal.status} /><Text style={styles.cardArrow}>›</Text></View><Text style={styles.archiveTitle}>{goal.title}</Text><Text style={styles.muted}>{goal.archivedReason ?? `${Math.round(workflow.progress(goal).rate * 100)}% 完成率`}</Text></Pressable>) : <View style={styles.emptyHero}><Text style={styles.emptyTitle}>歸檔仍是空的</Text><Text style={styles.muted}>目標完成或放棄後會保留在這裡，不會直接消失。</Text></View>}</ScrollView>;
}

function SettingsScreen({ account, onUpdate, onLogout, showMessage }: { account: Account; onUpdate: (account: Account) => void; onLogout: () => void; showMessage: (message: string, title?: string) => void }) {
  const [timezone, setTimezone] = useState(account.timezone);
  const requestNotifications = async () => {
    const permission = await requestNotificationPermission();
    const next = { ...account, notificationPermission: permission };
    onUpdate(next);
    const active = next.goals.find((goal) => goal.status === 'active');
    if (active && permission === 'granted') await scheduleRunningReminders(active, next).catch(() => undefined);
    showMessage(permission === 'granted' ? '跑步日提醒已啟用。' : '通知未啟用；Workspace 仍會照常結算缺席。');
  };
  const requestDeletion = () => Alert.alert('要求刪除帳戶？', '帳戶會進入 30 天可撤銷期。正式後端版本會在期限後刪除個人資料、相片及目標紀錄。', [{ text: '取消', style: 'cancel' }, { text: '開始 30 天撤銷期', style: 'destructive', onPress: () => onUpdate({ ...account, deletionRequestedAt: new Date().toISOString() }) }]);
  return <ScrollView contentContainerStyle={styles.screen}><Text style={styles.kicker}>SETTINGS</Text><Text style={styles.pageTitle}>你的資料，由你決定。</Text><View style={styles.settingsCard}><Text style={styles.settingsTitle}>帳戶</Text><Text style={styles.muted}>{account.email}</Text><SecondaryButton label="登出" onPress={onLogout} /></View><View style={styles.settingsCard}><Text style={styles.settingsTitle}>主時區</Text><Text style={styles.muted}>跑步日、提醒與午夜截止都依這個時區計算。</Text><TextInput value={timezone} onChangeText={setTimezone} autoCapitalize="none" style={styles.input} /><SecondaryButton label="保存時區" onPress={() => isValidTimezone(timezone) ? onUpdate({ ...account, timezone }) : showMessage('請輸入有效的 IANA 時區，例如 Asia/Hong_Kong。', '時區無效')} /></View><View style={styles.settingsCard}><Text style={styles.settingsTitle}>承諾通知</Text><Text style={styles.muted}>目前狀態：{account.notificationPermission}</Text><SecondaryButton label="要求／重新檢查通知權限" onPress={requestNotifications} />{account.notificationPermission === 'denied' && <SecondaryButton label="開啟系統設定" onPress={() => Linking.openSettings()} />}</View><View style={styles.settingsCard}><View style={styles.rowBetween}><View style={styles.flex}><Text style={styles.settingsTitle}>Gemini 相片鼓勵</Text><Text style={styles.muted}>關閉後仍可正常完成雙相片打卡。</Text></View><Switch value={account.photoAnalysisConsent} onValueChange={(value) => onUpdate({ ...account, photoAnalysisConsent: value })} trackColor={{ true: '#F7A37F' }} thumbColor={account.photoAnalysisConsent ? '#F26B38' : '#F3F1EA'} /></View></View><View style={styles.settingsCard}><Text style={styles.settingsTitle}>資料保存</Text><Text style={styles.muted}>原始相片保存 90 天；文字完成／缺席紀錄會保留。你可在相片仍存在時個別移除。</Text></View>{account.deletionRequestedAt ? <View style={styles.deletionCard}><Text style={styles.settingsTitle}>帳戶正在刪除撤銷期</Text><Text style={styles.muted}>提出時間：{new Date(account.deletionRequestedAt).toLocaleString('zh-Hant-HK')}</Text><SecondaryButton label="取消刪除帳戶" onPress={() => onUpdate({ ...account, deletionRequestedAt: undefined })} /></View> : <SecondaryButton label="刪除帳戶" onPress={requestDeletion} danger />}</ScrollView>;
}

function BottomTabs({ active, onSelect }: { active: Screen; onSelect: (screen: Screen) => void }) {
  const tabs: Array<[Screen, string, string]> = [['workspace', '⌂', 'Workspace'], ['calendar', '▦', '日曆'], ['archive', '◇', '歸檔'], ['settings', '⚙', '設定']];
  return <View style={styles.tabBar}>{tabs.map(([screen, icon, label]) => <Pressable key={screen} onPress={() => onSelect(screen)} style={styles.tab}><Text style={[styles.tabIcon, active === screen && styles.tabOn]}>{icon}</Text><Text style={[styles.tabLabel, active === screen && styles.tabOn]}>{label}</Text></Pressable>)}</View>;
}

function ScreenShell({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return <><View style={styles.topBar}><Pressable onPress={onBack} style={styles.backButton}><Text style={styles.backText}>‹ 返回</Text></Pressable><Text style={styles.topTitle}>{title}</Text><View style={styles.backButton} /></View><ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">{children}</ScrollView></>;
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.primaryButton, pressed && !disabled && styles.pressed, disabled && styles.disabled]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}><Text style={[styles.secondaryButtonText, danger && styles.dangerText]}>{label}</Text></Pressable>;
}

function ActionButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.actionButton, disabled && styles.disabled]}><Text style={styles.actionButtonText}>{label}</Text><Text style={styles.actionArrow}>→</Text></Pressable>;
}

function Field({ label, value, onChangeText, placeholder, multiline, keyboardType }: { label: string; value: string; onChangeText: (text: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'number-pad' }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9A978E" multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.textarea]} /></View>;
}

function DayPicker({ days, onToggle }: { days: Weekday[]; onToggle: (day: Weekday) => void }) {
  return <View style={styles.dayPicker}>{allDays.map((day) => <Pressable key={day} onPress={() => onToggle(day)} style={[styles.dayChip, days.includes(day) && styles.dayChipOn]}><Text style={[styles.dayChipText, days.includes(day) && styles.dayChipTextOn]}>{weekdayNames[day].replace('週', '')}</Text></Pressable>)}</View>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <Pressable onPress={() => onChange(!value)} style={styles.toggleRow}><Text style={styles.toggleLabel}>{label}</Text><View style={[styles.yesNo, value && styles.yesNoOn]}><Text style={[styles.yesNoText, value && styles.yesNoTextOn]}>{value ? '有' : '沒有'}</Text></View></Pressable>;
}

function StatusPill({ status }: { status: RunningGoal['status'] }) {
  return <View style={[styles.statusPill, status === 'completed' && styles.statusDone, status === 'abandoned' && styles.statusAbandoned, status === 'paused' && styles.statusPaused]}><Text style={styles.statusText}>{statusLabel[status]}</Text></View>;
}

function Metric({ value, label }: { value: string; label: string }) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function SmallComing({ title }: { title: string }) { return <View style={styles.smallComing}><Text style={styles.smallComingTitle}>{title}</Text><Text style={styles.smallComingText}>即將推出</Text></View>; }
function ComingSoonCard({ title }: { title: string }) { return <View style={styles.comingCard}><Text style={styles.comingTitle}>{title}</Text><Text style={styles.comingTag}>COMING SOON</Text></View>; }
function Legend({ color, label }: { color: string; label: string }) { return <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: color }]} /><Text style={styles.legendText}>{label}</Text></View>; }

function ActionModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <Modal transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.actionModal}><View style={styles.rowBetween}><Text style={styles.modalTitle}>{title}</Text><Pressable onPress={onClose}><Text style={styles.modalClose}>✕</Text></Pressable></View>{children}</View></View></Modal>;
}

function NoticeModal({ notice, onClose }: { notice: NonNullable<Notice>; onClose: () => void }) {
  return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={styles.noticeCard}><View style={styles.noticeMark}><Text style={styles.noticeMarkText}>✓</Text></View><Text style={styles.modalTitle}>{notice.title}</Text><Text style={styles.modalText}>{notice.message}</Text><PrimaryButton label="知道了" onPress={onClose} /></View></View></Modal>;
}

function BusyOverlay({ message }: { message: string }) { return <View style={styles.busy}><View style={styles.busyCard}><ActivityIndicator color="#F26B38" /><Text style={styles.busyText}>{message}</Text></View></View>; }

const colors = { ink: '#20211E', muted: '#6F706A', paper: '#F7F5EF', white: '#FFFDF9', orange: '#F26B38', orangePale: '#FBE7DC', green: '#2F6D58', red: '#B83C31', line: '#E4E0D6' };

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.paper }, main: { flex: 1 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: colors.paper },
  loginScreen: { flexGrow: 1, padding: 28, justifyContent: 'center', alignItems: 'center', gap: 14 }, logoMark: { width: 66, height: 66, borderRadius: 22, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] }, logoMarkText: { color: '#fff', fontSize: 24, fontWeight: '900' }, loginTitle: { color: colors.ink, fontWeight: '900', fontSize: 36, letterSpacing: -1.4 }, loginSubtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 360, marginBottom: 12 }, formCard: { width: '100%', maxWidth: 440, backgroundColor: colors.white, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: colors.line },
  topBar: { height: 58, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, backgroundColor: colors.paper }, backButton: { width: 78 }, backText: { color: colors.orange, fontWeight: '800', fontSize: 15 }, topTitle: { color: colors.ink, fontWeight: '800', fontSize: 16 },
  screen: { padding: 20, paddingBottom: 44, gap: 15 }, headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, flex: { flex: 1 },
  kicker: { color: colors.orange, fontWeight: '900', fontSize: 11, letterSpacing: 1.4 }, pageTitle: { color: colors.ink, fontSize: 29, lineHeight: 36, fontWeight: '900', letterSpacing: -0.9 }, pageIntro: { color: colors.muted, fontSize: 15, lineHeight: 23 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '900', marginTop: 8 }, muted: { color: colors.muted, lineHeight: 21 }, helper: { color: '#85857F', fontSize: 12.5, lineHeight: 18 },
  avatar: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: '#fff', fontWeight: '900' },
  commitmentHero: { backgroundColor: colors.ink, borderRadius: 26, padding: 20, gap: 10 }, heroArrow: { color: colors.orange, fontSize: 24, fontWeight: '800' }, commitmentTitle: { color: '#fff', fontSize: 25, lineHeight: 31, fontWeight: '900' }, commitmentMeta: { color: '#C8C7C1', lineHeight: 20 }, todayBar: { backgroundColor: '#30312D', borderRadius: 17, marginTop: 4, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, todayLabel: { color: '#A8A8A2', fontSize: 11, fontWeight: '800' }, todayStatus: { color: '#fff', fontWeight: '800', fontSize: 16 }, todayCount: { color: colors.orange, fontWeight: '900', fontSize: 24 }, todayCountSmall: { color: '#B8B8B1', fontWeight: '600', fontSize: 12 },
  emptyHero: { backgroundColor: colors.white, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 20, gap: 9 }, emptyEyebrow: { color: colors.orange, fontSize: 12, fontWeight: '900' }, emptyTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', lineHeight: 28 },
  growthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, growthStart: { color: colors.orange, fontWeight: '900', fontSize: 13 }, growthFilters: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, growthFilter: { backgroundColor: '#EDEAE3', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8 }, growthFilterOn: { backgroundColor: colors.ink }, growthFilterText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, growthFilterTextOn: { color: '#fff' },
  categoryCard: { backgroundColor: colors.white, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 }, categoryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.orangePale, alignItems: 'center', justifyContent: 'center' }, categoryIconText: { color: colors.orange, fontSize: 24, fontWeight: '900' }, categoryTitle: { color: colors.ink, fontSize: 18, fontWeight: '900' }, categoryText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 3 }, cardArrow: { color: colors.orange, fontWeight: '900', fontSize: 27 }, comingRow: { flexDirection: 'row', gap: 9 }, smallComing: { flex: 1, backgroundColor: '#EFECE5', borderRadius: 14, padding: 12 },
  smallComingTitle: { color: '#77776F', fontWeight: '800', fontSize: 13 }, smallComingText: { color: '#A09F98', fontSize: 10, marginTop: 4 }, principleCard: { borderLeftWidth: 3, borderLeftColor: colors.orange, paddingLeft: 15, paddingVertical: 5, marginTop: 4 }, principleTitle: { color: colors.ink, fontWeight: '900' }, principleText: { color: colors.muted, lineHeight: 21, marginTop: 5 },
  runningCard: { backgroundColor: colors.orange, borderRadius: 24, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 15 }, runningNumber: { color: '#FFD8C6', fontSize: 13, fontWeight: '900' }, runningTitle: { color: '#fff', fontSize: 24, fontWeight: '900' }, runningText: { color: '#FFF0E8', lineHeight: 20, marginTop: 4 }, runningArrow: { color: '#fff', fontSize: 26, fontWeight: '900' }, comingCard: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F0EEE8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, comingTitle: { color: '#77776F', fontWeight: '800', fontSize: 16 }, comingTag: { color: '#A3A198', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  field: { gap: 7 }, fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' }, input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, color: colors.ink, fontSize: 16 }, textarea: { minHeight: 86, textAlignVertical: 'top' }, dayPicker: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' }, dayChip: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#EDEAE3', alignItems: 'center', justifyContent: 'center' }, dayChipOn: { backgroundColor: colors.ink }, dayChipText: { color: colors.muted, fontWeight: '800' }, dayChipTextOn: { color: '#fff' },
  toggleRow: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, toggleLabel: { color: colors.ink, flex: 1, lineHeight: 20 }, yesNo: { backgroundColor: '#E9E6DE', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }, yesNoOn: { backgroundColor: '#F5D8D2' }, yesNoText: { color: colors.muted, fontWeight: '800', fontSize: 12 }, yesNoTextOn: { color: colors.red },
  planCard: { backgroundColor: colors.ink, borderRadius: 24, padding: 21, gap: 8 }, riskCard: { backgroundColor: '#6B2D28' }, planCardLabel: { color: '#F7A37F', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, planCardTitle: { color: '#fff', fontSize: 22, fontWeight: '900' }, planCardText: { color: '#D7D5CF', lineHeight: 22 }, metricRow: { flexDirection: 'row', gap: 8 }, metric: { flex: 1, backgroundColor: colors.white, borderRadius: 16, padding: 13, borderWidth: 1, borderColor: colors.line }, metricValue: { color: colors.ink, fontSize: 18, fontWeight: '900' }, metricLabel: { color: colors.muted, fontSize: 10, marginTop: 3 }, commitWarning: { backgroundColor: colors.orangePale, padding: 15, borderRadius: 16, gap: 5 }, commitWarningTitle: { color: '#80391E', fontWeight: '900' }, commitWarningText: { color: '#8B523A', lineHeight: 20, fontSize: 13 },
  progressCard: { backgroundColor: colors.white, borderRadius: 20, padding: 17, borderWidth: 1, borderColor: colors.line, gap: 9 }, progressTitle: { color: colors.ink, fontWeight: '800' }, progressValue: { color: colors.orange, fontSize: 25, fontWeight: '900' }, progressTrack: { height: 8, borderRadius: 5, backgroundColor: '#E8E4DA', overflow: 'hidden' }, progressFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 5 }, goalDates: { color: colors.muted, fontSize: 11 },
  absenceCard: { backgroundColor: '#F5DCD7', borderRadius: 20, padding: 17, gap: 6, borderWidth: 1, borderColor: '#EABEB6' }, absenceTitle: { color: '#762C25', fontSize: 17, fontWeight: '900' }, absenceText: { color: '#81443E', lineHeight: 20 }, absenceLink: { color: colors.red, fontWeight: '900', marginTop: 3 },
  checkInCard: { backgroundColor: colors.white, borderRadius: 24, padding: 19, borderWidth: 1, borderColor: colors.line, gap: 11 }, checkInTitle: { color: colors.ink, fontSize: 21, lineHeight: 27, fontWeight: '900' }, checkInText: { color: colors.muted, lineHeight: 21 }, photoRow: { flexDirection: 'row', gap: 10 }, photoSlot: { flex: 1, aspectRatio: 1.1, borderRadius: 16, backgroundColor: '#ECE9E1', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, photo: { width: '100%', height: '100%' }, photoPressable: { width: '100%', height: '100%' }, deletePhotoHint: { position: 'absolute', top: 7, right: 7, backgroundColor: 'rgba(32,33,30,.75)', color: 'white', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, fontSize: 9, fontWeight: '800' }, photoPlaceholder: { color: '#B2AFA6', fontSize: 28, fontWeight: '900' }, photoCaption: { position: 'absolute', bottom: 7, left: 7, backgroundColor: 'rgba(32,33,30,.75)', color: '#fff', borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10, fontWeight: '800' }, encouragement: { color: colors.green, fontWeight: '700', lineHeight: 21, fontStyle: 'italic' }, restCard: { backgroundColor: '#ECEAE4', borderRadius: 20, padding: 18, gap: 6 }, restTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, actionButton: { width: '48.5%', minHeight: 60, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, actionButtonText: { color: colors.ink, fontWeight: '800', fontSize: 13 }, actionArrow: { color: colors.orange, fontWeight: '900' },
  timelineItem: { flexDirection: 'row', gap: 12, paddingVertical: 5 }, timelineDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.orange, marginTop: 6 }, timelineText: { color: colors.ink, lineHeight: 20, fontSize: 13 }, timelineDate: { color: '#99978F', fontSize: 10, marginTop: 3 },
  recordRow: { backgroundColor: colors.white, borderRadius: 18, padding: 13, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 13 }, recordDate: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#E9E6DE', alignItems: 'center', justifyContent: 'center' }, recordDateDone: { backgroundColor: colors.orange }, recordDateAbsent: { backgroundColor: colors.red }, recordDay: { color: colors.ink, fontSize: 17, fontWeight: '900' }, recordMonth: { color: colors.muted, fontSize: 9 }, recordDayOn: { color: '#fff' }, recordTitle: { color: colors.ink, fontWeight: '800' }, recordMeta: { color: colors.muted, fontSize: 11, marginTop: 3 }, legend: { flexDirection: 'row', gap: 14 }, legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 }, legendDot: { width: 8, height: 8, borderRadius: 4 }, legendText: { color: colors.muted, fontSize: 11 },
  archiveCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 17, gap: 7 }, archiveTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  settingsCard: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 17, gap: 10 }, settingsTitle: { color: colors.ink, fontWeight: '900', fontSize: 16 }, deletionCard: { backgroundColor: colors.orangePale, borderRadius: 20, padding: 17, gap: 8 },
  statusPill: { alignSelf: 'flex-start', borderRadius: 99, backgroundColor: colors.orange, paddingHorizontal: 10, paddingVertical: 5 }, statusDone: { backgroundColor: colors.green }, statusAbandoned: { backgroundColor: colors.red }, statusPaused: { backgroundColor: '#8B7049' }, statusText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  primaryButton: { minHeight: 52, borderRadius: 16, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 17, marginTop: 3 }, primaryButtonText: { color: '#fff', fontWeight: '900', fontSize: 15 }, secondaryButton: { alignSelf: 'flex-start', minHeight: 38, borderRadius: 12, backgroundColor: '#EAE7DF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 8 }, secondaryButtonText: { color: colors.ink, fontWeight: '800', fontSize: 12 }, dangerText: { color: colors.red }, pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] }, disabled: { opacity: 0.42 },
  tabBar: { minHeight: 66, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 7 : 8, flexDirection: 'row', backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, tab: { flex: 1, alignItems: 'center', gap: 3 }, tabIcon: { color: '#9B9991', fontSize: 19, fontWeight: '900' }, tabLabel: { color: '#9B9991', fontSize: 9, fontWeight: '700' }, tabOn: { color: colors.orange },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(24,24,21,.52)', justifyContent: 'flex-end', padding: 14 }, actionModal: { backgroundColor: colors.paper, padding: 20, borderRadius: 25, gap: 13, maxHeight: '86%' }, noticeCard: { backgroundColor: colors.paper, padding: 23, borderRadius: 25, gap: 13, marginBottom: '45%', alignItems: 'stretch' }, noticeMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.orangePale, alignItems: 'center', justifyContent: 'center' }, noticeMarkText: { color: colors.orange, fontWeight: '900', fontSize: 19 }, modalTitle: { color: colors.ink, fontWeight: '900', fontSize: 21 }, modalText: { color: colors.muted, lineHeight: 22 }, modalIntro: { color: colors.muted, lineHeight: 21 }, modalClose: { color: colors.muted, fontSize: 18 }, segment: { flexDirection: 'row', padding: 4, borderRadius: 13, backgroundColor: '#E7E4DC' }, segmentButton: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 }, segmentButtonOn: { backgroundColor: colors.white }, segmentText: { color: colors.muted, fontSize: 12, fontWeight: '800' }, segmentTextOn: { color: colors.orange },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(247,245,239,.88)', alignItems: 'center', justifyContent: 'center', zIndex: 20 }, busyCard: { backgroundColor: colors.white, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 22, gap: 12, alignItems: 'center', maxWidth: 290 }, busyText: { color: colors.ink, fontWeight: '800', textAlign: 'center' },
});
