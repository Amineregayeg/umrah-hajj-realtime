#!/usr/bin/env node
/**
 * Standalone Knowledge Base Validator
 * Validates all 6 KB JSON files without requiring TypeScript compilation
 */

const fs = require('fs');
const path = require('path');

const KB_PATH = path.join(__dirname, 'src', 'umrah', 'data', 'knowledge');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

function loadJSON(filename) {
  const filePath = path.join(KB_PATH, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${filename}: ${error.message}`);
  }
}

function validateKB() {
  const errors = [];
  const warnings = [];
  let totalTests = 0;
  let passedTests = 0;

  log(colors.blue, '\n=== KNOWLEDGE BASE VALIDATOR ===\n');

  // Load all files
  let kb;
  try {
    kb = {
      gates: loadJSON('haram_gates.json'),
      zones: loadJSON('haram_zones.json'),
      madhhabRulings: loadJSON('madhhab_rulings.json'),
      ritualSteps: loadJSON('ritual_steps.json'),
      safetyRules: loadJSON('safety_rules.json'),
      duas: loadJSON('duas_by_location.json'),
    };
    log(colors.green, '✓ All 6 KB files loaded successfully');
  } catch (error) {
    log(colors.red, '✗ Failed to load KB files:', error.message);
    process.exit(1);
  }

  // Validate Gates
  log(colors.blue, '\n--- Validating Haram Gates ---');
  totalTests++;
  if (!kb.gates.gates || kb.gates.gates.length === 0) {
    errors.push('Gates: No gates found');
  } else {
    passedTests++;
    log(colors.green, `✓ Found ${kb.gates.gates.length} gates`);
  }

  totalTests++;
  if (!kb.gates.gates.every(g => g.id && g.name?.en)) {
    errors.push('Gates: Missing id or name.en');
  } else {
    passedTests++;
    log(colors.green, '✓ All gates have id and name.en');
  }

  totalTests++;
  const wheelchairGates = kb.gates.gates.filter(g => g.accessibility?.wheelchair);
  if (wheelchairGates.length < 8) {
    warnings.push(`Gates: Expected at least 8 wheelchair gates, found ${wheelchairGates.length}`);
  } else {
    passedTests++;
    log(colors.green, `✓ Found ${wheelchairGates.length} wheelchair-accessible gates`);
  }

  // Validate Zones
  log(colors.blue, '\n--- Validating Haram Zones ---');
  totalTests++;
  const requiredZones = ['mataf', 'safa', 'marwah', 'masa'];
  const zoneIds = kb.zones.zones.map(z => z.id);
  const missingZones = requiredZones.filter(id => !zoneIds.includes(id));
  if (missingZones.length > 0) {
    errors.push(`Zones: Missing critical zones: ${missingZones.join(', ')}`);
  } else {
    passedTests++;
    log(colors.green, `✓ All ${requiredZones.length} critical zones present`);
  }

  totalTests++;
  if (!kb.zones.zones.every(z => Array.isArray(z.safetyNotes))) {
    errors.push('Zones: Some zones missing safetyNotes array');
  } else {
    passedTests++;
    log(colors.green, '✓ All zones have safetyNotes');
  }

  // Validate Madhhab Rulings
  log(colors.blue, '\n--- Validating Madhhab Rulings ---');
  totalTests++;
  const criticalTopics = ['wudu_for_tawaf', 'menstruation_tawaf'];
  const topicIds = kb.madhhabRulings.topics.map(t => t.id);
  const missingTopics = criticalTopics.filter(id => !topicIds.includes(id));
  if (missingTopics.length > 0) {
    errors.push(`Madhhab: Missing critical topics: ${missingTopics.join(', ')}`);
  } else {
    passedTests++;
    log(colors.green, `✓ All ${criticalTopics.length} critical topics present`);
  }

  totalTests++;
  const wuduTopic = kb.madhhabRulings.topics.find(t => t.id === 'wudu_for_tawaf');
  if (!wuduTopic || !wuduTopic.rulings.hanafi || !wuduTopic.rulings.shafii) {
    errors.push('Madhhab: wudu_for_tawaf missing madhahib');
  } else {
    passedTests++;
    log(colors.green, '✓ wudu_for_tawaf has all 4 madhahib');
  }

  // Validate Ritual Steps
  log(colors.blue, '\n--- Validating Ritual Steps ---');
  totalTests++;
  const requiredSteps = ['ihram', 'tawaf', 'sai', 'halq_taqsir'];
  const stepIds = kb.ritualSteps.umrah.steps.map(s => s.id);
  const missingSteps = requiredSteps.filter(id => !stepIds.includes(id));
  if (missingSteps.length > 0) {
    errors.push(`Steps: Missing critical steps: ${missingSteps.join(', ')}`);
  } else {
    passedTests++;
    log(colors.green, `✓ All ${requiredSteps.length} critical Umrah steps present`);
  }

  totalTests++;
  const tawafStep = kb.ritualSteps.umrah.steps.find(s => s.id === 'tawaf');
  if (!tawafStep || !Array.isArray(tawafStep.stepByStep) || tawafStep.stepByStep.length < 5) {
    warnings.push('Steps: Tawaf stepByStep array missing or too short');
  } else {
    passedTests++;
    log(colors.green, `✓ Tawaf has ${tawafStep.stepByStep.length} substeps`);
  }

  // Validate Safety Rules
  log(colors.blue, '\n--- Validating Safety Rules ---');
  const safetyCategories = ['general', 'heat', 'accessibility', 'health', 'ihram', 'emergency', 'women'];
  let safetyCatCount = 0;
  for (const cat of safetyCategories) {
    totalTests++;
    if (!Array.isArray(kb.safetyRules[cat])) {
      errors.push(`Safety: Missing category: ${cat}`);
    } else {
      passedTests++;
      safetyCatCount++;
    }
  }
  log(colors.green, `✓ Found ${safetyCatCount}/${safetyCategories.length} safety categories`);

  totalTests++;
  if (!kb.safetyRules.general.every(r => r.id && r.severity)) {
    errors.push('Safety: Some rules missing id or severity');
  } else {
    passedTests++;
    log(colors.green, '✓ All safety rules have id and severity');
  }

  // Validate Duas
  log(colors.blue, '\n--- Validating Duas by Location ---');
  totalTests++;
  const requiredDuaLocations = ['ihram_entry', 'black_stone_istilam', 'safa_arrival'];
  const duaLocationIds = kb.duas.locations.map(l => l.id);
  const missingDuaLocations = requiredDuaLocations.filter(id => !duaLocationIds.includes(id));
  if (missingDuaLocations.length > 0) {
    errors.push(`Duas: Missing critical locations: ${missingDuaLocations.join(', ')}`);
  } else {
    passedTests++;
    log(colors.green, `✓ All ${requiredDuaLocations.length} critical dua locations present`);
  }

  totalTests++;
  const blackStoneDua = kb.duas.locations.find(l => l.id === 'black_stone_istilam');
  if (!blackStoneDua || !blackStoneDua.duas[0]?.arabic || !blackStoneDua.duas[0]?.transliteration) {
    errors.push('Duas: black_stone_istilam missing arabic/transliteration');
  } else {
    passedTests++;
    log(colors.green, '✓ black_stone_istilam has arabic and transliteration');
  }

  // Final Report
  log(colors.blue, '\n=== VALIDATION SUMMARY ===');
  log(colors.green, `Passed: ${passedTests}/${totalTests} tests`);

  if (warnings.length > 0) {
    log(colors.yellow, `\nWarnings (${warnings.length}):`);
    warnings.forEach(w => log(colors.yellow, `  ⚠ ${w}`));
  }

  if (errors.length > 0) {
    log(colors.red, `\nErrors (${errors.length}):`);
    errors.forEach(e => log(colors.red, `  ✗ ${e}`));
    log(colors.red, '\n✗ VALIDATION FAILED');
    process.exit(1);
  } else {
    log(colors.green, '\n✓ ALL VALIDATIONS PASSED');
    log(colors.blue, '\nKB Statistics:');
    log(colors.reset, `  - Gates: ${kb.gates.gates.length}`);
    log(colors.reset, `  - Zones: ${kb.zones.zones.length}`);
    log(colors.reset, `  - Madhhab Topics: ${kb.madhhabRulings.topics.length}`);
    log(colors.reset, `  - Umrah Steps: ${kb.ritualSteps.umrah.steps.length}`);
    log(colors.reset, `  - Safety Rules: ${kb.safetyRules.metadata.totalRules}`);
    log(colors.reset, `  - Dua Locations: ${kb.duas.locations.length}`);
    process.exit(0);
  }
}

validateKB();
