// 查询日志
import { ref, ElMessage } from "../vue.js";
import { api } from "../api.js";

export function useEvents() {
  const events = ref([]);
  const eventStats = ref({ total: 0, today: 0, week: 0, verify: 0, search: 0 });
  const eventKind = ref("");

  async function loadEvents() {
    const qs = new URLSearchParams({ limit: "60" });
    if (eventKind.value) qs.set("kind", eventKind.value);
    const res = await api(`/api/admin/events?${qs}`);
    events.value = res.rows;
    eventStats.value = res.stats;
  }

  return { events, eventStats, eventKind, loadEvents };
}
