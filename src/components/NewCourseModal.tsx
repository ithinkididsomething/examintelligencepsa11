import React, { useState } from 'react';
import { X, BookOpen, Plus, Sparkles, RefreshCw } from 'lucide-react';
import { Course } from '../types';

interface NewCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCourse: (course: Course) => void;
  onLoadDemo: () => void;
}

export const NewCourseModal: React.FC<NewCourseModalProps> = ({
  isOpen,
  onClose,
  onCreateCourse,
  onLoadDemo,
}) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('Semester 3');
  const [examDate, setExamDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [hours, setHours] = useState(4);
  const [tagsInput, setTagsInput] = useState('General Academic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: name.trim(),
      code: code.trim() || 'EXAM-101',
      semester,
      examDate,
      availableStudyHoursPerDay: hours,
      isDemo: false,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    };

    onCreateCourse(newCourse);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200/90">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400 shrink-0 aspect-square" />
            <h2 className="text-base font-bold text-white">
              Create Course Workspace
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 shrink-0 aspect-square" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label htmlFor="new-course-title" className="font-bold text-slate-700 block mb-1">
              Course Title:
            </label>
            <input
              id="new-course-title"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms, Power Systems, Organic Chemistry"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="course-code-input" className="font-bold text-slate-700 block mb-1">
                Course Code:
              </label>
              <input
                id="course-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. MATH-201"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="course-semester-select" className="font-bold text-slate-700 block mb-1">
                Semester / Term:
              </label>
              <select
                id="course-semester-select"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
                <option value="Semester 4">Semester 4</option>
                <option value="Semester 5">Semester 5</option>
                <option value="Semester 6">Semester 6</option>
                <option value="Semester 7">Semester 7</option>
                <option value="Semester 8">Semester 8</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="new-course-tags" className="font-bold text-slate-700 block mb-1">
              Custom Tags / Subject Domain (comma-separated):
            </label>
            <input
              id="new-course-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="e.g. Mathematics, History, Finance, Biology, Law"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              AI automatically adapts to your custom tags and tailors all material to your subject.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="new-course-exam-date" className="font-bold text-slate-700 block mb-1">
                Target Exam Date:
              </label>
              <input
                id="new-course-exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="new-course-hours-select" className="font-bold text-slate-700 block mb-1">
                Daily Study Hours:
              </label>
              <select
                id="new-course-hours-select"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value={2}>2 Hours / Day</option>
                <option value={3}>3 Hours / Day</option>
                <option value={4}>4 Hours / Day</option>
                <option value={6}>6 Hours / Day</option>
                <option value={8}>8 Hours / Day</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                onLoadDemo();
                onClose();
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0 aspect-square" />
              <span>Clear Workspace</span>
            </button>

            <div className="flex space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold transition-colors shadow-xs"
              >
                Create Workspace
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
