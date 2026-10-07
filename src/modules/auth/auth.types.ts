export interface RegisterUserInput {
    fullName: string;
    email: string;
    password: string;
  }
  
export interface LoginUserInput {
    email: string;
    password: string;
}

export interface RefreshTokenInput {
    refreshToken: string;
}

export interface UpdateNameInput {
    fullName: string;
}

export interface UpdateEmailInput {
    newEmail: string;
    currentPassword: string;
}
