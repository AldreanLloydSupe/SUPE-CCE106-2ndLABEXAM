import type { Student } from '@/types/api';

export type NameOrder = 'asc' | 'desc';
export const studentCourse = (student: Student) => student.course?.trim() || 'Not provided';
const compareText = (a: string, b: string) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });

export function getCourses(students: Student[]): string[] {
  const courses = new Map<string, string>();
  for (const student of students) {
    const course = studentCourse(student);
    if (!courses.has(course.toLowerCase())) courses.set(course.toLowerCase(), course);
  }
  return [...courses.values()].sort(compareText);
}

export function selectStudents(students: Student[], search: string, course: string | null, order: NameOrder): Student[] {
  const query = search.trim().toLowerCase();
  return students.filter(student =>
    (course === null || studentCourse(student).toLowerCase() === course.toLowerCase()) &&
    [student.name, student.email, student.course].some(value => (value || '').toLowerCase().includes(query)),
  ).sort((a, b) => {
    const first = a.name?.trim() || '';
    const second = b.name?.trim() || '';
    // Unnamed records remain at the bottom in both directions.
    if (!first || !second) return first ? -1 : second ? 1 : 0;
    return compareText(first, second) * (order === 'asc' ? 1 : -1);
  });
}
