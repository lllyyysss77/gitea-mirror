/**
 * Mock fetch utility for tests
 */

export function createMockResponse(data: any, options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
  jsonError?: Error;
} = {}) {
  const {
    ok = true,
    status = 200,
    statusText = 'OK',
    headers = { 'content-type': 'application/json' },
    jsonError
  } = options;

  const response = {
    ok,
    status,
    statusText,
    headers: new Headers(headers),
    json: async () => {
      if (jsonError) {
        throw jsonError;
      }
      return data;
    },
    text: async () => typeof data === 'string' ? data : JSON.stringify(data),
    clone: function() {
      // Return a new response object with the same properties
      return createMockResponse(data, { ok, status, statusText, headers, jsonError });
    }
  };

  return response;
}

export function mockFetch(handler: (url: string, options?: RequestInit) => any) {
  return async (url: string, options?: RequestInit) => {
    const result = await handler(url, options);
    if (result && typeof result === 'object' && !result.clone) {
      // If handler returns raw response properties, convert to mock response
      if ('ok' in result || 'status' in result) {
        const { ok, status, statusText, headers, json, text, ...data } = result;
        const responseData = json ? await json() : (text ? await text() : data);
        return createMockResponse(responseData, { ok, status, statusText, headers });
      }
      // If handler returns data directly, wrap it in a mock response
      return createMockResponse(result);
    }
    return result;
  };
}