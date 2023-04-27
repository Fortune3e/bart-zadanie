const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const galleryRoutes = require("./routes/galleryRoutes.js");
const imagesRoutes = require("./routes/imagesRoutes.js");
const { errorHandler } = require("./utils");

const port = 8080; // Define port to run server on

app.use(bodyParser.urlencoded({ extended: false })); // Parse URL-encoded request bodies

app.use(bodyParser.json()); // Parse JSON request bodies

app.use("/gallery", galleryRoutes);
app.use("/images", imagesRoutes);

// Handle requests to undefined routes
app.use((req, res, next) => {
    return errorHandler(res, 404, "NOT_FOUND", `Not found: '${req.url}'`);
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
});