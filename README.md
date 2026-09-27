# AI PDF Learning Assistant

> **A document-centered learning workspace that transforms PDFs into interactive study environments with local OCR, hierarchical chapter/topic exploration, grounded Q&A, and self-assessment quizzes—running 100% locally with zero cloud data leakage.**

---

## 🌟 Key Features

### 1. Document Extraction & Local OCR Engine
- **Hybrid Extraction Pipeline**: Blazing-fast native text extraction via PyMuPDF (`fitz`) and `pypdf` with automatic fallback.
- **Adaptive OCR**: Preprocessing with grayscale binarization and noise reduction wrapping local Tesseract OCR to make scanned and handwritten notes searchable.
- **Text Normalization**: Automatic unicode normalization, hyphenation repair, and structural paragraph preservation.

### 2. Intelligent Document & Book Architecture
- **Front-Matter & TOC Disambiguation**: Intelligently distinguishes front-matter (*Cover*, *Copyright*, *Table of Contents*, *Preface*) from actual content chapters.
- **Hierarchical Chapter Detection**: Resolves book parts (`Part I`, `Part II`) down to core chapters and captures authentic author-defined subtopics with exact page boundaries.
- **Local Extractive Summarizer**: Generates concise, structured overviews and key concept clusters for the document, each chapter, and each topic.

### 3. Multi-Scoped Grounded Q&A
- **Multi-Level Scope Filtering**: Query across the **Entire Document**, a **Specific Chapter**, or a **Specific Topic**.
- **Local TF-IDF / Cosine Similarity Vector Index**: Blazing-fast in-memory retrieval without external cloud APIs or heavyweight vector databases.
- **Traceable Page Citations**: Every answer is grounded directly in document chunks with clickable page references (`Page X`) and verifiable text excerpts.
- **Anti-Hallucination Fallback**: Returns a strict refusal when information is not present in the document under the chosen scope.

### 4. Interactive Quiz Assessment Engine
- **Automated Question Generation**: Creates balanced Multiple Choice Questions (MCQs with distractors), True/False statements, and Short Answer questions from key definitions and concepts.
- **Customizable Scope & Difficulty**: Configure quizzes by scope, question count (3, 5, 10, 15), and difficulty (Easy, Medium, Hard).
- **Comprehensive Evaluation & Revision**: Real-time scoring, item-by-item answer review with detailed explanations, source page references, and automated identification of weak topics for focused revision.

### 5. Non-Linear Learning Workspace
- Fluid navigation: seamlessly transition between `Overview → Chapter Explorer → Chapter Learning Mode → Topic Directory → Learn This Topic → Q&A → Quiz` without losing session context.
- Dynamic breadcrumbs for instant multi-level contextual jumping.

### 6. 100% Privacy & Temporary Session Isolation
- **No User Accounts or Authentication Required**.
- **Memory-Only & Temporary Storage**: Uploaded PDFs and generated indexes reside exclusively in isolated temporary session directories and are purged on session expiration or tab close.

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.13, FastAPI, Uvicorn, Pydantic v2 |
| **PDF & OCR** | PyMuPDF (`fitz`), pypdf, Pillow, pytesseract |
| **NLP & Retrieval** | scikit-learn (`TfidfVectorizer`, Cosine Similarity), NumPy |
| **Frontend** | React 18, TypeScript, Vite, Lucide Icons |
| **Styling** | Vanilla CSS with Custom Design System (Slate/Indigo Dark Glassmorphism, Google Fonts) |

---

## 📁 Project Structure

