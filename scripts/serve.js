/**
 * Static preview server for the production build (dist/).
 *
 * Mirrors what Netlify and Vercel do with the same artefact, so the build can
 * be walked through locally before deploying:
 *
 *   "/"             -> dist/index.html                (home page, always)
 *   "/index.html"   -> 301 "/"     ("/index", "/home" do the same)
 *   "/about"        -> 301 "/about.html"  (extensionless aliases)
 *   anything else   -> dist/404.html with a real HTTP 404
 *
 *   node scripts/serve.js [port]     # default 4173
 *   npm run serve
 *
 * Exported as a module so scripts/verify.js can start it on an ephemeral port.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', 'dist');

const HOME_ALIASES = ['/index.html', '/index', '/home'];

const PAGE_ALIASES = {
    '/about': '/about.html',
    '/works': '/works.html',
    '/linefollower': '/linefollower.html',
    '/loading': '/loading.html'
};

const TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
};

function ensureBuilt() {
    if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
        throw new Error('dist/index.html is missing — run "npm run build" first.');
    }
}

function normalize(pathname) {
    // Collapse a trailing slash ("/about/" behaves like "/about").
    return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

function send(res, status, headers, body) {
    res.writeHead(status, headers);
    if (body) {
        res.end(body);
    } else {
        res.end();
    }
}

function redirect(res, location) {
    send(res, 301, { Location: location, 'Content-Type': 'text/plain; charset=utf-8' }, 'Moved Permanently: ' + location + '\n');
}

function serveFile(res, filePath, status) {
    fs.readFile(filePath, function (error, data) {
        if (error) {
            notFound(res);
            return;
        }
        send(
            res,
            status || 200,
            {
                'Content-Type': TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
                'Cache-Control': 'no-cache'
            },
            data
        );
    });
}

function notFound(res) {
    const page = path.join(ROOT, '404.html');
    fs.readFile(page, function (error, data) {
        if (error) {
            send(res, 404, { 'Content-Type': 'text/plain; charset=utf-8' }, '404 Not Found\n');
            return;
        }
        send(res, 404, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-cache' }, data);
    });
}

function handler(req, res) {
    let pathname;
    try {
        pathname = normalize(decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    } catch (error) {
        send(res, 400, { 'Content-Type': 'text/plain; charset=utf-8' }, '400 Bad Request\n');
        return;
    }

    if (HOME_ALIASES.indexOf(pathname) !== -1) {
        redirect(res, '/');
        return;
    }

    if (PAGE_ALIASES[pathname]) {
        redirect(res, PAGE_ALIASES[pathname]);
        return;
    }

    if (pathname.indexOf('..') !== -1) {
        notFound(res);
        return;
    }

    const target = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);

    if (!target.startsWith(ROOT)) {
        notFound(res);
        return;
    }

    fs.stat(target, function (error, stats) {
        if (!error && stats.isFile()) {
            serveFile(res, target);
            return;
        }

        // Extensionless request: "/about" -> "/about.html"
        if (!path.extname(target)) {
            const asHtml = target + '.html';
            fs.stat(asHtml, function (htmlError, htmlStats) {
                if (!htmlError && htmlStats.isFile()) {
                    redirect(res, pathname + '.html');
                } else {
                    notFound(res);
                }
            });
            return;
        }

        notFound(res);
    });
}

function createServer() {
    ensureBuilt();
    return http.createServer(handler);
}

if (require.main === module) {
    const port = Number(process.argv[2]) || Number(process.env.PORT) || 4173;
    createServer().listen(port, function () {
        console.log('Serving dist/ at http://localhost:' + port + '/');
    });
}

module.exports = { createServer, ROOT };
