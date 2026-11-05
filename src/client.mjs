export const controlPath = '/api/v1/ai';

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateOrigin(baseUrl) {
  const base = new URL(baseUrl);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if ((base.protocol !== 'https:' && !(loopback && base.protocol === 'http:')) ||
      base.username || base.password || base.pathname !== '/' || base.search || base.hash) {
    throw new Error('AI_RSS_URL 须为 HTTPS 站点地址；仅本机允许 HTTP。不要包含路径、参数或凭据。');
  }
  return base.origin;
}

function jsonClient(base, key, transport) {
  return {
    async request(path, { method = 'GET', body, query } = {}) {
      const url = new URL(path, base);
      if (url.origin !== base.origin || !/^\/(api\/v1\/|open-api\/)/.test(url.pathname)) {
        throw new Error('请求地址超出ai-rss API 范围。');
      }
      for (const [name, value] of Object.entries(query ?? {})) {
        if (value !== undefined) url.searchParams.set(name, String(value));
      }
      let response;
      try {
        response = await transport(url, {
          method, redirect: 'error', signal: AbortSignal.timeout(20_000),
          headers: { ...(key ? { Authorization: 'Bearer '+key } : {}), Accept: 'application/json',
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch {
        throw new Error('无法连接ai-rss。请检查服务地址、网络和证书。');
      }
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const message = response.status === 404 && url.pathname === controlPath+'/status'
          ? '目标实例尚未启用 AI 控制接口，请先更新核心服务。'
          : (result?.error ?? '接口请求失败');
        const error = new ApiError(response.status, key ? String(message).replaceAll(key, '[已隐藏]') : String(message));
        if (response.status===429 && Number.isInteger(result?.interval)) error.interval=result.interval;
        throw error;
      }
      if (result === null || typeof result !== 'object') throw new Error('服务没有返回有效的 JSON。');
      return result;
    },
  };
}

export function createClient({ baseUrl, key, transport = globalThis.fetch }) {
  if (!baseUrl || !key) throw new Error('请先运行 ai-rss login，或同时配置 AI_RSS_URL 和 AI_RSS_KEY。');
  if (!/^wmt_ai_[A-Za-z0-9_-]{43}$/.test(key)) throw new Error('请使用工作台创建的 AI 控制密钥。');
  return jsonClient(new URL(validateOrigin(baseUrl)), key, transport);
}

export function createDeviceClient(baseUrl, transport=globalThis.fetch) {
  const api=jsonClient(new URL(validateOrigin(baseUrl)), null, transport);
  return {
    start: () => api.request(controlPath+'/device/start',{method:'POST',body:{}}),
    poll: (deviceCode) => api.request(controlPath+'/device/poll',{method:'POST',body:{deviceCode}}),
  };
}
