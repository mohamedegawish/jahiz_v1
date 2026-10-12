import React, { useState } from 'react';
import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { api, fieldMessages, publicApiUrl } from '../../api';
import type {
  LandingFaqItem,
  LandingHeroTab,
  LandingHowStep,
  LandingQuickFact,
  LandingServiceCard,
  LandingSettings as LandingSettingsData,
  LandingSettingsPayload,
} from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { HERO_TAB_IDS, HERO_TAB_LABELS, LANDING_DEFAULTS } from '../../lib/landingDefaults';
import { LOGO_ACCEPT, LOGO_MAX_KB, formatBytes, localFileProblem } from '../../lib/files';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { FieldError } from '../../components/ui/FieldError';
import { CardSkeleton } from '../../components/ui/LoadingState';
import { QueryBoundary } from '../../components/ui/QueryBoundary';
import { Tabs } from '../../components/ui/Tabs';

const TABS = [
  { id: 'logo', label: 'الشعار' },
  { id: 'hero', label: 'الواجهة الرئيسية' },
  { id: 'sections', label: 'الثقة والانضمام والقيمة' },
  { id: 'about', label: 'عن المنصة' },
  { id: 'services', label: 'الخدمات والخطوات' },
  { id: 'faq', label: 'الأسئلة الشائعة' },
  { id: 'footer', label: 'الختام والتذييل' },
];

const inputClass =
  'w-full p-2.5 rounded-xl border border-[#E6EAF0] text-xs focus:outline-none focus:border-[#004A93] bg-white';

/**
 * محتوى صفحة الهبوط: الشعار والواجهة وكل الأقسام والأسئلة الشائعة والختام والتذييل.
 * كل تبويب يحفظ حقوله فقط؛ الحقل الفارغ يعني عرض النسخة الافتراضية المضمّنة
 * للزوار. التغيير يظهر فور الحفظ ويُسجَّل في سجل التدقيق بأسماء الحقول فقط.
 */
