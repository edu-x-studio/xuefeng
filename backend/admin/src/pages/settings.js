// 系统设置：账号（改密 + 资料）+ 数据库配置
import { ref, reactive, computed, ElMessage, ElMessageBox } from "../vue.js";
import { api } from "../api.js";
import { token, user } from "../state.js";
import { TOKEN_KEY, USER_KEY } from "../state.js";

export function useSettings() {
  /* ---------- 修改密码 ---------- */
  const pwdForm = reactive({ old_password: "", new_password: "", confirm: "" });
  const pwdLoading = ref(false);

  async function changePassword() {
    if (!pwdForm.old_password || !pwdForm.new_password) { ElMessage.warning("请填写完整"); return; }
    if (pwdForm.new_password.length < 8) { ElMessage.warning("新密码至少 8 位"); return; }
    if (pwdForm.new_password !== pwdForm.confirm) { ElMessage.warning("两次输入的新密码不一致"); return; }
    pwdLoading.value = true;
    try {
      const res = await api("/api/admin/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password: pwdForm.old_password, new_password: pwdForm.new_password }),
      });
      // 改密后旧令牌立即失效：后端会返回新令牌，这里直接续用，避免被踢下线
      if (res.token) {
        token.value = res.token;
        localStorage.setItem(TOKEN_KEY, res.token);
      }
      if (res.user) {
        user.value = res.user;
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      }
      ElMessage.success(res.message || "密码已更新");
      pwdForm.old_password = pwdForm.new_password = pwdForm.confirm = "";
      await loadProfile();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      pwdLoading.value = false;
    }
  }

  async function loadProfile() {
    try {
      const r = await api("/api/admin/me");
      const u = r.user;
      // 用返回值合并，保留响应式 user 引用
      user.value = { username: u.username, role: u.role,
        must_change_password: u.must_change_password };
    } catch (_) { /* 401 已处理 */ }
  }

  /* ---------- 数据库配置 ---------- */
  const dbState = ref(null);
  const dbForm = reactive({
    dialect: "sqlite", mode: "form", host: "", port: null, database: "", username: "",
    password: "", path: "", url: "", ssl: false, seed: true,
  });
  const dbTesting = ref(false);
  const dbApplying = ref(false);
  const dbResetting = ref(false);
  const dbResult = ref(null);

  const dbDialects = computed(() => (dbState.value ? dbState.value.dialects : []));
  const dbResultTitle = computed(() => {
    const r = dbResult.value;
    if (!r) return "";
    if (r.kind === "test") return r.ok ? "连接成功" : "连接失败";
    return r.ok ? "已切换并完成初始化播种" : "切换失败（服务仍停在原数据库）";
  });

  function dbPayload() {
    return { ...dbForm };
  }

  async function loadDbConfig() {
    dbState.value = await api("/api/admin/db-config");
    const c = dbState.value.config;
    Object.assign(dbForm, {
      dialect: c.dialect, mode: c.mode, host: c.host, port: c.port, database: c.database,
      username: c.username, path: c.path, url: c.url, ssl: c.ssl,
    });
    // 口令永不回流到页面：留空即表示「沿用已保存口令」
    dbForm.password = "";
  }

  function onDialectChange(key) {
    const d = dbDialects.value.find((x) => x.key === key);
    if (!d) return;
    dbForm.port = d.default_port || null;
    if (key === "sqlite" && !dbForm.path) dbForm.path = dbState.value ? dbState.value.default_path : "";
    dbResult.value = null;
  }

  async function testDb() {
    dbTesting.value = true;
    dbResult.value = null;
    try {
      const r = await api("/api/admin/db-config/test", {
        method: "POST", body: JSON.stringify(dbPayload()),
      });
      dbResult.value = { kind: "test", ...r };
      if (r.ok) ElMessage.success(`连接成功（${r.latency_ms} ms）`);
      else ElMessage.error(r.error || "连接失败");
    } catch (e) {
      dbResult.value = { kind: "test", ok: false, error: e.message };
      ElMessage.error(e.message);
    } finally {
      dbTesting.value = false;
    }
  }

  async function applyDb() {
    try {
      await ElMessageBox.confirm(
        "将切换到该数据库并立即建表播种（数据写入新库）。切换失败会自动回滚，确认继续？",
        "切换数据库", { type: "warning" });
    } catch (_) { return; }
    dbApplying.value = true;
    dbResult.value = null;
    try {
      const r = await api("/api/admin/db-config/apply", {
        method: "POST", body: JSON.stringify(dbPayload()),
      });
      dbResult.value = { kind: "apply", ...r };
      ElMessage.success(r.message || "已切换并初始化");
      await loadDbConfig();
      if (_refreshAll) await _refreshAll();
    } catch (e) {
      dbResult.value = { kind: "apply", ok: false, error: e.message };
      ElMessage.error(e.message);
    } finally {
      dbApplying.value = false;
    }
  }

  async function resetDb() {
    try {
      await ElMessageBox.confirm("清除落盘配置并恢复默认 SQLite（随后重新初始化播种）？",
        "恢复默认数据库", { type: "warning" });
    } catch (_) { return; }
    dbResetting.value = true;
    dbResult.value = null;
    try {
      const r = await api("/api/admin/db-config/reset", { method: "POST", body: "{}" });
      dbResult.value = { kind: "apply", ...r };
      ElMessage.success(r.message || "已恢复默认 SQLite");
      await loadDbConfig();
      if (_refreshAll) await _refreshAll();
    } catch (e) {
      dbResult.value = { kind: "apply", ok: false, error: e.message };
      ElMessage.error(e.message);
    } finally {
      dbResetting.value = false;
    }
  }

  let _refreshAll = null;
  function bindRefreshAll(fn) { _refreshAll = fn; }

  return {
    pwdForm, pwdLoading, changePassword, loadProfile,
    dbState, dbForm, dbDialects, dbResult, dbResultTitle, dbTesting, dbApplying, dbResetting,
    loadDbConfig, onDialectChange, testDb, applyDb, resetDb, bindRefreshAll,
  };
}
