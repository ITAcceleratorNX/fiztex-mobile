import { request } from './client';

/** Teacher workspace search is the source of truth for reusable lesson documents. */
export const teacherWorkspaceApi = {
  folders: (token, page = 0) =>
    request(`/api/teacher/workspace/folders?page=${page}&size=20`, { token }),

  searchLessonDocuments: (token, { q = '', fileType = '', folderId = null, page = 0 } = {}) => {
    const params = new URLSearchParams({
      type: 'DOCUMENT', usage: 'ATTACH_DOCUMENT_TO_LESSON', page: String(page), size: '20',
    });
    if (q.trim()) params.set('q', q.trim());
    if (fileType) params.set('fileType', fileType);
    if (folderId != null) params.set('folderId', String(folderId));
    return request(`/api/teacher/workspace/search?${params}`, { token });
  },

  attachDocumentToLesson: (token, lessonId, workspaceItemId) =>
    request(`/api/lessons/${lessonId}/materials/workspace-items/${workspaceItemId}?visibleToStudents=true`,
      { method: 'POST', token }),
};
