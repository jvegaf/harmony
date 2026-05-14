/**
 * Test de cloudscraper para resolver Cloudflare Challenge
 * Ejecutar con: pnpm tsx src/main/lib/tagger/__tests__/cloudscraper-test.ts
 */

import cloudscraper from 'cloudscraper';

async function testTraxsourceWithCloudscraper() {
  console.log('\n🧪 Testing Traxsource with Cloudscraper...');
  
  try {
    const response = await cloudscraper.get('https://www.traxsource.com/search?term=test', {
      timeout: 30000,
    });
    
    console.log('   Response length:', response.length);
    
    // Verificar si contiene la página de búsqueda real o el challenge
    if (response.includes('searchTrackList') || response.includes('trk-row')) {
      console.log('   ✅ Traxsource: PASSED - Got real search page');
      return true;
    } else if (response.includes('Just a moment') || response.includes('cf-chl-container')) {
      console.log('   ❌ Traxsource: FAILED - Still getting Cloudflare challenge');
      console.log('   First 500 chars:', response.substring(0, 500));
      return false;
    } else {
      console.log('   ⚠️ Traxsource: Unknown response');
      console.log('   First 500 chars:', response.substring(0, 500));
      return false;
    }
  } catch (error: any) {
    console.log('   ❌ Traxsource: ERROR -', error.message || error);
    return false;
  }
}

async function testBeatportWithCloudscraper() {
  console.log('\n🧪 Testing Beatport with Cloudscraper...');
  
  try {
    const response = await cloudscraper.get('https://www.beatport.com/search/tracks?q=test', {
      timeout: 30000,
    });
    
    console.log('   Response length:', response.length);
    
    // Verificar si contiene datos reales o el challenge
    if (response.includes('__NEXT_DATA__') || response.includes('track')) {
      console.log('   ✅ Beatport: PASSED - Got real page');
      return true;
    } else if (response.includes('Just a moment') || response.includes('cf-chl-container')) {
      console.log('   ❌ Beatport: FAILED - Still getting Cloudflare challenge');
      return false;
    } else {
      console.log('   ⚠️ Beatport: Unknown response');
      console.log('   First 500 chars:', response.substring(0, 500));
      return false;
    }
  } catch (error: any) {
    console.log('   ❌ Beatport: ERROR -', error.message || error);
    return false;
  }
}

async function main() {
  console.log('========================================');
  console.log('Cloudscraper Test - Bypass Cloudflare');
  console.log('========================================');
  
  const traxsourceResult = await testTraxsourceWithCloudscraper();
  const beatportResult = await testBeatportWithCloudscraper();
  
  console.log('\n========================================');
  console.log('Results:');
  console.log(`   Traxsource: ${traxsourceResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`   Beatport: ${beatportResult ? '✅ PASSED' : '❌ FAILED'}`);
  console.log('========================================\n');
  
  process.exit(traxsourceResult && beatportResult ? 0 : 1);
}

main();