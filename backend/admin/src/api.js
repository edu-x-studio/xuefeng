// 统一请求封装：注入 Bearer，处理 401/429/业务错误
import { token, logout } from "./state.js";

export async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token.value) headers.Authorization = `Bearer ${token.value}`;
  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout(true);
    // 后端区分「过期」与「改密后失效」，直接透传更利于用户理解
    throw new Error(data.detail || "登录已过期，请重新登录");
  }
  if (res.status === 429) {
    throw new Error(data.detail || "操作过于频繁，请稍后再试");
  }
  if (!res.ok) throw new Error(data.detail || `请求失败（${res.status}）`);
  return data;
}

// multipart 表单提交（文件上传）：自行带 Bearer，不写死 JSON 头
export async function apiUpload(path, form, options = {}) {
  const headers = options.headers || {};
  if (token.value) headers.Authorization = `Bearer ${token.value}`;
  const res = await fetch(path, { ...options, method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    logout(true);
    throw new Error(data.detail || "登录已过期，请重新登录");
  }
  if (!res.ok) throw new Error(data.detail || `导入失败（${res.status}）`);
  return data;
}
