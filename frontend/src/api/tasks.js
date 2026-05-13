const BASE = '/api/tasks'

function getToken() {
  return localStorage.getItem('workspaceToken') || ''
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-User-Token': getToken(),
    },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export const fetchTasks = () => request('')

export const createTask = (data) =>
  request('', { method: 'POST', body: JSON.stringify(data) })

export const updateStatus = (id, status) =>
  request(`/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })

export const deleteTask = (id) => request(`/${id}`, { method: 'DELETE' })
