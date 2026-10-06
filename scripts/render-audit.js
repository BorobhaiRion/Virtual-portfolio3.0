/**
 * Rendered-DOM audit — drives headless Chrome over CDP against the built site.
 *
 * What it checks, in the browser rather than over HTTP:
 *   - "/" opens at scrollY 0 with the preloader and fx layer inert
 *   - on-screen content is visible, off-screen reveals animate in on scroll
 *   - no horizontal overflow at 360 / 768 / 1280 / 1920 (fresh loads + resize)
 *   - prefers-reduced-motion and JS-disabled never hide content
 *   - light and dark themes: contrast (WCAG AA), images, content order
 *   - unknown URLs render the custom 404; aliases land on the right page
 *
 * Requires Chrome/Chromium; set CHROME_PATH if it is not in a known location.
 * Exits 0 with a SKIP notice when no browser is available.
 *
 *   node scripts/render-audit.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const HTTP_PORT = Number(process.env.AUDIT_PORT || 4180);
const CDP_PORT = Number(process.env.AUDIT_CDP_PORT || 9224);

const { createServer } = require('./serve.js');

const results = [];
function check(name, ok, detail) {
    results.push({ name, ok: !!ok, detail: detail || '' });
    console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (detail && !ok ? '  [' + detail + ']' : ''));
}

function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function findChrome() {
    const candidates = [
        process.env.CHROME_PATH,
        process.env.CHROME,
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser'
    ].filter(Boolean);
    return candidates.find(function (p) { return fs.existsSync(p); }) || null;
}

const PAGES = ['/', '/about.html', '/works.html', '/linefollower.html'];
const WIDTHS = [360, 768, 1280, 1920];

async function main() {
    const chromePath = findChrome();
    if (!chromePath) {
        console.log('RENDER AUDIT SKIPPED: no Chrome/Chromium found. Set CHROME_PATH to run it.');
        return;
    }

    const server = createServer();
    await new Promise(function (resolve) { server.listen(HTTP_PORT, resolve); });
    const base = 'http://127.0.0.1:' + HTTP_PORT;

    const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-audit-'));
    const chrome = spawn(chromePath, [
        '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
        '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + userData,
        '--remote-allow-origins=*', '--window-size=1280,900', 'about:blank'
    ], { stdio: 'ignore' });

    let targets = null;
    for (let i = 0; i < 60; i++) {
        try {
            const res = await fetch('http://127.0.0.1:' + CDP_PORT + '/json/list');
            targets = await res.json();
            if (targets.length) break;
        } catch (error) { /* not listening yet */ }
        await sleep(250);
    }
    if (!targets || !targets.length) {
        throw new Error('Chrome debugging endpoint never came up on port ' + CDP_PORT);
    }

    const page = targets.find(function (t) { return t.type === 'page'; });
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(function (resolve, reject) {
        ws.onopen = resolve;
        ws.onerror = reject;
    });

    let id = 0;
    const pending = new Map();
    ws.onmessage = function (event) {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
            const entry = pending.get(msg.id);
            pending.delete(msg.id);
            if (msg.error) entry.reject(new Error(JSON.stringify(msg.error)));
            else entry.resolve(msg.result);
        }
    };
    function send(method, params) {
        const msgId = ++id;
        ws.send(JSON.stringify({ id: msgId, method, params: params || {} }));
        return new Promise(function (resolve, reject) { pending.set(msgId, { resolve: resolve, reject: reject }); });
    }
    async function evalJs(expression) {
        const r = await send('Runtime.evaluate', { expression: expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
        return r.result.value;
    }
    async function navigate(url) {
        await send('Page.navigate', { url: url });
        for (let i = 0; i < 80; i++) {
            if (await evalJs('document.readyState') === 'complete') break;
            await sleep(100);
        }
        await sleep(2200); // preloader, scramble decode and first reveals
    }
    async function setViewport(width, height) {
        await send('Emulation.setDeviceMetricsOverride', {
            width: width, height: height, deviceScaleFactor: 1, mobile: false
        });
    }
    async function wheelToBottom() {
        let last = -1;
        for (let i = 0; i < 60; i++) {
            await send('Input.dispatchMouseEvent', {
                type: 'mouseWheel', x: 640, y: 450, deltaX: 0, deltaY: 600, modifiers: 0
            });
            await sleep(250);
            const y = await evalJs('Math.round(window.scrollY)');
            if (y === last) break;
            last = y;
        }
        await sleep(900);
    }
    async function overflowReport() {
        return evalJs(`(function () {
            var de = document.documentElement;
            var wide = [];
            Array.prototype.forEach.call(document.body.querySelectorAll('*'), function (el) {
                if (el.classList.contains('skip-link')) return;
                var r = el.getBoundingClientRect();
                if (r.width && r.right > window.innerWidth + 1) {
                    wide.push(el.tagName + '.' + (el.className || '').split(' ')[0] + '@' + Math.round(r.right));
                }
            });
            return { scrollW: de.scrollWidth, clientW: de.clientWidth, wide: wide.slice(0, 4) };
        })()`);
    }

    await send('Page.enable');
    await send('Runtime.enable');

    /* ---------------------------------------------- 1. home opens at the top */
    console.log('\nHome page');
    await setViewport(1280, 900);
    await navigate(base + '/');

    const first = await evalJs(`(function () {
        function visible(el) {
            var s = getComputedStyle(el);
            return parseFloat(s.opacity) > 0.99 && s.clipPath.indexOf('100%') === -1;
        }
        var h1 = document.querySelector('h1');
        var onScreen = [], offScreen = [];
        Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
            var r = el.getBoundingClientRect();
            (r.top < window.innerHeight && r.bottom > 0 ? onScreen : offScreen).push(el);
        });
        var rect = h1.getBoundingClientRect();
        return {
            scrollY: window.scrollY,
            restoration: history.scrollRestoration,
            h1: h1.textContent.trim(),
            preloaderPE: getComputedStyle(document.getElementById('preloader')).pointerEvents,
            fxPE: getComputedStyle(document.querySelector('.fx-layer')).pointerEvents,
            fxOpacity: getComputedStyle(document.querySelector('.fx-layer')).opacity,
            onScreenHidden: onScreen.filter(function (el) { return !visible(el); }).length,
            onScreenCount: onScreen.length,
            offScreenCount: offScreen.length,
            topElement: document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2).tagName,
            text: document.body.innerText
        };
    })()`);

    check('/ starts at scrollY 0', first.scrollY === 0, 'scrollY=' + first.scrollY);
    check('/ scrollRestoration is manual', first.restoration === 'manual', first.restoration);
    check('/ h1 decodes to the name', first.h1 === 'Md Foize Khan Rion', first.h1);
    check('/ on-screen reveals all visible', first.onScreenHidden === 0,
        first.onScreenHidden + ' hidden of ' + first.onScreenCount);
    check('/ off-screen reveals still armed for animation', first.offScreenCount > 0);
    check('/ preloader never blocks clicks', first.preloaderPE === 'none', first.preloaderPE);
    check('/ fx layer never blocks clicks', first.fxPE === 'none', first.fxPE);
    check('/ fx layer invisible', first.fxOpacity === '0', first.fxOpacity);
    check('/ h1 not covered by an overlay', /H1/.test(first.topElement), first.topElement);

    ['Md Foize Khan Rion', 'Thank you', 'Skills & Technologies', 'Contact Information', '+880 1790799857']
        .forEach(function (t) {
            check('/ renders "' + t + '"', first.text.indexOf(t) !== -1);
        });
    check('/ content order: skills after thank-you, contact last',
        first.text.indexOf('Skills & Technologies') > first.text.indexOf('Thank you') &&
        first.text.indexOf('Contact Information') > first.text.indexOf('Skills & Technologies'));

    /* ----------------------------------- 2. scrolling reveals the rest of the page */
    console.log('\nReveals on scroll');
    for (const route of PAGES) {
        await navigate(base + route);
        await wheelToBottom();
        const after = await evalJs(`(function () {
            var hidden = Array.prototype.filter.call(document.querySelectorAll('.reveal'), function (el) {
                var s = getComputedStyle(el);
                return parseFloat(s.opacity) < 0.99 || s.clipPath.indexOf('100%') !== -1;
            });
            return { hidden: hidden.length, total: document.querySelectorAll('.reveal').length,
                     atBottom: window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2 };
        })()`);
        check(route + ' scrolls to the end', after.atBottom);
        check(route + ' reveals everything when scrolled (' + after.total + ' blocks)',
            after.hidden === 0, after.hidden + ' still hidden');
    }

    /* ------------------------- 3. fresh loads at four widths: no horizontal scroll */
    console.log('\nResponsive widths (fresh load)');
    for (const route of PAGES) {
        for (const width of WIDTHS) {
            await setViewport(width, 900);
            await navigate(base + route);
            const m = await overflowReport();
            const atTop = await evalJs('window.scrollY');
            check(route + ' @' + width + 'px: no horizontal scroll',
                m.scrollW <= m.clientW + 1,
                'scrollWidth=' + m.scrollW + ' clientWidth=' + m.clientW + ' offenders=' + m.wide.join(' | '));
            check(route + ' @' + width + 'px: starts at top', atTop === 0, 'scrollY=' + atTop);
        }
    }

    /* ---------------------------------------- 4. resizing after load keeps layout */
    console.log('\nResize after load');
    await setViewport(1280, 900);
    await navigate(base + '/about.html');
    await setViewport(360, 800);
    await sleep(700);
    const resized = await overflowReport();
    check('resize 1280 -> 360 after load: no horizontal scroll',
        resized.scrollW <= resized.clientW + 1,
        'scrollWidth=' + resized.scrollW + ' offenders=' + resized.wide.join(' | '));

    /* ---------------------------------------------------- 5. reduced motion */
    console.log('\nMotion preferences');
    await setViewport(1280, 900);
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate(base + '/about.html');
    const rm = await evalJs(`(function () {
        var hidden = Array.prototype.filter.call(document.querySelectorAll('.reveal'), function (el) {
            return parseFloat(getComputedStyle(el).opacity) < 0.99;
        });
        return { hidden: hidden.length,
                 armed: document.documentElement.classList.contains('reveals-armed'),
                 cursor: !!document.querySelector('.cursor-dot'),
                 text: document.body.innerText };
    })()`);
    check('reduced-motion: nothing hidden', rm.hidden === 0, String(rm.hidden));
    check('reduced-motion: reveal styles never armed', !rm.armed);
    check('reduced-motion: cursor layer not created', !rm.cursor);
    check('reduced-motion: content readable',
        rm.text.indexOf('Will be provided upon request.') !== -1);
    await send('Emulation.setEmulatedMedia', { features: [] });

    /* ------------------------------------------------------- 6. JS disabled */
    console.log('\nJavaScript disabled');
    await send('Emulation.setScriptExecutionDisabled', { value: true });
    await navigate(base + '/');
    const nojs = await evalJs(`(function () {
        var hidden = Array.prototype.filter.call(document.querySelectorAll('.reveal'), function (el) {
            return parseFloat(getComputedStyle(el).opacity) < 0.99;
        });
        return { hidden: hidden.length,
                 armed: document.documentElement.classList.contains('reveals-armed'),
                 text: document.body.innerText,
                 h1: document.querySelector('h1').textContent };
    })()`);
    check('JS disabled: no hidden content', nojs.hidden === 0, String(nojs.hidden));
    check('JS disabled: reveal styles never armed', !nojs.armed);
    check('JS disabled: intro present',
        nojs.text.indexOf('I am a passionate and dedicated developer') !== -1);
    check('JS disabled: skills present', nojs.text.indexOf('Skills & Technologies') !== -1);
    check('JS disabled: h1 present', nojs.h1 === 'Md Foize Khan Rion', nojs.h1);
    await send('Emulation.setScriptExecutionDisabled', { value: false });

    /* ----------------------------------------------------------- 7. themes */
    console.log('\nThemes');
    for (const theme of ['light', 'dark']) {
        await navigate(base + '/');
        await evalJs("window.RetroTheme && window.RetroTheme.set('" + theme + "')");
        await sleep(1400); // colours cross-fade over 0.3s
        const c = await evalJs(`(function () {
            function lum(c) {
                var m = c.match(/[\\d.]+/g).map(Number);
                function f(v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
                return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]);
            }
            function ratio(a, b) { var x = lum(a), y = lum(b); var hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); }
            function bgOf(el) {
                var node = el;
                while (node) {
                    var bg = getComputedStyle(node).backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
                    node = node.parentElement;
                }
                return 'rgb(255, 255, 255)';
            }
            var body = document.body;
            var link = document.querySelector('main a') || document.querySelector('a');
            var footer = document.querySelector('.site-footer');
            var counter = document.querySelector('.counter');
            var onScreen = [];
            Array.prototype.forEach.call(document.querySelectorAll('.reveal'), function (el) {
                var r = el.getBoundingClientRect();
                if (r.top < window.innerHeight && r.bottom > 0) onScreen.push(el);
            });
            var hidden = onScreen.filter(function (el) {
                return parseFloat(getComputedStyle(el).opacity) < 0.99;
            }).length;
            var imgs = document.querySelectorAll('img');
            var broken = Array.prototype.filter.call(imgs, function (i) {
                return i.complete && i.naturalWidth === 0;
            }).map(function (i) { return i.getAttribute('src'); });
            return {
                theme: document.documentElement.getAttribute('data-theme'),
                body: ratio(getComputedStyle(body).color, bgOf(body)),
                link: link ? ratio(getComputedStyle(link).color, bgOf(link)) : null,
                footer: footer ? ratio(getComputedStyle(footer).color, bgOf(footer)) : null,
                counter: counter ? ratio(getComputedStyle(counter).color, bgOf(counter)) : null,
                hidden: hidden,
                imageCount: imgs.length,
                brokenImages: broken,
                text: document.body.innerText
            };
        })()`);

        check(theme + ': theme applied', c.theme === theme, c.theme);
        check(theme + ': body text contrast AA (' + c.body.toFixed(2) + ')', c.body >= 4.5);
        check(theme + ': link contrast AA (' + (c.link || 0).toFixed(2) + ')', c.link >= 4.5);
        check(theme + ': footer text contrast AA (' + (c.footer || 0).toFixed(2) + ')', c.footer >= 4.5);
        check(theme + ': visitor counter contrast AA (' + (c.counter || 0).toFixed(2) + ')',
            c.counter === null || c.counter >= 4.5);
        check(theme + ': nothing hidden above the fold', c.hidden === 0, String(c.hidden));
        check(theme + ': images loaded (' + c.imageCount + ')', c.brokenImages.length === 0, c.brokenImages.join(', '));
        check(theme + ': content order intact',
            c.text.indexOf('Skills & Technologies') > c.text.indexOf('Thank you') &&
            c.text.indexOf('Contact Information') > c.text.indexOf('Skills & Technologies'));
    }

    /* --------------------------------------------------------------- 8. 404 */
    console.log('\nRouting');
    await navigate(base + '/nope/nope');
    const nf = await evalJs("JSON.stringify({ text: document.body.innerText, h1: document.querySelector('h1').textContent })");
    const nfObj = JSON.parse(nf);
    check('unknown URL renders the custom 404',
        /The requested URL was not found on this server/.test(nfObj.text));
    check('404 h1', nfObj.h1 === 'Not Found', nfObj.h1);

    const aliasExpect = {
        '/index': 'Md Foize Khan Rion',
        '/index.html': 'Md Foize Khan Rion',
        '/home': 'Md Foize Khan Rion',
        '/about': 'About Me',
        '/works': 'My Works'
    };
    for (const alias of Object.keys(aliasExpect)) {
        await navigate(base + alias);
        const landed = await evalJs("JSON.stringify({ h1: document.querySelector('h1').textContent, y: window.scrollY })");
        const obj = JSON.parse(landed);
        check(alias + ' lands on the right page at the top',
            obj.y === 0 && obj.h1 === aliasExpect[alias],
            obj.h1 + ' @' + obj.y);
    }

    ws.close();
    chrome.kill();
    server.close();
    try { fs.rmSync(userData, { recursive: true, force: true }); } catch (error) { /* best effort */ }

    const failed = results.filter(function (r) { return !r.ok; });
    console.log('\n' + (results.length - failed.length) + '/' + results.length + ' render checks passed.');
    if (failed.length) {
        failed.forEach(function (f) {
            console.log('  FAIL: ' + f.name + (f.detail ? ' [' + f.detail + ']' : ''));
        });
        process.exitCode = 1;
    }
}

main().catch(function (error) {
    console.error(error);
    process.exit(1);
});
