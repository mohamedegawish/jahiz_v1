import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import { api, fieldMessages, firstFieldErrors, isValidationError } from '../../api';
import type { RegistrationOptions } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { LEGAL_ACCEPT, LOGO_ACCEPT } from '../../lib/files';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Button } from '../../components/ui/Button';
import { FieldError } from '../../components/ui/FieldError';
import { FileField } from '../../components/ui/FileField';
import { FormSkeleton } from '../../components/ui/LoadingState';
import { SectorChoice } from '../../components/ui/SectorPicker';
import { ServiceChoice } from '../../components/ui/ServicePicker';
import { TextField } from '../../components/ui/TextField';
import { AuthShell } from './AuthShell';
import { appendFile, appendList, appendText } from '../../lib/forms';
import { FormSection, RegistrationSubmitted } from './RegistrationParts';

interface ProviderForm {
  name: string;
  legal_name: string;
  description: string;
  representative_name: string;
  job_title: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone: string;
  website: string;
  dx_experience_years: string;
  governorate: string;
  city: string;
  address: string;
  commercial_registration_number: string;
  tax_registration_number: string;
  imc_number: string;
}

const EMPTY: ProviderForm = {
  name: '',
  legal_name: '',
  description: '',
  representative_name: '',
  job_title: '',
  email: '',
  password: '',
  password_confirmation: '',
  phone: '',
  website: '',
  dx_experience_years: '',
  governorate: '',
  city: '',
  address: '',
  commercial_registration_number: '',
  tax_registration_number: '',
  imc_number: '',
};

/**
 * Public provider registration (POST /registration/service-providers, ADR-019): the services
 * workbook fields plus the registration details. The provider starts pending and is visible to
 * factories only after IMC approves it.
 */
export const ProviderRegister: React.FC = () => {
  const options = useApiQuery((signal) => api.registration.options(signal), []);

  return (
    <AuthShell wide title="تسجيل مقدّم خدمة" subtitle="سجّل بيانات شركتك وخدماتها. يراجع مركز تحديث الصناعة الطلب قبل ظهور الشركة للمصانع.">
      {options.status === 'loading' && <FormSkeleton />}
      {options.status === 'error' && <ApiErrorState error={options.error} onRetry={options.refetch} />}
      {options.status === 'success' && options.data && <ProviderRegistrationForm options={options.data} />}
    </AuthShell>
  );
};

