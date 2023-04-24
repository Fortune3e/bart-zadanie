const router = require("express").Router();
const sharp = require("sharp");
const fs = require('fs');
const GALLERIES_FOLDER = "galleries";

const findImageByPath = (json, path) => {
    for (let i = 0; i < json.length; i++) {
        const gallery = json[i];
        const image = gallery.images.find(image => image.fullpath === path);
        if (image) {
            return image;
        }
    }
    return null;
}

router.get("/:size/:path(*)", async (req, res) =>{
    const { size, path } = req.params;
    const [width, height] = size.split('x');

    try {
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        const imageObj = findImageByPath(json, path);

        if(!imageObj){
            return res.status(404).json({
                code: 404,
                name: "NOT_FOUND",
                description: `Image ${path} not found`
            });
        }
        const image = sharp(`${GALLERIES_FOLDER}/${path}`);
        const resizedImage = await image.resize(parseInt(width), parseInt(height)).toBuffer();

        res.set('Content-Type', 'image/jpeg');
        return res.status(200).send(resizedImage);
    } catch (err) {
        return res.status(500).json({
            code: 500,
            name: "INTERNAL_SERVER_ERROR",
            description: "The photo preview can't be generated."
        });
    }
});

module.exports = router;