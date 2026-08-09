export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type RunStatus = 'planned' | 'in_progress' | 'completed' | 'absent' | 'skipped';
export type RecoveryType = 'backfill' | 'skip' | 'reschedule';

export type RunningAssessment = {
  ageRange: string;
  recentActivity: string;
  availableDays: Weekday[];
  minutesPerRun: number;
  desiredAbility: string;
  healthLimitations: string;
  hasChestPain: boolean;
  hasDizziness: boolean;
  hasHeartOrLungCondition: boolean;
  hasJointProblem: boolean;
  hasMedicalRestriction: boolean;
};
export type RunningPlanDraft = {
  id: string;
  createdAt: string;
  assessment: RunningAssessment;
  title: string;
  summary: string;
  weekdays: Weekday[];
  minutesPerRun: number;
  cycleWeeks: number;
  targetRate: number;
  safetyBlocked: boolean;
};

export type RunningPlanVersion = {
  id: string;
  createdAt: string;
  effectiveFrom: string;
  weekdays: Weekday[];
  minutesPerRun: number;
  summary: string;
  reason: string;
};

export type CheckInPhoto = {
  id: string;
  uri: string;
  uploadedAt: string;
  encouragement: string;
  analysis: 'gemini' | 'fallback' | 'disabled';
};

export type AbsenceRecovery = {
  type: RecoveryType;
  reason: string;
  resolvedAt: string;
  rescheduledDate?: string;
};

export type RunRecord = {
  id: string;
  date: string;
  status: RunStatus;
  photos: CheckInPhoto[];
  recovery?: AbsenceRecovery;
  note?: string;
};

export type GoalEvent = {
  id: string;
  at: string;
  type: 'committed' | 'revised' | 'paused' | 'resumed' | 'check_in' | 'completed_run' | 'absent' | 'recovered' | 'goal_completed' | 'abandoned';
  message: string;
};

export type RunningGoal = {
  id: string;
  title: string;
  status: GoalStatus;
  createdAt: string;
  committedAt: string;
  startDate: string;
  endDate: string;
  cycleWeeks: number;
  targetRate: number;
  planVersions: RunningPlanVersion[];
  records: RunRecord[];
  events: GoalEvent[];
  pause?: { reason: string; resumeDate: string; pausedAt: string };
  archivedReason?: string;
};

export type Account = {
  id: string;
  email: string;
  timezone: string;
  photoAnalysisConsent: boolean;
  notificationPermission: 'undetermined' | 'granted' | 'denied' | 'unavailable';
  drafts: RunningPlanDraft[];
  goals: RunningGoal[];
  deletionRequestedAt?: string;
};

export type AppData = {
  sessionAccountId?: string;
  accounts: Account[];
};

export const weekdayNames: Record<Weekday, string> = {
  0: '週日',
  1: '週一',
  2: '週二',
  3: '週三',
  4: '週四',
  5: '週五',
  6: '週六',
};

export const defaultAssessment: RunningAssessment = {
  ageRange: '25–34',
  recentActivity: '最近四週偶爾散步，沒有固定跑步。',
  availableDays: [1, 3, 6],
  minutesPerRun: 30,
  desiredAbility: '建立每週三次的跑步習慣。',
  healthLimitations: '',
  hasChestPain: false,
  hasDizziness: false,
  hasHeartOrLungCondition: false,
  hasJointProblem: false,
  hasMedicalRestriction: false,
};