const ProviderRegistrationForm: React.FC<{ options: RegistrationOptions }> = ({ options }) => {
  const [values, setValues] = useState<ProviderForm>(EMPTY);
  const [sectors, setSectors] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [logo, setLogo] = useState<File | null>(null);
  const [crDocument, setCrDocument] = useState<File | null>(null);
  const [taxDocument, setTaxDocument] = useState<File | null>(null);
  const [submittedTo, setSubmittedTo] = useState<string | null>(null);
  const [formHint, setFormHint] = useState<string | null>(null);

  const submit = useApiMutation((form: FormData) => api.registration.serviceProvider(form));
  const set = (key: keyof ProviderForm) => (value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const errors = (field: string) => fieldMessages(submit.error, field);
  const disabled = submit.pending;

  if (submittedTo !== null) {
    return (
      <RegistrationSubmitted
        email={submittedTo}
        reviewNote="ملف شركتك قيد المراجعة لدى مركز تحديث الصناعة، ولا يظهر للمصانع قبل اعتماده. يمكنك متابعة الحالة من بوابتك."
      />
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (values.password !== values.password_confirmation) {
      setFormHint('تأكيد كلمة المرور غير مطابق لكلمة المرور.');
      return;
    }
    setFormHint(null);
    const form = new FormData();
    (Object.keys(values) as (keyof ProviderForm)[]).forEach((key) => {
      // Normalize email once (trim + lowercase) so `User@Example.com` and `user@example.com` map to one account.
      if (key === 'email') appendText(form, key, values[key].trim().toLowerCase());
      else appendText(form, key, values[key]);
    });
    appendList(form, 'sectors', sectors);
    appendList(form, 'services', services);
    appendFile(form, 'logo', logo);
    appendFile(form, 'commercial_registration_document', crDocument);
    appendFile(form, 'tax_registration_document', taxDocument);

    const result = await submit.run(form);
    if (result.ok) setSubmittedTo(values.email.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

      <FormSection title="بيانات الشركة">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="اسم الشركة (الاسم التجاري)" required value={values.name} onChange={set('name')} messages={errors('name')} maxLength={255} disabled={disabled} />
          <TextField label="الاسم القانوني (كما في السجل التجاري)" required value={values.legal_name} onChange={set('legal_name')} messages={errors('legal_name')} maxLength={255} disabled={disabled} />
        </div>
        <TextField label="نبذة عن الشركة وخبراتها" required rows={3} value={values.description} onChange={set('description')} messages={errors('description')} maxLength={5000} disabled={disabled} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="الموقع الإلكتروني" required type="url" dir="ltr" placeholder="https://" value={values.website} onChange={set('website')} messages={errors('website')} maxLength={255} disabled={disabled} />
          <TextField label="سنوات الخبرة في التحول الرقمي" required type="number" dir="ltr" value={values.dx_experience_years} onChange={set('dx_experience_years')} messages={errors('dx_experience_years')} disabled={disabled} />
        </div>
      </FormSection>

      <FormSection title="الممثل المفوض (صاحب الحساب)" description="يُنشأ الحساب الأول للشركة بهذا الاسم والبريد وكلمة المرور التي تختارها، وتسجّل الدخول بها مباشرة دون انتظار أي رسالة.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="الاسم الكامل" required value={values.representative_name} onChange={set('representative_name')} messages={errors('representative_name')} maxLength={255} disabled={disabled} autoComplete="name" />
          <TextField label="المسمى الوظيفي" required value={values.job_title} onChange={set('job_title')} messages={errors('job_title')} maxLength={255} disabled={disabled} />
          <TextField label="البريد الإلكتروني" required type="email" dir="ltr" value={values.email} onChange={set('email')} messages={errors('email')} maxLength={255} disabled={disabled} autoComplete="email" />
          <TextField label="رقم الهاتف" required type="tel" dir="ltr" value={values.phone} onChange={set('phone')} messages={errors('phone')} maxLength={30} disabled={disabled} autoComplete="tel" />
          <TextField label="كلمة المرور" required type="password" dir="ltr" value={values.password} onChange={(v) => { set('password')(v); setFormHint(null); }} messages={errors('password')} disabled={disabled} autoComplete="new-password" />
          <TextField label="تأكيد كلمة المرور" required type="password" dir="ltr" value={values.password_confirmation} onChange={(v) => { set('password_confirmation')(v); setFormHint(null); }} messages={errors('password_confirmation')} disabled={disabled} autoComplete="new-password" />
        </div>
        <p className="text-[11px] text-[#667085]">8 أحرف على الأقل. تُحفظ كلمة المرور مشفّرة ولا تُرسل بأي بريد.</p>
      </FormSection>

      <FormSection title="العنوان">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="المحافظة" required value={values.governorate} onChange={set('governorate')} messages={errors('governorate')} maxLength={100} disabled={disabled} />
          <TextField label="المدينة" required value={values.city} onChange={set('city')} messages={errors('city')} maxLength={100} disabled={disabled} />
        </div>
        <TextField label="العنوان التفصيلي" required value={values.address} onChange={set('address')} messages={errors('address')} maxLength={500} disabled={disabled} />
      </FormSection>

      <FormSection title="القطاعات والخدمات" description="تظهر شركتك لمنشآت القطاعات التي تختارها، ولطلبات الخدمات التي تقدمها، بعد الاعتماد.">
        <div>
          <span className="text-xs font-bold text-[#172033] block mb-1.5">القطاعات الصناعية المستهدفة</span>
          <SectorChoice sectors={options.sectors} value={sectors} onChange={setSectors} disabled={disabled} />
          <FieldError messages={errors('sectors')} />
        </div>
        <div>
          <span className="text-xs font-bold text-[#172033] block mb-1.5">الخدمات التي تقدمها الشركة (من كتالوج الخدمات المعتمد)</span>
          <ServiceChoice categories={options.service_categories} value={services} onChange={setServices} disabled={disabled} />
          <FieldError messages={errors('services')} />
        </div>
      </FormSection>

      <FormSection title="بيانات التسجيل والمستندات" description="يراجع مركز تحديث الصناعة هذه البيانات عند اعتماد الشركة. تُحفظ المستندات في مساحة خاصة ولا تُعرض للمصانع.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField label="رقم السجل التجاري" required dir="ltr" value={values.commercial_registration_number} onChange={set('commercial_registration_number')} messages={errors('commercial_registration_number')} maxLength={50} disabled={disabled} />
          <TextField label="رقم البطاقة الضريبية" required dir="ltr" value={values.tax_registration_number} onChange={set('tax_registration_number')} messages={errors('tax_registration_number')} maxLength={50} disabled={disabled} />
          <TextField label="رقم قيد IMC" required dir="ltr" value={values.imc_number} onChange={set('imc_number')} messages={errors('imc_number')} maxLength={50} disabled={disabled} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FileField label="شعار الشركة" accept={LOGO_ACCEPT} maxKb={options.documents.logo.max_kb} value={logo} onChange={setLogo} messages={errors('logo')} disabled={disabled} />
          <FileField label="مستند السجل التجاري" accept={LEGAL_ACCEPT} maxKb={options.documents.legal.max_kb} value={crDocument} onChange={setCrDocument} messages={errors('commercial_registration_document')} disabled={disabled} />
          <FileField label="مستند البطاقة الضريبية" accept={LEGAL_ACCEPT} maxKb={options.documents.legal.max_kb} value={taxDocument} onChange={setTaxDocument} messages={errors('tax_registration_document')} disabled={disabled} />
        </div>
      </FormSection>

      <div className="pt-2 space-y-3">
        {formHint !== null && (
          <p role="alert" className="p-3 rounded-xl bg-[#FEDCC2] border border-[#FDE5BE] text-xs font-semibold text-[#A66F0B]">
            {formHint}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" icon={Send} isLoading={submit.pending} className="w-full font-bold">
          إرسال طلب التسجيل
        </Button>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <Link to="/login" className="font-bold text-[#003a75] hover:underline">لديك حساب؟ تسجيل الدخول</Link>
          <Link to="/register/factory" className="text-[#667085] hover:underline">تسجيل منشأة صناعية بدلًا من ذلك</Link>
        </div>
      </div>
    </form>
  );
};

