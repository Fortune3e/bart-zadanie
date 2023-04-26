const multer = require('multer');
const path = require('path');
const fs = require('fs');

const GALLERIES_FOLDER = "galleries";

const galleryAlreadyExists = (json, newGallery) => {
    return json.some(element => element.name === newGallery.name);
}

const findGalleryByPath = (json, path) => {
    return json.find(element => element.path === path);
}

const findImageByPath = (json, path) => {
    for(const gallery of json){
        const image = gallery.images.find(image => image.fullpath === path);
        if (image) {
            return image;
        }
    }
    return null;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const folderPath = path.join(__dirname, GALLERIES_FOLDER, req.params.path); // Build the folder path based on the request
      cb(null, folderPath); // Pass the folder path to multer
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname); // Use the original file name for the uploaded file
    },
});

const upload = multer({ storage });

const handleUpload = (req, res, next) => {
    try {
        req.params.path = encodeURI(req.params.path);
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const gallery = findGalleryByPath(json, req.params.path);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        upload.single('image')(req, res, (err) => {
            if (err) return errorHandler(res, 400, "BAD_REQUEST", "file not found");
            next();
        });
    } catch (err) {
        console.log(err);
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
};

const errorHandler = (res, code, name, description) => {
    return res.status(code).json({ code, name, description });
};

module.exports = { errorHandler, handleUpload, findGalleryByPath, galleryAlreadyExists, findImageByPath, GALLERIES_FOLDER };