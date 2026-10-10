import React from 'react';
import { Cpu, Database, Layers, Network, ShieldAlert, Users } from 'lucide-react';

const PILLAR_ICONS = [Network, Cpu, Database, Layers, ShieldAlert, Users];

export interface QuestionStepChoice {
  key: string | number;
  label_ar: string;
  text_ar: string;
}

interface QuestionStepProps {
  step: number;
  total: number;
  pillarName: string;
  pillarIndex: number;
  questionText: string;
  choices: QuestionStepChoice[];
  selected: string | number | undefined;
  onSelect: (key: string | number) => void;
}

/**
 * One question of the readiness questionnaire as a factory member answers it: progress, the
 * question and its choices as a radio group (nothing pre-selected). Shared by the factory's
 * assessment and the IMC preview, so the preview shows exactly what factories see.
 */
export const QuestionStep: React.FC<QuestionStepProps> = ({ step, total, pillarName, pillarIndex, questionText, choices, selected, onSelect }) => {
  const Icon = PILLAR_ICONS[pillarIndex % PILLAR_ICONS.length];

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[#667085]">
          <span className="font-bold text-[#002E4A]">
            السؤال {step + 1} من {total}: {pillarName}
          </span>
          <span>{Math.round(((step + 1) / total) * 100)}% مكتمل</span>
        </div>
        <div className="w-full bg-[#E6EAF0] h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#004A93] to-[#002E4A] h-full rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#DDEBFD] text-[#003a75] flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#172033] mt-0.5 leading-relaxed" data-testid="question-text">
            {questionText}
          </h3>
        </div>

        <div className="space-y-3 pt-2" role="radiogroup" aria-label="خيارات الإجابة">
          {choices.map((choice) => {
            const isSelected = selected === choice.key;
            return (
              <div
                key={choice.key}
                role="radio"
                aria-checked={isSelected}
                tabIndex={0}
                data-choice={choice.key}
                onClick={() => onSelect(choice.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(choice.key);
                  }
                }}
                className={`p-4 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-[#FFEDD5]/40 border-[#002E4A] shadow-xs ring-2 ring-[#FFEDD5]'
                    : 'bg-white border-[#E6EAF0] hover:border-[#CCD5E2] hover:bg-[#F7F9FC]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'border-[#002E4A] bg-[#002E4A]' : 'border-[#CCD5E2]'
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="flex-1 font-semibold text-[#172033] leading-relaxed">
                  <span className="text-[#002E4A] ml-1.5">{choice.label_ar}</span>
                  {choice.text_ar}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

