// 院校库
import { ref, reactive } from "../vue.js";
import { api } from "../api.js";
import { ElMessage } from "../vue.js";

export function useUniversities() {
  const uniFilters = reactive({ q: "", province: "", level: "", tier: "", nature: "" });
  const uniRows = ref([]);
  const uniTotal = ref(0);
  const uniPage = ref(1);
  const uniPages = ref(1);
  const uniPageSize = 20;
  const uniLoading = ref(false);

  async function loadUniversities(p = 1) {
    uniPage.value = p;
    uniLoading.value = true;
    try {
      const qs = new URLSearchParams({ page: String(p), page_size: String(uniPageSize) });
      Object.entries(uniFilters).forEach(([k, v]) => { if (v) qs.set(k, v); });
      const res = await api(`/api/admin/universities?${qs}`);
      uniRows.value = res.universities;
      uniTotal.value = res.total_matched;
      uniPages.value = res.pages;
    } catch (e) {
      ElMessage.error(e.message);
    } finally {
      uniLoading.value = false;
    }
  }

  function resetUniFilters() {
    Object.keys(uniFilters).forEach((k) => (uniFilters[k] = ""));
    loadUniversities(1);
  }

  return { uniFilters, uniRows, uniTotal, uniPage, uniPages, uniPageSize, uniLoading,
    loadUniversities, resetUniFilters };
}
