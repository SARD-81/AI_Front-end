export type AuthRoleDTO = 'student' | 'professor' | 'staff' | 'admin';
export type PublicRegisterRoleDTO = Exclude<AuthRoleDTO, 'admin'>;

export type AuthUserDTO = {
  studentId?: string;
  personnelId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  faculty?: string;
  major?: string;
  degreeLevel?: string;
  department?: string;
  academicRank?: string;
  jobTitle?: string;
  role?: AuthRoleDTO;
  isProfileCompleted?: boolean;
};

export type LoginInputDTO = {
  email: string;
  password: string;
  identifier?: string;
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

type RegisterBaseInputDTO = {
  email: string;
  otpToken?: string;
  password: string;
  firstName: string;
  lastName: string;
  faculty: string;
};

export type StudentRegisterInputDTO = RegisterBaseInputDTO & {
  role?: 'student';
  studentId: string;
  major: string;
  degreeLevel: string;
  entryYear?: number;
};

export type ProfessorRegisterInputDTO = RegisterBaseInputDTO & {
  role: 'professor';
  personnelId: string;
  department: string;
  academicRank?: string;
};

export type StaffRegisterInputDTO = RegisterBaseInputDTO & {
  role: 'staff';
  personnelId: string;
  department: string;
  jobTitle?: string;
};

export type RegisterInputDTO =
  | StudentRegisterInputDTO
  | ProfessorRegisterInputDTO
  | StaffRegisterInputDTO;

export type StudentRegisterCompleteBodyDTO = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  student_id: string;
  faculty: string;
  major: string;
  degree_level: string;
  entry_year: number;
};

export type ProfessorRegisterCompleteBodyDTO = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'professor';
  personnel_id: string;
  faculty: string;
  department: string;
  academic_rank?: string;
};

export type StaffRegisterCompleteBodyDTO = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: 'staff';
  personnel_id: string;
  department: string;
  faculty: string;
  job_title?: string;
};

export type RegisterCompleteBodyDTO =
  | StudentRegisterCompleteBodyDTO
  | ProfessorRegisterCompleteBodyDTO
  | StaffRegisterCompleteBodyDTO;

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
  user: Pick<
    AuthUserDTO,
    'studentId' | 'fullName' | 'role' | 'isProfileCompleted'
  >;
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
};
