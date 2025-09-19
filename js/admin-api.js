(function () {
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  const CSRF_COOKIE_NAME = 'csrfToken';
  const CSRF_HEADER_NAME = 'X-CSRF-Token';

  const state = {
    apiBase: resolveApiBase(),
    csrfToken: null,
    pendingCsrfPromise: null,
  };

  function resolveApiBase() {
    if (typeof window === 'undefined') {
      return 'http://localhost:3000/api';
    }

    const globalCandidates = [
      window.__TREKKO_ADMIN_API_BASE__,
      window.__TREKKO_API_BASE__,
      window.__API_BASE__,
      window.API_BASE_URL,
    ];

    for (const candidate of globalCandidates) {
      const normalized = normalizeBase(candidate);
      if (normalized) {
        return normalized;
      }
    }

    const meta = document.querySelector('meta[name="trekko-api-base"]');
    if (meta?.content) {
      const normalized = normalizeBase(meta.content);
      if (normalized) {
        return normalized;
      }
    }

    const env = typeof window.__TREKKO_ENV__ === 'string' ? window.__TREKKO_ENV__.toLowerCase() : '';
    if (env === 'production') {
      const normalized = normalizeBase('https://www.trekko.com.br/api');
      if (normalized) return normalized;
    }
    if (env === 'staging') {
      const normalized = normalizeBase('https://staging.trekko.com.br/api');
      if (normalized) return normalized;
    }

    const { location } = window;
    if (location) {
      const { hostname, origin, protocol } = location;
      if (hostname && (hostname.includes('localhost') || hostname.startsWith('127.'))) {
        const port = window.__TREKKO_API_PORT__ || '3000';
        return `${protocol}//${hostname}:${port}/api`;
      }
      if (origin) {
        return `${origin.replace(/\/$/, '')}/api`;
      }
    }

    return '/api';
  }

  function normalizeBase(candidate) {
    if (!candidate || typeof candidate !== 'string') {
      return null;
    }

    let base = candidate.trim();
    if (!base) {
      return null;
    }

    if (base.startsWith('/')) {
      return base.replace(/\/$/, '');
    }

    if (!/^https?:\/\//i.test(base)) {
      base = `https://${base.replace(/^\/+/, '')}`;
    }

    try {
      const url = new URL(base);
      const segments = url.pathname.split('/').filter(Boolean);
      const apiIndex = segments.indexOf('api');
      if (apiIndex >= 0) {
        url.pathname = `/${segments.slice(0, apiIndex + 1).join('/')}`;
      } else {
        url.pathname = `${url.pathname.replace(/\/$/, '')}/api`;
      }
      url.search = '';
      url.hash = '';
      return url.toString().replace(/\/$/, '');
    } catch (error) {
      return null;
    }
  }

  function readCookie(name) {
    if (typeof document === 'undefined') {
      return null;
    }
    const pattern = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`);
    const match = document.cookie.match(pattern);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function setCsrfToken(token) {
    if (typeof token === 'string' && token.trim().length > 0) {
      state.csrfToken = token.trim();
    }
  }

  function syncCsrfFromCookie() {
    const cookieToken = readCookie(CSRF_COOKIE_NAME);
    if (cookieToken) {
      setCsrfToken(cookieToken);
    }
  }

  function buildUrl(pathOrUrl) {
    if (typeof pathOrUrl !== 'string') {
      return pathOrUrl;
    }
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    const trimmedBase = state.apiBase.replace(/\/$/, '');
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;

    if (normalizedPath.startsWith('/api') && trimmedBase.endsWith('/api')) {
      return `${trimmedBase}${normalizedPath.slice(4) || ''}` || `${trimmedBase}`;
    }

    return `${trimmedBase}${normalizedPath}`;
  }

  async function ensureCsrfToken() {
    if (state.csrfToken) {
      return state.csrfToken;
    }

    syncCsrfFromCookie();
    if (state.csrfToken) {
      return state.csrfToken;
    }

    if (state.pendingCsrfPromise) {
      return state.pendingCsrfPromise;
    }

    state.pendingCsrfPromise = fetch(buildUrl('/auth/csrf'), {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) {
          return {};
        }
        try {
          return await response.json();
        } catch (error) {
          return {};
        }
      })
      .then((payload) => {
        if (payload && typeof payload.csrfToken === 'string') {
          setCsrfToken(payload.csrfToken);
        } else {
          syncCsrfFromCookie();
        }
        return state.csrfToken;
      })
      .catch((error) => {
        console.error('Não foi possível inicializar o token CSRF', error);
        return state.csrfToken;
      })
      .finally(() => {
        state.pendingCsrfPromise = null;
      });

    return state.pendingCsrfPromise;
  }

  async function adminFetch(input, init = {}) {
    const target = buildUrl(input);
    const method = typeof init.method === 'string' ? init.method.toUpperCase() : 'GET';
    const headers = new Headers(init.headers || {});
    const requestInit = { ...init, method, headers, credentials: 'include' };

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    if (!SAFE_METHODS.has(method)) {
      const token = await ensureCsrfToken();
      if (token) {
        headers.set(CSRF_HEADER_NAME, token);
      }
    }

    return fetch(target, requestInit);
  }

  syncCsrfFromCookie();

  if (typeof window !== 'undefined') {
    window.__TREKKO_ADMIN_API_BASE__ = state.apiBase;
  }

  const api = {
    get API_BASE() {
      return state.apiBase;
    },
    fetch: adminFetch,
    ensureCsrfToken,
    setCsrfToken,
    getCsrfToken() {
      return state.csrfToken;
    },
    readCookie,
    buildUrl,
  };

  if (typeof window !== 'undefined') {
    window.trekkoAdminApi = api;
  }
})();
