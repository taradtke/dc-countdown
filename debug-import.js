const fs = require('fs');
const csv = require('csv-parser');

console.log('Testing CSV parsing...\n');

const results = [];

fs.createReadStream('/usr/src/app/Servers.csv')
  .pipe(csv({
    mapHeaders: ({ header }) => {
      const cleaned = header.replace(/^\uFEFF/, '').trim();
      console.log(`Header: "${header}" -> "${cleaned}" (length: ${header.length} -> ${cleaned.length})`);
      return cleaned;
    }
  }))
  .on('data', (data) => {
    if (results.length === 0) {
      console.log('\nFirst row data:');
      console.log('Full object:', data);
      console.log('\nKeys:', Object.keys(data));
      console.log('\nValues by key:');
      Object.keys(data).forEach(key => {
        console.log(`  "${key}": "${data[key]}"`);
      });
      
      console.log('\nChecking Customer field:');
      console.log('  data["Customer"]:', data['Customer']);
      console.log('  data.Customer:', data.Customer);
      
      // Check for any hidden characters
      const customerKey = Object.keys(data).find(k => k.includes('Customer'));
      if (customerKey) {
        console.log(`  Found customer key: "${customerKey}"`);
        console.log(`  Key char codes:`, [...customerKey].map(c => c.charCodeAt(0)));
        console.log(`  Value: "${data[customerKey]}"`);
      }
    }
    results.push(data);
  })
  .on('end', () => {
    console.log(`\nTotal rows parsed: ${results.length}`);
  });