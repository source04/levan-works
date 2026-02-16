// Simple browser test using Node.js
const http = require('http');

console.log('Testing http://localhost:8080/map/\n');

// Test 1: Check if server is responding
http.get('http://localhost:8080/map/', (res) => {
  console.log(`✓ Server responded with status: ${res.statusCode}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== Checking HTML content ===');
    
    // Check for key elements
    const checks = [
      { name: 'initialNodes array', pattern: /let initialNodes = \[/ },
      { name: 'initialLinks array', pattern: /let initialLinks = \[/ },
      { name: 'd3 library script', pattern: /d3@7/ },
      { name: 'webcola library script', pattern: /webcola/ },
      { name: 'map.js script', pattern: /map\.js/ },
      { name: 'map__vis container', pattern: /class="map__vis"/ },
      { name: 'Design node', pattern: /name: "Design"/ },
      { name: 'Roland Barthes node', pattern: /name: "Roland Barthes"/ },
      { name: 'Poststructuralism node', pattern: /name: "Poststructuralism"/ },
    ];
    
    checks.forEach(check => {
      if (check.pattern.test(data)) {
        console.log(`✓ ${check.name} found`);
      } else {
        console.log(`✗ ${check.name} NOT found`);
      }
    });
    
    // Count nodes and links
    const nodesMatch = data.match(/\{ id: "[^"]+", name: "[^"]+"/g);
    const linksMatch = data.match(/\{ source: "[^"]+", target: "[^"]+"/g);
    
    console.log(`\n=== Data Summary ===`);
    console.log(`Nodes defined: ${nodesMatch ? nodesMatch.length : 0}`);
    console.log(`Links defined: ${linksMatch ? linksMatch.length : 0}`);
    
    console.log('\n=== Manual Testing Required ===');
    console.log('Please open http://localhost:8080/map/ in your browser to verify:');
    console.log('1. The visualization renders correctly');
    console.log('2. Nodes are visible with labels');
    console.log('3. Links connect the nodes');
    console.log('4. Different node styles are applied (regular, movement, person)');
    console.log('5. Hover interactions work');
    console.log('6. No JavaScript errors in the browser console');
  });
}).on('error', (err) => {
  console.error(`✗ Error: ${err.message}`);
  console.log('\nMake sure the server is running on port 8080');
});
