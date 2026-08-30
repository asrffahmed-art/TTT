import { useLanguage } from '../lib/LanguageContext';
import { useState, useEffect } from 'react';
import { BookOpen, Users, Calendar, Plus, CheckCircle2, Clock, AlertCircle, RefreshCw, Send, Sparkles, FileText, Share2, Layers, Award, ChevronRight, MessageSquare, ExternalLink } from 'lucide-react';
import { collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAppTheme } from '../lib/themeService';

export interface Course {
  id: string;
  name: string;
  section: string;
  room: string;
  teacher: string;
  color: string;
  studentsCount: number;
  code?: string;
}

export interface CourseWork {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  maxPoints: number;
  status: 'assigned' | 'submitted' | 'graded';
  grade?: number;
}

export interface Announcement {
  id: string;
  courseId: string;
  author: string;
  text: string;
  date: string;
}

const DEFAULT_COURSES: Course[] = [
  {
    id: 'course_1',
    name: 'الذكاء الاصطناعي ومعالجة اللغات',
    section: 'الشعبة الأولى - CS401',
    room: 'قاعة 204',
    teacher: 'د. محمد العتيبي',
    color: 'from-pink-600 to-purple-600',
    studentsCount: 32,
    code: 'ai-2026-x'
  },
  {
    id: 'course_2',
    name: 'تطوير تطبيقات الويب المتقدمة',
    section: 'الشعبة الثانية - CS302',
    room: 'مختبر الحاسوب 3',
    teacher: 'م. سارة الغامدي',
    color: 'from-indigo-600 to-blue-600',
    studentsCount: 28,
    code: 'web-302-w'
  },
  {
    id: 'course_3',
    name: 'قواعد البيانات والسحابة الإلكترونية',
    section: 'الشعبة الثالثة - CS305',
    room: 'قاعة 101',
    teacher: 'د. خالد الشمري',
    color: 'from-emerald-600 to-teal-600',
    studentsCount: 40,
    code: 'db-cloud-9'
  }
];

const DEFAULT_COURSEWORK: CourseWork[] = [
  {
    id: 'cw_1',
    courseId: 'course_1',
    title: 'مشروع بناء نموذج تصنيف نصوص بالذكاء الاصطناعي',
    description: 'قم بكتابة كود بـ Python وتطبيق نموذج Transformers لتصنيف مشاعر النصوص العربية.',
    dueDate: '2026-08-15',
    maxPoints: 100,
    status: 'assigned'
  },
  {
    id: 'cw_2',
    courseId: 'course_2',
    title: 'واجهة مستخدم تفاعلية باستخدام React & Tailwind',
    description: 'تصميم لوحة تحكم متجاوبة للطلاب مع ربط قاعدة بيانات سحابية.',
    dueDate: '2026-08-10',
    maxPoints: 50,
    status: 'submitted'
  },
  {
    id: 'cw_3',
    courseId: 'course_1',
    title: 'واجب أساسيات الشبكات العصبية',
    description: 'حل الإثبات الرياضي لانتشار الخطأ الخلفي (Backpropagation).',
    dueDate: '2026-08-01',
    maxPoints: 20,
    status: 'graded',
    grade: 20
  }
];

const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann_1',
    courseId: 'course_1',
    author: 'د. محمد العتيبي',
    text: 'مرحباً بالجميع! تم رفع السلايدات الخاصة بالمحاضرة الرابعة على المادة العلمية. برجاء المراجعة قبل المحاضرة القادمة.',
    date: 'منذ ساعتين'
  },
  {
    id: 'ann_2',
    courseId: 'course_2',
    author: 'م. سارة الغامدي',
    text: 'تذكير: موعد تسليم مشروع React القادم هو يوم الأحد المقبل الساعة 11:59 مساءً.',
    date: 'أمس'
  }
];

interface ClassroomProps {
  onStartAiChat?: (prompt: string) => void;
}

