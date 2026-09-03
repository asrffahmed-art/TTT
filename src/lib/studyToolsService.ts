// THOTH Study Tools — 100% LOCAL study helpers (alarms/reminders + calendar).
// Owner directive: these tools must work LOCALLY per user — every byte of data
// lives in the user's own browser localStorage. No server calls, no Firestore,
// nothing remote. This is a standalone productivity store in the same category
// as theme/language preferences; the chat-storage rules (guest zero-storage,
// session manager, Firestore chat sync) are NOT touched by this file.
//
// AI integration: the chat model is taught (via an additive system-instruction
// block) to append machine-only tags at the END of its reply:
//   [[THOTH_REMINDER::{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","repeat":"once|daily|weekly"}]]
//   [[THOTH_EVENT::{"title":"...","date":"YYYY-MM-DD","time":"HH:MM","note":"..."}]]
// extractStudyToolCommands() strips those tags from the visible text and
// applyStudyToolCommands() executes them into the local store.

import { getEffectiveUserId } from './chatSessionManager';

export interface StudyReminder {
  id: string;
  title: string;
  date: string;   // 'YYYY-MM-DD' — used when repeat === 'once', '' otherwise
  time: string;   // 'HH:MM' (24h)
  repeat: 'once' | 'daily' | 'weekly';
  enabled: boolean;
  createdAt: string;
  lastFiredKey?: string; // fire-once guard: 'YYYY-MM-DD'
}

export interface StudyEvent {
  id: string;
  title: string;
  date: string;   // 'YYYY-MM-DD'
  time?: string;  // 'HH:MM'
  note?: string;
  createdAt: string;
}

export interface StudyToolCommands {
  cleanText: string;
  reminders: { title: string; date: string; time: string; repeat: 'once' | 'daily' | 'weekly' }[];
  events: { title: string; date: string; time?: string; note?: string }[];
}

const REMINDERS_KEY = (uid: string) => `thoth_study_reminders_${uid}`;
const EVENTS_KEY = (uid: string) => `thoth_study_events_${uid}`;

// ---- storage helpers (per user; guests share a device-local bucket) ----

function ownerKey(): string {
  return getEffectiveUserId() || 'guest';
}

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: any[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch { /* storage full/blocked — tools degrade silently */ }
}

export function getReminders(): StudyReminder[] {
  return readList<StudyReminder>(REMINDERS_KEY(ownerKey()));
}

export function saveReminders(list: StudyReminder[]) {
  writeList(REMINDERS_KEY(ownerKey()), list);
}

export function getEvents(): StudyEvent[] {
  return readList<StudyEvent>(EVENTS_KEY(ownerKey()));
}

export function saveEvents(list: StudyEvent[]) {
  writeList(EVENTS_KEY(ownerKey()), list);
}

// ---- reminders CRUD ----

