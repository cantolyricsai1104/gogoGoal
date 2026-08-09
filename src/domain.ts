export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AvailabilityWindow = {
  id: string;
  weekday: Weekday;
  start: string;
  end: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  selected: boolean;
};

export type Milestone = {
  title: string;
  description: string;
};

export type Plan = {
  suggestedDueDate: string;
  summary: string;
  milestones: Milestone[];
  tasks: Task[];
  capacityWarning?: string;
};

export type Goal = {
  id: string;
  title: string;
  createdAt: string;
  deadline: string;
  level: string;
  preferences: string;
  availability: AvailabilityWindow[];
  plan?: Plan;
};

export type AppData = {
  goals: Goal[];
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

export const defaultAvailability: AvailabilityWindow[] = [
  ...([1, 2, 3, 4, 5] as Weekday[]).map((weekday) => ({
    id: `weekday-${weekday}`,
    weekday,
    start: '19:00',
    end: '21:00',
  })),
  { id: 'sat', weekday: 6, start: '10:00', end: '12:00' },
];