export const LandingSettings: React.FC = () => {
  const [tab, setTab] = useState('logo');
  // The shape is the same for everyone (public by design), so the admin form reads the public endpoint.
  const content = useApiQuery((signal) => api.landing.publicContent(signal), []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">محتوى صفحة الهبوط</h2>
        <p className="text-xs sm:text-sm text-[#667085] mt-0.5 max-w-3xl leading-relaxed">
          تحكم كامل في نصوص وشعار صفحة الهبوط. اترك أي حقل فارغًا لعرض النص الافتراضي.
          عناوين وأيقونات وأزرار التنقل (تبويبات الواجهة، روابط الأقسام، وجهات الأزرار) ثابتة لأنها وظيفية.
        </p>
      </div>

      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} />

      <QueryBoundary query={content} loading={<CardSkeleton />}>
        {(settings: LandingSettingsData) => (
          <div key={`${tab}-${settings.updated_at ?? 'new'}`}>
            {tab === 'logo' && <LogoTab settings={settings} onChanged={content.refetch} />}
            {tab === 'hero' && <HeroTab settings={settings} onChanged={content.refetch} />}
            {tab === 'sections' && <SectionsTab settings={settings} onChanged={content.refetch} />}
            {tab === 'about' && <AboutTab settings={settings} onChanged={content.refetch} />}
            {tab === 'services' && <ServicesTab settings={settings} onChanged={content.refetch} />}
            {tab === 'faq' && <FaqTab settings={settings} onChanged={content.refetch} />}
            {tab === 'footer' && <FooterTab settings={settings} onChanged={content.refetch} />}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
};

// ─── Shared bits ───

const Section: React.FC<{ title: string; hint?: string; children: React.ReactNode }> = ({ title, hint, children }) => (
  <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4 sm:p-6 space-y-3">
    <div>
      <h3 className="text-sm font-extrabold text-[#172033]">{title}</h3>
      {hint && <p className="text-[11px] text-[#98A2B3] mt-0.5 leading-relaxed">{hint}</p>}
    </div>
    {children}
  </div>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
  messages?: string[];
}> = ({ label, value, onChange, maxLength, placeholder, messages }) => (
  <label className="block space-y-1">
    <span className="font-bold text-[#172033] block text-xs">{label}</span>
    <input
      className={inputClass}
      value={value}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
    <FieldError messages={messages} />
  </label>
);

const AreaField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows?: number;
  placeholder?: string;
  messages?: string[];
}> = ({ label, value, onChange, maxLength, rows = 3, placeholder, messages }) => (
  <label className="block space-y-1">
    <span className="font-bold text-[#172033] block text-xs">{label}</span>
    <textarea
      className={`${inputClass} resize-y leading-relaxed`}
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
    <FieldError messages={messages} />
  </label>
);

const orNull = (value: string): string | null => (value.trim() === '' ? null : value);
const textOf = (value: string | null | undefined): string => value ?? '';

const SaveRow: React.FC<{ pending: boolean; disabled: boolean; onSave: () => void; error: unknown }> = ({
  pending,
  disabled,
  onSave,
  error,
}) => (
  <div className="flex flex-wrap items-center gap-2 pt-1">
    <Button size="sm" variant="primary" icon={Save} isLoading={pending} disabled={disabled || pending} onClick={onSave}>
      حفظ
    </Button>
    {error !== null && <ApiErrorState compact error={error} />}
  </div>
);

// ─── Logo ───

const LogoTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const upload = useApiMutation((file: File) => api.landing.uploadLogo(file));
  const remove = useApiMutation(() => api.landing.removeLogo());
  const busy = upload.pending || remove.pending;
  const liveSrc = settings.logo_path ? publicApiUrl(settings.logo_path) : '/jahiz-logo-vector.svg';

  const pickFile = (file: File | null) => {
    setFileError(null);
    setPendingFile(null);
    if (!file) return;
    const problem = localFileProblem(file, LOGO_ACCEPT, LOGO_MAX_KB);
    if (problem) {
      setFileError(problem);
      return;
    }
    setPendingFile(file);
  };

  return (
    <div className="space-y-4">
      <Section
        title="شعار المنصة"
        hint={`يظهر في هيدر وتذييل صفحة الهبوط والبانر الختامي. صور فقط (jpg / png / webp حتى ${formatBytes(LOGO_MAX_KB * 1024)}) — ملفات SVG مرفوضة لأنها قد تحمل سكربتات للزوار. حذف الشعار يعيد العلامة المضمّنة.`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-[#E6EAF0] bg-[#F7F9FC] p-6 flex items-center justify-center min-h-[160px]">
            <img src={liveSrc} alt="شعار المنصة الحالي" className="max-h-24 w-auto object-contain" />
          </div>
          <div className="space-y-3 text-xs">
            <div className="block">
              <span className="font-bold text-[#172033] block mb-1">ملف الشعار</span>
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-dashed border-[#CCD5E2] cursor-pointer hover:bg-[#F7F9FC]">
                <Upload className="w-4 h-4 text-[#002E4A]" />
                <span className="truncate">{settings.logo_path ? 'استبدال الشعار الحالي' : 'اختيار شعار'}</span>
                <input
                  type="file"
                  accept={LOGO_ACCEPT}
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    pickFile(e.target.files?.[0] ?? null);
                    e.target.value = '';
                  }}
                />
              </label>
              <FieldError messages={fileError ? [fileError] : fieldMessages(upload.error, 'file')} />
              {pendingFile && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl bg-[#F7F9FC] border border-[#E6EAF0] px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-bold text-[#172033]">{pendingFile.name}</span>
                  <span className="shrink-0 text-[11px] text-[#667085]">{formatBytes(pendingFile.size)}</span>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Upload}
                    isLoading={upload.pending}
                    disabled={busy}
                    onClick={async () => {
                      const result = await upload.run(pendingFile);
                      if (result.ok) {
                        setPendingFile(null);
                        onChanged();
                      }
                    }}
                  >
                    رفع
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => setPendingFile(null)}>
                    إلغاء
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {settings.logo_path && (
                <Button size="sm" variant="ghost" icon={Trash2} disabled={busy} onClick={() => setConfirmRemove(true)}>
                  حذف الشعار
                </Button>
              )}
              {upload.error !== null && <ApiErrorState compact error={upload.error} />}
              {remove.error !== null && <ApiErrorState compact error={remove.error} />}
            </div>
          </div>
        </div>
      </Section>

      {confirmRemove && (
        <ConfirmModal
          title="حذف شعار المنصة"
          description="حذف الشعار المرفوع نهائيًا؟ سيشاهد الزوار العلامة المضمّنة بدلًا منه."
          confirmLabel="حذف"
          variant="danger"
          onConfirm={() => api.landing.removeLogo()}
          onDone={() => {
            setConfirmRemove(false);
            onChanged();
          }}
          onClose={() => setConfirmRemove(false)}
        />
      )}
    </div>
  );
};

// ─── Hero ───

const HeroTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const [kicker, setKicker] = useState(textOf(settings.hero_kicker));
  const [headline, setHeadline] = useState(textOf(settings.hero_headline));
  const [tabs, setTabs] = useState<Record<LandingHeroTab, string>>(() => ({
    home: settings.hero_tab_headlines.home ?? '',
    assessment: settings.hero_tab_headlines.assessment ?? '',
    digital: settings.hero_tab_headlines.digital ?? '',
    smart: settings.hero_tab_headlines.smart ?? '',
    results: settings.hero_tab_headlines.results ?? '',
  }));
  const [subtitle, setSubtitle] = useState(textOf(settings.hero_subtitle));
  const [primaryCta, setPrimaryCta] = useState(textOf(settings.hero_primary_cta));
  const [secondaryCta, setSecondaryCta] = useState(textOf(settings.hero_secondary_cta));

  const save = useApiMutation((payload: LandingSettingsPayload) => api.landing.update(payload));
  const run = async () => {
    const result = await save.run({
      hero_kicker: orNull(kicker),
      hero_headline: orNull(headline),
      hero_tab_headlines: {
        home: orNull(tabs.home),
        assessment: orNull(tabs.assessment),
        digital: orNull(tabs.digital),
        smart: orNull(tabs.smart),
        results: orNull(tabs.results),
      },
      hero_subtitle: orNull(subtitle),
      hero_primary_cta: orNull(primaryCta),
      hero_secondary_cta: orNull(secondaryCta),
    });
    if (result.ok) onChanged();
  };

  return (
    <div className="space-y-4">
      <Section title="النص الرئيسي" hint="السطر الصغير فوق العنوان، والعنوان الرئيسي (تبويب «الرئيسية»)، والوصف، ونصّا الزرّين.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TextField label="السطر الصغير" value={kicker} onChange={setKicker} maxLength={120} placeholder={LANDING_DEFAULTS.heroKicker} messages={fieldMessages(save.error, 'hero_kicker')} />
          <TextField label="العنوان الرئيسي" value={headline} onChange={setHeadline} maxLength={120} placeholder={LANDING_DEFAULTS.heroHeadline} messages={fieldMessages(save.error, 'hero_headline')} />
        </div>
        <AreaField label="الوصف تحت العنوان" value={subtitle} onChange={setSubtitle} maxLength={500} rows={3} placeholder={LANDING_DEFAULTS.heroSubtitle} messages={fieldMessages(save.error, 'hero_subtitle')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TextField label="نص الزر الأساسي" value={primaryCta} onChange={setPrimaryCta} maxLength={60} placeholder={LANDING_DEFAULTS.heroPrimaryCta} messages={fieldMessages(save.error, 'hero_primary_cta')} />
          <TextField label="نص الزر الثانوي" value={secondaryCta} onChange={setSecondaryCta} maxLength={60} placeholder={LANDING_DEFAULTS.heroSecondaryCta} messages={fieldMessages(save.error, 'hero_secondary_cta')} />
        </div>
      </Section>
      <Section title="عناوين تبويبات الواجهة" hint="كل تبويب يبدّل العنوان الرئيسي؛ اتركه فارغًا لعرض عنوانه الافتراضي.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {HERO_TAB_IDS.map((id) => (
            <TextField
              key={id}
              label={`تبويب «${HERO_TAB_LABELS[id]}»`}
              value={tabs[id]}
              onChange={(value) => setTabs((prev) => ({ ...prev, [id]: value }))}
              maxLength={120}
              placeholder={LANDING_DEFAULTS.heroTabHeadlines[id]}
              messages={fieldMessages(save.error, `hero_tab_headlines.${id}`)}
            />
          ))}
        </div>
      </Section>
      <SaveRow pending={save.pending} disabled={false} onSave={run} error={save.error} />
    </div>
  );
};

