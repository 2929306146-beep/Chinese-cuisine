let appData;
let selectedCuisine = "川菜";
let chinaMapReady = false;
const charts = {};

const chartTheme = {
  textStyle: { fontFamily: "Noto Serif SC, Microsoft YaHei, sans-serif", color: "#f5dcb1" },
  color: ["#f3c46b", "#c6362d", "#8f1d1b", "#ffe4a3", "#d98c45"]
};

function $(selector) { return document.querySelector(selector); }
function formatNumber(value) { return Number(value || 0).toLocaleString("zh-CN"); }
function getProvinceRows(cuisine) {
  return appData.provinces.map((row) => ({ ...row, value: row.stores[cuisine] || 0 }))
    .sort((a, b) => b.value - a.value);
}
function getTotalStores(cuisine) { return getProvinceRows(cuisine).reduce((sum, row) => sum + row.value, 0); }
function getTopProvince(cuisine) { return getProvinceRows(cuisine)[0]; }
function getOriginText(cuisine) { return (appData.origins[cuisine] || []).join("、") || "待补充"; }
function isOriginProvince(cuisine, province) { return (appData.origins[cuisine] || []).includes(province); }
function getStrongestCuisine(row) {
  return Object.entries(row.stores).sort((a, b) => b[1] - a[1])[0] || ["暂无", 0];
}

// ===== Dashboard Bar =====
let dashboardTimer = 0;
function updateDashboard(cuisine, top) {
  const dashCuisine = document.getElementById("dashCuisine");
  const dashStores = document.getElementById("dashStores");
  const dashTop = document.getElementById("dashTop");
  if (dashCuisine) dashCuisine.innerHTML = `浏览菜系: <strong>${cuisine}</strong>`;
  if (dashStores) dashStores.innerHTML = `门店数: <strong>${formatNumber(getTotalStores(cuisine))}</strong>`;
  if (dashTop) dashTop.innerHTML = `最多省份: <strong>${top ? top.province : "--"}</strong>`;
}
function startDashboardTimer() {
  const dashTime = document.getElementById("dashTime");
  if (!dashTime) return;
  let seconds = 0;
  dashboardTimer = setInterval(() => {
    seconds++;
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    dashTime.innerHTML = `浏览时长: <strong>${m}:${s}</strong>`;
  }, 1000);
}
function initDashboard() {
  const bar = document.getElementById("dashboardBar");
  if (!bar) return;
  const heroEl = document.querySelector(".hero");
  const observer = new IntersectionObserver((entries) => {
    bar.classList.toggle("is-visible", !entries[0].isIntersecting);
  }, { threshold: 0 });
  if (heroEl) observer.observe(heroEl);
  startDashboardTimer();
}

async function init() {
  appData = await loadCuisineData();
  if (!appData.cuisines.includes(selectedCuisine)) selectedCuisine = appData.cuisines[0];
  initMetrics();
  initSelectors();
  initFloatingCuisines();
  initCharts();
  await loadChinaMap();
  initTasteData();
  initTasteTabs();
  initTravelRecommend();
  buildProvinceImageMap();
  initCityModal();
  initDashboard();
  initCuisineNetwork();
  initCardExport();
  initScrollSpy();
  initHamburger();
  initFab();
  initRevealObserver();
  initRippleEffects();
  initCompareMode();
  initSeasonGrid();
  initComments();
  updateAll(selectedCuisine);
  updateProvinceCuisine("北京");
  window.addEventListener("resize", () => {
    Object.values(charts).forEach((chart) => { if (chart) chart.resize(); });
  });
}

function initMetrics() {
  const totalStores = appData.cuisines.reduce((sum, cuisine) => sum + getTotalStores(cuisine), 0);
  const metrics = [
    [appData.cuisines.length, "收录菜系"],
    [appData.provinces.length, "覆盖省份"],
    [formatNumber(totalStores), "门店记录"],
    [appData.words.flavors.length + appData.words.ingredients.length + appData.words.dishes.length, "风味词条"]
  ];
  $("#metricStrip").innerHTML = metrics.map(([value, label]) => `<div class="metric"><strong>${value}</strong><span>${label}</span></div>`).join("");
}

function initSelectors() {
  const cuisineSelect = $("#cuisineSelect");
  cuisineSelect.innerHTML = appData.cuisines.map((cuisine) => `<option value="${cuisine}">${cuisine}</option>`).join("");
  cuisineSelect.value = selectedCuisine;
  cuisineSelect.addEventListener("change", (event) => updateAll(event.target.value));
  
  const provinceSelect = $("#provinceSelect");
  if (provinceSelect) {
    const provinces = [...new Set(appData.provinces.map((row) => row.province))];
    provinceSelect.innerHTML = provinces.map((province) => `<option value="${province}">${province}</option>`).join("");
    provinceSelect.value = "北京";
    provinceSelect.addEventListener("change", (event) => updateProvinceCuisine(event.target.value));
  }
}

function initFloatingCuisines() {
  const stage = document.getElementById("floatingCuisines");
  if (!stage) return;
  const positions = [
    [8, 18], [28, 11], [55, 18], [76, 10], [13, 45], [39, 38], [65, 44], [82, 40], [20, 72], [48, 68], [72, 72], [6, 82], [86, 78]
  ];
  stage.innerHTML = appData.cuisines.map((cuisine, index) => {
    const [left, top] = positions[index % positions.length];
    return `<button class="cuisine-word" data-cuisine="${cuisine}" style="left:${left}%;top:${top}%;--delay:${index * -1.45}s;--duration:${12 + (index % 5)}s;--start-size:${32 + (index % 4) * 7}px">${cuisine}</button>`;
  }).join("");
  stage.querySelectorAll(".cuisine-word").forEach((button) => {
    button.addEventListener("mouseenter", () => showHoverCuisine(button.dataset.cuisine));
    button.addEventListener("focus", () => showHoverCuisine(button.dataset.cuisine));
    button.addEventListener("click", () => {
      updateAll(button.dataset.cuisine);
      document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  showHoverCuisine(selectedCuisine);
}

function showHoverCuisine(cuisine) {
  const top = getTopProvince(cuisine);
  $("#hoverCuisineName").textContent = cuisine;
  $("#hoverCuisineMeta").textContent = `起源地：${getOriginText(cuisine)}；门店最多省份：${top?.province || "暂无"}，${formatNumber(top?.value)} 家。点击进入详情。`;
  $("#floatingBg").style.backgroundImage = `url("${appData.images[cuisine] || "图片数据/首页图片.jpg"}")`;
}

function initCharts() {
  const chartEntries = [
    ["heat", "#heatMapChart"],
    ["bar3d", "#bar3DChart"],
    ["lines", "#linesChart"],
    ["sankey", "#sankeyChart"],
    ["word", "#wordCloudChart"],
    ["taste", "#tasteChart"],
    ["brand", "#brandChart"],
    ["tasteMap", "#tasteMapChart"],
    ["provinceCuisine", "#provinceCuisineChart"],
    ["travelMap", "#travelMapChart"],
    ["price", "#priceChart"]
  ];

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const key = el.dataset.chartKey;
      if (!key || charts[key]) return;
      charts[key] = echarts.init(el, chartTheme);
      observer.unobserve(el);
      if (key === "heat" || key === "bar3d" || key === "lines" || key === "sankey" || key === "word" || key === "taste" || key === "brand") {
        updateAll(selectedCuisine);
      }
      if (key === "tasteMap") updateTasteMaps("hot");
      if (key === "provinceCuisine") updateProvinceCuisine("北京");
    });
  }, { rootMargin: "200px" });

  chartEntries.forEach(([key, selector]) => {
    const el = document.querySelector(selector);
    if (el) {
      el.dataset.chartKey = key;
      observer.observe(el);
    }
  });
}

async function loadChinaMap() {
  const urls = [
    "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json",
    "https://geo.datav.aliyun.com/areas_v3/bound/100000.json"
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      const geoJson = await response.json();
      echarts.registerMap("china", geoJson);
      chinaMapReady = true;
      return;
    } catch (error) {
      console.warn("地图加载失败，尝试备用地址", error);
    }
  }
}

function updateAll(cuisine) {
  selectedCuisine = cuisine;
  $("#cuisineSelect").value = cuisine;
  document.querySelectorAll(".cuisine-word").forEach((word) => word.classList.toggle("is-active", word.dataset.cuisine === cuisine));
  showHoverCuisine(cuisine);
  updateDetail(cuisine);
  updateHeatMap(cuisine);
  updateBar3D(cuisine);
  updateLines(cuisine);
  updateSankey(cuisine);
  updateWordCloud(cuisine);
  updateTaste(cuisine);
  updateBrand(cuisine);
  updateTasteMaps();
  updatePrice(cuisine);
  updateSignatureDishes(cuisine);
  renderTimeline(cuisine);
  updateSeasonHighlight(cuisine);
}

function updateDetail(cuisine) {
  const rows = getProvinceRows(cuisine);
  const top = rows[0];
  $("#detailImage").style.backgroundImage = `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(19,7,6,0.35)), url("${appData.images[cuisine] || "图片数据/首页图片.jpg"}")`;
  $("#selectedCuisineTitle").textContent = cuisine;
  $("#selectedCuisineDesc").textContent = `${cuisine}起源于${getOriginText(cuisine)}，当前以全国省份门店数量呈现传播强度。${top ? `${top.province}是该菜系门店数最高的省份。` : "相关门店数据待补充。"}`;
  $("#detailStats").innerHTML = [
    [formatNumber(getTotalStores(cuisine)), "全国门店数"],
    [top ? top.province : "暂无", "门店最高省份"],
    [getOriginText(cuisine), "起源地"]
  ].map(([value, label]) => `<div class="detail-stat"><strong>${value}</strong><span>${label}</span></div>`).join("");
  updateDashboard(cuisine, top);
  // re-render comments when switching cuisine
  renderComments(cuisine);
}

// ===== 菜系名片导出 =====
function initCardExport() {
  const btn = document.getElementById("exportCardBtn");
  if (!btn) return;

  btn.addEventListener("click", () => {
    exportCuisineCard(selectedCuisine);
  });
}

async function exportCuisineCard(cuisine) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 600, 800);
  bg.addColorStop(0, "#2b0907");
  bg.addColorStop(0.5, "#130706");
  bg.addColorStop(1, "#1a0504");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 600, 800);

  ctx.strokeStyle = "#f3c46b";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(20, 20, 560, 760, 22);
  ctx.stroke();

  ctx.strokeStyle = "rgba(243,196,107,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(34, 34, 532, 732, 18);
  ctx.stroke();

  const imgPath = appData.images[cuisine] || "图片数据/首页图片.jpg";
  try {
    const img = await loadImage(imgPath);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(50, 50, 500, 280, 18);
    ctx.clip();
    ctx.drawImage(img, 50, 50, 500, 280);
    ctx.restore();
    const ov = ctx.createLinearGradient(0, 50, 0, 330);
    ov.addColorStop(0, "rgba(19,7,6,0.05)");
    ov.addColorStop(0.8, "rgba(19,7,6,0.55)");
    ctx.fillStyle = ov;
    ctx.beginPath();
    ctx.roundRect(50, 50, 500, 280, 18);
    ctx.fill();
  } catch (e) {
    ctx.fillStyle = "#2d100d";
    ctx.beginPath();
    ctx.roundRect(50, 50, 500, 280, 18);
    ctx.fill();
  }

  ctx.fillStyle = "#ffe4a3";
  ctx.font = "900 44px 'Noto Serif SC', 'Microsoft YaHei', serif";
  ctx.textAlign = "center";
  ctx.fillText(cuisine, 300, 380);

  ctx.strokeStyle = "#f3c46b";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(100, 400);
  ctx.lineTo(500, 400);
  ctx.stroke();

  const yStart = 440;
  const total = formatNumber(getCuisineTotalStores(cuisine));
  const origin = getOriginText(cuisine);
  const top = getTopProvince(cuisine);

  ctx.textAlign = "center";

  ctx.fillStyle = "#d9b989";
  ctx.font = "600 18px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("全国门店数", 300, yStart);
  ctx.fillStyle = "#ffe4a3";
  ctx.font = "900 32px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(total + " 家", 300, yStart + 42);

  ctx.fillStyle = "#d9b989";
  ctx.font = "600 18px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("起源地", 300, yStart + 84);
  ctx.fillStyle = "#ffe4a3";
  ctx.font = "900 26px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(origin, 300, yStart + 118);

  ctx.fillStyle = "#d9b989";
  ctx.font = "600 18px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("门店最多省份", 300, yStart + 158);
  ctx.fillStyle = "#ffe4a3";
  ctx.font = "900 26px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText((top?.province || "--") + "  " + (formatNumber(top?.value) || "--") + " 家", 300, yStart + 192);

  ctx.fillStyle = "rgba(243,196,107,0.5)";
  ctx.font = "500 14px 'Noto Serif SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("华味图鉴 · 中国菜系风味图鉴", 300, 750);

  ctx.fillStyle = "rgba(243,196,107,0.12)";
  ctx.font = "700 11px 'Noto Serif SC', serif";
  ctx.fillText("Chinese Cuisine Data Atlas", 300, 770);

  const link = document.createElement("a");
  link.download = "华味图鉴_" + cuisine + ".png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function updateHeatMap(cuisine) {
  if (!chinaMapReady || !charts.heat) return;
  const rows = getProvinceRows(cuisine);
  const max = Math.max(...rows.map((row) => row.value), 1);
  charts.heat.setOption({
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(19,7,6,0.94)",
      borderColor: "#f3c46b",
      textStyle: { color: "#ffe4a3" },
      formatter: (params) => {
        const province = normalizeProvinceName(params.name);
        const row = appData.provinces.find((item) => item.province === province);
        const strongest = row ? getStrongestCuisine(row) : ["暂无", 0];
        const taste = appData.taste[province] || {};
        return `${province}<br/>${cuisine}：${formatNumber(row?.stores[cuisine])} 家<br/>最强菜系：${strongest[0]} ${formatNumber(strongest[1])} 家<br/>吃辣 ${taste.hot ?? "-"} / 吃甜 ${taste.sweet ?? "-"} / 吃酸 ${taste.sour ?? "-"}`;
      }
    },
    animationDuration: 800,
    animationEasing: 'cubicInOut',
    visualMap: { min: 0, max, left: 22, bottom: 18, text: ["高", "低"], textStyle: { color: "#f5dcb1" }, inRange: { color: ["#35110d", "#7a2825", "#a84a45", "#d4a86a"] } },
    series: [{
      name: cuisine,
      type: "map",
      map: "china",
      roam: true,
      zoom: 1.18,
      label: { show: true, color: "#f9dfaa", fontSize: 11 },
      itemStyle: { borderColor: "rgba(255,228,163,0.4)", areaColor: "#2a0d0b" },
      emphasis: { label: { color: "#fff" }, itemStyle: { areaColor: "#f3c46b" } },
      data: rows.map((row) => ({
        name: getFullProvinceName(row.province),
        value: row.value,
        itemStyle: isOriginProvince(cuisine, row.province) ? { borderColor: "#ffe4a3", borderWidth: 3, shadowBlur: 18, shadowColor: "#f3c46b" } : undefined
      }))
    }]
  }, true);
}

