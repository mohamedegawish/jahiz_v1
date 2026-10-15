import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api, fieldMessages, firstFieldErrors, isValidationError } from '../../api';
import type { RegistrationOptions } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useDebouncedValue } from '../../hooks/useListParams';
import { LEGAL_ACCEPT, LOGO_ACCEPT } from '../../lib/files';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Button } from '../../components/ui/Button';
import { FieldError } from '../../components/ui/FieldError';
import { FileField } from '../../components/ui/FileField';
import { FormSkeleton } from '../../components/ui/LoadingState';
import { SectorChoice } from '../../components/ui/SectorPicker';
import { TextField } from '../../components/ui/TextField';
import { AuthShell } from './AuthShell';
import { appendFile, appendList, appendText } from '../../lib/forms';
import { PASSWORD_HINT, appendSecret, passwordIssue } from '../../lib/password';
import { FormSection, RegistrationSubmitted } from './RegistrationParts';

interface FactoryForm {
  name: string;
  legal_name: string;
  size: string;
  contact_name: string;
  contact_job_title: string;
  contact_email: string;
  contact_phone: string;
  password: string;
  password_confirmation: string;
  website: string;
  governorate: string;
  city: string;
  address: string;
  commercial_registration_number: string;
  tax_registration_number: string;
  imc_number: string;
}

const EMPTY: FactoryForm = {
  name: '',
  legal_name: '',
  size: '',
  contact_name: '',
  contact_job_title: '',
  contact_email: '',
  contact_phone: '',
  password: '',
  password_confirmation: '',
  website: '',
  governorate: '',
  city: '',
  address: '',
  commercial_registration_number: '',
  tax_registration_number: '',
  imc_number: '',
};

/**
 * Public factory registration (POST /registration/factories, ADR-019). The contact person becomes
 * the factory's first account and signs in immediately with the chosen password. The readiness
 * assessment is a separate step, taken after signing in.
 */
export const FactoryRegister: React.FC = () => {
  const options = useApiQuery((signal) => api.registration.options(signal), []);

  return (
    <AuthShell wide title="تسجيل منشأة صناعية" subtitle="سجّل بيانات منشأتك، ثم ادخل إلى بوابتك لإكمال الملف وبدء تقييم الجاهزية الرقمية.">
      {options.status === 'loading' && <FormSkeleton />}
      {options.status === 'error' && <ApiErrorState error={options.error} onRetry={options.refetch} />}
      {options.status === 'success' && options.data && <FactoryRegistrationForm options={options.data} />}
    </AuthShell>
  );
};

const STEPS = ['بيانات المنشأة', 'مسؤول التواصل', 'العنوان والموقع', 'المستندات والإرسال'] as const;

