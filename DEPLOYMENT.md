# Deployment Guide

## Backend Deployment (Railway)

1. **Sign up/Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Connect your GitHub account

2. **Deploy Project**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select `Patrickscott999/Quantum_Canvas`
   - Railway auto-detects Node.js and builds with `npm run build`

3. **Set Environment Variables**
   - Go to project → Variables tab
   - Add required variables:
     ```
     GEMINI_API_KEY=your_google_ai_studio_api_key
     HF_TOKEN=your_huggingface_token_optional
     ```

4. **Get API Keys**
   - **Gemini API**: https://aistudio.google.com/
   - **Hugging Face Token**: https://huggingface.co/settings/tokens

5. **Get Deployment URL**
   - Railway will provide a URL like: `https://yourproject.railway.app`
   - Test health check: `https://yourproject.railway.app/health`

## Frontend Update

After deploying backend, update the frontend to use your Railway API URL.

## Alternative Hosting Options

- **Render**: render.com (free tier available)
- **Vercel**: vercel.com (for API routes)
- **Heroku**: heroku.com (paid)