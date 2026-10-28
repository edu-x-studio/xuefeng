// 院校投档线导入（D1）+ 自托管种子一键落库（S6）+ 官方逐校落库（S7-A/S8-A）+ 一分一段按省同步（S11）
import { ref, reactive, computed, ElMessage } from "../vue.js";
import { api, apiUpload } from "../api.js";

export function useLines() {
  /* ---------- D1：院校投档线导入 ---------- */
  const lineForm = reactive({
    year: new Date().getFullYear() - 1, province: "河南", subject: "物理类",
    source_url: "", mode: "merge", dry_run: true,
  });
  const lineFile = ref(null);
  const lineFileName = ref("");
  const lineReport = ref(null);
  const lineLoading = ref(false);
  const lineCoverage = ref(null);

  function onLineFileChange(file) {
    lineFile.value = file.raw || file;
    lineFileName.value = file.name || (file.raw && file.raw.name) || "";
    lineReport.value = null;
  }

  function clearLineFile() {
    lineFile.value = null;
    lineFileName.value = "";
    lineReport.value = null;
  }

  async function loadLineCoverage() {
    try {
      lineCoverage.value = await api("/api/admin/school-lines/coverage");
    } catch (_) { /* 未登录/无权限时静默 */ }
  }

  async function submitLines() {
    if (!lineFile.value) { ElMessage.warning("请先选择 CSV / XLSX 文件"); return; }
    lineLoading.value = true;
    try {
      const fd = new FormData();
      fd.append("file", lineFile.value, lineFileName.value || "upload.csv");
      fd.append("year", String(lineForm.year));
      fd.append("province", lineForm.province);
      fd.append("subject", lineForm.subject);
      fd.append("source_url", lineForm.source_url || "");
      fd.append("mode", lineForm.mode);
      fd.append("dry_run", lineForm.dry_run ? "true" : "false");
      const data = await apiUpload("/api/admin/school-lines/import", fd);
      lineReport.value = data;
      ElMessage.success(data.dry_run
        ? "预览完成，确认无误后关闭「仅预览」再提交"
        : `导入完成：新增 ${data.inserted} / 更新 ${data.updated} / 删除 ${data.deleted}`);
      if (!data.dry_run) await loadLineCoverage();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      lineLoading.value = false;
    }
  }

  /* ---------- S6：自托管种子一键落库 ---------- */
  const seedStatus = ref(null);
  const seedReport = ref(null);
  const seedLoading = ref(false);

  const seedText = computed(() => {
    const r = seedReport.value;
    if (!r) return "";
    if (r.dry_run) {
      return `可落库 ${r.estimated.available} 行（真实抓取）+ ${r.official.available} 行（官方）`;
    }
    return `新增 ${r.inserted} / 更新 ${r.updated} / 未变 ${r.unchanged}`;
  });

  async function loadSeedStatus() {
    try {
      seedStatus.value = await api("/api/admin/school-lines/seed-status");
    } catch (_) { /* 未登录/无权限时静默 */ }
  }

  async function runSeedImport() {
    seedLoading.value = true;
    try {
      const data = await api("/api/admin/school-lines/import-seed", {
        method: "POST",
        body: JSON.stringify({ dry_run: false, include: ["estimated", "official"] }),
      });
      seedReport.value = data;
      ElMessage.success(`落库完成：新增 ${data.inserted} / 更新 ${data.updated} / 未变 ${data.unchanged}`);
      await Promise.all([loadLineCoverage(), loadSeedStatus()]);
    } catch (e) {
      ElMessage.error(e.message || "落库失败");
    } finally {
      seedLoading.value = false;
    }
  }

  /* ---------- S7-A / S8-A：官方逐校投档线落库 ---------- */
  const officialStatus = ref(null);
  const officialSources = ref(null);
  const officialReport = ref(null);
  const officialLoading = ref(false);
  const officialFile = ref(null);
  const officialFileName = ref("");
  const officialForm = reactive({
    source_url: "", source_org: "", year: 2024,
    province: "", subject: "物理类", dry_run: true,
  });

  const officialText = computed(() => {
    const r = officialReport.value;
    if (!r) return "";
    const base = `可落库 ${r.accepted} 行 / 拒收 ${r.rejected} 行（共 ${r.total} 行）`;
    if (r.dry_run) return base;
    return `${base}；新增 ${r.inserted} / 更新 ${r.updated} / 未变 ${r.unchanged}`;
  });

  function onOfficialFileChange(file) {
    officialFile.value = file.raw || file;
    officialFileName.value = file.name || (file.raw && file.raw.name) || "";
    officialReport.value = null;
  }

  function clearOfficialFile() {
    officialFile.value = null;
    officialFileName.value = "";
    officialReport.value = null;
  }

  async function loadOfficialStatus() {
    try {
      officialStatus.value = await api("/api/admin/school-lines/official-status");
    } catch (_) { /* 未登录/无权限时静默 */ }
  }

  async function loadOfficialSources() {
    try {
      officialSources.value = await api("/api/admin/school-lines/official-sources");
    } catch (_) { /* 未登录/无权限时静默 */ }
  }

  async function submitOfficial() {
    if (!officialFile.value) { ElMessage.warning("请先选择 CSV / JSON 原表"); return; }
    if (!/^https?:\/\//.test(officialForm.source_url || "")) {
      ElMessage.warning("官方数据必须填写来源链接（省考试院原表地址）");
      return;
    }
    officialLoading.value = true;
    try {
      const fd = new FormData();
      fd.append("file", officialFile.value, officialFileName.value || "official.csv");
      fd.append("year", String(officialForm.year));
      fd.append("province", officialForm.province || "");
      fd.append("subject", officialForm.subject || "");
      fd.append("source_url", officialForm.source_url || "");
      fd.append("source_org", officialForm.source_org || "");
      fd.append("dry_run", officialForm.dry_run ? "true" : "false");
      const data = await apiUpload("/api/admin/school-lines/import-official-file", fd);
      officialReport.value = data;
      ElMessage.success(data.dry_run
        ? "预览完成；确认无误后关闭「仅预览」再提交"
        : `官方落库完成：新增 ${data.inserted} / 更新 ${data.updated}`);
      await Promise.all([loadLineCoverage(), loadSeedStatus(), loadOfficialStatus(), loadOfficialSources()]);
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      officialLoading.value = false;
    }
  }

  /* ---------- S11：一分一段按省同步 ---------- */
  const rankProvs = ref([]);
  const rankCounts = ref(null);
  const rankSyncing = ref("");
  const rankReport = ref(null);
  const rankReportText = computed(() => {
    const r = rankReport.value;
    if (!r) return "";
    const parts = (r.years || []).map((y) => (y.ok
      ? `${y.year}：${y.rows} 行（${Object.entries(y.subjects || {}).map(([k, v]) => `${k} ${v}`).join(" / ")}）`
      : `${y.year}：${y.error}`));
    if (r.db && r.db.length) {
      parts.push("写库：" + r.db.map((d) => (d.error ? `${d.year} 失败` : `${d.year} ${d.rows} 行`)).join(" / "));
    }
    return parts.join("；") || r.error || "";
  });

  function rankTagType(status) {
    return status === "ready" ? "success" : (status === "blocked" ? "danger" : "info");
  }
  function rankStatusLabel(status) {
    return { ready: "可同步", blocked: "受阻", planned: "待接" }[status] || status;
  }

  async function loadRankProvinces() {
    try {
      const data = await api("/api/admin/rank-tables/provinces");
      rankProvs.value = data.provinces || [];
      rankCounts.value = data.counts || null;
    } catch (_) { /* 未登录/无权限时静默 */ }
  }

  async function syncProvince(row) {
    rankSyncing.value = row.province;
    rankReport.value = null;
    try {
      const data = await api("/api/admin/rank-tables/sync", {
        method: "POST",
        body: JSON.stringify({ province: row.province, dry_run: false, write_db: true }),
      });
      rankReport.value = data;
      if (data.ok) ElMessage.success(`${row.province} 同步完成：${data.saved} 个年份`);
      else ElMessage.warning(`${row.province} 同步部分失败，见下方明细`);
      await Promise.all([loadRankProvinces(), loadLineCoverage(), loadSeedStatus()]);
    } catch (e) {
      ElMessage.error(e.message || "同步失败");
    } finally {
      rankSyncing.value = "";
    }
  }

  return {
    lineForm, lineFile, lineFileName, lineReport, lineLoading, lineCoverage,
    onLineFileChange, clearLineFile, submitLines, loadLineCoverage,
    seedStatus, seedReport, seedLoading, seedText, loadSeedStatus, runSeedImport,
    officialStatus, officialReport, officialLoading, officialForm, officialFileName,
    officialText, onOfficialFileChange, clearOfficialFile, submitOfficial, loadOfficialStatus,
    officialSources, loadOfficialSources,
    rankProvs, rankCounts, rankSyncing, rankReport, rankReportText,
    loadRankProvinces, syncProvince, rankTagType, rankStatusLabel,
  };
}
