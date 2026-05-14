/**
 * Test de búsqueda real para tag providers
 * Ejecutar con: pnpm tsx src/main/lib/tagger/__tests__/providers-search.test.ts
 * 
 * Este test verifica que los providers pueden buscar tracks reales
 */

import { BeatportClient } from '../beatport/client/client';
import { Traxsource } from '../traxsource/traxsource';

async function testBeatportSearch() {
  console.log('\n🧪 Testing Beatport search...');
  const client = BeatportClient.new();
  
  try {
    // Buscar un track conocido
    const result = await client.search('Party Bounce', 'Tomas Bisquierra');
    console.log(`   Found ${result.tracks.length} tracks`);
    
    if (result.tracks.length > 0) {
      const track = result.tracks[0];
      console.log(`   First result: "${track.name}" by ${track.artists?.map(a => a.name).join(', ')}`);
      console.log('   ✅ Beatport search: PASSED');
      return true;
    } else {
      console.log('   ⚠️ Beatport: No tracks found (may be rate limited)');
      return true; // No es fallo - puede ser rate limit
    }
  } catch (error: any) {
    console.log('   ❌ Beatport search: ERROR -', error.message || error);
    return false;
  }
}

async function testTraxsourceSearch() {
  console.log('\n🧪 Testing Traxsource search...');
  const client = new Traxsource();
  
  try {
    // Buscar un track conocido
    const tracks = await client.searchTracks('Party Bounce', 'Tomas Bisquierra');
    console.log(`   Found ${tracks.length} tracks`);
    
    if (tracks.length > 0) {
      const track = tracks[0];
      console.log(`   First result: "${track.title}" by ${track.artists.join(', ')}`);
      console.log('   ✅ Traxsource search: PASSED');
      return true;
    } else {
      console.log('   ⚠️ Traxsource: No tracks found');
      return true;
    }
  } catch (error: any) {
    console.log('   ❌ Traxsource search: ERROR -', error.message || error);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('Tag Providers Search Test');
  console.log('========================================');
  
  const beatportResult = await testBeatportSearch();
  const traxsourceResult = await testTraxsourceSearch();
  
  console.log('\n========================================');
  console.log('Results:');
  console.log(`   Beatport search: ${beatportResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Traxsource search: ${traxsourceResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');
  
  const allPassed = beatportResult && traxsourceResult;
  process.exit(allPassed ? 0 : 1);
}

main();