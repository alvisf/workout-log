const en = {
  home: 'Home', workout: 'Workout', program: 'Program', exercises: 'Exercises', history: 'History', settings: 'Settings',
  start: 'Start', finish: 'Finish', resume: 'Resume', discard: 'Discard', cancel: 'Cancel', save: 'Save', delete: 'Delete', edit: 'Edit', add: 'Add', close: 'Close',
  week: 'Week', day: 'Day', next: 'Next up', recent: 'Recent workouts', done: 'Done',
  sets: 'sets', reps: 'reps', rest: 'Rest', skip: 'Skip', rir: 'RIR', warmup: 'Warm-up', working: 'Working', lastTime: 'Last time', notes: 'Notes',
  addSet: 'Add set', addExercise: 'Add exercise', swap: 'Swap', substitutes: 'Substitutes', remember: 'Remember this swap for the program',
  volume: 'Volume', prs: 'PRs', time: 'Time', summary: 'Workout summary', noSets: 'No sets logged. Workout discarded.',
  readOnly: 'Another tab owns the open workout.', takeOver: 'Take over', install: 'Install this app: tap Share, then Add to Home Screen. Installed apps keep their data.',
  backup: 'It has been 30 days since your last export. Export a backup.', export: 'Export', import: 'Import', deleteAll: 'Delete all data',
  units: 'Units', language: 'Language', calendar: 'Calendar', list: 'List', search: 'Search exercise', best: 'Best', e1rm: 'Est. 1RM',
  bodyWeight: 'Body weight', currentWeek: 'Current week', activeProgram: 'Active program', confirmDelete: 'Delete? This cannot be undone.',
  thisWeek: 'This week', workouts: 'workouts', plateCalc: 'Plates per side', bar: 'Bar', deload: 'Deload / intro week: keep the higher RIR.',
  compound: 'RIR 0 here: stop when one more rep is not possible. Do not fail the rep.', failure: 'RIR 0 here: attempt the rep and fail.',
  progression: 'All working sets hit the top of the range last time. Raise the load.',
  newExercise: 'New exercise', merge: 'Merge into', 
  hevyCsv: 'Hevy CSV', json: 'JSON (full)', importHevy: 'Import Hevy CSV', importJson: 'Import JSON', imported: 'Imported', skipped: 'skipped', errors: 'errors',
  avgRir: 'Avg RIR', defaultWeight: 'Start weight', profile: 'Profile', people: 'Who is training', born: 'Born', bodyWeightKg: 'Body weight (kg)', sex: 'Sex', male: 'Male', female: 'Female', peopleNote: 'Start weights scale to each person. Each person has their own history and week.', peopleLocked: 'Finish or discard the open workout to switch.', height: 'Height (cm)', months: 'Months training', recalc: 'Recalculate start weights from profile', recalcNote: 'Start weights were set for a 74 kg man, 27, 3 months in, from your Hevy numbers. Edit any exercise to change its start weight.', restOver: 'Rest over',
  gSync: 'Airtable sync', syncNote: 'Share workouts and body weight between phone and desktop through Airtable. The token is kept in this browser only.',
  syncToken: 'Personal access token', syncBase: 'Base id', syncTable: 'Table name', syncEnable: 'Sync on', syncCreateTable: 'Create tables', syncNow: 'Sync now', syncPushAll: 'Upload all local data',
  syncTableCreated: 'Tables created. Turn sync on, then upload all local data.', syncDone: 'Synced.', syncOff: 'Sync is off.', syncing: 'Syncing…', syncIdle: 'Waiting for the first sync.', syncedAt: 'Last sync', syncError: 'Sync error', syncPending: 'waiting', minimize: 'Minimize', total: 'Total', noData: 'Nothing yet.', ago: 'ago', today: 'Today',
};
export type K = keyof typeof en;
export const t = (k: K): string => en[k];
