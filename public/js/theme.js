/**
 * Theme controller.
 *
 * The initial theme is resolved by the tiny inline script in
 * views/partials/head.ejs (before first paint, to avoid a flash). This file
 * owns everything after that: the top-bar switch, the keyboard shortcut and
 * persistence.
 *
 * Exposes window.RetroTheme = { get, set, toggle } for the command palette.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'theme';
    var root = document.documentElement;

    function current() {
        return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function paintSwitch(theme) {
        var spans = document.querySelectorAll('.theme-switch [data-mode]');
        Array.prototype.forEach.call(spans, function (span) {
            var on = span.getAttribute('data-mode') === theme;
            span.classList.toggle('is-on', on);
            if (on) {
                span.setAttribute('aria-current', 'true');
            } else {
                span.removeAttribute('aria-current');
            }
        });
    }

    function set(theme, persist) {
        theme = theme === 'dark' ? 'dark' : 'light';
        root.setAttribute('data-theme', theme);

        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#07110b' : '#f4f4ef');
        }

        if (persist) {
            try {
                window.localStorage.setItem(STORAGE_KEY, theme);
            } catch (error) {
                /* private mode — the choice just will not persist */
            }
        }

        paintSwitch(theme);

        try {
            window.dispatchEvent(new CustomEvent('retrothemechange', { detail: { theme: theme } }));
        } catch (error) {
            /* CustomEvent unavailable — nothing depends on this */
        }
    }

    function toggle() {
        set(current() === 'dark' ? 'light' : 'dark', true);
    }

    function wire() {
        paintSwitch(current());

        var button = document.getElementById('theme-toggle');
        if (button) {
            button.addEventListener('click', toggle);
        }

        document.addEventListener('keydown', function (event) {
            var key = event.key === 'L' ? 'l' : event.key;
            if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'l') {
                event.preventDefault();
                toggle();
            }
        });
    }

    window.RetroTheme = { get: current, set: set, toggle: toggle };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wire);
    } else {
        wire();
    }
})();
