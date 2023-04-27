const router = require("express").Router();
const sharp = require("sharp");
const fs = require('fs');
const { errorHandler, findImageByPath, GALLERIES_FOLDER } = require("../utils");

router.get("/:w(\\d+)x:h(\\d+)/:path(\\S+)", async (req, res) =>{
    try {
        const path = encodeURI(req.params.path);
        const {w, h} = req.params;

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        const imageObj = findImageByPath(json, path);

        if(!imageObj) return errorHandler(res, 404, "NOT_FOUND", `Image ${req.params.path} not found`);

        const image = sharp(`${GALLERIES_FOLDER}/${req.params.path}`); // Loading the image using sharp
        const resizedImage = await image.resize(parseInt(w), parseInt(h)).toBuffer(); // Resizing the image to the specified width and height

        res.set('Content-Type', 'image/jpeg');
        return res.status(200).send(resizedImage);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "The photo preview can't be generated.");
    }
});

module.exports = router;