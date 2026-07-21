const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

async function request(path, { method = 'GET', token, body, isPublic = false } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  let payload = null
  try {
    payload = res.status === 204 ? null : await res.json()
  } catch {
    payload = null
  }

  if (!res.ok) {
    const detail = payload?.detail ?? payload ?? {}
    throw new ApiError(
      res.status,
      detail.code || 'UNKNOWN_ERROR',
      detail.message || 'Something went wrong. Please try again.',
      detail.details,
    )
  }

  return payload
}

export const api = {
  // --- Auth ---
  managerLogin: (manager_email, password) =>
    request('/api/v1/auth/login/', { method: 'POST', body: { manager_email, password } }),
  superAdminLogin: (admin_email, password) =>
    request('/api/v1/auth/super-admin/login/', { method: 'POST', body: { admin_email, password } }),

  // --- Workspace (self-service tenant info) ---
  getMyWorkspace: (token) => request('/api/v1/workspace/me/', { token }),

  // --- Categories (tenant-scoped) ---
  listCategories: (token) => request('/api/v1/categories/', { token }),
  createCategory: (token, data) => request('/api/v1/categories/', { method: 'POST', token, body: data }),
  updateCategory: (token, id, data) => request(`/api/v1/categories/${id}/`, { method: 'PATCH', token, body: data }),
  deleteCategory: (token, id) => request(`/api/v1/categories/${id}/`, { method: 'DELETE', token }),

  // --- Menu items (tenant-scoped) ---
  listMenuItems: (token) => request('/api/v1/menu-items/', { token }),
  createMenuItem: (token, data) => request('/api/v1/menu-items/', { method: 'POST', token, body: data }),
  updateMenuItem: (token, id, data) => request(`/api/v1/menu-items/${id}/`, { method: 'PATCH', token, body: data }),
  deleteMenuItem: (token, id) => request(`/api/v1/menu-items/${id}/`, { method: 'DELETE', token }),
  toggleAvailability: (token, id) =>
    request(`/api/v1/menu-items/${id}/toggle-availability/`, { method: 'PATCH', token }),

  // --- Super Admin (tenant provisioning & billing/status control) ---
  listTenants: (token) => request('/api/v1/super-admin/tenants/', { token }),
  createTenant: (token, data) =>
    request('/api/v1/super-admin/tenants/', { method: 'POST', token, body: data }),
  updateTenantCompliance: (token, id, monthly_receipt_status) =>
    request(`/api/v1/super-admin/tenants/${id}/compliance/`, {
      method: 'PATCH', token, body: { monthly_receipt_status },
    }),
  updateTenantStatus: (token, id, is_active) =>
    request(`/api/v1/super-admin/tenants/${id}/status/`, {
      method: 'PATCH', token, body: { is_active },
    }),

  // --- Media (Cloudinary unsigned upload — free tier, no backend secret needed) ---
  uploadImageToCloudinary: async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
    if (!cloudName || !uploadPreset || cloudName === 'your-cloud-name') {
      throw new ApiError(422, 'MEDIA_CONFIG_MISSING', 'Image uploads aren\u2019t configured yet — set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.')
    }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('upload_preset', uploadPreset)
    formData.append('folder', 'menu-item-photos')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) {
      throw new ApiError(res.status, 'CLOUDINARY_UPLOAD_FAILED', data?.error?.message || 'The image upload failed. Please try again.')
    }
    return data.secure_url
  },

  // --- Public ---
  getPublicMenu: (slug) => request(`/api/v1/public/menu/${slug}/`, { isPublic: true }),

  // --- QR code (authenticated PNG — fetched as a blob, not JSON) ---
  getMyRestaurantQrBlob: async (token, table) => {
    const qs = table ? `?table=${encodeURIComponent(table)}` : ''
    const res = await fetch(`${BASE_URL}/api/v1/qr/my-restaurant.png${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new ApiError(res.status, 'QR_FETCH_FAILED', 'Could not generate the QR code.')
    return res.blob()
  },
}

export { ApiError }
