/**
 * Front-end source of truth for Shahid Beheshti University's academic
 * structure (faculty -> major -> degree level -> specialization).
 *
 * Why this file exists:
 * The backend contract accepts `faculty`, `major`, `degree_level` and
 * `specialization` as free-form strings, so nothing stops a user from typing
 * an impossible combination ("Computer Engineering" inside the Law faculty, or
 * a specialization for a bachelor's degree, which SBU does not offer).
 * Keeping the taxonomy here lets the UI render dependent dropdowns and only
 * ever submit a combination that actually exists.
 *
 * Editing rules:
 * - Labels are the exact strings sent to the API, so keep them canonical.
 * - A major only offers the degree levels listed in `degrees`.
 * - `specializations` is keyed by degree level. A missing/empty list means the
 *   specialization field must be hidden and cleared (bachelor's degrees).
 */

export const DEGREE_LEVELS = ['کارشناسی', 'کارشناسی ارشد', 'دکتری'] as const;

export type DegreeLevel = (typeof DEGREE_LEVELS)[number];

export type AcademicMajor = {
  label: string;
  degrees: DegreeLevel[];
  /** Specializations per degree level. Bachelor's degrees have none at SBU. */
  specializations?: Partial<Record<DegreeLevel, string[]>>;
};

export type AcademicFaculty = {
  label: string;
  majors: AcademicMajor[];
};

const GRADUATE: DegreeLevel[] = ['کارشناسی ارشد', 'دکتری'];
const ALL_DEGREES: DegreeLevel[] = ['کارشناسی', 'کارشناسی ارشد', 'دکتری'];

