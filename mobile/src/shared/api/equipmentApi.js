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
 * Техника и инвентарь. Состояние, права, переходы и правило «всё или ничего» у пакета
 * держит сервер; приложение отправляет команды и рисует то, что вернулось.
 *
 * Раздел целиком принадлежит Super Admin, кроме `mine` — «Моя техника» открыта каждому
 * вошедшему и состоит только из выданного ему.
 */
export const equipmentApi = {
  dashboard(token, params) {
    return request(`/api/equipment/dashboard${query(params)}`, { token });
  },
  items(token, params) {
    return request(`/api/equipment/items${query(params)}`, { token });
  },
  unit(token, unitId) {
    return request(`/api/equipment/units/${unitId}`, { token });
  },
  history(token, params) {
    // Умолчание контроллера — устойчивый `createdAt DESC, id DESC`; своей сортировки не шлём.
    return request(`/api/equipment/history${query(params)}`, { token });
  },
  recipients(token, params) {
    return request(`/api/equipment/recipients${query(params)}`, { token });
  },
  mine(token) {
    return request('/api/me/equipment', { token });
  },
  createItem(token, body) {
    return request('/api/equipment/items', { method: 'POST', token, body });
  },
  updateItem(token, itemId, body) {
    return request(`/api/equipment/items/${itemId}`, { method: 'PATCH', token, body });
  },
  addUnits(token, itemId, units) {
    return request(`/api/equipment/items/${itemId}/units`, { method: 'POST', token, body: { units } });
  },
  updateUnit(token, unitId, body) {
    return request(`/api/equipment/units/${unitId}`, { method: 'PATCH', token, body });
  },
  writeOff(token, unitId, { comment, confirmIssued } = {}) {
    return request(`/api/equipment/units/${unitId}/write-off`, {
      method: 'POST',
      token,
      body: { comment: comment || null, confirmIssued: Boolean(confirmIssued) },
    });
  },
  issue(token, unitIds, holderAccountId, comment) {
    return request('/api/equipment/issue', {
      method: 'POST',
      token,
      body: { unitIds, holderAccountId, comment: comment || null },
    });
  },
  returnUnits(token, unitIds, comment) {
    return request('/api/equipment/return', {
      method: 'POST',
      token,
      body: { unitIds, comment: comment || null },
    });
  },
  transfer(token, unitIds, holderAccountId, comment) {
    return request('/api/equipment/transfer', {
      method: 'POST',
      token,
      body: { unitIds, holderAccountId, comment: comment || null },
    });
  },
  setProblem(token, unitId, type, comment) {
    return request(`/api/equipment/units/${unitId}/problem`, {
      method: 'POST',
      token,
      body: { type, comment: comment || null },
    });
  },
  resolveProblem(token, unitId, comment) {
    return request(`/api/equipment/units/${unitId}/problem/resolve`, {
      method: 'POST',
      token,
      body: { comment: comment || null },
    });
  },
};
