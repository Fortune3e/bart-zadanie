const router = require("express").Router();
const sharp = require("sharp");
const fs = require('fs');
const { errorHandler, findImageByPath, GALLERIES_FOLDER } = require("../utils");

router.get("/:size/:path(*)", async (req, res) =>{
    try {
        const size = req.params.size;
        const path = encodeURI(req.params.path);
        const [width, height] = size.split('x');

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        const imageObj = findImageByPath(json, path);

        if(!imageObj) return errorHandler(res, 404, "NOT_FOUND", `Image ${path} not found`);

        const image = sharp(`${GALLERIES_FOLDER}/${path}`);
        const resizedImage = await image.resize(parseInt(width), parseInt(height)).toBuffer();

        res.set('Content-Type', 'image/jpeg');
        return res.status(200).send(resizedImage);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "The photo preview can't be generated.");
    }
});

module.exports = router;