/**
 * Page controller (scaffolding).
 *
 * Maps a requested page to the EJS view that renders it. The same view files
 * are used by the static build (scripts/build-views.js) and will be used by the
 * Express server once it is added.
 */
const PAGE_VIEWS = {
    home: 'index',
    about: 'about',
    works: 'works',
    lineFollower: 'linefollower',
    loading: 'loading',
    notFound: '404',
};

function showPage(view) {
    return function showPageHandler(req, res) {
        res.render(view);
    };
}

/**
 * Custom 404. Rendered for every URL that is not a known page, with a real
 * HTTP 404 status (never a silent 200, and never another page's content).
 */
function notFound(req, res) {
    res.status(404).render(PAGE_VIEWS.notFound);
}

const pages = Object.fromEntries(
    Object.entries(PAGE_VIEWS)
        .filter(([name]) => name !== 'notFound')
        .map(([name, view]) => [name, showPage(view)])
);

pages.notFound = notFound;

module.exports = { PAGE_VIEWS, showPage, notFound, pages };
