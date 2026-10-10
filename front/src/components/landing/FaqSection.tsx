import React from 'react';
import { ChevronDown } from 'lucide-react';

const faqItems: { question: string; answer: string }[] = [
  {
    question: 'ما هي منصة جَاهِز؟',
    answer: 'منصة رقمية وطنية تربط المنشآت الصناعية بمقدّمو حلول التحول الرقمي والأتمتة والذكاء الاصطناعي.',
  },
  {
    question: 'من يدير المنصة؟',
    answer: 'تديرها وتراقبها مركز تحديث الصناعة (IMC) لضمان جودة الحلول وحماية حقوق الطرفين.',
  },
  {
    question: 'ما هو تقييم الجاهزية الرقمية؟',
    answer: 'استبيان بركائز متعددة يحدد فئة جاهزية مصنعك ويعرض خارطة طريق بخدمات مقترحة.',
  },
  {
    question: 'كيف أسجّل مصنعًا؟',
    answer: 'سجّل منشأتك الصناعية ثم تصلك رسالة لتعيين كلمة المرور واكمال ملفك في بوابتك.',
  },
  {
    question: 'كيف يُعتمد مقدّم الخدمة؟',
    answer: 'يراجعه مركز تحديث الصناعة وفق معايير الاعتماد المعتمدة قبل ظهوره للمصانع.',
  },
  {
    question: 'هل العقود والفواتير داخل المنصة؟',
    answer: 'نعم — تفاوض واتفاقيات موثّقة وفواتير تُفعَّل وفق السياسة المالية المعتمدة.',
  },
];

export const FaqSection: React.FC = () => {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className="jahez-card p-6 sm:p-8 scroll-mt-24"
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="w-8 h-1 rounded-full bg-[#E67E00]" />
        <h2
          id="faq-title"
          className="text-lg sm:text-xl font-extrabold text-[#172033] tracking-tight"
        >
          الأسئلة الشائعة
        </h2>
      </div>

      <div className="space-y-3">
        {faqItems.map((item) => (
          <details
            key={item.question}
            className="group rounded-2xl border border-[#E6EAF0] bg-white overflow-hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 [&::-webkit-details-marker:hidden] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#004A93]">
              <span className="text-sm font-bold text-[#172033]">
                {item.question}
              </span>
              <ChevronDown className="w-4 h-4 shrink-0 text-[#002E4A] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <p className="px-4 pb-4 text-xs sm:text-sm text-[#667085] leading-relaxed">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
};

