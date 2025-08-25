// /backend/routes/projectRoutes.js

const express = require('express');
const router = express.Router();
const multer = require('multer');
const projectController = require('../controllers/projectController');

// Configure multer for file storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './files/'); // The directory where files will be stored
    },
    filename: function (req, file, cb) {
        // Use the original file name, you might want to add a timestamp or unique prefix
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Define API routes
router.get('/', projectController.getAllProjects);
router.post('/', upload.single('dataFile'), projectController.createProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
router.post('/insight/:id', projectController.getProjectInsight);
router.get('/get_suggestion/:id', projectController.getSmartSuggestion);
router.put("/:id/file", projectController.updateProjectFile);
module.exports = router;