const CUISINE_IMAGES = {
  "北京菜": "图片数据/北京菜.jpg",
  "本帮江浙菜": "图片数据/江浙本帮菜.jpg",
  "川菜": "图片数据/川菜.jpg",
  "东北菜": "图片数据/东北菜.jpg",
  "徽菜": "图片数据/徽菜.jpeg",
  "鲁菜": "图片数据/鲁菜.jpeg",
  "闽菜": "图片数据/闽菜.jpeg",
  "台湾菜": "图片数据/台湾菜.jpeg",
  "西北菜": "图片数据/西北菜.jpeg",
  "湘菜": "图片数据/湘菜.jpg",
  "新疆菜": "图片数据/新疆菜.jpg",
  "粤菜": "图片数据/粤菜.jpeg",
  "云南菜": "图片数据/云南菜.jpeg"
};

const PROVINCE_COORDS = {
  "北京": [116.4074, 39.9042], "北京市": [116.4074, 39.9042],
  "天津": [117.2000, 39.1333], "天津市": [117.2000, 39.1333],
  "河北": [114.5149, 38.0428], "河北省": [114.5149, 38.0428],
  "山西": [112.5492, 37.8706], "山西省": [112.5492, 37.8706],
  "内蒙古": [111.6708, 40.8183], "内蒙古自治区": [111.6708, 40.8183],
  "辽宁": [123.4315, 41.8057], "辽宁省": [123.4315, 41.8057],
  "吉林": [125.3235, 43.8171], "吉林省": [125.3235, 43.8171],
  "黑龙江": [126.6424, 45.7567], "黑龙江省": [126.6424, 45.7567],
  "上海": [121.4737, 31.2304], "上海市": [121.4737, 31.2304],
  "江苏": [118.7969, 32.0603], "江苏省": [118.7969, 32.0603],
  "浙江": [120.1551, 30.2741], "浙江省": [120.1551, 30.2741],
  "安徽": [117.2272, 31.8206], "安徽省": [117.2272, 31.8206],
  "福建": [119.2965, 26.0745], "福建省": [119.2965, 26.0745],
  "江西": [115.8582, 28.6829], "江西省": [115.8582, 28.6829],
  "山东": [117.1201, 36.6512], "山东省": [117.1201, 36.6512],
  "河南": [113.6254, 34.7466], "河南省": [113.6254, 34.7466],
  "湖北": [114.3055, 30.5928], "湖北省": [114.3055, 30.5928],
  "湖南": [112.9388, 28.2282], "湖南省": [112.9388, 28.2282],
  "广东": [113.2644, 23.1291], "广东省": [113.2644, 23.1291],
  "广西": [108.3669, 22.8170], "广西壮族自治区": [108.3669, 22.8170],
  "海南": [110.3312, 20.0311], "海南省": [110.3312, 20.0311],
  "重庆": [106.5516, 29.5630], "重庆市": [106.5516, 29.5630],
  "四川": [104.0665, 30.5728], "四川省": [104.0665, 30.5728],
  "贵州": [106.6302, 26.6470], "贵州省": [106.6302, 26.6470],
  "云南": [102.8329, 24.8801], "云南省": [102.8329, 24.8801],
  "西藏": [91.1175, 29.6475], "西藏自治区": [91.1175, 29.6475],
  "陕西": [108.9398, 34.3416], "陕西省": [108.9398, 34.3416],
  "甘肃": [103.8343, 36.0611], "甘肃省": [103.8343, 36.0611],
  "青海": [101.7782, 36.6171], "青海省": [101.7782, 36.6171],
  "宁夏": [106.2309, 38.4872], "宁夏回族自治区": [106.2309, 38.4872],
  "新疆": [87.6168, 43.8256], "新疆维吾尔自治区": [87.6168, 43.8256],
  "台湾": [121.5654, 25.0330], "台湾省": [121.5654, 25.0330],
  "香港": [114.1694, 22.3193], "香港特别行政区": [114.1694, 22.3193],
  "澳门": [113.5439, 22.1987], "澳门特别行政区": [113.5439, 22.1987]
};

