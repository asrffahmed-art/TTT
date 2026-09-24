/**
 * [TASK 48] ResponseSteps — عرض خطوات تنفيذ الرد بالتسلسل
 *
 * بيظهر أثناء انتظار رد الـ AI: صندوق بخلفية فاتحة شفافة (gradient خفيف) فيه:
 *  - عنوان + مؤقّت يحسب وقت الرد (ثواني/دقايق)
 *  - الخطوات اللي بتتنفذ بالتسلسل (توليد صور، تلخيص صوتي، كتابة، تحليل مرفقات...)
 *  - كل خطوة بحالتها: pending (فاضية) / active (لودينج) / done (علامة صح ✓)
 *
 * ملاحظة مهمة: نظام البحث في الويب منفصل تماماً وليس له علاقة بالمكوّن ده —
 * البحث ليه واجهته الخاصة في Chat.tsx (searchSteps) زي ما هو بدون أي تغيير.
 *
 * التصميم كله CSS Module (أسفل الملف) — ألوان ثانوية هادية، RTL مصري، متجاوب.
 */
import { Loader2, Check, Image as ImageIcon, Volume2, Brain, Bot, GraduationCap, FileText, PenLine, Sparkles, Timer, Languages, Wand2, Zap } from 'lucide-react';
import styles from './ResponseSteps.module.css';

/** حالات الخطوة: منتظرة / شغالة دلوقتي / خلصت */
export type ResponseStepStatus = 'pending' | 'active' | 'done';

/** شكل الخطوة الواحدة */
export interface ResponseStep {
  key: string;
  /** نوع الأيقونة المعبرة عن الميزة */
  icon: 'sparkle' | 'file' | 'image' | 'audio' | 'write' | 'think' | 'agent' | 'learn' | 'translate' | 'enhance' | 'fast';
  label: string;
  /** سطر توضيحي اختياري بيظهر أثناء التنفيذ */
  sub?: string;
  status: ResponseStepStatus;
}

interface ResponseStepsProps {
  steps: ResponseStep[];
  /** الوقت المنقضي بالميلي ثانية — بيتحدث من Chat.tsx كل 100ms أثناء التحميل */
  elapsedMs: number;
  /** عنوان الصندوق */
  title?: string;
}

/** خريطة أسماء الأيقونات → مكوّن lucide */
const STEP_ICONS = {
  sparkle: Sparkles,
  file: FileText,
  image: ImageIcon,
  audio: Volume2,
  write: PenLine,
  think: Brain,
  agent: Bot,
  learn: GraduationCap,
  translate: Languages,
  enhance: Wand2,
  fast: Zap,
} as const;

/** تنسيق الوقت: أقل من دقيقة → «42 ث»، أكبر → «1:23 د» */
export function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${String(sec).padStart(2, '0')} د` : `${sec} ث`;
}

export default function ResponseSteps({ steps, elapsedMs, title }: ResponseStepsProps) {
  return (
    <div className={styles.box} role="status" aria-live="polite">
      {/* الشريط العلوي: عنوان + مؤقّت */}
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.titleDot} />
          <span>{title || 'THOTH بيشتغل على طلبك'}</span>
        </div>
        <div className={styles.timer}>
          <Timer className="w-3.5 h-3.5" />
          <span>{formatElapsed(elapsedMs)}</span>
        </div>
      </div>

      {/* الخطوات بالتسلسل */}
      <div className={styles.steps}>
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.icon] || Sparkles;
          return (
            <div
              key={step.key}
              className={`${styles.step} ${
                step.status === 'active' ? styles.stepActive : step.status === 'done' ? styles.stepDone : styles.stepPending
              }`}
            >
              {/* أيقونة الحالة: صح ✓ للخلص / سبينر للشغالة / أيقونة الميزة للمنتظرة */}
              <div
                className={`${styles.iconWrap} ${
                  step.status === 'active' ? styles.iconActive : step.status === 'done' ? styles.iconDone : styles.iconPending
                }`}
              >
                {step.status === 'done' ? (
                  <Check className="w-4 h-4" />
                ) : step.status === 'active' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <div className={styles.texts}>
                <span className={styles.label}>{step.label}</span>
                {/* السطر التوضيحي بيظهر فقط أثناء تنفيذ الخطوة عشان التركيز يبقى واضح */}
                {step.sub && step.status === 'active' && <span className={styles.sub}>{step.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
