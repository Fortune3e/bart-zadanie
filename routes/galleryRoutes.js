const router = require("express").Router();
const fs = require('fs');
const path = require('path');
const { validateGalleryList, validateGalleryInsert, validateGalleryDetail } = require("../json-schemas");
const { errorHandler, handleUpload, findGalleryByPath, galleryAlreadyExists, GALLERIES_FOLDER } = require("../utils");

router.get("", (req, res) =>{
    try{
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const newData = json.map(({ path, name, images }) => {
            const image = images[0];
            return { path, name, image };
        });
        const result = {
            galleries: newData
        };

        const isValid = validateGalleryList(result); // Check if JSON is valid
        if (!isValid) return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");

        return res.status(200).json(result);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.post("", async (req, res) =>{
    try {
        const isValid = validateGalleryInsert(req.body); // Check if request body JSON is valid
        if (!isValid) return errorHandler(res, 400, "INVALID_SCHEMA", "Bad JSON object");

        if (req.body.name.includes('/')) return errorHandler(res, 400, "INVALID_SCHEMA", "Name contains invalid character");

        const newGallery = {
            path: encodeURI(req.body.name),
            name: req.body.name,
            images: []
        }
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        if(galleryAlreadyExists(json, newGallery.name)) return errorHandler(res, 409, "CONFLICT", "directory already exists");

        json.push(newGallery);
        const newData = JSON.stringify(json);
        fs.writeFileSync('gallery.json', newData);

        await fs.promises.mkdir(`${GALLERIES_FOLDER}/${req.body.name}`, { recursive: true }); // Creating new directory for gallery
        return res.status(201).json({
            path: newGallery.path,
            name: newGallery.name
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.get("/:path(\\S+)", (req, res) => {
    try{
        const encodedPath = encodeURI(req.params.path);

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const gallery = findGalleryByPath(json, encodedPath);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        const images = {
            gallery: {
                path: gallery.path,
                name: gallery.name
            },
            images: gallery.images
        }

        const isValid = validateGalleryDetail(images); // Check if JSON is valid
        if(!isValid) return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");

        return res.status(200).json(images);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.post("/:path(\\S+)", handleUpload, (req, res) => {
    try{
        const encodedPath = encodeURI(req.params.path);
        if (req.files.length === 0) return errorHandler(res, 400, "BAD_REQUEST", "zero files uploaded");

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const images = [];

        // Create image objects
        for(const file of req.files){
            const filePath = file.filename;
            const fullPath = encodedPath + "/" + filePath;
            let name = filePath.split(".")[0];
            name = name.charAt(0).toUpperCase() + name.slice(1);
            const modified = fs.statSync(`${GALLERIES_FOLDER}/${req.params.path}/${filePath}`).mtime.toISOString();
            const newImage = {
                path: filePath,
                fullpath: fullPath,
                name: name,
                modified: modified,
            };
            images.push(newImage);
        }

        // Add images to galleries JSON
        for (const element of json) {
            if (element.path === encodedPath) {
                element.images.push(...images);
                break;
            }
        }

        const newData = JSON.stringify(json);
        fs.writeFileSync('gallery.json', newData);

        return res.status(201).json({
            uploaded: images
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.delete("/:path(\\S+)", async (req, res) => {
    try{
        const encodedPath = encodeURI(req.params.path);
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        var isFolder = false;
        var isImage = false;

        // Delete gallery/image from galleries JSON
        const filteredJson = json.filter(obj => {
            if (obj.path === encodedPath) {
                isFolder = true;
                return false;
            } else {
                obj.images = obj.images.filter(img => {
                    if(img.fullpath === encodedPath){
                        isImage = true;
                        return false;
                    }else{
                        return true;
                    }
                });
                return true;
            }
        });

        if(isFolder){
            const folderPath = path.join(__dirname, "..", GALLERIES_FOLDER, req.params.path);
            await fs.promises.rm(folderPath, { recursive: true }); // Delete gallery folder
        }else if(isImage){
            const filePath = path.join(__dirname, "..", GALLERIES_FOLDER, req.params.path);
            await fs.promises.unlink(filePath); // Delete image file from gallery folder
        }else{
            return errorHandler(res, 404, "NOT_FOUND", `directory/file ${req.params.path} not exists`);
        }

        const newData = JSON.stringify(filteredJson);
        fs.writeFileSync('gallery.json', newData);
        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        console.log(err);
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

// Update name of existing gallery
router.put("/:path(\\S+)", async (req, res) =>{
    try{
        const encodedPath = encodeURI(req.params.path);
        const isValid = validateGalleryInsert(req.body); // Check if request body JSON is valid
        if (!isValid) return errorHandler(res, 400, "INVALID_SCHEMA", "Bad JSON object");

        if (req.body.name.includes('/')) return errorHandler(res, 400, "INVALID_SCHEMA", "Name contains invalid character");

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        const gallery = findGalleryByPath(json, encodedPath);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        if(galleryAlreadyExists(json, req.body.name)) return errorHandler(res, 409, "CONFLICT", "directory already exists");

        // Update name and path for gallery and its images in galleries JSON
        for(const element of json){
            if(element.path === encodedPath){
                element.name = req.body.name;
                element.path = encodeURI(req.body.name);
                element.images.forEach(image => {
                    image.fullpath = `${element.path}/${image.path}`;
                });
                break;
            }
        }

        const newData = JSON.stringify(json);
        fs.writeFileSync('gallery.json', newData);
        const currentPath = path.join(__dirname, "..", GALLERIES_FOLDER, req.params.path);
        const newPath = path.join(__dirname, "..", GALLERIES_FOLDER, req.body.name);
        await fs.promises.rename(currentPath, newPath); // Update gallery folder name

        return res.status(200).json({
            path: encodeURI(req.body.name),
            name: req.body.name
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

module.exports = router;