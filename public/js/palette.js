/**
 * Command palette (Ctrl/Cmd+K).
 *
 * Actions: jump to any page, copy the email address, toggle the theme, open
 * the external profiles, and a "view source" easter egg.
 */
(function () {
    'use strict';

    var EMAIL = 'rion801@gmail.com';

    var actions = [
        { label: 'Go to Home', hint: '/', run: function () { go('/'); } },
        { label: 'Go to About', hint: '/about.html', run: function () { go('/about.html'); } },
        { label: 'Go to Works', hint: '/works.html', run: function () { go('/works.html'); } },
        { label: 'Go to Arduino Line Follower Robot', hint: '/linefollower.html', run: function () { go('/linefollower.html'); } },
        { label: 'Copy email address', hint: EMAIL, run: copyEmail },
        { label: 'Toggle theme (light / dark)', hint: 'Ctrl+Shift+L', run: function () { window.RetroTheme.toggle(); } },
        { label: 'View source', hint: 'easter egg', run: showSource },
        { label: 'Open GitHub profile', hint: 'external', run: function () { openExternal('https://github.com/BorobhaiRion?tab=repositories'); } },
        { label: 'Open LinkedIn profile', hint: 'external', run: function () { openExternal('https://www.linkedin.com/in/rionkhan801/'); } },
        { label: 'Open Photography / Borobhairion', hint: 'external', run: function () { openExternal('https://borobhairion.github.io/photons--/'); } }
    ];

    var palette = null;
    var input = null;
    var list = null;
    var headerLabel = null;
    var filtered = actions.slice();
    var selected = 0;
    var lastFocused = null;

    /* ---------------------------------------------------------------- helpers */

    function go(url) {
        window.location.href = url;
    }

    function openExternal(url) {
        window.open(url, '_blank', 'noopener');
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function copyEmail() {
        var done = function () {
            if (headerLabel) {
                headerLabel.textContent = 'Copied ' + EMAIL;
                window.setTimeout(function () {
                    headerLabel.textContent = 'Command Palette';
                }, 1800);
            }
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(EMAIL).then(done, fallback);
        } else {
            fallback();
        }

        function fallback() {
            var helper = document.createElement('textarea');
            helper.value = EMAIL;
            helper.setAttribute('readonly', '');
            helper.style.position = 'fixed';
            helper.style.left = '-9999px';
            document.body.appendChild(helper);
            helper.select();
            try {
                document.execCommand('copy');
                done();
            } catch (error) {
                /* nothing more we can do */
            }
            document.body.removeChild(helper);
        }
    }

    /* ------------------------------------------------------------ build the UI */

    function build() {
        palette = document.createElement('div');
        palette.className = 'palette';
        palette.id = 'palette';
        palette.setAttribute('role', 'dialog');
        palette.setAttribute('aria-modal', 'true');
        palette.setAttribute('aria-label', 'Command palette');
        palette.innerHTML =
            '<div class="palette-box">' +
                '<header><span id="palette-title">Command Palette</span><span>Esc to close</span></header>' +
                '<input class="palette-input" id="palette-input" type="text" placeholder="Type a command…" aria-label="Search commands" autocomplete="off" spellcheck="false">' +
                '<ul class="palette-list" id="palette-list" role="listbox" aria-label="Commands"></ul>' +
            '</div>';
        document.body.appendChild(palette);

        input = palette.querySelector('.palette-input');
        list = palette.querySelector('.palette-list');
        headerLabel = palette.querySelector('#palette-title');

        input.addEventListener('input', function () {
            render(input.value);
        });
        input.addEventListener('keydown', onKeydown);

        palette.addEventListener('mousedown', function (event) {
            if (event.target === palette) close();
        });
    }

    function render(query) {
        var needle = (query || '').trim().toLowerCase();
        filtered = needle
            ? actions.filter(function (action) {
                return (action.label + ' ' + action.hint).toLowerCase().indexOf(needle) !== -1;
            })
            : actions.slice();

        selected = 0;
        list.innerHTML = '';

        if (!filtered.length) {
            var empty = document.createElement('li');
            empty.className = 'palette-empty';
            empty.textContent = 'No matching commands.';
            list.appendChild(empty);
            return;
        }

        filtered.forEach(function (action, index) {
            var item = document.createElement('li');
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
            item.innerHTML = '<span>' + escapeHtml(action.label) + '</span><span class="hint">' + escapeHtml(action.hint) + '</span>';
            item.addEventListener('mouseenter', function () {
                select(index);
            });
            item.addEventListener('click', function () {
                selected = index;
                runSelected();
            });
            list.appendChild(item);
        });
    }

    function select(index) {
        if (!filtered.length) return;
        selected = (index + filtered.length) % filtered.length;
        Array.prototype.forEach.call(list.children, function (item, i) {
            item.setAttribute('aria-selected', i === selected ? 'true' : 'false');
        });
    }

    function runSelected() {
        var action = filtered[selected];
        if (!action) return;
        if (action.run === showSource) {
            action.run();
        } else {
            close();
            action.run();
        }
    }

    function onKeydown(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            select(selected + 1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            select(selected - 1);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            runSelected();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            close();
        }
    }

    /* -------------------------------------------------------- view-source egg */

    function showSource() {
        var box = palette.querySelector('.palette-box');
        box.innerHTML =
            '<header><span>view-source: ' + escapeHtml(window.location.pathname) + '</span><span>Esc to close</span></header>' +
            '<pre class="source-view">&lt;!DOCTYPE html&gt;\n' +
            '&lt;html&gt;\n' +
            '&lt;!--\n' +
            '  this page renders like it shipped in 1996,\n' +
            '  but it was written in 2026. inspect away.\n' +
            '  hint: try pressing Ctrl+K twice.\n' +
            '--&gt;\n' +
            '&lt;head&gt;\n' +
            '  &lt;title&gt;' + escapeHtml(document.title) + '&lt;/title&gt;\n' +
            '&lt;/head&gt;\n' +
            '&lt;body bgcolor="#f4f4ef" text="#000000" link="#0000ee" vlink="#551a8b"&gt;\n' +
            '  &lt;center&gt;&lt;h1&gt;best viewed in Netscape Navigator 3.0&lt;/h1&gt;&lt;/center&gt;\n' +
            '&lt;/body&gt;\n' +
            '&lt;/html&gt;</pre>';
    }

    /* ------------------------------------------------------------- open/close */

    function open() {
        if (!palette) build();
        lastFocused = document.activeElement;
        palette.classList.add('is-open');
        if (!palette.querySelector('.palette-input')) {
            // A previous view-source replaced the box; rebuild the search UI.
            palette.querySelector('.palette-box').innerHTML =
                '<header><span id="palette-title">Command Palette</span><span>Esc to close</span></header>' +
                '<input class="palette-input" id="palette-input" type="text" placeholder="Type a command…" aria-label="Search commands" autocomplete="off" spellcheck="false">' +
                '<ul class="palette-list" id="palette-list" role="listbox" aria-label="Commands"></ul>';
            input = palette.querySelector('.palette-input');
            list = palette.querySelector('.palette-list');
            headerLabel = palette.querySelector('#palette-title');
            input.addEventListener('input', function () {
                render(input.value);
            });
            input.addEventListener('keydown', onKeydown);
        }
        input.value = '';
        render('');
        input.focus();
    }

    function close() {
        if (!palette) return;
        palette.classList.remove('is-open');
        if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    function toggle() {
        if (palette && palette.classList.contains('is-open')) {
            close();
        } else {
            open();
        }
    }

    /* -------------------------------------------------------------------- wire */

    document.addEventListener('keydown', function (event) {
        var key = event.key === 'k' ? 'k' : event.key === 'K' ? 'k' : event.key;
        if ((event.ctrlKey || event.metaKey) && key === 'k') {
            event.preventDefault();
            toggle();
        }
    });

    document.addEventListener('click', function (event) {
        var trigger = event.target.closest ? event.target.closest('#palette-open') : null;
        if (trigger) {
            event.preventDefault();
            open();
        }
    });

    window.RetroPalette = { open: open, close: close };
})();