// ─── Trust / join / value ───

const SectionsTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const stored = (list: string[] | null | undefined): [string, string, string] => [list?.[0] ?? '', list?.[1] ?? '', list?.[2] ?? ''];
  const [trust, setTrust] = useState<[string, string, string]>(() => stored(settings.trust_facts));
  const [joinTitle, setJoinTitle] = useState(textOf(settings.join_title));
  const [joinDescription, setJoinDescription] = useState(textOf(settings.join_description));
  const [valueTitle, setValueTitle] = useState(textOf(settings.value_title));
  const [valueSubtitle, setValueSubtitle] = useState(textOf(settings.value_subtitle));

  const save = useApiMutation((payload: LandingSettingsPayload) => api.landing.update(payload));
  const run = async () => {
    const facts = trust.map((fact) => fact.trim()).filter((fact) => fact !== '');
    const result = await save.run({
      trust_facts: facts,
      join_title: orNull(joinTitle),
      join_description: orNull(joinDescription),
      value_title: orNull(valueTitle),
      value_subtitle: orNull(valueSubtitle),
    });
    if (result.ok) onChanged();
  };
  const setFact = (index: number, value: string) =>
    setTrust((prev) => prev.map((fact, i) => (i === index ? value : fact)) as [string, string, string]);

  return (
    <div className="space-y-4">
      <Section title="شريط الثقة" hint="النصوص الثلاثة تحت الواجهة مباشرة (الأيقونات ثابتة).">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {trust.map((fact, i) => (
            <TextField
              key={i}
              label={`إشارة ${i + 1}`}
              value={fact}
              onChange={(value) => setFact(i, value)}
              maxLength={80}
              placeholder={LANDING_DEFAULTS.trustFacts[i]}
              messages={fieldMessages(save.error, `trust_facts.${i}`)}
            />
          ))}
        </div>
      </Section>
      <Section title="قسم الانضمام">
        <TextField label="العنوان" value={joinTitle} onChange={setJoinTitle} maxLength={120} placeholder={LANDING_DEFAULTS.joinTitle} messages={fieldMessages(save.error, 'join_title')} />
        <AreaField label="الوصف" value={joinDescription} onChange={setJoinDescription} maxLength={500} rows={3} placeholder={LANDING_DEFAULTS.joinDescription} messages={fieldMessages(save.error, 'join_description')} />
      </Section>
      <Section title="العنوان القيمي">
        <TextField label="العنوان" value={valueTitle} onChange={setValueTitle} maxLength={120} placeholder={LANDING_DEFAULTS.valueTitle} messages={fieldMessages(save.error, 'value_title')} />
        <AreaField label="الوصف" value={valueSubtitle} onChange={setValueSubtitle} maxLength={300} rows={2} placeholder={LANDING_DEFAULTS.valueSubtitle} messages={fieldMessages(save.error, 'value_subtitle')} />
      </Section>
      <SaveRow pending={save.pending} disabled={false} onSave={run} error={save.error} />
    </div>
  );
};

