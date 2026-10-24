const assert = require('assert');
const ChatbotService = require('../src/services/chatbot.service');
const { loadEnv } = require('../src/config/env');

loadEnv();

async function runTests() {
  console.log('--- Chatbot Service Test Suite (T-40: F-20~F-22) ---');

  try {
    // ------------------------------------------------------------
    // 1. Rule-based & Intent Parsing Unit Tests
    // ------------------------------------------------------------
    console.log('1. Testing Intent & Parameter Extraction (Single & Multi-turn)...');

    // 1a. Single-turn extraction: location, budget, type, facilities
    const criteria1 = await ChatbotService.parseIntent(
      'Cari kos putri dekat UNJA budget 700rb ada WiFi dan AC'
    );
    assert.strictEqual(criteria1.intent, 'search');
    assert.strictEqual(criteria1.type, 'putri');
    assert.strictEqual(criteria1.max_price, 700000);
    assert.strictEqual(criteria1.location, 'UNJA Mendalo');
    assert.ok(criteria1.lat !== null && criteria1.lng !== null);
    assert.ok(criteria1.facilities.includes('WiFi'));
    assert.ok(criteria1.facilities.includes('AC'));

    // 1b. Synonyms: "cowok", "1 jt", "km dalam"
    const criteria2 = await ChatbotService.parseIntent(
      'Kos cowok dekat UIN budget 1 jt kamar mandi dalam'
    );
    assert.strictEqual(criteria2.type, 'putra');
    assert.strictEqual(criteria2.max_price, 1000000);
    assert.strictEqual(criteria2.location, 'UIN STS Jambi');
    assert.ok(criteria2.facilities.includes('Kamar Mandi Dalam'));

    // 1c. Multi-turn memory extraction (F-20)
    // Turn 1 said "kos cewek", Turn 2 said "dekat UNBARI ada wifi budget 800rb"
    const history1 = [
      { role: 'user', content: 'Saya cari kos cewek' },
      { role: 'assistant', content: 'Baik, kos putri di area mana yang Anda cari?' },
    ];
    const criteria3 = await ChatbotService.parseIntent(
      'Dekat UNBARI budget 800rb ada WiFi',
      history1
    );
    assert.strictEqual(criteria3.type, 'putri', 'Should inherit putri from turn 1');
    assert.strictEqual(criteria3.location, 'UNBARI / Telanaipura');
    assert.strictEqual(criteria3.max_price, 800000);
    assert.ok(criteria3.facilities.includes('WiFi'));

    // 1d. Missing preferences detection (F-20: menggali preferensi)
    const criteriaVague = await ChatbotService.parseIntent('Cari kosan bagus');
    assert.ok(criteriaVague.missing_preferences.includes('type'));
    assert.ok(criteriaVague.missing_preferences.includes('location'));
    assert.ok(criteriaVague.missing_preferences.includes('budget'));

    console.log('✓ Intent & Parameter Extraction passed');

    // ------------------------------------------------------------
    // 2. Facility Resolution against Database
    // ------------------------------------------------------------
    console.log('2. Testing Facility Resolution...');
    const facIds = await ChatbotService.resolveFacilityIds(['WiFi', 'AC', 'Kamar Mandi Dalam']);
    assert.ok(Array.isArray(facIds));
    assert.strictEqual(facIds.length, 3);
    assert.ok(facIds.includes(1)); // WiFi
    assert.ok(facIds.includes(2)); // AC
    assert.ok(facIds.includes(3)); // KM Dalam
    console.log('✓ Facility Resolution passed');

    // ------------------------------------------------------------
    // 3. In-Memory 5-Minute Cache (Design §5.2)
    // ------------------------------------------------------------
    console.log('3. Testing 5-minute Query Cache...');
    ChatbotService.clearCache();
    assert.strictEqual(ChatbotService.getCacheSize(), 0);

    const qParams = { type: 'putra', limit: 3 };
    const query1 = await ChatbotService.queryWithCache(qParams);
    assert.ok(query1.length > 0);
    assert.strictEqual(ChatbotService.getCacheSize(), 1);

    // Second call should return cached data without error
    const query2 = await ChatbotService.queryWithCache(qParams);
    assert.strictEqual(query1, query2, 'Should return same reference from memory cache');
    console.log('✓ In-memory Query Cache passed');

    // ------------------------------------------------------------
    // 4. Progressive Fallback Relaxation on 0 Results (F-21, §5.2)
    // ------------------------------------------------------------
    console.log('4. Testing Progressive Fallback Relaxation...');
    // Query with unrealistically low budget (e.g. 100.000) near UNJA with facilities
    const impossibleCriteria = {
      type: 'putra',
      lat: -1.6140,
      lng: 103.5200,
      radius: 500,
      max_price: 100000, // No kos is 100k
      facilities: ['Kulkas Bersama', 'AC'],
    };

    const searchResult = await ChatbotService.searchKosWithFallback(impossibleCriteria);
    assert.ok(searchResult.candidates.length > 0, 'Should return candidate kos via relaxation');
    assert.strictEqual(searchResult.fallbackApplied, true, 'Fallback must be flagged as applied');
    assert.ok(typeof searchResult.fallbackReason === 'string', 'Fallback reason must be provided');
    console.log(`✓ Progressive Fallback passed (Reason: ${searchResult.fallbackReason})`);

    // ------------------------------------------------------------
    // 5. Anti-Hallucination Guardrail Post-Check (F-21, §5.2)
    // ------------------------------------------------------------
    console.log('5. Testing Anti-Hallucination Guardrail Post-Check...');
    const candidateMock = [
      { id: 1, name: 'Kos Putra Mendalo Asri', type: 'putra', min_price: 550000, address: 'Mendalo', district: 'Jaluko', facilities: ['WiFi'] },
      { id: 2, name: 'Kos Putri Graha Sakinah UNJA', type: 'putri', min_price: 650000, address: 'Mendalo', district: 'Jaluko', facilities: ['WiFi', 'AC'] },
    ];

    // LLM response mentions genuine ID 1, but hallucinates ID 999 and ID 888
    const hallucinatedLLMText = `Berikut rekomendasi kami:
1. Kos Putra Mendalo Asri (/kos/1) sangat bagus.
2. Kos Fiktif Bintang (/kos/999) harga 300rb.
KOS_IDS: [1, 999, 888]`;

    const parsedGuardrail = ChatbotService.parseResponse(hallucinatedLLMText, candidateMock);
    assert.deepStrictEqual(parsedGuardrail.kos_ids, [1], 'Hallucinated IDs 999 and 888 must be rejected');
    assert.strictEqual(parsedGuardrail.kos.length, 1);
    assert.strictEqual(parsedGuardrail.kos[0].id, 1);
    assert.strictEqual(parsedGuardrail.kos[0].detail_url, '/kos/1');
    assert.ok(!parsedGuardrail.message.includes('KOS_IDS:'), 'KOS_IDS tag must be stripped from message');
    console.log('✓ Anti-Hallucination Guardrail passed (Hallucinated IDs rejected)');

    // ------------------------------------------------------------
    // 6. Card Formatting for Frontend (F-22)
    // ------------------------------------------------------------
    console.log('6. Testing Card Formatting for Frontend (F-22)...');
    const card = parsedGuardrail.kos[0];
    assert.ok(card.id === 1);
    assert.ok(card.name === 'Kos Putra Mendalo Asri');
    assert.ok(card.type === 'putra');
    assert.ok(card.min_price === 550000);
    assert.ok(card.detail_url === '/kos/1');
    assert.ok(Array.isArray(card.facilities));
    console.log('✓ Card Formatting passed');

    // ------------------------------------------------------------
    // 7. Greeting & Conversational Preference Probing (F-20)
    // ------------------------------------------------------------
    console.log('7. Testing Greeting & Preference Probing (F-20)...');
    const greetingRes = await ChatbotService.sendMessage({ message: 'Halo' });
    assert.ok(greetingRes.message.length > 0);
    assert.ok(greetingRes.criteria.intent === 'greeting');
    // Chatbot should ask preferences or greet politely
    assert.ok(greetingRes.message.toLowerCase().includes('kos') || greetingRes.message.toLowerCase().includes('jejakos'));
    console.log('✓ Greeting & Preference Probing passed');

    // ------------------------------------------------------------
    // 8. End-to-End Chatbot Query Flow (RAG with Live DB & Gemini)
    // ------------------------------------------------------------
    console.log('8. Testing End-to-End Chatbot Search Flow (RAG)...');
    const searchRes = await ChatbotService.sendMessage({
      message: 'Cari kos putra dekat UNJA budget 600rb ada WiFi',
    });

    assert.ok(searchRes.message.length > 0);
    assert.ok(Array.isArray(searchRes.kos));
    assert.ok(searchRes.kos.length > 0, 'Must return at least 1 recommended kos');
    assert.ok(searchRes.kos_ids.length > 0);

    // Verify all returned kos are active approved in database and match criteria
    for (const item of searchRes.kos) {
      assert.ok(typeof item.id === 'number');
      assert.strictEqual(item.type, 'putra');
      assert.strictEqual(item.detail_url, `/kos/${item.id}`);
      assert.ok(item.min_price <= 600000 || searchRes.fallback_applied);
    }

    console.log(`✓ End-to-End Search passed (Returned ${searchRes.kos.length} kos cards)`);

    console.log('\nALL CHATBOT SERVICE TESTS PASSED!');
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED CHATBOT TEST:', err);
    process.exit(1);
  }
}

runTests();
