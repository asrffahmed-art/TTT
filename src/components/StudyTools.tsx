// THOTH Study Tools — local per-user alarms/reminders + study calendar.
// Owner directive: fully LOCAL (localStorage only) — no server, no Firestore.
// Merged (owner directive) into the Tasks page (GoogleTasks) as two embedded
// sections: المنبه (AlarmsView) and التقويم (CalendarView) — the standalone
// tab is gone; the local alarm watcher in App.tsx keeps running app-wide.

import { useState, useEffect } from 'react';
import { AlarmClock, CalendarDays, Plus, Trash2, ChevronRight, ChevronLeft, Repeat2, BellRing, CalendarPlus, CheckCircle2, Circle } from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import { useAppTheme } from '../lib/themeService';
import {
  StudyReminder, StudyEvent,
  getReminders, getEvents,
  addReminder, deleteReminder, toggleReminder,
  addEvent, deleteEvent
} from '../lib/studyToolsService';
import type { TaskItem } from './GoogleTasks';

const WEEKDAYS_AR = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function fmtDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ============================================================
// المنبه — alarms / reminders section (embedded in Tasks page)
// ============================================================
export function AlarmsView() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [rTitle, setRTitle] = useState('');
  const [rTime, setRTime] = useState('');
  const [rDate, setRDate] = useState('');
  const [rRepeat, setRRepeat] = useState<'once' | 'daily' | 'weekly'>('once');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setReminders(getReminders());
  }, []);

  const handleAddReminder = () => {
    setFormError('');
    if (!rTitle.trim() || !rTime) {
      setFormError(isAr ? 'اكتب عنوان التذكير وحدد الوقت أولًا.' : 'Enter a title and a time first.');
      return;
    }
    if ((rRepeat === 'once' || rRepeat === 'weekly') && !rDate) {
      setFormError(isAr ? 'حدد اليوم المطلوب.' : 'Pick a date.');
      return;
    }
    const res = addReminder({ title: rTitle, time: rTime, date: rDate, repeat: rRepeat });
    if (!res.ok) {
      setFormError(isAr ? 'تعذر الحفظ — تأكد من البيانات.' : 'Could not save — check the fields.');
      return;
    }
    setReminders(getReminders());
    setRTitle(''); setRTime(''); setRDate('');
  };

  const handleDeleteReminder = (id: string) => {
    deleteReminder(id);
    setReminders(getReminders());
  };

  const handleToggleReminder = (id: string) => {
    toggleReminder(id);
    setReminders(getReminders());
  };

  const dailyReminders = reminders.filter(r => r.repeat !== 'once');

  const repeatBadge = (r: StudyReminder) => {
    if (r.repeat === 'daily') return isAr ? 'يوميًا' : 'Daily';
    if (r.repeat === 'weekly') return isAr ? 'أسبوعيًا' : 'Weekly';
    return r.date || (isAr ? 'مرة واحدة' : 'Once');
  };

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Add alarm form */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white/70">
          <Plus className="w-4 h-4" />
          <span>{isAr ? 'منبه أو تذكير جديد' : 'New alarm / reminder'}</span>
        </div>
        <input
          type="text"
          value={rTitle}
          onChange={(e) => setRTitle(e.target.value)}
          placeholder={isAr ? 'مثال: مراجعة الفيزياء — الفصل الثالث' : 'e.g. Physics revision — chapter 3'}
          className="w-full bg-black/30 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-pink-500"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold text-white/50 block mb-1">{isAr ? 'الوقت' : 'Time'}</label>
            <input
              type="time"
              value={rTime}
              onChange={(e) => setRTime(e.target.value)}
              className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/50 block mb-1">{isAr ? 'اليوم (للمرة واحدة/الأسبوعي)' : 'Date (once/weekly)'}</label>
            <input
              type="date"
              value={rDate}
              onChange={(e) => setRDate(e.target.value)}
              className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-white/50 block mb-1">{isAr ? 'التكرار' : 'Repeat'}</label>
            <select
              value={rRepeat}
              onChange={(e) => setRRepeat(e.target.value as any)}
              className="w-full bg-[#141824] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-pink-500 cursor-pointer"
            >
              <option value="once">{isAr ? 'مرة واحدة' : 'Once'}</option>
              <option value="daily">{isAr ? 'يوميًا' : 'Daily'}</option>
              <option value="weekly">{isAr ? 'أسبوعيًا' : 'Weekly'}</option>
            </select>
          </div>
        </div>
        {formError && <p className="text-[11px] text-pink-400 font-bold">{formError}</p>}
        <button
          onClick={handleAddReminder}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
        >
          <BellRing className="w-4 h-4" />
          <span>{isAr ? 'ضبط المنبه' : 'Set alarm'}</span>
        </button>
      </div>

      {/* Alarms list */}
      {reminders.length === 0 ? (
        <div className="text-center py-10 text-white/40 text-xs">
          {isAr ? 'لا توجد منبهات بعد — ضبط أول منبه لدراستك من الفوق ⏰' : 'No alarms yet — set your first study alarm above ⏰'}
        </div>
      ) : (
        <div className="space-y-2">
          {[...reminders]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((r) => (
              <div key={r.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${r.enabled ? 'bg-white/5 border-white/10' : 'bg-black/20 border-white/5 opacity-50'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${r.enabled ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' : 'bg-white/5 text-white/30 border-white/10'}`}>
                  <AlarmClock className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-sm font-black text-white/90">{r.time}</span>
                    <span className="text-[10px] font-bold text-purple-300 bg-purple-500/15 border border-purple-500/25 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <Repeat2 className="w-3 h-3" />
                      {repeatBadge(r)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleReminder(r.id)}
                  dir="ltr"
                  className={`w-11 h-6 rounded-full relative transition-colors shrink-0 cursor-pointer ${r.enabled ? 'bg-pink-500' : 'bg-white/15'}`}
                  aria-label="toggle"
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${r.enabled ? 'translate-x-[22px]' : ''}`} />
                </button>
                <button
                  onClick={() => handleDeleteReminder(r.id)}
                  className="p-2 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
                  aria-label="delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
        </div>
      )}

      {reminders.length > 0 && (
        <p className="text-[11px] text-white/40 text-center">
          {isAr
            ? 'المنبهات بتشتغل وطبعًا التطبيق مفتوح — بتظهر كإشعار مع صوت جرس 🔔'
            : 'Alarms fire while the app is open — they show as a toast + system notification 🔔'}
        </p>
      )}
    </div>
  );
}

// ============================================================
// التقويم — study calendar section (embedded in Tasks page).
// Bonus integration: days also show tasks with a due date that
// day (from the Tasks section, passed down read-only).
// ============================================================
export function CalendarView({ tasks, onToggleTask }: { tasks?: TaskItem[]; onToggleTask?: (task: TaskItem) => void }) {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const theme = useAppTheme();

  const [reminders, setReminders] = useState<StudyReminder[]>([]);
  const [events, setEvents] = useState<StudyEvent[]>([]);
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [selectedDay, setSelectedDay] = useState<string>(() => fmtDateKey(new Date()));
  const [eTitle, setETitle] = useState('');
  const [eTime, setETime] = useState('');
  const [eNote, setENote] = useState('');
  const [eFormError, setEFormError] = useState('');

  useEffect(() => {
    setReminders(getReminders());
    setEvents(getEvents());
  }, []);

  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const leadingBlanks = monthCursor.getDay(); // Sunday=0 week start (Egypt)
  const todayKey = fmtDateKey(new Date());

  const eventsOn = (key: string) => events.filter(e => e.date === key);
  const onceRemindersOn = (key: string) => reminders.filter(r => r.repeat === 'once' && r.date === key);
  // Tasks with a due date on that day — due is stored as ISO; the first 10
  // chars are exactly the YYYY-MM-DD the user picked (UTC midnight).
  const tasksOn = (key: string) => (tasks || []).filter(t => (t.due || '').slice(0, 10) === key);
  const hasMark = (key: string) => eventsOn(key).length > 0 || onceRemindersOn(key).length > 0;
  const hasTaskMark = (key: string) => tasksOn(key).length > 0;

  const shiftMonth = (delta: number) => {
    setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + delta, 1));
  };

  const handleAddEvent = () => {
    setEFormError('');
    if (!eTitle.trim()) {
      setEFormError(isAr ? 'اكتب عنوان الحدث أولًا.' : 'Enter an event title first.');
      return;
    }
    const res = addEvent({ title: eTitle, date: selectedDay, time: eTime, note: eNote });
    if (!res.ok) {
      setEFormError(isAr ? 'تعذر الحفظ — تأكد من البيانات.' : 'Could not save — check the fields.');
      return;
    }
    setEvents(getEvents());
    setETitle(''); setETime(''); setENote('');
  };

  const selectedEvents = eventsOn(selectedDay);
  const selectedOnceReminders = onceRemindersOn(selectedDay);
  const selectedTasks = tasksOn(selectedDay);

  return (
    <div className="space-y-4" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Month calendar */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer" aria-label="prev month">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-sm font-black text-white">
            {isAr ? MONTHS_AR[monthCursor.getMonth()] : MONTHS_EN[monthCursor.getMonth()]} {monthCursor.getFullYear()}
          </span>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg hover:bg-white/10 text-white/60 cursor-pointer" aria-label="next month">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {(isAr ? WEEKDAYS_AR : WEEKDAYS_EN).map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-white/40 py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: leadingBlanks }).map((_, i) => (
            <div key={`b${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const key = fmtDateKey(new Date(monthCursor.getFullYear(), monthCursor.getMonth(), dayNum));
            const isToday = key === todayKey;
            const isSelected = key === selectedDay;
            const marked = hasMark(key);
            const taskMarked = hasTaskMark(key);
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                className={`aspect-square rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white shadow-lg'
                    : isToday
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'text-white/70 hover:bg-white/5'
                }`}
              >
                <span>{dayNum}</span>
                {(marked || taskMarked) && (
                  <span className="flex items-center gap-0.5">
                    {marked && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/90' : 'bg-pink-400'}`} />}
                    {taskMarked && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : theme.textAccent}`} />}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        {(events.length > 0 || reminders.some(r => r.repeat === 'once') || (tasks || []).some(t => t.due)) && (
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-white/40 font-bold">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-pink-400" />{isAr ? 'منبهات وأحداث' : 'Alarms & events'}</span>
            <span className="flex items-center gap-1.5"><span className={`w-1.5 h-1.5 rounded-full ${theme.textAccent}`} />{isAr ? 'مهام مستحقة' : 'Tasks due'}</span>
          </div>
        )}
      </div>

      {/* Selected day details */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-white">
            {isAr ? 'يوم' : 'On'} {selectedDay}
          </h3>
          <span className="text-[10px] text-white/40">{selectedEvents.length + selectedOnceReminders.length + selectedTasks.length}</span>
        </div>

        {selectedEvents.length === 0 && selectedOnceReminders.length === 0 && selectedTasks.length === 0 && (
          <p className="text-[11px] text-white/40">{isAr ? 'مفيش أحداث في اليوم ده — ضيف واحد من الفوق 👇' : 'Nothing scheduled — add one below 👇'}</p>
        )}

        {selectedEvents.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{e.title}{e.time ? ` — ${e.time}` : ''}</p>
              {e.note && <p className="text-[10px] text-white/50 truncate">{e.note}</p>}
            </div>
            <button
              onClick={() => { deleteEvent(e.id); setEvents(getEvents()); }}
              className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
              aria-label="delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {selectedOnceReminders.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
            <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center shrink-0">
              <AlarmClock className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">{r.title}{r.time ? ` — ${r.time}` : ''}</p>
              <p className="text-[10px] text-white/50">{isAr ? 'منبه' : 'Alarm'}</p>
            </div>
            <button
              onClick={() => { deleteReminder(r.id); setReminders(getReminders()); }}
              className="p-1.5 text-white/30 hover:text-red-400 rounded-lg hover:bg-white/5 cursor-pointer shrink-0"
              aria-label="delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {selectedTasks.map((t) => (
          <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${t.status === 'completed' ? 'bg-white/5 border-white/5 opacity-60' : 'bg-white/[0.07] border-white/15'}`}>
            <button
              onClick={() => onToggleTask?.(t)}
              className="shrink-0 transition-transform active:scale-90 cursor-pointer"
              title={t.status === 'completed' ? (isAr ? 'تحديد كغير مكتملة' : 'Mark as incomplete') : (isAr ? 'تحديد كمكتملة' : 'Mark as completed')}
            >
              {t.status === 'completed' ? (
                <CheckCircle2 className={`w-5 h-5 ${theme.textAccent}`} />
              ) : (
                <Circle className="w-5 h-5 text-white/40" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold truncate ${t.status === 'completed' ? 'line-through text-white/40' : 'text-white'}`}>{t.title}</p>
              <p className="text-[10px] text-white/50">{isAr ? 'مهمة مستحقة اليوم' : 'Task due'}</p>
            </div>
          </div>
        ))}

        {/* Add event form */}
        <div className="pt-2 border-t border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-white/60">
            <CalendarPlus className="w-3.5 h-3.5" />
            <span>{isAr ? 'إضافة حدث لليوم المحدد' : 'Add event to selected day'}</span>
          </div>
          <input
            type="text"
            value={eTitle}
            onChange={(e) => setETitle(e.target.value)}
            placeholder={isAr ? 'مثال: امتحان الرياضيات' : 'e.g. Math exam'}
            className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={eTime}
              onChange={(e) => setETime(e.target.value)}
              className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
            />
            <input
              type="text"
              value={eNote}
              onChange={(e) => setENote(e.target.value)}
              placeholder={isAr ? 'ملاحظة (اختياري)' : 'Note (optional)'}
              className="w-full bg-black/30 border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500"
            />
          </div>
          {eFormError && <p className="text-[11px] text-pink-400 font-bold">{eFormError}</p>}
          <button
            onClick={handleAddEvent}
            className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'إضافة للتقويم' : 'Add to calendar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
