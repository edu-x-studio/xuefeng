// 图标与图表组件（纯展示，使用全局 Vue 的 computed）
import { computed } from "./vue.js";

export const ICONS = {
  dashboard: "M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z",
  school: "M12 2 1 8l11 6 9-4.9V16h2V8L12 2ZM5 12.2V17c0 2.2 3.1 4 7 4s7-1.8 7-4v-4.8l-7 3.8-7-3.8Z",
  chart: "M3 3h2v16h16v2H3V3Zm4 11h3v4H7v-4Zm5-6h3v10h-3V8Zm5-4h3v14h-3V4Z",
  sync: "M12 4V1L8 5l4 4V6a6 6 0 0 1 5.2 9l1.5 1.5A8 8 0 0 0 12 4Zm0 14a6 6 0 0 1-5.2-9L5.3 7.5A8 8 0 0 0 12 20v3l4-4-4-4v3Z",
  list: "M4 5h16v2H4V5Zm0 6h16v2H4v-2Zm0 6h10v2H4v-2Z",
  settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9.4 4a7.6 7.6 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-2-1.2L16.5 2h-4l-.4 2.6a7.6 7.6 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z",
  refresh: "M17.7 6.3A8 8 0 1 0 20 12h-2a6 6 0 1 1-1.8-4.3L13 11h7V4l-2.3 2.3Z",
  download: "M11 3h2v9l3.5-3.5 1.4 1.4L12 16l-5.9-6.1 1.4-1.4L11 12V3ZM4 18h16v2H4v-2Z",
  chevron: "M7 10l5 5 5-5H7Z",
  database: "M12 2c-4.4 0-8 1.3-8 3v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5c0-1.7-3.6-3-8-3Zm0 2c3.9 0 6 .9 6 1s-2.1 1-6 1-6-.9-6-1 2.1-1 6-1Zm6 15c0 .1-2.1 1-6 1s-6-.9-6-1v-2.3c1.4.7 3.5 1.1 6 1.1s4.6-.4 6-1.1V19Zm0-5c0 .1-2.1 1-6 1s-6-.9-6-1v-2.3c1.4.7 3.5 1.1 6 1.1s4.6-.4 6-1.1V14Z",
  upload: "M11 15V7.8L8.4 10.4 7 9l5-5 5 5-1.4 1.4L13 7.8V15h-2ZM4 19h16v2H4v-2Z",
};

