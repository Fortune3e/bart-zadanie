const express = require("express");
const app = express();
const bodyParser = require('body-parser');
const port = 8080;
const galleryRoutes = require("./routes/galleryRoutes.js");
const imagesRoutes = require("./routes/imagesRoutes.js");

app.use(bodyParser.urlencoded({ extended: false }))

app.use(bodyParser.json())

app.use("/gallery", galleryRoutes);
app.use("/images", imagesRoutes);

app.listen(port, () => {
    console.log(`Server listening on port ${port}`)
})