function updateBar3D(cuisine) {
  if (!chinaMapReady || !charts.bar3d) return;
  const rows = getProvinceRows(cuisine).filter((row) => appData.coords[row.province]);
  const max = Math.max(...rows.map((row) => row.value), 1);
  
  charts.bar3d.setOption({
    tooltip: {
      backgroundColor: "rgba(25,15,12,0.95)",
      borderColor: "#c9a06b",
      borderWidth: 1,
      textStyle: { color: "#f9dfaa" },
      padding: [10, 14],
      formatter: (params) => `${params.name}<br/>${cuisine}门店：<b>${formatNumber(params.value[2])}</b> 家`
    },
    visualMap: {
      show: true,
      min: 0,
      max: max,
      calculable: true,
      left: "right",
      top: "center",
      text: ["高", "低"],
      textStyle: { color: "#c9a06b", fontSize: 12 },
      inRange: {
        color: ["#2d100d", "#4a1a16", "#6b2a26", "#8b3a36", "#a8504a", "#b8864e", "#c9a06b"]
      },
      itemWidth: 10,
      itemHeight: 100
    },
    geo3D: {
      map: "china",
      roam: true,
      regionHeight: 2,
      shading: "lambert",
      environment: "none",
      light: {
        main: { intensity: 1.2, shadow: true, shadowQuality: "high", alpha: 45, beta: 25 },
        ambient: { intensity: 0.5 }
      },
      itemStyle: {
        color: "#1a0806",
        borderColor: "rgba(201,160,107,0.5)",
        borderWidth: 1,
        opacity: 0.95
      },
      emphasis: {
        itemStyle: {
          color: "#2d100d",
          borderColor: "#ffe4a3",
          borderWidth: 2
        },
        label: { show: true, color: "#ffe4a3", fontSize: 14, fontWeight: "bold" }
      },
      label: {
        show: true,
        color: "#b8864e",
        fontSize: 10,
        fontWeight: "bold",
        distance: 1
      },
      viewControl: {
        autoRotate: true,
        autoRotateSpeed: 1.0,
        distance: 95,
        alpha: 40,
        beta: 10
      },
      postEffect: { enable: false }
    },
    series: [{
      type: "bar3D",
      coordinateSystem: "geo3D",
      barSize: [2.5, 2.5],
      bevelSize: 0.2,
      shading: "lambert",
      data: rows.map((row) => ({
        name: getFullProvinceName(row.province),
        value: [...appData.coords[row.province], row.value],
        itemStyle: { color: "#c9a06b" }
      })),
      animationDuration: 1000,
      animationEasing: "elasticOut"
    }]
  }, true);
}

function getLineData(cuisine) {
  const origins = appData.origins[cuisine] || [];
  const rows = getProvinceRows(cuisine).filter((row) => row.value > 0 && appData.coords[row.province]);
  return origins.flatMap((origin) => {
    const from = appData.coords[origin];
    if (!from) return [];
    return rows.slice(0, 18).filter((row) => row.province !== origin).map((row) => ({
      name: `${origin} → ${row.province}`,
      coords: [from, appData.coords[row.province]],
      value: row.value
    }));
  });
}

function updateLines(cuisine) {
  if (!chinaMapReady || !charts.lines) return;
  const lineData = getLineData(cuisine);
  const effectData = getProvinceRows(cuisine).filter((row) => row.value > 0 && appData.coords[row.province]).slice(0, 18)
    .map((row) => ({ name: row.province, value: [...appData.coords[row.province], row.value] }));
  charts.lines.setOption({
    animationDuration: 800,
    animationEasing: 'cubicInOut',
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(19,7,6,0.94)",
      borderColor: "#f3c46b",
      textStyle: { color: "#ffe4a3" },
      formatter: (params) => {
        if (params.componentType === "geo") return "";
        let raw = params.data?.value ?? params.value;
        if (Array.isArray(raw)) raw = raw[2];
        const count = Number(raw);
        return `${params.name}<br/>传播强度：${Number.isFinite(count) ? formatNumber(count) : "数据缺失"} 家`;
      }
    },
    geo: { map: "china", roam: true, zoom: 1.16, silent: true, itemStyle: { areaColor: "#2b0d0a", borderColor: "#cfa35c" }, emphasis: { itemStyle: { areaColor: "#8f1d1b" } }, label: { color: "#efd4a3" } },
    series: [
      { type: "lines", coordinateSystem: "geo", zlevel: 2, effect: { show: true, period: 4, trailLength: 0.18, symbol: "arrow", symbolSize: 7 }, lineStyle: { color: "#f3c46b", width: 1.2, opacity: 0.55, curveness: 0.25 }, data: lineData },
      { type: "effectScatter", coordinateSystem: "geo", zlevel: 3, rippleEffect: { brushType: "stroke", scale: 3.2 }, symbolSize: (value) => Math.max(8, Math.min(26, Math.sqrt(value[2]) / 4)), itemStyle: { color: "#ffe4a3" }, data: effectData }
    ]
  }, true);
}

function updateSankey(cuisine) {
  if (!charts.sankey) return;
  const rows = getProvinceRows(cuisine).filter((row) => row.value > 0).slice(0, 10);
  const origins = appData.origins[cuisine] || [];
  const allNames = new Set([cuisine, ...origins, ...rows.map((row) => row.province)]);
  const nodes = [...allNames].map((name) => ({ name }));
  const links = [
    ...origins.map((origin) => ({ source: cuisine, target: origin, value: Math.max(1, Math.round(getTotalStores(cuisine) / Math.max(1, origins.length))) })),
    ...origins.flatMap((origin) => rows.filter((row) => !origins.includes(row.province)).map((row) => ({ source: origin, target: row.province, value: row.value })))
  ];
  charts.sankey.setOption({
    animationDuration: 800,
    animationEasing: 'cubicInOut',
    tooltip: { trigger: "item", triggerOn: "mousemove" },
    series: [{
      type: "sankey",
      layout: "none",
      data: nodes,
      links,
      nodeWidth: 16,
      nodeGap: 12,
      draggable: true,
      label: { color: "#ffe4a3", fontSize: 14, fontWeight: 700 },
      itemStyle: { color: "#8f1d1b", borderColor: "#f3c46b" },
      lineStyle: { color: "gradient", opacity: 0.36, curveness: 0.5 }
    }]
  }, true);
}

