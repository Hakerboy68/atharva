// Main Application
class AuraAIApp {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.currentChat = [];
        this.selectedPDF = null;
        this.currentSection = 'chat';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserPDFs();
        this.setupTheme();
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });

        // Chat input
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (messageInput) {
            messageInput.addEventListener('input', this.autoResizeTextarea.bind(this));
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Clear chat
        const clearChatBtn = document.getElementById('clearChatBtn');
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', () => this.clearChat());
        }

        // New chat
        const newChatBtn = document.getElementById('newChatBtn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', () => this.startNewChat());
        }

        // Voice button
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                if (VoiceAssistant) {
                    VoiceAssistant.toggleListening();
                }
            });
        }

        // PDF upload
        this.setupPDFUpload();
        
        // Study tools
        this.setupStudyTools();
        
        // Question paper generator
        this.setupQuestionPaperGenerator();
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', () => this.toggleTheme());
        }
    }

    // Auto-resize textarea
    autoResizeTextarea(e) {
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    // Switch between sections
    switchSection(section) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Update active section
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === section + 'Section');
        });

        this.currentSection = section;
    }

    // Send message to AI
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) {
            Auth.showToast('Warning', 'Please enter a message', 'warning');
            return;
        }

        // Add user message to chat
        this.addMessageToChat(message, 'user');
        
        // Clear input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Get response mode
        const responseMode = document.getElementById('responseMode').value;
        
        // Show loading
        const loadingId = this.showLoadingMessage();

        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message,
                    mode: responseMode
                })
            });

            const data = await response.json();

            // Remove loading
            this.removeLoadingMessage(loadingId);

            if (data.success) {
                this.addMessageToChat(data.response, 'ai');
                
                // Auto-read if enabled
                if (VoiceAssistant) {
                    VoiceAssistant.autoReadResponse(data.response);
                }
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.removeLoadingMessage(loadingId);
            this.addMessageToChat('Sorry, I encountered an error. Please try again.', 'ai');
            Auth.showToast('Error', error.message || 'Failed to get response', 'error');
        }
    }

    // Add message to chat UI
    addMessageToChat(text, sender) {
        const chatMessages = document.getElementById('chatMessages');
        
        // Remove welcome message if it's the first user message
        if (sender === 'user' && this.currentChat.length === 0) {
            const welcomeMessage = document.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
        }

        const messageId = Date.now();
        const message = {
            id: messageId,
            text,
            sender,
            timestamp: new Date().toLocaleTimeString()
        };

        this.currentChat.push(message);

        const messageElement = document.createElement('div');
        messageElement.className = `${sender}-message`;
        messageElement.innerHTML = this.createMessageHTML(message);
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Create message HTML
    createMessageHTML(message) {
        const isAI = message.sender === 'ai';
        const avatarIcon = isAI ? 'fas fa-robot' : 'fas fa-user';
        const avatarColor = isAI ? 'primary-gradient' : 'secondary-gradient';
        
        // Format text with markdown-like formatting
        let formattedText = this.formatMessageText(message.text);
        
        return `
            <div class="message-avatar" style="background: var(--${avatarColor})">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-text">${formattedText}</div>
                <div class="message-time">${message.timestamp}</div>
                ${isAI ? `
                    <div class="message-actions">
                        <button class="message-action-btn" onclick="AuraAI.copyMessage('${this.escapeHTML(message.text)}')" title="Copy">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="message-action-btn" onclick="AuraAI.regenerateLastMessage()" title="Regenerate">
                            <i class="fas fa-redo"></i>
                        </button>
                        <button class="message-action-btn" onclick="VoiceAssistant.speak('${this.escapeForSpeech(message.text)}')" title="Read aloud">
                            <i class="fas fa-volume-up"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    // Format message text (simple markdown)
    formatMessageText(text) {
        // Convert code blocks
        text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
        
        // Convert inline code
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert bold
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        
        // Convert italics
        text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        
        // Convert lists
        text = text.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
        
        // Convert numbered lists
        text = text.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');
        text = text.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');
        
        // Convert line breaks
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    // Escape HTML
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Escape for speech
    escapeForSpeech(text) {
        return text.replace(/['"`]/g, '').substring(0, 2000);
    }

    // Show loading message
    showLoadingMessage() {
        const chatMessages = document.getElementById('chatMessages');
        const loadingId = 'loading-' + Date.now();
        
        const loadingElement = document.createElement('div');
        loadingElement.id = loadingId;
        loadingElement.className = 'ai-message';
        loadingElement.innerHTML = `
            <div class="message-avatar" style="background: var(--primary-gradient)">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <div class="skeleton" style="width: 100px; height: 20px; margin-bottom: 10px;"></div>
                    <div class="skeleton" style="width: 80%; height: 15px; margin-bottom: 5px;"></div>
                    <div class="skeleton" style="width: 90%; height: 15px; margin-bottom: 5px;"></div>
                    <div class="skeleton" style="width: 70%; height: 15px;"></div>
                </div>
            </div>
        `;
        
        chatMessages.appendChild(loadingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return loadingId;
    }

    // Remove loading message
    removeLoadingMessage(loadingId) {
        const loadingElement = document.getElementById(loadingId);
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    // Clear chat
    clearChat() {
        if (this.currentChat.length === 0) {
            Auth.showToast('Info', 'Chat is already empty', 'info');
            return;
        }

        if (confirm('Are you sure you want to clear the chat?')) {
            this.currentChat = [];
            const chatMessages = document.getElementById('chatMessages');
            chatMessages.innerHTML = `
                <div class="welcome-message">
                    <div class="ai-message">
                        <div class="message-avatar">
                            <i class="fas fa-robot"></i>
                        </div>
                        <div class="message-content">
                            <h3>👋 Hello! I'm Aura AI, your personal study assistant</h3>
                            <p>I can help you with:</p>
                            <ul>
                                <li>📚 Answering study questions</li>
                                <li>📄 Analyzing PDF documents</li>
                                <li>🎯 Generating study materials</li>
                                <li>🎤 Voice explanations</li>
                                <li>📝 Creating question papers</li>
                            </ul>
                            <p>Ask me anything or upload a PDF to get started!</p>
                        </div>
                    </div>
                </div>
            `;
            Auth.showToast('Success', 'Chat cleared', 'success');
        }
    }

    // Start new chat
    startNewChat() {
        this.clearChat();
    }

    // Copy message to clipboard
    copyMessage(text) {
        navigator.clipboard.writeText(text).then(() => {
            Auth.showToast('Success', 'Message copied to clipboard', 'success');
        }).catch(err => {
            Auth.showToast('Error', 'Failed to copy message', 'error');
        });
    }

    // Regenerate last message
    async regenerateLastMessage() {
        const lastUserMessage = this.currentChat
            .filter(msg => msg.sender === 'user')
            .pop();
        
        if (!lastUserMessage) {
            Auth.showToast('Warning', 'No previous message to regenerate', 'warning');
            return;
        }

        // Remove last AI response
        const chatMessages = document.getElementById('chatMessages');
        const messages = chatMessages.querySelectorAll('.ai-message');
        if (messages.length > 0) {
            messages[messages.length - 1].remove();
        }

        // Remove from current chat
        this.currentChat = this.currentChat.filter(msg => 
            !(msg.sender === 'ai' && msg.id > lastUserMessage.id)
        );

        // Show loading and send message again
        const loadingId = this.showLoadingMessage();
        
        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: lastUserMessage.text,
                    mode: document.getElementById('responseMode').value
                })
            });

            const data = await response.json();
            this.removeLoadingMessage(loadingId);

            if (data.success) {
                this.addMessageToChat(data.response, 'ai');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            this.removeLoadingMessage(loadingId);
            Auth.showToast('Error', error.message || 'Failed to regenerate response', 'error');
        }
    }

    // Setup PDF upload
    setupPDFUpload() {
        const uploadBtn = document.getElementById('uploadBtn');
        const uploadPdfBtn = document.getElementById('uploadPdfBtn');
        const browsePdfBtn = document.getElementById('browsePdfBtn');
        const pdfFileInput = document.getElementById('pdfFileInput');
        const modalPdfInput = document.getElementById('modalPdfInput');
        const browseModalBtn = document.getElementById('browseModalBtn');
        const uploadDropzone = document.getElementById('uploadDropzone');
        const pdfUploadModal = document.getElementById('pdfUploadModal');

        // Open modal from various buttons
        [uploadBtn, uploadPdfBtn, browsePdfBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.openPDFModal();
                });
            }
        });

        // Browse button in modal
        if (browseModalBtn) {
            browseModalBtn.addEventListener('click', () => {
                modalPdfInput.click();
            });
        }

        // File input change
        [pdfFileInput, modalPdfInput].forEach(input => {
            if (input) {
                input.addEventListener('change', (e) => this.handleFileSelect(e));
            }
        });

        // Drag and drop
        if (uploadDropzone) {
            uploadDropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadDropzone.style.borderColor = '#667eea';
                uploadDropzone.style.background = 'rgba(102, 126, 234, 0.1)';
            });

            uploadDropzone.addEventListener('dragleave', () => {
                uploadDropzone.style.borderColor = '';
                uploadDropzone.style.background = '';
            });

            uploadDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadDropzone.style.borderColor = '';
                uploadDropzone.style.background = '';
                
                if (e.dataTransfer.files.length > 0) {
                    this.handleFileUpload(e.dataTransfer.files[0]);
                }
            });
        }

        // Close modal
        const closeModalBtn = pdfUploadModal?.querySelector('.close-modal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                this.closePDFModal();
            });
        }

        // Close modal on outside click
        pdfUploadModal?.addEventListener('click', (e) => {
            if (e.target === pdfUploadModal) {
                this.closePDFModal();
            }
        });
    }

    // Open PDF upload modal
    openPDFModal() {
        const modal = document.getElementById('pdfUploadModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    // Close PDF upload modal
    closePDFModal() {
        const modal = document.getElementById('pdfUploadModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // Handle file selection
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFileUpload(file);
        }
    }

    // Handle file upload
    async handleFileUpload(file) {
        // Validate file
        if (!file.type.includes('pdf')) {
            Auth.showToast('Error', 'Please upload a PDF file', 'error');
            return;
        }

        if (file.size > 100 * 1024 * 1024) { // 100MB
            Auth.showToast('Error', 'File size must be less than 100MB', 'error');
            return;
        }

        // Show upload progress
        this.showUploadProgress();

        const formData = new FormData();
        formData.append('pdf', file);

        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/files/upload-pdf`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                Auth.showToast('Success', 'PDF uploaded successfully', 'success');
                this.closePDFModal();
                this.loadUserPDFs();
                this.selectPDF(data.pdf.id);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Auth.showToast('Error', error.message || 'Failed to upload PDF', 'error');
        } finally {
            this.hideUploadProgress();
        }
    }

    // Show upload progress
    showUploadProgress() {
        const progress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progress && progressFill && progressText) {
            progress.style.display = 'block';
            
            // Simulate progress (in real app, use actual upload progress)
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                progressFill.style.width = `${progress}%`;
                
                if (progress >= 90) {
                    clearInterval(interval);
                }
            }, 100);
        }
    }

    // Hide upload progress
    hideUploadProgress() {
        const progress = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        
        if (progress && progressFill) {
            progressFill.style.width = '100%';
            setTimeout(() => {
                progress.style.display = 'none';
                progressFill.style.width = '0%';
            }, 500);
        }
    }

    // Load user PDFs
    async loadUserPDFs() {
        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/files/pdfs`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (data.success) {
                this.displayPDFs(data.pdfs);
            }
        } catch (error) {
            console.error('Failed to load PDFs:', error);
        }
    }

    // Display PDFs
    displayPDFs(pdfs) {
        const pdfList = document.getElementById('pdfList');
        const pdfListContainer = document.getElementById('pdfListContainer');
        const pdfUploadArea = document.getElementById('pdfUploadArea');
        const pdfTools = document.getElementById('pdfTools');

        if (!pdfList || !pdfListContainer) return;

        if (pdfs.length === 0) {
            pdfListContainer.style.display = 'none';
            pdfUploadArea.style.display = 'block';
            if (pdfTools) pdfTools.style.display = 'none';
            return;
        }

        pdfUploadArea.style.display = 'none';
        pdfListContainer.style.display = 'block';
        if (pdfTools) pdfTools.style.display = 'block';

        pdfList.innerHTML = pdfs.map(pdf => `
            <div class="pdf-item ${this.selectedPDF === pdf.id ? 'selected' : ''}" 
                 data-id="${pdf.id}" 
                 data-name="${pdf.name}">
                <div class="pdf-item-header">
                    <i class="fas fa-file-pdf pdf-icon"></i>
                    <div class="pdf-name" title="${pdf.name}">${pdf.name}</div>
                </div>
                <div class="pdf-meta">
                    <span>${this.formatFileSize(pdf.size)}</span>
                    <span>${new Date(pdf.uploadedAt).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');

        // Add click listeners
        pdfList.querySelectorAll('.pdf-item').forEach(item => {
            item.addEventListener('click', () => {
                const pdfId = item.dataset.id;
                const pdfName = item.dataset.name;
                this.selectPDF(pdfId, pdfName);
            });
        });
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Select PDF
    selectPDF(pdfId, pdfName = '') {
        this.selectedPDF = pdfId;
        
        // Update UI
        document.querySelectorAll('.pdf-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === pdfId);
        });
        
        // Update selected PDF info
        const selectedPdfName = document.getElementById('selectedPdfName');
        if (selectedPdfName) {
            selectedPdfName.textContent = pdfName || 'None';
        }
        
        Auth.showToast('Success', `PDF "${pdfName}" selected`, 'success');
    }

    // Setup study tools
    setupStudyTools() {
        // Tool buttons
        document.querySelectorAll('.tool-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const toolId = e.target.closest('.tool-card').id;
                this.openToolModal(toolId);
            });
        });

        // PDF tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.target.closest('.tool-btn').dataset.type;
                this.generateFromPDF(type);
            });
        });

        // Question generator modal
        const generateQuestionsBtn = document.getElementById('generateQuestionsBtn');
        if (generateQuestionsBtn) {
            generateQuestionsBtn.addEventListener('click', () => this.generateQuestions());
        }

        // Close modal buttons
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.tool-modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // Open tool modal
    openToolModal(toolId) {
        const modal = document.getElementById(toolId + 'Modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    // Generate questions
    async generateQuestions() {
        const topics = document.getElementById('questionTopics').value;
        const type = document.getElementById('questionType').value;
        const count = document.getElementById('questionCount').value;

        if (!topics.trim()) {
            Auth.showToast('Warning', 'Please enter topics', 'warning');
            return;
        }

        const modal = document.getElementById('questionGeneratorModal');
        const generateBtn = document.getElementById('generateQuestionsBtn');
        const originalText = generateBtn.innerHTML;
        
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/ai/generate-questions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    topics,
                    type,
                    count: parseInt(count)
                })
            });

            const data = await response.json();

            if (data.success) {
                // Switch to chat section and add questions
                this.switchSection('chat');
                this.addMessageToChat(data.response, 'ai');
                modal.classList.remove('active');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Auth.showToast('Error', error.message || 'Failed to generate questions', 'error');
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    // Generate from PDF
    async generateFromPDF(type) {
        if (!this.selectedPDF) {
            Auth.showToast('Warning', 'Please select a PDF first', 'warning');
            return;
        }

        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/files/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    pdfId: this.selectedPDF,
                    type
                })
            });

            const data = await response.json();

            if (data.success) {
                // Switch to chat section and add generated content
                this.switchSection('chat');
                this.addMessageToChat(data.material, 'ai');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Auth.showToast('Error', error.message || 'Failed to generate content', 'error');
        }
    }

    // Setup question paper generator
    setupQuestionPaperGenerator() {
        const generatePaperBtn = document.getElementById('generatePaperBtn');
        const copyPaperBtn = document.getElementById('copyPaperBtn');
        const downloadPaperBtn = document.getElementById('downloadPaperBtn');

        if (generatePaperBtn) {
            generatePaperBtn.addEventListener('click', () => this.generateQuestionPaper());
        }

        if (copyPaperBtn) {
            copyPaperBtn.addEventListener('click', () => this.copyQuestionPaper());
        }

        if (downloadPaperBtn) {
            downloadPaperBtn.addEventListener('click', () => this.downloadQuestionPaper());
        }
    }

    // Generate question paper
    async generateQuestionPaper() {
        const topics = document.getElementById('paperTopics').value;
        const difficulty = document.getElementById('paperDifficulty').value;
        const marks = document.getElementById('paperMarks').value;
        const duration = document.getElementById('paperDuration').value;
        const instructions = document.getElementById('paperInstructions').value;

        if (!topics.trim()) {
            Auth.showToast('Warning', 'Please enter topics/subject', 'warning');
            return;
        }

        const generateBtn = document.getElementById('generatePaperBtn');
        const originalText = generateBtn.innerHTML;
        
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        generateBtn.disabled = true;

        try {
            const token = Auth.getToken();
            const response = await fetch(`${this.baseURL}/ai/question-paper`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    topics,
                    difficulty,
                    marks: parseInt(marks),
                    duration: parseInt(duration),
                    instructions
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayQuestionPaper(data.response);
                Auth.showToast('Success', 'Question paper generated successfully', 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            Auth.showToast('Error', error.message || 'Failed to generate question paper', 'error');
        } finally {
            generateBtn.innerHTML = originalText;
            generateBtn.disabled = false;
        }
    }

    // Display question paper
    displayQuestionPaper(content) {
        const previewContent = document.getElementById('previewContent');
        if (previewContent) {
            previewContent.innerHTML = this.formatMessageText(content);
            previewContent.dataset.content = content;
        }
    }

    // Copy question paper
    copyQuestionPaper() {
        const previewContent = document.getElementById('previewContent');
        const content = previewContent?.dataset.content;
        
        if (!content) {
            Auth.showToast('Warning', 'No question paper to copy', 'warning');
            return;
        }

        navigator.clipboard.writeText(content).then(() => {
            Auth.showToast('Success', 'Question paper copied to clipboard', 'success');
        }).catch(err => {
            Auth.showToast('Error', 'Failed to copy question paper', 'error');
        });
    }

    // Download question paper
    downloadQuestionPaper() {
        const previewContent = document.getElementById('previewContent');
        const content = previewContent?.dataset.content;
        
        if (!content) {
            Auth.showToast('Warning', 'No question paper to download', 'warning');
            return;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `question-paper-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        Auth.showToast('Success', 'Question paper downloaded', 'success');
    }

    // Setup theme
    setupTheme() {
        const savedTheme = localStorage.getItem('aura_ai_theme');
        const themeToggle = document.getElementById('themeToggle');
        
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
            if (themeToggle) themeToggle.checked = true;
        }
    }

    // Toggle theme
    toggleTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle.checked) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('aura_ai_theme', 'dark');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('aura_ai_theme', 'light');
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.AuraAI = new AuraAIApp();
});

