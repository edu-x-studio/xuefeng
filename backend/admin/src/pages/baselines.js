// 录取基线
import { ref, reactive, computed } from "../vue.js";
import { api } from "../api.js";
import { ElMessage } from "../vue.js";

export function useBaselines() {
  const baseFilters = reactive({ province: "", subject: "" });
  const baseRows = ref([]);
  const baseLoading = ref(false);
  const baselineYear = ref(null);
  const baseOfficialCount = computed(() => baseRows.value.filter((r) => r.data_source === "official").length);

  const editDialog = ref(false);
  const editSaving = ref(false);
  const editForm = reactive({ id: null, label: "", min_score: 0, min_rank: 0,
    source_url: "", source_year: null, reason: "" });

  async function loadBaselines() {
    baseLoading.value = true;
    try {
      const qs = new URLSearchParams();
      if (baseFilters.province) qs.set("province", baseFilters.province);
      if (baseFilters.subject) qs.set("subject", baseFilters.subject);
      if (baselineYear.value) qs.set("year", String(baselineYear.value));
      const res = await api(`/api/admin/baselines?${qs}`);
      baseRows.value = res.rows;
      baselineYear.value = res.year;
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      baseLoading.value = false;
    }
  }

  function openEdit(row) {
    editForm.id = row.id;
    editForm.label = `${row.year} · ${row.province}/${row.subject}/${row.tier}`;
    editForm.min_score = row.min_score;
    editForm.min_rank = row.min_rank;
    editForm.source_url = row.source_url || "";
    editForm.source_year = row.source_year || row.year;
    editForm.reason = "";
    editDialog.value = true;
  }

  async function saveEdit() {
    editSaving.value = true;
    try {
      await api(`/api/admin/baselines/${editForm.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          min_score: Number(editForm.min_score),
          min_rank: Number(editForm.min_rank),
          source_url: editForm.source_url,
          source_year: Number(editForm.source_year) || null,
          reason: editForm.reason || "管理端单条修正",
        }),
      });
      ElMessage.success("已保存并留痕");
      editDialog.value = false;
      await loadBaselines();
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      editSaving.value = false;
    }
  }

  return { baseFilters, baseRows, baseLoading, baselineYear, baseOfficialCount,
    editDialog, editSaving, editForm, openEdit, saveEdit, loadBaselines };
}
