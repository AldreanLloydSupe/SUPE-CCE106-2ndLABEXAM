export type User = {
  id?: string | number;
  name?: string;
  email?: string;
  role?: string;
};

export type Student = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  course?: string | null;
  [key: string]: unknown;
};

export type LoginResponse = {
  accessToken?: string;
  access_token?: string;
  token?: string;
  user?: User;
  data?: {
    accessToken?: string;
    access_token?: string;
    token?: string;
    user?: User;
  };
};
