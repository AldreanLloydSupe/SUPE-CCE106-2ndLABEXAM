import type { Student, User } from '@/types/api';

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

export type ApiErrorCode = 'http' | 'network' | 'timeout' | 'cancelled' | 'invalid-response' | 'configuration' | 'validation';
export const REQUEST_TIMEOUT_MS = 15000;

export class ApiError extends Error {
  constructor(message: string, public status: number, public code: ApiErrorCode = 'http') {
    super(message);
    this.name = 'ApiError';
  }
}

type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject => typeof value === 'object' && value !== null && !Array.isArray(value);
const has = (value: JsonObject, key: string) => Object.prototype.hasOwnProperty.call(value, key);
const isId = (value: unknown) => (typeof value === 'string' && !!value.trim()) || (typeof value === 'number' && Number.isFinite(value));
const malformed = (message = 'The server returned an invalid response. Please try again.') => new ApiError(message, 0, 'invalid-response');

function assertConfigured() {
  if (!/^https?:\/\/[^\s/]+/i.test(API_BASE_URL)) {
    throw new ApiError('The API address is not configured correctly. Check the app configuration.', 0, 'configuration');
  }
}

function httpMessage(status: number, path: string) {
  if (status === 401) return path === API_ENDPOINTS.login ? 'The email or password is incorrect.' : 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to access this information.';
  if (status === 404) return 'The requested information could not be found.';
  if (status === 429) return 'Too many requests. Please wait a moment and try again.';
  if (status >= 500) return 'Student services are temporarily unavailable. Please try again later.';
  if (status === 400 || status === 422) return 'The request was not accepted. Check the information and try again.';
  return `The request failed (status ${status}). Please try again.`;
}

async function request(path: string, options: RequestInit = {}): Promise<unknown> {
  assertConfigured();
  const controller = new AbortController();
  const externalSignal = options.signal;
  let timedOut = false;
  const cancel = () => controller.abort();
  externalSignal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    if (externalSignal?.aborted) {
      throw new ApiError('The request was cancelled.', 0, 'cancelled');
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    });
    // Preserve HTTP status even when an error body is HTML, empty, or malformed.
    if (!response.ok) throw new ApiError(httpMessage(response.status, path), response.status);
    const text = await response.text();
    try { return JSON.parse(text); }
    catch { throw malformed(); }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError('The request took too long. Please check your connection and try again.', 0, 'timeout');
    if (controller.signal.aborted) throw new ApiError('The request was cancelled.', 0, 'cancelled');
    throw new ApiError('Unable to connect to student services. Check your internet connection and try again.', 0, 'network');
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', cancel);
  }
}

function unwrap(value: unknown): unknown {
  // Accept common data wrappers, with a bound for unexpectedly nested responses.
  for (let depth = 0; depth < 5 && isObject(value) && has(value, 'data'); depth++) value = value.data;
  return value;
}

function parseUser(value: unknown): User {
  const user = unwrap(value);
  if (!isObject(user)) throw malformed('The server returned invalid account information.');
  if (has(user, 'id') && !isId(user.id)) throw malformed('The server returned an invalid account ID.');
  for (const field of ['name', 'email', 'role']) {
    if (has(user, field) && typeof user[field] !== 'string') throw malformed('The server returned invalid account information.');
  }
  if (!isId(user.id) && !['name', 'email', 'role'].some(field => typeof user[field] === 'string' && user[field].trim())) {
    throw malformed('The account response did not include any account information.');
  }
  return user as User;
}

function parseStudent(value: unknown): Student {
  if (!isObject(value) || !isId(value.id)) throw malformed('A student record is missing a valid ID.');
  for (const field of ['name', 'email', 'course']) {
    if (has(value, field) && value[field] !== null && typeof value[field] !== 'string') {
      throw malformed('The server returned invalid student information.');
    }
  }
  return value as Student;
}

function bearer(token: string) {
  if (typeof token !== 'string' || !token.trim()) throw new ApiError('Please sign in to continue.', 401);
  return { Authorization: `Bearer ${token}` };
}

export async function login(email: string, password: string) {
  if (!email.trim() || !password) throw new ApiError('Enter your email and password.', 0, 'validation');
  if (IS_TEMPORARY_MOCK_API) {
    if (email !== 'student@example.com' || password !== 'password123') {
      throw new ApiError('The email or password is incorrect.', 401);
    }
    return { accessToken: MOCK_TOKEN, user: MOCK_USER };
  }
  const response = await request(API_ENDPOINTS.login, { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
  const candidates: JsonObject[] = [];
  let current = response;
  for (let depth = 0; depth < 5 && isObject(current); depth++) {
    candidates.push(current);
    if (!has(current, 'data')) break;
    current = current.data;
  }
  const accessToken = candidates.flatMap(item => [item.accessToken, item.access_token, item.token])
    .find((value): value is string => typeof value === 'string' && !!value.trim());
  if (!accessToken) throw malformed('The sign-in response did not include a valid access token.');
  const rawUser = candidates.find(item => item.user != null)?.user;
  return { accessToken: accessToken.trim(), user: rawUser == null ? null : parseUser(rawUser) };
}

export async function getProfile(token: string, signal?: AbortSignal) {
  const headers = bearer(token);
  if (signal?.aborted) throw new ApiError('The request was cancelled.', 0, 'cancelled');
  if (IS_TEMPORARY_MOCK_API) {
    if (token !== MOCK_TOKEN) throw new ApiError('Unauthorized.', 401);
    return MOCK_USER;
  }
  const payload = unwrap(await request(API_ENDPOINTS.profile, { signal, headers }));
  return parseUser(isObject(payload) && has(payload, 'user') ? payload.user : payload);
}

export async function getStudents(token: string) {
  const headers = bearer(token);
  if (IS_TEMPORARY_MOCK_API) {
    if (token !== MOCK_TOKEN) throw new ApiError('Unauthorized.', 401);
    return MOCK_STUDENTS;
  }
  const payload = unwrap(await request(API_ENDPOINTS.students, { headers }));
  const rows = isObject(payload) && has(payload, 'students') ? unwrap(payload.students) : payload;
  if (!Array.isArray(rows)) throw malformed('The server did not return a valid student list.');
  const students = rows.map(parseStudent);
  const ids = students.map(student => String(student.id));
  if (new Set(ids).size !== ids.length) throw malformed('The student list contains duplicate IDs.');
  return students;
}

export async function getStudent(id: string, token: string) {
  const headers = bearer(token);
  if (!id.trim()) throw new ApiError('A valid student ID is required.', 0, 'validation');
  if (IS_TEMPORARY_MOCK_API) {
    if (token !== MOCK_TOKEN) throw new ApiError('Unauthorized.', 401);
    const student = MOCK_STUDENTS.find(item => String(item.id) === id);
    if (!student) throw new ApiError('Student not found.', 404);
    return student;
  }
  const payload = unwrap(await request(`${API_ENDPOINTS.students}/${encodeURIComponent(id)}`, { headers }));
  const student = parseStudent(unwrap(isObject(payload) && has(payload, 'student') ? payload.student : payload));
  if (String(student.id) !== id) throw malformed('The server returned a different student than requested.');
  return student;
}
