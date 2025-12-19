// Quick test script to verify TheNewsAPI is working
const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to read .env.local
let apiKey = process.env.THENEWSAPI_KEY;

if (!apiKey) {
  try {
    const envFile = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envFile)) {
      const envContent = fs.readFileSync(envFile, 'utf8');
      const match = envContent.match(/THENEWSAPI_KEY=(.+)/);
      if (match) {
        apiKey = match[1].trim().replace(/^["']|["']$/g, '');
      }
    }
  } catch (e) {
    // ignore
  }
}

if (!apiKey) {
  console.log('❌ THENEWSAPI_KEY not found');
  console.log('   Please provide it as an argument: node scripts/test-thenewsapi.js YOUR_API_KEY');
  console.log('   Or make sure it\'s in .env.local as THENEWSAPI_KEY=your_key');
  
  // Allow passing API key as argument
  if (process.argv[2]) {
    apiKey = process.argv[2];
    console.log('\n✅ Using API key from command line argument\n');
  } else {
    process.exit(1);
  }
}

console.log('✅ API Key found (length:', apiKey.length + ')');
console.log('Testing API connection...\n');

const url = `https://api.thenewsapi.com/v1/news/all?api_token=${apiKey}&categories=business&language=en&limit=5&page=1`;

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      try {
        const json = JSON.parse(data);
        const articles = json.data || [];
        
        console.log('✅ API is WORKING!');
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Articles returned: ${articles.length}`);
        
        if (articles.length > 0) {
          const firstArticle = articles[0];
          console.log(`   Latest article: "${firstArticle.title?.substring(0, 60)}..."`);
          console.log(`   Published: ${firstArticle.published_at || 'N/A'}`);
          console.log(`   Source: ${firstArticle.source || 'N/A'}`);
        }
        
        console.log('\n🎉 TheNewsAPI is working correctly!');
      } catch (e) {
        console.log('❌ Failed to parse response:', e.message);
        console.log('Response:', data.substring(0, 200));
      }
    } else {
      console.log(`❌ API returned error status: ${res.statusCode}`);
      console.log('Response:', data.substring(0, 500));
      
      if (res.statusCode === 401) {
        console.log('\n⚠️  Authentication failed - check if your API key is valid');
      } else if (res.statusCode === 402) {
        console.log('\n⚠️  Payment required - check if your subscription is active');
      }
    }
  });
}).on('error', (err) => {
  console.log('❌ Connection error:', err.message);
});

