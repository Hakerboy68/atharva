const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all AI routes
router.use(authMiddleware);

// AI Chat routes
router.post('/chat', aiController.chat);
router.post('/pdf-chat', aiController.pdfChat);
router.post('/generate-questions', aiController.generateQuestions);
router.post('/summarize', aiController.summarize);
router.post('/notes', aiController.generateNotes);
router.post('/question-paper', aiController.createQuestionPaper);
router.post('/explain', aiController.explainConcept);

module.exports = router;
