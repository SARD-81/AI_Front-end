export type AuthRoleDTO = 'student' | 'professor' | 'staff';

export type AuthUserDTO = {
  studentId: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  faculty?: string;
  major?: string;
  degreeLevel?: string;
  role?: AuthRoleDTO;
  isProfileCompleted?: boolean;
};

export type LoginInputDTO = {
  email?: string;
  identifier?: string;
  password: string;
};

export type LoginResponseDTO = {
  user: {
    studentId?: string;
    student_id?: string;
    fullName?: string;
    full_name?: string;
    role: AuthRoleDTO;
    isProfileCompleted?: boolean;
    is_profile_completed?: boolean;
  };
  isProfileCompleted?: boolean;
  is_profile_completed?: boolean;
};

export type SendOtpInputDTO = {
  email: string;
};

export type VerifyOtpInputDTO = {
  email: string;
  otpCode: string;
};

export type VerifyOtpBodyDTO = {
  email: string;
  otp_code: string;
};

export type RegisterInputDTO = {
  email: string;
  otpToken?: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  faculty: string;
  major: string;
  degreeLevel: string;
  specialization?: string;
};

export type RegisterCompleteBodyDTO = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  student_id: string;
  faculty: string;
  major: string;
  degree_level: string;
};

export type PasswordResetCompleteInputDTO = {
  email: string;
  otpToken?: string;
  newPassword: string;
};

export type PasswordResetCompleteBodyDTO = {
  email: string;
  new_password: string;
};

export type LoginResultDTO = {
  user: Pick<AuthUserDTO, 'studentId' | 'fullName' | 'role' | 'isProfileCompleted'>;
  isProfileCompleted?: boolean;
};

export type SendOtpResultDTO = {
  message: string;
};

export type VerifyOtpResultDTO = {
  message: string;
  otpToken?: string;
};

export type RegisterResultDTO = {
  message: string;
};

export type PasswordResetResultDTO = {
  message: string;
};

export type ProfileResponseDTO = {
  user: AuthUserDTO;
};

export type ProfileUpdateDTO = {
  firstName: string;
  lastName: string;
  studentId: string;
  faculty: string;
  major: string;
  degreeLevel: string;
};
