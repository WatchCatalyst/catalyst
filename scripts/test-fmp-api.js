// Quick test script to verify FMP API key works for congressional trades
// Run with: node scripts/test-fmp-api.js

require('dotenv').config({ path: '.env.local' });

const FMP_KEY = process.env.FMP_API_KEY;

if (!FMP_KEY) {
  console.error('❌ FMP_API_KEY not found in .env.local');
  console.log('Please add FMP_API_KEY=your_key_here to .env.local');
  process.exit(1);
}

console.log('✅ FMP_API_KEY found');
console.log('Testing API endpoints...\n');

async function testEndpoint(name, url) {
  try {
    console.log(`Testing ${name}...`);
    const response = await fetch(url);
    
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data)) {
        console.log(`✅ ${name}: Success - ${data.length} trades found`);
        if (data.length > 0) {
          console.log(`   Sample trade: ${JSON.stringify(data[0], null, 2).substring(0, 200)}...`);
        }
      } else {
        console.log(`⚠️  ${name}: Unexpected response format:`, typeof data);
      }
    } else {
      const errorText = await response.text();
      console.log(`❌ ${name}: Failed with status ${response.status}`);
      console.log(`   Error: ${errorText.substring(0, 200)}`);
      
      if (response.status === 403 || response.status === 401) {
        console.log(`   💡 This usually means your API key doesn't have access to congressional trades`);
        console.log(`   💡 Congressional trades may require a legacy FMP subscription`);
      }
    }
  } catch (error) {
    console.log(`❌ ${name}: Error - ${error.message}`);
  }
  console.log('');
}

(async () => {
  const senateUrl = `https://financialmodelingprep.com/api/v4/senate-trading?apikey=${FMP_KEY}`;
  const houseUrl = `https://financialmodelingprep.com/api/v4/senate-disclosure?apikey=${FMP_KEY}`;
  
  await testEndpoint('Senate Trades', senateUrl);
  await testEndpoint('House Trades', houseUrl);
  
  console.log('Test complete!');
})();







