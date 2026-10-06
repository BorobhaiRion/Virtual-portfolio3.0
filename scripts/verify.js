/**
 * Regression test for the built site (dist/).
 *
 * Fetches every route over HTTP and checks that
 *   - "/" is the home page, and /index, /home and /index.html resolve to it,
 *   - every page answers 200 and unknown URLs answer 404 with the custom page,
 *   - the key text of the ORIGINAL site is still present, in the original order,
 *   - heading structure (one h1 per page), image alt text and internal links,
 *   - the animation/overlay CSS can never hide content or block pointer events.
 *
 *   npm run build && npm run verify
 *
 * Options:
 *   --base-url=https://example.com   test a deployed site instead of dist/
 *   --port=4173                      port for the temporary local server
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

/* ------------------------------------------------------------------ content */

/** Text that must exist on each page, in the order it must appear. */
const EXPECTED = {
    '/': {
        h1: 1,
        title: 'Virtual-portfolio3.0',
        texts: [
            'Md Foize Khan Rion',
            'I am a passionate and dedicated developer eager to bring innovative solutions to the tech industry.',
            'My goal is to leverage my technical skills, creativity, and PR knowledge to deliver exceptional results and grow as a developer.',
            'Thank you',
            'Skills & Technologies',
            '/assets/js.png',
            '/assets/message.png',
            '/assets/c.png',
            '/assets/github.png',
            '/assets/word.png',
            '/assets/excel.png',
            '/assets/java.png',
            '/assets/python.png',
            '/assets/css-3.png',
            '/assets/html-5.png',
            'Contact Information',
            '+880 1790799857',
            'mailto:rion801@gmail.com',
            'rion801@gmail.com',
            'https://borobhairion.github.io/photons--/',
            'Photography/Borobhairion',
            'Bashundhara R/A, Dhaka',
            'linkedin.com/in/rionkhan801',
            'github.com/BorobhaiRion'
        ]
    },
    '/about.html': {
        h1: 1,
        title: 'About Me - Md Foize Khan Rion',
        texts: [
            'About Me',
            'Personal Statement',
            'Education',
            'Bachelor of Computer Science',
            'American International University-Bangladesh',
            'Cumulative GPA: 3.71/4.00',
            'Hamidpur Al-Hera college',
            'Cumulative GPA: 4.98/5.00',
            'Jashore zilla School',
            'Cumulative GPA: 4.72/5.00',
            'Experience',
            'Junior Software Engineer — SUVASTU PROPERTIES',
            '3 Months (Ongoing, until December 2026)',
            'Volunteer & Lead Photojournalist — IEEE AIUB Student Branch',
            'Technical Skills',
            'Windows 7/10/11, Microsoft Office 2003/2007/2010/2013.',
            'MY SQL, ORACLE.',
            'WEB DEVELOPMENT',
            'SOFTWARE DEVELOPMENT.',
            'Machine Learning & AI: model training fundamentals, sentiment analysis, NLP concepts, algorithm design',
            'Database Management Systems: Oracle 10g, SQL, Supabase',
            'Web Development: MVC (PHP projects)',
            'Object-Oriented Programming in Java',
            'User Interface Design in Java and C# (.NET)',
            'Understanding of basic electronics',
            'Comfortable in C++, Python',
            'Software development process and testing',
            'Photography',
            'Specialized',
            'Trained in applying machine learning concepts',
            'Communication &amp; Professional Skills',
            'Fluent in Bangla and English',
            'Skilled in public speaking and multimedia presentation',
            'Have the ability to work independently as well as in a team.',
            'Have the ability to work under pressure/any circumstances',
            'Additional Courses',
            'IT Essentials — Cisco',
            'Algorithms, Part I — Coursera',
            'Reference',
            'Will be provided upon request.'
        ]
    },
    '/works.html': {
        h1: 1,
        title: 'My Works',
        texts: [
            'My Works',
            '/assets/game.png',
            'https://borobhaiRion.itch.io/beginner-worrior',
            'Beginner Warrior (Game)',
            '/assets/photons.png',
            'https://borobhaiRion.github.io/photons--/',
            'Photons (Photography Website)',
            '/assets/projects/line-follower.jpeg',
            '/linefollower.html',
            'Arduino Line Follower Robot',
            'https://borobhairion.github.io/Virtual-portfolio3.0/works.html',
            'Developed a responsive personal portfolio website showcasing projects, skills, and experience.',
            'https://github.com/BorobhaiRion/Webtech-Group-4',
            'Built an interactive university e-commerce website using PHP, SQL, JavaScript, HTML, and CSS, applying MVC architecture.',
            'https://zenggcafe.netlify.app',
            'Developed a cafe management system with automated pricing and menu management, customer feedback integration, and a custom React/Supabase dashboard.'
        ]
    },
    '/linefollower.html': {
        h1: 1,
        title: 'Arduino Line Follower Robot - Md Foize Khan Rion',
        texts: [
            'Arduino Line Follower Robot',
            'Project Overview',
            'An autonomous ground robot built on Arduino UNO that follows a black line using 3 IR sensors',
            'Project Plan &amp; Logic',
            '/assets/projects/line-follower-plan.png',
            'Hardware',
            'Arduino UNO',
            'L298N Motor Driver',
            '3-channel IR Sensor Array',
            'DC Gear Motors',
            'Key Concepts',
            'Proportional control',
            'PWM motor speed',
            'Digital sensor reading',
            'Autonomous navigation',
            'Source Code',
            'int baseSpeed = 45;',
            'float Kp = 40;',
            'void stopMotors()'
        ]
    },
    '/404.html': {
        h1: 1,
        title: '404 Not Found',
        texts: [
            'Not Found',
            'The requested URL was not found on this server.',
            'Return to the home page'
        ]
    },
    '/loading.html': {
        h1: 0,
        title: 'Loading...',
        texts: ['id="loader"']
    }
};

