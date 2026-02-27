import {z} from 'zod';
import {UNIVERSITY_EMAIL_REGEX} from '@/lib/config/university-email';

export type AuthSchemaMessageKey =
  | 'studentId.required'
  | 'studentId.numeric'
  | 'studentId.min'
  | 'studentId.max'
  | 'login.identifierRequired'
  | 'login.identifierInvalid'
  | 'login.passwordRequired'
  | 'signup.emailRequired'
  | 'signup.emailInvalidFormat'
  | 'signup.emailDomainInvalid'
  | 'signup.otpRequired'
  | 'signup.otpInvalid'
  | 'password.min'
  | 'password.uppercase'
  | 'password.lowercase'
  | 'password.number'
  | 'password.symbol'
  | 'profile.firstNameMin'
  | 'profile.lastNameMin'
  | 'profile.degreeLevelRequired'
  | 'profile.facultyRequired'
  | 'profile.majorMin'
  | 'profile.confirmPasswordRequired'
  | 'profile.confirmPasswordMismatch';

export type AuthSchemaTranslator = (key: AuthSchemaMessageKey) => string;

export const createStudentIdSchema = (t: AuthSchemaTranslator) =>
  z
    .string()
    .min(1, t('studentId.required'))
    .regex(/^\d+$/, t('studentId.numeric'))
    .min(5, t('studentId.min'))
    .max(12, t('studentId.max'));

export const createLoginSchema = (t: AuthSchemaTranslator) =>
  z.object({
    identifier: z
      .string()
      .min(1, t('login.identifierRequired'))
      .refine(
        (value) => {
          const trimmedValue = value.trim();

          if (trimmedValue.includes('@')) {
            return UNIVERSITY_EMAIL_REGEX.test(trimmedValue);
          }

          return /^\d{5,12}$/.test(trimmedValue);
        },
        {message: t('login.identifierInvalid')}
      ),
    password: z.string().min(1, t('login.passwordRequired'))
  });

export const createSignupStep1EmailSchema = (t: AuthSchemaTranslator) =>
  z.object({
    email: z
      .string()
      .min(1, t('signup.emailRequired'))
      .email(t('signup.emailInvalidFormat'))
      .refine((value) => UNIVERSITY_EMAIL_REGEX.test(value.trim()), t('signup.emailDomainInvalid'))
  });

export const createSignupStep1Schema = (t: AuthSchemaTranslator) =>
  createSignupStep1EmailSchema(t).extend({
    otpCode: z.string().min(1, t('signup.otpRequired')).regex(/^\d{6}$/, t('signup.otpInvalid'))
  });

export const createPasswordSchema = (t: AuthSchemaTranslator) =>
  z
    .string()
    .min(8, t('password.min'))
    .regex(/[A-Z]/, t('password.uppercase'))
    .regex(/[a-z]/, t('password.lowercase'))
    .regex(/[0-9]/, t('password.number'))
    .regex(/[^A-Za-z0-9]/, t('password.symbol'));

export const createSignupStep2Schema = (t: AuthSchemaTranslator) =>
  z
    .object({
      firstName: z.string().min(2, t('profile.firstNameMin')),
      lastName: z.string().min(2, t('profile.lastNameMin')),
      studentId: createStudentIdSchema(t),
      degreeLevel: z.string().min(1, t('profile.degreeLevelRequired')),
      faculty: z.string().min(1, t('profile.facultyRequired')),
      major: z.string().min(2, t('profile.majorMin')),
      specialization: z.string().optional(),
      password: createPasswordSchema(t),
      confirmPassword: z.string().min(1, t('profile.confirmPasswordRequired'))
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('profile.confirmPasswordMismatch'),
      path: ['confirmPassword']
    });

const fallbackT: AuthSchemaTranslator = (key) => key;

export const loginSchema = createLoginSchema(fallbackT);
export const signupStep1EmailSchema = createSignupStep1EmailSchema(fallbackT);
export const signupStep1Schema = createSignupStep1Schema(fallbackT);
export const signupStep2Schema = createSignupStep2Schema(fallbackT);

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupStep1EmailValues = z.infer<typeof signupStep1EmailSchema>;
export type SignupStep1Values = z.infer<typeof signupStep1Schema>;
export type SignupStep2Values = z.infer<typeof signupStep2Schema>;