function makeId(): string {
  return `st_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function addReminder(input: { title: string; date?: string; time: string; repeat?: 'once' | 'daily' | 'weekly' }): { ok: boolean; duplicate?: boolean } {
  const title = (input.title || '').toString().trim().slice(0, 120);
  const time = normalizeTime(input.time);
  const repeat = (['once', 'daily', 'weekly'].includes(String(input.repeat)) ? input.repeat : 'once') as 'once' | 'daily' | 'weekly';
  if (!title || !time) return { ok: false };
  const date = repeat === 'once' ? normalizeDate(input.date || '')
    : repeat === 'weekly' ? normalizeDate(input.date || '')  // weekly keeps a reference date = the weekday it repeats on
    : ''; // daily needs no date

  const list = getReminders();
  // Duplicate guard: same active title+date+time+repeat → don't double-create
  const dup = list.some(r => r.enabled && r.title === title && r.time === time && r.repeat === repeat && (r.date || '') === (date || ''));
  if (dup) return { ok: true, duplicate: true };

  list.unshift({
    id: makeId(),
    title,
    date,
    time,
    repeat,
    enabled: true,
    createdAt: new Date().toISOString()
  });
  saveReminders(list);
  return { ok: true };
}

export function deleteReminder(id: string) {
  saveReminders(getReminders().filter(r => r.id !== id));
}

export function toggleReminder(id: string) {
  const list = getReminders();
  const idx = list.findIndex(r => r.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], enabled: !list[idx].enabled };
    saveReminders(list);
  }
}

// ---- events CRUD ----

export function addEvent(input: { title: string; date: string; time?: string; note?: string }): { ok: boolean; duplicate?: boolean } {
  const title = (input.title || '').toString().trim().slice(0, 120);
  const date = normalizeDate(input.date || '');
  if (!title || !date) return { ok: false };
  const time = normalizeTime(input.time || '');
  const note = (input.note || '').toString().trim().slice(0, 300) || undefined;

  const list = getEvents();
  const dup = list.some(e => e.title === title && e.date === date && (e.time || '') === time);
  if (dup) return { ok: true, duplicate: true };

  list.unshift({ id: makeId(), title, date, time: time || undefined, note, createdAt: new Date().toISOString() });
  saveEvents(list);
  return { ok: true };
}

export function deleteEvent(id: string) {
  saveEvents(getEvents().filter(e => e.id !== id));
}

export function getEventsForDate(date: string): StudyEvent[] {
  return getEvents().filter(e => e.date === date);
}

// ---- normalization helpers ----

export function normalizeTime(t: string): string {
  const m = /^(\d{1,2})[:：.](\d{2})/.exec((t || '').toString().trim());
  if (!m) return '';
  const h = Math.min(23, parseInt(m[1], 10));
  const min = Math.min(59, parseInt(m[2], 10));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function normalizeDate(d: string): string {
  const s = (d || '').toString().trim();
  // YYYY-MM-DD (also tolerates YYYY/MM/DD)
  let m = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/.exec(s);
  if (m) {
    const dt = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (!isNaN(dt.getTime())) return `${m[1]}-${String(+m[2]).padStart(2, '0')}-${String(+m[3]).padStart(2, '0')}`;
  }
  // DD-MM-YYYY or DD/MM/YYYY
  m = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/.exec(s);
  if (m) {
    const dt = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
    if (!isNaN(dt.getTime())) return `${m[3]}-${String(+m[2]).padStart(2, '0')}-${String(+m[1]).padStart(2, '0')}`;
  }
  return '';
}

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- due computation (LOCAL device time — alarms are personal/local) ----

export function isReminderDue(r: StudyReminder, now = new Date()): boolean {
  if (!r.enabled) return false;
  const [hh, mm] = (r.time || '00:00').split(':').map(n => parseInt(n, 10));
  const today = todayKey(now);

  if (r.repeat === 'daily') {
    if (r.lastFiredKey === today) return false;
    return now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm;
  }

  if (r.repeat === 'weekly') {
    if (r.lastFiredKey === today) return false;
    if (now.getDay() !== weekdayOfDate(r.date)) return false;
    return now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm;
  }

  // 'once' — fixed date & time. Catch-up window: fire if due within the last
  // 60 minutes (tab woke up late); older missed alarms are retired silently.
  if (r.lastFiredKey) return false;
  if (!r.date) return false;
  const due = new Date(`${r.date}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`);
  if (isNaN(due.getTime())) return false;
  const diffMs = now.getTime() - due.getTime();
  return diffMs >= 0 && diffMs <= 60 * 60 * 1000;
}

function weekdayOfDate(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00`);
  return isNaN(d.getTime()) ? -1 : d.getDay();
}

// ---- watcher (fires reminders while the app is open) ----

let watcherTimer: ReturnType<typeof setInterval> | null = null;

export function startStudyToolsWatcher(onDue: (r: StudyReminder) => void): () => void {
  if (watcherTimer) return () => {}; // singleton — one watcher per app

  const tick = () => {
    try {
      const list = getReminders();
      if (list.length === 0) return;
      const now = new Date();
      let changed = false;
      const firedToday: StudyReminder[] = [];
      for (const r of list) {
        if (isReminderDue(r, now)) {
          firedToday.push(r);
          const idx = list.indexOf(r);
          if (r.repeat === 'once') {
            list[idx] = { ...r, enabled: false, lastFiredKey: todayKey(now) };
          } else {
            list[idx] = { ...r, lastFiredKey: todayKey(now) };
          }
          changed = true;
        }
      }
      if (changed) saveReminders(list);
      for (const r of firedToday) {
        try { onDue(r); } catch { /* listener errors must not kill the watcher */ }
      }
    } catch { /* never let the watcher throw */ }
  };

  tick(); // immediate catch-up on mount
  watcherTimer = setInterval(tick, 20000);

  return () => {
    if (watcherTimer) {
      clearInterval(watcherTimer);
      watcherTimer = null;
    }
  };
}

