import type { LoginResponse, Student, User } from '@/types/api';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'REPLACE_WITH_EXAM_API';

// Temporary local data for testing until the instructor's API is available.
// Remove this block (or set EXPO_PUBLIC_API_BASE_URL to the real API) before submission.
export const IS_TEMPORARY_MOCK_API = API_BASE_URL === 'REPLACE_WITH_EXAM_API'
  || API_BASE_URL.includes('replace-with-instructor-api.example.com');
const MOCK_TOKEN = 'temporary-test-token';
const MOCK_USER: User = {
  id: 'demo-student',
  name: 'Demo Student',
  email: 'student@example.com',
  role: 'student',
};
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Ana Santos', email: 'ana.santos@example.com', course: 'BS Information Technology' },
  { id: '2', name: 'Ben Cruz', email: 'ben.cruz@example.com', course: 'BS Computer Science' },
  { id: '3', name: 'Carla Reyes', email: 'carla.reyes@example.com', course: 'BS Information Technology' },
];

export const API_ENDPOINTS = { login: '/login', students: '/students', profile: '/profile' };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function assertConfigured() {
  if (API_BASE_URL === 'REPLACE_WITH_EXAM_API') {
    throw new Error('Set EXPO_PUBLIC_API_BASE_URL before using the API.');
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body
      ? String(body.message) : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status);
  }
  return body as T;
}

async function request<T>(path: string, options: RequestInit = {}) {
  assertConfigured();
  return parseResponse<T>(await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
  }));
}

function unwrap<T>(value: T): T {
  if (typeof value === 'object' && value !== null && 'data' in value) return (value as T & { data: T }).data;
  return value;
}

export async function login(email: string, password: string) {
  if (IS_TEMPORARY_MOCK_API) {
    if (email !== 'student@example.com' || password !== 'password123') {
      throw new Error('Temporary login: use student@example.com and password123.');
    }
    return { accessToken: MOCK_TOKEN, user: MOCK_USER };
  }
  const response = await request<LoginResponse>(API_ENDPOINTS.login, { method: 'POST', body: JSON.stringify({ email, password }) });
  const payload = unwrap(response);
  const nested = payload.data;
  const accessToken = payload.accessToken || payload.access_token || payload.token || nested?.accessToken || nested?.access_token || nested?.token;
  if (!accessToken) throw new Error('The login response did not include an access token.');
  return { accessToken, user: payload.user || nested?.user || null };
}

export async function getProfile(token: string) {
  if (IS_TEMPORARY_MOCK_API) {
    if (token !== MOCK_TOKEN) throw new ApiError('Unauthorized.', 401);
    return MOCK_USER;
  }
  const response = await request<User | { user?: User; data?: User }>(API_ENDPOINTS.profile, { headers: { Authorization: `Bearer ${token}` } });
  const payload = unwrap(response);
  return (payload as { user?: User }).user || payload as User;
}

export async function getStudents(token: string) {
  if (IS_TEMPORARY_MOCK_API) {
    if (token !== MOCK_TOKEN) throw new ApiError('Unauthorized.', 401);
    return MOCK_STUDENTS;
  }
  const response = await request<Student[] | { students?: Student[]; data?: Student[] }>(API_ENDPOINTS.students, { headers: { Authorization: `Bearer ${token}` } });
  const payload = unwrap(response);
  return Array.isArray(payload) ? payload : (payload as { students?: Student[] }).students || [];
}

export async function getStudent(id: string, token: string) {
  if (IS_TEMPORARY_MOCK_API) {
    if (token !== MOCK_TOKEN) throw new ApiError('Unauthorized.', 401);
    const student = MOCK_STUDENTS.find((item) => String(item.id) === id);
    if (!student) throw new ApiError('Student not found.', 404);
    return student;
  }
  const response = await request<Student | { student?: Student; data?: Student }>(`${API_ENDPOINTS.students}/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` } });
  const payload = unwrap(response);
  return (payload as { student?: Student }).student || payload as Student;
}