const cuisineWordMap = {
  "川菜": [
    { name: "麻辣", value: 100 }, { name: "花椒", value: 95 }, { name: "辣椒", value: 91 }, { name: "豆瓣酱", value: 87 },
    { name: "火锅", value: 83 }, { name: "水煮", value: 79 }, { name: "回锅肉", value: 75 }, { name: "鱼香", value: 71 },
    { name: "担担面", value: 67 }, { name: "红油", value: 63 }, { name: "干煸", value: 59 }, { name: "蒜泥白肉", value: 55 },
    { name: "夫妻肺片", value: 52 }, { name: "酸辣", value: 49 }, { name: "麻婆豆腐", value: 46 }, { name: "毛血旺", value: 43 },
    { name: "泡椒", value: 40 }, { name: "串串香", value: 37 }, { name: "辣子鸡", value: 34 }, { name: "藤椒", value: 31 },
    { name: "鲜香", value: 28 }, { name: "冒菜", value: 25 }, { name: "钵钵鸡", value: 22 }, { name: "香锅", value: 19 },
    { name: "豆花", value: 17 }, { name: "醪糟", value: 15 }, { name: "甜水面", value: 13 }, { name: "冰粉", value: 11 },
    { name: "牛油", value: 27 }, { name: "郫县豆瓣", value: 23 }, { name: "二荆条", value: 18 }, { name: "青花椒", value: 14 },
    { name: "蒜苗", value: 12 }, { name: "仔姜", value: 10 }, { name: "糖醋", value: 9 }, { name: "五香", value: 8 },
    { name: "卤味", value: 7 }, { name: "酸菜鱼", value: 33 }, { name: "宫保鸡丁", value: 29 }, { name: "水煮鱼", value: 21 }
  ],
  "粤菜": [
    { name: "清蒸", value: 100 }, { name: "鲜甜", value: 95 }, { name: "烧腊", value: 90 }, { name: "白切鸡", value: 85 },
    { name: "虾饺", value: 80 }, { name: "煲汤", value: 76 }, { name: "叉烧", value: 72 }, { name: "肠粉", value: 68 },
    { name: "豉汁", value: 64 }, { name: "干炒牛河", value: 60 }, { name: "蚝油", value: 56 }, { name: "姜葱", value: 52 },
    { name: "生抽", value: 48 }, { name: "烧鹅", value: 44 }, { name: "蒜蓉", value: 40 }, { name: "云吞面", value: 36 },
    { name: "老火靓汤", value: 32 }, { name: "滑嫩", value: 28 }, { name: "腊味", value: 25 }, { name: "沙茶", value: 22 },
    { name: "煲仔饭", value: 30 }, { name: "凤爪", value: 26 }, { name: "烧卖", value: 23 }, { name: "艇仔粥", value: 20 },
    { name: "柱侯酱", value: 18 }, { name: "啫啫", value: 16 }, { name: "白灼", value: 27 }, { name: "鱼片粥", value: 14 },
    { name: "及第粥", value: 12 }, { name: "奶黄包", value: 19 }, { name: "萝卜糕", value: 17 }, { name: "马蹄糕", value: 13 },
    { name: "陈皮", value: 15 }, { name: "瑶柱", value: 11 }, { name: "花胶", value: 10 }, { name: "鲍汁", value: 9 },
    { name: "双皮奶", value: 8 }, { name: "姜撞奶", value: 7 }, { name: "虾酱", value: 6 }, { name: "榄角", value: 5 }
  ],
  "湘菜": [
    { name: "香辣", value: 100 }, { name: "剁椒", value: 95 }, { name: "烟熏", value: 90 }, { name: "腊肉", value: 85 },
    { name: "辣椒炒肉", value: 80 }, { name: "酸豆角", value: 75 }, { name: "干锅", value: 70 }, { name: "小炒黄牛肉", value: 65 },
    { name: "剁椒鱼头", value: 60 }, { name: "蒜苗", value: 55 }, { name: "腊味合蒸", value: 50 }, { name: "紫苏", value: 46 },
    { name: "麻辣小龙虾", value: 42 }, { name: "臭豆腐", value: 38 }, { name: "油重", value: 34 }, { name: "鲜辣", value: 30 },
    { name: "豆豉", value: 27 }, { name: "外婆菜", value: 24 }, { name: "酱板鸭", value: 21 }, { name: "擂辣椒", value: 18 },
    { name: "口味虾", value: 33 }, { name: "永州血鸭", value: 29 }, { name: "红烧肉", value: 25 }, { name: "东安鸡", value: 22 },
    { name: "辣椒", value: 36 }, { name: "茶油", value: 19 }, { name: "剁辣椒", value: 17 }, { name: "白辣椒", value: 14 },
    { name: "老姜", value: 12 }, { name: "仔姜", value: 10 }, { name: "米酒", value: 8 }, { name: "剁椒蒸", value: 15 },
    { name: "虎皮青椒", value: 11 }, { name: "辣子鸡", value: 9 }, { name: "酸辣鸡杂", value: 7 }, { name: "萝卜干", value: 6 },
    { name: "野山椒", value: 5 }, { name: "腊八豆", value: 4 }, { name: "坛子菜", value: 3 }, { name: "炒腊牛肉", value: 13 }
  ],
  "鲁菜": [
    { name: "咸鲜", value: 100 }, { name: "葱烧", value: 94 }, { name: "高汤", value: 88 }, { name: "酱香", value: 82 },
    { name: "九转大肠", value: 76 }, { name: "爆炒", value: 70 }, { name: "糖醋鲤鱼", value: 64 }, { name: "葱爆海参", value: 58 },
    { name: "大葱", value: 52 }, { name: "清汤", value: 48 }, { name: "奶汤", value: 44 }, { name: "锅塌", value: 40 },
    { name: "油焖", value: 36 }, { name: "饺子", value: 32 }, { name: "煎饼", value: 28 }, { name: "扒鸡", value: 24 },
    { name: "红烧", value: 22 }, { name: "糖醋", value: 20 }, { name: "海参", value: 18 }, { name: "鲜嫩", value: 16 },
    { name: "糟溜", value: 30 }, { name: "芙蓉", value: 26 }, { name: "油爆双脆", value: 23 }, { name: "德州扒鸡", value: 21 },
    { name: "四喜丸子", value: 19 }, { name: "坛子肉", value: 17 }, { name: "葱油", value: 25 }, { name: "黄焖", value: 15 },
    { name: "芫爆", value: 14 }, { name: "滑炒", value: 13 }, { name: "扒", value: 12 }, { name: "塌", value: 11 },
    { name: "海鲜", value: 27 }, { name: "鲍鱼", value: 10 }, { name: "对虾", value: 9 }, { name: "干贝", value: 8 },
    { name: "章丘大葱", value: 7 }, { name: "煎", value: 6 }, { name: "焖", value: 5 }, { name: "煨", value: 4 }
  ],
  "闽菜": [
    { name: "鲜香", value: 100 }, { name: "佛跳墙", value: 95 }, { name: "沙茶", value: 90 }, { name: "荔枝肉", value: 85 },
    { name: "鱼丸", value: 80 }, { name: "淡雅", value: 75 }, { name: "虾油", value: 70 }, { name: "清鲜", value: 65 },
    { name: "红糟", value: 60 }, { name: "海蛎煎", value: 55 }, { name: "沙县小吃", value: 50 }, { name: "闽南", value: 46 },
    { name: "酸甜", value: 42 }, { name: "鸡汤氽海蚌", value: 38 }, { name: "燕皮", value: 34 }, { name: "五香卷", value: 30 },
    { name: "醉糟", value: 26 }, { name: "土笋冻", value: 22 }, { name: "扁肉", value: 18 }, { name: "线面", value: 14 },
    { name: "福州鱼丸", value: 32 }, { name: "锅边糊", value: 28 }, { name: "肉燕", value: 24 }, { name: "蛏", value: 21 },
    { name: "海蛎", value: 19 }, { name: "蛏干", value: 17 }, { name: "淡菜", value: 15 }, { name: "七星鱼丸", value: 12 },
    { name: "芋泥", value: 20 }, { name: "花生汤", value: 16 }, { name: "润饼", value: 13 }, { name: "烧肉粽", value: 11 },
    { name: "闽东", value: 10 }, { name: "闽北", value: 9 }, { name: "客家", value: 8 }, { name: "红菇", value: 7 },
    { name: "白斩", value: 6 }, { name: "蒜头酱", value: 5 }, { name: "桔烧巴", value: 4 }, { name: "南煎肝", value: 3 }
  ],
  "徽菜": [
    { name: "重油", value: 100 }, { name: "火腿", value: 93 }, { name: "腌鲜", value: 86 }, { name: "毛豆腐", value: 79 },
    { name: "臭鳜鱼", value: 73 }, { name: "笋干", value: 67 }, { name: "石耳", value: 61 }, { name: "香菇", value: 55 },
    { name: "烧炖", value: 49 }, { name: "山珍", value: 43 }, { name: "徽州", value: 39 }, { name: "符离集烧鸡", value: 36 },
    { name: "问政山笋", value: 33 }, { name: "红烧", value: 30 }, { name: "熏腊", value: 27 }, { name: "老母鸡汤", value: 24 },
    { name: "屯溪", value: 21 }, { name: "山粉圆子", value: 18 }, { name: "葛粉", value: 15 }, { name: "重色", value: 12 },
    { name: "中和汤", value: 28 }, { name: "清炖", value: 25 }, { name: "马兰头", value: 22 }, { name: "黄山炖鸽", value: 20 },
    { name: "云雾肉", value: 17 }, { name: "荷叶粉蒸肉", value: 14 }, { name: "虾米", value: 19 }, { name: "火腿炖甲鱼", value: 16 },
    { name: "雪菜", value: 11 }, { name: "腌笃鲜", value: 10 }, { name: "臭豆腐", value: 9 }, { name: "腊肠", value: 8 },
    { name: "竹笋", value: 13 }, { name: "野味", value: 7 }, { name: "葛根", value: 6 }, { name: "茶干", value: 5 },
    { name: "敬亭绿雪", value: 4 }, { name: "祁门", value: 3 }, { name: "休宁", value: 2 }, { name: "歙县", value: 1 }
  ],
  "本帮江浙菜": [
    { name: "浓油赤酱", value: 100 }, { name: "红烧肉", value: 95 }, { name: "清蒸鲈鱼", value: 90 }, { name: "糖醋排骨", value: 85 },
    { name: "腌笃鲜", value: 80 }, { name: "蟹粉", value: 75 }, { name: "龙井虾仁", value: 70 }, { name: "东坡肉", value: 65 },
    { name: "叫花鸡", value: 60 }, { name: "糟卤", value: 55 }, { name: "葱油", value: 50 }, { name: "小笼包", value: 46 },
    { name: "梅干菜", value: 42 }, { name: "雪菜", value: 38 }, { name: "醉蟹", value: 34 }, { name: "笋", value: 30 },
    { name: "黄酒", value: 27 }, { name: "狮子头", value: 24 }, { name: "鲜甜", value: 21 }, { name: "咸鲜", value: 18 },
    { name: "红烧蹄髈", value: 36 }, { name: "油焖笋", value: 32 }, { name: "熏鱼", value: 28 }, { name: "糖藕", value: 25 },
    { name: "八宝鸭", value: 22 }, { name: "生煎包", value: 20 }, { name: "阳春面", value: 17 }, { name: "开洋", value: 15 },
    { name: "草头", value: 14 }, { name: "圈子", value: 12 }, { name: "烤麸", value: 11 }, { name: "鳗鲞", value: 10 },
    { name: "虾籽", value: 9 }, { name: "秃黄油", value: 8 }, { name: "鸡头米", value: 7 }, { name: "水八仙", value: 6 },
    { name: "糟钵头", value: 5 }, { name: "扣三丝", value: 4 }, { name: "面拖蟹", value: 3 }, { name: "爊鸭", value: 2 }
  ],
  "东北菜": [
    { name: "炖", value: 100 }, { name: "锅包肉", value: 94 }, { name: "酸菜", value: 88 }, { name: "小鸡炖蘑菇", value: 82 },
    { name: "铁锅炖", value: 76 }, { name: "地三鲜", value: 70 }, { name: "酱大骨", value: 64 }, { name: "猪肉炖粉条", value: 58 },
    { name: "白菜", value: 52 }, { name: "量大", value: 48 }, { name: "粉条", value: 44 }, { name: "血肠", value: 40 },
    { name: "粘豆包", value: 36 }, { name: "土豆", value: 32 }, { name: "大拉皮", value: 28 }, { name: "豆角", value: 24 },
    { name: "杀猪菜", value: 22 }, { name: "玉米", value: 20 }, { name: "茄子", value: 18 }, { name: "乱炖", value: 16 },
    { name: "溜肉段", value: 30 }, { name: "排骨炖豆角", value: 27 }, { name: "拔丝地瓜", value: 24 }, { name: "松仁玉米", value: 21 },
    { name: "汆白肉", value: 19 }, { name: "老虎菜", value: 17 }, { name: "实诚", value: 15 }, { name: "酸菜白肉锅", value: 14 },
    { name: "大酱", value: 26 }, { name: "黄豆酱", value: 12 }, { name: "冻豆腐", value: 11 }, { name: "宽粉", value: 10 },
    { name: "榛蘑", value: 9 }, { name: "猴头菇", value: 8 }, { name: "黑木耳", value: 7 }, { name: "大碴粥", value: 6 },
    { name: "油豆角", value: 5 }, { name: "旱黄瓜", value: 4 }, { name: "春饼", value: 3 }, { name: "熏酱", value: 2 }
  ],
  "西北菜": [
    { name: "羊肉", value: 100 }, { name: "拉面", value: 95 }, { name: "孜然", value: 90 }, { name: "烤全羊", value: 85 },
    { name: "手抓", value: 80 }, { name: "羊肉泡馍", value: 75 }, { name: "大盘鸡", value: 70 }, { name: "肉夹馍", value: 65 },
    { name: "牛肉面", value: 60 }, { name: "清真", value: 55 }, { name: "麻辣", value: 50 }, { name: "凉皮", value: 46 },
    { name: "臊子面", value: 42 }, { name: "油泼", value: 38 }, { name: "面食", value: 34 }, { name: "烤串", value: 30 },
    { name: "洋芋", value: 26 }, { name: "芫荽", value: 22 }, { name: "酥油", value: 18 }, { name: "馕", value: 14 },
    { name: "羊杂碎", value: 36 }, { name: "浆水面", value: 32 }, { name: "荞面饸饹", value: 28 }, { name: "揪面片", value: 24 },
    { name: "搓鱼面", value: 20 }, { name: "葫芦头", value: 17 }, { name: "腊牛肉", value: 15 }, { name: "水盆羊肉", value: 13 },
    { name: "辣椒油", value: 29 }, { name: "油泼辣子", value: 25 }, { name: "醋", value: 21 }, { name: "蒜泥", value: 12 },
    { name: "土豆", value: 19 }, { name: "胡萝卜", value: 11 }, { name: "黄米", value: 10 }, { name: "糜子", value: 9 },
    { name: "荞麦", value: 8 }, { name: "枸杞", value: 7 }, { name: "甘草", value: 6 }, { name: "锁阳", value: 5 }
  ],
  "新疆菜": [
    { name: "孜然", value: 100 }, { name: "羊肉串", value: 95 }, { name: "大盘鸡", value: 90 }, { name: "烤馕", value: 85 },
    { name: "手抓饭", value: 80 }, { name: "拉条子", value: 75 }, { name: "烤包子", value: 70 }, { name: "皮牙子", value: 65 },
    { name: "酸奶", value: 60 }, { name: "馕包肉", value: 55 }, { name: "马肠子", value: 50 }, { name: "椒麻鸡", value: 46 },
    { name: "奶茶", value: 42 }, { name: "葡萄干", value: 38 }, { name: "清炖羊肉", value: 34 }, { name: "丁丁炒面", value: 30 },
    { name: "胡辣羊蹄", value: 26 }, { name: "薄皮包子", value: 22 }, { name: "纳仁", value: 18 }, { name: "熏马肉", value: 14 },
    { name: "过油肉拌面", value: 32 }, { name: "丸子汤", value: 28 }, { name: "面肺子", value: 24 }, { name: "米肠子", value: 20 },
    { name: "油塔子", value: 17 }, { name: "包尔萨克", value: 15 }, { name: "那仁面", value: 13 }, { name: "恰玛古", value: 11 },
    { name: "西红柿", value: 27 }, { name: "青椒", value: 23 }, { name: "红椒", value: 19 }, { name: "鹰嘴豆", value: 16 },
    { name: "巴旦木", value: 12 }, { name: "核桃", value: 10 }, { name: "无花果", value: 9 }, { name: "哈密瓜", value: 8 },
    { name: "石榴", value: 7 }, { name: "香梨", value: 6 }, { name: "红枣", value: 5 }, { name: "雪莲", value: 4 }
  ],
  "云南菜": [
    { name: "酸辣", value: 100 }, { name: "菌菇", value: 95 }, { name: "过桥米线", value: 90 }, { name: "汽锅鸡", value: 85 },
    { name: "傣味", value: 80 }, { name: "薄荷", value: 75 }, { name: "香茅", value: 70 }, { name: "宣威火腿", value: 65 },
    { name: "鲜花饼", value: 60 }, { name: "酸汤", value: 55 }, { name: "柠檬", value: 50 }, { name: "小米辣", value: 46 },
    { name: "野生菌", value: 42 }, { name: "饵块", value: 38 }, { name: "乳扇", value: 34 }, { name: "折耳根", value: 30 },
    { name: "菠萝饭", value: 26 }, { name: "凉拌", value: 22 }, { name: "蘸水", value: 18 }, { name: "米线", value: 15 },
    { name: "烤乳猪", value: 28 }, { name: "大救驾", value: 24 }, { name: "稀豆粉", value: 20 }, { name: "油炸豌豆粉", value: 17 },
    { name: "腾冲土锅子", value: 14 }, { name: "大理砂锅鱼", value: 12 }, { name: "雕梅", value: 10 }, { name: "酸角", value: 8 },
    { name: "草果", value: 16 }, { name: "大芫荽", value: 13 }, { name: "苦菜", value: 11 }, { name: "树番茄", value: 9 },
    { name: "青苔", value: 7 }, { name: "竹虫", value: 6 }, { name: "蜂蛹", value: 5 }, { name: "鸡枞", value: 27 },
    { name: "松茸", value: 25 }, { name: "牛肝菌", value: 21 }, { name: "干巴菌", value: 19 }, { name: "青头菌", value: 12 }
  ],
  "北京菜": [
    { name: "北京烤鸭", value: 100 }, { name: "涮羊肉", value: 94 }, { name: "炸酱面", value: 88 }, { name: "酱香", value: 82 },
    { name: "爆肚", value: 76 }, { name: "芝麻酱", value: 70 }, { name: "豆汁", value: 64 }, { name: "卤煮", value: 58 },
    { name: "炒肝", value: 52 }, { name: "芥末墩", value: 46 }, { name: "烤羊肉", value: 40 }, { name: "满汉", value: 36 },
    { name: "宫廷糕点", value: 32 }, { name: "酱爆", value: 28 }, { name: "焦圈", value: 24 }, { name: "艾窝窝", value: 20 },
    { name: "豌豆黄", value: 16 }, { name: "酸梅汤", value: 13 }, { name: "铜锅", value: 11 }, { name: "黄酱", value: 9 },
    { name: "它似蜜", value: 22 }, { name: "京酱肉丝", value: 19 }, { name: "炒疙瘩", value: 17 }, { name: "麻豆腐", value: 15 },
    { name: "灌肠", value: 14 }, { name: "茶汤", value: 12 }, { name: "杏仁豆腐", value: 10 }, { name: "奶酪", value: 8 },
    { name: "甜面酱", value: 26 }, { name: "韭菜花", value: 18 }, { name: "酱菜", value: 7 }, { name: "山楂", value: 6 },
    { name: "糖葫芦", value: 5 }, { name: "栗子面", value: 4 }, { name: "羊蝎子", value: 21 }, { name: "白水羊头", value: 3 },
    { name: "炸灌肠", value: 2 }, { name: "饹馇", value: 1 }, { name: "芥末", value: 16 }, { name: "蒜汁", value: 12 }
  ],
  "台湾菜": [
    { name: "卤肉饭", value: 100 }, { name: "蚵仔煎", value: 94 }, { name: "珍珠奶茶", value: 88 }, { name: "三杯鸡", value: 82 },
    { name: "凤梨酥", value: 76 }, { name: "牛肉面", value: 70 }, { name: "盐酥鸡", value: 64 }, { name: "刈包", value: 58 },
    { name: "清淡", value: 52 }, { name: "沙茶", value: 46 }, { name: "蒜蓉", value: 42 }, { name: "芋圆", value: 38 },
    { name: "九层塔", value: 34 }, { name: "姜母鸭", value: 28 }, { name: "甜不辣", value: 24 }, { name: "麻油", value: 21 },
    { name: "铁蛋", value: 18 }, { name: "猪血糕", value: 15 }, { name: "担仔面", value: 12 }, { name: "棺材板", value: 9 },
    { name: "药炖排骨", value: 20 }, { name: "碗粿", value: 17 }, { name: "肉圆", value: 14 }, { name: "大肠包小肠", value: 12 },
    { name: "车轮饼", value: 11 }, { name: "红豆饼", value: 10 }, { name: "刨冰", value: 8 }, { name: "爱玉", value: 7 },
    { name: "酱油膏", value: 16 }, { name: "油葱酥", value: 13 }, { name: "红葱头", value: 11 }, { name: "破布子", value: 6 },
    { name: "荫瓜", value: 5 }, { name: "树子", value: 4 }, { name: "金兰酱油", value: 3 }, { name: "乌醋", value: 2 },
    { name: "凤梨", value: 10 }, { name: "芒果", value: 8 }, { name: "芭乐", value: 6 }, { name: "莲雾", value: 4 }
  ]
};

function updateWordCloud(cuisine) {
  if (!charts.word) return;
  const words = cuisineWordMap[cuisine] || [];
  if (!words.length) {
    charts.word.setOption({
      title: { text: "暂无词云数据", left: "center", top: "middle", textStyle: { color: "#ffe4a3" } },
      series: []
    }, true);
    return;
  }
  const colorPalette = ["#ffe4a3", "#f3c46b", "#d95f45", "#f0b96a", "#e8b44b", "#c9a06b", "#f5dcb1", "#d4a86a"];
  const data = words.map((w, i) => ({
    ...w,
    textStyle: { color: colorPalette[i % colorPalette.length] }
  }));
  charts.word.setOption({
    animationDuration: 800,
    animationEasing: 'cubicInOut',
    tooltip: {
      show: true,
      backgroundColor: "rgba(19,7,6,0.94)",
      borderColor: "#f3c46b",
      textStyle: { color: "#ffe4a3" },
      formatter: (p) => `${p.name}<br/>热度：${p.value}`
    },
    series: [{
      type: "wordCloud",
      shape: "circle",
      sizeRange: [12, 72],
      rotationRange: [-45, 45],
      gridSize: 4,
      drawOutOfBound: false,
      layoutAnimation: true,
      textStyle: {
        fontFamily: "Noto Serif SC, Microsoft YaHei, sans-serif",
        fontWeight: 700
      },
      emphasis: {
        textStyle: { color: "#fff", shadowBlur: 12, shadowColor: "#f3c46b" }
      },
      data: data
    }]
  }, true);
}

function updateTaste(cuisine) {
  if (!charts.taste) return;
  const rows = getProvinceRows(cuisine).slice(0, 8).map((row) => ({ province: row.province, ...(appData.taste[row.province] || {}) }));
  charts.taste.setOption({
    animationDuration: 800,
    animationEasing: 'cubicInOut',
    tooltip: { trigger: "axis" },
    legend: { top: 0, textStyle: { color: "#f5dcb1" } },
    radar: { indicator: rows.map((row) => ({ name: row.province, max: 10 })), radius: "62%", axisName: { color: "#ffe4a3" }, splitLine: { lineStyle: { color: "rgba(243,196,107,0.2)" } }, splitArea: { areaStyle: { color: ["rgba(143,29,27,0.12)", "rgba(243,196,107,0.05)"] } } },
    series: [{ type: "radar", data: [
      { name: "吃辣", value: rows.map((row) => row.hot || 0), areaStyle: { opacity: 0.18 } },
      { name: "吃甜", value: rows.map((row) => row.sweet || 0), areaStyle: { opacity: 0.12 } },
      { name: "吃酸", value: rows.map((row) => row.sour || 0), areaStyle: { opacity: 0.12 } }
    ] }]
  }, true);
}

function updateBrand(cuisine) {
  if (!charts.brand) return;
  const rows = appData.brands.filter((row) => row.cuisine === cuisine).sort((a, b) => a.rank - b.rank).slice(0, 10);
  if (!rows.length) {
    charts.brand.setOption({ title: { text: `${cuisine}品牌数据待补充`, left: "center", top: "middle", textStyle: { color: "#ffe4a3", fontSize: 28, fontFamily: "Noto Serif SC" } }, series: [] }, true);
    return;
  }
  charts.brand.setOption({
    animationDuration: 800,
    animationEasing: 'cubicInOut',
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 120, right: 60, top: 36, bottom: 36 },
    xAxis: { type: "value", axisLabel: { color: "#efd4a3" }, splitLine: { lineStyle: { color: "rgba(243,196,107,0.12)" } } },
    yAxis: { type: "category", inverse: true, data: rows.map((row) => row.brand), axisLabel: { color: "#ffe4a3", fontSize: 14 } },
    series: [{ name: "门店数", type: "bar", data: rows.map((row) => row.stores), itemStyle: { borderRadius: [0, 12, 12, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: "#8f1d1b" }, { offset: 1, color: "#f3c46b" }]) }, label: { show: true, position: "right", color: "#ffe4a3" } }]
  }, true);
}