// Login and Register pages (simplified versions)
if (window.location.pathname.includes('login.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Add login page specific styling
        const style = document.createElement('style');
        style.textContent = `
            .auth-container {
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 20px;
            }
            
            .auth-card {
                background: white;
                border-radius: 20px;
                padding: 40px;
                width: 100%;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .auth-logo {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .auth-logo i {
                font-size: 3rem;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 10px;
            }
            
            .auth-logo h1 {
                color: #333;
                font-size: 2rem;
                margin: 0;
            }
            
            .auth-form .form-group {
                margin-bottom: 20px;
            }
            
            .auth-form label {
                display: block;
                margin-bottom: 8px;
                color: #555;
                font-weight: 500;
            }
            
            .auth-form input {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                font-size: 1rem;
                transition: all 0.3s ease;
            }
            
            .auth-form input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .auth-btn {
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: transform 0.3s ease;
            }
            
            .auth-btn:hover {
                transform: translateY(-2px);
            }
            
            .auth-footer {
                text-align: center;
                margin-top: 20px;
                color: #666;
            }
            
            .auth-link {
                color: #667eea;
                text-decoration: none;
                font-weight: 500;
                cursor: pointer;
            }
            
            .auth-link:hover {
                text-decoration: underline;
            }
        `;
        document.head.appendChild(style);
    });
}

if (window.location.pathname.includes('register.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        // Use same styles as login page
    });
}
