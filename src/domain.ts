export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type RunStatus = 'planned' | 'in_progress' | 'completed' | 'absent' | 'skipped';
export type RecoveryType = 'backfill' | 'skip' | 'reschedule';

export type GoalReason = 'fat_loss' | 'health' | 'fitness' | 'stress_relief' | 'discipline' | 'race' | 'other';
export type RaceDistance = '5k' | '10k' | 'half_marathon' | 'marathon';
export type AdultAgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_64' | '65_plus';
export type RecentRunningFrequency = 'none' | 'occasional' | 'once_weekly' | 'two_to_three_weekly' | 'four_plus_weekly';
export type JogAbility = 'walk_30' | 'under_5' | '5_10' | '10_20' | '20_30' | '30_plus' | 'unknown';
export type ActivityDays = 0 | 1 | 2 | 3 | 4 | '5_plus' | 'unknown';
export type WeeklyActivityTime = 'under_30' | '30_60' | '1_2_hours' | '2_3_hours' | '3_plus_hours' | 'unknown';
export type ActivityType = 'walking' | 'strength' | 'ball_sports' | 'swimming' | 'cycling' | 'other';
export type DailyTimeRange = '20_30' | '30_45' | '45_60' | '60_90' | '90_plus' | 'unknown';
export type RealisticFrequency = 2 | 3 | 4 | 5 | 'coach';

export type RecentRun =
  | { confidence: 'EXACT'; distanceKm: number; durationMinutes: number; rpe: number }
  | { confidence: 'APPROXIMATE'; distanceRange: 'under_2' | '2_5' | '5_10' | '10_plus'; durationRange: 'under_20' | '20_40' | '40_60' | '60_plus'; effort: 'easy' | 'comfortable' | 'hard' | 'very_hard' }
  | { confidence: 'UNKNOWN' };

export type OnboardingSubmission = {
  schemaVersion: 'initial-coaching-onboarding/v1';
  goal: {
    primaryReason: GoalReason;
    secondaryReasons: GoalReason[];
    otherReason?: string;
    raceDistance?: RaceDistance;
    targetDate?: string;
    targetWeightChangeKg?: number;
    specificTarget?: string;
    desiredIdentityInThreeMonths?: string;
    currentSituation?: string;
  };
  ability: {
    ageRange: AdultAgeRange;
    recentRunningFrequency: RecentRunningFrequency;
    recentRun?: RecentRun;
    jogAbility: JogAbility;
    longestDistanceKm?: number;
    hadRunningHabit: boolean;
    previousHabitDuration?: 'under_1_month' | '1_3_months' | '3_6_months' | '6_12_months' | '1_plus_years';
    previousRunsPerWeek?: number;
  };
  recentActivity: {
    activeDays: ActivityDays;
    weeklyTime: WeeklyActivityTime;
    activityTypes: ActivityType[];
    otherActivity?: string;
  };
  availability: {
    availableDays: Weekday[];
    realisticFrequency: RealisticFrequency;
    timeByDay: Partial<Record<Weekday, DailyTimeRange>>;
  };
  safety: {
    hasChestPain: boolean;
    hasDizziness: boolean;
    hasHeartOrLungCondition: boolean;
    hasRunningPain: boolean;
    hasMedicalRestriction: boolean;
  };
};

export type RunningOnboardingDraft = {
  currentStep: 0 | 1 | 2 | 3 | 4;
  submission: OnboardingSubmission;
  updatedAt: string;
};

export type PlanSource = 'gemini' | 'fallback';
export type PlanWeekStatus = 'DRAFT' | 'COMMITTED' | 'PLANNED';
export type PlanSessionStatus = 'DRAFT' | 'COMMITTED' | 'PLANNED' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
export type PlanSessionType = 'RUN_WALK' | 'EASY_RUN' | 'LONG_EASY_RUN' | 'REST';

export type PlanPhase = {
  id: string;
  startWeek: number;
  endWeek: number;
  name: string;
  purpose: string;
  progressionSummary: string;
};

export type PlanSession = {
  id: string;
  weekday: Weekday;
  type: PlanSessionType;
  status: PlanSessionStatus;
  title: string;
  totalMinutes: number;
  instructions: string[];
  rpe: { min: number; max: number };
  talkTest: string;
  focus: string;
  easierFallback: string;
  coachingReason: string;
};

export type PlanWeek = {
  id: string;
  weekNumber: number;
  status: PlanWeekStatus;
  focus: string;
  estimatedTotalMinutes: number;
  sessions: PlanSession[];
};

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
  schemaVersion: 'initial-coaching-plan/v1';
  planVersion: number;
  status: 'DRAFT';
  createdAt: string;
  source: PlanSource;
  submission: OnboardingSubmission;
  assessment?: RunningAssessment;
  title: string;
  summary: string;
  goalSummary: string;
  feasibility: { status: 'REALISTIC' | 'ADJUSTED'; message: string };
  coachingSummary: string;
  reasoningSummary: string;
  phases: PlanPhase[];
  weeks: PlanWeek[];
  weekdays: Weekday[];
  minutesPerRun: number;
  estimatedWeeklyMinutes: number;
  cycleWeeks: number;
  targetRate: number;
  safetyBlocked: boolean;
};

export type RunningPlanVersion = {
  id: string;
  schemaVersion?: 'initial-coaching-plan/v1';
  version?: number;
  status?: 'COMMITTED';
  createdAt: string;
  committedAt?: string;
  supersededBy?: string;
  effectiveFrom: string;
  source?: PlanSource;
  weekdays: Weekday[];
  minutesPerRun: number;
  summary: string;
  reason: string;
  goalSummary?: string;
  coachingSummary?: string;
  reasoningSummary?: string;
  phases?: PlanPhase[];
  weeks?: PlanWeek[];
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
  onboardingDraft?: RunningOnboardingDraft;
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

export const defaultOnboardingSubmission: OnboardingSubmission = {
  schemaVersion: 'initial-coaching-onboarding/v1',
  goal: {
    primaryReason: 'health',
    secondaryReasons: [],
    desiredIdentityInThreeMonths: '',
    currentSituation: '',
  },
  ability: {
    ageRange: '25_34',
    recentRunningFrequency: 'none',
    jogAbility: 'under_5',
    hadRunningHabit: false,
  },
  recentActivity: {
    activeDays: 0,
    weeklyTime: 'under_30',
    activityTypes: [],
  },
  availability: {
    availableDays: [1, 3, 6],
    realisticFrequency: 3,
    timeByDay: { 1: '30_45', 3: '30_45', 6: '45_60' },
  },
  safety: {
    hasChestPain: false,
    hasDizziness: false,
    hasHeartOrLungCondition: false,
    hasRunningPain: false,
    hasMedicalRestriction: false,
  },
};
