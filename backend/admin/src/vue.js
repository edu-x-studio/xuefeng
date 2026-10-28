// 桥接 vendor 里的全局 Vue / Element Plus（免构建：经典 script 先于模块执行，window.* 已就绪）
export const Vue = window.Vue;
export const ElementPlus = window.ElementPlus;

export const { createApp, ref, reactive, computed, watch, onMounted } = window.Vue;
export const { ElMessage, ElMessageBox } = window.ElementPlus;
