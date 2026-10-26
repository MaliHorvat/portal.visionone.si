// Lokalni zagon VisionOne Field: node server.js  (brez DATABASE_URL uporabi SQLite v mapi data/)
import './src/tz.js';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from './src/handler.js';
import { VERSION } from './src/api.js';

const PORT = Number(process.env.PORT || 8090);
const webDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
http.createServer((req, res) => handle(req, res, { webDir })).listen(PORT, () => console.log(`[Field] VisionOne Field ${VERSION} posluša na :${PORT}`));
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
