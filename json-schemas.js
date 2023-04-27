const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });

// Define a JSON schema for a list of galleries
const galleryListSchema = {
    type: 'object',
    properties: {
        galleries: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
            path: { type: 'string' },
            name: { type: 'string' },
            image: {
                type: 'object',
                properties: {
                path: { type: 'string' },
                fullpath: { type: 'string' },
                name: { type: 'string' },
                modified: { type: 'string' }
                },
                required: ['path', 'fullpath', 'name', 'modified']
            }
            },
            required: ['path', 'name']
        }
        }
    },
    required: ['galleries'],
    additionalProperties: true
};

// Define a JSON schema for inserting a new gallery
const galleryPostSchema = {
    title: "New gallery insert schema",
    type: "object",
    properties: {
    name: {
        type: "string",
        minLength: 1
    }
    },
    required: ["name"],
    additionalProperties: false
}

// Define a JSON schema for a gallery detail
const galleryDetailSchema = {
    title: "Gallery detail schema",
    type: "object",
    properties: {
        gallery: {
        type: "object",
        properties: {
            path: {type: "string"},
            name: {type: "string"}
        },
        required: ["path", "name"]
        },
        images: {
        type: "array",
        items: {
            type: "object",
            properties: {
            path: {type: "string"},
            fullpath: {type: "string"},
            name: {type: "string"},
            modified: {type: "string"}
            },
            required: ["path", "fullpath", "name", "modified"]
        }
        }
    },
    required: ["gallery", "images"],
    additionalProperties: true
}

// Compile the JSON schemas into functions for validation
const validateGalleryList = ajv.compile(galleryListSchema);
const validateGalleryInsert = ajv.compile(galleryPostSchema);
const validateGalleryDetail = ajv.compile(galleryDetailSchema);

module.exports = {
    validateGalleryList,
    validateGalleryInsert,
    validateGalleryDetail
};