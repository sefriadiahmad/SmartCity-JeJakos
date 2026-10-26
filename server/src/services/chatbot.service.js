const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');
const KosModel = require('../models/kos.model');

// ============================================================
// 1. DICTIONARIES & LANDMARK MAPPING (Jambi)
// ============================================================

const JAMBI_LANDMARKS = [
  {
    name: 'UNJA Mendalo',
    aliases: ['unja', 'universitas jambi', 'unja mendalo', 'mendalo', 'mendalo darat', 'mendalo indah', 'kampus unja'],
    lat: -1.6140,
    lng: 103.5200,
    radius: 3000,
    district: 'Jambi Luar Kota',
  },
  {
    name: 'UIN STS Jambi',
    aliases: ['uin', 'uin sts', 'uin jambi', 'sulthan thaha', 'sungai duren', 'kampus uin'],
    lat: -1.6065,
    lng: 103.5095,
    radius: 3000,
    district: 'Jambi Luar Kota',
  },
  {
    name: 'UNBARI / Telanaipura',
    aliases: ['unbari', 'universitas batanghari', 'telanaipura', 'sungai putri', 'slamet riyadi', 'kantor gubernur'],
    lat: -1.6045,
    lng: 103.5930,
    radius: 3000,
    district: 'Danau Teluk',
  },
  {
    name: 'Pasar Jambi / WTC',
    aliases: ['pasar jambi', 'raden mattaher', 'wtc', 'wtc batanghari', 'pusat kota', 'mall wtc'],
    lat: -1.5920,
    lng: 103.6180,
    radius: 3000,
    district: 'Pasar Jambi',
  },
  {
    name: 'Danau Teluk',
    aliases: ['danau teluk', 'seberang kota jambi', 'sekoja'],
    lat: -1.5850,
    lng: 103.5900,
    radius: 4000,
    district: 'Danau Teluk',
  },
];

const FACILITY_SYNONYMS = {
  'WiFi': ['wifi', 'wi-fi', 'internet', 'hotspot'],
  'AC': ['ac', 'air conditioner', 'pendingin', 'pendingin ruangan'],
  'Kamar Mandi Dalam': ['kamar mandi dalam', 'km dalam', 'kamar mandi didalam', 'km didalam', 'private bathroom'],
  'Kasur': ['kasur', 'springbed', 'tempat tidur', 'bed'],
  'Lemari Pakaian': ['lemari', 'lemari pakaian', 'wardrobe'],
  'Meja Belajar': ['meja', 'meja belajar', 'meja kerja'],
  'Parkir Motor': ['parkir motor', 'parkiran motor', 'motor'],
  'Parkir Mobil': ['parkir mobil', 'parkiran mobil', 'mobil', 'garasi mobil'],
  'Dapur Bersama': ['dapur', 'dapur bersama', 'kitchen'],
  'Mesin Cuci': ['mesin cuci', 'laundry'],
  'Listrik Termasuk': ['listrik', 'free listrik', 'termasuk listrik', 'bebas listrik', 'token listrik'],
  'Air PDAM / Sumur Bor': ['air', 'pdam', 'sumur', 'air bersih', 'air sumur', 'air lancar'],
  'CCTV 24 Jam': ['cctv', 'keamanan', 'security', 'cctv 24 jam'],
  'Kulkas Bersama': ['kulkas', 'kulkas bersama', 'lemari es'],
};

// In-memory facilities lookup cache
let cachedFacilities = null;
let cachedFacilitiesTimestamp = 0;
const FACILITIES_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// In-memory query result cache (Design §5.2: 5 minutes)
const queryCache = new Map();
const QUERY_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Clean expired query cache entries periodically
function pruneExpiredCache() {
  const now = Date.now();
  for (const [key, item] of queryCache.entries()) {
    if (item.expiresAt <= now) {
      queryCache.delete(key);
    }
  }
}

// ============================================================
// 2. HELPER FUNCTIONS
// ============================================================

