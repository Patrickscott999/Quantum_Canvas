class ImageStudio {
    constructor() {
        this.currentMode = 'generate';
        this.uploadedFile = null;
        this.selectedStyle = '';
        this.selectedAspect = '1:1';
        this.generatedImages = this.loadHistory();
        this.init();
    }

    init() {
        this.setupModeToggling();
        this.setupStylePresets();
        this.setupAspectRatio();
        this.setupImageGeneration();
        this.setupImageManipulation();
        this.setupImageUpload();
        this.setupQuickActions();
        this.renderGallery();
    }

    setupModeToggling() {
        const modeTabs = document.querySelectorAll('.mode-tab');
        modeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const mode = tab.dataset.mode;
                this.switchMode(mode);
            });
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        
        // Update active tab
        document.querySelectorAll('.mode-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        
        // Show/hide upload section for manipulate mode
        const uploadSection = document.getElementById('manipulate-upload');
        const styleSection = document.querySelector('.style-presets-section');
        const aspectSection = document.querySelector('.aspect-section');
        
        if (mode === 'manipulate') {
            uploadSection.classList.remove('hidden');
            styleSection.style.display = 'none';
            aspectSection.style.display = 'none';
            document.getElementById('prompt-input').placeholder = 'Describe how to modify the image...';
        } else {
            uploadSection.classList.add('hidden');
            styleSection.style.display = 'block';
            aspectSection.style.display = 'block';
            document.getElementById('prompt-input').placeholder = 'Describe the image you want to create...';
        }
        
        // Clear any existing results
        this.resetOutput();
    }

    setupStylePresets() {
        const styleCards = document.querySelectorAll('.style-card');
        styleCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove active class from all cards
                styleCards.forEach(c => c.classList.remove('active'));
                // Add active class to clicked card
                card.classList.add('active');
                // Store selected style
                this.selectedStyle = card.dataset.style;
            });
        });
    }

    setupAspectRatio() {
        const aspectCards = document.querySelectorAll('.aspect-card');
        aspectCards.forEach(card => {
            card.addEventListener('click', () => {
                // Remove active class from all cards
                aspectCards.forEach(c => c.classList.remove('active'));
                // Add active class to clicked card
                card.classList.add('active');
                // Store selected aspect
                this.selectedAspect = card.dataset.aspect;
            });
        });
    }

    setupImageGeneration() {
        const sendBtn = document.getElementById('send-btn');
        const promptInput = document.getElementById('prompt-input');
        
        sendBtn.addEventListener('click', async () => {
            if (this.currentMode === 'generate') {
                const prompt = this.buildPrompt();
                if (!prompt) {
                    this.showError('Please enter a description for your image');
                    return;
                }
                await this.generateImage(prompt);
            } else if (this.currentMode === 'manipulate') {
                const prompt = promptInput.value.trim();
                if (!prompt) {
                    this.showError('Please enter how you want to modify the image');
                    return;
                }
                if (!this.uploadedFile) {
                    this.showError('Please upload an image first');
                    return;
                }
                await this.manipulateImage(prompt);
            }
        });
        
        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
        
        // Auto-resize textarea
        promptInput.addEventListener('input', () => {
            promptInput.style.height = 'auto';
            promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
        });
    }

    buildPrompt() {
        const promptInput = document.getElementById('prompt-input');
        const basePrompt = promptInput.value.trim();
        if (!basePrompt) return '';
        
        let fullPrompt = basePrompt;
        
        // Add style modifier from selected style card
        if (this.selectedStyle) {
            const styleModifiers = {
                'photorealistic': ', photorealistic, high detail, professional photography',
                'anime': ', anime style, manga, vibrant colors',
                'oil-painting': ', oil painting, classical art style, textured brushstrokes',
                '3d-render': ', 3D render, Blender, octane render, volumetric lighting',
                'watercolor': ', watercolor painting, soft washes, artistic',
                'cyberpunk': ', cyberpunk style, neon lights, futuristic, dark atmosphere',
                'fantasy': ', fantasy art, magical, mystical, epic',
                'minimalist': ', minimalist style, clean, simple, geometric'
            };
            fullPrompt += styleModifiers[this.selectedStyle] || '';
        }
        
        // Add aspect ratio instruction from selected aspect card
        if (this.selectedAspect && this.selectedAspect !== '1:1') {
            fullPrompt += `, aspect ratio ${this.selectedAspect}`;
        }
        
        return fullPrompt;
    }

    setupImageManipulation() {
        // Manipulation is now handled by the unified setupImageGeneration function
    }

    setupImageUpload() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('image-input');
        const manipulateBtn = document.getElementById('manipulate-btn');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });
    }

    handleFileUpload(file) {
        if (!file.type.startsWith('image/')) {
            this.showError('Please upload an image file');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            this.showError('Image size must be less than 10MB');
            return;
        }
        
        this.uploadedFile = file;
        this.previewUploadedImage(file);
        
        // Enable send button if we're in manipulate mode
        if (this.currentMode === 'manipulate') {
            document.getElementById('send-btn').disabled = false;
        }
    }

    previewUploadedImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.getElementById('preview-image');
            const uploadContent = document.querySelector('.upload-content');
            
            preview.src = e.target.result;
            preview.classList.remove('hidden');
            uploadContent.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }

    async generateImage(prompt) {
        const button = document.getElementById('send-btn');
        this.setLoading(button, true);
        this.showLoading();

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (data.success) {
                this.showResult(data.imageUrl, prompt, data.note);

                // If we have a description, show it below the image
                if (data.description) {
                    const outputSection = document.getElementById('image-output');
                    const descriptionEl = document.createElement('div');
                    descriptionEl.className = 'ai-description';
                    descriptionEl.style.cssText = `
                        padding: 20px;
                        background: rgba(102, 126, 234, 0.1);
                        border-radius: 8px;
                        margin-top: 15px;
                        font-style: italic;
                        border-left: 4px solid #667eea;
                        line-height: 1.5;
                        color: #333;
                    `;
                    descriptionEl.innerHTML = `<strong>AI Description:</strong><br>${data.description}`;
                    outputSection.appendChild(descriptionEl);
                }

                this.addToGallery({
                    url: data.imageUrl,
                    prompt: prompt,
                    type: 'generated',
                    timestamp: new Date().toISOString(),
                    description: data.description
                });
            } else {
                this.showError(data.error || 'Failed to generate image');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            this.setLoading(button, false);
        }
    }

    async manipulateImage(prompt) {
        const button = document.getElementById('send-btn');
        this.setLoading(button, true);
        this.showLoading();

        const formData = new FormData();
        formData.append('image', this.uploadedFile);
        formData.append('prompt', prompt);
        formData.append('operation', 'ai-enhance');
        formData.append('quality', '85');
        formData.append('format', 'jpeg');

        try {
            const response = await fetch('/api/manipulate-image', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.showResult(data.imageUrl, prompt, data.note);

                // Show processing details
                const outputSection = document.getElementById('image-output');
                if (data.parameters || data.originalSize || data.processedSize) {
                    const detailsEl = document.createElement('div');
                    detailsEl.className = 'processing-details';
                    detailsEl.style.cssText = `
                        padding: 15px;
                        background: rgba(102, 126, 234, 0.1);
                        border-radius: 8px;
                        margin-top: 15px;
                        font-size: 0.9em;
                        border-left: 4px solid #667eea;
                    `;

                    let detailsHtml = '<strong>Processing Details:</strong><br>';
                    if (data.originalSize && data.processedSize) {
                        const compression = ((data.originalSize - data.processedSize) / data.originalSize * 100).toFixed(1);
                        detailsHtml += `Original: ${(data.originalSize / 1024).toFixed(1)}KB → Processed: ${(data.processedSize / 1024).toFixed(1)}KB `;
                        if (compression > 0) {
                            detailsHtml += `(${compression}% compression)`;
                        }
                        detailsHtml += '<br>';
                    }
                    if (data.operation) {
                        detailsHtml += `Operation: ${data.operation}<br>`;
                    }

                    detailsEl.innerHTML = detailsHtml;
                    outputSection.appendChild(detailsEl);
                }

                this.addToGallery({
                    url: data.imageUrl,
                    prompt: prompt,
                    type: 'manipulated',
                    timestamp: new Date().toISOString()
                });
            } else {
                this.showError(data.error || 'Failed to manipulate image');
            }
        } catch (error) {
            this.showError('Network error. Please try again.');
            console.error('Error:', error);
        } finally {
            this.setLoading(button, false);
        }
    }

    setLoading(button, isLoading) {
        if (isLoading) {
            button.classList.add('loading');
            button.disabled = true;
        } else {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showLoading() {
        const outputSection = document.getElementById('image-output');
        const loadingSection = document.getElementById('loading-section');
        
        outputSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
    }

    showResult(imageUrl, prompt, note) {
        const outputSection = document.getElementById('image-output');
        const loadingSection = document.getElementById('loading-section');

        loadingSection.classList.add('hidden');
        outputSection.classList.remove('hidden');

        // Clear any previous descriptions
        const existingDescriptions = outputSection.querySelectorAll('.ai-description, .description-fallback');
        existingDescriptions.forEach(el => el.remove());

        outputSection.innerHTML = `
            <img src="${imageUrl}" alt="${prompt}" class="generated-image">
            <div class="image-actions">
                <button class="image-action-btn" onclick="window.imageStudio.downloadImage('${imageUrl}')">
                    Download
                </button>
                <button class="image-action-btn" onclick="window.imageStudio.resetOutput()">
                    New Image
                </button>
            </div>
        `;
    }

    showError(message) {
        const outputSection = document.getElementById('image-output');
        const loadingSection = document.getElementById('loading-section');
        
        loadingSection.classList.add('hidden');
        outputSection.classList.remove('hidden');
        
        outputSection.innerHTML = `
            <div class="error-message">
                <p>${message}</p>
            </div>
        `;
    }

    resetOutput() {
        const outputSection = document.getElementById('image-output');
        const loadingSection = document.getElementById('loading-section');
        
        loadingSection.classList.add('hidden');
        outputSection.classList.remove('hidden');
        
        outputSection.innerHTML = `
            <div class="output-placeholder">
                <div class="placeholder-content">
                    <div class="placeholder-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 8v8"/>
                            <path d="M8 12h8"/>
                            <path d="M16 8l-4 4-4-4"/>
                        </svg>
                    </div>
                    <h3>Ready to create</h3>
                    <p>Enter a prompt above to generate your first image</p>
                </div>
            </div>
        `;
        
        // Clear input
        document.getElementById('prompt-input').value = '';
        
        // Reset file upload
        const uploadContent = document.querySelector('.upload-content');
        const previewImage = document.getElementById('preview-image');
        if (uploadContent) {
            uploadContent.style.display = 'flex';
        }
        if (previewImage) {
            previewImage.classList.add('hidden');
        }
        
        this.uploadedFile = null;
        
        // Reset send button state based on mode
        const sendBtn = document.getElementById('send-btn');
        if (this.currentMode === 'manipulate') {
            sendBtn.disabled = true;
        } else {
            sendBtn.disabled = false;
        }
    }

    downloadImage(imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `quantum-canvas-${Date.now()}.png`;
        link.click();
    }

    addToGallery(imageData) {
        this.generatedImages.unshift(imageData);
        if (this.generatedImages.length > 20) {
            this.generatedImages = this.generatedImages.slice(0, 20);
        }
        this.saveGallery();
        this.renderGallery();
    }

    renderGallery() {
        const galleryGrid = document.getElementById('gallery-grid');
        
        if (this.generatedImages.length === 0) {
            galleryGrid.innerHTML = `
                <div class="gallery-placeholder">
                    <p>Generated images will appear here</p>
                </div>
            `;
            return;
        }
        
        galleryGrid.innerHTML = this.generatedImages.map((img, index) => `
            <div class="gallery-item" data-index="${index}">
                <img src="${img.url}" alt="${img.prompt}">
                <div class="gallery-item-info">
                    <p class="gallery-item-prompt">${img.prompt}</p>
                </div>
            </div>
        `).join('');
        
        // Setup gallery interactions
        galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const image = this.generatedImages[index];
                this.showResult(image.url, image.prompt);
            });
        });
        
        // Setup clear gallery button
        const clearBtn = document.getElementById('clear-gallery');
        if (clearBtn) {
            clearBtn.onclick = () => {
                this.clearGallery();
            };
        }
    }

    clearGallery() {
        this.generatedImages = [];
        this.saveGallery();
        this.renderGallery();
    }

    saveGallery() {
        localStorage.setItem('quantumCanvasGallery', JSON.stringify(this.generatedImages));
    }

    loadHistory() {
        const saved = localStorage.getItem('quantumCanvasGallery');
        return saved ? JSON.parse(saved) : [];
    }

    setupQuickActions() {
        // Setup enhance button
        const enhanceBtn = document.getElementById('enhance-btn');
        if (enhanceBtn) {
            enhanceBtn.addEventListener('click', () => {
                this.enhancePrompt();
            });
        }

        // Setup surprise button
        const surpriseBtn = document.getElementById('surprise-btn');
        if (surpriseBtn) {
            surpriseBtn.addEventListener('click', () => {
                this.generateSurprisePrompt();
            });
        }
    }

    enhancePrompt() {
        const prompt = document.getElementById('prompt-input');
        const currentPrompt = prompt.value.trim();
        
        if (!currentPrompt) {
            this.showError('Please enter a prompt first');
            return;
        }

        // Simple prompt enhancement
        const enhancements = [
            ', highly detailed',
            ', professional quality',
            ', award winning',
            ', trending on artstation',
            ', cinematic lighting'
        ];
        
        const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)];
        prompt.value = currentPrompt + randomEnhancement;
        prompt.dispatchEvent(new Event('input'));
    }

    generateSurprisePrompt() {
        const surprisePrompts = [
            'A majestic dragon made of crystal soaring through aurora borealis',
            'Underwater city with bioluminescent coral architecture',
            'Steampunk airship floating above Victorian London',
            'Ancient library with floating books and magical glowing orbs',
            'Robot garden tending to mechanical flowers under twin moons',
            'Glass castle reflecting rainbow light in a misty forest',
            'Phoenix rising from digital flames in cyberspace',
            'Floating islands connected by rainbow bridges',
            'Time traveler\'s workshop filled with clockwork mechanisms',
            'Nebula shaped like a cosmic whale swimming through stars'
        ];
        
        const randomPrompt = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
        const prompt = document.getElementById('prompt-input');
        prompt.value = randomPrompt;
        prompt.dispatchEvent(new Event('input'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Vanta.js background with mobile optimization
    if (window.VANTA) {
        const isMobile = window.innerWidth <= 768;
        window.VANTA.RINGS({
            el: "#vanta-background",
            mouseControls: !isMobile,
            touchControls: true,
            gyroControls: isMobile,
            minHeight: 200.00,
            minWidth: 200.00,
            scale: isMobile ? 0.8 : 1.00,
            scaleMobile: 0.8,
            backgroundColor: 0x0,
            color: 0x00d4ff,
            // Reduce performance load on mobile
            maxDistance: isMobile ? 15 : 20,
            spacing: isMobile ? 25 : 20
        });
    }
    
    // Initialize the app and expose globally for button callbacks
    window.imageStudio = new ImageStudio();
});