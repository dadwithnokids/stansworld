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

// ── applyFixes: runs after every save ──────────────────────────────────────
function applyFixes(html) {

  // 1. Fix hotspot positions — editor strips % signs
  const marker = html.indexOf('const PROJECTS');
  if (marker !== -1) {
    const open = html.indexOf('[', marker);
    let depth = 0, close = -1;
    for (let i = open; i < html.length; i++) {
      if (html[i] === '[') depth++;
      else if (html[i] === ']') { depth--; if (depth === 0) { close = i; break; } }
    }
    if (close !== -1) {
      let arr = html.slice(open, close + 1);
      arr = arr.replace(/"(left|top|width|height)": (\d+(?:\.\d+)?)(?=[,\n\r}])/g,
        (_, k, v) => `"${k}": "${v}%"`);
      html = html.slice(0, open) + arr + html.slice(close + 1);
    }
  }

  // 2. Strip ALL injected blocks before re-injecting

  // Strip AIM XP CSS
  while (html.includes('/* AIM XP */')) {
    const i = html.indexOf('/* AIM XP */');
    const end = html.indexOf('</style>', i);
    if (end === -1) break;
    html = html.slice(0, i) + html.slice(end);
  }

  // Strip AIM HTML block
  while (html.includes('<!-- AIM -->')) {
    const i = html.indexOf('<!-- AIM -->');
    const divStart = html.indexOf('<div id="lb-overlay">', i);
    if (divStart === -1) break;
    const endMarker = html.indexOf('</div>\n</div>', divStart);
    if (endMarker === -1) break;
    const blockEnd = endMarker + '</div>\n</div>'.length;
    html = html.slice(0, i) + html.slice(blockEnd);
  }

  // Strip AIM JS block
  while (html.includes('function lbClose')) {
    const i = html.indexOf('function lbClose');
    const s = html.lastIndexOf('<script>', i);
    const e = html.indexOf('</script>', i) + 9;
    if (s === -1 || e < 9) break;
    html = html.slice(0, s) + html.slice(e);
  }

  // Strip wiggle block
  while (html.includes("dataset.project!=='wcj-project'")) {
    const i = html.indexOf("dataset.project!=='wcj-project'");
    const s = html.lastIndexOf('<script>', i);
    const e = html.indexOf('</script>', i) + 9;
    if (s === -1 || e < 9) break;
    html = html.slice(0, s) + html.slice(e);
  }

  // 3. Re-inject AIM CSS
  const AIM_CSS = `
  /* AIM XP */
  .photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:10px 0 0 0;}
  .photo-grid .pg-item{aspect-ratio:1/1;overflow:hidden;cursor:none !important;border:1px solid var(--mac-dark);background:#111;}
  .photo-grid .pg-item img{width:100%;height:100%;object-fit:cover;}
  #lb-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;}
  #lb-overlay.open{display:flex;}
  #lb-overlay *{cursor:none !important;}
  #lb-window{width:660px;background:#d4d0c8;border:2px solid #000;box-shadow:4px 4px 14px rgba(0,0,0,0.7);font-family:'Tahoma',Arial,sans-serif;font-size:11px;}
  #lb-titlebar{background:linear-gradient(to bottom,#0a246a,#3a6ea5 50%,#0a246a);padding:3px 5px;display:flex;align-items:center;justify-content:space-between;height:26px;}
  #lb-titlebar-left{display:flex;align-items:center;gap:5px;color:#fff;font-weight:bold;font-size:12px;text-shadow:1px 1px 2px rgba(0,0,0,0.5);white-space:nowrap;}
  #lb-titlebar-btns{display:flex;gap:2px;flex-shrink:0;}
  .lb-tbtn{width:21px;height:19px;background:linear-gradient(to bottom,#e8e8e8,#c8c8c8);border:1px solid #4a4a4a;border-top-color:#fff;border-left-color:#fff;font-size:11px;color:#000;display:flex;align-items:center;justify-content:center;font-weight:bold;}
  #lb-x{background:linear-gradient(to bottom,#e06060,#b02020);color:#fff;border-color:#800000;}
  #lb-x:hover{background:linear-gradient(to bottom,#ff8080,#cc2020);}
  #lb-menubar{background:#d4d0c8;border-bottom:1px solid #a0a0a0;padding:1px 4px;display:flex;align-items:center;justify-content:space-between;}
  #lb-menu-l{display:flex;}
  #lb-menu-l span{padding:2px 7px;}
  #lb-menu-l span:hover{background:#0a246a;color:#fff;}
  #lb-warnlevel{font-size:10px;color:#555;padding-right:6px;}
  #lb-buddy{background:#fff;border:1px solid #b0b0b0;margin:4px;padding:5px 7px;display:flex;align-items:center;gap:8px;}
  #lb-buddy-icon{width:32px;height:32px;flex-shrink:0;background:#ffdd00;border:1px solid #c0a000;display:flex;align-items:center;justify-content:center;font-size:20px;}
  #lb-buddy-name{font-weight:bold;color:#00008b;font-size:12px;}
  #lb-photo-wrap{background:#111;border:2px solid #808080;border-top-color:#404040;border-left-color:#404040;margin:0 4px 4px 4px;height:400px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;}
  #lb-photo{max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;}
  .lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(212,208,200,0.9);border:1px solid #808080;border-top-color:#fff;border-left-color:#fff;width:28px;height:44px;font-size:20px;display:flex;align-items:center;justify-content:center;color:#000;z-index:2;font-weight:bold;}
  .lb-nav:hover{background:#b8b4ac;}
  #lb-nav-l{left:4px;}#lb-nav-r{right:4px;}
  #lb-toolbar{background:#d4d0c8;border-top:1px solid #a0a0a0;padding:4px 6px;display:flex;align-items:center;justify-content:space-between;}
  #lb-tools{display:flex;align-items:center;gap:1px;}
  .lb-tool{display:flex;flex-direction:column;align-items:center;background:none;border:1px solid transparent;padding:2px 5px;color:#000;font-size:9px;font-family:'Tahoma',Arial,sans-serif;min-width:40px;}
  .lb-tool:hover{background:#c0bdb5;border-color:#808080;}
  .lb-tool-icon{font-size:19px;line-height:1;margin-bottom:1px;}
  #lb-counter{font-size:10px;color:#555;margin-left:8px;align-self:center;}
  #lb-send{display:flex;flex-direction:column;align-items:center;background:#d4d0c8;border:2px solid #fff;border-right-color:#404040;border-bottom-color:#404040;padding:4px 14px;font-family:'Tahoma',Arial,sans-serif;}
  #lb-send-icon{font-size:22px;line-height:1;}
  #lb-send-label{font-size:10px;font-weight:bold;color:#000;margin-top:1px;white-space:nowrap;}
  #lb-send-bar{width:42px;height:4px;background:linear-gradient(to right,#cc0000,#ff5555);margin-top:2px;}`;
  html = html.replace('</style>', AIM_CSS + '\n</style>');

  // 4. Re-inject AIM HTML
  const AIM_HTML = `<!-- AIM -->
<div id="lb-overlay">
  <div id="lb-window">
    <div id="lb-titlebar">
      <div id="lb-titlebar-left">&#128172; Glens Instint Mesanger</div>
      <div id="lb-titlebar-btns">
        <button class="lb-tbtn">&#8211;</button>
        <button class="lb-tbtn">&#9633;</button>
        <button class="lb-tbtn" id="lb-x">&#x2715;</button>
      </div>
    </div>
    <div id="lb-menubar">
      <div id="lb-menu-l"><span>File</span><span>Edit</span><span>Insert</span><span>People</span></div>
      <span id="lb-warnlevel">Dadwithnokids's Warning Level: 0%</span>
    </div>
    <div id="lb-buddy">
      <div id="lb-buddy-icon">&#9728;</div>
      <div><div id="lb-buddy-name">Dadwithnokids</div></div>
    </div>
    <div id="lb-photo-wrap">
      <button class="lb-nav" id="lb-nav-l">&#8249;</button>
      <img id="lb-photo" src="" alt="">
      <button class="lb-nav" id="lb-nav-r">&#8250;</button>
    </div>
    <div id="lb-toolbar">
      <div id="lb-tools">
        <button class="lb-tool"><span class="lb-tool-icon">&#9889;</span>Warn</button>
        <button class="lb-tool"><span class="lb-tool-icon">&#128683;</span>Block</button>
        <button class="lb-tool"><span class="lb-tool-icon">&#127775;</span>Expressions</button>
        <button class="lb-tool"><span class="lb-tool-icon">&#127922;</span>Games</button>
        <button class="lb-tool"><span class="lb-tool-icon">&#128483;</span>Talk</button>
        <span id="lb-counter"></span>
      </div>
      <div id="lb-send">
        <span id="lb-send-icon">&#9992;&#65039;</span>
        <span id="lb-send-label">Send Message</span>
        <div id="lb-send-bar"></div>
      </div>
    </div>
  </div>
</div>`;
  html = html.replace('</body>', AIM_HTML + '\n</body>');

  // 5. Re-inject AIM JS
  const AIM_JS = `<script>
(function(){
  var imgs=[],idx=0;
  function show(){document.getElementById('lb-photo').src=imgs[idx];document.getElementById('lb-counter').textContent=(idx+1)+' / '+imgs.length;}
  function lbClose(){document.getElementById('lb-overlay').classList.remove('open');}
  document.addEventListener('click',function(e){
    var item=e.target.closest&&e.target.closest('.pg-item');
    if(!item)return;
    var all=Array.from(item.closest('.photo-grid').querySelectorAll('.pg-item'));
    imgs=all.map(function(el){return el.dataset.src;});idx=all.indexOf(item);
    show();document.getElementById('lb-overlay').classList.add('open');
  });
  window.addEventListener('DOMContentLoaded',function(){
    document.getElementById('lb-x').addEventListener('click',lbClose);
    document.getElementById('lb-overlay').addEventListener('click',function(e){if(e.target===this)lbClose();});
    document.getElementById('lb-window').addEventListener('click',function(e){e.stopPropagation();});
    document.getElementById('lb-nav-l').addEventListener('click',function(){idx=(idx-1+imgs.length)%imgs.length;show();});
    document.getElementById('lb-nav-r').addEventListener('click',function(){idx=(idx+1)%imgs.length;show();});
  });
  document.addEventListener('keydown',function(e){
    if(!document.getElementById('lb-overlay').classList.contains('open'))return;
    if(e.key==='Escape')lbClose();
    if(e.key==='ArrowLeft'){idx=(idx-1+imgs.length)%imgs.length;show();}
    if(e.key==='ArrowRight'){idx=(idx+1)%imgs.length;show();}
  });
})();
</script>`;
  html = html.replace('</body>', AIM_JS + '\n</body>');

  // 6. Re-inject wiggle
  html = html.replace('</body>', `<script>
document.addEventListener('mouseover',function(e){
  var hs=e.target.closest&&e.target.closest('.hotspot');
  if(!hs||hs.dataset.project!=='wcj-project')return;
  var gif=document.getElementById('tv-gif');
  if(!gif)return;
  gif.classList.remove('wiggling');void gif.offsetWidth;gif.classList.add('wiggling');
});
</script>
</body>`);

  return html;
}
// ── end applyFixes ──────────────────────────────────────────────────────────


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

        // Replace PROJECTS array — find it by bracket-counting so it
        // works whether the array is empty, single-line, or multi-line
        const newArray = JSON.stringify(projects, null, 2);
        const marker = html.indexOf('const PROJECTS');
        if (marker === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Could not find "const PROJECTS" in index.html.' }));
          return;
        }
        // Find the opening bracket
        const openBracket = html.indexOf('[', marker);
        if (openBracket === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Could not find opening [ after const PROJECTS.' }));
          return;
        }
        // Walk forward counting brackets to find the matching close
        let depth = 0, closeBracket = -1;
        for (let i = openBracket; i < html.length; i++) {
          if (html[i] === '[') depth++;
          else if (html[i] === ']') { depth--; if (depth === 0) { closeBracket = i; break; } }
        }
        if (closeBracket === -1) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'Could not find closing ] for PROJECTS array.' }));
          return;
        }
        // Replace from 'const PROJECTS' up to and including the closing ] and semicolon
        const endPos = html[closeBracket + 1] === ';' ? closeBracket + 2 : closeBracket + 1;
        let replaced = html.slice(0, marker) + `const PROJECTS = ${newArray};` + html.slice(endPos);

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

        replaced = applyFixes(replaced);

        fs.writeFileSync(indexPath, replaced, 'utf8');
        console.log(`[${new Date().toLocaleTimeString()}] Saved ${projects.length} project(s) to index.html (fixes applied)`);

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

  // ── API: POST /save-screens ──
  if (req.method === 'POST' && pathname === '/save-screens') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { screens } = JSON.parse(body);
        let html = fs.readFileSync(indexPath, 'utf8');

        // For each screen, replace its CSS block inside <style>
        for (const [id, s] of Object.entries(screens)) {
          const newCSS = `  #${id} {
    left: ${s.left}%; top: ${s.top}%;
    width: ${s.width}%; height: ${s.height}%;
    display: ${s.visible ? 'block' : 'none'};
    transform-origin: center center;
    transform:
      perspective(${s.persp}px)
      rotateX(${s.rotX}deg)
      rotateY(${s.rotY}deg)
      rotateZ(${s.rotZ}deg)
      skewX(${s.skewX}deg)
      skewY(${s.skewY}deg);
  }
  #${id} img, #${id} video {
    filter: brightness(${s.bright}) contrast(${s.contrast});
  }`;

          // Replace existing block between /* SC:id */ markers if present,
          // otherwise do a best-effort replace of the id block
          const marker = `/* SC:${id} */`;
          if (html.includes(marker)) {
            html = html.replace(
              new RegExp(`/\\* SC:${id} \\*/[\\s\\S]*?/\\* SC:${id}:END \\*/`),
              `${marker}\n${newCSS}\n  /* SC:${id}:END */`
            );
          } else {
            // Inject before closing </style> of the first style block
            html = html.replace(
              '</style>',
              `  ${marker}\n${newCSS}\n  /* SC:${id}:END */\n</style>`,
              // only first occurrence
            );
            // JS replace only replaces first by default — good
          }

          // Also update src if provided
          if (s.src) {
            html = html.replace(
              new RegExp(`(id="${id}"[^>]*>[\\s\\S]*?<(?:img|video)[^>]*src=")[^"]*"`),
              `$1${s.src}"`
            );
          }
        }

        fs.writeFileSync(indexPath, html, 'utf8');
        console.log(`[${new Date().toLocaleTimeString()}] Saved screen transforms to index.html`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        console.error('Save screens error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // ── API: GET /ping ──
  if (req.method === 'GET' && pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ── API: GET /list-files — returns image files in project folder ──
  if (req.method === 'GET' && pathname === '/list-files') {
    try {
      const allFiles = fs.readdirSync(FOLDER);
      const imgExts = /\.(png|jpg|jpeg|gif|webp|svg)$/i;
      const files = allFiles.filter(f => imgExts.test(f));
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ files }));
    } catch(err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ files: [], error: err.message }));
    }
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
