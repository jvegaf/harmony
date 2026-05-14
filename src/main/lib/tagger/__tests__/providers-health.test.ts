/**
 * Test de conectividad para tag providers
 * Ejecutar con: pnpm tsx src/main/lib/tagger/__tests__/providers-health.test.ts
 * 
 * Este test verifica que los providers (Beatport, Traxsource) son accesibles
 */

import { BeatportClient } from '../beatport/client/client';
import { Traxsource } from '../traxsource/traxsource';

async function testBeatport() {
  console.log('\n🧪 Testing Beatport health check...');
  const client = BeatportClient.new();
  
  try {
    const result = await client.healthCheck();
    console.log('   Result:', result);
    
    if (result.status === 'healthy') {
      console.log('   ✅ Beatport: PASSED');
      return true;
    } else {
      console.log('   ❌ Beatport: FAILED -', result.error);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Beatport: ERROR -', error);
    return false;
  }
}

async function testTraxsource() {
  console.log('\n🧪 Testing Traxsource health check...');
  const client = new Traxsource();
  
  try {
    const result = await client.healthCheck();
    console.log('   Result:', result);
    
    if (result.status === 'healthy') {
      console.log('   ✅ Traxsource: PASSED');
      return true;
    } else {
      console.log('   ❌ Traxsource: FAILED -', result.error);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Traxsource: ERROR -', error);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('Tag Providers Health Check Test');
  console.log('========================================');
  
  const beatportResult = await testBeatport();
  const traxsourceResult = await testTraxsource();
  
  console.log('\n========================================');
  console.log('Results:');
  console.log(`   Beatport: ${beatportResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Traxsource: ${traxsourceResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');
  
  const allPassed = beatportResult && traxsourceResult;
  process.exit(allPassed ? 0 : 1);
}

main();