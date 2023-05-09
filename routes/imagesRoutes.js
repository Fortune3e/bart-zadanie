const router = require("express").Router();
const sharp = require("sharp");
const fs = require('fs');
const { errorHandler, findImageByPath, GALLERIES_FOLDER, findGalleryByPath } = require("../utils");
const { validateImagesList } = require('../json-schemas');

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

// Search for images by name in selected gallery
// Query "galleryPath" for path to gallery and "imageName" for name of images to be searched
router.get("/search", (req, res) => {
    try{
        if (!req.query.galleryPath || !req.query.imageName) return errorHandler(res, 400, "INVALID_SCHEMA", "Gallery path and image name are required in query.");

        const encodedPath = encodeURI(req.query.galleryPath);
        const name = req.query.imageName.toLowerCase();

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const images = [];

        const gallery = findGalleryByPath(json, encodedPath);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        // Search for images which name includes substring in query
        gallery.images.forEach(img => {
            if(img.name.toLowerCase().includes(name)){
                images.push(img);
            };
        });

        const result = {
            images: images
        };

        const isValid = validateImagesList(result); // Check if JSON is valid
        if (!isValid) return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");

        return res.status(200).send(result);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

module.exports = router;