function updateProvinceCuisine(province) {
  if (!charts.provinceCuisine) return;
  const provinceData = appData.provinces.find((row) => row.province === province);
  if (!provinceData) return;
  
  const cuisineData = Object.entries(provinceData.stores)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  
  $("#provinceChartTitle").textContent = `${province}菜系分布`;
  
  const maxValue = Math.max(...cuisineData.map(([, v]) => v), 1);
  
  const colors = [
    "#8b3a36", "#c9a06b", "#4a7c59", "#6b5b95", "#88b04b",
    "#d65076", "#45b8ac", "#efc050", "#5b5ea6", "#9b2335",
    "#bc243c", "#2d3047"
  ];
  
  charts.provinceCuisine.setOption({
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(25,15,12,0.95)",
      borderColor: "#c9a06b",
      textStyle: { color: "#f9dfaa" }
    },
    grid: { left: 100, right: 40, top: 30, bottom: 50, containLabel: true },
    xAxis: {
      type: "value",
      axisLabel: { color: "#efd4a3", formatter: (val) => formatNumber(val) },
      splitLine: { lineStyle: { color: "rgba(201,160,107,0.12)" } }
    },
    yAxis: {
      type: "category",
      inverse: true,
      data: cuisineData.map(([name]) => name),
      axisLabel: { color: "#ffe4a3", fontSize: 13 }
    },
    series: [{
      name: "门店数",
      type: "bar",
      data: cuisineData.map(([, value], index) => ({
        value: value,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[index % colors.length] },
            { offset: 1, color: colors[index % colors.length] + "99" }
          ]),
          borderRadius: [0, 8, 8, 0]
        }
      })),
      label: { 
        show: true, 
        position: "right", 
        color: "#ffe4a3",
        formatter: (params) => formatNumber(params.value)
      },
      barWidth: "60%",
      animationDuration: 1000,
      animationEasing: "elasticOut"
    }]
  }, true);
  
  const taste = appData.taste[province] || { hot: 0, sweet: 0, sour: 0 };
  $("#provinceTasteInfo").innerHTML = `
    <div class="taste-item">
      <div class="taste-item-label">吃辣指数</div>
      <div class="taste-item-value">${taste.hot || 0}</div>
      <div class="taste-item-bar"><div class="taste-item-bar-fill hot" style="width: ${((taste.hot || 0) / 10) * 100}%"></div></div>
    </div>
    <div class="taste-item">
      <div class="taste-item-label">吃甜指数</div>
      <div class="taste-item-value">${taste.sweet || 0}</div>
      <div class="taste-item-bar"><div class="taste-item-bar-fill sweet" style="width: ${((taste.sweet || 0) / 10) * 100}%"></div></div>
    </div>
    <div class="taste-item">
      <div class="taste-item-label">吃酸指数</div>
      <div class="taste-item-value">${taste.sour || 0}</div>
      <div class="taste-item-bar"><div class="taste-item-bar-fill sour" style="width: ${((taste.sour || 0) / 10) * 100}%"></div></div>
    </div>
  `;
}

function getFullProvinceName(name) {
  const PROVINCE_FULL_NAMES = {
    '北京': '北京市', '天津': '天津市', '河北': '河北省', '山西': '山西省', '内蒙古': '内蒙古自治区',
    '辽宁': '辽宁省', '吉林': '吉林省', '黑龙江': '黑龙江省', '上海': '上海市', '江苏': '江苏省',
    '浙江': '浙江省', '安徽': '安徽省', '福建': '福建省', '江西': '江西省', '山东': '山东省',
    '河南': '河南省', '湖北': '湖北省', '湖南': '湖南省', '广东': '广东省', '广西': '广西壮族自治区',
    '海南': '海南省', '重庆': '重庆市', '四川': '四川省', '贵州': '贵州省', '云南': '云南省',
    '西藏': '西藏自治区', '陕西': '陕西省', '甘肃': '甘肃省', '青海': '青海省', '宁夏': '宁夏回族自治区',
    '新疆': '新疆维吾尔自治区', '台湾': '台湾省', '香港': '香港特别行政区', '澳门': '澳门特别行政区'
  };
  return PROVINCE_FULL_NAMES[name] || name;
}

const TASTE_CONFIG = {
  hot: { title: "吃辣指数", colorStart: "#3d1a1a", colorEnd: "#8b3a36" },
  sweet: { title: "吃甜指数", colorStart: "#2a1a0a", colorEnd: "#c9a06b" },
  sour: { title: "吃酸指数", colorStart: "#1a2a1a", colorEnd: "#4a7c59" }
};

let tasteDataCache = {
  hot: [],
  sweet: [],
  sour: []
};

function initTasteData() {
  const tasteData = appData.taste;
  tasteDataCache.hot = Object.entries(tasteData).map(([province, data]) => ({
    name: getFullProvinceName(province),
    value: data.hot || 0
  }));
  tasteDataCache.sweet = Object.entries(tasteData).map(([province, data]) => ({
    name: getFullProvinceName(province),
    value: data.sweet || 0
  }));
  tasteDataCache.sour = Object.entries(tasteData).map(([province, data]) => ({
    name: getFullProvinceName(province),
    value: data.sour || 0
  }));
}

function updateTasteMaps(tasteType = "hot") {
  if (!charts.tasteMap) return;
  const config = TASTE_CONFIG[tasteType];
  const data = tasteDataCache[tasteType];
  
  $("#tasteMapTitle").textContent = config.title;
  
  const option = {
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(25,15,12,0.95)",
      borderColor: "#c9a06b",
      textStyle: { color: "#f9dfaa" },
      formatter: (params) => `${params.name}<br/>${config.title}：${params.value}`
    },
    visualMap: {
      min: 0,
      max: 10,
      left: "5%",
      bottom: "5%",
      width: "15%",
      height: "60%",
      textStyle: { color: "#ffe4a3", fontSize: 12 },
      inRange: {
        color: [config.colorStart, config.colorEnd]
      },
      text: ["高", "低"],
      calculable: true,
      orient: "vertical"
    },
    series: [{
      name: config.title,
      type: "map",
      map: "china",
      roam: true,
      zoom: 1.2,
      center: [104.114129, 37.550339],
      label: {
        show: true,
        fontSize: 11,
        color: "#ffe4a3",
        fontWeight: "normal"
      },
      emphasis: {
        label: {
          color: "#fff",
          fontSize: 13,
          fontWeight: "bold"
        },
        itemStyle: {
          areaColor: "#c9a06b",
          shadowBlur: 10,
          shadowColor: "rgba(201,160,107,0.5)"
        }
      },
      data: data
    }]
  };
  
  charts.tasteMap.setOption(option, true);
}

function initTasteTabs() {
  document.querySelectorAll(".taste-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".taste-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      updateTasteMaps(tab.dataset.taste);
    });
  });
}

// ===== 菜系关联网络图 =====
function computeCuisineSimilarity() {
  const cuisines = appData.cuisines;
  const wordSets = {};
  cuisines.forEach((cuisine) => {
    const words = cuisineWordMap[cuisine] || [];
    wordSets[cuisine] = new Set(words.map((w) => w.name));
  });

  const links = [];
  for (let i = 0; i < cuisines.length; i++) {
    for (let j = i + 1; j < cuisines.length; j++) {
      const a = cuisines[i];
      const b = cuisines[j];
      const setA = wordSets[a];
      const setB = wordSets[b];
      if (!setA || !setB) continue;
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);
      const jaccard = intersection.size / union.size;

      // geographic adjacency bonus
      const originsA = appData.origins[a] || [];
      const originsB = appData.origins[b] || [];
      let geoBonus = 0;
      for (const oa of originsA) {
        for (const ob of originsB) {
          if (!appData.coords[oa] || !appData.coords[ob]) continue;
          const dx = appData.coords[oa][0] - appData.coords[ob][0];
          const dy = appData.coords[oa][1] - appData.coords[ob][1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 5) geoBonus = Math.max(geoBonus, 0.15);
          else if (dist < 10) geoBonus = Math.max(geoBonus, 0.08);
          else if (dist < 15) geoBonus = Math.max(geoBonus, 0.03);
        }
      }

      const similarity = jaccard + geoBonus;
      if (similarity > 0.08) {
        links.push({ source: a, target: b, value: Math.round(similarity * 100) / 100, lineWidth: similarity * 30 });
      }
    }
  }
  return links;
}

function getCuisineTotalStores(cuisine) {
  let total = 0;
  for (const row of appData.provinces) {
    total += row.stores[cuisine] || 0;
  }
  return total;
}

// dominant flavor color mapping
const FLAVOR_COLORS = ["#c6362d", "#d4a86a", "#4a7c59", "#8f5c38", "#6b5b95", "#d65076", "#45b8ac", "#b8860b", "#9b2335", "#5b5ea6", "#88b04b", "#efc050", "#bc243c", "#2d8ba3"];

function initCuisineNetwork() {
  const el = document.getElementById("networkChart");
  if (!el) return;
  charts.network = echarts.init(el, chartTheme);

  const cuisines = appData.cuisines;
  const maxStores = Math.max(...cuisines.map((c) => getCuisineTotalStores(c)), 1);
  const nodes = cuisines.map((c, i) => ({
    name: c,
    symbolSize: Math.max(28, Math.round(Math.sqrt(getCuisineTotalStores(c) / maxStores) * 72)),
    itemStyle: { color: FLAVOR_COLORS[i % FLAVOR_COLORS.length] },
    category: i
  }));
  const links = computeCuisineSimilarity();

  charts.network.setOption({
    animationDuration: 1500,
    animationEasing: 'cubicInOut',
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(19,7,6,0.94)",
      borderColor: "#f3c46b",
      textStyle: { color: "#ffe4a3" },
      formatter: (params) => {
        if (params.dataType === "edge") {
          return `${params.data.source} ↔ ${params.data.target}<br/>关联强度：${(params.data.value * 100).toFixed(0)}%`;
        }
        const c = params.name;
        const total = getCuisineTotalStores(c);
        return `${c}<br/>全国门店：${formatNumber(total)} 家<br/>起源地：${getOriginText(c)}<br/><span style="font-size:12px;color:#d9b989">点击查看详情</span>`;
      }
    },
    series: [{
      type: "graph",
      layout: "force",
      force: { repulsion: 600, edgeLength: [160, 380], gravity: 0.18, friction: 0.6 },
      roam: true,
      draggable: true,
      data: nodes,
      links: links,
      categories: cuisines.map((c, i) => ({ name: c, itemStyle: { color: FLAVOR_COLORS[i % FLAVOR_COLORS.length] } })),
      label: { show: true, position: "right", color: "#ffe4a3", fontSize: 15, fontWeight: 700 },
      emphasis: {
        focus: "adjacency",
        label: { fontSize: 20, fontWeight: 900 },
        itemStyle: { shadowBlur: 20, shadowColor: "#f3c46b" },
        lineStyle: { width: 5 }
      },
      edgeSymbol: ["none", "none"],
      lineStyle: { color: "rgba(243,196,107,0.45)", curveness: 0.2, opacity: 0.7 },
      edgeLabel: { show: true, fontSize: 10, color: "#d9b989", formatter: (p) => Math.round(p.data.value * 100) + "%" }
    }]
  }, true);

  charts.network.on("click", (params) => {
    if (params.dataType === "node" && params.name) {
      updateAll(params.name);
      document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

// ===== 口味画像测试 + 美食旅行推荐 =====

// Quiz questions – each option maps to [hot, sweet, sour] scores (cumulative, 0-10 range)
const QUIZ_QUESTIONS = [
  {
    q: "你更偏好哪种口感？",
    options: [
      { text: "🔥 麻辣刺激 — 花椒的麻、辣椒的爽", scores: [2.5, 0, 0] },
      { text: "🌿 清鲜柔和 — 食材本味，淡雅鲜美", scores: [0, 1, 0] },
      { text: "🍖 浓郁醇厚 — 酱香浓郁，滋味厚重", scores: [0.5, 1.5, 0] },
      { text: "🍋 酸甜开胃 — 酸甜交织，开胃解腻", scores: [0, 1.5, 2.5] }
    ]
  },
  {
    q: "你对辣的接受度如何？",
    options: [
      { text: "🌶️🌶️🌶️ 无辣不欢，越辣越过瘾", scores: [2.5, 0, 0] },
      { text: "🌶️🌶️ 中等能接受，有辣味就好", scores: [1.5, 0, 0.5] },
      { text: "🌶️ 微辣提味即可，太辣受不了", scores: [0.8, 0.5, 0.5] },
      { text: "❌ 一点辣都不能吃", scores: [0, 1, 0] }
    ]
  },
  {
    q: "你对甜食的态度？",
    options: [
      { text: "🍰 超爱甜！甜点是我的最爱", scores: [0, 2.5, 0] },
      { text: "🍬 喜欢适中的甜，提鲜不腻", scores: [0.5, 1.5, 0.5] },
      { text: "🍵 偶尔吃甜，偏好咸口为主", scores: [1, 0.5, 0] },
      { text: "🚫 完全不吃甜，咸党本党", scores: [1.5, 0, 0.5] }
    ]
  },
  {
    q: "你对酸味的感受？",
    options: [
      { text: "🍋🍋 酸爽过瘾！酸汤、泡菜、醋溜都爱", scores: [0.5, 0, 2.5] },
      { text: "🍋 适中酸度，酸辣平衡最完美", scores: [1, 0, 1.5] },
      { text: "🍶 微微酸即可，点缀就好", scores: [0.5, 0.5, 0.8] },
      { text: "🚫 完全拒绝酸味", scores: [0, 0.5, 0] }
    ]
  },
  {
    q: "你的理想用餐氛围？",
    options: [
      { text: "🏮 热闹市井 — 火锅、大排档、烟火气", scores: [2, 0, 0.5] },
      { text: "🏠 温馨家常 — 妈妈的味道，朴实温暖", scores: [0.5, 1, 0] },
      { text: "🍷 精致讲究 — 摆盘精美，仪式感满满", scores: [0, 1.5, 0.5] },
      { text: "🐫 异域风情 — 探索小众、少数民族风味", scores: [1, 0.5, 2] }
    ]
  }
];

function initTravelRecommend() {
  const startSelect = document.getElementById("startProvinceSelect");
  const stopCountSelect = document.getElementById("stopCountSelect");
  if (!startSelect) return;

  const provincesWithData = Object.keys(appData.taste).filter((p) => appData.coords[p]).sort();
  startSelect.innerHTML = provincesWithData.map((p) => `<option value="${p}">${p}</option>`).join("");

  let userTaste = { hot: 5, sweet: 5, sour: 5 };
  let quizStep = 0;
  // 记录每道题的选择（索引），null 表示未答
  let quizAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);

  function getProvinceCuisines(provinceName) {
    const row = appData.provinces.find((p) => p.province === provinceName);
    if (!row) return ["暂无数据"];
    return Object.entries(row.stores)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);
  }

  function geoDist(a, b) {
    const ca = appData.coords[a];
    const cb = appData.coords[b];
    if (!ca || !cb) return Infinity;
    const dx = ca[0] - cb[0];
    const dy = ca[1] - cb[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  function doRecommend() {
    const startProvince = startSelect.value || provincesWithData[0];
    const stopCount = stopCountSelect ? parseInt(stopCountSelect.value) : 5;

    const results = [];
    for (const [province, taste] of Object.entries(appData.taste)) {
      if (!appData.coords[province]) continue;
      const dHot = userTaste.hot - (taste.hot || 0);
      const dSweet = userTaste.sweet - (taste.sweet || 0);
      const dSour = userTaste.sour - (taste.sour || 0);
      const dist = Math.sqrt(dHot * dHot + dSweet * dSweet + dSour * dSour);
      const score = Math.round(Math.max(0, 100 - dist * 8));
      const topCuisines = getProvinceCuisines(province);
      results.push({ province, score, topCuisines, taste: { hot: taste.hot || 0, sweet: taste.sweet || 0, sour: taste.sour || 0 } });
    }
    results.sort((a, b) => b.score - a.score);
    const topN = results.filter((r) => r.province !== startProvince).slice(0, stopCount);
    const route = buildRoute(startProvince, topN);
    renderTravelRanking(route, startProvince);
    renderTravelMap(route, startProvince);
  }

  function buildRoute(start, targets) {
    const remaining = [...targets];
    const route = [];
    let current = start;
    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = geoDist(current, remaining[i].province);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      route.push(next);
      current = next.province;
    }
    return route;
  }

  // 根据已有的所有回答重新计算 userTaste
  function recalcTaste() {
    userTaste = { hot: 5, sweet: 5, sour: 5 };
    quizAnswers.forEach((answerIdx, step) => {
      if (answerIdx === null) return;
      const scores = QUIZ_QUESTIONS[step].options[answerIdx].scores;
      userTaste.hot = Math.min(10, Math.max(0, userTaste.hot + scores[0]));
      userTaste.sweet = Math.min(10, Math.max(0, userTaste.sweet + scores[1]));
      userTaste.sour = Math.min(10, Math.max(0, userTaste.sour + scores[2]));
    });
  }

  function renderQuiz() {
    const panel = document.getElementById("quizPanel");
    const resultPanel = document.getElementById("quizResult");
    if (!panel) return;
    panel.style.display = "block";
    if (resultPanel) resultPanel.style.display = "none";

    // 更新进度步骤样式
    document.querySelectorAll(".quiz-step").forEach((el) => {
      const s = parseInt(el.dataset.step);
      el.classList.remove("active", "done");
      if (s === quizStep + 1) el.classList.add("active");
      else if (quizAnswers[s - 1] !== null) el.classList.add("done");
    });

    // 为已完成的步骤绑定点击回退
    document.querySelectorAll(".quiz-step.done").forEach((el) => {
      el.style.cursor = "pointer";
      el.title = "点击回到第" + el.dataset.step + "题修改答案";
      // 避免重复绑定
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";
      el.addEventListener("click", () => {
        const targetStep = parseInt(el.dataset.step) - 1;
        // 清除从 targetStep 往后的所有回答
        for (let i = targetStep; i < quizAnswers.length; i++) {
          quizAnswers[i] = null;
        }
        quizStep = targetStep;
        recalcTaste();
        renderQuiz();
      });
    });

    if (quizStep >= QUIZ_QUESTIONS.length) {
      showResult();
      return;
    }

    const q = QUIZ_QUESTIONS[quizStep];
    document.getElementById("quizQuestion").textContent = `Q${quizStep + 1}. ${q.q}`;
    const optsEl = document.getElementById("quizOptions");
    const prevAnswer = quizAnswers[quizStep];
    optsEl.innerHTML = q.options.map((opt, i) =>
      `<button class="quiz-option${i === prevAnswer ? ' quiz-option--picked' : ''}" data-idx="${i}">${opt.text}</button>`
    ).join("");
    optsEl.querySelectorAll(".quiz-option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        quizAnswers[quizStep] = idx;
        recalcTaste();
        quizStep++;
        renderQuiz();
      });
    });
  }

  function showResult() {
    const panel = document.getElementById("quizPanel");
    const resultPanel = document.getElementById("quizResult");
    if (panel) panel.style.display = "none";
    if (resultPanel) resultPanel.style.display = "block";

    const hot = Math.round(userTaste.hot * 10) / 10;
    const sweet = Math.round(userTaste.sweet * 10) / 10;
    const sour = Math.round(userTaste.sour * 10) / 10;

    document.getElementById("resultHotNum").textContent = hot;
    document.getElementById("resultSweetNum").textContent = sweet;
    document.getElementById("resultSourNum").textContent = sour;
    document.getElementById("resultHotBar").style.width = (hot * 10) + "%";
    document.getElementById("resultSweetBar").style.width = (sweet * 10) + "%";
    document.getElementById("resultSourBar").style.width = (sour * 10) + "%";

    // taste badges
    const badges = [];
    if (hot >= 7.5) badges.push('<span class="taste-badge fire">🌶️ 辣王本王</span>');
    else if (hot <= 3) badges.push('<span class="taste-badge sugar">❄️ 滴辣不沾</span>');
    if (sweet >= 7.5) badges.push('<span class="taste-badge sugar">🍬 甜系达人</span>');
    else if (sweet <= 3) badges.push('<span class="taste-badge fire">🧂 咸党万岁</span>');
    if (sour >= 7.5) badges.push('<span class="taste-badge acid">🍋 酸爽专家</span>');
    else if (sour <= 3) badges.push('<span class="taste-badge sugar">🍯 厌酸体质</span>');
    if (Math.abs(hot - sweet) < 2 && Math.abs(sweet - sour) < 2 && Math.abs(hot - sour) < 2) {
      badges.push('<span class="taste-badge balance">⚖️ 五味均衡</span>');
    }

    const badgeRow = document.getElementById("tasteBadges");
    if (badgeRow) badgeRow.innerHTML = badges.join("");

    // extremes
    renderTasteExtremes(hot, sweet, sour);

    doRecommend();
  }

  function renderTasteExtremes(hot, sweet, sour) {
    const container = document.getElementById("tasteExtremes");
    if (!container) return;

    let bestMatch = null, worstMatch = null;
    let bestScore = -Infinity, worstScore = Infinity;

    for (const [province, taste] of Object.entries(appData.taste)) {
      const dHot = hot - (taste.hot || 0);
      const dSweet = sweet - (taste.sweet || 0);
      const dSour = sour - (taste.sour || 0);
      const dist = Math.sqrt(dHot * dHot + dSweet * dSweet + dSour * dSour);
      const score = Math.round(Math.max(0, 100 - dist * 8));

      if (score > bestScore) { bestScore = score; bestMatch = { province, score, taste }; }
      if (score < worstScore) { worstScore = score; worstMatch = { province, score, taste }; }
    }

    if (bestMatch && worstMatch) {
      container.innerHTML = `
        <div class="taste-extreme-card match">
          <h5>🍽️ 最适合你的菜系</h5>
          <div class="extreme-name">${bestMatch.province}</div>
          <div class="extreme-score">匹配度 ${bestMatch.score} 分</div>
        </div>
        <div class="taste-extreme-card mismatch">
          <h5>🤔 可能不太适合</h5>
          <div class="extreme-name">${worstMatch.province}</div>
          <div class="extreme-score">匹配度 ${worstMatch.score} 分</div>
        </div>
      `;
    }
  }

  document.getElementById("retakeBtn").addEventListener("click", () => {
    quizStep = 0;
    userTaste = { hot: 5, sweet: 5, sour: 5 };
    quizAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);
    renderQuiz();
  });

  if (startSelect) startSelect.addEventListener("change", doRecommend);
  if (stopCountSelect) stopCountSelect.addEventListener("change", doRecommend);

  renderQuiz();

  window.addEventListener("resize", () => {
    if (charts.travelMap) charts.travelMap.resize();
  });
}

