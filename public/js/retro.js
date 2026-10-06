/**
 * The "surprise" layer.
 *
 * The markup starts out looking like a plain 1996 page; everything in here is
 * progressive enhancement layered on top. Nothing is required for the content
 * to be readable, and every effect is skipped when the visitor prefers reduced
 * motion or is on a touch device.
 *
 *   reveals        IntersectionObserver fade-up + clip-path
 *   scramble       heading decode on load and hover (< 600ms)
 *   cursor         dot + lerped trailing ring with contextual labels
 *   magnetic       top-bar links drift toward the pointer
 *   previews       floating project screenshot that tilts with velocity
 *   glitch         one-shot RGB split / scanlines that settles into the accent
 *   portraitZoom   magnifier lens over the profile picture (mouse + touch)
 *   counter        visitor counter (localStorage, no backend)
 *   smoothScroll   Lenis, fetched on demand after load
 */
(function () {
    'use strict';

    var root = document.documentElement;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var touch = window.matchMedia('(hover: none), (pointer: coarse)').matches || 'ontouchstart' in window;

    /* ---------------------------------------------------------------- reveals */

    function showReveals(items) {
        Array.prototype.forEach.call(items, function (el) {
            el.classList.add('is-visible');
        });
    }

    function initReveals() {
        var items = document.querySelectorAll('.reveal');
        if (!items.length) return;

        if (reduceMotion || !('IntersectionObserver' in window)) {
            showReveals(items);
            return;
        }

        // The class is added here (not in the head) and only once the observer
        // exists, so that if this file ever fails to load — or throws while
        // setting up — the content is still visible instead of hidden.
        var observer;
        var waiting = [];
        var ticking = false;

        function detach() {
            if (waiting.length) return;
            window.removeEventListener('scroll', requestSweep);
            window.removeEventListener('resize', requestSweep);
        }

        function show(el) {
            var at = waiting.indexOf(el);
            if (at !== -1) waiting.splice(at, 1);
            observer.unobserve(el);
            el.classList.add('is-visible');
            detach();
        }

        function requestSweep() {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(sweep);
        }

        function sweep() {
            ticking = false;
            var height = window.innerHeight || document.documentElement.clientHeight;

            for (var i = waiting.length - 1; i >= 0; i--) {
                var box = waiting[i].getBoundingClientRect();
                if (box.top < height * 0.92 && box.bottom > 0) show(waiting[i]);
            }

            detach();
        }

        try {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) show(entry.target);
                });
            }, { threshold: 0.05, rootMargin: '0px 0px -8% 0px' });
        } catch (error) {
            showReveals(items);
            return;
        }

        root.classList.add('reveals-armed');

        Array.prototype.forEach.call(items, function (el) {
            // Anything already on screen is shown straight away, so arming the
            // reveal styles can never blank out the first paint.
            var rect = el.getBoundingClientRect();
            if (rect.top < (window.innerHeight || document.documentElement.clientHeight) && rect.bottom > 0) {
                el.classList.add('is-visible');
            } else {
                waiting.push(el);
                observer.observe(el);
            }
        });

        // Safety net: an observer can miss an element (a fully clipped box
        // reports no intersection in Chrome), so anything on screen is also
        // promoted from a scroll/resize check rather than left hidden.
        if (waiting.length) {
            window.addEventListener('scroll', requestSweep, { passive: true });
            window.addEventListener('resize', requestSweep);
        }
    }

    /* --------------------------------------------------------------- scramble */

    var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>{}[]#$%&*+=';
    var scrambleTimers = [];

    function scramble(el) {
        if (reduceMotion || !el) return;

        if (!el.hasAttribute('data-text')) {
            el.setAttribute('data-text', el.textContent);
        }
        var finalText = el.getAttribute('data-text');
        if (!finalText) return;

        // Lock the current width so decoding can never shift the layout (CLS).
        el.style.minWidth = el.offsetWidth + 'px';

        var length = finalText.length;
        var duration = 520;
        var start = null;

        function frame(now) {
            if (start === null) start = now;
            var progress = Math.min((now - start) / duration, 1);
            var revealed = Math.floor(progress * length);
            var output = '';

            for (var i = 0; i < length; i++) {
                var character = finalText.charAt(i);
                if (character === ' ' || character === '\n') {
                    output += character;
                } else if (i < revealed) {
                    output += character;
                } else {
                    output += GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
                }
            }

            el.textContent = output;

            if (progress < 1) {
                requestAnimationFrame(frame);
            } else {
                el.textContent = finalText;
                el.style.minWidth = '';
            }
        }

        requestAnimationFrame(frame);
    }

    function initScramble() {
        if (reduceMotion) return;

        var headings = document.querySelectorAll('[data-scramble]');
        Array.prototype.forEach.call(headings, function (el, index) {
            var timer = setTimeout(function () {
                scramble(el);
            }, 120 * index);
            scrambleTimers.push(timer);

            el.addEventListener('mouseenter', function () {
                scramble(el);
            });
        });

        // The width lock is taken at the viewport the decode started in; drop
        // it when the window changes size so a narrowed window can never keep
        // a heading wider than the page.
        window.addEventListener('resize', function () {
            Array.prototype.forEach.call(headings, function (el) {
                el.style.minWidth = '';
            });
        }, { passive: true });
    }

    /* ------------------------------------------------------------------ glitch */

    function applyAccent() {
        root.classList.add('links-accented');
    }

    function initGlitch() {
        if (reduceMotion) {
            applyAccent();
            return;
        }

        var fired = false;

        function fire() {
            if (fired) return;
            fired = true;
            root.classList.add('glitching');
            window.setTimeout(function () {
                root.classList.remove('glitching');
                applyAccent();
            }, 620);
        }

        window.setTimeout(fire, 3000);
        window.addEventListener('pointerdown', fire);
    }

    /* --------------------------------------------------------- portrait zoom */

    function initPortraitZoom() {
        var wrap = document.querySelector('.portrait-zoom');
        var img = wrap ? wrap.querySelector('img.portrait') : null;
        var lens = wrap ? wrap.querySelector('.portrait-lens') : null;
        if (!wrap || !img || !lens) return;

        var ZOOM = 2.25;
        var HOLD_MS = 280;
        var SLOP = 10;

        function px(value) {
            return parseFloat(value) || 0;
        }

        // Frame around the picture (1px border + 3px padding); never changes.
        var chrome = (function () {
            var cs = window.getComputedStyle(img);
            return {
                left: px(cs.borderLeftWidth) + px(cs.paddingLeft),
                top: px(cs.borderTopWidth) + px(cs.paddingTop),
                right: px(cs.borderRightWidth) + px(cs.paddingRight),
                bottom: px(cs.borderBottomWidth) + px(cs.paddingBottom)
            };
        })();

        var lensing = false;
        var raf = 0;
        var cur = { x: 0, y: 0 };
        var tgt = { x: 0, y: 0 };

        // The picture area the lens may cover, in wrapper coordinates. Re-read
        // every frame so the reveal transform on the image is accounted for.
        function box() {
            var w = wrap.getBoundingClientRect();
            var i = img.getBoundingClientRect();
            return {
                x: i.left - w.left + chrome.left,
                y: i.top - w.top + chrome.top,
                w: i.width - chrome.left - chrome.right,
                h: i.height - chrome.top - chrome.bottom
            };
        }

        function aim(clientX, clientY) {
            var w = wrap.getBoundingClientRect();
            tgt.x = clientX - w.left;
            tgt.y = clientY - w.top;
        }

        function draw() {
            raf = 0;
            var b = box();
            var r = lens.offsetWidth / 2;

            // Keep the whole circle inside the picture so the lens never
            // shows blank space at the edges or corners.
            var minX = b.x + r;
            var maxX = b.x + b.w - r;
            var minY = b.y + r;
            var maxY = b.y + b.h - r;
            if (maxX < minX) { minX = maxX = b.x + b.w / 2; }
            if (maxY < minY) { minY = maxY = b.y + b.h / 2; }

            var k = reduceMotion ? 1 : 0.24;
            cur.x += (tgt.x - cur.x) * k;
            cur.y += (tgt.y - cur.y) * k;
            var cx = Math.min(Math.max(cur.x, minX), maxX);
            var cy = Math.min(Math.max(cur.y, minY), maxY);

            var bw = b.w * ZOOM;
            var bh = b.h * ZOOM;
            var half = lens.clientWidth / 2;
            var ox = half - ((cx - b.x) / b.w) * bw;
            var oy = half - ((cy - b.y) / b.h) * bh;
            if (ox > 0) ox = 0;
            if (ox < lens.clientWidth - bw) ox = lens.clientWidth - bw;
            if (oy > 0) oy = 0;
            if (oy < lens.clientHeight - bh) oy = lens.clientHeight - bh;

            lens.style.left = cx + 'px';
            lens.style.top = cy + 'px';
            lens.style.backgroundSize = bw + 'px ' + bh + 'px';
            lens.style.backgroundPosition = ox + 'px ' + oy + 'px';

            if (lensing) raf = window.requestAnimationFrame(draw);
        }

        function activate(clientX, clientY) {
            if (lensing) return;
            aim(clientX, clientY);
            cur.x = tgt.x;
            cur.y = tgt.y;
            lensing = true;
            wrap.classList.add('is-lensing');
            root.classList.add('is-zooming');
            lens.style.backgroundImage = 'url("' + (img.currentSrc || img.src) + '")';
            draw();
        }

        function deactivate() {
            if (!lensing) return;
            lensing = false;
            wrap.classList.remove('is-lensing');
            root.classList.remove('is-zooming');
            if (raf) {
                window.cancelAnimationFrame(raf);
                raf = 0;
            }
        }

        // Mouse and pen: open on enter, track, close on leave.
        wrap.addEventListener('pointerenter', function (event) {
            if (event.pointerType === 'touch') return;
            activate(event.clientX, event.clientY);
        });

        wrap.addEventListener('pointermove', function (event) {
            if (event.pointerType === 'touch') return;
            if (!lensing) activate(event.clientX, event.clientY);
            else aim(event.clientX, event.clientY);
        });

        wrap.addEventListener('pointerleave', function (event) {
            if (event.pointerType === 'touch') return;
            deactivate();
        });

        // Touch: press and hold to open, drag to move. A quick swipe past the
        // picture just scrolls the page as usual.
        var touchId = null;
        var holdTimer = 0;
        var holdX = 0;
        var holdY = 0;

        function cancelHold() {
            if (holdTimer) {
                window.clearTimeout(holdTimer);
                holdTimer = 0;
            }
        }

        wrap.addEventListener('pointerdown', function (event) {
            if (event.pointerType !== 'touch') return;
            touchId = event.pointerId;
            holdX = event.clientX;
            holdY = event.clientY;
            cancelHold();
            holdTimer = window.setTimeout(function () {
                holdTimer = 0;
                activate(holdX, holdY);
            }, HOLD_MS);
        });

        window.addEventListener('pointermove', function (event) {
            if (event.pointerType !== 'touch' || event.pointerId !== touchId) return;
            if (Math.hypot(event.clientX - holdX, event.clientY - holdY) > SLOP) cancelHold();
            if (lensing) aim(event.clientX, event.clientY);
        }, { passive: true });

        function endTouch(event) {
            if (event.pointerId !== touchId) return;
            cancelHold();
            deactivate();
            touchId = null;
        }

        window.addEventListener('pointerup', endTouch);
        window.addEventListener('pointercancel', endTouch);

        // Only block the page scroll while the lens is actually open under a
        // finger; swiping past the picture keeps its default behaviour.
        document.addEventListener('touchmove', function (event) {
            if (lensing && touchId !== null) event.preventDefault();
        }, { passive: false });

        wrap.addEventListener('contextmenu', function (event) {
            if (touchId !== null) event.preventDefault();
        });
    }

    /* ------------------------------------------------------------------ cursor */

    function initCursor() {
        if (touch || reduceMotion) return;

        var dot = document.createElement('div');
        dot.className = 'cursor-dot';
        var ring = document.createElement('div');
        ring.className = 'cursor-ring';
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        root.classList.add('cursor-active');

        var target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        var dotPos = { x: target.x, y: target.y };
        var ringPos = { x: target.x, y: target.y };
        var visible = false;

        function labelFor(node) {
            var el = node && node.closest ? node.closest('a, button, [data-cursor]') : null;
            if (!el) return '';
            return el.getAttribute('data-cursor') || (el.tagName === 'BUTTON' ? 'click' : 'open');
        }

        function onMove(event) {
            target.x = event.clientX;
            target.y = event.clientY;

            if (!visible) {
                visible = true;
                dot.style.opacity = '1';
                ring.style.opacity = '1';
            }

            var label = labelFor(event.target);
            if (label) {
                ring.setAttribute('data-label', label);
                ring.classList.add('is-label');
            } else {
                ring.removeAttribute('data-label');
                ring.classList.remove('is-label');
            }
        }

        function loop() {
            dotPos.x += (target.x - dotPos.x) * 0.35;
            dotPos.y += (target.y - dotPos.y) * 0.35;
            ringPos.x += (target.x - ringPos.x) * 0.14;
            ringPos.y += (target.y - ringPos.y) * 0.14;

            dot.style.transform = 'translate(' + dotPos.x + 'px,' + dotPos.y + 'px) translate(-50%,-50%)';
            ring.style.transform = 'translate(' + ringPos.x + 'px,' + ringPos.y + 'px) translate(-50%,-50%)';

            requestAnimationFrame(loop);
        }

        window.addEventListener('mousemove', onMove, { passive: true });
        document.addEventListener('mouseleave', function () {
            visible = false;
            dot.style.opacity = '0';
            ring.style.opacity = '0';
        });

        requestAnimationFrame(loop);
    }

    /* ---------------------------------------------------------------- magnetic */

    function initMagnetic() {
        if (touch || reduceMotion) return;

        var targets = document.querySelectorAll('.topbar a, .theme-switch, .palette-btn');
        if (!targets.length) return;

        var RADIUS = 80;
        var STRENGTH = 0.3;

        function onMove(event) {
            Array.prototype.forEach.call(targets, function (el) {
                var rect = el.getBoundingClientRect();
                var dx = event.clientX - (rect.left + rect.width / 2);
                var dy = event.clientY - (rect.top + rect.height / 2);

                if (Math.hypot(dx, dy) < RADIUS) {
                    el.style.transform = 'translate(' + dx * STRENGTH + 'px,' + dy * STRENGTH + 'px)';
                } else if (el.style.transform) {
                    el.style.transform = '';
                }
            });
        }

        window.addEventListener('mousemove', onMove, { passive: true });
    }

    /* ---------------------------------------------------------------- previews */

    function initPreviews() {
        if (touch || reduceMotion) return;

        var rows = document.querySelectorAll('[data-preview]');
        if (!rows.length) return;

        var box = document.createElement('div');
        box.className = 'hover-preview';
        var image = document.createElement('img');
        image.alt = '';
        box.appendChild(image);
        document.body.appendChild(box);

        var active = null;
        var target = { x: 0, y: 0 };
        var pos = { x: 0, y: 0 };
        var tilt = 0;
        var lastX = 0;

        function onMove(event) {
            var velocity = event.clientX - lastX;
            lastX = event.clientX;
            target.x = event.clientX;
            target.y = event.clientY;
            if (active) {
                tilt += (Math.max(-14, Math.min(14, velocity * 0.7)) - tilt) * 0.2;
            }
        }

        function loop() {
            pos.x += (target.x - pos.x) * 0.16;
            pos.y += (target.y - pos.y) * 0.16;
            if (active) {
                box.style.transform =
                    'translate(' + (pos.x + 26) + 'px,' + (pos.y + 18) + 'px) rotate(' + tilt.toFixed(2) + 'deg)';
            }
            requestAnimationFrame(loop);
        }

        Array.prototype.forEach.call(rows, function (row) {
            row.addEventListener('mouseenter', function () {
                image.src = row.getAttribute('data-preview');
                active = row;
                pos.x = target.x;
                pos.y = target.y;
                box.style.opacity = '1';
            });
            row.addEventListener('mouseleave', function () {
                if (active !== row) return;
                active = null;
                box.style.opacity = '0';
            });
        });

        window.addEventListener('mousemove', onMove, { passive: true });
        requestAnimationFrame(loop);
    }

    /* ----------------------------------------------------------------- counter */

    function initCounter() {
        var el = document.getElementById('visitor-counter');
        if (!el) return;

        var BASE = 1337;
        var value = BASE;

        try {
            var stored = parseInt(window.localStorage.getItem('retro-visits') || '0', 10);
            if (isNaN(stored) || stored < 0) stored = 0;
            stored += 1;
            window.localStorage.setItem('retro-visits', String(stored));
            value = BASE + stored;
        } catch (error) {
            /* storage unavailable — just show the base number */
        }

        var text = String(value);
        while (text.length < 6) text = '0' + text;
        el.textContent = text;
    }

    /* ------------------------------------------------------------ smooth scroll */

    function initSmoothScroll() {
        if (reduceMotion) return;

        var LENIS_URL = 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/dist/lenis.min.js';
        var started = false;

        function start() {
            if (started) return;
            started = true;

            var script = document.createElement('script');
            script.src = LENIS_URL;
            script.async = true;
            script.onload = function () {
                if (typeof window.Lenis !== 'function') return;

                var lenis = new window.Lenis({ duration: 1.05, smoothWheel: true });

                function raf(time) {
                    lenis.raf(time);
                    requestAnimationFrame(raf);
                }
                requestAnimationFrame(raf);

                Array.prototype.forEach.call(document.querySelectorAll('a[href^="#"]'), function (link) {
                    link.addEventListener('click', function (event) {
                        var id = link.getAttribute('href').slice(1);
                        var targetEl = id ? document.getElementById(id) : null;
                        if (!targetEl) return;
                        event.preventDefault();
                        // Keep the native anchor behaviour of moving focus, which
                        // smooth scrolling would otherwise swallow (skip link).
                        if (typeof targetEl.focus === 'function') {
                            try {
                                targetEl.focus({ preventScroll: true });
                            } catch (error) {
                                targetEl.focus();
                            }
                        }
                        lenis.scrollTo(targetEl);
                    });
                });
            };
            // If the CDN is unreachable the CSS `scroll-behavior: smooth` stands in.
            document.head.appendChild(script);
        }

        if (document.readyState === 'complete') {
            start();
        } else {
            window.addEventListener('load', start, { once: true });
        }
    }

    /* -------------------------------------------------------------------- init */

    function init() {
        initReveals();
        initScramble();
        initGlitch();
        initCursor();
        initMagnetic();
        initPreviews();
        initPortraitZoom();
        initCounter();
        initSmoothScroll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
