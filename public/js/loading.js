/**
 * Standalone splash/loading page script.
 *
 * Counts up to 100%, then redirects to the page named in the `?page=` query
 * string (defaults to the home page). Nothing here waits on a network request.
 */
(function () {
    'use strict';

    const loader = document.getElementById('loader');
    if (!loader) return;

    let percent = 1;
    const interval = setInterval(function () {
        loader.textContent = percent + '%';
        percent++;

        if (percent > 100) {
            clearInterval(interval);
            const urlParams = new URLSearchParams(window.location.search);
            const redirectPage = urlParams.get('page') || '/';
            window.location.href = redirectPage + '?loaded=true';
        }
    }, 20);
})();
