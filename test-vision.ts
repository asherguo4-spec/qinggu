import http from 'http';

const base64Invalid = "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=\n\n";

const data = JSON.stringify({
  model: "ep-20260606105123-vgfgq",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "what is this?" },
        { type: "image_url", image_url: { url: base64Invalid } }
      ]
    }
  ]
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
