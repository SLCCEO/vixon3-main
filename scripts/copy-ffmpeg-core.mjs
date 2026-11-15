import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const source = resolve('node_modules/@ffmpeg/core/dist/esm');
const destination = resolve('public/ffmpeg');
mkdirSync(destination, { recursive: true });

for (const filename of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  copyFileSync(resolve(source, filename), resolve(destination, filename));
}