export const ACADEMIC_FACULTIES: AcademicFaculty[] = [
  {
    label: 'دانشکده مهندسی برق و کامپیوتر',
    majors: [
      {
        label: 'مهندسی کامپیوتر',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': [
            'نرم‌افزار',
            'هوش مصنوعی و رباتیکز',
            'معماری سیستم‌های کامپیوتری',
            'شبکه‌های کامپیوتری',
            'رایانش امن (امنیت اطلاعات)',
            'الگوریتم‌ها و محاسبات'
          ],
          'دکتری': [
            'نرم‌افزار',
            'هوش مصنوعی و رباتیکز',
            'معماری سیستم‌های کامپیوتری',
            'شبکه‌های کامپیوتری',
            'الگوریتم‌ها و محاسبات'
          ]
        }
      },
      {
        label: 'مهندسی فناوری اطلاعات',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['شبکه‌های کامپیوتری', 'تجارت الکترونیکی', 'مدیریت سیستم‌های اطلاعاتی']
        }
      },
      {
        label: 'مهندسی برق',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': [
            'الکترونیک',
            'مخابرات',
            'کنترل',
            'قدرت',
            'مهندسی پزشکی (بیوالکتریک)',
            'سیستم‌های مخابراتی و میدان'
          ],
          'دکتری': ['الکترونیک', 'مخابرات', 'کنترل', 'قدرت', 'مهندسی پزشکی (بیوالکتریک)']
        }
      }
    ]
  },
  {
    label: 'دانشکده علوم ریاضی',
    majors: [
      {
        label: 'علوم کامپیوتر',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['علوم داده', 'محاسبات علمی', 'نظریه محاسبه'],
          'دکتری': ['علوم داده', 'نظریه محاسبه']
        }
      },
      {
        label: 'ریاضیات و کاربردها',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['ریاضی محض', 'ریاضی کاربردی', 'رمز و کد'],
          'دکتری': ['ریاضی محض', 'ریاضی کاربردی']
        }
      },
      {
        label: 'آمار',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['آمار ریاضی', 'آمار اجتماعی و اقتصادی'],
          'دکتری': ['آمار']
        }
      }
    ]
  },
  {
    label: 'دانشکده مهندسی و علوم کامپیوتر',
    majors: [
      {
        label: 'مهندسی نرم‌افزار',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['مهندسی نرم‌افزار', 'سیستم‌های اطلاعاتی'],
          'دکتری': ['مهندسی نرم‌افزار']
        }
      },
      {
        label: 'هوش مصنوعی',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['یادگیری ماشین', 'بینایی ماشین و پردازش تصویر', 'پردازش زبان طبیعی'],
          'دکتری': ['یادگیری ماشین', 'بینایی ماشین و پردازش تصویر']
        }
      }
    ]
  },
  {
    label: 'دانشکده مهندسی عمران، آب و محیط زیست',
    majors: [
      {
        label: 'مهندسی عمران',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['سازه', 'زلزله', 'ژئوتکنیک', 'راه و ترابری', 'مدیریت ساخت', 'مهندسی آب و سازه‌های هیدرولیکی'],
          'دکتری': ['سازه', 'زلزله', 'ژئوتکنیک', 'مهندسی آب']
        }
      },
      {
        label: 'مهندسی محیط زیست',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['آب و فاضلاب', 'آلودگی هوا', 'مواد زائد جامد']
        }
      }
    ]
  },
  {
    label: 'دانشکده مهندسی مکانیک و انرژی',
    majors: [
      {
        label: 'مهندسی مکانیک',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['تبدیل انرژی', 'طراحی کاربردی', 'ساخت و تولید', 'مکاترونیک'],
          'دکتری': ['تبدیل انرژی', 'طراحی کاربردی']
        }
      },
      {
        label: 'مهندسی سیستم‌های انرژی',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['سیستم‌های انرژی', 'انرژی‌های تجدیدپذیر']
        }
      }
    ]
  },
  {
    label: 'دانشکده مهندسی هسته‌ای',
    majors: [
      {
        label: 'مهندسی هسته‌ای',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['راکتور', 'پرتوپزشکی', 'کاربرد پرتوها'],
          'دکتری': ['راکتور', 'کاربرد پرتوها']
        }
      }
    ]
  },
  {
    label: 'دانشکده فیزیک',
    majors: [
      {
        label: 'فیزیک',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['فیزیک ذرات بنیادی', 'ماده چگال', 'اپتیک و لیزر', 'اتمی و مولکولی'],
          'دکتری': ['فیزیک ذرات بنیادی', 'ماده چگال', 'اپتیک و لیزر']
        }
      }
    ]
  },
  {
    label: 'دانشکده علوم شیمی و نفت',
    majors: [
      {
        label: 'شیمی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['شیمی آلی', 'شیمی تجزیه', 'شیمی فیزیک', 'شیمی معدنی'],
          'دکتری': ['شیمی آلی', 'شیمی تجزیه', 'شیمی فیزیک', 'شیمی معدنی']
        }
      },
      {
        label: 'مهندسی شیمی',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['فرآیند', 'پلیمر']
        }
      }
    ]
  },
  {
    label: 'دانشکده علوم و فناوری زیستی',
    majors: [
      {
        label: 'زیست‌شناسی سلولی و مولکولی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['ژنتیک', 'بیوشیمی', 'بیوفیزیک', 'میکروبیولوژی'],
          'دکتری': ['ژنتیک مولکولی', 'بیوشیمی']
        }
      },
      {
        label: 'زیست‌فناوری (بیوتکنولوژی)',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['زیست‌فناوری میکروبی', 'زیست‌فناوری مولکولی']
        }
      }
    ]
  },
  {
    label: 'دانشکده علوم زمین',
    majors: [
      {
        label: 'زمین‌شناسی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['تکتونیک', 'زمین‌شناسی اقتصادی', 'آب‌شناسی'],
          'دکتری': ['تکتونیک', 'زمین‌شناسی اقتصادی']
        }
      },
      {
        label: 'جغرافیا',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['برنامه‌ریزی شهری', 'ژئومورفولوژی', 'سنجش از دور و GIS'],
          'دکتری': ['برنامه‌ریزی شهری', 'ژئومورفولوژی']
        }
      }
    ]
  },
  {
    label: 'دانشکده مدیریت و حسابداری',
    majors: [
      {
        label: 'مدیریت بازرگانی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['بازاریابی', 'مدیریت استراتژیک', 'تجارت الکترونیکی'],
          'دکتری': ['بازاریابی', 'مدیریت استراتژیک']
        }
      },
      {
        label: 'حسابداری',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['حسابداری', 'حسابرسی'],
          'دکتری': ['حسابداری']
        }
      },
      {
        label: 'مدیریت فناوری اطلاعات',
        degrees: GRADUATE,
        specializations: {
          'کارشناسی ارشد': ['کسب‌وکار الکترونیک', 'مدیریت دانش', 'هوشمندی کسب‌وکار']
        }
      }
    ]
  },
  {
    label: 'دانشکده علوم اقتصادی و سیاسی',
    majors: [
      {
        label: 'اقتصاد',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['اقتصاد نظری', 'اقتصاد انرژی', 'توسعه اقتصادی و برنامه‌ریزی'],
          'دکتری': ['اقتصاد نظری', 'اقتصاد بین‌الملل']
        }
      },
      {
        label: 'علوم سیاسی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['روابط بین‌الملل', 'اندیشه سیاسی', 'مطالعات منطقه‌ای'],
          'دکتری': ['روابط بین‌الملل', 'اندیشه سیاسی']
        }
      }
    ]
  },
  {
    label: 'دانشکده حقوق',
    majors: [
      {
        label: 'حقوق',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['حقوق خصوصی', 'حقوق جزا و جرم‌شناسی', 'حقوق عمومی', 'حقوق بین‌الملل'],
          'دکتری': ['حقوق خصوصی', 'حقوق جزا و جرم‌شناسی', 'حقوق بین‌الملل']
        }
      }
    ]
  },
  {
    label: 'دانشکده علوم تربیتی و روان‌شناسی',
    majors: [
      {
        label: 'روان‌شناسی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['روان‌شناسی بالینی', 'روان‌شناسی تربیتی', 'روان‌شناسی عمومی'],
          'دکتری': ['روان‌شناسی بالینی', 'روان‌شناسی سلامت']
        }
      },
      {
        label: 'علوم تربیتی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['برنامه‌ریزی درسی', 'مدیریت آموزشی', 'تکنولوژی آموزشی'],
          'دکتری': ['برنامه‌ریزی درسی', 'مدیریت آموزشی']
        }
      }
    ]
  },
  {
    label: 'دانشکده ادبیات و علوم انسانی',
    majors: [
      {
        label: 'زبان و ادبیات فارسی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['ادبیات محض', 'ادبیات تطبیقی'],
          'دکتری': ['زبان و ادبیات فارسی']
        }
      },
      {
        label: 'زبان و ادبیات انگلیسی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['آموزش زبان انگلیسی', 'مترجمی زبان انگلیسی', 'ادبیات انگلیسی']
        }
      },
      {
        label: 'تاریخ',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['تاریخ ایران اسلامی', 'تاریخ ایران باستان']
        }
      }
    ]
  },
  {
    label: 'دانشکده معماری و شهرسازی',
    majors: [
      {
        label: 'مهندسی معماری',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['معماری', 'معماری منظر', 'انرژی و معماری', 'مرمت بناهای تاریخی'],
          'دکتری': ['معماری']
        }
      },
      {
        label: 'شهرسازی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['برنامه‌ریزی شهری', 'طراحی شهری'],
          'دکتری': ['شهرسازی']
        }
      }
    ]
  },
  {
    label: 'دانشکده الهیات و ادیان',
    majors: [
      {
        label: 'فقه و مبانی حقوق اسلامی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['فقه و مبانی حقوق اسلامی'],
          'دکتری': ['فقه و مبانی حقوق اسلامی']
        }
      },
      {
        label: 'ادیان و عرفان',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['ادیان و عرفان تطبیقی']
        }
      }
    ]
  },
  {
    label: 'دانشکده تربیت بدنی و علوم ورزشی',
    majors: [
      {
        label: 'علوم ورزشی',
        degrees: ALL_DEGREES,
        specializations: {
          'کارشناسی ارشد': ['فیزیولوژی ورزشی', 'مدیریت ورزشی', 'بیومکانیک ورزشی'],
          'دکتری': ['فیزیولوژی ورزشی', 'مدیریت ورزشی']
        }
      }
    ]
  }
];

