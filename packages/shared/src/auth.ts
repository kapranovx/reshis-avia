// DTO на бэке реализуют эти интерфейсы через implements, так что расхождение поймает компилятор.

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface SignupDto {
  name: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}
