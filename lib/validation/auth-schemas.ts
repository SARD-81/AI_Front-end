import {z} from 'zod';

const studentIdSchema = z
  .string()
  .min(1, 'شماره دانشجویی الزامی است.')
  .regex(/^\d+$/, 'شماره دانشجویی باید فقط شامل رقم باشد.')
  .min(5, 'شماره دانشجویی باید حداقل ۵ رقم باشد.')
  .max(12, 'شماره دانشجویی نباید بیشتر از ۱۲ رقم باشد.');

const emailRegex = /^[^\s@]+@(mail|student)\.sbu\.ac\.ir$/i;

export const loginSchema = z.object({
  studentId: studentIdSchema,
  password: z.string().min(1, 'رمز عبور الزامی است.').min(6, 'رمز عبور باید حداقل ۶ کاراکتر باشد.')
});

export const signupStep1EmailSchema = z.object({
  email: z
    .string()
    .min(1, 'ایمیل دانشگاهی الزامی است.')
    .regex(emailRegex, 'ایمیل باید با دامنه mail.sbu.ac.ir یا student.sbu.ac.ir باشد.')
});

export const signupStep1Schema = signupStep1EmailSchema.extend({
  code: z.string().min(1, 'کد تایید الزامی است.').regex(/^\d{6}$/, 'کد تایید باید دقیقا ۶ رقم باشد.')
});

export const signupStep2Schema = z.object({
  firstName: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد.'),
  lastName: z.string().min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد.'),
  studentId: studentIdSchema,
  degree: z.string().min(1, 'مقطع تحصیلی الزامی است.'),
  faculty: z.string().min(1, 'دانشکده الزامی است.'),
  major: z.string().min(2, 'رشته تحصیلی باید حداقل ۲ کاراکتر باشد.'),
  specialization: z.string().optional()
});

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupStep1EmailValues = z.infer<typeof signupStep1EmailSchema>;
export type SignupStep1Values = z.infer<typeof signupStep1Schema>;
export type SignupStep2Values = z.infer<typeof signupStep2Schema>;