// ─── About ───

const AboutTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const [paragraph1, setParagraph1] = useState(textOf(settings.about_paragraph_1));
  const [paragraph2, setParagraph2] = useState(textOf(settings.about_paragraph_2));
  const [chips, setChips] = useState<[string, string, string]>(() => [
    settings.about_chips?.[0] ?? '',
    settings.about_chips?.[1] ?? '',
    settings.about_chips?.[2] ?? '',
  ]);
  const [facts, setFacts] = useState<LandingQuickFact[]>(() =>
    [0, 1, 2].map((i) => ({ value: settings.quick_facts?.[i]?.value ?? '', label: settings.quick_facts?.[i]?.label ?? '' })),
  );

  const save = useApiMutation((payload: LandingSettingsPayload) => api.landing.update(payload));
  const run = async () => {
    const result = await save.run({
      about_paragraph_1: orNull(paragraph1),
      about_paragraph_2: orNull(paragraph2),
      about_chips: chips.map((chip) => chip.trim()).filter((chip) => chip !== ''),
      quick_facts: facts
        .map((fact) => ({ value: fact.value.trim(), label: fact.label.trim() }))
        .filter((fact) => fact.value !== '' && fact.label !== ''),
    });
    if (result.ok) onChanged();
  };

  return (
    <div className="space-y-4">
      <Section title="فقرات التعريف">
        <AreaField label="الفقرة الأولى" value={paragraph1} onChange={setParagraph1} maxLength={2000} rows={4} placeholder={LANDING_DEFAULTS.aboutParagraph1} messages={fieldMessages(save.error, 'about_paragraph_1')} />
        <AreaField label="الفقرة الثانية" value={paragraph2} onChange={setParagraph2} maxLength={2000} rows={4} placeholder={LANDING_DEFAULTS.aboutParagraph2} messages={fieldMessages(save.error, 'about_paragraph_2')} />
      </Section>
      <Section title="الشارات الثلاث" hint="النصوص الملوّنة تحت الفقرات (الأيقونات ثابتة).">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {chips.map((chip, i) => (
            <TextField
              key={i}
              label={`شارة ${i + 1}`}
              value={chip}
              onChange={(value) => setChips((prev) => prev.map((entry, j) => (j === i ? value : entry)) as [string, string, string])}
              maxLength={60}
              placeholder={LANDING_DEFAULTS.aboutChips[i]}
              messages={fieldMessages(save.error, `about_chips.${i}`)}
            />
          ))}
        </div>
      </Section>
      <Section title="الأرقام السريعة" hint="الرقم وعنوانه في البطاقات الجانبية؛ الصف الفارغ تمامًا يُحذف عند الحفظ.">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {facts.map((fact, i) => (
            <div key={i} className="grid grid-cols-[90px_1fr] gap-2">
              <TextField
                label="الرقم"
                value={fact.value}
                onChange={(value) => setFacts((prev) => prev.map((entry, j) => (j === i ? { ...entry, value } : entry)))}
                maxLength={20}
                placeholder={LANDING_DEFAULTS.quickFacts[i]?.value}
                messages={fieldMessages(save.error, `quick_facts.${i}.value`)}
              />
              <TextField
                label="العنوان"
                value={fact.label}
                onChange={(value) => setFacts((prev) => prev.map((entry, j) => (j === i ? { ...entry, label: value } : entry)))}
                maxLength={80}
                placeholder={LANDING_DEFAULTS.quickFacts[i]?.label}
                messages={fieldMessages(save.error, `quick_facts.${i}.label`)}
              />
            </div>
          ))}
        </div>
        <FieldError messages={fieldMessages(save.error, 'quick_facts')} />
      </Section>
      <SaveRow pending={save.pending} disabled={false} onSave={run} error={save.error} />
    </div>
  );
};