export const AppIcon = {
  props: { name: { type: String, default: "dashboard" } },
  computed: { path() { return ICONS[this.name] || ICONS.dashboard; } },
  template: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path :d="path" fill="currentColor" />
    </svg>`,
};

export const LineChart = {
  props: { data: { type: Array, default: () => [] } },
  setup(props) {
    const W = 640, H = 210, pad = { l: 36, r: 14, t: 14, b: 26 };
    const maxV = computed(() => Math.max(4, ...props.data.map((d) => Math.max(d.verify || 0, d.search || 0))));
    const stepX = computed(() => {
      const n = props.data.length;
      return n <= 1 ? 0 : (W - pad.l - pad.r) / (n - 1);
    });
    const px = (i) => pad.l + stepX.value * i;
    const py = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / maxV.value);
    const grid = computed(() => [0, 0.25, 0.5, 0.75, 1].map((r) => ({
      y: pad.t + (H - pad.t - pad.b) * r,
      label: Math.round(maxV.value * (1 - r)),
    })));
    const line = (key) => props.data.map((d, i) => `${i === 0 ? "M" : "L"}${px(i).toFixed(1)},${py(d[key] || 0).toFixed(1)}`).join(" ");
    const pathVerify = computed(() => line("verify"));
    const pathSearch = computed(() => line("search"));
    const areaVerify = computed(() => {
      const base = H - pad.b;
      return `${pathVerify.value} L${px(props.data.length - 1)},${base} L${px(0)},${base} Z`;
    });
    const ptsVerify = computed(() => props.data.map((d, i) => ({ x: px(i), y: py(d.verify || 0) })));
    const xLabels = computed(() => props.data.map((d, i) => ({ x: px(i), label: d.date })).filter((_, i) => i % 2 === 0));
    return { W, H, pad, grid, pathVerify, pathSearch, areaVerify, ptsVerify, xLabels };
  },
  template: `
    <svg class="chart" :viewBox="'0 0 ' + W + ' ' + H" role="img">
      <defs>
        <linearGradient id="lc-verify" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffd24d" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#ffd24d" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g>
        <line v-for="(g,i) in grid" :key="'g'+i" class="grid-line" :x1="pad.l" :x2="W-pad.r" :y1="g.y" :y2="g.y" />
        <text v-for="(g,i) in grid" :key="'t'+i" :x="pad.l-8" :y="g.y+3" text-anchor="end">{{ g.label }}</text>
      </g>
      <path :d="areaVerify" fill="url(#lc-verify)" />
      <path :d="pathSearch" fill="none" stroke="#6db3f2" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <path :d="pathVerify" fill="none" stroke="#ffd24d" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
      <circle v-for="(p,i) in ptsVerify" :key="'c'+i" :cx="p.x" :cy="p.y" r="2.6" fill="#ffd24d" />
      <text v-for="(l,i) in xLabels" :key="'x'+i" :x="l.x" :y="H-6" text-anchor="middle">{{ l.label }}</text>
    </svg>`,
};

export const DonutChart = {
  props: { data: { type: Array, default: () => [] } },
  setup(props) {
    const COLORS = ["#ffd24d", "#f0ad4e", "#6db3f2", "#5a6270"];
    const R = 54, C = 2 * Math.PI * R;
    const total = computed(() => props.data.reduce((s, d) => s + (d.value || 0), 0));
    const segments = computed(() => {
      let acc = 0;
      return props.data.map((d, i) => {
        const len = total.value ? ((d.value || 0) / total.value) * C : 0;
        const seg = { ...d, len, offset: -acc, color: COLORS[i % COLORS.length],
          percent: total.value ? ((d.value || 0) / total.value) * 100 : 0 };
        acc += len;
        return seg;
      });
    });
    return { R, C, total, segments };
  },
  template: `
    <div class="donut-wrap">
      <svg class="donut" viewBox="0 0 150 150">
        <circle cx="75" cy="75" :r="R" fill="none" stroke="#22262e" stroke-width="16" />
        <circle v-for="(s,i) in segments" :key="i" cx="75" cy="75" :r="R" fill="none"
                :stroke="s.color" stroke-width="16" stroke-linecap="butt"
                :stroke-dasharray="s.len + ' ' + (C - s.len)" :stroke-dashoffset="s.offset"
                transform="rotate(-90 75 75)" />
        <text x="75" y="71" text-anchor="middle" fill="#e6e8ec" font-size="19" font-weight="700">{{ total }}</text>
        <text x="75" y="89" text-anchor="middle" fill="#6b7280" font-size="10">所院校</text>
      </svg>
      <div class="donut-legend">
        <div v-for="(s,i) in segments" :key="'l'+i">
          <i :style="{ background: s.color }"></i>{{ s.name }}
          <b>{{ s.value }}</b><small>{{ s.percent.toFixed(1) }}%</small>
        </div>
      </div>
    </div>`,
};

export const BarList = {
  props: { data: { type: Array, default: () => [] } },
  setup(props) {
    const max = computed(() => Math.max(1, ...props.data.map((d) => d.value || 0)));
    return { max };
  },
  template: `
    <div class="bars">
      <div class="bar-row" v-for="d in data" :key="d.name">
        <span>{{ d.name }}</span>
        <div class="bar-track"><div class="bar-fill" :style="{ width: (d.value / max * 100) + '%' }"></div></div>
        <em>{{ d.value }}</em>
      </div>
      <el-empty v-if="!data.length" description="暂无数据" :image-size="60" />
    </div>`,
};
