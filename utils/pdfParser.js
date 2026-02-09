const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');

// Parse PDF and extract text
const parsePDF = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        
        return {
            text: data.text,
            numPages: data.numpages,
            info: data.info,
            metadata: data.metadata
        };
    } catch (error) {
        console.error('PDF parsing error:', error);
        throw new Error('Failed to parse PDF');
    }
};

// Extract specific content from PDF
const extractContent = (text, type) => {
    const lines = text.split('\n').filter(line => line.trim());
    
    switch (type) {
        case 'summary':
            // Extract first few lines as summary
            return lines.slice(0, 10).join('\n');
        
        case 'questions':
            // Extract lines that look like questions
            return lines.filter(line => 
                line.includes('?') || 
                line.startsWith('Q.') || 
                line.match(/^\d+[\.\)]/)
            );
        
        case 'headings':
            // Extract potential headings
            return lines.filter(line => 
                line.length < 100 && 
                !line.includes('.') &&
                line === line.toUpperCase()
            );
        
        default:
            return text;
    }
};

// Chunk text for AI processing
const chunkText = (text, maxChunkSize = 3000) => {
    const chunks = [];
    let currentChunk = '';
    
    const sentences = text.split(/[.!?]+/);
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxChunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = sentence + '. ';
        } else {
            currentChunk += sentence + '. ';
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
};

module.exports = {
    parsePDF,
    extractContent,
    chunkText
};
