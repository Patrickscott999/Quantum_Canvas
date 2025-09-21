# 🚀 Quantum Canvas - AI Image Studio

A futuristic AI-powered image generation and manipulation platform built with cutting-edge web technologies.

![Quantum Canvas](https://img.shields.io/badge/AI-Image%20Generation-00d4ff?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

## ✨ Features

- **🎨 AI Image Generation**: Powered by Google's Gemini 2.5 Flash Image (Nano Banana) model
- **🖼️ Image Manipulation**: Upload and modify existing images with AI
- **🎭 Style Presets**: Choose from multiple artistic styles (Photorealistic, Anime, Oil Painting, 3D Render, Cyberpunk)
- **📐 Aspect Ratios**: Generate images in Square, Landscape, or Portrait formats
- **📱 Fully Responsive**: Optimized for desktop, tablet, and mobile devices
- **🌟 Futuristic UI**: Glassmorphism design with glowing animations and Orbitron font
- **📚 Gallery**: Save and browse your generated images
- **⚡ Real-time Processing**: Live feedback and loading states

## 🛠️ Tech Stack

- **Backend**: Node.js + Express + TypeScript
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **AI**: Google Generative AI (Gemini 2.5 Flash Image)
- **Styling**: Custom CSS with glassmorphism effects
- **Animations**: Vanta.js for dynamic backgrounds
- **Fonts**: Orbitron (Google Fonts)

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/quantum-canvas.git
   cd quantum-canvas
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   GEMINI_API_KEY=your_actual_gemini_api_key
   HF_TOKEN=your_huggingface_token (optional)
   PORT=3000
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-reload:
   ```bash
   npm run dev:server
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔑 API Keys Setup

### Google Gemini API Key
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

### Hugging Face Token (Optional)
1. Visit [Hugging Face Settings](https://huggingface.co/settings/tokens)
2. Create a new access token
3. Copy the token to your `.env` file

## 📱 Mobile Optimization

Quantum Canvas is fully optimized for mobile devices with:

- **Responsive breakpoints**: 1024px, 768px, 480px
- **Touch-friendly interactions**: 44px minimum touch targets
- **Performance optimizations**: Reduced Vanta.js complexity on mobile
- **Adaptive layouts**: Vertical stacking for smaller screens
- **Enhanced touch feedback**: Scale animations and haptic-like responses

## 🎨 UI Features

- **Futuristic Design**: Orbitron font with glowing text effects
- **Glassmorphism**: Backdrop blur effects throughout the interface
- **Animated Elements**: Rotating borders, pulsing glows, gradient shifts
- **Professional Icons**: Custom SVG icons with hover animations
- **Dynamic Background**: Vanta.js rings with mobile optimization

## 📂 Project Structure

```
quantum-canvas/
├── public/
│   ├── index.html          # Main HTML file
│   ├── styles.css          # Responsive CSS with animations
│   └── script.js           # Frontend JavaScript
├── generated/              # AI-generated images (gitignored)
├── server.ts               # Express server with AI integration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore file
└── README.md               # Project documentation
```

## 🚨 Security

- **API Key Protection**: All sensitive keys are stored in `.env` files
- **Gitignore**: Comprehensive protection against accidental key commits
- **Environment Template**: `.env.example` for easy setup without exposing secrets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for powerful image generation capabilities
- **Vanta.js** for stunning animated backgrounds
- **Orbitron Font** for the perfect futuristic typography

---

**Built with ❤️ and cutting-edge AI technology**