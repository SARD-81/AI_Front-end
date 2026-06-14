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
  otpToken: string;
  password: string;
  firstName: string;
  lastName: string;
  studentId: string;
  // Kept for the UI/future backend contract. These fields are not sent to the current backend contract.
  faculty?: string;
  major?: string;
  degreeLevel?: string;
  specialization?: string;
};

export type PasswordResetCompleteInputDTO = {
  email: string;
  otpToken: string;
  newPassword: string;
};

export type LoginResultDTO = {
  user: Pick<AuthUserDTO, 'studentId' | 'fullName'>;
};

export type SendOtpResultDTO = {
  message: string;
};

export type VerifyOtpResultDTO = {
  message: string;
  otpToken: string;
};

export type RegisterResultDTO = {
  message: string;
};

export type PasswordResetResultDTO = {
  message: string;
};
