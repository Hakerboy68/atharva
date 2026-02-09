const { 
    callGroqAPI, 
    callDeepSeekAPI, 
    generateStudyMaterial,
    generateQuestionPaper,
    getPDFContext,
    loadPDFs,
    savePDFs
} = require('../utils/aiHelper');

// Regular AI chat
const chat = async (req, res) => {
    try {
        const { message, mode = 'detailed' } = req.body;
        
        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        const systemPrompt = mode === 'short' 
            ? 'You are Aura AI. Provide concise, to-the-point answers.'
            : 'You are Aura AI. Provide detailed, step-by-step explanations. Format code properly.';

        const response = await callGroqAPI(message, '', systemPrompt);

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to get AI response'
        });
    }
};

// PDF-based chat
const pdfChat = async (req, res) => {
    try {
        const { message, pdfId } = req.body;
        const userId = req.user.id;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Message is required'
            });
        }

        // Load PDFs
        const pdfs = loadPDFs();
        
        // Find the PDF
        let pdfContext = '';
        if (pdfId) {
            const pdf = pdfs.find(p => p.id === pdfId && p.userId === userId);
            if (pdf && pdf.text) {
                pdfContext = pdf.text.substring(0, 3000); // Limit context size
            }
        } else {
            // Get all user's PDFs for context
            const userPDFs = pdfs.filter(p => p.userId === userId);
            pdfContext = userPDFs
                .map(p => p.text ? p.text.substring(0, 1000) : '')
                .join('\n\n')
                .substring(0, 4000);
        }

        const systemPrompt = `You are Aura AI, a study assistant. Answer questions based on the provided PDF context. If the question isn't covered in the context, say so and provide general information.`;

        const response = await callGroqAPI(message, pdfContext, systemPrompt);

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('PDF Chat error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to process PDF chat'
        });
    }
};

// Generate questions
const generateQuestions = async (req, res) => {
    try {
        const { type = 'mixed', count = 10, topics } = req.body;

        let prompt = `Generate ${count} ${type} questions`;
        if (topics) {
            prompt += ` on the following topics: ${topics}`;
        }
        prompt += `. Include answers for each question.`;

        const systemPrompt = `You are an expert question generator. Create clear, educational questions with accurate answers.`;

        const response = await callGroqAPI(prompt, '', systemPrompt);

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Generate questions error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate questions'
        });
    }
};

// Generate summary
const summarize = async (req, res) => {
    try {
        const { text, length = 'medium' } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const lengthPrompts = {
            short: 'Provide a very brief summary (2-3 sentences)',
            medium: 'Provide a concise summary (1 paragraph)',
            detailed: 'Provide a comprehensive summary with key points'
        };

        const prompt = `${lengthPrompts[length] || lengthPrompts.medium} of the following text:\n\n${text}`;

        const response = await callGroqAPI(prompt, '', 'You are a summarization expert. Create clear, accurate summaries.');

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Summarize error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate summary'
        });
    }
};

// Generate notes
const generateNotes = async (req, res) => {
    try {
        const { text, format = 'structured' } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Text is required'
            });
        }

        const formatPrompts = {
            structured: 'Organize notes with headings, bullet points, and key terms',
            outline: 'Create an outline format with main topics and subtopics',
            detailed: 'Create detailed notes with explanations and examples'
        };

        const prompt = `Create study notes from the following text. ${formatPrompts[format] || formatPrompts.structured}:\n\n${text}`;

        const response = await callGroqAPI(prompt, '', 'You are a study notes expert. Create organized, easy-to-understand notes.');

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Generate notes error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate notes'
        });
    }
};

// Generate question paper
const createQuestionPaper = async (req, res) => {
    try {
        const { topics, difficulty, marks, duration } = req.body;

        if (!topics || !difficulty || !marks || !duration) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: topics, difficulty, marks, duration'
            });
        }

        const response = await generateQuestionPaper(topics, difficulty, marks, duration);

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Question paper error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate question paper'
        });
    }
};

// Explain concept
const explainConcept = async (req, res) => {
    try {
        const { concept, level = 'intermediate' } = req.body;

        if (!concept) {
            return res.status(400).json({
                success: false,
                message: 'Concept is required'
            });
        }

        const levelPrompts = {
            beginner: 'Explain like I\'m 10 years old. Use simple language and analogies.',
            intermediate: 'Explain for a high school student. Include examples.',
            expert: 'Provide an in-depth, technical explanation.'
        };

        const prompt = `${levelPrompts[level] || levelPrompts.intermediate}\n\nConcept: ${concept}`;

        const response = await callGroqAPI(prompt, '', 'You are an expert educator. Adapt your explanation to the requested level.');

        res.json({
            success: true,
            response
        });

    } catch (error) {
        console.error('Explain concept error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to explain concept'
        });
    }
};

module.exports = {
    chat,
    pdfChat,
    generateQuestions,
    summarize,
    generateNotes,
    createQuestionPaper,
    explainConcept
};
