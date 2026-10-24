import { readFile } from 'node:fs/promises';
import { setTimeout as pause } from 'node:timers/promises';
import { createGemini, safeModelError } from '../server/gemini.js';

// Live API check: never prints keys, raw provider errors, or conversation content.
try {
  const gemini = createGemini();
  const fixtures = JSON.parse(await readFile(new URL('../tests/fixtures.json', import.meta.url), 'utf8'));
  console.log(`Live Gemini check — model: ${gemini.model}`);
  console.log('Use an eligible free-tier project with paid billing disabled. This script cannot verify your billing status.');
  console.log('13 live requests, paced 15 seconds apart. Stop with Ctrl+C. No automatic retries or paid fallback.');
  const reply = await gemini.generate([{ role: 'user', text: 'In this fictional demo I am deciding whether to attend a photography meetup. Help me consider my options.' }], { balanced: true });
  console.log(`PASS generation (${reply.length} characters; content not printed)`);
  let failures = 0;
  for (const fixture of fixtures) {
    await pause(15000);
    const result = fixture.kind === 'user'
      ? await gemini.classifyUser(fixture.text)
      : await gemini.classifyReply(fixture.text);
    const passed = fixture.includes ? result.categories.includes(fixture.includes) : result.categories.length === 0;
    console.log(`${passed ? 'PASS' : 'FAIL'} ${fixture.id} — labels: ${result.categories.join(', ') || 'none'}`);
    if (!passed) failures++;
  }
  console.log(`${failures ? 'INCOMPLETE' : 'PASS'}: generation and ${fixtures.length} classification examples; ${failures} mismatches.`);
  console.log('These examples check prototype behavior; they do not validate detection accuracy in real use.');
  if (failures) process.exitCode = 1;
} catch (error) {
  const safe = safeModelError(error);
  console.error(`STOP [${safe.code}]: ${safe.message}`);
  process.exitCode = 1;
}
