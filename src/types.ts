export const DATA_VERSION = 1;

export interface Exercise {
  id: string; name: string; muscleGroup: string; equipment: string;
  notes: string; videoUrl: string; isBarbell: boolean; defaultWeight: number; // kg, starting working weight when there is no history
}

export interface PlannedExercise {
  id: string; order: number; exerciseId: string; technique: string;
  warmupSets: number; workingSets: number; repMin: number; repMax: number;
  rir: number[]; restSeconds: number; restLabel: string; subExerciseIds: string[]; notes: string;
}

export interface PlannedDay {
  id: string; week: number; block: number; blockLabel: string; dayName: string; order: number;
  exercises: PlannedExercise[];
}

export interface Program { id: string; name: string; weeks: number; source: string; days: PlannedDay[] }

export type SetType = 'warmup' | 'working';

export interface WSet {
  id: string; index: number; type: SetType; weight: number; reps: number; rir: number | null;
  done: boolean; notes: string; isPR: boolean;
}

export interface WorkoutExercise {
  id: string; order: number; exerciseId: string; plannedExerciseId: string | null;
  swappedFromId: string | null; sets: WSet[]; notes: string;
}

export interface Workout {
  id: string; programId: string | null; plannedDayId: string | null; week: number | null; dayName: string | null;
  startedAt: number; endedAt: number | null; notes: string; bodyWeight: number | null; exercises: WorkoutExercise[];
  updatedAt?: number;
}

export interface BodyWeight { date: string; kg: number; updatedAt?: number }

export interface Settings {
  unit: 'kg' | 'lb'; barWeight: number; plates: number[];
  restTimer: boolean; restSound: boolean; restStep: number; autoAdvance: boolean;
  activeProgramId: string | null; currentWeek: number; doneDays: string[]; // plannedDay ids done in current week
  swaps: Record<string, string>; // plannedExerciseId -> exerciseId
  theme: 'system' | 'dark' | 'light'; accent: string; lang: 'en' | 'de';
  lastBackupAt: number; dismissedBackup: number; installDismissed: boolean; notifAsked: boolean;
  profile: { age: number; heightCm: number; weightKg: number; trainingMonths: number; sex?: 'male' | 'female'; factor?: number }; // factor: start-weight scale last applied, relative to the 74 kg, 27 y, male baseline
  seeded: string[];
}

export type RestState = { endsAt: number; total: number } | null;

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg', barWeight: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25],
  restTimer: true, restSound: true, restStep: 30, autoAdvance: true,
  activeProgramId: 'prog-minmax-p2', currentWeek: 1, doneDays: [], swaps: {},
  theme: 'system', accent: '#2f80ed', lang: 'en',
  lastBackupAt: Date.now(), dismissedBackup: 0, installDismissed: false, notifAsked: false,
  profile: { age: 27, heightCm: 174, weightKg: 74, trainingMonths: 3 }, seeded: [],
};

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