async function getFacilitiesMap() {
  const now = Date.now();
  if (cachedFacilities && (now - cachedFacilitiesTimestamp < FACILITIES_CACHE_TTL)) {
    return cachedFacilities;
  }
  try {
    const list = await KosModel.findAllFacilities();
    cachedFacilities = list;
    cachedFacilitiesTimestamp = now;
    return list;
  } catch (err) {
    if (cachedFacilities) return cachedFacilities;
    throw err;
  }
}

function parsePriceFromText(text) {
  if (!text) return null;
  const clean = text.toLowerCase();

  // Pattern: "700rb", "700 rb", "700ribu", "700 ribu", "700 k", "700k"
  const rbMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|ribu|k\b)/i);
  if (rbMatch) {
    const num = parseFloat(rbMatch[1].replace(',', '.'));
    if (!isNaN(num)) return Math.round(num * 1000);
  }

  // Pattern: "1.5jt", "1,5 jt", "1juta", "1 juta"
  const jtMatch = clean.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i);
  if (jtMatch) {
    const num = parseFloat(jtMatch[1].replace(',', '.'));
    if (!isNaN(num)) return Math.round(num * 1000000);
  }

  // Pattern: full numbers like "700000", "700.000", "1.500.000"
  const fullNumMatch = clean.match(/(?:rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d{5,8})\b/i);
  if (fullNumMatch) {
    const raw = fullNumMatch[1].replace(/\./g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 100000 && num <= 50000000) {
      return num;
    }
  }

  return null;
}