// ─── Services & steps ───

const ServicesTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const [servicesTitle, setServicesTitle] = useState(textOf(settings.services_title));
  const [cards, setCards] = useState<LandingServiceCard[]>(() =>
    [0, 1, 2, 3].map((i) => ({
      title: settings.service_cards?.[i]?.title ?? '',
      description: settings.service_cards?.[i]?.description ?? '',
      meta: settings.service_cards?.[i]?.meta ?? '',
    })),
  );
  const [howTitle, setHowTitle] = useState(textOf(settings.how_title));
  const [howDescription, setHowDescription] = useState(textOf(settings.how_description));
  const [steps, setSteps] = useState<LandingHowStep[]>(() =>
    [0, 1, 2, 3].map((i) => ({
      title: settings.how_steps?.[i]?.title ?? '',
      description: settings.how_steps?.[i]?.description ?? '',
      cta: settings.how_steps?.[i]?.cta ?? '',
    })),
  );

  const save = useApiMutation((payload: LandingSettingsPayload) => api.landing.update(payload));
  const run = async () => {
    const cleanCards = cards
      .map((card) => ({ title: card.title.trim(), description: card.description.trim(), meta: card.meta?.trim() === '' ? null : (card.meta?.trim() ?? null) }))
      .filter((card) => card.title !== '' && card.description !== '');
    const cleanSteps = steps
      .map((step) => ({ title: step.title.trim(), description: step.description.trim(), cta: step.cta?.trim() === '' ? null : (step.cta?.trim() ?? null) }))
      .filter((step) => step.title !== '' && step.description !== '');
    const result = await save.run({
      services_title: orNull(servicesTitle),
      service_cards: cleanCards,
      how_title: orNull(howTitle),
      how_description: orNull(howDescription),
      how_steps: cleanSteps,
    });
    if (result.ok) onChanged();
  };

  return (
    <div className="space-y-4">
      <Section title="خدمات المنصة" hint="العنوان وبطاقات الخدمات الأربع (الأيقونة والوجهة ثابتتان حسب الترتيب)؛ البطاقة الفارغة تمامًا تُحذف عند الحفظ.">
        <TextField label="عنوان القسم" value={servicesTitle} onChange={setServicesTitle} maxLength={120} placeholder={LANDING_DEFAULTS.servicesTitle} messages={fieldMessages(save.error, 'services_title')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {cards.map((card, i) => (
            <div key={i} className="rounded-xl border border-[#E6EAF0] p-3 space-y-2">
              <p className="text-[11px] font-black text-[#004A93]">بطاقة {i + 1}</p>
              <TextField label="العنوان" value={card.title} onChange={(value) => setCards((prev) => prev.map((entry, j) => (j === i ? { ...entry, title: value } : entry)))} maxLength={80} placeholder={LANDING_DEFAULTS.serviceCards[i]?.title} messages={fieldMessages(save.error, `service_cards.${i}.title`)} />
              <AreaField label="الوصف" value={card.description} onChange={(value) => setCards((prev) => prev.map((entry, j) => (j === i ? { ...entry, description: value } : entry)))} maxLength={300} rows={2} placeholder={LANDING_DEFAULTS.serviceCards[i]?.description} messages={fieldMessages(save.error, `service_cards.${i}.description`)} />
              <TextField label="السطر السفلي (اختياري)" value={card.meta ?? ''} onChange={(value) => setCards((prev) => prev.map((entry, j) => (j === i ? { ...entry, meta: value } : entry)))} maxLength={60} placeholder={LANDING_DEFAULTS.serviceCards[i]?.meta ?? ''} messages={fieldMessages(save.error, `service_cards.${i}.meta`)} />
            </div>
          ))}
        </div>
        <FieldError messages={fieldMessages(save.error, 'service_cards')} />
      </Section>
      <Section title="كيفية الاستخدام" hint="العنوان والوصف وخطوات الاستخدام الأربع؛ الخطوة الفارغة تمامًا تُحذف عند الحفظ.">
        <TextField label="عنوان القسم" value={howTitle} onChange={setHowTitle} maxLength={120} placeholder={LANDING_DEFAULTS.howTitle} messages={fieldMessages(save.error, 'how_title')} />
        <AreaField label="الوصف" value={howDescription} onChange={setHowDescription} maxLength={300} rows={2} placeholder={LANDING_DEFAULTS.howDescription} messages={fieldMessages(save.error, 'how_description')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {steps.map((step, i) => (
            <div key={i} className="rounded-xl border border-[#E6EAF0] p-3 space-y-2">
              <p className="text-[11px] font-black text-[#35B779]">خطوة {i + 1}</p>
              <TextField label="العنوان" value={step.title} onChange={(value) => setSteps((prev) => prev.map((entry, j) => (j === i ? { ...entry, title: value } : entry)))} maxLength={80} placeholder={LANDING_DEFAULTS.howSteps[i]?.title} messages={fieldMessages(save.error, `how_steps.${i}.title`)} />
              <AreaField label="الوصف" value={step.description} onChange={(value) => setSteps((prev) => prev.map((entry, j) => (j === i ? { ...entry, description: value } : entry)))} maxLength={300} rows={2} placeholder={LANDING_DEFAULTS.howSteps[i]?.description} messages={fieldMessages(save.error, `how_steps.${i}.description`)} />
              <TextField label="نص الزر السفلي (اختياري)" value={step.cta ?? ''} onChange={(value) => setSteps((prev) => prev.map((entry, j) => (j === i ? { ...entry, cta: value } : entry)))} maxLength={60} placeholder={LANDING_DEFAULTS.howSteps[i]?.cta ?? ''} messages={fieldMessages(save.error, `how_steps.${i}.cta`)} />
            </div>
          ))}
        </div>
        <FieldError messages={fieldMessages(save.error, 'how_steps')} />
      </Section>
      <SaveRow pending={save.pending} disabled={false} onSave={run} error={save.error} />
    </div>
  );
};

// ─── FAQ ───

const FaqTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const [title, setTitle] = useState(textOf(settings.faq_title));
  const [items, setItems] = useState<LandingFaqItem[]>(() => settings.faq_items ?? []);

  const save = useApiMutation((payload: LandingSettingsPayload) => api.landing.update(payload));
  const run = async () => {
    const clean = items
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
      .filter((item) => item.question !== '' && item.answer !== '');
    const result = await save.run({ faq_title: orNull(title), faq_items: clean });
    if (result.ok) onChanged();
  };

  return (
    <div className="space-y-4">
      <Section title="الأسئلة الشائعة" hint="أضف أو احذف حتى 12 سؤالًا؛ السؤال أو الإجابة الفارغة يُحذف عند الحفظ.">
        <TextField label="عنوان القسم" value={title} onChange={setTitle} maxLength={120} placeholder={LANDING_DEFAULTS.faqTitle} messages={fieldMessages(save.error, 'faq_title')} />
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="rounded-xl border border-[#E6EAF0] p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-[#E67E00]">سؤال {i + 1}</p>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}
                >
                  حذف
                </Button>
              </div>
              <TextField
                label="السؤال"
                value={item.question}
                onChange={(value) => setItems((prev) => prev.map((entry, j) => (j === i ? { ...entry, question: value } : entry)))}
                maxLength={200}
                messages={fieldMessages(save.error, `faq_items.${i}.question`)}
              />
              <AreaField
                label="الإجابة"
                value={item.answer}
                onChange={(value) => setItems((prev) => prev.map((entry, j) => (j === i ? { ...entry, answer: value } : entry)))}
                maxLength={1000}
                rows={2}
                messages={fieldMessages(save.error, `faq_items.${i}.answer`)}
              />
            </div>
          ))}
        </div>
        <FieldError messages={fieldMessages(save.error, 'faq_items')} />
        {items.length < 12 && (
          <Button size="sm" variant="outline" icon={Plus} onClick={() => setItems((prev) => [...prev, { question: '', answer: '' }])}>
            إضافة سؤال
          </Button>
        )}
      </Section>
      <SaveRow pending={save.pending} disabled={false} onSave={run} error={save.error} />
    </div>
  );
};