function renderTravelRanking(route, startProvince) {
  const container = $("#travelRanking");
  if (!route.length) {
    container.innerHTML = '<p class="ranking-placeholder">暂无推荐结果</p>';
    return;
  }
  container.innerHTML = [
    `<div class="ranking-item ranking-start">
      <div class="ranking-rank r0">📍</div>
      <div class="ranking-info">
        <div class="ranking-province">${startProvince}</div>
        <div class="ranking-cuisine">出发地</div>
      </div>
    </div>`,
    ...route.map((item, i) => {
      const rankClass = i === 0 ? "r1" : i === 1 ? "r2" : i === 2 ? "r3" : "rn";
      return `<div class="ranking-item ranking-clickable" data-province="${item.province}" title="点击查看${item.province}详细介绍">
        <div class="ranking-rank ${rankClass}">${i + 1}</div>
        <div class="ranking-info">
          <div class="ranking-province">${item.province}</div>
          <div class="ranking-cuisine">${item.topCuisines.slice(0, 3).join(" · ")}</div>
        </div>
        <div class="ranking-score">${item.score}分</div>
        <span class="ranking-arrow">›</span>
      </div>`;
    })
  ].join("");

  // bind click events
  container.querySelectorAll(".ranking-clickable").forEach((el) => {
    el.addEventListener("click", () => {
      const province = el.dataset.province;
      if (province) openCityModal(province);
    });
  });
}

function renderTravelMap(route, startProvince) {
  if (!chinaMapReady || !charts.travelMap || !route.length) return;

  // build ordered line segments: start → r0 → r1 → ... → rN
  const allStops = [startProvince, ...route.map((r) => r.province)];
  const lineData = [];
  let totalGeoDist = 0;
  for (let i = 0; i < allStops.length - 1; i++) {
    const from = appData.coords[allStops[i]];
    const to = appData.coords[allStops[i + 1]];
    if (!from || !to) continue;
    const dx = from[0] - to[0];
    const dy = from[1] - to[1];
    const segDist = Math.sqrt(dx * dx + dy * dy);
    totalGeoDist += segDist;
    lineData.push({
      name: `${allStops[i]} → ${allStops[i + 1]}`,
      coords: [from, to],
      value: route[i] ? route[i].score : 100,
      segDist: segDist
    });
  }

  const scatterData = route.map((item, i) => ({
    name: item.province,
    value: [...appData.coords[item.province], item.score],
    score: item.score,
    order: i + 1
  }));

  // mark start province
  if (appData.coords[startProvince]) {
    scatterData.unshift({
      name: startProvince,
      value: [...appData.coords[startProvince], 100],
      score: 100,
      order: 0,
      isStart: true
    });
  }

  charts.travelMap.setOption({
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(19,7,6,0.94)",
      borderColor: "#f3c46b",
      textStyle: { color: "#ffe4a3" },
      formatter: (params) => {
        if (params.componentType === "geo") return "";
        if (params.seriesType === "effectScatter" || params.seriesType === "scatter") {
          const v = Array.isArray(params.value) ? params.value[2] : params.value;
          const label = params.data?.isStart ? "出发地" : `匹配度：<b>${v}分</b>`;
          return `${params.name}<br/>${label}`;
        }
        const d = params.data;
        if (d && d.segDist != null) {
          return `${params.name}<br/>距离：${Math.round(d.segDist / 10) / 100}° (~${Math.round(d.segDist * 100)}km)`;
        }
        return params.name;
      }
    },
    geo: {
      map: "china",
      roam: true,
      zoom: 1.16,
      silent: true,
      itemStyle: { areaColor: "#2b0d0a", borderColor: "#cfa35c" },
      emphasis: { itemStyle: { areaColor: "#8f1d1b" } },
      label: { show: true, color: "#efd4a3", fontSize: 9 }
    },
    series: [
      {
        type: "lines",
        coordinateSystem: "geo",
        zlevel: 2,
        polyline: false,
        effect: { show: true, period: 5, trailLength: 0.25, symbol: "arrow", symbolSize: 7 },
        lineStyle: { color: "#f3c46b", width: 2, opacity: 0.7, curveness: 0.2 },
        data: lineData
      },
      {
        type: "effectScatter",
        coordinateSystem: "geo",
        zlevel: 3,
        rippleEffect: { brushType: "stroke", scale: 4 },
        symbolSize: (val) => {
          if (typeof val === "object" && val[2] != null) return Math.max(12, Math.min(36, val[2] / 3.5));
          return 14;
        },
        itemStyle: (p) => ({
          color: p.data?.isStart ? "#ffe4a3" : "#d95f45"
        }),
        label: {
          show: true,
          position: "right",
          color: "#ffe4a3",
          fontSize: 11,
          fontWeight: "bold",
          formatter: (p) => p.data?.isStart ? `${p.name} 🏠` : `${p.data?.order}. ${p.name}`
        },
        data: scatterData
      }
    ]
  }, true);

  // update summary line
  const summary = $("#travelSummary");
  if (summary) {
    summary.innerHTML = `推荐路线共 ${allStops.length} 站 · 第1名匹配度 ${route[0].score} 分 · 全程约 ${Math.round(totalGeoDist * 100)}km · <span style="cursor:pointer;text-decoration:underline">点击榜单城市查看详细介绍</span>`;
  }
}

// ===== 评论系统 (localStorage) =====
const COMMENT_STORAGE_KEY = "huawai_tujian_comments";

function loadComments() {
  try {
    return JSON.parse(localStorage.getItem(COMMENT_STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveComments(data) {
  try {
    localStorage.setItem(COMMENT_STORAGE_KEY, JSON.stringify(data));
  } catch { /* storage full */ }
}

function getCommentsForCuisine(cuisine) {
  const all = loadComments();
  return (all[cuisine] || []).sort((a, b) => b.timestamp - a.timestamp);
}

function addComment(cuisine, nickname, body) {
  const all = loadComments();
  if (!all[cuisine]) all[cuisine] = [];
  const comment = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    nickname: nickname || "匿名食客",
    body: body.trim(),
    timestamp: Date.now(),
    likes: 0,
    likedBy: [],
    verified: null // null | 'correct' | 'incorrect'
  };
  all[cuisine].unshift(comment);
  saveComments(all);
  return comment;
}

function deleteComment(cuisine, commentId) {
  const all = loadComments();
  if (!all[cuisine]) return;
  all[cuisine] = all[cuisine].filter((c) => c.id !== commentId);
  saveComments(all);
}

function toggleLike(cuisine, commentId, userId) {
  const all = loadComments();
  if (!all[cuisine]) return null;
  const comment = all[cuisine].find((c) => c.id === commentId);
  if (!comment) return null;
  if (!comment.likedBy) comment.likedBy = [];
  const idx = comment.likedBy.indexOf(userId);
  if (idx >= 0) {
    comment.likedBy.splice(idx, 1);
    comment.likes = Math.max(0, comment.likes - 1);
  } else {
    comment.likedBy.push(userId);
    comment.likes = (comment.likes || 0) + 1;
  }
  saveComments(all);
  return comment;
}

function setCommentVerify(cuisine, commentId, status) {
  const all = loadComments();
  if (!all[cuisine]) return;
  const comment = all[cuisine].find((c) => c.id === commentId);
  if (!comment) return;
  comment.verified = comment.verified === status ? null : status;
  saveComments(all);
}

function getUserFingerprint() {
  let fp = localStorage.getItem("hw_uid");
  if (!fp) {
    fp = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    localStorage.setItem("hw_uid", fp);
  }
  return fp;
}

const AVATAR_COLORS = ["#c6362d", "#d4a86a", "#4a7c59", "#6b5b95", "#d65076", "#45b8ac", "#b8860b"];
function getAvatarColor(nickname) {
  let hash = 0;
  for (let i = 0; i < (nickname || "").length; i++) hash = nickname.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function renderComments(cuisine) {
  const list = document.getElementById("commentsList");
  const countEl = document.getElementById("commentsCount");
  if (!list) return;

  const comments = getCommentsForCuisine(cuisine);
  if (countEl) countEl.textContent = comments.length + " 条评论";

  if (!comments.length) {
    list.innerHTML = '<div class="comment-empty"><span class="comment-empty-icon">🍽️</span>还没有评论，来做第一个评价的人吧！</div>';
    return;
  }

  const uid = getUserFingerprint();
  list.innerHTML = comments.map((c) => {
    const time = new Date(c.timestamp);
    const timeStr = time.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }) + " " + time.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    const avatarEmoji = ["🐲","🦊","🐼","🐧","🐱","🐶","🐰","🐻","🐨","🦁","🐯","🐸","🦄","🐙","🐵"][Math.abs(c.id.charCodeAt(0)) % 15];
    const isOwner = (c.likedBy || []).includes(uid) || false;
    const verifiedHtml = c.verified
      ? `<span class="comment-verify-badge ${c.verified}">${c.verified === 'correct' ? '✅ 说得对' : '❌ 有异议'}</span>`
      : "";

    return `<div class="comment-card">
      <div class="comment-header">
        <div class="comment-author">
          <span class="comment-author-avatar" style="background:${getAvatarColor(c.nickname)}">${avatarEmoji}</span>
          ${c.nickname}
          ${verifiedHtml}
        </div>
        <span class="comment-time">${timeStr}</span>
      </div>
      <p class="comment-body">${c.body}</p>
      <div class="comment-actions-row">
        <button class="comment-action-btn ${isOwner ? 'liked' : ''}" data-action="like" data-id="${c.id}">
          ${isOwner ? '❤️' : '🤍'} ${c.likes || 0}
        </button>
        <button class="comment-action-btn" data-action="verify-correct" data-id="${c.id}" title="认为这条评论说得对">👍 说得对</button>
        <button class="comment-action-btn" data-action="verify-incorrect" data-id="${c.id}" title="认为这条评论不太对">👎 有异议</button>
        <button class="comment-delete-btn" data-action="delete" data-id="${c.id}" title="删除这条评论">删除</button>
      </div>
    </div>`;
  }).join("");

  // bind events
  list.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === "like") {
        const updated = toggleLike(cuisine, id, uid);
        if (updated) renderComments(cuisine);
      } else if (action === "verify-correct") {
        setCommentVerify(cuisine, id, "correct");
        renderComments(cuisine);
      } else if (action === "verify-incorrect") {
        setCommentVerify(cuisine, id, "incorrect");
        renderComments(cuisine);
      } else if (action === "delete") {
        deleteComment(cuisine, id);
        renderComments(cuisine);
      }
    });
  });
}

