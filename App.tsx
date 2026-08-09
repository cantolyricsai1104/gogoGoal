import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { exportTasksToCalendar, getCalendarPermissionStatus, PermissionStatus } from './src/calendar';
import { AvailabilityWindow, defaultAvailability, Goal, Task, weekdayNames, Weekday } from './src/domain';
import { buildMockPlan } from './src/mock-planning';
import { loadAppData, saveAppData } from './src/storage';

type Screen = 'home' | 'goal' | 'availability' | 'plan' | 'plan-details' | 'selection' | 'settings' | 'task';

const DAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
const todayString = () => new Date().toISOString().slice(0, 10);
const twoWeeksLater = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString().slice(0, 10);
};

function formatTaskTime(task: Task): string {
  const start = new Date(task.startAt);
  const end = new Date(task.endAt);
  const date = new Intl.DateTimeFormat('zh-Hant-TW', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(start);
  const time = new Intl.DateTimeFormat('zh-Hant-TW', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} · ${time.format(start)}–${time.format(end)}`;
}

function durationMinutes(task: Task): number {
  return Math.max(0, Math.round((new Date(task.endAt).getTime() - new Date(task.startAt).getTime()) / 60_000));
}

function atDateAndTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

function isWithinAvailability(task: Task, availability: AvailabilityWindow[]): boolean {
  const start = new Date(task.startAt);
  const end = new Date(task.endAt);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  return availability.some((window) => {
    const [startHour, startMinute] = window.start.split(':').map(Number);
    const [endHour, endMinute] = window.end.split(':').map(Number);
    return window.weekday === start.getDay()
      && startMinutes >= startHour * 60 + startMinute
      && endMinutes <= endHour * 60 + endMinute;
  });
}

function suggestedAlternatives(task: Task, availability: AvailabilityWindow[]): Task[] {
  const duration = durationMinutes(task);
  const candidates: Task[] = [];
  const from = new Date(task.startAt);
  for (let offset = 0; offset < 14 && candidates.length < 3; offset += 1) {
    const day = new Date(from);
    day.setDate(day.getDate() + offset);
    for (const window of availability.filter((item) => item.weekday === day.getDay())) {
      const start = atDateAndTime(day.toISOString().slice(0, 10), window.start);
      const end = new Date(start.getTime() + duration * 60_000);
      const windowEnd = atDateAndTime(day.toISOString().slice(0, 10), window.end);
      if (end <= windowEnd) candidates.push({ ...task, startAt: start.toISOString(), endAt: end.toISOString() });
      if (candidates.length === 3) break;
    }
  }
  return candidates;
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.primaryButton, disabled && styles.disabled]}><Text style={styles.primaryButtonText}>{label}</Text></Pressable>;
}

function SecondaryButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.secondaryButton}><Text style={[styles.secondaryButtonText, danger && styles.dangerText]}>{label}</Text></Pressable>;
}

function Field({ label, value, onChangeText, placeholder, multiline = false }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean;
}) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8A9690" multiline={multiline} style={[styles.input, multiline && styles.textarea]} /></View>;
}

function TopBar({ title, onBack, onSettings }: { title: string; onBack?: () => void; onSettings?: () => void }) {
  return <View style={styles.topBar}><Pressable onPress={onBack} style={styles.topAction}>{onBack ? <Text style={styles.topActionText}>‹ 返回</Text> : <Text style={styles.brand}>Focus Goal</Text>}</Pressable><Text style={styles.topTitle} numberOfLines={1}>{title}</Text><Pressable onPress={onSettings} style={styles.topAction}>{onSettings ? <Text style={styles.topActionText}>設定</Text> : <View />}</Pressable></View>;
}

export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [screen, setScreen] = useState<Screen>('home');
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionStatus>('undetermined');
  const [conflict, setConflict] = useState<{ task: Task; alternatives: Task[] } | null>(null);

  useEffect(() => {
    loadAppData().then((data) => setGoals(data.goals)).catch(() => setNotice('無法讀取本機資料。你仍可建立新的目標。')).finally(() => setReady(true));
    getCalendarPermissionStatus().then(setPermission).catch(() => setPermission('unavailable'));
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveAppData({ goals }).catch(() => setNotice('暫時無法儲存變更，請稍後再試。'));
  }, [goals, ready]);

  const activeGoal = useMemo(() => goals.find((goal) => goal.id === activeGoalId) ?? null, [activeGoalId, goals]);
  const updateGoal = useCallback((goal: Goal) => setGoals((items) => items.map((item) => item.id === goal.id ? goal : item)), []);
  const backHome = () => { setTaskId(null); setActiveGoalId(null); setScreen('home'); };
  const openGoal = (goal: Goal) => { setActiveGoalId(goal.id); setScreen(goal.plan ? 'plan' : 'goal'); };

  const createGoal = (draft: Omit<Goal, 'id' | 'createdAt' | 'availability'>) => {
    const goal: Goal = { ...draft, id: `goal-${Date.now()}`, createdAt: new Date().toISOString(), availability: defaultAvailability };
    setGoals((items) => [goal, ...items]);
    setActiveGoalId(goal.id);
    setScreen('availability');
  };

  const generatePlan = async (goal: Goal) => {
    setBusy('正在把目標轉成可開始的行動…');
    await new Promise((resolve) => setTimeout(resolve, 700));
    const plan = buildMockPlan(goal);
    updateGoal({ ...goal, plan });
    setBusy(null);
    setScreen('plan');
  };

  const saveTask = (task: Task) => {
    if (!activeGoal?.plan) return;
    const goal = { ...activeGoal, plan: { ...activeGoal.plan, tasks: activeGoal.plan.tasks.map((item) => item.id === task.id ? task : item) } };
    updateGoal(goal);
    setScreen('plan');
    if (!isWithinAvailability(task, activeGoal.availability)) setConflict({ task, alternatives: suggestedAlternatives(task, activeGoal.availability) });
  };

  const replaceTask = (task: Task) => {
    if (!activeGoal?.plan) return;
    updateGoal({ ...activeGoal, plan: { ...activeGoal.plan, tasks: activeGoal.plan.tasks.map((item) => item.id === task.id ? task : item) } });
  };

  const exportSelected = async () => {
    if (!activeGoal?.plan) return;
    const selected = activeGoal.plan.tasks.filter((task) => task.selected);
    if (!selected.length) { setNotice('請先勾選至少一項任務，再加入日曆。'); return; }
    setBusy('正在加入系統日曆…');
    try {
      const result = await exportTasksToCalendar(selected);
      setPermission(result.status);
      if (result.status !== 'granted') {
        setNotice(result.status === 'unavailable' ? '目前平台無法使用系統日曆。請在 iOS 或 Android 裝置上開啟此功能。' : '日曆權限尚未允許。請在系統設定中允許日曆權限後再試。');
      } else if (result.failed.length) {
        setNotice(`已加入 ${result.created} 項任務；${result.failed.length} 項未能建立，可再試一次。`);
      } else {
        setNotice(`已將 ${result.created} 項任務加入系統日曆。`);
      }
    } catch {
      setNotice('加入日曆時發生問題。請確認權限後再試一次。');
    } finally { setBusy(null); }
  };

  if (!ready) return <SafeAreaView style={styles.loadingScreen}><ActivityIndicator color="#306A59" /><Text style={styles.muted}>正在準備你的計畫空間…</Text></SafeAreaView>;

  let content: React.ReactNode;
  if (screen === 'home') content = <HomeScreen goals={goals} onCreate={() => { setActiveGoalId(null); setScreen('goal'); }} onOpen={openGoal} onUseExample={() => createGoal({ title: '兩週學完 Python 基礎', deadline: twoWeeksLater(), level: '剛開始，想每天有一小段練習。', preferences: '平日晚上較適合，週日休息。' })} onSettings={() => setScreen('settings')} />;
  else if (screen === 'goal') content = <GoalScreen goal={activeGoal} onBack={backHome} onNext={createGoal} onUpdate={(goal) => { updateGoal(goal); setScreen('availability'); }} />;
  else if (screen === 'availability' && activeGoal) content = <AvailabilityScreen goal={activeGoal} onBack={() => setScreen('goal')} onSave={(availability) => generatePlan({ ...activeGoal, availability })} />;
  else if (screen === 'plan' && activeGoal?.plan) content = <PlanScreen goal={activeGoal} onBack={backHome} onEditAvailability={() => setScreen('availability')} onEditPlan={() => setScreen('plan-details')} onEditTask={(id) => { setTaskId(id); setScreen('task'); }} onSelect={() => setScreen('selection')} />;
  else if (screen === 'plan-details' && activeGoal?.plan) content = <PlanDetailsEditor goal={activeGoal} onBack={() => setScreen('plan')} onSave={(plan) => { updateGoal({ ...activeGoal, plan }); setScreen('plan'); }} />;
  else if (screen === 'selection' && activeGoal?.plan) content = <SelectionScreen goal={activeGoal} onBack={() => setScreen('plan')} onChange={replaceTask} onExport={exportSelected} />;
  else if (screen === 'settings') content = <SettingsScreen permission={permission} onBack={backHome} onRefresh={() => getCalendarPermissionStatus().then(setPermission).catch(() => setPermission('unavailable'))} />;
  else if (screen === 'task' && activeGoal?.plan) content = <TaskEditor task={activeGoal.plan.tasks.find((item) => item.id === taskId) ?? activeGoal.plan.tasks[0]} onBack={() => setScreen('plan')} onSave={saveTask} />;
  else content = <HomeScreen goals={goals} onCreate={() => setScreen('goal')} onOpen={openGoal} onUseExample={() => undefined} onSettings={() => setScreen('settings')} />;

  return <SafeAreaView style={styles.app}><StatusBar style="dark" />{content}{busy && <View style={styles.busy}><View style={styles.busyCard}><ActivityIndicator color="#306A59" /><Text style={styles.busyText}>{busy}</Text></View></View>}{notice && <Modal transparent animationType="fade"><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>Focus Goal</Text><Text style={styles.modalText}>{notice}</Text><PrimaryButton label="知道了" onPress={() => setNotice(null)} /></View></View></Modal>}{conflict && <ConflictModal conflict={conflict} onKeep={() => setConflict(null)} onChoose={(task) => { replaceTask(task); setConflict(null); }} />}</SafeAreaView>;
}

function HomeScreen({ goals, onCreate, onOpen, onUseExample, onSettings }: { goals: Goal[]; onCreate: () => void; onOpen: (goal: Goal) => void; onUseExample: () => void; onSettings: () => void }) {
  return <><TopBar title="你的目標" onSettings={onSettings} /><ScrollView contentContainerStyle={styles.screen}><View style={styles.hero}><Text style={styles.eyebrow}>今天只要開始一小步</Text><Text style={styles.heroTitle}>把想完成的事，排成做得到的行動。</Text><Text style={styles.heroText}>你保有每個決定的主控權；AI 只負責把路徑攤開。</Text></View>{goals.length ? <View style={styles.stack}>{goals.map((goal) => <Pressable key={goal.id} onPress={() => onOpen(goal)} style={styles.goalCard}><Text style={styles.goalTitle}>{goal.title}</Text><Text style={styles.goalMeta}>目標日期：{goal.deadline}</Text><Text style={styles.goalMeta}>{goal.plan ? `${goal.plan.tasks.length} 項可執行任務` : '尚待完成規劃'}</Text></Pressable>)}</View> : <View style={styles.emptyCard}><Text style={styles.emptyTitle}>還沒有目標</Text><Text style={styles.muted}>先放進一件你想完成的事；不需要一次想得很完整。</Text><SecondaryButton label="試試 Python 學習範例" onPress={onUseExample} /></View>}<PrimaryButton label="＋ 建立目標" onPress={onCreate} /></ScrollView></>;
}

function GoalScreen({ goal, onBack, onNext, onUpdate }: { goal: Goal | null; onBack: () => void; onNext: (draft: Omit<Goal, 'id' | 'createdAt' | 'availability'>) => void; onUpdate: (goal: Goal) => void }) {
  const [title, setTitle] = useState(goal?.title ?? '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? twoWeeksLater());
  const [level, setLevel] = useState(goal?.level ?? '');
  const [preferences, setPreferences] = useState(goal?.preferences ?? '');
  const next = () => {
    if (!title.trim()) { Alert.alert('先寫下一件想完成的事', '例如：兩週學完 Python 基礎'); return; }
    const draft = { title: title.trim(), deadline, level, preferences, plan: goal?.plan };
    if (goal) onUpdate({ ...goal, ...draft }); else onNext(draft);
  };
  return <><TopBar title={goal ? '調整目標' : '建立目標'} onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>先說說你想完成什麼</Text><Text style={styles.pageIntro}>以下是 AI 的可修改建議，不是固定前提。</Text><View style={styles.chat}><Text style={styles.chatLabel}>Focus Goal AI</Text><Text style={styles.chatText}>我會先根據你的目標建議一個溫和的節奏；你隨時可以修改、清空或拒絕任何建議。</Text></View><Field label="目標" value={title} onChangeText={setTitle} placeholder="例如：完成畢業論文第一章" multiline /><Field label="建議完成日期" value={deadline} onChangeText={setDeadline} placeholder="YYYY-MM-DD" /><Text style={styles.helper}>可改成你覺得合理的日期，例如 {twoWeeksLater()}。</Text><Field label="目前程度" value={level} onChangeText={setLevel} placeholder="例如：剛開始、已有基礎、需要複習" multiline /><Field label="偏好、限制或不可安排的事" value={preferences} onChangeText={setPreferences} placeholder="例如：週日休息、晚上專注力較好" multiline /><PrimaryButton label="設定可用時段" onPress={next} /></ScrollView></>;
}

function AvailabilityScreen({ goal, onBack, onSave }: { goal: Goal; onBack: () => void; onSave: (availability: AvailabilityWindow[]) => void }) {
  const [windows, setWindows] = useState(goal.availability);
  const toggleDay = (day: Weekday) => setWindows((items) => items.some((item) => item.weekday === day) ? items.filter((item) => item.weekday !== day) : [...items, { id: `window-${Date.now()}-${day}`, weekday: day, start: day === 6 ? '10:00' : '19:00', end: day === 6 ? '12:00' : '21:00' }]);
  const updateWindow = (id: string, key: 'start' | 'end', value: string) => setWindows((items) => items.map((item) => item.id === id ? { ...item, [key]: value } : item));
  return <><TopBar title="可用時段" onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>什麼時候最容易開始？</Text><Text style={styles.pageIntro}>只排進你主動保留的時段。V1 不會讀取既有系統日曆。</Text><View style={styles.availabilityCard}>{DAY_ORDER.map((day) => { const item = windows.find((window) => window.weekday === day); return <View key={day} style={styles.dayRow}><Pressable onPress={() => toggleDay(day)} style={[styles.dayToggle, item && styles.dayToggleOn]}><Text style={[styles.dayToggleText, item && styles.dayToggleTextOn]}>{weekdayNames[day]}</Text></Pressable>{item ? <View style={styles.timeInputs}><TextInput value={item.start} onChangeText={(value) => updateWindow(item.id, 'start', value)} style={styles.timeInput} placeholder="19:00" /><Text style={styles.timeDash}>–</Text><TextInput value={item.end} onChangeText={(value) => updateWindow(item.id, 'end', value)} style={styles.timeInput} placeholder="21:00" /></View> : <Text style={styles.unavailable}>不安排</Text>}</View>; })}</View><Text style={styles.helper}>時間以 24 小時制輸入，例如 19:00。日後可隨時回來調整。</Text><PrimaryButton label="生成可執行計畫" onPress={() => onSave(windows)} /></ScrollView></>;
}

function PlanScreen({ goal, onBack, onEditAvailability, onEditPlan, onEditTask, onSelect }: { goal: Goal; onBack: () => void; onEditAvailability: () => void; onEditPlan: () => void; onEditTask: (id: string) => void; onSelect: () => void }) {
  const plan = goal.plan!;
  return <><TopBar title="AI 行動計畫" onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>{goal.title}</Text><View style={styles.planSummary}><Text style={styles.eyebrow}>建議完成日期</Text><Text style={styles.dueDate}>{plan.suggestedDueDate}</Text><Text style={styles.planText}>{plan.summary}</Text><SecondaryButton label="調整摘要與里程碑" onPress={onEditPlan} /></View>{plan.capacityWarning && <View style={styles.warning}><Text style={styles.warningTitle}>時間可能不足</Text><Text style={styles.warningText}>{plan.capacityWarning}</Text><SecondaryButton label="調整可用時段" onPress={onEditAvailability} /></View>}<Text style={styles.sectionTitle}>里程碑</Text>{plan.milestones.map((item) => <View key={item.title} style={styles.milestone}><Text style={styles.milestoneTitle}>{item.title}</Text><Text style={styles.muted}>{item.description}</Text></View>)}<View style={styles.sectionHeader}><Text style={styles.sectionTitle}>任務清單</Text><Text style={styles.helper}>每項都可修改</Text></View>{plan.tasks.map((task) => <Pressable key={task.id} onPress={() => onEditTask(task.id)} style={styles.taskCard}><View style={styles.taskHead}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.editLink}>編輯</Text></View><Text style={styles.taskTime}>{formatTaskTime(task)} · {durationMinutes(task)} 分鐘</Text><Text style={styles.taskDescription}>{task.description}</Text></Pressable>)}<PrimaryButton label="選擇要加入日曆的任務" onPress={onSelect} /></ScrollView></>;
}

function PlanDetailsEditor({ goal, onBack, onSave }: { goal: Goal; onBack: () => void; onSave: (plan: NonNullable<Goal['plan']>) => void }) {
  const plan = goal.plan!;
  const [summary, setSummary] = useState(plan.summary);
  const [milestones, setMilestones] = useState(plan.milestones);
  const updateMilestone = (index: number, key: 'title' | 'description', value: string) => setMilestones((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  return <><TopBar title="調整計畫內容" onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>讓計畫用你的語氣</Text><Text style={styles.pageIntro}>AI 產生的摘要與每個里程碑都可以直接改寫。</Text><Field label="計畫摘要" value={summary} onChangeText={setSummary} multiline />{milestones.map((milestone, index) => <View key={`${milestone.title}-${index}`} style={styles.editorGroup}><Text style={styles.sectionTitle}>里程碑 {index + 1}</Text><Field label="名稱" value={milestone.title} onChangeText={(value) => updateMilestone(index, 'title', value)} /><Field label="說明" value={milestone.description} onChangeText={(value) => updateMilestone(index, 'description', value)} multiline /></View>)}<PrimaryButton label="儲存計畫內容" onPress={() => onSave({ ...plan, summary, milestones })} /></ScrollView></>;
}

function SelectionScreen({ goal, onBack, onChange, onExport }: { goal: Goal; onBack: () => void; onChange: (task: Task) => void; onExport: () => void }) {
  const tasks = goal.plan!.tasks;
  const selectedCount = tasks.filter((task) => task.selected).length;
  const setAll = (selected: boolean) => tasks.forEach((task) => onChange({ ...task, selected }));
  return <><TopBar title="加入系統日曆" onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>選擇你想承諾的行動</Text><Text style={styles.pageIntro}>不用一次加入全部。先選你想排進日曆的任務即可。</Text><View style={styles.selectionBar}><Text style={styles.selectedText}>已選 {selectedCount} / {tasks.length} 項</Text><Pressable onPress={() => setAll(selectedCount !== tasks.length)}><Text style={styles.editLink}>{selectedCount === tasks.length ? '取消全選' : '全選'}</Text></Pressable></View>{tasks.map((task) => <Pressable key={task.id} onPress={() => onChange({ ...task, selected: !task.selected })} style={[styles.selectTask, task.selected && styles.selectTaskOn]}><View style={[styles.checkbox, task.selected && styles.checkboxOn]}>{task.selected && <Text style={styles.checkMark}>✓</Text>}</View><View style={styles.selectContent}><Text style={styles.taskTitle}>{task.title}</Text><Text style={styles.taskTime}>{formatTaskTime(task)} · {durationMinutes(task)} 分鐘</Text></View></Pressable>)}<PrimaryButton label={`加入日曆（${selectedCount}）`} onPress={onExport} disabled={!selectedCount} /><Text style={styles.helper}>第一次加入時，系統會請求日曆權限。若拒絕，可在設定頁查看狀態。</Text></ScrollView></>;
}

function SettingsScreen({ permission, onBack, onRefresh }: { permission: PermissionStatus; onBack: () => void; onRefresh: () => void }) {
  const message: Record<PermissionStatus, string> = { granted: '已允許：可將選取的任務加入系統日曆。', denied: '尚未允許：請到系統設定開啟 Focus Goal 的日曆權限。', undetermined: '尚未要求：第一次加入日曆時會向你詢問。', unavailable: Platform.OS === 'web' ? '網頁預覽不支援系統日曆；請使用 iOS 或 Android 裝置。' : '目前無法使用系統日曆。' };
  return <><TopBar title="設定與權限" onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>保持由你決定</Text><View style={styles.settingsCard}><Text style={styles.settingsTitle}>系統日曆</Text><Text style={styles.muted}>{message[permission]}</Text><SecondaryButton label="重新檢查權限" onPress={onRefresh} />{permission === 'denied' && <SecondaryButton label="開啟系統設定" onPress={() => Linking.openSettings()} />}</View><View style={styles.settingsCard}><Text style={styles.settingsTitle}>AI 規劃</Text><Text style={styles.muted}>目前使用可展示與測試的 mock AI 回覆。所有內容都可以在加入日曆前修改。</Text></View><View style={styles.settingsCard}><Text style={styles.settingsTitle}>資料保存</Text><Text style={styles.muted}>你的目標、可用時段、計畫與勾選項目會保存在這部裝置上。</Text></View></ScrollView></>;
}

function TaskEditor({ task, onBack, onSave }: { task: Task; onBack: () => void; onSave: (task: Task) => void }) {
  const start = new Date(task.startAt); const end = new Date(task.endAt);
  const [title, setTitle] = useState(task.title); const [description, setDescription] = useState(task.description);
  const [date, setDate] = useState(start.toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(start.toTimeString().slice(0, 5));
  const [endTime, setEndTime] = useState(end.toTimeString().slice(0, 5));
  const save = () => {
    const nextStart = atDateAndTime(date, startTime); const nextEnd = atDateAndTime(date, endTime);
    if (!title.trim() || Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd <= nextStart) { Alert.alert('請檢查任務時間', '結束時間需晚於開始時間，日期格式為 YYYY-MM-DD。'); return; }
    onSave({ ...task, title: title.trim(), description, startAt: nextStart.toISOString(), endAt: nextEnd.toISOString() });
  };
  return <><TopBar title="調整任務" onBack={onBack} /><ScrollView contentContainerStyle={styles.screen}><Text style={styles.pageTitle}>這一項要怎麼做？</Text><Text style={styles.pageIntro}>你可修改任何 AI 產生的內容。若新時間不在可用時段內，我們會只提出候選時段供你選擇。</Text><Field label="任務名稱" value={title} onChangeText={setTitle} multiline /><Field label="簡短說明" value={description} onChangeText={setDescription} multiline /><Field label="日期" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" /><Field label="開始時間" value={startTime} onChangeText={setStartTime} placeholder="19:00" /><Field label="結束時間" value={endTime} onChangeText={setEndTime} placeholder="20:00" /><PrimaryButton label="儲存任務" onPress={save} /></ScrollView></>;
}

function ConflictModal({ conflict, onKeep, onChoose }: { conflict: { task: Task; alternatives: Task[] }; onKeep: () => void; onChoose: (task: Task) => void }) {
  return <Modal transparent animationType="fade"><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>這個時間不在你的可用時段</Text><Text style={styles.modalText}>你的修改已保留。若想改到已設定的時段，可從以下選擇；我們不會自動替你改排。</Text>{conflict.alternatives.length ? conflict.alternatives.map((task) => <Pressable key={task.startAt} onPress={() => onChoose(task)} style={styles.alternative}><Text style={styles.alternativeTitle}>{formatTaskTime(task)}</Text><Text style={styles.editLink}>使用此時段</Text></Pressable>) : <Text style={styles.muted}>目前沒有足夠長的備用時段。你可調整可用時段或保留這個時間。</Text>}<SecondaryButton label="保留我選的時間" onPress={onKeep} /></View></View></Modal>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#F6F7F3' }, loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#F6F7F3' },
  topBar: { height: 56, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E4E8E2', backgroundColor: '#FBFCF8' }, topAction: { minWidth: 72 }, topActionText: { color: '#306A59', fontWeight: '700' }, topTitle: { position: 'absolute', left: 96, right: 96, textAlign: 'center', fontWeight: '700', color: '#17342D' }, brand: { color: '#17342D', fontWeight: '800', fontSize: 16 },
  screen: { padding: 20, paddingBottom: 44, gap: 14 }, hero: { paddingTop: 20, gap: 8 }, eyebrow: { color: '#3E7465', fontWeight: '800', fontSize: 12, letterSpacing: .6 }, heroTitle: { color: '#17342D', fontSize: 30, fontWeight: '800', lineHeight: 40 }, heroText: { color: '#5A6761', fontSize: 16, lineHeight: 24 },
  pageTitle: { color: '#17342D', fontSize: 25, fontWeight: '800', lineHeight: 34 }, pageIntro: { color: '#5A6761', lineHeight: 22, marginBottom: 6 }, muted: { color: '#64736B', lineHeight: 21 }, helper: { color: '#718077', fontSize: 13, lineHeight: 19 },
  primaryButton: { backgroundColor: '#306A59', paddingVertical: 15, paddingHorizontal: 18, borderRadius: 15, alignItems: 'center', marginTop: 6 }, primaryButtonText: { color: 'white', fontWeight: '800', fontSize: 16 }, secondaryButton: { alignSelf: 'flex-start', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#E6F0EB', marginTop: 6 }, secondaryButtonText: { color: '#306A59', fontWeight: '700' }, disabled: { opacity: .45 }, dangerText: { color: '#9F3535' },
  stack: { gap: 10 }, goalCard: { backgroundColor: '#FFF', padding: 18, borderRadius: 18, gap: 6, borderWidth: 1, borderColor: '#E5E9E4' }, goalTitle: { color: '#17342D', fontWeight: '800', fontSize: 17 }, goalMeta: { color: '#66766C', fontSize: 13 }, emptyCard: { backgroundColor: '#ECF3EE', borderRadius: 18, padding: 20, gap: 10 }, emptyTitle: { fontSize: 18, fontWeight: '800', color: '#17342D' },
  chat: { backgroundColor: '#E7F1EC', padding: 16, borderRadius: 16, gap: 6 }, chatLabel: { fontWeight: '800', color: '#306A59', fontSize: 13 }, chatText: { color: '#335248', lineHeight: 21 }, field: { gap: 7 }, fieldLabel: { color: '#29453B', fontWeight: '700', fontSize: 14 }, input: { borderWidth: 1, borderColor: '#D6DED7', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, color: '#17342D', fontSize: 16 }, textarea: { minHeight: 84, textAlignVertical: 'top' },
  availabilityCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 10, borderWidth: 1, borderColor: '#E1E7E1' }, dayRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 10, borderBottomWidth: 1, borderBottomColor: '#EEF1ED' }, dayToggle: { width: 54, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#EDF0EC' }, dayToggleOn: { backgroundColor: '#CFE4D9' }, dayToggleText: { color: '#64736B', fontSize: 13, fontWeight: '700' }, dayToggleTextOn: { color: '#205341' }, timeInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }, timeInput: { flex: 1, backgroundColor: '#F5F7F4', padding: 8, borderRadius: 8, textAlign: 'center', color: '#17342D' }, timeDash: { color: '#728078' }, unavailable: { color: '#87928B', fontSize: 13 },
  planSummary: { backgroundColor: '#E7F1EC', borderRadius: 18, padding: 18, gap: 6 }, dueDate: { fontSize: 23, fontWeight: '800', color: '#205341' }, planText: { color: '#355B4D', lineHeight: 21 }, warning: { backgroundColor: '#FFF4DD', borderRadius: 16, padding: 16, gap: 6 }, warningTitle: { fontWeight: '800', color: '#87611E' }, warningText: { color: '#76591F', lineHeight: 20 }, sectionTitle: { color: '#17342D', fontWeight: '800', fontSize: 19, marginTop: 8 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }, milestone: { borderLeftWidth: 3, borderLeftColor: '#82B09E', paddingLeft: 13, gap: 4 }, milestoneTitle: { color: '#26463A', fontWeight: '800' }, taskCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, gap: 7, borderWidth: 1, borderColor: '#E3E8E2' }, taskHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, taskTitle: { color: '#1C3C31', fontWeight: '800', fontSize: 15, flex: 1 }, editLink: { color: '#306A59', fontWeight: '700', fontSize: 13 }, taskTime: { color: '#3E7465', fontSize: 13, fontWeight: '700' }, taskDescription: { color: '#617068', lineHeight: 20, fontSize: 13 },
  selectionBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E7F1EC', padding: 14, borderRadius: 13 }, selectedText: { color: '#264C3F', fontWeight: '800' }, selectTask: { backgroundColor: '#FFF', flexDirection: 'row', gap: 12, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: '#E1E8E2', alignItems: 'center' }, selectTaskOn: { borderColor: '#78A992', backgroundColor: '#FBFFFC' }, checkbox: { height: 23, width: 23, borderRadius: 7, borderWidth: 2, borderColor: '#B5C1BA', alignItems: 'center', justifyContent: 'center' }, checkboxOn: { backgroundColor: '#306A59', borderColor: '#306A59' }, checkMark: { color: 'white', fontWeight: '800' }, selectContent: { flex: 1, gap: 4 },
  settingsCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E1E7E1', padding: 17, gap: 8 }, settingsTitle: { color: '#17342D', fontWeight: '800', fontSize: 16 }, editorGroup: { gap: 10, paddingTop: 8 },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22, 45, 37, .22)', alignItems: 'center', justifyContent: 'center' }, busyCard: { backgroundColor: '#FFF', padding: 22, borderRadius: 18, alignItems: 'center', gap: 12, marginHorizontal: 34 }, busyText: { color: '#26463A', fontWeight: '700', textAlign: 'center' }, modalBackdrop: { flex: 1, backgroundColor: 'rgba(16, 38, 31, .36)', justifyContent: 'center', padding: 22 }, modalCard: { backgroundColor: '#FCFDF9', padding: 22, borderRadius: 20, gap: 12 }, modalTitle: { color: '#17342D', fontWeight: '800', fontSize: 20 }, modalText: { color: '#53635B', lineHeight: 22 }, alternative: { padding: 13, borderRadius: 12, backgroundColor: '#E8F2EC', gap: 4 }, alternativeTitle: { color: '#264C3F', fontWeight: '800' },
});