const PROVINCE_ALIASES = {
  "北京市": "北京", "天津市": "天津", "河北省": "河北", "山西省": "山西", "内蒙古自治区": "内蒙古",
  "辽宁省": "辽宁", "吉林省": "吉林", "黑龙江省": "黑龙江", "上海市": "上海", "江苏省": "江苏",
  "浙江省": "浙江", "安徽省": "安徽", "福建省": "福建", "江西省": "江西", "山东省": "山东",
  "河南省": "河南", "湖北省": "湖北", "湖南省": "湖南", "广东省": "广东", "广西壮族自治区": "广西",
  "海南省": "海南", "重庆市": "重庆", "四川省": "四川", "贵州省": "贵州", "云南省": "云南",
  "西藏自治区": "西藏", "陕西省": "陕西", "甘肃省": "甘肃", "青海省": "青海", "宁夏回族自治区": "宁夏",
  "新疆维吾尔自治区": "新疆", "台湾省": "台湾", "香港特别行政区": "香港", "澳门特别行政区": "澳门"
};

function normalizeProvinceName(name) {
  const value = String(name || "").trim();
  return PROVINCE_ALIASES[value] || value.replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g, "");
}

const PROVINCE_FULL_NAMES = {
  "北京": "北京市", "天津": "天津市", "河北": "河北省", "山西": "山西省", "内蒙古": "内蒙古自治区",
  "辽宁": "辽宁省", "吉林": "吉林省", "黑龙江": "黑龙江省", "上海": "上海市", "江苏": "江苏省",
  "浙江": "浙江省", "安徽": "安徽省", "福建": "福建省", "江西": "江西省", "山东": "山东省",
  "河南": "河南省", "湖北": "湖北省", "湖南": "湖南省", "广东": "广东省", "广西": "广西壮族自治区",
  "海南": "海南省", "重庆": "重庆市", "四川": "四川省", "贵州": "贵州省", "云南": "云南省",
  "西藏": "西藏自治区", "陕西": "陕西省", "甘肃": "甘肃省", "青海": "青海省", "宁夏": "宁夏回族自治区",
  "新疆": "新疆维吾尔自治区", "台湾": "台湾省", "香港": "香港特别行政区", "澳门": "澳门特别行政区"
};

function getFullProvinceName(name) {
  const short = normalizeProvinceName(name);
  return PROVINCE_FULL_NAMES[short] || short;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/%|约|家|元|份|,/g, "").trim();
  if (!cleaned) return 0;
  if (cleaned.includes("-")) {
    const parts = cleaned.split("-").map(Number).filter(Number.isFinite);
    return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
  }
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

async function loadCsv(path) {
  const response = await fetch(encodeURI(path));
  if (!response.ok) throw new Error(`无法加载 ${path}`);
  const text = await response.text();
  return new Promise((resolve) => {
    Papa.parse(text.replace(/^\uFEFF|^\uFFFE|^﻿/, ""), {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.map((row) => {
          const normalized = {};
          Object.entries(row).forEach(([key, value]) => {
            normalized[String(key || "").trim()] = typeof value === "string" ? value.trim() : value;
          });
          return normalized;
        });
        resolve(rows);
      }
    });
  });
}

function getFirstValue(row, candidates) {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key] !== "") return row[key];
  }
  return "";
}

function normalizeStoreRows(rows) {
  const cuisines = Object.keys(rows[0] || {}).filter((key) => key && key !== "省份" && key !== "省/市区" && key !== "排名");
  const provinces = rows.map((row) => {
    const rawProvince = getFirstValue(row, ["", "省份", "省/市区"]);
    const province = normalizeProvinceName(rawProvince);
    const stores = {};
    cuisines.forEach((cuisine) => { stores[cuisine] = toNumber(row[cuisine]); });
    return { province, rawProvince, stores };
  }).filter((row) => row.province);
  return { cuisines, provinces };
}

function normalizeOrigins(rows) {
  const origins = {};
  rows.forEach((row) => {
    const cuisine = getFirstValue(row, ["菜系名称", "菜系"]);
    const originText = getFirstValue(row, ["起源地", "起源省份"]);
    if (!cuisine || !originText) return;
    origins[cuisine] = originText.split(/[、,，/]/).map((item) => normalizeProvinceName(item)).filter(Boolean);
  });
  return origins;
}

