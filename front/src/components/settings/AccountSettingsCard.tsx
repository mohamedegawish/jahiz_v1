import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, LogOut, Save } from 'lucide-react';
import { api, fieldMessages } from '../../api';
import { useAuth } from '../../auth/authContext';
import { useApiMutation } from '../../hooks/useApiMutation';
import { roleLabel } from '../../lib/labels';
import { PASSWORD_HINT, passwordIssue } from '../../lib/password';
import { ApiErrorState } from '../ui/ApiErrorState';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ConfirmModal } from '../ui/ConfirmModal';
import { FieldError } from '../ui/FieldError';
import { TextField } from '../ui/TextField';

/**
 * The signed-in account's own settings: display name, whether notifications are also emailed, the
 * password (the current one is required; the API then signs out every other device) and signing out
 * of every device. The email address, role and organization are fixed by the server.
 */
export const AccountSettingsCard: React.FC = () => {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [emails, setEmails] = useState(user?.email_notifications ?? true);
  const [saved, setSaved] = useState(false);
  const save = useApiMutation(() => api.account.update({ name: name.trim(), email_notifications: emails }));

  if (!user) return null;
  const changed = name.trim() !== user.name || emails !== user.email_notifications;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card title="الحساب" subtitle="بيانات دخولكم كما يحددها الخادم" accent="blue">
        <div className="space-y-3 text-xs">
          <TextField label="الاسم الظاهر" value={name} onChange={(value) => { setName(value); setSaved(false); }} messages={fieldMessages(save.error, 'name')} maxLength={255} disabled={save.pending} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E6EAF0]">
              <span className="text-[10px] text-[#98A2B3] block">البريد الإلكتروني (للدخول)</span>
              <span className="font-bold text-[#172033]" dir="ltr">{user.email}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E6EAF0]">
              <span className="text-[10px] text-[#98A2B3] block">الدور والجهة</span>
              <span className="font-bold text-[#172033]">{roleLabel(user.role)} · {user.organization?.name ?? '—'}</span>
            </div>
          </div>
          <p className="text-[11px] text-[#98A2B3]">لا يُغيَّر البريد الإلكتروني أو الدور من هنا.</p>
        </div>
      </Card>

      <Card title="الإشعارات" subtitle="تُحفظ كل الإشعارات داخل المنصة دائمًا" accent="purple">
        <div className="space-y-4 text-xs">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" className="mt-0.5 accent-[#002E4A]" checked={emails} onChange={(e) => { setEmails(e.target.checked); setSaved(false); }} disabled={save.pending} />
            <span>
              <span className="font-bold text-[#172033] block">إرسال نسخة من الإشعارات إلى بريدي الإلكتروني</span>
              <span className="text-[#667085]">الطلبات الجديدة والردود والرسائل والعروض وقرارات المركز والفواتير. لا تتضمن الرسائل البريدية نص المفاوضات أو الأسعار أو المستندات.</span>
            </span>
          </label>
          {saved && (
            <div role="status" className="p-2.5 rounded-xl bg-[#E7F8EE] border border-[#C5F0D5] font-semibold text-[#1D7E4C] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> تم حفظ إعدادات الحساب.
            </div>
          )}
          {save.error !== null && fieldMessages(save.error, 'name').length === 0 && <ApiErrorState compact error={save.error} />}
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            disabled={!changed || name.trim() === ''}
            isLoading={save.pending}
            onClick={async () => {
              const result = await save.run();
              if (result.ok) {
                setSaved(true);
                void refresh();
              }
            }}
          >
            حفظ إعدادات الحساب
          </Button>
        </div>
      </Card>

      <PasswordCard />
    </div>
  );
};

/**
 * PUT /me/password needs the current password. On success the API revokes every other token of
 * the account (other devices sign in again) and keeps this one. "Sign out of every device"
 * revokes them all, this one included, then returns to the sign-in page.
 */
const PasswordCard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [hint, setHint] = useState<string | null>(null);
  const [changed, setChanged] = useState(false);
  const [confirmEverywhere, setConfirmEverywhere] = useState(false);
  const change = useApiMutation(() =>
    api.account.changePassword({ current_password: current, password, password_confirmation: confirmation }),
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const problem = current === '' ? 'أدخل كلمة المرور الحالية.' : passwordIssue(password, confirmation);
    setHint(problem);
    if (problem !== null) return;
    const result = await change.run();
    if (result.ok) {
      setChanged(true);
      setCurrent('');
      setPassword('');
      setConfirmation('');
    }
  };

  const currentErrors = fieldMessages(change.error, 'current_password');
  const passwordErrors = fieldMessages(change.error, 'password');
  const edit = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setChanged(false);
    setHint(null);
  };

  return (
    <Card title="كلمة المرور والأجهزة" subtitle="تغيير كلمة المرور يُخرج الأجهزة الأخرى من الحساب" accent="blue" className="lg:col-span-2">
      <form onSubmit={submit} className="space-y-3 text-xs" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <TextField label="كلمة المرور الحالية" type="password" dir="ltr" value={current} onChange={edit(setCurrent)} messages={currentErrors} disabled={change.pending} autoComplete="current-password" />
          <TextField label="كلمة المرور الجديدة" type="password" dir="ltr" value={password} onChange={edit(setPassword)} messages={passwordErrors} disabled={change.pending} autoComplete="new-password" />
          <TextField label="تأكيد كلمة المرور الجديدة" type="password" dir="ltr" value={confirmation} onChange={edit(setConfirmation)} disabled={change.pending} autoComplete="new-password" />
        </div>
        <p className="text-[11px] text-[#98A2B3]">{PASSWORD_HINT}</p>
        {hint !== null && <FieldError messages={[hint]} />}
        {change.error !== null && currentErrors.length === 0 && passwordErrors.length === 0 && <ApiErrorState compact error={change.error} />}
        {changed && (
          <div role="status" className="p-2.5 rounded-xl bg-[#E7F8EE] border border-[#C5F0D5] font-semibold text-[#1D7E4C] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> تم تغيير كلمة المرور، وخرجت الأجهزة الأخرى من الحساب.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="primary" size="sm" icon={KeyRound} isLoading={change.pending}>
            تغيير كلمة المرور
          </Button>
          <Button type="button" variant="outline" size="sm" icon={LogOut} onClick={() => setConfirmEverywhere(true)}>
            تسجيل الخروج من جميع الأجهزة
          </Button>
        </div>
      </form>
      {confirmEverywhere && (
        <ConfirmModal
          title="تسجيل الخروج من جميع الأجهزة"
          description="ستُلغى جميع جلسات الدخول لهذا الحساب، بما فيها هذه الجلسة، وتعود إلى صفحة تسجيل الدخول."
          confirmLabel="تسجيل الخروج من الجميع"
          variant="danger"
          onConfirm={() => logout({ everywhere: true })}
          onDone={() => navigate('/login', { replace: true })}
          onClose={() => setConfirmEverywhere(false)}
        />
      )}
    </Card>
  );
};