// ─── Final CTA & footer ───

const FooterTab: React.FC<{ settings: LandingSettingsData; onChanged: () => void }> = ({ settings, onChanged }) => {
  const [ctaTitle, setCtaTitle] = useState(textOf(settings.cta_title));
  const [ctaSubtitle, setCtaSubtitle] = useState(textOf(settings.cta_subtitle));
  const [ctaButton, setCtaButton] = useState(textOf(settings.cta_button));
  const [ctaNote, setCtaNote] = useState(textOf(settings.cta_note));
  const [footerAbout, setFooterAbout] = useState(textOf(settings.footer_about));
  const [footerTagline, setFooterTagline] = useState(textOf(settings.footer_tagline));
  const [footerCopyright, setFooterCopyright] = useState(textOf(settings.footer_copyright));
  const [footerSupervision, setFooterSupervision] = useState(textOf(settings.footer_supervision));

  const save = useApiMutation((payload: LandingSettingsPayload) => api.landing.update(payload));
  const run = async () => {
    const result = await save.run({
      cta_title: orNull(ctaTitle),
      cta_subtitle: orNull(ctaSubtitle),
      cta_button: orNull(ctaButton),
      cta_note: orNull(ctaNote),
      footer_about: orNull(footerAbout),
      footer_tagline: orNull(footerTagline),
      footer_copyright: orNull(footerCopyright),
      footer_supervision: orNull(footerSupervision),
    });
    if (result.ok) onChanged();
  };

  return (
    <div className="space-y-4">
      <Section title="البانر الختامي">
        <TextField label="العنوان" value={ctaTitle} onChange={setCtaTitle} maxLength={120} placeholder={LANDING_DEFAULTS.ctaTitle} messages={fieldMessages(save.error, 'cta_title')} />
        <TextField label="الوصف" value={ctaSubtitle} onChange={setCtaSubtitle} maxLength={200} placeholder={LANDING_DEFAULTS.ctaSubtitle} messages={fieldMessages(save.error, 'cta_subtitle')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TextField label="نص الزر" value={ctaButton} onChange={setCtaButton} maxLength={60} placeholder={LANDING_DEFAULTS.ctaButton} messages={fieldMessages(save.error, 'cta_button')} />
          <TextField label="الملاحظة تحت الزر" value={ctaNote} onChange={setCtaNote} maxLength={120} placeholder={LANDING_DEFAULTS.ctaNote} messages={fieldMessages(save.error, 'cta_note')} />
        </div>
      </Section>
      <Section title="التذييل">
        <AreaField label="نبذة التذييل" value={footerAbout} onChange={setFooterAbout} maxLength={300} rows={2} placeholder={LANDING_DEFAULTS.footerAbout} messages={fieldMessages(save.error, 'footer_about')} />
        <TextField label="الشارة الملوّنة" value={footerTagline} onChange={setFooterTagline} maxLength={120} placeholder={LANDING_DEFAULTS.footerTagline} messages={fieldMessages(save.error, 'footer_tagline')} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TextField label="سطر الحقوق" value={footerCopyright} onChange={setFooterCopyright} maxLength={200} placeholder={LANDING_DEFAULTS.footerCopyright} messages={fieldMessages(save.error, 'footer_copyright')} />
          <TextField label="سطر الإشراف" value={footerSupervision} onChange={setFooterSupervision} maxLength={200} placeholder={LANDING_DEFAULTS.footerSupervision} messages={fieldMessages(save.error, 'footer_supervision')} />
        </div>
      </Section>
      <SaveRow pending={save.pending} disabled={false} onSave={run} error={save.error} />
    </div>
  );
};