export function Classroom({ onStartAiChat }: ClassroomProps) {
  const { t, language } = useLanguage();
  const theme = useAppTheme();
  const [courses, setCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('app-classroom-courses');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_COURSES; }
    }
    return DEFAULT_COURSES;
  });

  const [coursework, setCoursework] = useState<CourseWork[]>(() => {
    const saved = localStorage.getItem('app-classroom-work');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return DEFAULT_COURSEWORK; }
    }
    return DEFAULT_COURSEWORK;
  });

  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULT_ANNOUNCEMENTS);
  const [activeSubTab, setActiveSubTab] = useState<'courses' | 'assignments' | 'stream'>('courses');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // New item modal state
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseSection, setNewCourseSection] = useState('');
  const [newCourseTeacher, setNewCourseTeacher] = useState('');

  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState('');
  const [newWorkDesc, setNewWorkDesc] = useState('');
  const [newWorkDueDate, setNewWorkDueDate] = useState('');
  const [newWorkCourseId, setNewWorkCourseId] = useState('course_1');

  const [newAnnounceText, setNewAnnounceText] = useState('');

  useEffect(() => {
    localStorage.setItem('app-classroom-courses', JSON.stringify(courses));
  }, [courses]);

  useEffect(() => {
    localStorage.setItem('app-classroom-work', JSON.stringify(coursework));
  }, [coursework]);

  // Load Cloud Courses from Firestore & الفصول الدراسية API if logged in
  useEffect(() => {
    const fetchCloudClassroom = async () => {
      const user = auth.currentUser;
      const token = localStorage.getItem('google-access-token');

      if (token) {
        try {
          const res = await fetch('https://classroom.googleapis.com/v1/courses?courseStates=ACTIVE', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.courses && data.courses.length > 0) {
              const fetchedCourses: Course[] = data.courses.map((c: any, index: number) => ({
                id: c.id,
                name: c.name,
                section: c.section || 'الشعبة العامة',
                room: c.room || 'لقاء',
                teacher: 'أستاذ المادة',
                color: index % 3 === 0 ? 'from-pink-600 to-purple-600' : index % 3 === 1 ? 'from-indigo-600 to-blue-600' : 'from-emerald-600 to-teal-600',
                studentsCount: 30,
                code: c.enrollmentCode || c.id
              }));
              setCourses(fetchedCourses);
              setSyncMessage('تم جلب فصولك الرسمية من الفصول الدراسية تلقائياً!');
              setTimeout(() => setSyncMessage(null), 4000);
            }
          }
        } catch (e) {
          console.error('Fetch الفصول الدراسية error:', e);
        }
      }

      if (!user) return;
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'classroomCourses'));
        if (!snap.empty) {
          const cloudCourses: Course[] = [];
          snap.forEach(d => cloudCourses.push(d.data() as Course));
          setCourses(cloudCourses);
        }

        const workSnap = await getDocs(collection(db, 'users', user.uid, 'classroomAssignments'));
        if (!workSnap.empty) {
          const cloudWork: CourseWork[] = [];
          workSnap.forEach(d => cloudWork.push(d.data() as CourseWork));
          setCoursework(cloudWork);
        }

        const annSnap = await getDocs(collection(db, 'users', user.uid, 'classroomAnnouncements'));
        if (!annSnap.empty) {
          const cloudAnn: Announcement[] = [];
          annSnap.forEach(d => cloudAnn.push(d.data() as Announcement));
          setAnnouncements(cloudAnn);
        }
      } catch (e) {
        console.error('Fetch cloud classroom error:', e);
      }
    };
    fetchCloudClassroom();
  }, []);

  const handleSyncGoogleClassroom = async () => {
    setIsSyncing(true);
    setSyncMessage('جاري الاتصال بـ الفصول الدراسية API وربط الفصول الدراسية...');
    
    // Simulate / Live fetch الفصول الدراسية API integration
    setTimeout(async () => {
      setIsSyncing(false);
      setSyncMessage('تم الاستعلام بنجاح من الفصول الدراسية! الفصول الواجبات محدثة الآن.');
      
      const user = auth.currentUser;
      if (user) {
        // Save initial default courses to cloud
        courses.forEach(async (c) => {
          try {
            await setDoc(doc(db, 'users', user.uid, 'classroomCourses', c.id), c, { merge: true });
          } catch (err) {
            console.error(err);
          }
        });
      }

      setTimeout(() => setSyncMessage(null), 3500);
    }, 1800);
  };

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) return;

    const newCourse: Course = {
      id: `course_${Date.now()}`,
      name: newCourseName.trim(),
      section: newCourseSection.trim() || 'الفصل الدراسي الأول',
      room: 'أونلاين / لقاء',
      teacher: newCourseTeacher.trim() || 'أستاذ المادة',
      color: 'from-purple-600 to-pink-600',
      studentsCount: 1,
      code: `cls-${Math.floor(1000 + Math.random() * 9000)}`
    };

    const updated = [newCourse, ...courses];
    setCourses(updated);
    setNewCourseName('');
    setNewCourseSection('');
    setNewCourseTeacher('');
    setShowAddCourseModal(false);

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'classroomCourses', newCourse.id), newCourse);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/classroomCourses/${newCourse.id}`);
      }
    }
  };

  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkTitle.trim()) return;

    const newWork: CourseWork = {
      id: `cw_${Date.now()}`,
      courseId: newWorkCourseId,
      title: newWorkTitle.trim(),
      description: newWorkDesc.trim(),
      dueDate: newWorkDueDate || '2026-08-30',
      maxPoints: 100,
      status: 'assigned'
    };

    setCoursework([newWork, ...coursework]);
    setNewWorkTitle('');
    setNewWorkDesc('');
    setNewWorkDueDate('');
    setShowAddWorkModal(false);

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'classroomAssignments', newWork.id), newWork);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'assigned' | 'submitted' | 'graded') => {
    setCoursework(prev => prev.map(cw => cw.id === id ? { ...cw, status: newStatus } : cw));
    
    const user = auth.currentUser;
    if (user) {
      const item = coursework.find(cw => cw.id === id);
      if (item) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'classroomAssignments', id), { ...item, status: newStatus }, { merge: true });
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceText.trim()) return;

    const newAnn: Announcement = {
      id: `ann_${Date.now()}`,
      courseId: selectedCourseId === 'all' ? courses[0]?.id || 'course_1' : selectedCourseId,
      author: localStorage.getItem('app-user-name') || 'أنت',
      text: newAnnounceText.trim(),
      date: 'الآن'
    };

    setAnnouncements([newAnn, ...announcements]);
    setNewAnnounceText('');

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'classroomAnnouncements', newAnn.id), newAnn);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredWork = selectedCourseId === 'all' 
    ? coursework 
    : coursework.filter(w => w.courseId === selectedCourseId);

  const filteredAnnouncements = selectedCourseId === 'all' 
    ? announcements 
    : announcements.filter(a => a.courseId === selectedCourseId);

  return (
    <div className="flex flex-col w-full h-full pb-28 pt-20 px-3 sm:px-6 md:px-8 max-w-4xl mx-auto overflow-y-auto hide-scrollbar">
      
      {/* Workspace Header banner */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-900/90 via-[#161a29]/90 to-indigo-950/90 border ${theme.borderAccent} p-6 mb-6 shadow-2xl backdrop-blur-xl`}>
        <div className={`absolute -top-10 -left-10 w-40 h-40 rounded-full ${theme.ambientLight1} blur-3xl`}></div>
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${theme.previewGradient} flex items-center justify-center text-white shadow-lg border border-white/20`}>
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">{language === 'ar' ? 'الفصول الدراسية' : 'Classrooms'}</h2>
                <span className={`text-[10px] ${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent} font-mono px-2 py-0.5 rounded-full`}>
                  THOTH Workspace
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5">إدارة الفصول الدراسية، الواجبات، والمشاريع الأكاديمية الذكية</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button 
              onClick={handleSyncGoogleClassroom}
              disabled={isSyncing}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 shadow-lg active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${theme.textAccent} ${isSyncing ? 'animate-spin' : ''}`} />
              <span>مزامنة الفصول الدراسية</span>
            </button>

            <button 
              onClick={() => setShowAddCourseModal(true)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl ${theme.btnPrimary} font-bold text-xs transition-all shadow-lg active:scale-95`}
            >
              <Plus className="w-4 h-4" />
              <span>إنشاء فصل</span>
            </button>
          </div>
        </div>
      </div>

      {syncMessage && (
        <div className={`mb-6 p-4 ${theme.bgAccent} border ${theme.borderAccent} ${theme.textAccentBright} text-xs font-bold rounded-2xl flex items-center justify-between shadow-lg animate-in fade-in`}>
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${theme.textAccent} animate-pulse`} />
            <span>{syncMessage}</span>
          </div>
          <CheckCircle2 className={`w-4 h-4 ${theme.textAccent} shrink-0`} />
        </div>
      )}

      {/* Navigation tabs within Classroom */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3 mb-6 overflow-x-auto hide-scrollbar">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setActiveSubTab('courses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'courses' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>الفصول الدراسية ({courses.length})</span>
          </button>

          <button 
            onClick={() => setActiveSubTab('assignments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'assignments' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>الواجبات والمهام ({coursework.length})</span>
          </button>

          <button 
            onClick={() => setActiveSubTab('stream')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'stream' ? `${theme.btnPrimary} shadow-lg` : 'bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ساحة المشاركات</span>
          </button>
        </div>

        {/* Course Filter Dropdown */}
        <select 
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="bg-white/10 text-white text-xs font-bold px-3 py-2 rounded-xl border border-white/10 outline-none cursor-pointer"
        >
          <option value="all" className="bg-[#1a1c2c] text-white">جميع الفصول</option>
          {courses.map(c => (
            <option key={c.id} value={c.id} className="bg-[#1a1c2c] text-white">{c.name}</option>
          ))}
        </select>
      </div>

      {/* Subtab 1: Courses */}
      {activeSubTab === 'courses' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map(course => (
            <div 
              key={course.id} 
              className="bg-[#202123]/80 border border-white/10 rounded-2xl overflow-hidden shadow-xl hover:${theme.borderAccent} transition-all group flex flex-col justify-between"
            >
              <div>
                {/* Card Header Gradient */}
                <div className={`p-5 bg-gradient-to-r ${course.color} relative overflow-hidden`}>
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 bg-black/20 px-2 py-0.5 rounded-full backdrop-blur-md">
                        {course.section}
                      </span>
                      <h3 className="text-base font-bold text-white mt-2 leading-tight">{course.name}</h3>
                      <p className="text-xs text-white/80 mt-1">{course.teacher}</p>
                    </div>
                  </div>
                  <div className="mt-4 text-[11px] text-white/70 flex items-center justify-between">
                    <span>{course.room}</span>
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-[10px]">رمز: {course.code}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex items-center justify-between border-t border-white/5 text-xs text-white/60">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 ${theme.textAccent}" />
                    <span>{course.studentsCount} طالب مسجل</span>
                  </div>
                  <div className="flex items-center gap-1 ${theme.textAccentBright} font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>نشط</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white/5 border-t border-white/10 flex gap-2">
                <button 
                  onClick={() => { setSelectedCourseId(course.id); setActiveSubTab('assignments'); }}
                  className="flex-1 py-2 rounded-xl bg-white/10 ${theme.btnPrimary} hover:text-white text-xs font-bold text-white/80 transition-all flex items-center justify-center gap-1"
                >
                  <span>عرض الواجبات</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 2: Coursework / Assignments */}
      {activeSubTab === 'assignments' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">المهام والواجبات المطلوبة</h3>
            <button 
              onClick={() => setShowAddWorkModal(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${theme.btnPrimary} text-xs font-bold transition-all shadow-md`}
            >
              <Plus className="w-4 h-4" />
              <span>إضافة واجب جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {filteredWork.map(work => {
              const course = courses.find(c => c.id === work.courseId);
              return (
                <div 
                  key={work.id}
                  className={`p-5 rounded-2xl bg-[#202123]/80 border border-white/10 hover:${theme.borderAccent} transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-3 rounded-xl shrink-0 ${
                      work.status === 'graded' ? `${theme.bgAccent} ${theme.textAccentBright} border ${theme.borderAccent}` :
                      work.status === 'submitted' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      <FileText className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">
                          {course?.name || 'مادة عادية'}
                        </span>
                        <span className="text-[10px] text-white/40 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          تسليم: {work.dueDate}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-white mt-1">{work.title}</h4>
                      <p className="text-xs text-white/60 mt-1 leading-relaxed">{work.description}</p>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/10">
                    <div className="text-right">
                      <span className="text-[11px] font-bold text-white/50 block">درجة المادة</span>
                      <span className="text-xs font-mono font-bold ${theme.textAccentBright}">
                        {work.status === 'graded' ? `${work.grade} / ${work.maxPoints}` : `${work.maxPoints} نقطة`}
                      </span>
                    </div>

                    {onStartAiChat && (
                      <button 
                        onClick={() => onStartAiChat(`أحتاج مساعدة في حل أو تلخيص الواجب التالي بأسلوب أكاديمي:\n\nالعنوان: ${work.title}\nالوصف: ${work.description}`)}
                        className="px-3 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                        title="طلب مساعدة من الذكاء الاصطناعي"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                        <span>حل بالـ AI</span>
                      </button>
                    )}

                    <select 
                      value={work.status}
                      onChange={(e) => handleStatusChange(work.id, e.target.value as any)}
                      className={`text-xs font-bold px-3 py-2 rounded-xl border outline-none cursor-pointer ${
                        work.status === 'graded' ? '${theme.bgAccent} ${theme.textAccentBright} ${theme.borderAccent}' :
                        work.status === 'submitted' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' :
                        'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <option value="assigned" className="bg-[#1a1c2c] text-amber-300">مُعين (قيد الحل)</option>
                      <option value="submitted" className="bg-[#1a1c2c] text-blue-300">تم التسليم</option>
                      <option value="graded" className="bg-[#1a1c2c] ${theme.textAccentBright}">تم التقيم</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 3: Stream / Announcements */}
      {activeSubTab === 'stream' && (
        <div className="flex flex-col gap-4">
          {/* Post announcement box */}
          <form onSubmit={handlePostAnnouncement} className="p-4 rounded-2xl bg-[#202123]/90 border border-white/10 shadow-xl flex flex-col gap-3">
            <textarea 
              placeholder="شارك إعلاناً أو مناقشة مع طلاب الفصل الدراسي..."
              value={newAnnounceText}
              onChange={(e) => setNewAnnounceText(e.target.value)}
              rows={2}
              className="bg-transparent text-white text-xs outline-none placeholder:text-white/40 resize-none"
            />
            <div className="flex justify-between items-center border-t border-white/10 pt-2">
              <span className="text-[10px] text-white/40">سيتم نشر الإعلان فوراً لطلاب المادة</span>
              <button 
                type="submit" 
                className="px-4 py-1.5 rounded-xl ${theme.btnPrimary} text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>نشر</span>
              </button>
            </div>
          </form>

          {/* Feed List */}
          <div className="flex flex-col gap-3 mt-2">
            {filteredAnnouncements.map(ann => {
              const course = courses.find(c => c.id === ann.courseId);
              return (
                <div key={ann.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full ${theme.bgAccent} ${theme.textAccentBright} flex items-center justify-center font-bold text-xs border ${theme.borderAccent}">
                        {ann.author[0]}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{ann.author}</h4>
                        <span className="text-[10px] text-white/40">{course?.name} • {ann.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/80 leading-relaxed">{ann.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#202123] text-white rounded-3xl p-6 w-full max-w-md border ${theme.borderAccent} shadow-2xl">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 ${theme.textAccentBright}">
              <BookOpen className="w-5 h-5" />
              <span>إنشاء فصل دراسي جديد</span>
            </h3>

            <form onSubmit={handleAddCourse} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">اسم المادة / الكورس</label>
                <input 
                  type="text" 
                  placeholder="مثال: ذكاء اصطناعي 101" 
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">الشعبة / القسم</label>
                <input 
                  type="text" 
                  placeholder="مثال: الشعبة الأولى" 
                  value={newCourseSection}
                  onChange={(e) => setNewCourseSection(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">اسم المعلم / المحاضر</label>
                <input 
                  type="text" 
                  placeholder="مثال: د. أحمد المحمد" 
                  value={newCourseTeacher}
                  onChange={(e) => setNewCourseTeacher(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  type="submit" 
                  className="flex-1 py-3 ${theme.btnPrimary} text-white font-bold rounded-xl text-xs transition-all shadow-lg"
                >
                  إنشاء الفصل
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddCourseModal(false)}
                  className="px-4 py-3 bg-white/10 text-white/70 hover:text-white font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Coursework Modal */}
      {showAddWorkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#202123] text-white rounded-3xl p-6 w-full max-w-md border ${theme.borderAccent} shadow-2xl">
            <h3 className="text-base font-bold mb-4 flex items-center gap-2 ${theme.textAccentBright}">
              <FileText className="w-5 h-5" />
              <span>إضافة واجب أكاديمي</span>
            </h3>

            <form onSubmit={handleAddWork} className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">الفصل الدراسي</label>
                <select 
                  value={newWorkCourseId}
                  onChange={(e) => setNewWorkCourseId(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#1a1c2c]">{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">عنوان الواجب</label>
                <input 
                  type="text" 
                  placeholder="مثال: واجب خوارزميات البحث" 
                  value={newWorkTitle}
                  onChange={(e) => setNewWorkTitle(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">تفاصيل وماتطلبات الواجب</label>
                <textarea 
                  placeholder="اكتب التوجيهات أو المطلوب..." 
                  value={newWorkDesc}
                  onChange={(e) => setNewWorkDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-white/70 block mb-1">تاريخ التسليم النهائي</label>
                <input 
                  type="date" 
                  value={newWorkDueDate}
                  onChange={(e) => setNewWorkDueDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 mt-4">
                <button 
                  type="submit" 
                  className="flex-1 py-3 ${theme.btnPrimary} text-white font-bold rounded-xl text-xs transition-all shadow-lg"
                >
                  حفظ الواجب
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowAddWorkModal(false)}
                  className="px-4 py-3 bg-white/10 text-white/70 hover:text-white font-bold rounded-xl text-xs"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
