// 全局认证态（单例 ref，跨 composable 共享）；api 与登出依赖于此
import { ref, ElMessage } from "./vue.js";

export const TOKEN_KEY = "xuefeng_admin_token";
export const USER_KEY = "xuefeng_admin_user";

export const token = ref(localStorage.getItem(TOKEN_KEY) || "");
export const user = ref(JSON.parse(localStorage.getItem(USER_KEY) || "null"));
export const profile = ref({});

export function logout(silent = false) {
  token.value = "";
  user.value = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (!silent) ElMessage.success("已退出登录");
}
