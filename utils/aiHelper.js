const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load PDFs from JSON file
const loadPDFs = () => {
    const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
    const data = fs.readFileSync(pdfsFile, 'utf8');
    return JSON.parse(data);
};

// Save PDFs to JSON file
const savePDFs = (pdfs) => {
    const pdfsFile = path.join(__dirname, '..', 'data', 'pdfs.json');
    fs.writeFileSync(pdfsFile, JSON.stringify(pdfs, null, 2));
};

// Get PDF context for a user
const getPDFContext = (userId) => {
    const pdfs = loadPDFs();
    return pdfs.filter(pdf => pdf.userId === userId && pdf.text);
};

// Call Groq API (Fast responses)
const callGroqAPI = async (prompt, context = '', systemPrompt = '') => {
    try {
        const response = await axios.post(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                model: 'llama3-70b-8192', // Fast and capable model
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt || 'You are Aura AI, a helpful study assistant. Provide clear, detailed explanations. Format code with proper syntax highlighting.'
                    },
                    {
                        role: 'user',
                        content: context ? `Context from PDF: ${context}\n\nQuestion: ${prompt}` : prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 second timeout
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('Groq API Error:', error.response?.data || error.message);
        
        // Fallback to DeepSeek
        if (process.env.DEEPSEEK_API_KEY) {
            console.log('Falling back to DeepSeek API');
            return callDeepSeekAPI(prompt, context, systemPrompt);
        }
        
        throw new Error('AI service unavailable. Please try again.');
    }
};

// Call DeepSeek API (Better reasoning)
const callDeepSeekAPI = async (prompt, context = '', systemPrompt = '') => {
    try {
        const response = await axios.post(
            'https://api.deepseek.com/chat/completions',
            {
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt || 'You are Aura AI, an intelligent study assistant. Provide step-by-step explanations and thorough answers.'
                    },
                    {
                        role: 'user',
                        content: context ? `Context from PDF: ${context}\n\nQuestion: ${prompt}` : prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 45000 // 45 second timeout
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('DeepSeek API Error:', error.response?.data || error.message);
        throw new Error('AI service unavailable. Please try again.');
    }
};

// Generate study materials
const generateStudyMaterial = async (pdfText, type) => {
    const prompts = {
        notes: `Generate comprehensive study notes from this text. Organize by topics, highlight key points, and include definitions. Text: ${pdfText}`,
        summary: `Create a concise summary of this text. Include main ideas and key takeaways. Text: ${pdfText}`,
        questions: `Generate 10 important questions from this text with answers. Text: ${pdfText}`,
        mcq: `Generate 15 multiple choice questions from this text with 4 options each and mark correct answer. Text: ${pdfText}`,
        long_answers: `Generate 5 long answer questions from this text with detailed answers. Text: ${pdfText}`,
        important_questions: `Identify and list the 10 most important questions that could be asked from this text. Text: ${pdfText}`
    };

    const systemPrompts = {
        notes: 'You are a study notes expert. Create well-structured, easy-to-understand notes.',
        summary: 'You are a summarization expert. Create clear, concise summaries.',
        questions: 'You are an exam preparation expert. Generate relevant questions.',
        mcq: 'You are a quiz creator. Generate meaningful multiple choice questions.',
        long_answers: 'You are an academic expert. Generate comprehensive long answer questions.',
        important_questions: 'You are an exam predictor. Identify the most important questions.'
    };

    try {
        return await callGroqAPI(
            prompts[type] || prompts.notes,
            '',
            systemPrompts[type] || systemPrompts.notes
        );
    } catch (error) {
        return await callDeepSeekAPI(
            prompts[type] || prompts.notes,
            '',
            systemPrompts[type] || systemPrompts.notes
        );
    }
};

// Generate question paper
const generateQuestionPaper = async (topics, difficulty, marks, duration) => {
    const prompt = `Generate a complete question paper with:
Topics: ${topics}
Difficulty Level: ${difficulty}
Total Marks: ${marks}
Duration: ${duration}

Include:
1. Instructions
2. Section-wise questions
3. Mark distribution
4. Answer key if possible

Make it look professional and exam-ready.`;

    try {
        return await callGroqAPI(prompt, '', 'You are an expert exam paper setter. Create professional, balanced question papers.');
    } catch (error) {
        return await callDeepSeekAPI(prompt, '', 'You are an expert exam paper setter. Create professional, balanced question papers.');
    }
};

module.exports = {
    callGroqAPI,
    callDeepSeekAPI,
    generateStudyMaterial,
    generateQuestionPaper,
    getPDFContext,
    loadPDFs,
    savePDFs
};