```
AIPDFReader/
├── backend/
│   ├── app/
│   │   ├── api/               # FastAPI REST endpoint routers
│   │   │   ├── document.py    # Document processing, overview, chapter & topic endpoints
│   │   │   ├── qa.py          # Multi-scoped grounded Q&A endpoints
│   │   │   ├── quiz.py        # Quiz generation, submission & results endpoints
│   │   │   └── session.py     # Session creation, upload & status tracking
│   │   ├── core/              # Core config and temporary session isolation manager
│   │   │   ├── config.py
│   │   │   └── session.py
│   │   ├── models/            # Pydantic schemas and data models
│   │   │   └── schemas.py
│   │   ├── services/          # Modular business logic and NLP engines
│   │   │   ├── chapter_detector.py # Book TOC & chapter detection
│   │   │   ├── chunker.py          # Semantic sliding-window chunker
│   │   │   ├── normalizer.py       # Text cleaning & unicode normalization
│   │   │   ├── ocr_engine.py       # Image preprocessing & OCR pipeline
│   │   │   ├── pdf_extractor.py    # Native PDF text extractor
│   │   │   ├── qa_engine.py        # Grounded Q&A formulation
│   │   │   ├── quiz_evaluator.py   # Quiz scoring & revision recommendations
│   │   │   ├── quiz_generator.py   # Concept extraction & question generator
│   │   │   ├── retrieval_index.py  # Local in-memory TF-IDF search index
│   │   │   └── summarizer.py       # Local extractive summarization
│   │   └── main.py            # FastAPI application entrypoint with CORS & background cleanup
│   ├── tests/                 # Unit & End-to-End integration test suite
│   │   ├── test_backend.py
│   │   └── test_e2e.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/        # React UI components
│   │   │   ├── Breadcrumbs.tsx
│   │   │   ├── ChapterExplorer.tsx
│   │   │   ├── ChapterLearningView.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LearnTopicView.tsx
│   │   │   ├── OverviewView.tsx
│   │   │   ├── ProcessingProgress.tsx
│   │   │   ├── QAWorkspace.tsx
│   │   │   ├── QuizWorkspace.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopicExplorer.tsx
│   │   │   └── UploadScreen.tsx
│   │   ├── services/          # Typed API client
│   │   │   └── api.ts
│   │   ├── styles/            # Design system & CSS tokens
│   │   │   ├── index.css
│   │   │   └── variables.css
│   │   ├── App.tsx            # Main non-linear workspace router
│   │   └── main.tsx           # React root entrypoint
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── docs/
│   ├── prd.md                 # Product Requirements Document
│   └── tasks.md               # 32-Task Implementation Roadmap
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.10+** (Python 3.11–3.13 supported)
- **Node.js 18+** and **npm**
- *(Optional)* [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) installed on your system if OCR on scanned images is required.

---

### 1. Backend Setup

1. Open a terminal in the project root:
   ```bash
   # Install Python dependencies
   pip install -r backend/requirements.txt
   ```

2. Start the FastAPI backend server:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - API will be live at `http://127.0.0.1:8000`
   - Interactive Swagger API documentation: `http://127.0.0.1:8000/docs`

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Open `http://localhost:5173` in your browser.

---

## 🧪 Running Tests

### Backend Unit & E2E Tests
Run the comprehensive test suite validating session management, chunking, chapter detection, retrieval, grounded Q&A, and quiz generation:
```bash
python -m pytest backend/tests/ -v
```

### Frontend Build Validation
Verify TypeScript types and production bundle compilation:
```bash
cd frontend
npm run build
```

---

## 📖 Usage Workflow

1. **Upload**: Drag and drop any PDF file (textbooks, lecture notes, research papers).
2. **Explore**:
   - Inspect the **Overview** for total pages, chapter counts, key concepts, and summaries.
   - Open **Chapter Explorer** to view the structured outline and launch **Chapter Learning Mode**.
   - Browse the **Topic Directory** and click **Learn This Topic** for focused explanations.
3. **Ask**: Use **Grounded Q&A** at Document, Chapter, or Topic scope to query content with verifiable page citations.
4. **Practice**: Generate a customized **Assessment Quiz** to test your knowledge, review explanations, and view recommended topics for revision.

---

## 🔒 Security & Privacy

- **Zero Cloud API Leakage**: No document data or embeddings are transmitted to third-party AI APIs.
- **Session Auto-Cleanup**: Uploaded files and indexes are automatically deleted when the browser tab is closed or when the session expires after 60 minutes of inactivity.
- **Sanitized Uploads**: Path traversal protection and strict MIME-type validation on all file uploads.

---

## 📄 License
MIT License. Built for students, educators, and professionals seeking document-grounded learning.
