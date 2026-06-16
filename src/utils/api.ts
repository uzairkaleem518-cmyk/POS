import { projectId, publicAnonKey } from './supabase/info'
import { getSupabaseClient } from './supabase/client'

const API_BASE = `https://${projectId}.supabase.co/functions/v1`
let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export async function getAccessToken() {
  if (accessToken) return accessToken
  try {
    const supabase = getSupabaseClient()
    const { data } = await supabase.auth.getSession()
    const session = (data as any)?.session
    if (session?.access_token) {
      accessToken = session.access_token
      return accessToken
    }
  } catch (err) {
    console.warn('getAccessToken failed', err)
  }
  return null
}

function isListEndpoint(path: string) {
  const listPaths = ['/accounts', '/transactions', '/customers', '/suppliers', '/products', '/sales', '/purchases', '/users', '/ledger', '/banks']
  return listPaths.some(p => path.includes(p))
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const supabase = getSupabaseClient()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const fullPath = `/make-server-a01dd888${cleanEndpoint}`
  const token = await getAccessToken()
  headers['Authorization'] = `Bearer ${token ?? publicAnonKey}`

  try {
    let response = await fetch(`${API_BASE}${fullPath}`, { ...options, headers })

    if (response.status === 401) {
      const { data: refreshData } = await supabase.auth.refreshSession()
      const refreshed = (refreshData as any)?.session
      if (refreshed?.access_token) {
        accessToken = refreshed.access_token
        headers['Authorization'] = `Bearer ${accessToken}`
        response = await fetch(`${API_BASE}${fullPath}`, { ...options, headers })
      }
    }

    if (!response.ok) {
      // Logic for GET list endpoints
      if (response.status === 404 && (options.method === 'GET' || !options.method)) {
        if (isListEndpoint(cleanEndpoint)) return []
        return {}
      }

      // CRITICAL: Extract the actual server error message (e.g., "Cannot delete bank with transactions")
      const errorBody = await response.json().catch(() => ({ error: `Status ${response.status}` }))
      throw new Error(errorBody.error || errorBody.message || `Server error ${response.status}`)
    }

    const text = await response.text()
    return text ? JSON.parse(text) : {}
  } catch (error: any) {
    console.error("📡 API Request Error:", error.message)
    throw error // Re-throw so the UI can catch it
  }
}

export const authApi = {
  signUp: (data: any) => apiRequest('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  signin: async (email: string, password: string) => {
    const result = await apiRequest('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (result.accessToken) setAccessToken(result.accessToken)
    return result
  },
  getSession: () => apiRequest('/auth/session').catch(() => ({ session: null })),
  signout: async () => {
    const result = await apiRequest('/auth/signout', { method: 'POST' }); setAccessToken(null); return result;
  },
}

export const userApi = {
  getAll: () => apiRequest('/users'),
  create: (users: any) => apiRequest('/users', { method: 'POST', body: JSON.stringify(users) }),
  updateRole: (userId: string, role: string) => apiRequest(`/users/${userId}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  delete: (userId: string) => apiRequest(`/users/${userId}`, { method: 'DELETE' }),
}

export const adminApi = {
  getPendingApprovals: () => apiRequest('/admin/pending-approvals'),

  // ✅ ADD THIS (FIX)
  getApprovedShops: () => apiRequest('/admin/approved-shops'),

  approveShop: (userId: string, paymentConfirmed: boolean) =>
    apiRequest(`/admin/approve/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ paymentConfirmed }),
    }),

  rejectShop: (userId: string, reason: string) =>
    apiRequest(`/admin/reject/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  updateShopStatus: (shopId: string, status: string) =>
    apiRequest(`/admin/shop/${shopId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  extendSubscription: (shopId: string, months: number) =>
    apiRequest(`/admin/shop/${shopId}/extend-subscription`, {
      method: 'POST',
      body: JSON.stringify({ months }),
    }),
}


export const productsAPI = {
  getAll: () => apiRequest('/products'),
  create: (p: any) => apiRequest('/products', { method: 'POST', body: JSON.stringify(p) }),
  update: (id: string, u: any) => apiRequest(`/products/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
  delete: (id: string) => apiRequest(`/products/${id}`, { method: 'DELETE' }),
}

export const customerApi = {
  getAll: () => apiRequest('/customers'),
  create: (c: any) => apiRequest('/customers', { method: 'POST', body: JSON.stringify(c) }),
  update: (id: string, u: any) => apiRequest(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
  delete: (id: string) => apiRequest(`/customers/${id}`, { method: 'DELETE' }),
}

export const salesApi = {
  getAll: () => apiRequest('/sales'),
  create: (s: any) => apiRequest('/sales', { method: 'POST', body: JSON.stringify(s) }),
}

export const suppliersApi = {
  getAll: () => apiRequest('/suppliers'),
  create: (s: any) => apiRequest('/suppliers', { method: 'POST', body: JSON.stringify(s) }),
  update: (id: string, u: any) => apiRequest(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
  delete: (id: string) => apiRequest(`/suppliers/${id}`, { method: 'DELETE' }),
}

export const purchasesApi = {
  getAll: () => apiRequest('/purchases'),
  create: (p: any) => apiRequest('/purchases', { method: 'POST', body: JSON.stringify(p) }),
}

export const ledgerApi = {
  getAll: () => apiRequest('/ledger'),
  addEntry: (e: any) => apiRequest('/ledger/entry', { method: 'POST', body: JSON.stringify(e) }),
  paymentMethod: (customerId: string, amount: number, description: string) => apiRequest('/ledger/payment', { method: 'POST', body: JSON.stringify({ customerId, amount, description }) }),
  supplierPayment: (supplierId: string, amount: number, description: string) => apiRequest('/ledger/supplier-payment', { method: 'POST', body: JSON.stringify({ supplierId, amount, description }) }),
}

export const accountsAPI = {
  getAll: () => apiRequest('/accounts'),
  create: (a: any) => apiRequest('/accounts', { method: 'POST', body: JSON.stringify(a) }),
  update: (id: string, u: any) => apiRequest(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
  delete: (id: string) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }),
}

export const accountTransactionsAPI = {
  getAll: () => apiRequest('/transactions'),
  create: (t: any) => apiRequest('/transactions', { method: 'POST', body: JSON.stringify(t) }),
  delete: (id: string) => apiRequest(`/transactions/${id}`, { method: 'DELETE' }),
}

export const banksApi = {
  getAll: () => apiRequest('/banks'),
  create: (b: any) => apiRequest('/banks', { method: 'POST', body: JSON.stringify(b) }),
  update: (id: string, u: any) => apiRequest(`/banks/${id}`, { method: 'PUT', body: JSON.stringify(u) }),
  delete: (id: string) => apiRequest(`/banks/${id}`, { method: 'DELETE' }),
  deposit: (id: string, amount: number, description?: string) => apiRequest(`/banks/${id}/deposit`, { method: 'POST', body: JSON.stringify({ amount, description }) }),
  withdraw: (id: string, amount: number, description?: string) => apiRequest(`/banks/${id}/withdraw`, { method: 'POST', body: JSON.stringify({ amount, description }) }),
}

export const shopAPI = {
  getProfile: () => apiRequest('/shop'),
  updateProfile: (updates: any) => apiRequest('/shop', { method: 'PUT', body: JSON.stringify(updates) }),
}

export const trialBalanceAPI = { get: () => apiRequest('/trial-balance') }