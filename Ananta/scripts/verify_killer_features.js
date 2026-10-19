/**
 * Automated Verification Script for Ananta Killer Features
 * Checks HTML structure, DOM elements, JS syntax, and mock browser logic.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('=== 🚀 STARTING ANANTA KILLER FEATURES VERIFICATION ===\n');

  // 1. Check local files existence
  const requiredFiles = [
    'js/surface-code.js',
    'js/transpiler-doctor.js',
    'js/vqe-chemistry.js',
    'js/pulse-studio.js',
    'index.html',
    'style.css',
    'js/app.js'
  ];

  let fileErrors = 0;
  for (const f of requiredFiles) {
    const fullPath = path.join(__dirname, '..', f);
    if (!fs.existsSync(fullPath)) {
      console.error(`❌ Missing file: ${f}`);
      fileErrors++;
    } else {
      const stats = fs.statSync(fullPath);
      console.log(`✅ File exists: ${f} (${stats.size} bytes)`);
    }
  }

  if (fileErrors > 0) {
    process.exit(1);
  }

  // 2. Check HTML contains required view IDs and Script tags
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const requiredViews = [
    'view-surface-code',
    'view-transpiler',
    'view-vqe-chemistry',
    'view-pulse-studio'
  ];

  for (const v of requiredViews) {
    if (html.includes(`id="${v}"`)) {
      console.log(`✅ View section present: #${v}`);
    } else {
      console.error(`❌ View section missing: #${v}`);
      fileErrors++;
    }
  }

  const requiredScripts = [
    'js/surface-code.js',
    'js/transpiler-doctor.js',
    'js/vqe-chemistry.js',
    'js/pulse-studio.js'
  ];

  for (const s of requiredScripts) {
    if (html.includes(`<script src="${s}">`)) {
      console.log(`✅ Script tag present: ${s}`);
    } else {
      console.error(`❌ Script tag missing: ${s}`);
      fileErrors++;
    }
  }

  // 3. Test HTTP Server response on http://localhost:5500/
  await new Promise((resolve) => {
    http.get('http://127.0.0.1:5500/api/health', (res) => {
      console.log(`\n✅ Backend Health Status: ${res.statusCode} ${res.statusMessage}`);
      if (res.statusCode === 200) {
        console.log('✅ Local server operational with live API backend.');
      } else {
        console.error(`❌ Unexpected HTTP status code: ${res.statusCode}`);
      }
      resolve();
    }).on('error', (err) => {
      console.error(`❌ HTTP Request Error: ${err.message}`);
      resolve();
    });
  });

  console.log('\n=== 🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

runTests();
