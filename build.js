import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production';

async function build() {
    try {
        await esbuild.build({
            entryPoints: [path.join(__dirname, 'client/src/app.js')],
            bundle: true,
            outfile: path.join(__dirname, 'client/dist/bundle.js'),
            format: 'esm',
            minify: isProd,
            sourcemap: true,
            target: 'es2020',
        });
        console.log('Build succeeded.');
    } catch (e) {
        console.error('Build failed:', e);
        process.exit(1);
    }
}

build();