function initComments() {
  const submitBtn = document.getElementById("commentSubmit");
  const textarea = document.getElementById("commentTextarea");
  const nicknameInput = document.getElementById("commentNickname");
  const hint = document.getElementById("commentHint");

  // restore nickname
  const savedNick = localStorage.getItem("hw_nickname");
  if (savedNick && nicknameInput) nicknameInput.value = savedNick;

  if (submitBtn) {
    submitBtn.addEventListener("click", () => {
      const body = textarea?.value?.trim();
      if (!body) {
        if (textarea) { textarea.focus(); textarea.style.borderColor = "#c6362d"; setTimeout(() => { textarea.style.borderColor = ""; }, 1500); }
        return;
      }
      const nickname = nicknameInput?.value?.trim() || "匿名食客";
      if (nicknameInput?.value) {
        localStorage.setItem("hw_nickname", nickname);
      }
      addComment(selectedCuisine, nickname, body);
      if (textarea) textarea.value = "";
      if (hint) hint.textContent = "✅ 评论已发表！感谢你的反馈~";
      setTimeout(() => { if (hint) hint.textContent = "💡 你可以说这道菜的数据准不准"; }, 2000);
      renderComments(selectedCuisine);
    });
  }

  // Ctrl+Enter to submit
  if (textarea) {
    textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        submitBtn?.click();
      }
    });
  }
}
const CITY_INTRO_DATA = {
  "四川": { tags: ["天府之国", "川菜起源地"], intro: "四川省会成都，地处四川盆地西部，自古有\"天府之国\"美誉。这里是中国四大菜系之一川菜的发源地，火锅、串串香遍布街头巷尾，宽窄巷子和锦里古街浓缩了老成都的悠闲生活。", foods: ["麻辣火锅", "担担面", "麻婆豆腐", "回锅肉", "夫妻肺片", "串串香", "龙抄手", "钟水饺"], tips: ["春熙路、太古里适合购物休闲", "宽窄巷子适合感受老成都文化", "建议游玩2-3天，春秋最佳", "不能吃太辣记得说\"微辣\""] },
  "湖南": { tags: ["潇湘大地", "湘菜起源地"], intro: "湖南省会长沙，地处湘江下游，是湘菜的发源地。湘菜以香辣著称，剁椒鱼头、小炒黄牛肉名扬天下。岳麓山、橘子洲头、湖南省博物馆是必游景点，茶颜悦色更是年轻人的打卡圣地。", foods: ["剁椒鱼头", "辣椒炒肉", "臭豆腐", "口味虾", "糖油粑粑", "酱板鸭", "浏阳蒸菜", "刮凉粉"], tips: ["橘子洲周末有烟花表演", "岳麓书院值得花半天细逛", "建议游玩2-3天", "五一广场周边美食最集中"] },
  "广东": { tags: ["美食天堂", "粤菜起源地"], intro: "广东省会广州，地处珠三角，是中国南大门。粤菜讲究清中求鲜、淡中求美，早茶文化深入人心。广州塔、沙面岛、长隆乐园各具特色，从街边肠粉到米其林烧腊，处处是美食惊喜。", foods: ["虾饺", "肠粉", "白切鸡", "烧鹅", "煲仔饭", "云吞面", "叉烧", "双皮奶"], tips: ["老字号茶楼建议早上8点前去排队", "荔湾、越秀老城区美食最地道", "建议游玩3-4天", "珠江夜游值得体验"] },
  "北京": { tags: ["首都", "古都风貌"], intro: "北京是中国首都，六朝古都，历史与现代交融。故宫、长城、天坛承载千年文明，三里屯、国贸展现现代活力。北京烤鸭名扬天下，铜锅涮肉、炸酱面是老北京的味觉记忆。", foods: ["北京烤鸭", "涮羊肉", "炸酱面", "卤煮火烧", "炒肝", "豆汁焦圈", "爆肚", "豌豆黄"], tips: ["故宫需提前预约", "建议游玩3-5天", "秋天红叶和春天花开最美", "南锣鼓巷适合感受胡同文化"] },
  "上海": { tags: ["魔都", "本帮菜发源地"], intro: "上海市地处长江入海口，是中国最大的经济中心。本帮菜以浓油赤酱为特色，红烧肉、小笼包是经典代表。外滩、豫园、新天地浓缩了上海的过去与未来，弄堂里的生煎馒头是这座城市最朴实的烟火气。", foods: ["小笼包", "生煎包", "红烧肉", "蟹粉豆腐", "腌笃鲜", "葱油拌面", "糖醋排骨", "八宝鸭"], tips: ["外滩夜景必看", "建议游玩2-3天", "地铁出行最方便", "城隍庙小吃种类丰富但偏贵"] },
  "重庆": { tags: ["山城", "火锅之都"], intro: "重庆市依山而建，两江交汇，是一座3D魔幻城市。重庆火锅以牛油麻辣见长，九宫格是经典的吃法。洪崖洞夜景如宫崎骏动画，轻轨穿楼、长江索道是独特的城市名片。", foods: ["重庆火锅", "小面", "酸辣粉", "毛血旺", "水煮鱼", "辣子鸡", "抄手", "豆花饭"], tips: ["洪崖洞亮灯时间约18:00-23:00", "建议游玩2-3天", "夏天的重庆很热做好防暑", "磁器口古镇适合买特产"] },
  "浙江": { tags: ["江南水乡", "浙菜发源地"], intro: "浙江省会杭州，自古有\"人间天堂\"美誉。西湖十景四季皆美，龙井茶香飘千年。浙菜清鲜雅致，龙井虾仁、东坡肉最具代表性。乌镇、西塘等水乡古镇让人仿佛穿越时光。", foods: ["东坡肉", "龙井虾仁", "叫花鸡", "西湖醋鱼", "片儿川", "定胜糕", "葱包烩", "藕粉"], tips: ["西湖骑行是最佳游览方式", "建议游玩2-3天", "春天龙井茶园值得探访", "灵隐寺环境清幽适合静心"] },
  "江苏": { tags: ["六朝古都", "淮扬菜发源地"], intro: "江苏省会南京，六朝古都，梧桐大道是城市最美的风景线。淮扬菜以精细刀工和清鲜口味闻名，盐水鸭、狮子头是国宴级菜品。苏州园林、扬州早茶、无锡太湖，一省多味令人流连。", foods: ["盐水鸭", "狮子头", "扬州炒饭", "大煮干丝", "蟹粉汤包", "松鼠鳜鱼", "三套鸭", "文思豆腐"], tips: ["南京建议游玩2-3天", "苏州园林建议工作日去人少", "扬州早茶不可错过", "秋天栖霞山红叶绝美"] },
  "福建": { tags: ["海上花园", "闽菜发源地"], intro: "福建省会福州，与厦门、泉州构成闽南金三角。闽菜以清鲜淡雅著称，佛跳墙被誉为闽菜之首。厦门鼓浪屿文艺十足，武夷山茶文化深厚，沙县小吃走出国门香飘世界。", foods: ["佛跳墙", "沙茶面", "海蛎煎", "鱼丸", "荔枝肉", "土笋冻", "沙县小吃", "面线糊"], tips: ["鼓浪屿需提前购船票", "建议游玩3-4天", "厦门适合慢节奏旅行", "武夷山建议留出2天"] },
  "贵州": { tags: ["山水秘境", "酸辣贵州"], intro: "贵州省会贵阳，地处云贵高原，山清水秀。贵州菜以酸辣为魂，酸汤鱼是招牌。黄果树瀑布、西江千户苗寨、荔波小七孔是世界级景观，茅台镇的酒香弥漫千年。", foods: ["酸汤鱼", "肠旺面", "丝娃娃", "花溪牛肉粉", "辣子鸡", "豆米火锅", "恋爱豆腐果", "雷家豆腐圆子"], tips: ["黄果树瀑布夏季水量最大", "建议游玩3-5天", "苗寨可体验长桌宴", "贵州多山路做好晕车准备"] },
  "云南": { tags: ["彩云之南", "云南菜发源地"], intro: "云南省会昆明，四季如春。云南菜以鲜香酸辣见长，野生菌、过桥米线是不可错过的美味。大理古城苍山洱海如诗如画，丽江古城浪漫惬意，西双版纳热带风情浓郁。", foods: ["过桥米线", "汽锅鸡", "野生菌火锅", "宣威火腿", "鲜花饼", "傣味烤鱼", "乳扇", "饵块"], tips: ["昆明适合作为中转站", "建议游玩5-7天", "大理洱海骑行很美", "雨季吃菌子一定去正规店"] },
  "新疆": { tags: ["西域风情", "新疆菜发源地"], intro: "新疆首府乌鲁木齐，是中国面积最大的省级行政区。新疆菜以羊肉和面食为主，大盘鸡、烤羊肉串、手抓饭充满西域豪情。喀纳斯湖、天山天池、吐鲁番火焰山，自然风光雄奇壮丽。", foods: ["羊肉串", "大盘鸡", "手抓饭", "烤包子", "拉条子", "馕", "椒麻鸡", "酸奶"], tips: ["建议游玩7-10天", "北疆秋天最美南疆四季可去", "时差约2小时注意作息", "尊重当地少数民族习俗"] },
  "陕西": { tags: ["十三朝古都", "面食王国"], intro: "陕西省会西安，十三朝古都，兵马俑震撼世界。陕西是面食王国，油泼面、肉夹馍、羊肉泡馍承载三秦饮食文化。古城墙、大唐不夜城、回民街，历史与现代在这片土地上完美交融。", foods: ["羊肉泡馍", "肉夹馍", "凉皮", "油泼面", "臊子面", "葫芦头", "灌汤包子", "柿子饼"], tips: ["兵马俑建议请导游讲解", "建议游玩3-4天", "回民街适合晚上逛", "华山可安排一日游"] },
  "湖北": { tags: ["九省通衢", "鱼米之乡"], intro: "湖北省会武汉，九省通衢，长江、汉江穿城而过。湖北菜以\"蒸煨\"见长，排骨藕汤温润人心。武汉热干面是过早的灵魂，黄鹤楼、东湖、湖北省博物馆展示了荆楚文化的厚重。", foods: ["热干面", "排骨藕汤", "武昌鱼", "豆皮", "面窝", "鸭脖", "欢喜坨", "糊汤粉"], tips: ["武汉过早文化值得体验", "建议游玩2-3天", "樱花季武大限流需预约", "黄鹤楼傍晚看长江落日"] },
  "安徽": { tags: ["江淮大地", "徽菜起源地"], intro: "安徽省会合肥，黄山天下奇。徽菜以重油重色重火功著称，臭鳜鱼、毛豆腐是极具辨识度的美味。黄山云海日出、宏村西递徽派建筑、九华山佛教圣地，安徽是自然与人文的完美结合。", foods: ["臭鳜鱼", "毛豆腐", "符离集烧鸡", "徽州火腿", "黄山烧饼", "问政山笋", "葛粉圆子", "中和汤"], tips: ["黄山建议安排1-2天", "建议游玩3-4天", "宏村清晨最美游人少", "山上住宿需提前预订"] },
  "山东": { tags: ["孔孟之乡", "鲁菜发源地"], intro: "山东省会济南，齐鲁大地，儒家文化发源地。鲁菜是中国最古老的菜系之一，以咸鲜为主、火候精湛。泰山日出、青岛啤酒、曲阜三孔，山东的旅游资源丰富多样。", foods: ["糖醋鲤鱼", "九转大肠", "葱烧海参", "德州扒鸡", "油旋", "煎饼", "饺子", "锅塌豆腐"], tips: ["泰山夜爬看日出是经典路线", "建议游玩3-5天", "青岛啤酒节8月最热闹", "曲阜适合安排1天"] },
  "河南": { tags: ["中原腹地", "豫菜之源"], intro: "河南省会郑州，中华文明的重要发源地。豫菜讲究五味调和，烩面、胡辣汤是河南人的日常。少林寺、龙门石窟、清明上河园展示了中原大地的深厚底蕴。", foods: ["烩面", "胡辣汤", "道口烧鸡", "开封小笼包", "洛阳水席", "芝麻烧饼", "鸡蛋灌饼", "浆面条"], tips: ["洛阳龙门石窟建议上午去", "建议游玩3-4天", "少林寺可当天往返", "开封夜市很热闹"] },
  "辽宁": { tags: ["关东大地", "老工业基地"], intro: "辽宁省会沈阳，大连是滨海明珠。东北菜分量实在，锅包肉、猪肉炖粉条是桌上常客。大连海鲜肥美，沈阳故宫、本溪水洞、丹东边境各有特色。", foods: ["锅包肉", "杀猪菜", "小鸡炖蘑菇", "酸菜白肉", "酱大骨", "地三鲜", "大拉皮", "粘豆包"], tips: ["大连最适合夏季避暑", "建议游玩3-4天", "沈阳故宫半天可逛完", "冬天可以体验冰雪项目"] },
  "黑龙江": { tags: ["冰雪世界", "北国冰城"], intro: "黑龙江省会哈尔滨，冰城夏都。俄式建筑与东北豪爽完美融合，红肠、大列巴、马迭尔冰棍是城市名片。冰雪大世界如梦如幻，雪乡童话世界让人忘记寒冷。", foods: ["锅包肉", "杀猪菜", "得莫利炖鱼", "哈尔滨红肠", "马迭尔冰棍", "大列巴", "猪肉炖粉条", "冻梨"], tips: ["冰雪大世界12月底开园", "建议游玩3-4天", "冬天注意防寒保暖", "中央大街适合慢慢逛"] },
  "广西": { tags: ["山水甲天下", "米粉天堂"], intro: "广西首府南宁，桂林山水甲天下。广西人以粉为魂，螺蛳粉、老友粉、桂林米粉各有拥趸。漓江竹筏、阳朔西街、德天瀑布，广西用山水吸引着全世界的目光。", foods: ["螺蛳粉", "桂林米粉", "老友粉", "柠檬鸭", "荔浦芋扣肉", "田螺酿", "酸野", "龟苓膏"], tips: ["桂林建议游玩2-3天", "阳朔适合骑行游", "建议游玩4-5天", "北海银滩适合冬天避寒"] }
};

// 省份→菜系图片映射（按最强菜系自动对应）
const PROVINCE_CUISINE_IMAGE_MAP = {};
function buildProvinceImageMap() {
  for (const row of appData.provinces) {
    const sorted = Object.entries(row.stores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const topCuisine = sorted[0][0];
      if (appData.images[topCuisine]) {
        PROVINCE_CUISINE_IMAGE_MAP[row.province] = appData.images[topCuisine];
      }
    }
  }
}
function getProvinceHeroImage(province) {
  if (PROVINCE_CUISINE_IMAGE_MAP[province]) return PROVINCE_CUISINE_IMAGE_MAP[province];
  return "图片数据/首页图片.jpg";
}