// -------------------------------------------------------------- lookups

export function getFaculties(): string[] {
  return ACADEMIC_FACULTIES.map((faculty) => faculty.label);
}

export function getFaculty(facultyLabel: string): AcademicFaculty | undefined {
  return ACADEMIC_FACULTIES.find((faculty) => faculty.label === facultyLabel);
}

export function getMajors(facultyLabel: string): string[] {
  return getFaculty(facultyLabel)?.majors.map((major) => major.label) ?? [];
}

export function getMajor(facultyLabel: string, majorLabel: string): AcademicMajor | undefined {
  return getFaculty(facultyLabel)?.majors.find((major) => major.label === majorLabel);
}

/** Faculties that actually teach the given major (used for reverse lookups). */
export function getFacultiesForMajor(majorLabel: string): string[] {
  return ACADEMIC_FACULTIES.filter((faculty) =>
    faculty.majors.some((major) => major.label === majorLabel)
  ).map((faculty) => faculty.label);
}

export function getDegreeLevels(facultyLabel: string, majorLabel: string): DegreeLevel[] {
  return getMajor(facultyLabel, majorLabel)?.degrees ?? [];
}

/**
 * Specializations for a (faculty, major, degree) triple. Bachelor's degrees
 * intentionally return an empty list: SBU does not split them into branches.
 */
export function getSpecializations(
  facultyLabel: string,
  majorLabel: string,
  degreeLevel: string
): string[] {
  if (degreeLevel === 'کارشناسی') return [];
  const major = getMajor(facultyLabel, majorLabel);
  if (!major) return [];
  return major.specializations?.[degreeLevel as DegreeLevel] ?? [];
}

export function supportsSpecialization(
  facultyLabel: string,
  majorLabel: string,
  degreeLevel: string
): boolean {
  return getSpecializations(facultyLabel, majorLabel, degreeLevel).length > 0;
}

export function isValidAcademicSelection(input: {
  faculty?: string;
  major?: string;
  degreeLevel?: string;
  specialization?: string;
}): boolean {
  const {faculty = '', major = '', degreeLevel = '', specialization = ''} = input;
  const majorEntry = getMajor(faculty, major);
  if (!majorEntry) return false;
  if (!majorEntry.degrees.includes(degreeLevel as DegreeLevel)) return false;
  const options = getSpecializations(faculty, major, degreeLevel);
  if (options.length === 0) return specialization.trim().length === 0;
  return options.includes(specialization);
}
