export type AuthUserDTO = {
  studentId: string;
  firstName?: string;
  lastName?: string;
};

export type LoginInputDTO = {
  studentId: string;
  password: string;
};

export type SendOtpInputDTO = {
  email: string;
};

export type VerifyOtpInputDTO = {
  requestId: string;
  code: string;
};

export type RegisterInputDTO = {
  verificationToken: string;
  profile: {
    firstName: string;
    lastName: string;
    studentId: string;
    degree: string;
    faculty: string;
    major: string;
    specialization?: string;
  };
};

export type LoginResultDTO = {
  user: AuthUserDTO;
};

export type SendOtpResultDTO = {
  requestId: string;
  devCode?: string;
};

export type VerifyOtpResultDTO = {
  verificationToken: string;
};

export type RegisterResultDTO = {
  ok: true;
};
