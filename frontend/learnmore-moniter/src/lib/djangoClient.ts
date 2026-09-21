import { getApiUrl } from './apiConfig';

interface CacheEntry {
  timestamp: number;
  data: any;
}

// In-memory SWR Cache for Tesla-like 0ms instantaneous loading
const apiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000; // 30 seconds fresh cache

export function invalidateApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pathPrefix)) {
      apiCache.delete(key);
    }
  }
}

/**
 * Ultra-Fast Django REST API Client with Stale-While-Revalidate Memory Caching
 */
export async function djangoFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; [key: string]: any }> {
  const url = getApiUrl(path);
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // Return cached result instantly (0ms response) for GET requests if available
  if (isGet && apiCache.has(url)) {
    const cached = apiCache.get(url)!;
    const isFresh = Date.now() - cached.timestamp < CACHE_TTL_MS;
    
    // Background revalidation if stale
    if (!isFresh) {
      fetchFreshData(url, options).then((res) => {
        if (res.success) {
          apiCache.set(url, { timestamp: Date.now(), data: res });
        }
      });
    }

    return cached.data;
  }

  // Non-GET requests invalidate relevant cache entries
  if (!isGet) {
    const cleanPath = path.split('?')[0].replace('/api/', '');
    invalidateApiCache(cleanPath);
  }

  const result = await fetchFreshData(url, options);

  if (isGet && result.success) {
    apiCache.set(url, { timestamp: Date.now(), data: result });
  }

  return result;
}

async function fetchFreshData(url: string, options: RequestInit) {
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...(options.headers || {}),
      },
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        success: false,
        error: json.error || json.detail || `Request failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      ...json,
    };
  } catch (err: any) {
    console.error(`[Django Client Error] URL: ${url}`, err);
    return {
      success: false,
      error: err.message || 'Failed to connect to Django REST API server.',
    };
  }
}
