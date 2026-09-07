const http = require('http');
const fs = require('fs');
const path = require('path');
const { removeBackground } = require('@imgly/background-removal-node');

const PORT = process.env.PORT || 4173;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const server = http.createServer(async (req, res) => {
  // Handle API segmentation endpoint
  if (req.url === '/api/segment' && req.method === 'POST') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', async () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8');
        const { image } = JSON.parse(bodyStr);

        if (!image) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ success: false, error: 'Image is required' }));
        }

        let input = image;
        if (image.startsWith('data:')) {
          const matches = image.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
          if (!matches || !matches[2]) {
            throw new Error('Invalid base64 data URL');
          }
          const mime = matches[1] || 'image/jpeg';
          const buffer = Buffer.from(matches[2], 'base64');
          input = new Blob([buffer], { type: mime });
        }

        const blob = await removeBackground(input, {
          model: 'medium',
          output: {
            format: 'image/png',
            quality: 0.98,
          },
        });

        const buffer = Buffer.from(await blob.arrayBuffer());
        const cutoutDataUrl = `data:image/png;base64,${buffer.toString('base64')}`;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: true, cutoutDataUrl }));
      } catch (err) {
        console.error('API Error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: err.message || 'Segmentation failed' }));
      }
    });
    return;
  }

  // Static file serving for SPA
  let reqPath = req.url.split('?')[0];
  if (reqPath.startsWith('/kalaconnect-ai-new')) {
    reqPath = reqPath.replace(/^\/kalaconnect-ai-new/, '') || '/';
  } else if (reqPath.startsWith('/kalaconnect-ai-v2')) {
    reqPath = reqPath.replace(/^\/kalaconnect-ai-v2/, '') || '/';
  } else if (reqPath.startsWith('/kalaconnect-ai')) {
    reqPath = reqPath.replace(/^\/kalaconnect-ai/, '') || '/';
  } else if (reqPath.startsWith('/handcraft')) {
    reqPath = reqPath.replace(/^\/handcraft/, '') || '/';
  }

  let filePath;
  if (reqPath.includes('/assets/')) {
    const assetPart = reqPath.slice(reqPath.lastIndexOf('/assets/') + '/assets/'.length);
    filePath = path.join(DIST_DIR, 'assets', assetPart);
  } else {
    filePath = path.join(DIST_DIR, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const baseFile = path.join(DIST_DIR, path.basename(reqPath));
      if (fs.existsSync(baseFile) && !fs.statSync(baseFile).isDirectory()) {
        filePath = baseFile;
      } else {
        filePath = path.join(DIST_DIR, 'index.html');
      }
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.statusCode = 404;
      return res.end('Not Found');
    }
    res.setHeader('Content-Type', contentType);
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`KalaConnect AI Production Server running at http://localhost:${PORT}/`);
});
