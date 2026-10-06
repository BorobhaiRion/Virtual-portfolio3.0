/**
 * Route definitions.
 *
 * Mounted by server.js (local development):
 *
 *   node server.js            # or: npm run serve:dev
 *
 * The deployed site is the static build in dist/ (see scripts/build-views.js);
 * netlify.toml and vercel.json mirror the alias rules below so that "/" is the
 * home page and every alias resolves to it on every host.
 */
const pageController = require('../controllers/pageController');

/** Every one of these must land on the home page at "/". */
const HOME_ALIASES = ['/index.html', '/index', '/home'];

/** Extensionless aliases for the pages that have a .html canonical URL. */
const PAGE_ALIASES = {
    '/about': '/about.html',
    '/works': '/works.html',
    '/linefollower': '/linefollower.html',
    '/loading': '/loading.html'
};

function registerRoutes(app) {
    // The home page is the default entry point: "/" always renders it.
    app.get('/', pageController.pages.home);

    // Legacy / convenience aliases all resolve to "/".
    HOME_ALIASES.forEach(function (from) {
        app.get(from, function (req, res) {
            res.redirect(301, '/');
        });
    });

    // Pages
    app.get('/about.html', pageController.pages.about);
    app.get('/works.html', pageController.pages.works);
    app.get('/linefollower.html', pageController.pages.lineFollower);
    app.get('/loading.html', pageController.pages.loading);

    Object.keys(PAGE_ALIASES).forEach(function (from) {
        app.get(from, function (req, res) {
            res.redirect(301, PAGE_ALIASES[from]);
        });
    });

    // Future API surface (Supabase-backed) goes here, e.g.:
    // app.get('/api/works', ...);
    // app.post('/api/messages', ...);

    // Anything else: the custom 404 page, with a real 404 status.
    app.use(pageController.pages.notFound);

    return app;
}

module.exports = registerRoutes;
