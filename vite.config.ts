import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { removeBackground } from '@imgly/background-removal-node';



function segmentationApiPlugin(): Plugin {
  const handler = async (req: any, res: any, next: any) => {
    if (req.url === '/api/segment' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const bodyStr = Buffer.concat(chunks).toString('utf-8');
          const { image } = JSON.parse(bodyStr);

          if (!image || typeof image !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: 'Invalid image input' }));
            return;
          }

          let input: any;
          if (image.startsWith('data:')) {
            const matches = image.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/);
            if (!matches || !matches[2]) {
              throw new Error('Invalid base64 data URL');
            }
            const mime = matches[1] || 'image/jpeg';
            const buffer = Buffer.from(matches[2], 'base64');
            input = new Blob([buffer], { type: mime });
          } else {
            input = image;
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
        } catch (err: any) {
          console.error('API segmentation error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err.message || 'Segmentation failed' }));
        }
      });
      return;
    }
    next();
  };

  return {
    name: 'segmentation-api-plugin',
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || './',
  plugins: [react(), segmentationApiPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: false,
  },
});