// ---- local chime (WebAudio — no asset, no network) ----

export function playReminderChime() {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = [880, 1100, 1320];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    });
    setTimeout(() => { try { ctx.close(); } catch { /* noop */ } }, 900);
  } catch { /* audio blocked — silent fallback */ }
}

// ---- AI tag protocol: strip + execute ----

const REMINDER_TAG_RE = /\[\[THOTH_REMINDER::(\{[\s\S]*?\})\]\]/g;
const EVENT_TAG_RE = /\[\[THOTH_EVENT::(\{[\s\S]*?\})\]\]/g;

function safeParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    try { return JSON.parse(raw.replace(/'/g, '"')); } catch { return null; }
  }
}

/** Strips machine-only tool tags from a model reply and returns validated commands. */
export function extractStudyToolCommands(text: string): StudyToolCommands {
  const src = (text || '').toString();
  const reminders: StudyToolCommands['reminders'] = [];
  const events: StudyToolCommands['events'] = [];

  let clean = src.replace(REMINDER_TAG_RE, (_all, raw) => {
    const o = safeParse(raw);
    if (o && o.title) {
      const repeat = ['daily', 'weekly'].includes(String(o.repeat)) ? String(o.repeat) : 'once';
      const time = normalizeTime(o.time || '');
      const date = repeat === 'once' ? normalizeDate(o.date || '') : '';
      if (time) reminders.push({ title: String(o.title).slice(0, 120), date, time, repeat: repeat as any });
    }
    return '';
  });

  clean = clean.replace(EVENT_TAG_RE, (_all, raw) => {
    const o = safeParse(raw);
    if (o && o.title) {
      const date = normalizeDate(o.date || '');
      const time = normalizeTime(o.time || '');
      if (date) events.push({ title: String(o.title).slice(0, 120), date, time: time || undefined, note: o.note ? String(o.note).slice(0, 300) : undefined });
    }
    return '';
  });

  clean = clean.replace(/\n{3,}/g, '\n\n').trim();
  return { cleanText: clean, reminders, events };
}

/** Executes validated commands into the LOCAL store; returns chat confirmation lines. */
export function applyStudyToolCommands(cmds: StudyToolCommands, isAr: boolean): string[] {
  const lines: string[] = [];

  for (const r of cmds.reminders) {
    const res = addReminder(r);
    if (!res.ok) continue;
    const rep = isAr ? (r.repeat === 'daily' ? ' (يوميًا)' : r.repeat === 'weekly' ? ' (أسبوعيًا)' : '') : (r.repeat === 'daily' ? ' (daily)' : r.repeat === 'weekly' ? ' (weekly)' : '');
    const when = isAr ? (r.date ? ` يوم ${r.date}` : '') : (r.date ? ` on ${r.date}` : '');
    lines.push(isAr
      ? `⏰ **تم ضبط المنبه${res.duplicate ? ' (موجود بالفعل)' : ''}:** «${r.title}» — الساعة ${r.time}${when}${rep}`
      : `⏰ **Alarm set${res.duplicate ? ' (already exists)' : ''}:** "${r.title}" — at ${r.time}${when}${rep}`);
  }

  for (const e of cmds.events) {
    const res = addEvent(e);
    if (!res.ok) continue;
    const when = isAr ? ` يوم ${e.date}${e.time ? ` الساعة ${e.time}` : ''}` : ` on ${e.date}${e.time ? ` at ${e.time}` : ''}`;
    lines.push(isAr
      ? `📅 **تمت إضافة حدث للتقويم${res.duplicate ? ' (موجود بالفعل)' : ''}:** «${e.title}»${when}`
      : `📅 **Event added to calendar${res.duplicate ? ' (already exists)' : ''}:** "${e.title}"${when}`);
  }

  return lines;
}
