// 年度采集台账（P0）+ 数据体检（P2）
import { ref, reactive, computed, ElMessage } from "../vue.js";
import { api } from "../api.js";

export function useAcquisition() {
  const acqMatrix = ref(null);
  const acqYear = ref(null);
  const acqDialog = ref(false);
  const acqSaving = ref(false);
  const acqForm = reactive({ year: null, province: "", category: "", status: "pending",
    source_url: "", source_org: "", note: "" });
  const quality = ref(null);
  const qualityLoading = ref(false);

  const acqCategoryKeys = computed(() => Object.keys((acqMatrix.value || {}).categories || {}));
  const acqDialogLabel = computed(() => (acqForm.province
    ? `${acqForm.year} 年 · ${acqForm.province}` : "登记采集进度"));

  function acqCategoryLabel(cat) {
    const m = acqMatrix.value;
    return (m && m.categories && m.categories[cat]) || cat;
  }
  function acqStatusLabel(status) {
    const m = acqMatrix.value;
    return (m && m.statuses && m.statuses[status]) || status;
  }
  function acqTagType(status) {
    return { pending: "info", collected: "warning", ingested: "success", na: "info" }[status] || "info";
  }
  function acqActualText(cell) {
    if (!cell || !cell.actual && !cell.rows) return "";
    const info = cell.actual || cell;
    if (info.subjects) return `· ${info.subjects.join("/")}`;
    if (info.rows != null) return `· ${info.rows} 行`;
    return "";
  }

  const acqRows = computed(() => {
    const m = acqMatrix.value;
    if (!m || !m.provinces) return [];
    const year = acqYear.value || (m.years && m.years[0]);
    return m.provinces.map((p) => {
      const row = { province: p };
      acqCategoryKeys.value.forEach((cat) => {
        row[cat] = (m.cells && m.cells[`${year}|${p}|${cat}`]) || null;
      });
      return row;
    });
  });

  async function loadAcquisition() {
    try {
      const data = await api("/api/admin/acquisition");
      acqMatrix.value = data;
      if (!acqYear.value || !data.years.includes(acqYear.value)) {
        acqYear.value = data.years[0] || null;
      }
    } catch (_) { /* 未登录/无权限时静默 */ }
  }

  function openAcqCell(province, category) {
    const m = acqMatrix.value;
    const year = acqYear.value || (m && m.years && m.years[0]);
    const cell = (m && m.cells && m.cells[`${year}|${province}|${category}`]) || null;
    acqForm.year = year;
    acqForm.province = province;
    acqForm.category = category;
    acqForm.status = (cell && cell.status) || "pending";
    acqForm.source_url = (cell && cell.source_url) || "";
    acqForm.source_org = (cell && cell.source_org) || "";
    acqForm.note = (cell && cell.note) || "";
    acqDialog.value = true;
  }

  async function saveAcqCell() {
    acqSaving.value = true;
    try {
      await api("/api/admin/acquisition", {
        method: "POST",
        body: JSON.stringify({ ...acqForm, year: Number(acqForm.year) }),
      });
      ElMessage.success("已登记");
      acqDialog.value = false;
      await loadAcquisition();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      acqSaving.value = false;
    }
  }

  async function runQuality() {
    qualityLoading.value = true;
    try {
      quality.value = await api("/api/admin/data-quality");
      ElMessage.success("体检完成");
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      qualityLoading.value = false;
    }
  }

  return {
    acqMatrix, acqYear, acqDialog, acqSaving, acqForm, quality, qualityLoading,
    acqCategoryKeys, acqDialogLabel, acqCategoryLabel, acqStatusLabel, acqTagType,
    acqActualText, acqRows, loadAcquisition, openAcqCell, saveAcqCell, runQuality,
  };
}
