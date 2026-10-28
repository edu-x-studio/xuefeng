// 数据同步
import { ref, reactive, computed, ElMessage } from "../vue.js";
import { api } from "../api.js";

export function useSync() {
  const sources = ref([]);
  const syncTargets = ref(["universities", "admission", "content"]);
  const syncForce = ref(false);
  const syncRefresh = ref(false);
  const syncing = ref(false);
  const lastSync = ref(null);
  const jobs = ref([]);
  const syncTargetsCatalog = ref({});
  const pipeTargets = computed(() =>
    Object.values(syncTargetsCatalog.value).filter((t) => t.kind === "pipeline"));

  async function loadSources() {
    const res = await api("/api/admin/sources");
    sources.value = res.files;
  }

  async function loadJobs() {
    const res = await api("/api/admin/jobs?limit=20");
    jobs.value = res.rows;
  }

  async function loadSyncTargets() {
    const res = await api("/api/admin/sync/targets");
    syncTargetsCatalog.value = res.targets || {};
  }

  async function runSync(only) {
    const targets = only || syncTargets.value;
    if (!targets.length) { ElMessage.warning("请至少选择一个同步目标"); return; }
    syncing.value = true;
    lastSync.value = null;
    try {
      const res = await api("/api/admin/sync", {
        method: "POST",
        body: JSON.stringify({ targets, force: syncForce.value, refresh: syncRefresh.value }),
      });
      lastSync.value = {
        ok: res.ok !== false,
        message: res.message || "同步完成",
      };
      if (res.ok === false) ElMessage.warning(res.message || "部分目标同步失败");
      else ElMessage.success("同步完成");
      await Promise.all([loadSources(), loadJobs(), loadSyncTargets()]);
      if (_loadOverview) await _loadOverview();
    } catch (e) {
      lastSync.value = { ok: false, message: e.message };
      ElMessage.error(e.message);
    } finally {
      syncing.value = false;
    }
  }

  let _loadOverview = null;
  function bindOverview(fn) { _loadOverview = fn; }

  return {
    sources, syncTargets, syncForce, syncRefresh, syncing, lastSync, jobs,
    syncTargetsCatalog, pipeTargets, loadSources, loadJobs, loadSyncTargets, runSync, bindOverview,
  };
}
