const router = require("express").Router();
const fs = require('fs');
const path = require('path');
const { validateGalleryList, validateGalleryInsert, validateGalleryDetail } = require("../json-schemas");
const { errorHandler, handleUpload, findGalleryByPath, galleryAlreadyExists, GALLERIES_FOLDER } = require("../utils");

router.get("", (req, res) =>{
    try{
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const newData = json.map(({path, name}) => ({path, name}));
        const result = {
            galleries: newData
        };
        const isValid = validateGalleryList(result);
        if (!isValid) return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");

        return res.status(200).json(result);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.post("", async (req, res) =>{
    try {
        const isValid = validateGalleryInsert(req.body);
        if (!isValid) return errorHandler(res, 400, "INVALID_SCHEMA", "Bad JSON object");

        if (req.body.name.includes('/')) return errorHandler(res, 400, "INVALID_SCHEMA", "Name contains invalid character");

        const newGallery = {
            path: encodeURI(req.body.name),
            name: req.body.name,
            images: []
        }
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        if(galleryAlreadyExists(json, newGallery)) return errorHandler(res, 409, "CONFLICT", "directory already exists");

        json.push(newGallery);
        const newData = JSON.stringify(json);
        fs.writeFileSync('gallery.json', newData);
        await fs.promises.mkdir(`${GALLERIES_FOLDER}/${newGallery.path}`, { recursive: true });
        return res.status(201).json({
            path: newGallery.path,
            name: newGallery.name
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.get("/:path(*)", (req, res) => {
    try{
        const path = encodeURI(req.params.path);

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const gallery = findGalleryByPath(json, path);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        const images = {
            gallery: {
                path: gallery.path,
                name: gallery.name
            },
            images: gallery.images
        }

        const isValid = validateGalleryDetail(images);
        if(!isValid) return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");

        return res.status(200).json(images);
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.post("/:path(*)", handleUpload, (req, res) => {
    try{
        if (!req.file) return errorHandler(res, 400, "BAD_REQUEST", "zero files uploaded");

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);

        const filePath = req.file.filename;
        const fullPath = req.params.path + "/" + req.file.filename;
        let name = path.basename(fullPath, path.extname(fullPath));
        name = name.charAt(0).toUpperCase() + name.slice(1);
        const modified = fs.statSync(`${GALLERIES_FOLDER}/${fullPath}`).mtime.toISOString();
        const newImage = {
            path: filePath,
            fullpath: fullPath,
            name: name,
            modified: modified,
        };

        for (const element of json) {
            if (element.path === req.params.path) {
              element.images.push(newImage);
              break;
            }
        }

        const newData = JSON.stringify(json);
        fs.writeFileSync('gallery.json', newData);

        return res.status(201).json({
            uploaded: [newImage]
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.delete("/:path(*)", async (req, res) => {
    try{
        req.params.path = encodeURI(req.params.path);
        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        var isFolder = false;
        var isImage = false;
        const filteredJson = json.filter(obj => {
            if (obj.path === req.params.path) {
                isFolder = true;
                return false;
            } else {
                obj.images = obj.images.filter(img => {
                    if(img.fullpath === req.params.path){
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
            await fs.promises.rm(folderPath, { recursive: true });
        }else if(isImage){
            const filePath = path.join(__dirname, "..", GALLERIES_FOLDER, req.params.path);
            await fs.promises.unlink(filePath);
        }else{
            return errorHandler(res, 404, "NOT_FOUND", `directory/file ${req.params.path} not exists`);
        }

        const newData = JSON.stringify(filteredJson);
        fs.writeFileSync('gallery.json', newData);
        return res.status(200).json({
            status: "ok"
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

router.put("/:path(*)", async (req, res) =>{
    try{
        req.params.path = encodeURI(req.params.path);
        const isValid = validateGalleryInsert(req.body);
        if (!isValid) return errorHandler(res, 400, "INVALID_SCHEMA", "Bad JSON object");

        if (req.body.name.includes('/')) return errorHandler(res, 400, "INVALID_SCHEMA", "Name contains invalid character");

        const data = fs.readFileSync('gallery.json');
        const json = JSON.parse(data);
        const gallery = findGalleryByPath(json, req.params.path);
        if(!gallery) return errorHandler(res, 404, "NOT_FOUND", "None");

        for(const element of json){
            if(element.path === req.params.path){
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
        const newPath = path.join(__dirname, "..", GALLERIES_FOLDER, encodeURI(req.body.name));
        await fs.promises.rename(currentPath, newPath);

        return res.status(200).json({
            path: encodeURI(req.body.name),
            name: req.body.name
        });
    } catch (err) {
        return errorHandler(res, 500, "INTERNAL_SERVER_ERROR", "An error occurred while processing your request. Please try again later.");
    }
});

module.exports = router;