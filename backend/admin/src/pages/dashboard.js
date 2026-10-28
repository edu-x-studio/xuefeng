// 数据看板
import { ref, computed } from "../vue.js";
import { api } from "../api.js";
import { user } from "../state.js";

export function useDashboard() {
  const overview = ref(null);
  const meta = ref(null);

  const kpiCards = computed(() => {
    const k = overview.value ? overview.value.kpis : {};
    return [
      { label: "院校总数", value: k.universities || 0, unit: "所", icon: "school",
        sub: `本科 ${k.benke || 0} · 专科 ${k.zhuanke || 0}` },
      { label: "985 / 211", value: `${k.elite_985 || 0} / ${k.elite_211 || 0}`, icon: "chart",
        sub: `权威清单 112 所（含军校）` },
      { label: "录取基线", value: k.baseline_rows || 0, unit: "行", icon: "database",
        sub: `官方 ${k.official_rows || 0} 行 · 覆盖 ${k.official_provinces || 0} 省` },
      { label: "今日查询", value: k.queries_today || 0, unit: "次", icon: "list",
        sub: `近 7 天 ${k.queries_week || 0} 次 · 累计 ${k.queries_total || 0}` },
    ];
  });

  async function loadOverview() {
    overview.value = await api("/api/admin/overview");
    if (overview.value.admin && user.value) {
      user.value.must_change_password = overview.value.admin.must_change_password;
    }
  }

  async function loadMeta() {
    meta.value = await api("/api/admin/meta");
    if (meta.value.content && !user.value) user.value = { username: "admin" };
  }

  return { overview, meta, kpiCards, loadOverview, loadMeta };
}
