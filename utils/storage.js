const path = require('path');
const fs = require('fs');

// Store PDF metadata
const storePDFMetadata = (userId, filename, originalName, text, size) => {
    const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
    let pdfs = [];
    
    if (fs.existsSync(pdfsFile)) {
        const data = fs.readFileSync(pdfsFile, 'utf8');
        pdfs = JSON.parse(data);
    }
    
    const pdfData = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        userId,
        filename,
        originalName,
        text,
        size,
        uploadedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString()
    };
    
    pdfs.push(pdfData);
    fs.writeFileSync(pdfsFile, JSON.stringify(pdfs, null, 2));
    
    return pdfData;
};

// Update PDF last accessed time
const updatePDFAccess = (pdfId) => {
    const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
    
    if (!fs.existsSync(pdfsFile)) return;
    
    const pdfs = JSON.parse(fs.readFileSync(pdfsFile, 'utf8'));
    const pdfIndex = pdfs.findIndex(pdf => pdf.id === pdfId);
    
    if (pdfIndex !== -1) {
        pdfs[pdfIndex].lastAccessed = new Date().toISOString();
        fs.writeFileSync(pdfsFile, JSON.stringify(pdfs, null, 2));
    }
};

// Get user's PDFs
const getUserPDFs = (userId) => {
    const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
    
    if (!fs.existsSync(pdfsFile)) return [];
    
    const pdfs = JSON.parse(fs.readFileSync(pdfsFile, 'utf8'));
    return pdfs.filter(pdf => pdf.userId === userId);
};

// Get specific PDF by ID
const getPDFById = (pdfId, userId) => {
    const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
    
    if (!fs.existsSync(pdfsFile)) return null;
    
    const pdfs = JSON.parse(fs.readFileSync(pdfsFile, 'utf8'));
    return pdfs.find(pdf => pdf.id === pdfId && pdf.userId === userId);
};

module.exports = {
    storePDFMetadata,
    updatePDFAccess,
    getUserPDFs,
    getPDFById
};
