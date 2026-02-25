// Stan's World — Local Dev Server
// Serves your site files AND lets the editor save directly to index.html
//
// SETUP (one time):
//   Make sure Node.js is installed: https://nodejs.org
//   Then just run:  node server.js
//
// The editor will open at: http://localhost:3000/editor.html
// Your site is also live at: http://localhost:3000

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT    = 3000;
const FOLDER  = __dirname; // same folder as this script

const MIME = {
  '.html': 'text/html',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  // ── CORS headers so editor can call the API ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── API: POST /save-projects ──
  // Body: { projects: [...] }
  // Reads index.html, replaces the PROJECTS array, writes it back
  if (req.method === 'POST' && pathname === '/save-projects') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { projects } = JSON.parse(body);
        const indexPath = path.join(FOLDER, 'index.html');

        if (!fs.existsSync(indexPath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'index.html not found in ' + FOLDER }));
          return;
        }

        let html = fs.readFileSync(indexPath, 'utf8');
        const settings = JSON.parse(body).settings || {};

        // Replace PROJECTS array
        const newArray = JSON.stringify(projects, null, 2);
        let replaced = html.replace(
          /const PROJECTS\s*=\s*\[[\s\S]*?\];/,
          `const PROJECTS = ${newArray};`
        );

        if (replaced === html) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Could not find "const PROJECTS = [...]" in index.html — make sure that line exists.' }));
          return;
        }

        // Replace background image filename if provided
        if (settings.bg) {
          replaced = replaced.replace(
            /url\(['"]?Desk_Image\.png['"]?\)/g,
            `url('${settings.bg}')`
          );
        }

        // Replace page title if provided
        if (settings.title) {
          replaced = replaced.replace(
            /<title>.*?<\/title>/,
            `<title>${settings.title}</title>`
          );
        }

        fs.writeFileSync(indexPath, replaced, 'utf8');
        console.log(`[${new Date().toLocaleTimeString()}] Saved ${projects.length} project(s) to index.html`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, count: projects.length }));

      } catch (err) {
        console.error('Save error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // ── SERVE STATIC FILES ──
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(FOLDER, filePath);

  // Security: don't serve files outside the folder
  if (!filePath.startsWith(FOLDER)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + pathname);
    return;
  }

  const ext      = path.extname(filePath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': mimeType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log('');
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║       Stan's World — Local Server        ║");
  console.log("  ╠══════════════════════════════════════════╣");
  console.log(`  ║  Site:    http://localhost:${PORT}           ║`);
  console.log(`  ║  Editor:  http://localhost:${PORT}/editor.html ║`);
  console.log("  ║                                          ║");
  console.log("  ║  Press Ctrl+C to stop                   ║");
  console.log("  ╚══════════════════════════════════════════╝");
  console.log('');
});
