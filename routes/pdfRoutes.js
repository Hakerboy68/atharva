const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Apply auth middleware to all PDF routes
router.use(authMiddleware);

// PDF routes
router.post('/upload-pdf', upload.single('pdf'), pdfController.uploadPDF);
router.get('/pdfs', pdfController.getPDFs);
router.post('/generate', pdfController.generateFromPDF);
router.delete('/pdf/:pdfId', pdfController.deletePDF);

module.exports = router;