function getCityData(province) {
  if (CITY_INTRO_DATA[province]) {
    return { ...CITY_INTRO_DATA[province], hero: getProvinceHeroImage(province) };
  }
  const row = appData.provinces.find((p) => p.province === province);
  const top = row
    ? Object.entries(row.stores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n]) => n)
    : [];
  return {
    hero: getProvinceHeroImage(province),
    tags: [province, ...top.slice(0, 2)],
    intro: `${province}省，地处中国，拥有独特的地域文化和饮食传统。本地菜系融合了多种风味，${top.length ? `以${top.join("、")}最具代表性。` : "等待你亲自探索。"}`,
    foods: top.length ? top : ["当地特色菜"],
    tips: [`建议游玩2-3天`, `提前了解当地天气`, `品尝当地特色美食`, `尊重当地风俗习惯`]
  };
}

function initCityModal() {
  const overlay = $("#cityModalOverlay");
  const closeBtn = $("#cityModalClose");
  if (!overlay || !closeBtn) return;

  closeBtn.addEventListener("click", closeCityModal);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeCityModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) closeCityModal();
  });
}

function openCityModal(province) {
  const data = getCityData(province);
  const overlay = $("#cityModalOverlay");
  if (!overlay) return;

  $("#cityModalHero").style.backgroundImage = `url("${data.hero}")`;
  $("#cityModalTitle").textContent = province;
  $("#cityModalTags").innerHTML = data.tags.map((t) => `<span class="city-modal-tag">${t}</span>`).join("");
  $("#cityModalIntro").textContent = data.intro;
  $("#cityModalFoods").innerHTML = data.foods.map((f) => `<span class="city-modal-food">${f}</span>`).join("");
  $("#cityModalTips").innerHTML = data.tips.map((t) => `<div class="city-modal-tip"><span class="city-modal-tip-icon">💡</span><span>${t}</span></div>`).join("");

  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeCityModal() {
  const overlay = $("#cityModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.style.overflow = "";
}

// Hook up in init: call initCityModal() + make ranking items clickable
const origInitTravelRec = initTravelRecommend;
// override initTravelRecommend to also init modal
window._cityModalInited = false;

// ===== Scroll Spy 导航滚动监听 =====
function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a, .mobile-nav-panel a");

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute("id");
        navLinks.forEach((link) => {
          link.classList.toggle("nav-active", link.getAttribute("href") === "#" + id);
        });
      }
    });
  }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });

  sections.forEach((section) => { if (section.id) observer.observe(section); });
}

// ===== 汉堡菜单 =====
function initHamburger() {
  const btn = document.getElementById("hamburgerBtn");
  const panel = document.getElementById("mobileNavPanel");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const isOpen = btn.classList.toggle("is-open");
    panel.classList.toggle("is-open", isOpen);
    document.body.style.overflow = isOpen ? "hidden" : "";
  });

  panel.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      btn.classList.remove("is-open");
      panel.classList.remove("is-open");
      document.body.style.overflow = "";
    });
  });
}

// ===== FAB 悬浮导航球 =====
function initFab() {
  const fabRandom = document.getElementById("fabRandom");
  const fabTop = document.getElementById("fabTop");

  if (fabRandom) {
    fabRandom.addEventListener("click", () => {
      const cuisines = appData.cuisines;
      const randomCuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      updateAll(randomCuisine);
      const target = document.querySelector(".floating-cuisine-wrap");
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
      // flash effect
      fabRandom.classList.add("random-cuisine-flash");
      setTimeout(() => fabRandom.classList.remove("random-cuisine-flash"), 600);
    });
  }

  if (fabTop) {
    fabTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

// ===== 滚动渐入动画 =====
function initRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: "0px 0px -60px 0px", threshold: 0.1 });

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.add("reveal-section");
    observer.observe(section);
  });

  // Also observe chart cards
  document.querySelectorAll(".chart-card").forEach((card) => {
    card.classList.add("reveal-section");
    observer.observe(card);
  });
}

// ===== 按钮涟漪效果 =====
function initRippleEffects() {
  document.addEventListener("click", (e) => {
    const rippleTarget = e.target.closest(".gold-button, .ghost-button, .card-export-btn, .recommend-btn, .compare-trigger-btn");
    if (!rippleTarget) return;

    const ripple = document.createElement("span");
    ripple.className = "ripple";
    const rect = rippleTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + "px";
    ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
    ripple.style.top = (e.clientY - rect.top - size / 2) + "px";
    rippleTarget.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });
}

// ===== 菜系对比模式 =====
function initCompareMode() {
  const overlay = document.getElementById("compareOverlay");
  const triggerBtn = document.getElementById("compareTriggerBtn");
  const closeBtn = document.getElementById("compareClose");
  const selectA = document.getElementById("compareCuisineA");
  const selectB = document.getElementById("compareCuisineB");

  if (!overlay || !triggerBtn) return;

  const cuisineOptions = appData.cuisines.map((c) => `<option value="${c}">${c}</option>`).join("");
  if (selectA) {
    selectA.innerHTML = cuisineOptions;
    selectA.value = selectedCuisine;
  }
  if (selectB) {
    selectB.innerHTML = cuisineOptions;
    const idx = appData.cuisines.indexOf(selectedCuisine);
    selectB.value = appData.cuisines[(idx + 1) % appData.cuisines.length] || appData.cuisines[0];
  }

  triggerBtn.addEventListener("click", () => {
    if (selectA) selectA.value = selectedCuisine;
    const idx = appData.cuisines.indexOf(selectedCuisine);
    if (selectB) selectB.value = appData.cuisines[(idx + 1) % appData.cuisines.length] || appData.cuisines[0];
    renderCompare();
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  });

  if (selectA) selectA.addEventListener("change", renderCompare);
  if (selectB) selectB.addEventListener("change", renderCompare);

  closeBtn.addEventListener("click", () => {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      overlay.classList.remove("active");
      document.body.style.overflow = "";
    }
  });

  function renderCompare() {
    const a = selectA.value;
    const b = selectB.value;
    if (!a || !b) return;

    const totalA = getCuisineTotalStores(a);
    const totalB = getCuisineTotalStores(b);
    const originA = getOriginText(a);
    const originB = getOriginText(b);
    const topProvA = getTopProvince(a);
    const topProvB = getTopProvince(b);
    const brandsA = appData.brands.filter((r) => r.cuisine === a).length;
    const brandsB = appData.brands.filter((r) => r.cuisine === b).length;

    // word overlap
    const wordsA = new Set((cuisineWordMap[a] || []).map((w) => w.name));
    const wordsB = new Set((cuisineWordMap[b] || []).map((w) => w.name));
    const shared = new Set([...wordsA].filter((x) => wordsB.has(x)));

    const highlightClass = (valA, valB, bigger) => bigger === "a" ? (valA > valB ? "highlight" : "") : (valB > valA ? "highlight" : "");
    const winnerA = totalA > totalB ? "highlight" : "";
    const winnerB = totalB > totalA ? "highlight" : "";

    document.getElementById("compareGrid").innerHTML = `
      <div class="compare-col">
        <h4>${a}</h4>
        <div class="compare-stat-row"><span class="compare-stat-label">全国门店数</span><span class="compare-stat-value ${winnerA}">${formatNumber(totalA)} 家</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">起源地</span><span class="compare-stat-value">${originA}</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">TOP省份</span><span class="compare-stat-value">${topProvA?.province || "--"} ${formatNumber(topProvA?.value || 0)} 家</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">收录品牌</span><span class="compare-stat-value">${brandsA} 个</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">关键词数</span><span class="compare-stat-value">${wordsA.size} 个</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">独特关键词</span><span class="compare-stat-value">${[...wordsA].filter((x) => !wordsB.has(x)).length} 个</span></div>
      </div>
      <div class="compare-col">
        <h4>${b}</h4>
        <div class="compare-stat-row"><span class="compare-stat-label">全国门店数</span><span class="compare-stat-value ${winnerB}">${formatNumber(totalB)} 家</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">起源地</span><span class="compare-stat-value">${originB}</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">TOP省份</span><span class="compare-stat-value">${topProvB?.province || "--"} ${formatNumber(topProvB?.value || 0)} 家</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">收录品牌</span><span class="compare-stat-value">${brandsB} 个</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">关键词数</span><span class="compare-stat-value">${wordsB.size} 个</span></div>
        <div class="compare-stat-row"><span class="compare-stat-label">独特关键词</span><span class="compare-stat-value">${[...wordsB].filter((x) => !wordsA.has(x)).length} 个</span></div>
      </div>
      <div style="grid-column:span 2;padding:14px;border-radius:14px;background:rgba(243,196,107,0.06);text-align:center;color:var(--muted);font-size:14px;">
        共享关键词：<span style="color:var(--gold-soft);font-weight:700;">${[...shared].join("、") || "暂无"}</span>（共 ${shared.size} 个）
      </div>
    `;
  }

  renderCompare();
}

// ===== 四季推荐 =====
const SEASON_DATA = {
  spring: { icon: "🌸", name: "春 · 鲜", cuisines: "粤菜 · 本帮江浙菜 · 闽菜", highlight: "清淡鲜美", desc: "春季万物复苏，宜食鲜嫩清爽之物。粤菜的清蒸白切、江浙的时令春笋，最能唤醒味蕾。" },
  summer: { icon: "☀️", name: "夏 · 爽", cuisines: "云南菜 · 湘菜 · 川菜", highlight: "酸辣开胃", desc: "夏日炎炎，酸辣口味最开胃。云南的酸汤、湘菜的香辣，配上一碗冰粉，暑气全消。" },
  autumn: { icon: "🍂", name: "秋 · 补", cuisines: "鲁菜 · 徽菜 · 北京菜", highlight: "醇厚滋补", desc: "秋高气爽，适合进补。鲁菜的浓汤、徽菜的山珍、北京烤鸭的肥美，为冬日储备能量。" },
  winter: { icon: "❄️", name: "冬 · 暖", cuisines: "川菜 · 东北菜 · 西北菜", highlight: "浓郁暖身", desc: "寒冬腊月，火锅、炖菜最暖人心。川菜的麻辣火锅、东北的铁锅炖、西北的羊肉汤，驱散严寒。" }
};

