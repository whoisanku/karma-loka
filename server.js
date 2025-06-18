import express from 'express';
import fs from 'fs';
import path from 'path';

const distPath = path.join(process.cwd(), 'dist');
const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');

const app = express();

app.use(express.static(distPath));

app.get('/game/:roomId', (req, res) => {
  const { roomId } = req.params;
  const host = req.protocol + '://' + req.get('host');
  const frame = {
    version: 'next',
    imageUrl: `${host}/wooden_frame.png`,
    button: {
      title: 'Join Game',
      action: {
        type: 'launch_frame',
        url: `${host}/game/${roomId}`,
      },
    },
  };
  const metaTag = `<meta name="fc:frame" content='${JSON.stringify(frame)}' />`;
  const html = indexHtml.replace('</head>', `${metaTag}</head>`);
  res.send(html);
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 5173;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
