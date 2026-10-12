import React, { useState } from 'react';
import {
  ListTree,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Tag,
  BookOpen,
} from 'lucide-react';
import { Syllabus, SyllabusTopic, SyllabusUnit, UserConfidence } from '../types';

interface SyllabusViewProps {
  syllabus: Syllabus;
  onUpdateSyllabus: (updated: Syllabus) => void;
}

export const SyllabusView: React.FC<SyllabusViewProps> = ({
  syllabus,
  onUpdateSyllabus,
}) => {
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicUnitId, setNewTopicUnitId] = useState(
    syllabus.units.length > 0 ? syllabus.units[0].id : ''
  );
  const [newTopicKeywords, setNewTopicKeywords] = useState('');
  const [showAddTopic, setShowAddTopic] = useState(false);

  const handleUpdateTopicConfidence = (topicId: string, confidence: UserConfidence) => {
    const updatedUnits = syllabus.units.map((u) => ({
      ...u,
      topics: u.topics.map((t) => (t.id === topicId ? { ...t, userConfidence: confidence } : t)),
    }));
    onUpdateSyllabus({ ...syllabus, units: updatedUnits });
  };

  const handleAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    const targetUnit = syllabus.units.find((u) => u.id === newTopicUnitId);
    if (!targetUnit) return;

    const newTopic: SyllabusTopic = {
      id: `topic-custom-${Date.now()}`,
      unitId: targetUnit.id,
      unitNumber: targetUnit.number,
      name: newTopicName.trim(),
      description: `Student defined syllabus topic for ${targetUnit.title}.`,
      keywords: newTopicKeywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean),
      synonyms: [],
      userConfidence: 'unrated',
    };

    const updatedUnits = syllabus.units.map((u) => {
      if (u.id === targetUnit.id) {
        return {
          ...u,
          topics: [...u.topics, newTopic],
        };
      }
      return u;
    });

    onUpdateSyllabus({ ...syllabus, units: updatedUnits });
    setNewTopicName('');
    setNewTopicKeywords('');
    setShowAddTopic(false);
  };

  const confidenceOptions: { val: UserConfidence; label: string; color: string }[] = [
    { val: 'weak', label: 'Weak (Needs Extra Practice)', color: 'bg-rose-100 text-rose-800' },
    { val: 'medium', label: 'Moderate Confidence', color: 'bg-amber-100 text-amber-800' },
    { val: 'strong', label: 'Strong / Mastered', color: 'bg-emerald-100 text-emerald-800' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ListTree className="w-5 h-5 text-indigo-600 shrink-0 aspect-square" />
            <span>Official Syllabus & Mastery Map</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hierarchy of course units and topics. Set your personal confidence levels to personalize your revision schedule.
          </p>
        </div>

        <button
          onClick={() => setShowAddTopic(!showAddTopic)}
          title="Add Custom Topic"
          aria-label="Add Custom Topic"
          className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 self-start sm:self-auto shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 shrink-0 aspect-square" />
          <span>Add Custom Topic</span>
        </button>
      </div>

      {/* Add Topic Collapsible Drawer */}
      {showAddTopic && (
        <form
          onSubmit={handleAddTopic}
          className="bg-indigo-50/50 border border-indigo-200 rounded-xl p-4 space-y-3 text-xs"
        >
          <h3 className="font-bold text-indigo-900">Add New Syllabus Topic</h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="target-syllabus-unit-select" className="font-semibold text-slate-700 block mb-1">Target Unit:</label>
              <select
                id="target-syllabus-unit-select"
                value={newTopicUnitId}
                onChange={(e) => setNewTopicUnitId(e.target.value)}
                className="w-full bg-white p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              >
                {syllabus.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    Unit {u.number}: {u.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="topic-name-input" className="font-semibold text-slate-700 block mb-1">Topic Name:</label>
              <input
                id="topic-name-input"
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="e.g. Inverting & Non-Inverting Op-Amp"
                className="w-full bg-white p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                required
              />
            </div>
            <div>
              <label htmlFor="keywords-input" className="font-semibold text-slate-700 block mb-1">Keywords (comma separated):</label>
              <input
                id="keywords-input"
                type="text"
                value={newTopicKeywords}
                onChange={(e) => setNewTopicKeywords(e.target.value)}
                placeholder="op-amp, closed loop gain, virtual ground"
                className="w-full bg-white p-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowAddTopic(false)}
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xs"
            >
              Add Topic
            </button>
          </div>
        </form>
      )}

      {/* Units & Topics Hierarchy */}
      <div className="space-y-4">
        {syllabus.units.map((unit) => (
          <div
            key={unit.id}
            className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs"
          >
            {/* Unit Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                  Unit {unit.number}
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  {unit.title}
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                {unit.topics.length} Topics
              </span>
            </div>

            {/* Topics in Unit */}
            <div className="p-4 sm:p-5 divide-y divide-slate-100 space-y-4">
              {unit.topics.map((topic) => (
                <div
                  key={topic.id}
                  className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 max-w-xl">
                    <h4 className="font-bold text-slate-900 text-sm">
                      {topic.name}
                    </h4>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {topic.description}
                    </p>

                    {/* Keywords tags */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Tag className="w-3 h-3 text-slate-400 shrink-0 aspect-square" />
                      {topic.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Student Confidence Level Selector */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-right sm:shrink-0">
                    <label htmlFor={`confidence-select-${topic.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      My Confidence:
                    </label>
                    <select
                      id={`confidence-select-${topic.id}`}
                      value={topic.userConfidence}
                      onChange={(e) =>
                        handleUpdateTopicConfidence(topic.id, e.target.value as UserConfidence)
                      }
                      className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-medium text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                    >
                      <option value="unrated">Unrated</option>
                      <option value="weak">⚠️ Weak (Boosts revision)</option>
                      <option value="medium">Moderate Confidence</option>
                      <option value="strong">✅ Strong / Mastered</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
