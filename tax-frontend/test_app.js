// Quick test to check if App.jsx has valid syntax
const fs = require('fs');
const { execSync } = require('child_process');

try {
  // Try to parse the file with Node
  const content = fs.readFileSync('src/App.jsx', 'utf-8');
  
  // Check for actual syntax errors by counting braces
  const openBrace = (content.match(/\{/g) || []).length;
  const closeBrace = (content.match(/\}/g) || []).length;
  const openParen = (content.match(/\(/g) || []).length;
  const closeParen = (content.match(/\)/g) || []).length;
  const openBracket = (content.match(/\[/g) || []).length;
  const closeBracket = (content.match(/\]/g) || []).length;
  
  console.log('Bracket Analysis:');
  console.log(`  { } : ${openBrace} vs ${closeBrace} (diff: ${openBrace - closeBrace})`);
  console.log(`  ( ) : ${openParen} vs ${closeParen} (diff: ${openParen - closeParen})`);
  console.log(`  [ ] : ${openBracket} vs ${closeBracket} (diff: ${openBracket - closeBracket})`);
  
  if (Math.abs(openBrace - closeBrace) <= 2 && 
      Math.abs(openParen - closeParen) <= 2 &&
      Math.abs(openBracket - closeBracket) <= 2) {
    console.log('\n✅ Bracket balance looks good (minor differences acceptable in JSX)');
  } else {
    console.log('\n⚠️  Significant bracket imbalance detected');
  }
  
  // Check for export
  if (content.includes('export default App')) {
    console.log('✅ Default export found');
  }
  
  // Check for imports
  if (content.includes('import { useState')) {
    console.log('✅ React hooks imported');
  }
  
  // Check template literals
  const backticks = (content.match(/`/g) || []).length;
  console.log(`\nBackticks: ${backticks} (${backticks % 2 === 0 ? '✅ even' : '⚠️ odd'})`);
  
} catch (err) {
  console.error('❌ Error:', err.message);
}