function initSeasonGrid() {
  const grid = document.getElementById("seasonGrid");
  if (!grid) return;

  grid.innerHTML = Object.entries(SEASON_DATA).map(([key, data]) => `
    <div class="season-card ${key}" data-season="${key}">
      <div class="season-icon">${data.icon}</div>
      <div class="season-name">${data.name}</div>
      <div class="season-cuisines">${data.cuisines}</div>
      <span class="season-highlight">${data.highlight}</span>
    </div>
  `).join("");

  grid.querySelectorAll(".season-card").forEach((card) => {
    card.addEventListener("click", () => {
      const season = card.dataset.season;
      const data = SEASON_DATA[season];
      if (!data) return;
      // scroll to cuisine section and highlight suggested cuisines
      const cuisinesNames = data.cuisines.split("·").map((s) => s.trim());
      const firstCuisine = cuisinesNames[0];
      if (appData.cuisines.includes(firstCuisine)) {
        updateAll(firstCuisine);
        document.getElementById("detail").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}

function updateSeasonHighlight(cuisine) {
  const cards = document.querySelectorAll(".season-card");
  cards.forEach((card) => {
    const season = card.dataset.season;
    const data = SEASON_DATA[season];
    const cuisineList = data ? data.cuisines.split("·").map((s) => s.trim()) : [];
    if (cuisineList.includes(cuisine)) {
      card.style.borderColor = "rgba(243, 196, 107, 0.6)";
      card.style.boxShadow = "0 0 30px rgba(243, 196, 107, 0.15)";
    } else {
      card.style.borderColor = "";
      card.style.boxShadow = "";
    }
  });
}

// ===== 菜系历史时间轴 =====
const CUISINE_TIMELINE = {
  "川菜": [
    { era: "秦汉时期", title: "萌芽：巴蜀调味之源", desc: "先秦巴蜀地区已善用花椒、姜、茱萸调味。《华阳国志》载蜀人\"尚滋味，好辛香\"，川菜调味基因初现端倪。" },
    { era: "唐宋时期", title: "成型：川菜独立门户", desc: "宋代川菜正式脱离中原菜系独立发展。辣椒尚未传入，以花椒、姜、食茱萸为核心\"三香\"，奠定麻辣基因的前身。" },
    { era: "明清时期", title: "鼎盛：辣椒入川引爆麻辣革命", desc: "明末辣椒经海上丝绸之路传入中国，清初大规模在四川种植。辣椒与花椒的\"天作之合\"成就川菜麻辣灵魂，宫保鸡丁、麻婆豆腐等经典菜品诞生。" },
    { era: "近现代", title: "走向世界：川菜的全国化与国际化", desc: "改革开放后川菜迅速扩张至全国，火锅、串串香风靡全球。据红餐大数据，川菜门店覆盖全国34个省级区域，成为最具影响力的菜系之一。" }
  ],
  "粤菜": [
    { era: "秦汉时期", title: "起源：南越饮食融合中原", desc: "秦统一岭南后，中原饮食文化与百越饮食融合。汉代广州已是海上丝绸之路起点，香料、海味食材开始丰富粤菜谱系。" },
    { era: "唐宋时期", title: "繁荣：羊城食在广州", desc: "唐宋时期广州成为国际贸易大港，\"食在广州\"美誉初步形成。唐代文献记载岭南宴席已有数百道菜式的排场。" },
    { era: "明清时期", title: "精进：粤菜三大流派形成", desc: "广府菜、潮州菜、客家菜三大流派各成体系。广府菜以清鲜见长，潮州菜以精细著称，客家菜以咸香为特色。早茶文化开始流行。" },
    { era: "近现代", title: "全球传播：有华人的地方就有粤菜", desc: "粤菜随华人移民走向世界，成为海外最具代表性的中国菜系。虾饺、叉烧、白切鸡成为国际美食名片。" }
  ],
  "湘菜": [
    { era: "春秋战国", title: "楚地饮食之源", desc: "湘菜根植于楚文化，屈原《楚辞》中已有楚地饮食的丰富记载。湘江流域物产丰饶，为湘菜发展提供了丰厚的食材基础。" },
    { era: "明清时期", title: "辣椒入湘：湘菜灵魂诞生", desc: "明末清初辣椒传入湖南后迅速成为核心调味品。湖南人\"无辣不欢\"的饮食习惯形成，剁椒、干辣椒、鲜辣椒三辣并用。" },
    { era: "晚清民国", title: "湘菜体系的成熟", desc: "晚清名臣曾国藩、左宗棠等湘籍人物将湘菜带入京城。剁椒鱼头、辣椒炒肉等经典湘菜定型，湘菜馆在全国大城市落地。" },
    { era: "当代", title: "湘菜的全国化浪潮", desc: "21世纪湘菜借助连锁餐饮模式迅速扩张，辣椒炒肉、剁椒鱼头成为国民级菜品。长沙成为美食网红城市，茶颜悦色等湘式茶饮风靡全国。" }
  ],
  "鲁菜": [
    { era: "先秦时期", title: "齐鲁饮食之源", desc: "鲁菜起源于齐鲁大地，孔子\"食不厌精，脍不厌细\"的理念深刻影响了鲁菜烹饪哲学，奠定了中国烹饪的理论基础。" },
    { era: "唐宋时期", title: "宫廷御膳主流", desc: "鲁菜在唐宋时期成为宫廷菜和官府菜的主流，\"满汉全席\"中的汉席部分即以鲁菜为基础框架。" },
    { era: "明清时期", title: "北方菜系的宗师", desc: "鲁菜以济南菜、胶东菜、孔府菜三大流派鼎立。葱烧海参、九转大肠、糖醋鲤鱼等名菜诞生，影响辐射整个北方。" },
    { era: "近现代", title: "传承与创新", desc: "作为中国最古老的菜系之一，鲁菜在坚守传统的同时不断创新。德州扒鸡、四喜丸子等菜品经工业化生产走向全国市场。" }
  ],
  "闽菜": [
    { era: "魏晋南北朝", title: "闽地饮食之始", desc: "中原士族南迁入闽，带来先进烹饪技艺。闽地山海资源丰富，\"靠山吃山，靠海吃海\"的饮食格局初步形成。" },
    { era: "唐宋时期", title: "福州菜系成型", desc: "福州成为东南重镇，闽菜体系初步建立。海鲜烹调技艺日趋成熟，沙茶等外来调味品经海上贸易传入闽南。" },
    { era: "明清时期", title: "佛跳墙：闽菜巅峰", desc: "清代福州聚春园创制\"佛跳墙\"，以鲍鱼、海参、干贝等几十种珍品食材文火慢炖，成为闽菜金字塔尖的代表作。" },
    { era: "当代", title: "沙县小吃的全球奇迹", desc: "沙县小吃从福建走向全国乃至全球，以扁肉、拌面、炖罐等平民美食让闽菜文化深入人心。全省超过8万家沙县小吃门店。" }
  ],
  "徽菜": [
    { era: "宋代", title: "徽商饮食之兴", desc: "宋代徽商崛起，将山珍野味带入徽菜体系。徽州地区多山，笋干、香菇、石耳等山珍成为徽菜核心食材。" },
    { era: "明清时期", title: "徽商推动徽菜传播", desc: "徽商足迹遍天下，徽菜随之走出皖南山区。\"重油、重色、重火功\"的烹饪风格成型，臭鳜鱼、毛豆腐成为标志性菜品。" },
    { era: "晚清民国", title: "徽菜馆遍布江南", desc: "晚清时期徽菜馆在江南各大城市大量开设，符离集烧鸡、问政山笋等徽菜走入寻常百姓家。" },
    { era: "当代", title: "徽菜的文化复兴", desc: "随着黄山旅游的兴起和徽文化的传播，徽菜作为徽文化的重要组成部分被重新发掘。火腿、腌鲜风味持续传承。" }
  ],
  "本帮江浙菜": [
    { era: "宋代", title: "江南美食之基", desc: "南宋定都临安（杭州），江南饮食文化迎来黄金时代。东坡肉、宋嫂鱼羹等名菜诞生，\"上有天堂，下有苏杭\"的饮食盛景开启。" },
    { era: "明清时期", title: "上海本帮菜崛起", desc: "上海开埠后经济腾飞，本帮菜吸收苏帮、杭帮、甬帮菜精华，形成\"浓油赤酱\"的独特风格。红烧肉、腌笃鲜成为经典。" },
    { era: "民国时期", title: "海派饮食的黄金时代", desc: "上海成为远东第一大城市，本帮菜馆林立。蟹粉小笼、生煎馒头等市井美食与高档本帮宴席并驾齐驱。" },
    { era: "当代", title: "精致江南味走向世界", desc: "江浙菜以精致优雅著称，龙井虾仁、东坡肉成为国宴名菜。杭帮菜、上海本帮菜、苏州菜各展风姿。" }
  ],
  "东北菜": [
    { era: "古代", title: "满族饮食之源", desc: "东北菜深受满族饮食文化影响。酸菜腌制技术源于满族先民在漫长冬季保存蔬菜的智慧，炖菜烹饪方式与北方寒冷气候密切相关。" },
    { era: "清末民初", title: "闯关东与饮食融合", desc: "\"闯关东\"移民潮将山东、河北饮食文化大量带入东北，与当地满族、朝鲜族饮食融合。锅包肉等融合菜品诞生。" },
    { era: "新中国成立后", title: "大厂矿食堂时代", desc: "东北老工业基地建设时期，工厂食堂极大推动了东北菜的规模化发展。量大实惠、滋味浓厚的风格深入人心。" },
    { era: "当代", title: "东北菜的国民化", desc: "东北菜以实惠量大、滋味浓烈著称，锅包肉、地三鲜、猪肉炖粉条成为全国性家常菜。铁锅炖、杀猪菜在社交平台上成为热门话题。" }
  ],
  "西北菜": [
    { era: "古代", title: "丝绸之路的馈赠", desc: "西北是丝绸之路的重要通道，胡饼、烤肉等西域饮食通过丝路传入。孜然等香料的使用深受中亚影响，面食传统与小麦传入密切相关。" },
    { era: "唐宋时期", title: "长安饮食的鼎盛", desc: "唐代长安作为世界第一大城市，胡姬酒肆遍布街巷。肉夹馍、羊肉泡馍等今日经典在唐代已具雏形。" },
    { era: "明清时期", title: "清真饮食体系成型", desc: "明清时期回族饮食文化在西北地区深入发展，清真菜系正式成型。兰州牛肉面、手抓羊肉等成为西北饮食代表。" },
    { era: "当代", title: "西北味道走向全国", desc: "兰州拉面馆遍布全国城市街头，新疆大盘鸡、陕西凉皮成为国民级美食。《舌尖上的中国》等节目让西北饮食文化广为人知。" }
  ],
  "新疆菜": [
    { era: "古代", title: "西域饮食之源", desc: "新疆古称西域，是东西方文明交汇之地。馕的制作已有数千年历史，烤羊肉是游牧民族最古老的烹饪方式之一。" },
    { era: "汉唐时期", title: "丝绸之路美食交汇", desc: "张骞通西域后，葡萄、石榴、胡桃等食材传入中原。同时，中原的面食制作技术也传入西域，丰富了当地饮食。" },
    { era: "明清时期", title: "维吾尔饮食文化定型", desc: "维吾尔族饮食文化在明清时期基本定型：抓饭、拉条子、烤包子、馕坑肉等核心菜品体系完整建立。" },
    { era: "当代", title: "新疆菜的全国化传播", desc: "新疆大盘鸡、羊肉串成为全国夜市标配，新疆菜馆在全国各大城市大量出现。哈密瓜、葡萄干等特色食材享誉国内外。" }
  ],
  "云南菜": [
    { era: "古代", title: "多民族饮食熔炉", desc: "云南25个少数民族各自有独特饮食传统。傣族的酸辣、白族的乳制品、彝族的烤肉——多元文化造就了云南菜的丰富谱系。" },
    { era: "明清时期", title: "过桥米线的传说", desc: "过桥米线起源于清代蒙自，传说一位贤妻为在湖心亭读书的丈夫送餐而发明。汽锅鸡、宣威火腿等名吃也在明清时期定型。" },
    { era: "近现代", title: "野生菌文化的兴起", desc: "云南丰富的野生菌资源（松茸、鸡枞、牛肝菌等）在近现代被系统发掘和推广，菌菇火锅成为云南菜名片。" },
    { era: "当代", title: "文艺云南的美食旅", desc: "大理、丽江的旅游热潮带动云南菜走向全国。鲜花饼、傣味烤鱼、饵块等云南美食在社交平台大量曝光。" }
  ],
  "北京菜": [
    { era: "元代", title: "大都饮食之始", desc: "元代定都大都（北京），蒙古族饮食文化与汉族饮食开始融合。涮羊肉的起源与蒙古骑兵的军粮传统有关。" },
    { era: "明清时期", title: "宫廷御膳的巅峰", desc: "明清两代定都北京，满汉全席集全国烹饪之大成。北京烤鸭在明代已成为宫廷名菜，全聚德在清同治年间创立。" },
    { era: "民国时期", title: "市井美食繁荣", desc: "北京小吃体系在民国时期走向成熟：豆汁焦圈、卤煮火烧、炒肝、爆肚等成为老北京人的日常。涮羊肉从宫廷走入寻常百姓家。" },
    { era: "当代", title: "新老北京的味道", desc: "北京烤鸭成为国际美食名片，全聚德、大董等品牌引领潮流。同时，老北京小吃面临传承与创新的双重挑战。" }
  ],
  "台湾菜": [
    { era: "明清时期", title: "闽粤移民饮食之根", desc: "明清时期大量闽南、客家移民迁台，将福建菜和客家菜的精髓带入台湾。蚵仔煎、卤肉饭的根源可以追溯至此。" },
    { era: "日据时期", title: "日式饮食影响", desc: "日据时期（1895-1945），日本料理的精细美学影响了台湾菜。味噌、芥末等日式调味品融入台湾日常饮食。" },
    { era: "战后时期", title: "多元融合的台湾味", desc: "1949年后各省饮食在台湾汇聚，川菜、江浙菜、北方菜与本地口味融合。牛肉面、盐酥鸡、珍珠奶茶等现代台湾美食诞生。" },
    { era: "当代", title: "台湾美食的全球输出", desc: "珍珠奶茶风靡全球，三杯鸡、凤梨酥成为台湾美食名片。台湾夜市文化成为国际旅游亮点。" }
  ]
};

function renderTimeline(cuisine) {
  const wrap = document.getElementById("timelineWrap");
  if (!wrap) return;

  const events = CUISINE_TIMELINE[cuisine] || CUISINE_TIMELINE["川菜"];

  const lineHtml = '<div class="timeline-line"></div>';
  const itemsHtml = events.map((event, i) => `
    <div class="timeline-item" style="--reveal-index:${i}">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-era">${event.era}</div>
        <div class="timeline-title">${event.title}</div>
        <div class="timeline-desc">${event.desc}</div>
      </div>
    </div>
  `).join("");

  wrap.innerHTML = lineHtml + itemsHtml;

  // Animate timeline items in
  requestAnimationFrame(() => {
    wrap.querySelectorAll(".timeline-item").forEach((item, i) => {
      setTimeout(() => item.classList.add("is-visible"), i * 150);
    });
  });
}

// ===== 招牌菜展示 =====
function updateSignatureDishes(cuisine) {
  const container = document.getElementById("signatureDishes");
  if (!container) return;

  // 从 cuisineWordMap 中取top关键词作为招牌菜参考
  const words = cuisineWordMap[cuisine] || [];
  const SIGNATURE_DESCRIPTIONS = {
    "麻婆豆腐": "麻辣鲜香嫩烫酥，川菜灵魂之味，一勺入魂",
    "火锅": "牛油沸腾，百味交融，冬日围炉最佳",
    "回锅肉": "\"天下第一菜\"，肥而不腻，酱香浓郁",
    "担担面": "成都街头巷尾最暖心的市井美味",
    "白切鸡": "清鲜至简，皮爽肉滑，粤菜最高境界",
    "虾饺": "晶莹剔透，鲜甜弹牙，早茶四大天王之首",
    "烧腊": "皮脆肉嫩，蜜汁流香，广式烧味天下无双",
    "肠粉": "米香四溢，滑嫩如丝，老广们的清晨味道",
    "剁椒鱼头": "红艳欲滴，鲜辣交融，湘菜的灵魂之作",
    "辣椒炒肉": "辣椒比肉好吃，烟火气十足的家常至味",
    "佛跳墙": "数十种珍品荟萃一坛，闽菜巅峰之作",
    "荔枝肉": "酸甜酥嫩，形似荔枝，闽菜经典",
    "北京烤鸭": "皮脆肉嫩，卷饼蘸酱，国宴名菜",
    "涮羊肉": "铜锅炭火，羊肉鲜嫩，老北京的冬日记忆",
    "锅包肉": "外酥里嫩酸甜可口，东北菜第一招牌",
    "小鸡炖蘑菇": "榛蘑与土鸡的完美邂逅，东北人的乡愁",
    "臭鳜鱼": "闻着臭吃着香，徽菜不二之选",
    "毛豆腐": "徽州一绝，长毛的豆腐最是鲜美",
    "红烧肉": "浓油赤酱，肥而不腻，上海人最懂这口",
    "小笼包": "轻轻提慢慢移，先开窗后喝汤",
    "羊肉串": "孜然飘香，烟火缭绕，新疆味道的代表",
    "大盘鸡": "鸡块土豆宽面，一盘盛下西域豪情",
    "过桥米线": "一碗跨越湖水的深情，滚烫鸡汤烫熟万物",
    "汽锅鸡": "蒸汽凝露，原汁原味，滇味之魂",
    "羊肉泡馍": "掰馍掰到天荒地老，一碗泡馍慰风尘",
    "肉夹馍": "腊汁肉白吉馍，\"中国的汉堡\"",
    "卤肉饭": "卤汁浓郁肉香四溢，台式国民美食",
    "珍珠奶茶": "Q弹珍珠邂逅奶茶，征服全球的台湾味",
    "九转大肠": "酸甜苦辣咸五味归一，鲁菜经典之作",
    "葱烧海参": "鲁菜海味之首，葱香酱浓海参嫩"
  };

  // pick the top dish-like words
  const dishes = words.filter((w) => {
    const name = w.name;
    return name.includes("肉") || name.includes("鱼") || name.includes("鸡") || name.includes("面")
      || name.includes("粉") || name.includes("虾") || name.includes("鸭") || name.includes("包")
      || name.includes("汤") || name.includes("豆腐") || name.includes("锅") || name.includes("饼")
      || name.includes("饺") || name.includes("羊") || name.includes("牛") || name.includes("猪");
  }).slice(0, 6);

  if (dishes.length < 3) {
    container.innerHTML = words.slice(0, 6).map((w, i) => {
      const desc = SIGNATURE_DESCRIPTIONS[w.name] || `${cuisine}代表性美食，风味独特`;
      return `<div class="signature-dish-card">
        <div class="signature-dish-rank">${i + 1}</div>
        <div class="signature-dish-name">${w.name}</div>
        <div class="signature-dish-desc">${desc}</div>
      </div>`;
    }).join("");
  } else {
    container.innerHTML = dishes.map((w, i) => {
      const desc = SIGNATURE_DESCRIPTIONS[w.name] || `${cuisine}代表性美食，风味独特`;
      return `<div class="signature-dish-card">
        <div class="signature-dish-rank">${i + 1}</div>
        <div class="signature-dish-name">${w.name}</div>
        <div class="signature-dish-desc">${desc}</div>
      </div>`;
    }).join("");
  }
}

// ===== 价格分布图 =====
function updatePrice(cuisine) {
  if (!charts.price) return;
  const brands = appData.brands.filter((r) => r.cuisine === cuisine);
  if (!brands.length) {
    charts.price.setOption({
      title: { text: "价格数据待补充", left: "center", top: "middle", textStyle: { color: "#ffe4a3", fontSize: 18, fontFamily: "Noto Serif SC" } },
      series: []
    }, true);
    return;
  }

  const ranges = { "经济型": 0, "中档": 0, "高档": 0 };
  brands.forEach((b) => {
    const price = b.price;
    if (price <= 0) return;
    if (price < 60) ranges["经济型"]++;
    else if (price < 150) ranges["中档"]++;
    else ranges["高档"]++;
  });

  const data = Object.entries(ranges).filter(([, v]) => v > 0);

  charts.price.setOption({
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(19,7,6,0.94)",
      borderColor: "#f3c46b",
      textStyle: { color: "#ffe4a3" },
      formatter: (p) => `${p.name}: ${p.value} 个品牌`
    },
    series: [{
      type: "pie",
      radius: ["45%", "75%"],
      center: ["50%", "52%"],
      roseType: "area",
      itemStyle: { borderRadius: 8, borderColor: "rgba(19, 7, 6, 0.8)", borderWidth: 3 },
      label: { color: "#ffe4a3", fontSize: 14, fontWeight: 700 },
      emphasis: {
        label: { fontSize: 22, fontWeight: "bold" },
        itemStyle: { shadowBlur: 16, shadowColor: "rgba(243, 196, 107, 0.4)" }
      },
      data: data.map(([name, value]) => ({
        name,
        value,
        itemStyle: {
          color: name === "经济型" ? "#4a7c59" : name === "中档" ? "#c9a06b" : "#8b3a36"
        }
      }))
    }]
  }, true);
}

init().then(() => {
  const loader = document.getElementById("pageLoader");
  if (loader) loader.classList.add("is-hidden");
}).catch((error) => {
  console.error(error);
  const loader = document.getElementById("pageLoader");
  if (loader) loader.classList.add("is-hidden");
  document.body.insertAdjacentHTML("afterbegin", `<div style="position:fixed;z-index:9999;left:20px;right:20px;top:20px;padding:18px;border:1px solid #f3c46b;background:#250d0b;color:#ffe4a3;border-radius:16px">页面数据加载失败：${error.message}。请用本地服务器打开页面，例如 python -m http.server。</div>`);
});