/** Home-page aliases that must land on "/". */
const HOME_ALIASES = ['/index', '/home', '/index.html'];

/** Extensionless aliases that must land on their .html canonical URL. */
const PAGE_ALIASES = {
    '/about': '/about.html',
    '/works': '/works.html',
    '/linefollower': '/linefollower.html',
    '/loading': '/loading.html'
};

/* ------------------------------------------------------------------ helpers */

const results = [];

function check(page, name, ok, detail) {
    results.push({ page: page, name: name, ok: !!ok, detail: detail || '' });
    return !!ok;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function hasText(html, text) {
    return html.indexOf(text) !== -1 || html.indexOf(escapeHtml(text)) !== -1;
}

function positionOf(html, text) {
    const raw = html.indexOf(text);
    const escaped = html.indexOf(escapeHtml(text));
    if (raw === -1) return escaped;
    if (escaped === -1) return raw;
    return Math.min(raw, escaped);
}

function request(url, redirectsLeft) {
    return new Promise(function (resolve, reject) {
        const req = http.get(url, function (res) {
            const status = res.statusCode;
            if (status >= 300 && status < 400 && res.headers.location) {
                res.resume();
                if (redirectsLeft <= 0) {
                    resolve({ status: status, location: res.headers.location, body: '' });
                    return;
                }
                const next = new URL(res.headers.location, url).toString();
                request(next, redirectsLeft - 1).then(resolve, reject);
                return;
            }
            const chunks = [];
            res.on('data', function (chunk) { chunks.push(chunk); });
            res.on('end', function () {
                resolve({
                    status: status,
                    location: null,
                    body: Buffer.concat(chunks).toString('utf8')
                });
            });
        });
        req.on('error', reject);
        req.setTimeout(10000, function () {
            req.destroy(new Error('timeout'));
        });
    });
}

function statusOf(url) {
    return new Promise(function (resolve, reject) {
        const req = http.get(url, function (res) {
            res.resume();
            res.on('end', function () { resolve(res.statusCode); });
        });
        req.on('error', reject);
        req.setTimeout(10000, function () { req.destroy(new Error('timeout')); });
    });
}

function ruleBlock(css, selector) {
    const at = css.indexOf(selector);
    if (at === -1) return null;
    const open = css.indexOf('{', at);
    if (open === -1) return null;
    const close = css.indexOf('}', open);
    return close === -1 ? null : css.slice(open + 1, close);
}

function extractAttribute(html, attribute) {
    const values = [];
    const re = new RegExp(attribute + '="([^"]*)"', 'g');
    let match;
    while ((match = re.exec(html)) !== null) {
        values.push(match[1]);
    }
    return values;
}

/* -------------------------------------------------------------------- checks */

async function verifyPage(base, route) {
    const spec = EXPECTED[route];
    const res = await request(base + route, 5);
    const html = res.body;

    check(route, 'HTTP 200', res.status === 200, 'got ' + res.status);
    check(route, 'title', hasText(html, '<title>' + spec.title + '</title>'), spec.title);

    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    check(route, 'h1 count = ' + spec.h1, h1Count === spec.h1, 'found ' + h1Count);

    const missing = spec.texts.filter(function (text) { return !hasText(html, text); });
    check(
        route,
        'content items (' + spec.texts.length + ')',
        missing.length === 0,
        missing.length ? 'missing: ' + missing.join(' | ') : ''
    );

    // Section order: the markers must form a subsequence of the document, i.e.
    // each one is found at or after the previous one. Repeated markers (an
    // image that also appears in data-preview, a name that also appears in the
    // meta description) are matched at their next occurrence, which is how a
    // reader actually meets them.
    let inOrder = true;
    let previous = -1;
    let orderedDetail = '';
    spec.texts.forEach(function (text) {
        if (!inOrder) return;
        const raw = positionOf(html, text);
        if (raw === -1) return; // already reported as missing
        let at = -1;
        const from = previous + 1;
        const direct = html.indexOf(text, from);
        const escaped = html.indexOf(escapeHtml(text), from);
        if (direct !== -1 && escaped !== -1) at = Math.min(direct, escaped);
        else at = direct !== -1 ? direct : escaped;
        if (at === -1) {
            inOrder = false;
            orderedDetail = '"' + text + '" appears before the previous section';
        } else {
            previous = at;
        }
    });
    check(route, 'section order', inOrder, orderedDetail);

    // Images: every one needs a non-empty alt attribute.
    const imgs = html.match(/<img[^>]*>/g) || [];
    const noAlt = imgs.filter(function (tag) { return !/\salt="[^"]+"/.test(tag); });
    check(route, 'image alt text (' + imgs.length + ' images)', noAlt.length === 0, noAlt.join(' '));

    // No mojibake in the shipped HTML.
    check(route, 'encoding', !/ï¿½|â€|Ã./.test(html));

    // Internal links and assets must resolve.
    const urls = extractAttribute(html, 'href').concat(extractAttribute(html, 'src'));
    const internal = urls.filter(function (url) {
        return url.charAt(0) === '/' && url.indexOf('//') !== 0;
    });
    const broken = [];
    for (const url of internal) {
        const clean = url.split('#')[0].split('?')[0];
        if (!clean) continue;
        const target = await request(base + clean, 5);
        if (target.status >= 400) broken.push(url + ' -> ' + target.status);
    }
    check(route, 'internal links (' + internal.length + ')', broken.length === 0, broken.join(', '));
}

async function verifyHomeIsFirst(base) {
    const res = await request(base + '/', 5);
    check('/', 'opens the home page',
        res.status === 200 && hasText(res.body, 'Md Foize Khan Rion'),
        'status ' + res.status);

    check('/', 'home page starts at the top (scroll restoration)',
        /scrollRestoration/.test(res.body) && /history\.scrollRestoration\s*=\s*"manual"|history\.scrollRestoration\s*=\s*'manual'/.test(res.body));

    for (const alias of HOME_ALIASES) {
        const raw = await statusOf(base + alias);
        const followed = await request(base + alias, 5);
        check(alias, 'resolves to home',
            (raw === 301 || raw === 308 || raw === 200) &&
            followed.status === 200 &&
            hasText(followed.body, 'Md Foize Khan Rion'),
            'status ' + raw + ' -> ' + followed.status);
    }

    for (const from of Object.keys(PAGE_ALIASES)) {
        const followed = await request(base + from, 5);
        check(from, 'resolves to ' + PAGE_ALIASES[from],
            followed.status === 200 && hasText(followed.body, EXPECTED[PAGE_ALIASES[from]].texts[0]),
            'status ' + followed.status);
    }
}

async function verifyNotFound(base) {
    const res = await request(base + '/definitely-not-a-page', 5);
    check('/definitely-not-a-page', 'HTTP 404', res.status === 404, 'got ' + res.status);
    check('/definitely-not-a-page', 'custom 404 content',
        hasText(res.body, 'The requested URL was not found on this server.'));
    check('/definitely-not-a-page', '404 is not the home page',
        !hasText(res.body, 'I am a passionate and dedicated developer'));
}

function verifyCss() {
    const cssPath = path.join(DIST, 'css', 'site.css');
    if (!fs.existsSync(cssPath)) {
        check('css', 'dist/css/site.css exists', false, 'run npm run build');
        return;
    }
    const css = fs.readFileSync(cssPath, 'utf8');

    ['#preloader', '.fx-layer', '.cursor-dot', '.hover-preview'].forEach(function (selector) {
        const block = ruleBlock(css, selector);
        check('css', selector + ' never blocks pointer events',
            !!block && /pointer-events:\s*none/.test(block),
            block === null ? 'rule not found' : '');
    });

    // Content is only hidden once JavaScript arms the reveals, and the armed
    // state is undone again for reduced-motion visitors.
    const armed = ruleBlock(css, '.reveals-armed .reveal') || '';
    check('css', 'reveals hidden only when armed by JS', /opacity:\s*0/.test(armed));
    check('css', 'reduced-motion override present', /prefers-reduced-motion:\s*reduce/.test(css));
    check('css', 'overlay layer present', /fx-layer/.test(css));
}

async function main() {
    const args = process.argv.slice(2);
    const baseUrlArg = args.find(function (a) { return a.indexOf('--base-url=') === 0; });
    const portArg = args.find(function (a) { return a.indexOf('--port=') === 0; });
    const port = portArg ? Number(portArg.split('=')[1]) : 4173;

    let baseUrl = baseUrlArg ? baseUrlArg.slice('--base-url='.length).replace(/\/$/, '') : null;
    let server = null;

    if (!baseUrl) {
        try {
            const { createServer } = require('./serve');
            server = createServer();
            await new Promise(function (resolve) { server.listen(port, resolve); });
            baseUrl = 'http://127.0.0.1:' + port;
        } catch (error) {
            console.error('Could not start the local server: ' + error.message);
            process.exit(1);
        }
    }

    console.log('Verifying ' + baseUrl + '\n');

    verifyCss();

    await verifyHomeIsFirst(baseUrl);
    await verifyNotFound(baseUrl);

    for (const route of Object.keys(EXPECTED)) {
        await verifyPage(baseUrl, route);
    }

    if (server) {
        await new Promise(function (resolve) { server.close(resolve); });
    }

    /* ---------------------------------------------------------------- report */

    const pages = [];
    results.forEach(function (r) {
        if (pages.indexOf(r.page) === -1) pages.push(r.page);
    });

    let failures = 0;
    const width = Math.max.apply(null, pages.map(function (p) { return p.length; }));

    console.log('| ' + 'page'.padEnd(width) + ' | checks | passed | status  |');
    console.log('|' + '-'.repeat(width + 2) + '|--------|--------|---------|');

    pages.forEach(function (page) {
        const rows = results.filter(function (r) { return r.page === page; });
        const passed = rows.filter(function (r) { return r.ok; }).length;
        const failed = rows.length - passed;
        failures += failed;
        console.log(
            '| ' + page.padEnd(width) + ' | ' +
            String(rows.length).padStart(6) + ' | ' +
            String(passed).padStart(6) + ' | ' +
            (failed ? 'FAIL (' + failed + ')' : 'OK').padEnd(7) + ' |'
        );
    });

    console.log('');

    results.filter(function (r) { return !r.ok; }).forEach(function (r) {
        console.log('FAIL  ' + r.page + ' :: ' + r.name + (r.detail ? ' — ' + r.detail : ''));
    });

    if (failures) {
        console.log('\n' + failures + ' check(s) failed.');
        process.exit(1);
    }

    console.log('All ' + results.length + ' checks passed.');
}

main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
