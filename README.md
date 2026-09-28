# TrueTone - AI Skincare & Recommendation Platform

## Overview
TrueTone is an advanced AI-powered skincare application designed to analyze facial skin for type, tone, and diseases. It provides a detailed historical tracking mechanism and generates highly personalized product recommendations based on individual profiles (including allergies and pregnancy safety). The platform also features a Gemini-powered OCR product scanner to verify real-world ingredient safety instantly.

## Functionalities & Key Features
- **Parallel AI Skin Analysis**: Utilizes 3 concurrent Machine Learning models (EfficientNet variants) to accurately predict Skin Type, Skin Tone, and detect Skin Diseases in ~300ms.
- **Personalized Recommendations**: A robust rule-based recommendation engine that evaluates product suitability by matching user profiles, explicitly filtering out known allergens and unsafe ingredients.
- **Product Safety Scanner**: Uses Google Gemini OCR with a manual cropping workflow to extract and scan physical product ingredients against a user's safety profile.
- **Skin Tracking Timeline**: A visual timeline to monitor skin condition progress over time using localized image comparisons and pop-up overlays.
- **Context-Aware AI Assistant**: A skincare chatbot that utilizes the user's active skin profile to generate highly relevant and personalized advice.

## Tech Stack & Dependencies

### Frontend
- **Framework**: React 19 + Vite 7 (Single Page Application)
- **Routing**: React Router v7
- **Styling & UI**: Tailwind CSS v4, Framer Motion (Animations), Lucide React (Icons)
- **Utilities**: Axios, react-image-crop, react-markdown

### Backend & Machine Learning
- **Server Framework**: Django (REST API)
- **Deep Learning**: PyTorch, torchvision, timm (for EfficientNet models)
- **Computer Vision**: MediaPipe (for facial landmarking and cropping)
- **AI Integration**: Google Generative AI (Gemini 2.5 Flash for OCR and Chatbot)

### Database
- **Primary Database**: Supabase (PostgreSQL)

## Architecture & Working
The application follows a decoupled Client-Server architecture:
1. **Client Upload**: The React frontend sends multipart image data to the Django Server (`/api/analyze_all`).
2. **Validation & Cropping**: The backend validates the image and optionally isolates the facial region using MediaPipe.
3. **Parallel Inference**: The ML Pipeline executes the 3 PyTorch models concurrently using a ThreadPoolExecutor.
4. **Profile Generation & Recommendations**: Predictions are merged with the user's onboarding data (allergies, age). The Recommendation Engine scores and ranks products.
5. **Response**: A consolidated JSON payload is returned and rendered dynamically on the frontend.

## High-Level Project Structure
```text
TrueTone-FYP/
|
|-- frontend/                 # React SPA (User Interface)
|   |-- src/                  # Components, Pages, and Services
|   |-- package.json          # Node dependencies
|   |-- README.md             # Detailed frontend documentation
|
|-- backend/                  # Django API & ML Pipeline
|   |-- pipeline_engine.py    # Core ML Inference Engine
|   |-- recommendation_engine.py # Ranking & Filtering Engine
|   |-- models/               # PyTorch Checkpoints (.pth / .pt)
|   |-- models_api/           # API Endpoints (Django app)
|   |-- data/                 # Product Datasets & CSVs
|   |-- manage.py             # Django entry point
|   |-- requirements.txt      # Python dependencies
|   |-- README.md             # Detailed backend documentation
|
|-- .gitignore                # Unified git exclusions
```
*(For granular, file-by-file breakdowns, refer to the individual `README.md` files located in the `frontend/` and `backend/` directories).*

## Requirements & How to Run

### System Requirements
- **Node.js** (v18+)
- **Python** (v3.10+)
- **PostgreSQL Database** (or a free Supabase instance)

### 1. Set Up the Backend
```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate      # On macOS/Linux
.\.venv\Scripts\activate       # On Windows

# Install dependencies
pip install -r requirements.txt
```
Create a `.env` file in the `backend/` directory with your `DATABASE_URL` and `GEMINI_API_KEY`.
Start the backend server:
```bash
python manage.py runserver 8000
```

### 2. Set Up the Frontend
Open a new terminal window:
```bash
cd frontend
npm install
```
Create a `.env` file in the `frontend/` directory pointing to the backend:
```env
VITE_API_BASE_URL=http://localhost:8000
```
Start the frontend development server:
```bash
npm run dev
```
The application will be accessible at `http://localhost:5173`.
