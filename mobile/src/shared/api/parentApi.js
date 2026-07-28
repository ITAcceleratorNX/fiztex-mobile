import { request } from './client';

/** Parent self endpoints. */
export const parentApi = {
  /**
   * Linked children for the authenticated parent.
   * Backend endpoint not shipped yet — return [] so UI stays safe.
   * @returns {Promise<Array<{ id: number, fullName: string, className?: string, relationType?: string }>>}
   */
  myChildren: async (_token) => [],
};
