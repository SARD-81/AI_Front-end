import {z} from 'zod';
import {UNIVERSITY_EMAIL_REGEX} from '@/lib/config/university-email';

const studentIdSchema = z
  .string()
  .min(1, 'شماره دانشجویی الزامی است.')
  .regex(/^\d+$/, 'شماره دانشجویی باید فقط شامل رقم باشد.')
  .min(5, 'شماره دانشجویی باید حداقل ۵ رقم باشد.')
  .max(12, 'شماره دانشجویی نباید بیشتر از ۱۲ رقم باشد.');

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'ورود شماره دانشجویی یا ایمیل الزامی است.')
    .refine(
      (value) => {
        const trimmedValue = value.trim();

        if (trimmedValue.includes('@')) {
          return UNIVERSITY_EMAIL_REGEX.test(trimmedValue);
        }

        return /^\d{5,12}$/.test(trimmedValue);
      },
      {message: 'شناسه باید شماره دانشجویی معتبر یا ایمیل دانشگاهی مجاز باشد.'}
    ),
  password: z.string().min(1, 'رمز عبور الزامی است.')
});

export const signupStep1EmailSchema = z.object({
  email: z
    .string()
    .min(1, 'ایمیل دانشگاهی الزامی است.')
    .email('فرمت ایمیل معتبر نیست.')
    .refine((value) => UNIVERSITY_EMAIL_REGEX.test(value.trim()), 'ایمیل باید در دامنه دانشگاهی مجاز باشد.')
});

export const signupStep1Schema = signupStep1EmailSchema.extend({
  otpCode: z.string().min(1, 'کد تایید الزامی است.').regex(/^\d{6}$/, 'کد تایید باید دقیقا ۶ رقم باشد.')
});

const passwordSchema = z
  .string()
  .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد.')
  .regex(/[A-Z]/, 'رمز عبور باید حداقل یک حرف بزرگ داشته باشد.')
  .regex(/[a-z]/, 'رمز عبور باید حداقل یک حرف کوچک داشته باشد.')
  .regex(/[0-9]/, 'رمز عبور باید حداقل یک عدد داشته باشد.')
  .regex(/[^A-Za-z0-9]/, 'رمز عبور باید حداقل یک نماد داشته باشد.');

export const signupStep2Schema = z
  .object({
    firstName: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد.'),
    lastName: z.string().min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد.'),
    studentId: studentIdSchema,
    degreeLevel: z.string().min(1, 'مقطع تحصیلی الزامی است.'),
    faculty: z.string().min(1, 'دانشکده الزامی است.'),
    major: z.string().min(2, 'رشته تحصیلی باید حداقل ۲ کاراکتر باشد.'),
    specialization: z.string().optional(),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'تکرار رمز عبور الزامی است.')
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'تکرار رمز عبور با رمز عبور یکسان نیست.',
    path: ['confirmPassword']
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupStep1EmailValues = z.infer<typeof signupStep1EmailSchema>;
export type SignupStep1Values = z.infer<typeof signupStep1Schema>;
export type SignupStep2Values = z.infer<typeof signupStep2Schema>;
