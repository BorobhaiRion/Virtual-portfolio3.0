/**
 * Main server file — local development only.
 *
 * Renders the EJS views in views/ straight from source (fast feedback while
 * editing) and serves public/ for styles, scripts and images. Routing lives in
 * routes/index.js and is shared with the deployment configs: "/" is the home
 * page, "/index", "/home" and "/index.html" resolve to it, and everything
 * else falls through to the custom 404 page with a real 404 status.
 *
 *   node server.js            # http://localhost:3000
 *   npm run serve:dev
 *
 * The deployed artefact is the static build in dist/ (npm run build). Serve
 * that locally with `npm run serve`, which mirrors the same redirects.
 */
const express = require('express');
const path = require('path');
const registerRoutes = require('./routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static assets first: /css, /js and /assets are served as files, everything
// else falls through to the route table.
app.use(express.static(path.join(__dirname, 'public')));

registerRoutes(app);

const port = process.env.PORT || 3000;

app.listen(port, function () {
    console.log('Virtual-portfolio3.0 dev server: http://localhost:' + port + '/');
});
