import React, { useState } from 'react';
import { Download, Hash, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { api, fieldMessages } from '../../api';
import type { ImcNumbersImportResult, ImcRegisteredNumber } from '../../api';
import { useApiMutation } from '../../hooks/useApiMutation';
import { useApiQuery } from '../../hooks/useApiQuery';
import { toApiQuery, useListParams, useSearchBox } from '../../hooks/useListParams';
import { formatDate } from '../../lib/format';
import { ApiErrorState } from '../../components/ui/ApiErrorState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { FieldError } from '../../components/ui/FieldError';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import { QueryBoundary } from '../../components/ui/QueryBoundary';
import { SearchInput } from '../../components/ui/SearchInput';
import { TableSkeleton } from '../../components/ui/LoadingState';
import { TextField } from '../../components/ui/TextField';

const SORTS = [
  { value: '', label: 'ترتيب الإضافة' },
  { value: 'newest', label: 'الأحدث إضافة' },
  { value: 'oldest', label: 'الأقدم إضافة' },
  { value: 'name', label: 'الاسم (أ–ي)' },
  { value: 'number', label: 'الرقم (أ–ي)' },
];

const selectClass =
  'w-full py-2 px-3 text-xs bg-white border border-[#E6EAF0] rounded-xl text-[#172033] focus:outline-none focus:border-[#004A93]';

/**
 * IMC administration of the factory numbers IMC registered (the "الرقم المسجل لدى IMC"
 * whitelist): single rows by hand, or a bulk import from an Excel/CSV file of name +
 * number. A factory self-registration is accepted only for a number on this list,
 * matched by the number only — the name is informational.
 */
export const ImcNumbersManagement: React.FC = () => {
  const list = useListParams([] as const);
  const search = useSearchBox(list.search, list.setSearch);
  const [form, setForm] = useState<{ row: ImcRegisteredNumber | null } | null>(null);
  const [deleting, setDeleting] = useState<ImcRegisteredNumber | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const query = useApiQuery(
    (signal) => api.imcNumbers.list({ ...toApiQuery(list), signal }),
    [list.page, list.perPage, list.search, list.sort],
  );

  const downloadTemplate = () => {
    const csv = '﻿name,number\nمصنع مثال,IMC-2026-001\n';
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'imc-numbers-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#172033] tracking-tight">أرقام IMC المسجلة</h2>
          <p className="text-xs sm:text-sm text-[#667085] mt-0.5">
            قائمة الأرقام المسجلة لدى الهيئة: تسجيل المصنع يُقبل فقط لرقم موجود في هذه القائمة (المطابقة بالرقم فقط)، ومن يدخل رقمًا غير مسجل يُطلب منه التواصل مع الهيئة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={downloadTemplate}>
            نموذج ملف الاستيراد
          </Button>
          <Button variant="secondary" size="sm" icon={Upload} onClick={() => setImportOpen(true)}>
            استيراد من Excel
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setForm({ row: null })}>
            إضافة رقم
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchInput value={search.value} onChange={search.onChange} placeholder="بحث بالاسم أو الرقم..." className="w-full" />
          <select aria-label="الترتيب" value={list.sort} onChange={(e) => list.setSort(e.target.value)} className={selectClass}>
            {SORTS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-[#667085]">
          <span aria-live="polite">{query.data ? `${query.data.meta.total} رقم مسجل` : ''}</span>
          <Button variant="outline" size="sm" onClick={list.reset} disabled={!list.hasActiveFilters}>
            إعادة ضبط الفلاتر
          </Button>
        </div>
      </Card>

      {notice && (
        <p role="status" className="p-3 rounded-xl bg-[#E7F8EE] text-xs font-semibold text-[#1D7E4C]">
          {notice}
        </p>
      )}

      <QueryBoundary
        query={query}
        loading={<TableSkeleton rows={5} cols={3} />}
        isEmpty={(page) => page.data.length === 0}
        empty={
          <EmptyState
            icon={Hash}
            title={list.hasActiveFilters ? 'لم يتم العثور على أرقام مطابقة' : 'لا توجد أرقام مسجلة بعد'}
            description={
              list.hasActiveFilters
                ? 'جرب تعديل البحث لعرض الأرقام المسجلة.'
                : 'أضف أول رقم مسجل لدى الهيئة يدويًا، أو استورد قائمة كاملة من ملف Excel.'
            }
            actionText={list.hasActiveFilters ? 'إعادة ضبط الفلاتر' : 'إضافة رقم'}
            onAction={list.hasActiveFilters ? list.reset : () => setForm({ row: null })}
          />
        }
      >
        {(page) => (
          <>
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#F7F9FC] text-[#667085]">
                      <th className="text-right font-bold px-4 py-3">اسم المصنع</th>
                      <th className="text-right font-bold px-4 py-3">الرقم المسجل لدى IMC</th>
                      <th className="text-right font-bold px-4 py-3">تاريخ الإضافة</th>
                      <th className="text-right font-bold px-4 py-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.data.map((row) => (
                      <tr key={row.id} className="border-t border-[#E6EAF0] hover:bg-[#F7F9FC]">
                        <td className="px-4 py-3 font-bold text-[#172033]">{row.name}</td>
                        <td className="px-4 py-3 font-semibold text-[#002E4A]" dir="ltr" align="right">
                          {row.number}
                        </td>
                        <td className="px-4 py-3 text-[#667085]">{formatDate(row.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" icon={Pencil} aria-label={`تعديل ${row.number}`} onClick={() => setForm({ row })}>
                              تعديل
                            </Button>
                            <Button variant="ghost" size="sm" icon={Trash2} aria-label={`حذف ${row.number}`} onClick={() => setDeleting(row)}>
                              حذف
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Pagination meta={page.meta} onPage={list.setPage} onPerPage={list.setPerPage} />
          </>
        )}
      </QueryBoundary>

      {form && (
        <ImcNumberFormModal
          key={form.row?.id ?? 'new'}
          row={form.row}
          onClose={() => setForm(null)}
          onSaved={(saved, isNew) => {
            setForm(null);
            setNotice(isNew ? `تمت إضافة الرقم ${saved.number} إلى القائمة.` : `تم تحديث الرقم ${saved.number}.`);
            query.refetch();
          }}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="حذف الرقم المسجل"
          description={`حذف الرقم ${deleting.number} (${deleting.name}) نهائيًا؟ المصانع التي تحمل هذا الرقم لن تتمكن من التسجيل به بعد الحذف.`}
          confirmLabel="حذف"
          variant="danger"
          onConfirm={() => api.imcNumbers.remove(deleting.id)}
          onDone={() => {
            setNotice(`تم حذف الرقم ${deleting.number} من القائمة.`);
            setDeleting(null);
            query.refetch();
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {importOpen && (
        <ImcNumberImportModal
          onClose={() => setImportOpen(false)}
          onDone={(result) => {
            setImportOpen(false);
            setNotice(
              `اكتمل الاستيراد: ${result.created} رقم جديد، ${result.updated} رقم محدّث، ${result.skipped} صف فارغ متجاهَل، ${result.errors.length} صف مرفوض.`,
            );
            query.refetch();
          }}
        />
      )}
    </div>
  );
};

const ImcNumberFormModal: React.FC<{
  row: ImcRegisteredNumber | null;
  onClose: () => void;
  onSaved: (saved: ImcRegisteredNumber, isNew: boolean) => void;
}> = ({ row, onClose, onSaved }) => {
  const [name, setName] = useState(row?.name ?? '');
  const [number, setNumber] = useState(row?.number ?? '');
  const save = useApiMutation((payload: { name: string; number: string }) =>
    row ? api.imcNumbers.update(row.id, payload) : api.imcNumbers.create(payload),
  );
  const busy = save.pending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = await save.run({ name: name.trim(), number: number.trim() });
    if (result.ok) onSaved(result.data, row === null);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={row ? `تعديل الرقم ${row.number}` : 'إضافة رقم مسجل لدى الهيئة'}
      subtitle="المطابقة عند التسجيل تتم بالرقم فقط — الاسم للتعريف الإداري."
      maxWidth="lg"
      footer={
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" isLoading={save.pending} disabled={busy} onClick={handleSubmit}>
            {row ? 'حفظ التعديل' : 'إضافة الرقم'}
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={onClose}>
            إلغاء
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {save.error !== null && <ApiErrorState compact error={save.error} />}
        <TextField
          label="اسم المصنع"
          required
          value={name}
          onChange={setName}
          messages={fieldMessages(save.error, 'name')}
          maxLength={255}
          disabled={busy}
        />
        <TextField
          label="الرقم المسجل لدى IMC"
          required
          dir="ltr"
          value={number}
          onChange={setNumber}
          messages={fieldMessages(save.error, 'number')}
          maxLength={50}
          disabled={busy}
        />
        <FieldError messages={fieldMessages(save.error, 'number')} />
      </form>
    </Modal>
  );
};

const IMPORT_ACCEPT = '.xlsx,.csv';

const ImcNumberImportModal: React.FC<{ onClose: () => void; onDone: (result: ImcNumbersImportResult) => void }> = ({
  onClose,
  onDone,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const [result, setResult] = useState<ImcNumbersImportResult | null>(null);
  const upload = useApiMutation((uploadFile: File) => api.imcNumbers.importFile(uploadFile));

  const pickFile = (picked: File | null) => {
    setFileProblem(null);
    setResult(null);
    setFile(null);
    if (!picked) return;
    const lower = picked.name.toLowerCase();
    const ok = lower.endsWith('.xlsx') || lower.endsWith('.csv');
    if (!ok) {
      setFileProblem('اختر ملف Excel (.xlsx) أو CSV بعمودين: الاسم ثم الرقم.');
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setFileProblem('حجم الملف يتجاوز 5 ميجابايت.');
      return;
    }
    setFile(picked);
  };

  const confirmUpload = async () => {
    if (!file) return;
    const outcome = await upload.run(file);
    if (outcome.ok) setResult(outcome.data);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="استيراد الأرقام من ملف Excel"
      subtitle="ملف (.xlsx أو .csv) بعمودين: اسم المصنع ثم الرقم. الصف الأول عنوان يُتجاهل تلقائيًا. الأرقام الموجودة مسبقًا يُحدَّث اسمها — لا تُكرر."
      maxWidth="lg"
      footer={
        <div className="flex items-center gap-2">
          {result ? (
            <Button variant="primary" size="sm" onClick={() => onDone(result)}>
              تم — إغلاق
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" icon={Upload} isLoading={upload.pending} disabled={!file || upload.pending} onClick={confirmUpload}>
                بدء الاستيراد
              </Button>
              <Button variant="outline" size="sm" disabled={upload.pending} onClick={onClose}>
                إلغاء
              </Button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-3 text-xs">
        {result === null && (
          <>
            <label className="flex items-center gap-2 p-3 rounded-xl border border-dashed border-[#CCD5E2] cursor-pointer hover:bg-[#F7F9FC]">
              <Upload className="w-4 h-4 text-[#002E4A]" />
              <span className="truncate font-bold text-[#172033]">{file ? file.name : 'اختيار ملف Excel أو CSV'}</span>
              <input
                type="file"
                accept={IMPORT_ACCEPT}
                className="hidden"
                disabled={upload.pending}
                onChange={(e) => {
                  pickFile(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
            <FieldError messages={fileProblem ? [fileProblem] : fieldMessages(upload.error, 'file')} />
            {upload.error !== null && <ApiErrorState compact error={upload.error} />}
            <p className="text-[11px] text-[#98A2B3] leading-relaxed">
              مثال لصف: «مصنع النيل للأغذية» في العمود الأول، و«IMC-2026-001» في الثاني. الصفوف الفارغة تُتجاهل، والصفوف الناقصة تُعرض أرقامها بعد الاستيراد دون إيقافه.
            </p>
          </>
        )}

        {result !== null && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-xl bg-[#E7F8EE] text-center">
                <div className="text-lg font-black text-[#1D7E4C]">{result.created}</div>
                <div className="font-bold text-[#1D7E4C]">جديد</div>
              </div>
              <div className="p-3 rounded-xl bg-[#DDEBFD] text-center">
                <div className="text-lg font-black text-[#003a75]">{result.updated}</div>
                <div className="font-bold text-[#003a75]">محدّث</div>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E6EAF0] text-center">
                <div className="text-lg font-black text-[#667085]">{result.skipped}</div>
                <div className="font-bold text-[#667085]">فارغ متجاهَل</div>
              </div>
              <div className="p-3 rounded-xl bg-[#FDECEE] text-center">
                <div className="text-lg font-black text-[#B82B3B]">{result.errors.length}</div>
                <div className="font-bold text-[#B82B3B]">مرفوض</div>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-xl border border-[#F7C6CD] overflow-hidden">
                <div className="px-3 py-2 bg-[#FDECEE] font-bold text-[#B82B3B]">صفوف مرفوضة (لم تُستورد)</div>
                <ul className="max-h-48 overflow-y-auto divide-y divide-[#F1F4F9]">
                  {result.errors.map((item) => (
                    <li key={item.row} className="px-3 py-2 flex items-center justify-between gap-2">
                      <span className="text-[#667085]">
                        الصف {item.row}
                        {item.number ? (
                          <>
                            {' — '}
                            <span dir="ltr" className="font-semibold text-[#172033]">
                              {item.number}
                            </span>
                          </>
                        ) : (
                          ''
                        )}
                      </span>
                      <span className="text-[#B82B3B] font-semibold" dir="auto">
                        {item.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};
