import React, { useState, useRef } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  Plus,
  Download,
  Upload,
  Sparkles,
  BookOpen,
  BarChart3,
  FileText,
  HelpCircle,
  CalendarDays,
  ListTree,
  Layers,
  Tag,
  X,
  Check,
} from 'lucide-react';
import { Course } from '../types';

interface HeaderProps {
  currentCourse: Course;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewCourse: () => void;
  onResetDemoData: () => void;
  onOpenGeminiModal?: () => void;
  onUpdateCourseTags?: (tags: string[]) => void;
  onExportWorkspace?: () => void;
  onImportWorkspace?: (data: any) => void;
  examDate: string;
  setExamDate: (d: string) => void;
  dailyHours: number;
  setDailyHours: (h: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentCourse,
  activeTab,
  setActiveTab,
  onOpenNewCourse,
  onOpenGeminiModal,
  onUpdateCourseTags,
  onExportWorkspace,
  onImportWorkspace,
  examDate,
  setExamDate,
  dailyHours,
  setDailyHours,
}) => {
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        onImportWorkspace?.(parsed);
      } catch {
        window.alert('Could not read workspace file. Please select a valid exported JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Calculate days until exam
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  const diffDays = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const navItems = [
    { id: 'priorities', label: 'Study Priorities', shortLabel: 'Priorities', icon: Sparkles },
    { id: 'flashcards', label: 'Flashcards', shortLabel: 'Flashcards', icon: Layers },
    { id: 'notes', label: 'Notes Analysis', shortLabel: 'Notes', icon: BookOpen },
    { id: 'analytics', label: 'Historical Analytics', shortLabel: 'Analytics', icon: BarChart3 },
    { id: 'papers', label: 'Exam Papers & OCR', shortLabel: 'Papers & OCR', icon: FileText },
    { id: 'questions', label: 'Questions Explorer', shortLabel: 'Questions', icon: HelpCircle },
    { id: 'syllabus', label: 'Syllabus Map', shortLabel: 'Syllabus', icon: ListTree },
    { id: 'revision', label: 'Revision Planner', shortLabel: 'Planner', icon: CalendarDays },
  ];

  const handleAddTag = (tagToAdd?: string) => {
    const raw = (tagToAdd || tagInput).trim();
    if (!raw) return;
    const currentTags = currentCourse.tags || [];
    if (!currentTags.some((t) => t.toLowerCase() === raw.toLowerCase())) {
      onUpdateCourseTags?.([...currentTags, raw]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = currentCourse.tags || [];
    onUpdateCourseTags?.(currentTags.filter((t) => t !== tagToRemove));
  };

  const presetTags = [
    'Mathematics',
    'Sciences',
    'Biology & Medicine',
    'Economics & Finance',
    'History & Humanities',
    'Law',
    'Engineering',
    'General Academic',
  ];

  return (
    <header className="border-b border-slate-200/90 bg-white sticky top-0 z-40 shadow-2xs">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Primary: Course / Subject Name, Brand Kicker & Tags */}
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0 aspect-square mt-0.5 sm:mt-0">
              <GraduationCap className="w-5 h-5 shrink-0 aspect-square" />
            </div>
            <div className="min-w-0 flex-1">
              {/* Subject Title, Code & Tags */}
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-snug">
                  {currentCourse.name}
                </h1>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded-md shrink-0">
                  {currentCourse.code}
                </span>

                {currentCourse.isDemo && (
                  <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/70 shrink-0">
                    Active Course
                  </span>
                )}
              </div>

              {/* App Kicker & Custom Tags */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 shrink-0">
                  Exam Intelligence Assistant
                </span>

                {/* Course Custom Tags */}
                {currentCourse.tags && currentCourse.tags.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {currentCourse.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.5 rounded border border-slate-200/80 shrink-0"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Edit Tags Button */}
                <button
                  type="button"
                  onClick={() => setIsTagsModalOpen(true)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200/80 inline-flex items-center gap-1 cursor-pointer shrink-0 transition-colors"
                  title="Edit custom tags to help the AI recognize your subject"
                >
                  <Tag className="w-2.5 h-2.5 shrink-0 aspect-square" />
                  <span>Tags</span>
                </button>
              </div>
            </div>
          </div>

          {/* Secondary Toolbar: Exam Date, Daily Study, AI & Course Actions */}
          <div className="flex items-center gap-2 text-xs flex-wrap sm:flex-nowrap shrink-0 justify-between lg:justify-end">
            {/* Exam Date Picker */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shrink-0">
              <Calendar className="w-3.5 h-3.5 shrink-0 aspect-square text-blue-600" />
              <div>
                <label htmlFor="exam-date-input" className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Exam Date</label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="exam-date-input"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="bg-transparent text-slate-900 font-medium text-[11px] sm:text-xs focus:outline-none cursor-pointer w-[90px] sm:w-auto"
                  />
                  <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 hidden sm:inline">
                    ({diffDays > 0 ? `${diffDays}d left` : 'Today'})
                  </span>
                </div>
              </div>
            </div>

            {/* Available Study Time */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shrink-0">
              <Clock className="w-3.5 h-3.5 shrink-0 aspect-square text-emerald-600" />
              <div>
                <label htmlFor="study-hours-select" className="text-slate-500 block text-[9px] uppercase font-bold tracking-wider">Daily Study</label>
                <select
                  id="study-hours-select"
                  value={dailyHours}
                  onChange={(e) => setDailyHours(parseFloat(e.target.value))}
                  className="bg-transparent text-slate-900 font-medium text-[11px] sm:text-xs focus:outline-none cursor-pointer"
                >
                  <option value={2}>2h / day</option>
                  <option value={3}>3h / day</option>
                  <option value={4}>4h / day</option>
                  <option value={6}>6h / day</option>
                  <option value={8}>8h / day</option>
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenGeminiModal && (
                <button
                  onClick={onOpenGeminiModal}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-2xs cursor-pointer h-[38px]"
                  title="Make flashcards, exam questions & cheat sheets with Gemini"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0 aspect-square text-indigo-200" />
                  <span className="hidden md:inline">Gemini AI</span>
                </button>
              )}
              <button
                onClick={onOpenNewCourse}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-xs font-semibold transition-colors cursor-pointer h-[38px]"
                title="Create a new course"
              >
                <Plus className="w-3.5 h-3.5 shrink-0 aspect-square text-slate-600" />
                <span className="hidden md:inline">New Course</span>
              </button>
              {onExportWorkspace && (
                <button
                  onClick={onExportWorkspace}
                  className="w-[38px] h-[38px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title="Export workspace to a JSON file"
                  aria-label="Export workspace"
                >
                  <Download className="w-3.5 h-3.5 shrink-0 aspect-square" />
                </button>
              )}
              {onImportWorkspace && (
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="w-[38px] h-[38px] rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title="Import a previously exported workspace JSON"
                  aria-label="Import workspace"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0 aspect-square" />
                </button>
              )}
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-50/80 border-t border-slate-200/80 px-2 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-around sm:justify-start gap-1 py-1 overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={item.label}
                aria-label={item.label}
                className={`flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 aspect-square ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="inline lg:hidden whitespace-nowrap text-[11px] sm:text-xs">{item.shortLabel}</span>
                <span className="hidden lg:inline whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Tags Modal */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 aspect-square">
                  <Tag className="w-4 h-4 shrink-0 aspect-square" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Custom Subject Tags</h3>
                  <p className="text-[11px] text-slate-500">Tailoring the AI focus to your subject</p>
                </div>
              </div>
              <button
                onClick={() => setIsTagsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4 shrink-0 aspect-square" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <span className="font-bold">How tags work:</span> The AI reads these tags to recognize your subject domain, tailoring all document breakdown, question formulation, flashcards, and rubrics strictly to your material.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Current Course Tags ({currentCourse.tags?.length || 0})
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[44px]">
                  {currentCourse.tags && currentCourse.tags.length > 0 ? (
                    currentCourse.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-indigo-700 border border-indigo-200 shadow-2xs"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                          title={`Remove tag ${tag}`}
                        >
                          <X className="w-3 h-3 shrink-0 aspect-square" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic py-1">No custom tags set yet.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Add New Custom Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="e.g. Mathematics, Biology, Finance, History..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag()}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Presets (Click to Add)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {presetTags.map((pTag, i) => {
                    const alreadyHas = currentCourse.tags?.some((t) => t.toLowerCase() === pTag.toLowerCase());
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleAddTag(pTag)}
                        disabled={alreadyHas}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-medium border transition-colors cursor-pointer ${
                          alreadyHas
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        + {pTag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsTagsModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
