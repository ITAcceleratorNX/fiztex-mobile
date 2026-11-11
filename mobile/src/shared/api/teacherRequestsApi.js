import { request, requestMultipart } from './client';
import { appendUpload } from './upload';

function query(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
}

export const teacherRequestsApi = {
  list(token, params = {}) { return request(`/api/teacher/requests${query(params)}`, { token }); },
  async listAll(token, status, size = 50) {
    const first = await teacherRequestsApi.list(token, { status, page: 0, size });
    const pages = Math.max(1, Math.min(first?.totalPages || 1, 200));
    if (pages === 1) return first?.content || [];
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, index) =>
      teacherRequestsApi.list(token, { status, page: index + 1, size }),
    ));
    return [first, ...rest].flatMap((page) => page?.content || []);
  },
  get(token, id) { return request(`/api/teacher/requests/${id}`, { token }); },
  create(token, payload) { return request('/api/teacher/requests', { method: 'POST', token, body: payload }); },
  update(token, id, payload) { return request(`/api/teacher/requests/${id}`, { method: 'PATCH', token, body: payload }); },
  cancel(token, id) { return request(`/api/teacher/requests/${id}/cancel`, { method: 'POST', token }); },
  upload(token, id, file) {
    const form = new FormData();
    appendUpload(form, 'file', file);
    return requestMultipart(`/api/teacher/requests/${id}/documents`, form, { token });
  },
  removeDocument(token, id, documentId) {
    return request(`/api/teacher/requests/${id}/documents/${documentId}`, { method: 'DELETE', token });
  },
};

export const teacherRequestFiles = {
  content: (requestId, documentId) => `/api/teacher/requests/${requestId}/documents/${documentId}/content`,
};