const FactoryRegistrationForm: React.FC<{ options: RegistrationOptions }> = ({ options }) => {
  const [values, setValues] = useState<FactoryForm>(EMPTY);
  const [sectors, setSectors] = useState<string[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [crDocument, setCrDocument] = useState<File | null>(null);
  const [taxDocument, setTaxDocument] = useState<File | null>(null);
  const [submittedTo, setSubmittedTo] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [stepHint, setStepHint] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const submit = useApiMutation((form: FormData) => api.registration.factory(form));
  const set = (key: keyof FactoryForm) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const errors = (field: string) => fieldMessages(submit.error, field);
  const disabled = submit.pending;

  // Live check of the IMC number against the IMC-registered list: the visitor knows
  // immediately whether to contact IMC, instead of filling the whole form first.
  const debouncedImcNumber = useDebouncedValue(values.imc_number.trim(), 500);
  const [imcCheck, setImcCheck] = useState<{ value: string; status: 'idle' | 'checking' | 'found' | 'missing' }>({
    value: '',
    status: 'idle',
  });
  useEffect(() => {
    if (debouncedImcNumber === '') return;
    let cancelled = false;
    // The effect synchronizes with the check endpoint; marking the check as started is part of that.
    // oxlint-disable-next-line react/set-state-in-effect
    setImcCheck({ value: debouncedImcNumber, status: 'checking' });
    api.registration.checkImcNumber(debouncedImcNumber).then(
      ({ exists }) => {
        if (!cancelled) setImcCheck({ value: debouncedImcNumber, status: exists ? 'found' : 'missing' });
      },
      () => {
        if (!cancelled) setImcCheck({ value: debouncedImcNumber, status: 'idle' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [debouncedImcNumber]);
  // While the field is empty there is nothing to check: show the idle state without
  // storing it, so the effect only writes after an actual check request.
  const imcCheckView = debouncedImcNumber === '' ? { value: '', status: 'idle' as const } : imcCheck;
  const imcNumberConfirmedMissing =
    imcCheckView.status === 'missing' && imcCheckView.value === values.imc_number.trim() && values.imc_number.trim() !== '';

  if (submittedTo !== null) {
    return <RegistrationSubmitted email={submittedTo} />;
  }

  // Per-step gate: the visitor finishes the current step before moving on, so every
  // step fits the viewport with no page scroll. The server still validates everything.
  // Email check mirrors the server (RFC + DNS): strict local@domain.tld shape, no spaces.
  const isEmail = (value: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value.trim());
  const stepIssue = (target: number): string | null => {
    if (target === 0) {
      if (values.name.trim() === '') return 'أدخل اسم المنشأة الصناعية للمتابعة.';
      if (values.legal_name.trim() === '') return 'أدخل الاسم القانوني للمتابعة.';
      if (values.size === '') return 'اختر حجم المنشأة للمتابعة.';
      if (sectors.length === 0) return 'اختر قطاعًا صناعيًا واحدًا على الأقل للمتابعة.';
      return null;
    }
    if (target === 1) {
      if (values.contact_name.trim() === '') return 'أدخل الاسم الكامل لمسؤول التواصل للمتابعة.';
      if (values.contact_job_title.trim() === '') return 'أدخل المسمى الوظيفي لمسؤول التواصل للمتابعة.';
      if (!isEmail(values.contact_email)) return 'أدخل بريدًا إلكترونيًا صحيحًا لمسؤول التواصل للمتابعة (مثال: name@company.com).';
      if (values.contact_phone.trim() === '') return 'أدخل رقم هاتف مسؤول التواصل للمتابعة.';
      const passwordProblem = passwordIssue(values.password, values.password_confirmation);
      if (passwordProblem !== null) return passwordProblem;
      return null;
    }
    if (target === 2) {
      if (values.governorate.trim() === '') return 'أدخل المحافظة للمتابعة.';
      if (values.city.trim() === '') return 'أدخل المدينة للمتابعة.';
      if (values.address.trim() === '') return 'أدخل العنوان التفصيلي للمتابعة.';
      return null;
    }
    if (target === 3) {
      if (values.commercial_registration_number.trim() === '') return 'أدخل رقم السجل التجاري للمتابعة.';
      if (values.tax_registration_number.trim() === '') return 'أدخل رقم البطاقة الضريبية للمتابعة.';
      if (values.imc_number.trim() === '') return 'أدخل الرقم المسجل لدى IMC للمتابعة.';
      if (imcNumberConfirmedMissing) return 'هذا الرقم غير مسجل لدى الهيئة، برجاء التواصل مع الهيئة.';
      if (!logo) return 'أرفق شعار المنشأة للمتابعة.';
      if (!crDocument) return 'أرفق مستند السجل التجاري للمتابعة.';
      if (!taxDocument) return 'أرفق مستند البطاقة الضريبية للمتابعة.';
      return null;
    }
    return null;
  };

  const goStep = (target: number) => {
    setStepHint(null);
    setStep(target);
    topRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
  };

  const next = () => {
    const issue = stepIssue(step);
    if (issue !== null) {
      setStepHint(issue);
      return;
    }
    goStep(Math.min(step + 1, STEPS.length - 1));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (imcNumberConfirmedMissing) {
      setStepHint('هذا الرقم غير مسجل لدى الهيئة، برجاء التواصل مع الهيئة.');
      return;
    }
    const form = new FormData();
    (Object.keys(values) as (keyof FactoryForm)[]).forEach((key) => {
      if (key === 'contact_email') appendText(form, key, values[key].trim().toLowerCase());
      else if (key === 'password' || key === 'password_confirmation') appendSecret(form, key, values[key]);
      else appendText(form, key, values[key]);
    });
    appendList(form, 'sectors', sectors);
    appendFile(form, 'logo', logo);
    appendFile(form, 'commercial_registration_document', crDocument);
    appendFile(form, 'tax_registration_document', taxDocument);

    const result = await submit.run(form);
    if (result.ok) setSubmittedTo(values.contact_email.trim());
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (step < STEPS.length - 1) next();
        else void handleSubmit(event);
      }}
      className="space-y-5"
      noValidate
    >
      <div ref={topRef} className="scroll-mt-4" />
      {submit.error !== null && (isValidationError(submit.error) ? (
        <div role="alert" className="p-3 rounded-xl bg-[#FDECEE] border border-[#F7C6CD] text-xs font-semibold text-[#B82B3B]">
          راجع الحقول التالية ثم أعد الإرسال:
          <ul className="mt-1.5 space-y-0.5 font-medium list-disc ps-4">
            {Object.entries(firstFieldErrors(submit.error)).map(([field, message]) => (
              <li key={field} dir="auto">{message} <span className="opacity-70" dir="ltr">({field})</span></li>
            ))}
          </ul>
        </div>
      ) : (
        <ApiErrorState compact error={submit.error} />
      ))}

      {/* Stepper */}
      <ol aria-label="خطوات التسجيل" className="flex items-center gap-1.5 sm:gap-2">
        {STEPS.map((label, index) => {
          const done = index < step;
          const current = index === step;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
              <span
                aria-current={current ? 'step' : undefined}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black transition-colors ${
                  done ? 'bg-[#1D7E4C] text-white' : current ? 'bg-[#002E4A] text-white' : 'bg-[#F1F4F9] text-[#667085]'
                }`}
              >
                {done ? '✓' : index + 1}
              </span>
              <span className={`truncate text-[11px] font-bold sm:text-xs ${current ? 'text-[#172033]' : 'text-[#98A2B3] hidden sm:block'}`}>
                {label}
              </span>
              {index < STEPS.length - 1 && (
                <span aria-hidden="true" className={`h-0.5 min-w-3 flex-1 rounded-full sm:min-w-6 ${done ? 'bg-[#1D7E4C]' : 'bg-[#E6EAF0]'}`} />
              )}
            </li>
          );
        })}
      </ol>

      {step === 0 && (
      <FormSection title="بيانات المنشأة">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="اسم المنشأة الصناعية" required value={values.name} onChange={set('name')} messages={errors('name')} maxLength={255} disabled={disabled} />
          <TextField label="الاسم القانوني (كما في السجل التجاري)" required value={values.legal_name} onChange={set('legal_name')} messages={errors('legal_name')} maxLength={255} disabled={disabled} />
        </div>
        <div>
          <span className="text-xs font-bold text-[#172033] block mb-1.5">
            القطاعات الصناعية<span className="text-[#E45B6A] mr-0.5" aria-hidden="true">*</span>
          </span>
          <SectorChoice sectors={options.sectors} value={sectors} onChange={setSectors} disabled={disabled} />
          <p className="text-[11px] text-[#98A2B3] mt-1">تُعرض لمنشأتك خدمات مقدّمو هذه القطاعات بعد اعتمادهم.</p>
          <FieldError messages={errors('sectors')} />
        </div>
        <div className="sm:w-1/2 text-xs">
          <label htmlFor="factory-size" className="font-bold text-[#172033] block mb-1">حجم المنشأة<span className="text-[#E45B6A] mr-0.5" aria-hidden="true">*</span></label>
          <select
            id="factory-size"
            value={values.size}
            onChange={(e) => set('size')(e.target.value)}
            disabled={disabled}
            className="w-full p-2.5 rounded-xl border border-[#E6EAF0] text-xs bg-white focus:outline-none focus:border-[#004A93]"
          >
            <option value="">— اختر حجم المنشأة —</option>
            {options.factory_sizes.map((size) => (
              <option key={size.code} value={size.code}>{size.name_ar}</option>
            ))}
          </select>
          <FieldError messages={errors('size')} />
        </div>
      </FormSection>
      )}

      {step === 1 && (
      <FormSection title="مسؤول التواصل (صاحب الحساب)" description="يُنشأ الحساب الأول للمنشأة بهذا الاسم والبريد وكلمة المرور التي تختارها، وتسجّل الدخول بها مباشرة دون انتظار أي رسالة.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="الاسم الكامل" required value={values.contact_name} onChange={set('contact_name')} messages={errors('contact_name')} maxLength={255} disabled={disabled} autoComplete="name" />
          <TextField label="المسمى الوظيفي" required value={values.contact_job_title} onChange={set('contact_job_title')} messages={errors('contact_job_title')} maxLength={255} disabled={disabled} />
          <TextField label="البريد الإلكتروني" required type="email" dir="ltr" value={values.contact_email} onChange={set('contact_email')} messages={errors('contact_email')} maxLength={255} disabled={disabled} autoComplete="email" />
          <TextField label="رقم الهاتف" required type="tel" dir="ltr" value={values.contact_phone} onChange={set('contact_phone')} messages={errors('contact_phone')} maxLength={30} disabled={disabled} autoComplete="tel" />
          <TextField label="كلمة المرور" required type="password" dir="ltr" value={values.password} onChange={set('password')} messages={errors('password')} disabled={disabled} autoComplete="new-password" />
          <TextField label="تأكيد كلمة المرور" required type="password" dir="ltr" value={values.password_confirmation} onChange={set('password_confirmation')} messages={errors('password_confirmation')} disabled={disabled} autoComplete="new-password" />
        </div>
        <p className="text-[11px] text-[#667085]">{PASSWORD_HINT}</p>
      </FormSection>
      )}

      {step === 2 && (
      <FormSection title="العنوان والموقع">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="المحافظة" required value={values.governorate} onChange={set('governorate')} messages={errors('governorate')} maxLength={100} disabled={disabled} />
          <TextField label="المدينة / المنطقة الصناعية" required value={values.city} onChange={set('city')} messages={errors('city')} maxLength={100} disabled={disabled} />
        </div>
        <TextField label="العنوان التفصيلي" required value={values.address} onChange={set('address')} messages={errors('address')} maxLength={500} disabled={disabled} />
        <TextField label="الموقع الإلكتروني (اختياري)" type="url" dir="ltr" placeholder="https://" value={values.website} onChange={set('website')} messages={errors('website')} maxLength={255} disabled={disabled} />
      </FormSection>
      )}

      {step === 3 && (
      <FormSection title="بيانات التسجيل والمستندات" description="تُحفظ المستندات في مساحة خاصة ولا تظهر إلا لمنشأتك ولمركز تحديث الصناعة.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="رقم السجل التجاري" required dir="ltr" value={values.commercial_registration_number} onChange={set('commercial_registration_number')} messages={errors('commercial_registration_number')} maxLength={50} disabled={disabled} />
          <TextField label="رقم البطاقة الضريبية" required dir="ltr" value={values.tax_registration_number} onChange={set('tax_registration_number')} messages={errors('tax_registration_number')} maxLength={50} disabled={disabled} />
          <div>
            <TextField
              label="الرقم المسجل لدى IMC"
              required
              dir="ltr"
              value={values.imc_number}
              onChange={set('imc_number')}
              messages={imcNumberConfirmedMissing ? ['هذا الرقم غير مسجل لدى الهيئة، برجاء التواصل مع الهيئة.', ...errors('imc_number')] : errors('imc_number')}
              maxLength={50}
              disabled={disabled}
            />
            {imcCheckView.status === 'checking' && imcCheckView.value === values.imc_number.trim() && (
              <p className="text-[11px] text-[#667085] mt-1" role="status">جارٍ التحقق من الرقم لدى الهيئة...</p>
            )}
            {imcCheckView.status === 'found' && imcCheckView.value === values.imc_number.trim() && (
              <p className="text-[11px] font-semibold text-[#1D7E4C] mt-1" role="status">الرقم مسجل لدى الهيئة.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FileField label="شعار المنشأة" required accept={LOGO_ACCEPT} maxKb={options.documents.logo.max_kb} value={logo} onChange={setLogo} messages={errors('logo')} disabled={disabled} />
          <FileField label="مستند السجل التجاري" required accept={LEGAL_ACCEPT} maxKb={options.documents.legal.max_kb} value={crDocument} onChange={setCrDocument} messages={errors('commercial_registration_document')} disabled={disabled} />
          <FileField label="مستند البطاقة الضريبية" required accept={LEGAL_ACCEPT} maxKb={options.documents.legal.max_kb} value={taxDocument} onChange={setTaxDocument} messages={errors('tax_registration_document')} disabled={disabled} />
        </div>
      </FormSection>
      )}

      {stepHint !== null && (
        <p role="alert" className="p-3 rounded-xl bg-[#FEDCC2] border border-[#FDE5BE] text-xs font-semibold text-[#A66F0B]">
          {stepHint}
        </p>
      )}

      <div className="pt-1 space-y-3">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="outline" size="lg" onClick={() => goStep(step - 1)} disabled={disabled} className="font-bold">
              السابق
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button type="button" variant="primary" size="lg" onClick={next} disabled={disabled} className="flex-1 font-bold">
              التالي
            </Button>
          ) : (
            <Button type="submit" variant="primary" size="lg" icon={Send} isLoading={submit.pending} className="flex-1 font-bold">
              إرسال طلب التسجيل
            </Button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <Link to="/login" className="font-bold text-[#003a75] hover:underline">لديك حساب؟ تسجيل الدخول</Link>
          <Link to="/register/provider" className="text-[#667085] hover:underline">تسجيل مقدّم خدمة بدلًا من ذلك</Link>
        </div>
      </div>
    </form>
  );
};

