export function getAuthHeaders() {
  const token = localStorage.getItem('rajindera_admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export async function apiRequest(endpoint, options = {}) {
  const headers = getAuthHeaders();
  const config = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  };

  const response = await fetch(endpoint, config);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('rajindera_admin_token');
      localStorage.removeItem('rajindera_admin_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Something went wrong.');
  }

  const contentType = response.headers.get('content-type');
  if (contentType && (contentType.includes('text/csv') || contentType.includes('text/plain'))) {
    return response.text();
  }
  if (response.headers.get('content-disposition')?.includes('attachment')) {
    return response.blob();
  }

  return response.json();
}
