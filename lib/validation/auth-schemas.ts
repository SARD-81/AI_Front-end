import {z} from 'zod';

export type AuthSchemaMessageKey =
  | 'studentId.required'
  | 'studentId.numeric'
  | 'studentId.min'
  | 'studentId.max'
  | 'login.emailRequired'
  | 'login.emailInvalid'
  | 'login.passwordRequired'
  | 'signup.emailRequired'
  | 'signup.emailInvalidFormat'
  | 'signup.emailDomainInvalid'
  | 'signup.roleRequired'
  | 'signup.roleInvalidForDomain'
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
  | 'profile.entryYearRequired'
  | 'profile.entryYearInvalid'
  | 'profile.personnelIdRequired'
  | 'profile.departmentRequired'
  | 'profile.confirmPasswordRequired'
  | 'profile.confirmPasswordMismatch';

export type AuthSchemaTranslator = (key: AuthSchemaMessageKey) => string;

function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@mail.sbu.ac.ir');
}

function isEmployeeEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@sbu.ac.ir');
}

function isAllowedRegisterEmail(email: string): boolean {
  return isStudentEmail(email) || isEmployeeEmail(email);
}

export const createStudentIdSchema = (t: AuthSchemaTranslator) =>
  z
    .string()
    .min(1, t('studentId.required'))
    .regex(/^\d+$/, t('studentId.numeric'))
    .min(5, t('studentId.min'))
    .max(12, t('studentId.max'));

export const createLoginSchema = (t: AuthSchemaTranslator) =>
  z.object({
    email: z
      .string()
      .min(1, t('login.emailRequired'))
      .email(t('login.emailInvalid')),
    password: z.string().min(1, t('login.passwordRequired'))
  });

export const createSignupStep1EmailSchema = (t: AuthSchemaTranslator) =>
  z.object({
    email: z
      .string()
      .min(1, t('signup.emailRequired'))
      .email(t('signup.emailInvalidFormat'))
      .refine((value) => isAllowedRegisterEmail(value), t('signup.emailDomainInvalid'))
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

const optionalString = z.string().optional();
const entryYearSchema = (t: AuthSchemaTranslator) =>
  z
    .number({message: t('profile.entryYearRequired')})
    .int(t('profile.entryYearInvalid'))
    .min(1300, t('profile.entryYearInvalid'))
    .max(1500, t('profile.entryYearInvalid'));

export const createSignupStep2Schema = (t: AuthSchemaTranslator) =>
  z
    .object({
      email: z.string().email().optional(),
      role: z.enum(['student', 'professor', 'staff']).optional(),
      firstName: z.string().min(2, t('profile.firstNameMin')),
      lastName: z.string().min(2, t('profile.lastNameMin')),
      studentId: z.string(),
      degreeLevel: z.string(),
      entryYear: z.union([entryYearSchema(t), z.literal(''), z.undefined()]).optional(),
      faculty: z.string().min(1, t('profile.facultyRequired')),
      major: z.string(),
      specialization: z.string().optional(),
      personnelId: z.string().optional(),
      department: z.string().optional(),
      academicRank: optionalString,
      jobTitle: optionalString,
      password: createPasswordSchema(t),
      confirmPassword: z.string().min(1, t('profile.confirmPasswordRequired'))
    })
    .superRefine((data, ctx) => {
      const role = data.email && isEmployeeEmail(data.email) ? data.role : 'student';

      if (data.email && isStudentEmail(data.email) && data.role && data.role !== 'student') {
        ctx.addIssue({code: 'custom', message: t('signup.roleInvalidForDomain'), path: ['role']});
      }

      if (data.email && isEmployeeEmail(data.email) && data.role !== 'professor' && data.role !== 'staff') {
        ctx.addIssue({code: 'custom', message: t('signup.roleRequired'), path: ['role']});
      }

      if (role === 'student') {
        const studentIdResult = createStudentIdSchema(t).safeParse(data.studentId ?? '');
        if (!studentIdResult.success) {
          ctx.addIssue({...studentIdResult.error.issues[0], path: ['studentId']});
        }
        if (!data.degreeLevel) {
          ctx.addIssue({code: 'custom', message: t('profile.degreeLevelRequired'), path: ['degreeLevel']});
        }
        if (!data.major || data.major.length < 2) {
          ctx.addIssue({code: 'custom', message: t('profile.majorMin'), path: ['major']});
        }
        if (data.email && data.entryYear === undefined) {
          ctx.addIssue({code: 'custom', message: t('profile.entryYearRequired'), path: ['entryYear']});
        }
      }

      if (role === 'professor' || role === 'staff') {
        if (!data.personnelId) {
          ctx.addIssue({code: 'custom', message: t('profile.personnelIdRequired'), path: ['personnelId']});
        }
        if (!data.department) {
          ctx.addIssue({code: 'custom', message: t('profile.departmentRequired'), path: ['department']});
        }
      }
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('profile.confirmPasswordMismatch'),
      path: ['confirmPassword']
    });

export const createPasswordResetCompleteSchema = (t: AuthSchemaTranslator) =>
  z
    .object({
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
export const passwordResetCompleteSchema = createPasswordResetCompleteSchema(fallbackT);

export type LoginFormValues = z.infer<typeof loginSchema>;
export type SignupStep1EmailValues = z.infer<typeof signupStep1EmailSchema>;
export type SignupStep1Values = z.infer<typeof signupStep1Schema>;
export type SignupStep2Values = z.infer<typeof signupStep2Schema>;
export type PasswordResetCompleteValues = z.infer<typeof passwordResetCompleteSchema>;