function parseRuleBasedCriteria(message, history = []) {
  const fullContextText = [...history.map((h) => h.content || h.message || ''), message]
    .join(' ')
    .toLowerCase();

  const currentMsgLower = message.toLowerCase();

  // 1. Intent Detection
  let intent = 'search';
  const isGreetingOnly = /^(halo|hai|pagi|siang|sore|malam|assalamualaikum|tes|test|permisi)\b/i.test(currentMsgLower.trim()) && currentMsgLower.trim().split(/\s+/).length <= 4;
  const isGeneralQuestion = /(apa itu jejakos|cara pesan|cara sewa|bantuan|fitur)/i.test(currentMsgLower);

  if (isGreetingOnly) {
    intent = 'greeting';
  } else if (isGeneralQuestion) {
    intent = 'faq';
  }

  // 2. Type Detection (putra / putri / campur)
  let type = null;
  if (/\b(cewek|perempuan|putri|wanita|akhwat|female|women)\b/i.test(fullContextText)) {
    type = 'putri';
  } else if (/\b(cowok|laki|pria|putra|ikhwan|male|men)\b/i.test(fullContextText)) {
    type = 'putra';
  } else if (/\b(campur|bebas|pasutri|mixed)\b/i.test(fullContextText)) {
    type = 'campur';
  }

  // 3. Location / Landmark Detection
  let matchedLandmark = null;
  for (const lm of JAMBI_LANDMARKS) {
    for (const alias of lm.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(fullContextText)) {
        matchedLandmark = lm;
        break;
      }
    }
    if (matchedLandmark) break;
  }

  // 4. Budget / Max Price Detection
  const maxPrice = parsePriceFromText(fullContextText);

  // 5. Facilities Detection
  const detectedFacilities = [];
  for (const [facName, synonyms] of Object.entries(FACILITY_SYNONYMS)) {
    for (const syn of synonyms) {
      const synRegex = new RegExp(`\\b${syn.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (synRegex.test(fullContextText)) {
        if (!detectedFacilities.includes(facName)) {
          detectedFacilities.push(facName);
        }
        break;
      }
    }
  }

  // 6. Pay Period Detection
  let payPeriod = null;
  if (/\b(tahunan|pertahun|per tahun)\b/i.test(fullContextText)) {
    payPeriod = 'tahunan';
  } else if (/\b(bulanan|perbulan|per bulan)\b/i.test(fullContextText)) {
    payPeriod = 'bulanan';
  }

  // 7. Check Missing Preferences (F-20)
  const missingPreferences = [];
  if (!type) missingPreferences.push('type');
  if (!matchedLandmark) missingPreferences.push('location');
  if (!maxPrice) missingPreferences.push('budget');
  if (detectedFacilities.length === 0) missingPreferences.push('facilities');

  return {
    intent,
    location: matchedLandmark ? matchedLandmark.name : null,
    landmark: matchedLandmark,
    district: matchedLandmark ? matchedLandmark.district : null,
    lat: matchedLandmark?.lat || null,
    lng: matchedLandmark?.lng || null,
    radius: matchedLandmark?.radius || null,
    type,
    max_price: maxPrice,
    min_price: null,
    facilities: detectedFacilities,
    pay_period: payPeriod,
    missing_preferences: missingPreferences,
  };
}

// Hash helper for cache keys
function hashParams(params) {
  const jsonStr = JSON.stringify(params, Object.keys(params).sort());
  return crypto.createHash('md5').update(jsonStr).digest('hex');
}

// ============================================================
// 3. CHATBOT SERVICE CORE
// ============================================================

const ChatbotService = {
  JAMBI_LANDMARKS,
  FACILITY_SYNONYMS,

  /**
   * Reset in-memory caches (useful for testing)
   */
  clearCache() {
    queryCache.clear();
    cachedFacilities = null;
    cachedFacilitiesTimestamp = 0;
  },

  getCacheSize() {
    return queryCache.size;
  },

  /**
   * Parse user intent & extract search criteria using Gemini (with rule-based fallback)
   */
  async parseIntent(message, history = []) {
    // Start with rule-based extraction as baseline
    const baseline = parseRuleBasedCriteria(message, history);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return baseline;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const historyFormatted = history
        .slice(-5)
        .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content || h.message || ''}`)
        .join('\n');

      const prompt = `Ekstrak parameter pencarian kos di Jambi dalam format JSON dari pesan pengguna saat ini dan riwayat percakapan.

Daftar fasilitas yang dikenali di sistem:
WiFi, AC, Kamar Mandi Dalam, Kasur, Lemari Pakaian, Meja Belajar, Parkir Motor, Parkir Mobil, Dapur Bersama, Mesin Cuci, Listrik Termasuk, Air PDAM / Sumur Bor, CCTV 24 Jam, Kulkas Bersama.

Lokasi/kampus utama di Jambi:
UNJA Mendalo, UIN STS Jambi, UNBARI / Telanaipura, Pasar Jambi / WTC, Danau Teluk.

Format JSON yang wajib dihasilkan:
{
  "intent": "search" | "greeting" | "faq" | "clarification",
  "location": string | null,
  "type": "putra" | "putri" | "campur" | null,
  "max_price": number | null,
  "min_price": number | null,
  "facilities": string[],
  "pay_period": "bulanan" | "tahunan" | null,
  "missing_preferences": string[]
}

Riwayat percakapan:
${historyFormatted || '(Belum ada riwayat)'}

Pesan pengguna saat ini:
"${message}"`;

      // Timeout safety (8 seconds for extraction)
      const ctrl = new AbortController();
      const timeoutId = setTimeout(() => ctrl.abort(), 8000);

      try {
        const result = await model.generateContent(prompt, { signal: ctrl.signal });
        clearTimeout(timeoutId);
        const text = result.response.text();
        const parsed = JSON.parse(text);

        // Merge LLM result with baseline (prefer LLM if valid, fallback to baseline)
        const merged = { ...baseline };
        if (parsed.intent) merged.intent = parsed.intent;
        if (parsed.type && ['putra', 'putri', 'campur'].includes(parsed.type.toLowerCase())) {
          merged.type = parsed.type.toLowerCase();
        }
        if (typeof parsed.max_price === 'number' && parsed.max_price > 0) {
          merged.max_price = parsed.max_price;
        }
        if (Array.isArray(parsed.facilities) && parsed.facilities.length > 0) {
          merged.facilities = [...new Set([...merged.facilities, ...parsed.facilities])];
        }
        if (parsed.location && typeof parsed.location === 'string') {
          // Resolve location to landmark coordinates if matched
          const locLower = parsed.location.toLowerCase();
          const foundLm = JAMBI_LANDMARKS.find((lm) =>
            lm.aliases.some((alias) => locLower.includes(alias) || alias.includes(locLower))
          );
          if (foundLm) {
            merged.location = foundLm.name;
            merged.landmark = foundLm;
            merged.district = foundLm.district;
            merged.lat = foundLm.lat;
            merged.lng = foundLm.lng;
            merged.radius = foundLm.radius;
          }
        }
        if (parsed.pay_period) merged.pay_period = parsed.pay_period;

        return merged;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch {
      // On any Gemini error or timeout, return rule-based baseline safely
      return baseline;
    }
  },

  /**
   * Resolve facility IDs from facility names
   */
  async resolveFacilityIds(facilityNames = []) {
    if (!facilityNames || facilityNames.length === 0) return [];
    const allFacilities = await getFacilitiesMap();

    const ids = [];
    for (const name of facilityNames) {
      const match = allFacilities.find(
        (f) => f.name.toLowerCase() === name.toLowerCase()
      );
      if (match) {
        ids.push(match.id);
      }
    }
    return ids;
  },

  /**
   * Execute DB query with caching (5-minute TTL per Design §5.2)
   */
  async queryWithCache(queryParams) {
    pruneExpiredCache();
    const cacheKey = hashParams(queryParams);
    const cached = queryCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const result = await KosModel.findAll({
      status: 'active',
      is_approved: true,
      ...queryParams,
    });

    const data = result?.data || [];
    queryCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + QUERY_CACHE_TTL,
    });

    return data;
  },

  /**
   * Search kos from criteria with progressive fallback relaxation (Design §5.2)
   * Progressive steps:
   * 1. Query exact criteria
   * 2. If 0: Relax facilities (remove facility requirement)
   * 3. If 0: Expand radius / remove geo constraint
   * 4. If 0: Increase budget by 20%
   * 5. If 0: Fallback to top-rated / active kos
   */
  async searchKosWithFallback(criteria) {
    const facilityIds = await this.resolveFacilityIds(criteria.facilities);

    const baseParams = {
      type: criteria.type || null,
      district: criteria.district || null,
      min_price: criteria.min_price || null,
      max_price: criteria.max_price || null,
      pay_period: criteria.pay_period || null,
      lat: criteria.lat || null,
      lng: criteria.lng || null,
      radius: criteria.radius || null,
      facility_ids: facilityIds,
      limit: 10,
    };

    // Step 0: Try exact search
    let candidateKos = await this.queryWithCache(baseParams);
    if (candidateKos.length > 0) {
      return {
        candidates: candidateKos,
        fallbackApplied: false,
        fallbackReason: null,
      };
    }

    let fallbackReason = null;

    // Step 1: Relax facilities
    if (facilityIds.length > 0) {
      const relaxedParams = { ...baseParams, facility_ids: [] };
      candidateKos = await this.queryWithCache(relaxedParams);
      if (candidateKos.length > 0) {
        return {
          candidates: candidateKos,
          fallbackApplied: true,
          fallbackReason: 'Fasilitas dilonggarkan karena belum ada kos yang memenuhi seluruh fasilitas yang diminta',
        };
      }
    }

    // Step 2: Expand radius / remove geo constraint
    if (baseParams.lat && baseParams.lng) {
      const expandedRadius = (baseParams.radius || 3000) * 2.5; // e.g. 7500m
      const expandedGeoParams = {
        ...baseParams,
        facility_ids: [],
        radius: expandedRadius,
      };
      candidateKos = await this.queryWithCache(expandedGeoParams);
      if (candidateKos.length > 0) {
        return {
          candidates: candidateKos,
          fallbackApplied: true,
          fallbackReason: `Radius pencarian diperluas hingga ${Math.round(expandedRadius / 1000)} km dari lokasi yang dituju`,
        };
      }

      // Try without geo restriction
      const noGeoParams = {
        ...baseParams,
        facility_ids: [],
        lat: null,
        lng: null,
        radius: null,
        district: null,
      };
      candidateKos = await this.queryWithCache(noGeoParams);
      if (candidateKos.length > 0) {
        return {
          candidates: candidateKos,
          fallbackApplied: true,
          fallbackReason: 'Lokasi diperluas ke wilayah Jambi lainnya yang sesuai kriteria tipe & budget',
        };
      }
    }

    // Step 3: Increase budget by 20%
    if (baseParams.max_price) {
      const increasedBudget = Math.round(baseParams.max_price * 1.2);
      const budgetParams = {
        type: baseParams.type || null,
        max_price: increasedBudget,
        facility_ids: [],
        limit: 10,
      };
      candidateKos = await this.queryWithCache(budgetParams);
      if (candidateKos.length > 0) {
        return {
          candidates: candidateKos,
          fallbackApplied: true,
          fallbackReason: `Budget dinaikkan 20% (hingga Rp ${increasedBudget.toLocaleString('id-ID')}) untuk menampilkan opsi terdekat`,
        };
      }
    }

    // Step 4: Top rated active kos as general recommendation
    const topRatedParams = {
      type: baseParams.type || null,
      sort: 'rating_desc',
      limit: 5,
    };
    candidateKos = await this.queryWithCache(topRatedParams);
    if (candidateKos.length > 0) {
      return {
        candidates: candidateKos,
        fallbackApplied: true,
        fallbackReason: 'Menampilkan pilihan kos terbaik yang saat ini tersedia di JeJakos',
      };
    }

    return {
      candidates: [],
      fallbackApplied: false,
      fallbackReason: null,
    };
  },

  /**
   * Build structured prompt for LLM (RAG with strict anti-hallucination guardrail)
   */
  buildPrompt({ message, history = [], candidateKos = [], criteria = {}, fallbackApplied = false, fallbackReason = null }) {
    const formattedKos = candidateKos.map((k) => {
      const facNames = (k.facilities || []).map((f) => (typeof f === 'string' ? f : f.name)).join(', ') || 'Standar';
      const distanceInfo = k.distance_meters ? `\n- Jarak: sekitar ${Math.round(k.distance_meters)} meter dari titik acuan` : '';
      return `ID: ${k.id}
Nama: ${k.name}
Tipe: ${k.type}
Alamat: ${k.address}, ${k.district || 'Jambi'}
Harga mulai: Rp ${Number(k.min_price).toLocaleString('id-ID')}/bulan
Kamar tersedia: ${k.available_rooms || 0} kamar (dari total ${k.total_rooms || 0})
Fasilitas: ${facNames}
Rating: ${Number(k.avg_rating || 0).toFixed(1)} / 5 (${k.total_reviews || 0} ulasan)${distanceInfo}
Link detail: /kos/${k.id}`;
    }).join('\n\n');

    const historyText = history
      .slice(-5)
      .map((h) => `${h.role === 'user' ? 'Pencari' : 'Asisten'}: ${h.content || h.message || ''}`)
      .join('\n');

    let contextSection = '';
    if (candidateKos.length > 0) {
      contextSection = `[DATA KOS RESMI JEJAKOS DARI DATABASE]:
${formattedKos}`;
    } else {
      contextSection = `[DATA KOS RESMI JEJAKOS DARI DATABASE]:
(Tidak ada data kos yang cocok di database)`;
    }

    let fallbackNote = '';
    if (fallbackApplied && fallbackReason) {
      fallbackNote = `\nCATATAN FILTER: ${fallbackReason}. Jelaskan kepada pengguna bahwa kriteria disesuaikan/dilonggarkan agar tetap mendapat rekomendasi hunian yang mendekati kebutuhan mereka.`;
    }

    const missingSection = criteria.missing_preferences && criteria.missing_preferences.length > 0
      ? `\nPREFERENSI YANG BELUM LENGKAP: ${criteria.missing_preferences.join(', ')}. Tanyakan preferensi ini secara sopan untuk mempersempit pencarian berikutnya (F-20).`
      : '';

    const systemInstruction = `Kamu adalah Asisten Virtual JeJakos (Jejak Kos Jambi).
Tugas utamamu adalah membantu pencari kos menemukan hunian sewa di Provinsi Jambi secara ramah, informatif, dan ringkas.

ATURAN KETAT RAG & ANTI-HALUSINASI (F-21):
1. Rekomendasikan HANYA kos yang ada pada [DATA KOS RESMI JEJAKOS DARI DATABASE] di atas.
2. JANGAN PERNAH mengarang nama kos, alamat, harga, atau fasilitas kos fiktif yang tidak tercantum dalam daftar.
3. Jika tidak ada kos yang cocok di daftar, nyatakan secara jujur dan tanyakan kriteria penyesuaian (misal lokasi lain atau budget berbeda).
4. Untuk setiap kos yang kamu rekomendasikan, sebutkan nama kos, tipe, harga per bulan, fasilitas unggulan, dan sertakan tautan /kos/[ID].
5. Di baris paling akhir respons, WAJIB tuliskan satu baris format array ID kos yang kamu sebutkan persis seperti ini:
   KOS_IDS: [id1, id2]
   Contoh: KOS_IDS: [1, 2]
   Jika tidak ada kos yang direkomendasikan, tulis: KOS_IDS: []
${fallbackNote}${missingSection}`;

    return {
      systemInstruction,
      contextSection,
      historyText,
      fullUserPrompt: `${contextSection}\n\nRiwayat percakapan:\n${historyText || '(Awal percakapan)'}\n\nPencari: ${message}`,
    };
  },

  /**
   * Call Google Gemini with timeout and model fallback
   */
  async callLLM({ systemInstruction, fullUserPrompt }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return null;
    }

    const preferredModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const fallbackModel = 'gemini-3.5-flash-lite';
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try preferred model, then fallback model
    const modelsToTry = [preferredModel];
    if (preferredModel !== fallbackModel) {
      modelsToTry.push(fallbackModel);
    }

    for (const mName of modelsToTry) {
      try {
        const model = genAI.getGenerativeModel({
          model: mName,
          systemInstruction,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        });

        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 15000); // 15s timeout

        try {
          const result = await model.generateContent(fullUserPrompt, { signal: ctrl.signal });
          clearTimeout(timeoutId);
          return result.response.text();
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        // Continue to fallback model if any
        if (mName === modelsToTry[modelsToTry.length - 1]) {
          return null; // Both failed
        }
      }
    }

    return null;
  },

  /**
   * Parse LLM response and apply anti-hallucination post-check (F-21, §5.2)
   */
  parseResponse(llmText, candidateKos = []) {
    const candidateMap = new Map();
    for (const k of candidateKos) {
      candidateMap.set(Number(k.id), k);
    }

    let mentionedIds = [];
    let cleanText = llmText || '';

    // 1. Extract IDs from KOS_IDS: [...] tag
    const kosIdsMatch = cleanText.match(/KOS_IDS:\s*\[([0-9,\s]*)\]/i);
    if (kosIdsMatch) {
      const rawIds = kosIdsMatch[1]
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));
      mentionedIds.push(...rawIds);
      // Remove the tag from user-facing text
      cleanText = cleanText.replace(/KOS_IDS:\s*\[[0-9,\s]*\]/gi, '').trim();
    }

    // 2. Extract IDs from markdown links /kos/:id if present
    const linkMatches = cleanText.matchAll(/\/kos\/(\d+)/gi);
    for (const m of linkMatches) {
      const id = parseInt(m[1], 10);
      if (!isNaN(id) && !mentionedIds.includes(id)) {
        mentionedIds.push(id);
      }
    }

    // 3. POST-CHECK ANTI-HALUSINASI GUARDRAIL (F-21, §5.2):
    // Only accept IDs that are genuinely in candidateKos from the database!
    const validatedIds = [];
    const validatedKos = [];

    for (const id of mentionedIds) {
      if (candidateMap.has(id)) {
        if (!validatedIds.includes(id)) {
          validatedIds.push(id);
          validatedKos.push(candidateMap.get(id));
        }
      }
    }

    // 4. Fallback if LLM mentioned candidates by name but omitted ID tags
    if (validatedKos.length === 0 && candidateKos.length > 0) {
      for (const k of candidateKos) {
        if (cleanText.toLowerCase().includes(k.name.toLowerCase())) {
          if (!validatedIds.includes(k.id)) {
            validatedIds.push(k.id);
            validatedKos.push(k);
          }
        }
      }
    }

    // Format kos cards for frontend (F-22). Do not attach candidates the LLM did not recommend.
    const formattedCards = validatedKos.map((k) => ({
      id: k.id,
      name: k.name,
      type: k.type,
      address: k.address,
      district: k.district,
      min_price: Number(k.min_price),
      available_rooms: k.available_rooms,
      total_rooms: k.total_rooms,
      avg_rating: Number(k.avg_rating || 0),
      total_reviews: k.total_reviews || 0,
      facilities: k.facilities || [],
      photos: k.photos || [],
      thumbnail: k.photos?.[0]?.photo_url || null,
      detail_url: `/kos/${k.id}`,
      distance_meters: k.distance_meters || null,
    }));

    return {
      message: cleanText,
      kos: formattedCards,
      kos_ids: validatedIds,
    };
  },

  /**
   * Deterministic Indonesian response builder when LLM is unavailable or offline
   */
  buildFallbackResponse({ message, criteria, candidateKos, fallbackApplied, fallbackReason }) {
    if (criteria.intent === 'greeting') {
      return {
        message: 'Halo! Saya asisten pintar JeJakos. Saya siap membantu Anda menemukan kos yang nyaman dan sesuai kebutuhan di Provinsi Jambi. Mau cari kos putra, putri, atau campur? Di area mana dan berapa kisaran budget Anda?',
        kos: [],
        kos_ids: [],
      };
    }

    if (criteria.intent === 'faq') {
      return {
        message: 'JeJakos adalah platform digitalisasi rekam jejak dan pemasaran hunian sewa di Provinsi Jambi. Anda dapat mencari kos berdasarkan lokasi kampus/daerah, fasilitas, dan anggaran, serta melakukan pemesanan langsung secara aman.',
        kos: [],
        kos_ids: [],
      };
    }

    if (candidateKos.length === 0) {
      let msg = 'Maaf, belum ditemukan kos yang sesuai dengan kriteria yang Anda cari saat ini di database JeJakos.';
      if (criteria.location) {
        msg += ` Anda bisa mencoba mencari di sekitar area lain atau menyesuaikan budget/fasilitas.`;
      }
      return {
        message: msg,
        kos: [],
        kos_ids: [],
      };
    }

    let header = 'Berikut rekomendasi kos di JeJakos yang sesuai dengan pencarian Anda:';
    if (fallbackApplied && fallbackReason) {
      header = `Catatan: ${fallbackReason}.\nBerikut rekomendasi hunian terdekat yang tersedia di JeJakos:`;
    }

    const itemsText = candidateKos.slice(0, 3).map((k, idx) => {
      const facs = (k.facilities || []).map((f) => (typeof f === 'string' ? f : f.name)).slice(0, 4).join(', ');
      return `${idx + 1}. **${k.name}** (${k.type})\n   - Harga: mulai Rp ${Number(k.min_price).toLocaleString('id-ID')}/bulan\n   - Lokasi: ${k.address}, ${k.district || 'Jambi'}\n   - Fasilitas: ${facs || 'Standar'}\n   - Lihat detail: /kos/${k.id}`;
    }).join('\n\n');

    let footer = '\n\nSilakan klik tautan kos di atas untuk melihat foto dan detail kamar lengkap.';
    if (criteria.missing_preferences && criteria.missing_preferences.length > 0) {
      const missingList = [];
      if (criteria.missing_preferences.includes('type')) missingList.push('tipe kos (putra/putri/campur)');
      if (criteria.missing_preferences.includes('budget')) missingList.push('kisaran budget bulanan');
      if (criteria.missing_preferences.includes('facilities')) missingList.push('fasilitas khusus (seperti AC atau WiFi)');
      if (missingList.length > 0) {
        footer += `\n\nUntuk hasil yang lebih spesifik, Anda juga dapat menyebutkan ${missingList.join(', ')}.`;
      }
    }

    const fullText = `${header}\n\n${itemsText}${footer}`;
    return this.parseResponse(fullText, candidateKos);
  },

  /**
   * Main Chatbot Service Entry Point (F-20 ~ F-22)
   *
   * Flow:
   * 1. Extract intent & criteria (Gemini structured output or rule-based)
   * 2. Query DB with caching (5 min TTL) & progressive fallback relaxation
   * 3. Build RAG prompt with anti-hallucination rules & multi-turn memory
   * 4. Call Gemini LLM (with timeout & model fallback)
   * 5. Parse response & enforce anti-hallucination post-check (F-21, F-22)
   */
  async sendMessage({ message, history = [], options = {} }) {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Pesan tidak boleh kosong');
    }

    const trimmedMsg = message.trim();
    const cleanHistory = Array.isArray(history) ? history.slice(-5) : [];

    // Step 1: Parse Intent & Criteria
    const criteria = await this.parseIntent(trimmedMsg, cleanHistory);

    // Greetings and FAQs do not need a DB search or recommendation cards.
    if (['greeting', 'faq'].includes(criteria.intent) && !criteria.landmark && !criteria.max_price && !criteria.type) {
      const promptObj = this.buildPrompt({
        message: trimmedMsg,
        history: cleanHistory,
        candidateKos: [],
        criteria,
      });

      const llmRaw = await this.callLLM(promptObj);
      if (llmRaw) {
        const parsed = this.parseResponse(llmRaw, []);
        return {
          ...parsed,
          criteria,
          fallback_applied: false,
          fallback_reason: null,
        };
      }

      const fallback = this.buildFallbackResponse({
        message: trimmedMsg,
        criteria,
        candidateKos: [],
        fallbackApplied: false,
        fallbackReason: null,
      });
      return {
        ...fallback,
        criteria,
        fallback_applied: false,
        fallback_reason: null,
      };
    }

    // Step 2: Query DB with progressive fallback relaxation
    const { candidates, fallbackApplied, fallbackReason } = await this.searchKosWithFallback(criteria);

    // Step 3: Build Prompt (RAG)
    const promptObj = this.buildPrompt({
      message: trimmedMsg,
      history: cleanHistory,
      candidateKos: candidates,
      criteria,
      fallbackApplied,
      fallbackReason,
    });

    // Step 4: Call LLM
    const llmRaw = await this.callLLM(promptObj);

    // Step 5: Parse response & apply anti-hallucination guardrail post-check
    let finalResult;
    if (llmRaw) {
      finalResult = this.parseResponse(llmRaw, candidates);
    } else {
      finalResult = this.buildFallbackResponse({
        message: trimmedMsg,
        criteria,
        candidateKos: candidates,
        fallbackApplied,
        fallbackReason,
      });
    }

    return {
      message: finalResult.message,
      kos: finalResult.kos,
      kos_ids: finalResult.kos_ids,
      criteria,
      fallback_applied: fallbackApplied,
      fallback_reason: fallbackReason,
    };
  },
};

module.exports = ChatbotService;
