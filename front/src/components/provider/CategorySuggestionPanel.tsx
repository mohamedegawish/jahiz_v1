import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { api, fieldMessages } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { FieldError } from '../ui/FieldError';
import { Modal } from '../ui/Modal';
import { QueryBoundary } from '../ui/QueryBoundary';
import { TextField } from '../ui/TextField';

/**
 * A provider suggests a category missing from the catalog. IMC reviews it;
 * an approved suggestion becomes a workbook candidate (it never creates a catalog
 * row by itself). Rejection needs no action beyond reading the reason.
 */
export const CategorySuggestionPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const suggestions = useApiQuery((signal) => api.categorySuggestions.list({ per_page: 20, signal }), []);

  return (
    <Card
      title="اقتراح تصنيف جديد"
      subtitle="تصنيف غير موجود في الكتالوج؟ اقترحه هنا، تراجعه الوزارة قبل اعتماده واستخدامه."
      accent="purple"
      action={
        <Button variant="primary" size="sm" icon={Plus} onClick={() => setOpen(true)}>
          اقتراح تصنيف
        </Button>
      }
    >
      <QueryBoundary query={suggestions} loading={<p className="text-xs text-[#667085]">جارٍ التحميل...</p>}>
        {(page) => (
          <div className="space-y-2 text-xs">
            {page.data.length === 0 && (
              <p className="text-[#667085]">لم تقترحوا أي تصنيف بعد.</p>
            )}
            {page.data.map((s) => (
              <div key={s.id} className="p-3 rounded-xl border border-[#E6EAF0] bg-white space-y-1" data-suggestion={s.id}>
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-[#172033]">{s.name_ar}</strong>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      s.status === 'approved'
                        ? 'bg-[#E7F8EE] text-[#1D7E4C]'
                        : s.status === 'rejected'
                          ? 'bg-[#FDECEE] text-[#B82B3B]'
                          : 'bg-[#FEF5E7] text-[#A66F0B]'
                    }`}
                  >
                    {s.status === 'approved' ? 'معتمد (مرشح للكتالوج)' : s.status === 'rejected' ? 'مرفوض' : 'بانتظار المراجعة'}
                  </span>
                </div>
                {s.description && <p className="text-[#667085]" dir="auto">{s.description}</p>}
                {s.review_reason && <p className="text-[#667085]" dir="auto">رد الوزارة: {s.review_reason}</p>}
              </div>
            ))}
          </div>
        )}
      </QueryBoundary>
      {open && (
        <SuggestionModal
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            suggestions.refetch();
          }}
        />
      )}
    </Card>
  );
};

const SuggestionModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({ onClose, onCreated }) => {
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const create = useApiMutation(() =>
    api.categorySuggestions.create({
      name_ar: nameAr.trim(),
      ...(nameEn.trim() ? { name_en: nameEn.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(reason.trim() ? { reason: reason.trim() } : {}),
    }),
  );
  const errors = (field: string) => fieldMessages(create.error, field);

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="اقتراح تصنيف جديد"
      subtitle="يصل الاقتراح إلى الوزارة للمراجعة والموافقة قبل اعتماده واستخدامه."
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={create.pending}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={create.pending}
            disabled={nameAr.trim() === ''}
            onClick={async () => {
              const result = await create.run();
              if (result.ok) onCreated();
            }}
          >
            إرسال الاقتراح
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <TextField label="اسم التصنيف (عربي)" required value={nameAr} onChange={setNameAr} messages={errors('name_ar')} maxLength={255} disabled={create.pending} />
        <TextField label="الاسم الإنجليزي (اختياري)" dir="ltr" value={nameEn} onChange={setNameEn} messages={errors('name_en')} maxLength={255} disabled={create.pending} />
        <TextField label="وصف التصنيف والخدمات التي يشملها" rows={3} value={description} onChange={setDescription} messages={errors('description')} disabled={create.pending} />
        <TextField label="لماذا يحتاجه السوق؟ (اختياري)" rows={2} value={reason} onChange={setReason} messages={errors('reason')} disabled={create.pending} />
        <FieldError messages={errors('status')} />
      </div>
    </Modal>
  );
};
