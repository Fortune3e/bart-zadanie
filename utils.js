const multer = require('multer');
const path = require('path');
const fs = require('fs');

const GALLERIES_FOLDER = "galleries"; // Define the name of the folder where galleries will be stored

const galleryAlreadyExists = (json, newGalleryName) => {
    return json.some(element => element.name === newGalleryName);
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
    };
    return null;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const folderPath = path.join(__dirname, GALLERIES_FOLDER, req.params.path); // Build the folder path based on the request
        cb(null, folderPath); // Pass the folder path to multer
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const folderPath = path.join(__dirname, GALLERIES_FOLDER, req.params.path);
        const files = fs.readdirSync(folderPath);
        let fileName = name + ext;
        let i = 1;

        // Generate file name if file with the same name already exists
        while (files.includes(fileName)) {
            fileName = name + '-' + i + ext;
            i++;
        }
        cb(null, fileName);
    },
});

const upload = multer({
    storage,
    // Only accept JPEG files
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext !== '.jpeg' && ext !== '.jpg') {
            return cb(new Error('Only JPEG files are allowed'));
        }
        cb(null, true);
    }
});

// Middleware function for handling file uploads
const handleUpload = (req, res, next) => {
    try {
        const encodedPath = encodeURI(req.params.path);
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const gallery = findGalleryByPath(json, encodedPath);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        upload.array('image')(req, res, (err) => {
            if (err) return errorHandler(res, 400, "BAD_REQUEST", "invalid file");
            next();
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    };
};

// Error handler function for sending error responses to the client
const errorHandler = (res, code, name, description) => {
    return res.status(code).json({ code, name, description });
};

module.exports = { errorHandler, handleUpload, findGalleryByPath, galleryAlreadyExists, findImageByPath, GALLERIES_FOLDER };