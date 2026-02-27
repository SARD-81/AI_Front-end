export type AuthUserDTO = {
  studentId: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  faculty?: string;
  major?: string;
  degreeLevel?: string;
};

export type LoginInputDTO = {
  identifier: string;
  password: string;
};

export type SendOtpInputDTO = {
  email: string;
};

export type VerifyOtpInputDTO = {
  email: string;
  otpCode: string;
};

export type RegisterInputDTO = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  faculty: string;
  major: string;
  degreeLevel: string;
};

export type LoginResultDTO = {
  user: Pick<AuthUserDTO, 'studentId' | 'fullName'>;
};

export type SendOtpResultDTO = {
  message: string;
};

export type VerifyOtpResultDTO = {
  message: string;
};

export type RegisterResultDTO = {
  message: string;
};
