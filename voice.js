// Voice Features
class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = speechSynthesis;
        this.isListening = false;
        this.isSpeaking = false;
        this.currentUtterance = null;
        this.voiceHistory = [];
        this.init();
    }

    init() {
        this.initSpeechRecognition();
        this.initSpeechSynthesis();
        this.setupEventListeners();
    }

    // Initialize speech recognition
    initSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
        } else if ('SpeechRecognition' in window) {
            this.recognition = new SpeechRecognition();
        } else {
            console.warn('Speech recognition not supported');
            return;
        }

        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceUI('listening');
        };

        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }
            
            if (transcript) {
                this.handleVoiceInput(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateVoiceUI('error');
            
            if (event.error === 'not-allowed') {
                Auth.showToast('Error', 'Microphone access denied. Please allow microphone access.', 'error');
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.updateVoiceUI('ready');
        };
    }

    // Initialize speech synthesis
    initSpeechSynthesis() {
        this.synthesis.onvoiceschanged = () => {
            this.voices = this.synthesis.getVoices();
        };
    }

    // Setup event listeners
    setupEventListeners() {
        // Voice record button
        const voiceRecordBtn = document.getElementById('voiceRecordBtn');
        if (voiceRecordBtn) {
            voiceRecordBtn.addEventListener('click', () => this.toggleListening());
        }

        // Voice read button
        const voiceReadBtn = document.getElementById('voiceReadBtn');
        if (voiceReadBtn) {
            voiceReadBtn.addEventListener('click', () => this.readLastResponse());
        }

        // Voice pause button
        const voicePauseBtn = document.getElementById('voicePauseBtn');
        if (voicePauseBtn) {
            voicePauseBtn.addEventListener('click', () => this.togglePause());
        }

        // Voice stop button
        const voiceStopBtn = document.getElementById('voiceStopBtn');
        if (voiceStopBtn) {
            voiceStopBtn.addEventListener('click', () => this.stopSpeaking());
        }

        // Voice speed control
        const voiceSpeed = document.getElementById('voiceSpeed');
        if (voiceSpeed) {
            voiceSpeed.addEventListener('input', (e) => {
                const speedValue = document.getElementById('speedValue');
                speedValue.textContent = `${e.target.value}x`;
            });
        }

        // Auto-read toggle
        const autoReadToggle = document.getElementById('autoReadToggle');
        if (autoReadToggle) {
            autoReadToggle.addEventListener('change', (e) => {
                localStorage.setItem('autoRead', e.target.checked);
            });
            
            // Load saved preference
            const savedPreference = localStorage.getItem('autoRead');
            if (savedPreference !== null) {
                autoReadToggle.checked = savedPreference === 'true';
            }
        }
    }

    // Toggle listening state
    toggleListening() {
        if (!this.recognition) {
            Auth.showToast('Error', 'Speech recognition not supported in your browser', 'error');
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    // Handle voice input
    handleVoiceInput(transcript) {
        // Display transcript
        const transcriptElement = document.getElementById('voiceTranscript');
        if (transcriptElement) {
            transcriptElement.textContent = transcript;
        }

        // Add to voice history
        this.addToHistory(transcript, 'input');

        // Send to chat input if in chat section
        const messageInput = document.getElementById('messageInput');
        const chatSection = document.getElementById('chatSection');
        
        if (messageInput && chatSection && chatSection.classList.contains('active')) {
            messageInput.value = transcript;
            messageInput.focus();
            
            // Auto-send if it ends with a question mark or is longer than 20 chars
            if (transcript.trim().endsWith('?') || transcript.length > 20) {
                setTimeout(() => {
                    document.getElementById('sendBtn').click();
                }, 500);
            }
        }
    }

    // Read text aloud
    speak(text) {
        if (!this.synthesis || !text) return;

        // Stop any ongoing speech
        this.stopSpeaking();

        // Create new utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        
        // Configure utterance
        this.currentUtterance.rate = parseFloat(document.getElementById('voiceSpeed')?.value || 1);
        this.currentUtterance.pitch = 1;
        this.currentUtterance.volume = 1;
        
        // Select a voice
        if (this.voices && this.voices.length > 0) {
            const englishVoice = this.voices.find(voice => voice.lang.startsWith('en'));
            if (englishVoice) {
                this.currentUtterance.voice = englishVoice;
            }
        }

        // Event handlers
        this.currentUtterance.onstart = () => {
            this.isSpeaking = true;
            this.updateSpeechControls(true);
        };

        this.currentUtterance.onend = () => {
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.updateSpeechControls(false);
        };

        this.currentUtterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.updateSpeechControls(false);
        };

        // Speak
        this.synthesis.speak(this.currentUtterance);
    }

    // Read last AI response
    readLastResponse() {
        const aiMessages = document.querySelectorAll('.ai-message .message-text');
        if (aiMessages.length > 0) {
            const lastMessage = aiMessages[aiMessages.length - 1];
            const text = this.extractTextFromElement(lastMessage);
            this.speak(text);
            this.addToHistory(text, 'output');
        } else {
            Auth.showToast('Info', 'No AI response to read', 'info');
        }
    }

    // Extract text from element
    extractTextFromElement(element) {
        let text = '';
        
        // Clone element to avoid modifying original
        const clone = element.cloneNode(true);
        
        // Remove action buttons
        const buttons = clone.querySelectorAll('.message-actions');
        buttons.forEach(btn => btn.remove());
        
        // Get text content
        text = clone.textContent.trim();
        
        // Clean up text
        text = text.replace(/\s+/g, ' ');
        
        return text;
    }

    // Toggle pause/resume
    togglePause() {
        if (this.isSpeaking) {
            if (this.synthesis.speaking && !this.synthesis.paused) {
                this.synthesis.pause();
                document.getElementById('voicePauseBtn').innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';
            } else {
                this.synthesis.resume();
                document.getElementById('voicePauseBtn').innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
            }
        }
    }

    // Stop speaking
    stopSpeaking() {
        if (this.synthesis.speaking) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.currentUtterance = null;
            this.updateSpeechControls(false);
        }
    }

    // Update voice UI state
    updateVoiceUI(state) {
        const voiceRecordBtn = document.getElementById('voiceRecordBtn');
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (!voiceRecordBtn || !voiceStatus) return;

        const states = {
            ready: {
                btnClass: '',
                btnText: '<i class="fas fa-microphone"></i><span>Start Speaking</span>',
                statusClass: '',
                statusText: 'Ready to listen'
            },
            listening: {
                btnClass: 'listening',
                btnText: '<i class="fas fa-stop"></i><span>Stop Listening</span>',
                statusClass: 'listening',
                statusText: 'Listening...'
            },
            error: {
                btnClass: '',
                btnText: '<i class="fas fa-microphone"></i><span>Start Speaking</span>',
                statusClass: '',
                statusText: 'Error occurred'
            }
        };

        const config = states[state] || states.ready;
        
        voiceRecordBtn.className = `voice-record-btn ${config.btnClass}`;
        voiceRecordBtn.innerHTML = config.btnText;
        
        voiceStatus.className = `voice-status ${config.statusClass}`;
        voiceStatus.innerHTML = `<i class="fas fa-circle"></i><span>${config.statusText}</span>`;
    }

    // Update speech controls
    updateSpeechControls(isSpeaking) {
        const pauseBtn = document.getElementById('voicePauseBtn');
        const stopBtn = document.getElementById('voiceStopBtn');
        
        if (pauseBtn) {
            pauseBtn.disabled = !isSpeaking;
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
        }
        
        if (stopBtn) {
            stopBtn.disabled = !isSpeaking;
        }
    }

    // Add to voice history
    addToHistory(text, type) {
        const historyItem = {
            id: Date.now(),
            text: text.substring(0, 200) + (text.length > 200 ? '...' : ''),
            type: type,
            timestamp: new Date().toLocaleTimeString()
        };

        this.voiceHistory.unshift(historyItem);
        
        // Keep only last 10 items
        if (this.voiceHistory.length > 10) {
            this.voiceHistory.pop();
        }

        this.updateHistoryUI();
    }

    // Update history UI
    updateHistoryUI() {
        const historyList = document.getElementById('voiceHistory');
        if (!historyList) return;

        historyList.innerHTML = this.voiceHistory.map(item => `
            <div class="history-item">
                <div class="history-item-header">
                    <div class="history-item-title">
                        ${item.type === 'input' ? '🎤 You said:' : '🔊 AI said:'}
                    </div>
                    <div class="history-item-time">${item.timestamp}</div>
                </div>
                <div class="history-item-text">${item.text}</div>
            </div>
        `).join('');
    }

    // Auto-read AI responses
    autoReadResponse(responseText) {
        const autoReadToggle = document.getElementById('autoReadToggle');
        if (autoReadToggle && autoReadToggle.checked) {
            setTimeout(() => {
                this.speak(responseText);
            }, 1000);
        }
    }
}

// Initialize voice assistant
let voiceAssistant = null;
document.addEventListener('DOMContentLoaded', () => {
    voiceAssistant = new VoiceAssistant();
    window.VoiceAssistant = voiceAssistant;
});
