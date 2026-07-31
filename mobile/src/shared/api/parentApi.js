import { request } from './client';

/** Parent self endpoints. */
export const parentApi = {
  /**
   * Linked children for the authenticated parent.
   * Maps ParentChildView → the shape screens use (`id` is the childId accepted by
   * /api/schedule/children/{childId}/today|week).
   * @returns {Promise<Array<{ id: number, fullName: string, className?: string, relationType?: string }>>}
   */
  myChildren: async (token) => {
    const list = await request('/api/schedule/children', { token });
    if (!Array.isArray(list)) return [];
    return list.map((child) => ({
      id: child.studentProfileId,
      fullName: child.fullName,
      firstName: child.firstName,
      lastName: child.lastName,
      className: child.className || null,
      academicYearName: child.academicYearName || null,
      relationType: child.relationType || null,
    }));
  },
};
