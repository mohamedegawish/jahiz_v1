import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';

/** Standalone 404 page for unknown client routes (replaces the silent redirect home). */
export const NotFound: React.FC = () => (
  <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center bg-[#F7F9FC] px-4 text-center">
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDEBFD] text-[#003a75]">
      <Compass className="h-7 w-7" aria-hidden="true" />
    </span>
    <p dir="ltr" className="mt-4 text-5xl font-black tracking-tight text-[#002E4A]">
      404
    </p>
    <h1 className="mt-2 text-xl font-extrabold text-[#172033]">الصفحة غير موجودة</h1>
    <p className="mt-1 max-w-sm text-xs leading-relaxed text-[#667085]">
      الرابط الذي فتحته لا يشير إلى صفحة في المنصة. تحقق من العنوان أو عُد للصفحة الرئيسية.
    </p>
    <Link
      to="/"
      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#002E4A] px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#002E4A]"
    >
      <Home className="h-4 w-4" aria-hidden="true" />
      الصفحة الرئيسية
    </Link>
  </div>
);

