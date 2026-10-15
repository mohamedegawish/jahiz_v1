import type {
  LandingFaqItem,
  LandingHeroTab,
  LandingHowStep,
  LandingQuickFact,
  LandingServiceCard,
  LandingSettings,
} from '../api/types';

/**
 * The bundled landing copy: what visitors see for every field the API leaves
 * unset (LandingSettings nulls / empty lists). The admin page uses the same
 * values as placeholders, so the form always shows what is live right now.
 */
export const HERO_TAB_IDS: LandingHeroTab[] = ['home', 'assessment', 'digital', 'smart', 'results'];

export const HERO_TAB_LABELS: Record<LandingHeroTab, string> = {
  home: 'الرئيسية',
  assessment: 'التقييم',
  digital: 'التحول الرقمي',
  smart: 'المصانع الذكية',
  results: 'النتائج',
};

export const LANDING_DEFAULTS = {
  heroKicker: 'جَاهِزٌ تطوّر مصنعك؟',
  heroHeadline: 'جاهز لمستقبلك الرقمي',
  heroTabHeadlines: {
    home: 'جاهز لمستقبلك الرقمي',
    assessment: 'اعرف مستوى جاهزية مصنعك',
    digital: 'اكتشف أولويات التحول الرقمي',
    smart: 'خطوتك نحو مصنع أكثر ذكاءً',
    results: 'حوّل البيانات إلى قرارات',
  } as Record<LandingHeroTab, string>,
  heroSubtitle: 'المنصة الوطنية لربط المنشآت الصناعية بمقدّمو حلول الأتمتة والذكاء الاصطناعي، بإشراف وحوكمة معتمدة من مركز تحديث الصناعة (IMC).',
  heroPrimaryCta: 'ابدأ تقييم مصنعك',
  heroSecondaryCta: 'اكتشف كيف يعمل',
  trustFacts: ['حوكمة IMC المعتمدة', 'كتالوج معتمد في 7 تصنيفات', 'تقييم الجاهزية الرقمية للمصنع'],
  joinTitle: 'انضم إلى منظومة جَاهِز',
  joinDescription:
    'سجّل منشأتك أو شركتك مباشرة ببريدك وكلمة مرور تختارها، ثم سجّل الدخول فورًا وأكمل ملفك من بوابتك. يظهر مقدّم الخدمة للمصانع بعد اعتماده من مركز تحديث الصناعة.',
  valueTitle: 'منظومة متكاملة لتمكين الصناعة الوطنية',
  valueSubtitle: 'حلول تكنولوجية موثوقة مصممة خصيصاً لمصانع الأغذية، النسيج، الكيماويات، والصناعات الهندسية.',
  aboutParagraph1:
    'جَاهِز (JAHEZ) هي المنصة الوطنية الرقمية التي تربط المنشآت الصناعية بمقدّمو حلول التحول الرقمي والأتمتة والذكاء الاصطناعي، ضمن منظومة موحّدة تديرها وتراقبها مركز تحديث الصناعة (IMC) لضمان جودة الحلول وحماية حقوق الطرفين.',
  aboutParagraph2:
    'تمنح المنصة المصانع طريقاً واضحاً للتحول من التصنيع التقليدي إلى المصنع الذكي (Industry 4.0) عبر تقييم الجاهزية، اختيار الحلول المعتمدة، التفاوض والتعاقد الرقمي، ومتابعة التنفيذ والفواتير — كلها في مكان واحد وبشفافية كاملة.',
  aboutChips: ['حوكمة رسمية من IMC', 'اتفاقيات موثّقة بعد قبول العرض', 'فواتير وسداد وفق السياسة المالية المعتمدة'],
  quickFacts: [
    { value: '7', label: 'تصنيفات حلول صناعية معتمدة' },
    { value: '4', label: 'قطاعات صناعية مستهدفة' },
    { value: '3', label: 'بوابات: مصنع، مقدّم الخدمة، إدارة' },
  ] as LandingQuickFact[],
  servicesTitle: 'خدمات المنصة',
  serviceCards: [
    {
      title: 'تقييم الجاهزية الرقمية',
      description: 'استبيان بركائز متعددة يحدد فئة جاهزية مصنعك ويعرض خارطة طريق وخدمات مقترحة من الكتالوج.',
      meta: 'استبيان الجاهزية',
    },
    {
      title: 'كتالوج وسوق الحلول',
      description: 'تصفح خدمات الكتالوج المعتمدة الموزعة على 7 تصنيفات: ERP، الأتمتة، السحابة، الأمن الصناعي، الذكاء الاصطناعي والهندسة الرقمية.',
      meta: '7 تصنيفات معتمدة',
    },
    {
      title: 'تفاوض وإرسال عروض',
      description: 'مساحة تفاوض مباشرة بين المصنع ومقدّم الخدمة مع رسائل وعروض بأسعار ومدد محددة داخل المنصة.',
      meta: 'عروض ورسائل مباشرة',
    },
    {
      title: 'اتفاقيات وعقود ومدفوعات',
      description: 'اتفاقية موثّقة عند قبول العرض ومسودات عقود بمتطلبات نقل المعرفة، وفواتير ومدفوعات تُفعَّل وفق السياسة المالية المعتمدة.',
      meta: 'عقود ومدفوعات',
    },
  ] as LandingServiceCard[],
  howTitle: 'كيفية الاستخدام',
  howDescription: 'أربع خطوات تفصلك من التسجيل حتى تشغيل أول مشروع تحول رقمي داخل مصنعك.',
  howSteps: [
    {
      title: 'سجّل حسابك',
      description: 'سجّل منشأتك الصناعية أو شركتك كمقدّم خدمة بكلمة مرور تختارها، وادخل إلى بوابتك مباشرة.',
      cta: 'ابدأ التسجيل',
    },
    {
      title: 'قيّم جاهزيتك',
      description: 'أكمل استبيان الجاهزية الرقمية واحصل على نتيجة محسوبة من الخادم بفئة جاهزية مصنعك.',
      cta: 'ابدأ التقييم',
    },
    {
      title: 'اختر حلك المناسب',
      description: 'تصفح كتالوج الخدمات المعتمدة، قارن العروض، وأرسل طلبك للمقدّم الخدمة المناسب.',
      cta: 'افتح الكتالوج',
    },
    {
      title: 'تفاوض وتعاقد',
      description: 'تفاوض مع مقدّم الخدمة، وثّق الاتفاق وأعدّ مسودة العقد، وتابع الفواتير من لوحتك.',
      cta: 'سجّل الدخول',
    },
  ] as LandingHowStep[],
  faqTitle: 'الأسئلة الشائعة',
  faqItems: [
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
      answer: 'سجّل منشأتك الصناعية برقمها المسجل لدى المركز واختر كلمة مرور، ثم سجّل الدخول مباشرة لإكمال ملفك في بوابتك.',
    },
    {
      question: 'كيف يُعتمد مقدّم الخدمة؟',
      answer: 'يراجعه مركز تحديث الصناعة وفق معايير الاعتماد المعتمدة قبل ظهوره للمصانع.',
    },
    {
      question: 'هل العقود والفواتير داخل المنصة؟',
      answer: 'نعم — تفاوض واتفاقيات موثّقة وفواتير تُفعَّل وفق السياسة المالية المعتمدة.',
    },
  ] as LandingFaqItem[],
  ctaTitle: 'هل مصنعك جَاهِز للمستقبل؟',
  ctaSubtitle: 'ابدأ رحلة التحول الرقمي اليوم.',
  ctaButton: 'ابدأ تقييم مصنعك',
  ctaNote: 'يستغرق التقييم بضع دقائق فقط',
  footerAbout: 'المنصة الوطنية لربط المنشآت الصناعية بمقدّمو حلول الأتمتة والذكاء الاصطناعي.',
  footerTagline: 'جَاهِز تطوّر مصنعك؟',
  footerCopyright: 'منصة جَاهِز — جميع الحقوق محفوظة.',
  footerSupervision: 'بإشراف مركز تحديث الصناعة (IMC)',
};

/** One text with its fallback: null, undefined and blank all show the bundled copy. */
export function pick(value: string | null | undefined, fallback: string): string {
  return value == null || value.trim() === '' ? fallback : value;
}

/** One list with its fallback: null or an empty list shows the bundled copy. */
export function pickList<T>(value: T[] | null | undefined, fallback: T[]): T[] {
  return value == null || value.length === 0 ? fallback : value;
}

/** Resolve the logo <img> source: the uploaded logo, else the bundled mark. */
export function logoSrc(settings: LandingSettings | null | undefined, publicUrl: (path: string) => string): string {
  return settings?.logo_path ? publicUrl(settings.logo_path) : '/jahiz-logo-vector.svg';
}
