const fs = require('fs');
const FormData = require('form-data');
const http = require('http');

const form = new FormData();
form.append('csv', fs.createReadStream('/usr/src/app/Servers.csv'));

const req = http.request({
  method: 'POST',
  host: 'localhost',
  port: 3000,
  path: '/api/servers/import',
  headers: form.getHeaders()
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', data);
    process.exit(0);
  });
});

form.pipe(req);

req.on('error', (err) => {
  console.error('Request error:', err);
});