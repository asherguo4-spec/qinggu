import http from 'http';

const data = JSON.stringify({
  model: "ep-20260606104808-xx4sf",
  messages: [{role: "user", content: " "}] // what if it's just space?
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/ark-completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', e => console.error(e));
req.write(data);
req.end();