function normalizeTasteRows(rows) {
  const taste = {};
  const validProvinces = ['北京', '天津', '河北', '山西', '内蒙古', '辽宁', '吉林', '黑龙江', 
                         '上海', '江苏', '浙江', '安徽', '福建', '江西', '山东', '河南', 
                         '湖北', '湖南', '广东', '广西', '海南', '重庆', '四川', '贵州', 
                         '云南', '西藏', '陕西', '甘肃', '青海', '宁夏', '新疆', '台湾', 
                         '香港', '澳门'];
  
  rows.forEach((row) => {
    const rawProvince = getFirstValue(row, ["省份", "省"]);
    if (!rawProvince) return;
    
    let province = String(rawProvince).trim();
    
    if (validProvinces.includes(province)) {
      taste[province] = {
        hot: toNumber(getFirstValue(row, ["吃辣指数", "辣味指数"])),
        sweet: toNumber(getFirstValue(row, ["吃甜指数", "甜味指数"])),
        sour: toNumber(getFirstValue(row, ["吃酸指数", "酸味指数", "咸味指数"]))
      };
    } else {
      const normalized = normalizeProvinceName(rawProvince);
      if (validProvinces.includes(normalized)) {
        taste[normalized] = {
          hot: toNumber(getFirstValue(row, ["吃辣指数", "辣味指数"])),
          sweet: toNumber(getFirstValue(row, ["吃甜指数", "甜味指数"])),
          sour: toNumber(getFirstValue(row, ["吃酸指数", "酸味指数", "咸味指数"]))
        };
      }
    }
  });
  return taste;
}

function normalizeBrands(rows) {
  return rows.map((row) => {
    const storesRaw = getFirstValue(row, ["门店数约", "门店数估算", "门店数"]);
    let stores = storesRaw ? toNumber(storesRaw) : parseRange(getFirstValue(row, ["门店数区间"]));
    
    const priceRaw = getFirstValue(row, ["人均消费约", "人均消费估算", "人均消费"]);
    let price = priceRaw ? toNumber(priceRaw) : parseRange(getFirstValue(row, ["人均消费区间"]));
    
    const cuisine = getFirstValue(row, ["菜系"]);
    if (cuisine && stores > 0) {
      console.log(`品牌数据: ${cuisine} - ${row['品牌名称']}: ${stores}家`);
    }
    
    return {
      cuisine,
      rank: toNumber(getFirstValue(row, ["排名"])),
      brand: getFirstValue(row, ["品牌名称", "品牌"]),
      stores,
      price,
      storeRange: getFirstValue(row, ["门店数区间"]),
      priceRange: getFirstValue(row, ["人均消费区间"])
    };
  }).filter((row) => row.brand);
}

function parseRange(range) {
  if (!range) return 0;
  const match = range.match(/(\d+)-(\d+)/);
  if (match) {
    return Math.round((parseInt(match[1]) + parseInt(match[2])) / 2);
  }
  return toNumber(range);
}

function normalizeWordRows(rows, candidates) {
  return rows.map((row) => getFirstValue(row, candidates)).filter(Boolean);
}

async function loadCuisineData() {
  try {
    console.log('开始加载数据...');
    const [storeRows, originRows, brandRows, tasteRows, flavorRows, ingredientRows, dishRows] = await Promise.all([
      loadCsv("./全国门店分布数据整合.csv"),
      loadCsv("./菜系起源地.csv"),
      loadCsv("./TOP10品牌数据整合.csv"),
      loadCsv("./国各省口味指数.csv"),
      loadCsv("./口味关键词.csv"),
      loadCsv("./常用食材.csv"),
      loadCsv("./招牌菜.csv")
    ]);
    
    console.log('口味数据行数:', tasteRows.length);
    if (tasteRows.length > 0) {
      console.log('口味数据第一行:', tasteRows[0]);
    }
    
    const storeData = normalizeStoreRows(storeRows);
    const origins = normalizeOrigins(originRows);
    const cuisines = storeData.cuisines.filter((cuisine) => CUISINE_IMAGES[cuisine] || origins[cuisine]);
    
    console.log('可用菜系:', cuisines);

    const brands = normalizeBrands(brandRows);
    console.log('品牌数据处理后:', brands.length, '条');

    return {
      cuisines,
      provinces: storeData.provinces,
      origins,
      brands,
      taste: normalizeTasteRows(tasteRows),
      words: {
        flavors: normalizeWordRows(flavorRows, ["口味关键词", "关键词"]),
        ingredients: normalizeWordRows(ingredientRows, ["常用食材", "食材"]),
        dishes: normalizeWordRows(dishRows, ["招牌菜", "菜品名称"])
      },
      images: CUISINE_IMAGES,
      coords: PROVINCE_COORDS
    };
  } catch (error) {
    console.error('数据加载失败:', error);
    throw error;
  }
}
