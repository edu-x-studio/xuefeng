// 懂分帝 · 管理端控制台入口（Vue 3 + Element Plus，免构建，原生 ESM 模块化）
import { createApp, ref, reactive, computed, watch, onMounted, ElementPlus, ElMessage, ElMessageBox } from "./vue.js";
import { AppIcon, LineChart, DonutChart, BarList } from "./icons.js";
import { api } from "./api.js";
import { token, user, profile, logout, TOKEN_KEY, USER_KEY } from "./state.js";

import { useDashboard } from "./pages/dashboard.js";
import { useUniversities } from "./pages/universities.js";
import { useBaselines } from "./pages/baselines.js";
import { useVersions } from "./pages/versions.js";
import { useSync } from "./pages/sync.js";
import { useLines } from "./pages/lines.js";
import { useAcquisition } from "./pages/acquisition.js";
import { useEvents } from "./pages/events.js";
import { useSettings } from "./pages/settings.js";

const app = createApp({
  components: { AppIcon, LineChart, DonutChart, BarList },
  setup() {
    /* ---------- 全局共享态 ---------- */
    const loginForm = reactive({ username: "admin", password: "" });
    const loginLoading = ref(false);
    const loading = ref(false);
    const page = ref("dashboard");

    const navItems = [
      { key: "dashboard", label: "数据看板", icon: "dashboard", title: "数据看板", desc: "院校、录取基线与查询流量的整体概览" },
      { key: "universities", label: "院校库", icon: "school", title: "全国院校库", desc: "教育部普通高校名单 2868 所，可检索与导出" },
      { key: "baselines", label: "录取基线", icon: "chart", title: "录取基线", desc: "31 省估算基线 + 11 省官方省控线覆盖，支持按年份浏览与单条修正" },
      { key: "versions", label: "数据版本", icon: "database", title: "数据版本", desc: "年度更新：建草稿 → 校验 → 发布；支持补丁、审计与回滚" },
      { key: "sync", label: "数据同步", icon: "sync", title: "数据同步", desc: "静态数据源 → 数据库的幂等同步" },
      { key: "lines", label: "校线导入", icon: "upload", title: "院校投档线导入", desc: "上传各省投档表（CSV/XLSX），校名匹配后落库；先预览再入库" },
      { key: "acquisition", label: "采集台账", icon: "database", title: "年度采集台账", desc: "31 省 × 年份 × 数据类：官方数据采集进度与库内实测覆盖，缺哪补哪；含一键体检" },
      { key: "events", label: "查询日志", icon: "list", title: "查询日志", desc: "匿名记录核验 / 检索调用，用于产品分析" },
      { key: "settings", label: "系统设置", icon: "settings", title: "系统设置", desc: "账号安全与运行环境" },
    ];
    const currentTitle = computed(() => (navItems.find((n) => n.key === page.value) || {}).title || "");
    const currentDesc = computed(() => (navItems.find((n) => n.key === page.value) || {}).desc || "");

    /* ---------- 组合各页面逻辑 ---------- */
    const dash = useDashboard();
    const uni = useUniversities();
    const base = useBaselines();
    const ver = useVersions();
    const sync = useSync();
    const lines = useLines();
    const acq = useAcquisition();
    const events = useEvents();
    const settings = useSettings();

    /* ---------- 通用方法 ---------- */
    async function refreshAll() {
      if (!token.value) return;
      loading.value = true;
      try {
        await Promise.all([dash.loadOverview(), dash.loadMeta(), settings.loadProfile()]);
        if (page.value === "universities") await uni.loadUniversities(uni.uniPage.value);
        if (page.value === "baselines") await base.loadBaselines();
        if (page.value === "versions") await ver.loadVersions();
        if (page.value === "sync") await Promise.all([sync.loadSources(), sync.loadJobs(), sync.loadSyncTargets()]);
        if (page.value === "events") await events.loadEvents();
      } catch (e) {
        ElMessage.error(e.message);
      } finally {
        loading.value = false;
      }
    }

    function go(key) {
      page.value = key;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function doLogin() {
      if (!loginForm.username || !loginForm.password) {
        ElMessage.warning("请输入账号与密码");
        return;
      }
      loginLoading.value = true;
      try {
        const res = await api("/api/admin/login", {
          method: "POST",
          body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
        });
        token.value = res.token;
        user.value = res.user;
        localStorage.setItem(TOKEN_KEY, res.token);
        localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        ElMessage.success("登录成功");
        await refreshAll();
      } catch (e) {
        ElMessage.error(e.message);
      } finally {
        loginLoading.value = false;
      }
    }

    async function onUserCommand(cmd) {
      if (cmd === "settings") { page.value = "settings"; return; }
      if (cmd === "logout") {
        try {
          await ElMessageBox.confirm("确认退出当前登录？", "提示", { type: "warning" });
          logout();
        } catch (_) { /* 取消 */ }
      }
    }

    function exportCsv(kind) {
      window.open(`/api/admin/export/${kind}.csv?token=${encodeURIComponent(token.value)}`, "_blank");
    }

    function fmtTime(iso) {
      if (!iso) return "—";
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "—";
      const p = (n) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
    }

    const jobTag = (s) => ({ success: "success", failed: "danger", running: "warning" }[s] || "info");
    const jobLabel = (s) => ({ success: "成功", failed: "失败", running: "进行中" }[s] || s);
    const alignLabel = (a) => ({ aligned: "观点×数据一致", caution: "需谨慎", conflict: "冲突/避坑" }[a] || a);

    /* ---------- 跨模块回调接线 ---------- */
    ver.bindOverview(dash.loadOverview);
    sync.bindOverview(dash.loadOverview);
    settings.bindRefreshAll(refreshAll);

    /* ---------- 路由监听 ---------- */
    watch(page, async (p) => {
      if (!token.value) return;
      try {
        if (p === "universities" && !uni.uniRows.value.length) await uni.loadUniversities(1);
        if (p === "baselines" && !base.baseRows.value.length) await base.loadBaselines();
        if (p === "versions") await ver.loadVersions();
        if (p === "sync") await Promise.all([sync.loadSources(), sync.loadJobs(), sync.loadSyncTargets()]);
        if (p === "lines") await Promise.all([lines.loadLineCoverage(), lines.loadSeedStatus(), lines.loadOfficialStatus(), lines.loadOfficialSources(), lines.loadRankProvinces()]);
        if (p === "acquisition") await acq.loadAcquisition();
        if (p === "events") await events.loadEvents();
        if (p === "settings") await Promise.all([settings.loadProfile(), settings.loadDbConfig()]);
      } catch (e) {
        ElMessage.error(e.message);
      }
    });

    onMounted(async () => {
      if (token.value) await refreshAll();
    });

    return {
      // 全局共享
      token, user, profile, loginForm, loginLoading, loading, page, navItems,
      currentTitle, currentDesc, doLogin, logout, onUserCommand, refreshAll, go,
      exportCsv, fmtTime, jobTag, jobLabel, alignLabel,
      // 各页面
      ...dash, ...uni, ...base, ...ver, ...sync, ...lines, ...acq, ...events, ...settings,
    };
  },
});

app.use(ElementPlus);
app.mount("#app");
