// 数据版本
import { ref, reactive, ElMessage, ElMessageBox } from "../vue.js";
import { api } from "../api.js";

export function useVersions() {
  const vState = reactive({ active_year: null, versions: [], pending: { total: 0, provinces: [] } });
  const changes = ref([]);
  const checkResult = ref(null);
  const checkDialog = ref(false);
  const newYearDialog = ref(false);
  const newYearForm = reactive({ from_year: null, to_year: null, note: "" });
  const vOperating = ref(false);

  async function loadVersions() {
    const res = await api("/api/admin/versions");
    vState.active_year = res.active_year;
    vState.versions = res.versions;
    vState.pending = res.pending || { total: 0, provinces: [] };
    changes.value = res.changes || [];
  }

  async function loadPending(year) {
    const res = await api(`/api/admin/versions/${year || vState.active_year}/pending`);
    vState.pending = res;
  }

  async function loadChanges() {
    const res = await api("/api/admin/changes?limit=40");
    changes.value = res.rows;
  }

  function openNewYear() {
    const years = vState.versions.map((v) => v.year);
    newYearForm.from_year = vState.active_year;
    newYearForm.to_year = (Math.max(0, ...years) || new Date().getFullYear()) + 1;
    newYearForm.note = "";
    newYearDialog.value = true;
  }

  async function cloneYear() {
    vOperating.value = true;
    try {
      const res = await api("/api/admin/versions/clone", {
        method: "POST",
        body: JSON.stringify({ from_year: Number(newYearForm.from_year),
          to_year: Number(newYearForm.to_year), note: newYearForm.note }),
      });
      ElMessage.success(`已创建 ${res.year} 年草稿（${res.version.rows} 行）`);
      newYearDialog.value = false;
      await loadVersions();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      vOperating.value = false;
    }
  }

  async function validateYear(year) {
    vOperating.value = true;
    try {
      const res = await api(`/api/admin/versions/${year}/validate`, { method: "POST" });
      checkResult.value = res;
      checkDialog.value = true;
      if (!res.ok) ElMessage.error(`存在 ${res.errors.length} 类阻塞问题`);
      else ElMessage.success("校验通过（详见提示项）");
      await loadVersions();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      vOperating.value = false;
    }
  }

  async function publishYear(year, force = false) {
    try {
      await ElMessageBox.confirm(
        force ? "校验未通过，确认强制发布？" : `确认将 ${year} 年发布为生效版本？`,
        "发布确认", { type: force ? "warning" : "info" });
    } catch (_) { return; }
    vOperating.value = true;
    try {
      const res = await api(`/api/admin/versions/${year}/publish`, {
        method: "POST", body: JSON.stringify({ force }),
      });
      ElMessage.success(`${year} 年已发布为生效版本`);
      await loadVersions();
      await loadOverviewSafe();
    } catch (e) {
      if (/阻塞|校验未通过/.test(e.message) && !force) {
        ElMessage.warning("校验未通过，可在核对后强制发布");
      } else {
        ElMessage.error(e.message);
      }
    } finally {
      vOperating.value = false;
    }
  }

  async function rollbackYear(year) {
    try {
      await ElMessageBox.confirm(`确认回滚到 ${year} 年数据？当前生效版本将被归档。`, "回滚确认",
        { type: "warning" });
    } catch (_) { return; }
    vOperating.value = true;
    try {
      await api(`/api/admin/versions/${year}/rollback`, { method: "POST", body: JSON.stringify({}) });
      ElMessage.success(`已回滚到 ${year} 年`);
      await loadVersions();
      await loadOverviewSafe();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      vOperating.value = false;
    }
  }

  async function undoChange(id) {
    try {
      await ElMessageBox.confirm("确认撤销该条修改？", "撤销确认", { type: "warning" });
    } catch (_) { return; }
    try {
      await api(`/api/admin/changes/${id}/undo`, { method: "POST" });
      ElMessage.success("已撤销");
      await loadChanges();
      await loadVersions();
    } catch (e) {
      ElMessage.error(e.message);
    }
  }

  const statusTag = (s) => ({ published: "success", validated: "primary", draft: "warning",
    archived: "info" }[s] || "info");
  const statusLabel = (s) => ({ published: "生效中", validated: "已校验", draft: "草稿",
    archived: "已归档" }[s] || s);
  const actionLabel = (a) => ({ clone: "建年度", patch: "补丁", create: "补录", publish: "发布",
    rollback: "回滚", import: "导入" }[a] || a);

  // 发布/回滚后需刷新看板概览（由 main.js 注入 loadOverview，避免跨模块耦合）
  let _loadOverview = null;
  function bindOverview(fn) { _loadOverview = fn; }
  async function loadOverviewSafe() { if (_loadOverview) await _loadOverview(); }

  return {
    vState, changes, checkResult, checkDialog, newYearDialog, newYearForm, vOperating,
    loadVersions, loadPending, loadChanges, openNewYear, cloneYear, validateYear,
    publishYear, rollbackYear, undoChange, statusTag, statusLabel, actionLabel, bindOverview,
  };
}
