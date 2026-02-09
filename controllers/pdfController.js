const path = require('path');
const fs = require('fs');
const { parsePDF, extractContent, chunkText } = require('../utils/pdfParser');
const { storePDFMetadata, getUserPDFs, getPDFById } = require('../utils/storage');
const { generateStudyMaterial } = require('../utils/aiHelper');

// Upload PDF
const uploadPDF = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }

        const userId = req.user.id;
        const filePath = req.file.path;
        const originalName = req.file.originalname;
        const fileSize = req.file.size;

        // Parse PDF
        const pdfData = await parsePDF(filePath);

        // Store metadata
        const storedPDF = storePDFMetadata(
            userId,
            req.file.filename,
            originalName,
            pdfData.text,
            fileSize
        );

        res.json({
            success: true,
            message: 'PDF uploaded successfully',
            pdf: {
                id: storedPDF.id,
                filename: storedPDF.originalName,
                size: fileSize,
                pages: pdfData.numPages,
                uploadedAt: storedPDF.uploadedAt
            },
            preview: pdfData.text.substring(0, 500) + '...'
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up file if error occurred
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, () => {});
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to upload PDF'
        });
    }
};

// Get user's PDFs
const getPDFs = (req, res) => {
    try {
        const userId = req.user.id;
        const pdfs = getUserPDFs(userId);

        // Format response
        const formattedPDFs = pdfs.map(pdf => ({
            id: pdf.id,
            name: pdf.originalName,
            size: pdf.size,
            uploadedAt: pdf.uploadedAt,
            lastAccessed: pdf.lastAccessed
        }));

        res.json({
            success: true,
            pdfs: formattedPDFs
        });

    } catch (error) {
        console.error('Get PDFs error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch PDFs'
        });
    }
};

// Generate study materials from PDF
const generateFromPDF = async (req, res) => {
    try {
        const { pdfId, type } = req.body;
        const userId = req.user.id;

        if (!pdfId || !type) {
            return res.status(400).json({
                success: false,
                message: 'PDF ID and type are required'
            });
        }

        // Get PDF
        const pdf = getPDFById(pdfId, userId);
        
        if (!pdf || !pdf.text) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found'
            });
        }

        // Generate study material
        const material = await generateStudyMaterial(pdf.text, type);

        res.json({
            success: true,
            type,
            material
        });

    } catch (error) {
        console.error('Generate from PDF error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate study material'
        });
    }
};

// Delete PDF
const deletePDF = (req, res) => {
    try {
        const { pdfId } = req.params;
        const userId = req.user.id;

        const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
        const pdfs = JSON.parse(fs.readFileSync(pdfsFile, 'utf8'));

        const pdfIndex = pdfs.findIndex(pdf => pdf.id === pdfId && pdf.userId === userId);

        if (pdfIndex === -1) {
            return res.status(404).json({
                success: false,
                message: 'PDF not found'
            });
        }

        // Delete file from uploads
        const pdf = pdfs[pdfIndex];
        const filePath = path.join(__dirname, '..', 'uploads', 'pdfs', pdf.filename);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Remove from JSON
        pdfs.splice(pdfIndex, 1);
        fs.writeFileSync(pdfsFile, JSON.stringify(pdfs, null, 2));

        res.json({
            success: true,
            message: 'PDF deleted successfully'
        });

    } catch (error) {
        console.error('Delete PDF error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete PDF'
        });
    }
};

module.exports = {
    uploadPDF,
    getPDFs,
    generateFromPDF,
    deletePDF
};
