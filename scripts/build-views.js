/**
 * Static build: renders every views/*.ejs page to HTML in dist/ and copies
 * public/ alongside it, so the site can be deployed as plain static files
 * (Netlify / Vercel / any static host) while still using EJS partials.
 *
 * Usage: npm run build
 */
const fs = require('fs');
const path = require('path');
const ejs = require('ejs');

const ROOT = path.resolve(__dirname, '..');
const VIEWS_DIR = path.join(ROOT, 'views');
const PUBLIC_DIR = path.join(ROOT, 'public');
const OUT_DIR = path.join(ROOT, 'dist');

function listPages() {
    return fs
        .readdirSync(VIEWS_DIR)
        .filter((file) => file.endsWith('.ejs'))
        .sort();
}

async function build() {
    if (!fs.existsSync(VIEWS_DIR)) {
        throw new Error(`Missing views directory: ${VIEWS_DIR}`);
    }

    fs.rmSync(OUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const pages = listPages();

    for (const page of pages) {
        const source = path.join(VIEWS_DIR, page);
        const target = path.join(OUT_DIR, page.replace(/\.ejs$/, '.html'));

        // `filename` lets includes resolve relative to the view's own folder.
        const html = await ejs.renderFile(source, {}, { async: true });
        fs.writeFileSync(target, html, 'utf8');
        console.log(`  rendered views/${page} -> dist/${path.basename(target)}`);
    }

    if (fs.existsSync(PUBLIC_DIR)) {
        fs.cpSync(PUBLIC_DIR, OUT_DIR, { recursive: true });
        console.log('  copied public/ -> dist/');
    }

    console.log(`\nBuild complete: ${pages.length} page(s) in dist/`);
}

build().catch((error) => {
    console.error('\nBuild failed:');
    console.error(error.message);
    process.exit(1);
});
