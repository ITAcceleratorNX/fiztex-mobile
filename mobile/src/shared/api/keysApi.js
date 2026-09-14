import { request } from './client';

function query(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

/**
 * Physical keys. The server owns state, permissions, transitions and all-or-nothing
 * batch semantics; the client only sends commands and renders returned units.
 */
export const keysApi = {
  dashboard(token, params) {
    return request(`/api/keys/dashboard${query(params)}`, { token });
  },
  card(token, unitId) {
    return request(`/api/keys/units/${unitId}`, { token });
  },
  history(token, params) {
    // The backend default includes the stable `id DESC` tie-breaker; do not override it.
    return request(`/api/keys/history${query(params)}`, { token });
  },
  recipients(token, params) {
    return request(`/api/keys/recipients${query(params)}`, { token });
  },
  mine(token) {
    return request('/api/me/keys', { token });
  },
  createGroup(token, body) {
    return request('/api/keys/groups', { method: 'POST', token, body });
  },
  updateGroup(token, groupId, body) {
    return request(`/api/keys/groups/${groupId}`, { method: 'PATCH', token, body });
  },
  addUnits(token, groupId, body) {
    return request(`/api/keys/groups/${groupId}/units`, { method: 'POST', token, body });
  },
  updateUnit(token, unitId, body) {
    return request(`/api/keys/units/${unitId}`, { method: 'PATCH', token, body });
  },
  issue(token, unitIds, holderAccountId, comment) {
    return request('/api/keys/issue', { method: 'POST', token, body: { unitIds, holderAccountId, comment: comment || null } });
  },
  returnKeys(token, unitIds, comment) {
    return request('/api/keys/return', { method: 'POST', token, body: { unitIds, comment: comment || null } });
  },
  transfer(token, unitIds, holderAccountId, comment) {
    return request('/api/keys/transfer', { method: 'POST', token, body: { unitIds, holderAccountId, comment: comment || null } });
  },
  setProblem(token, unitId, type, comment) {
    return request(`/api/keys/units/${unitId}/problem`, { method: 'POST', token, body: { type, comment: comment || null } });
  },
  resolveProblem(token, unitId, comment) {
    return request(`/api/keys/units/${unitId}/problem/resolve`, { method: 'POST', token, body: { comment: comment || null } });
  },
  deleteUnit(token, unitId, confirmIssued = false) {
    return request(`/api/keys/units/${unitId}${query({ confirmIssued })}`, { method: 'DELETE', token })
      .then(() => ({ deleted: true }));
  },
};
