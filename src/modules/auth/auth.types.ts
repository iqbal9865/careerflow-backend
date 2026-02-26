export interface RegisterUserInput {
    email: string;
    password: string;
    role?: string;
  }
  
export interface LoginUserInput {
    email: string;
    password: string;
}