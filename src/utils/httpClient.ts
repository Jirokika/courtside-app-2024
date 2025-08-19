// Centralized backend HTTP configuration
// Resolves the backend base URL from environment, with a safe production fallback

export function getBackendUrl(): string {
	// Vite exposes env via import.meta.env
	const envUrl = (import.meta as any)?.env?.VITE_BACKEND_URL as string | undefined
	const url = envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0
		? envUrl.trim()
		: 'https://courtside-backend-production.up.railway.app'
	// Ensure no trailing slash for consistent concatenation
	return url.replace(/\/$/, '')
}

export async function httpFetch(input: string, init?: RequestInit): Promise<Response> {
	const base = getBackendUrl()
	const url = input.startsWith('http') ? input : `${base}${input.startsWith('/') ? '' : '/'}${input}`
	return fetch(url, init)
}

export function toWebSocketUrl(httpUrl: string): string {
	// Convert http(s) to ws(s)
	return httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:')
}


