export interface DocumentMetadata {
  id: string;
  title: string;
  page_count: number;
  created_at: number;
  processing_status: 'idle' | 'uploading' | 'extracting' | 'ocr' | 'structuring' | 'indexing' | 'ready' | 'error';
  processing_progress: number;
  status_message: string;
  summary: string;
  key_topics: string[];
  chapters_count: number;
  topics_count: number;
}

export interface TopicData {
  id: string;
  chapter_id: string;
  title: string;
  start_page: number;
  end_page: number;
  summary: string;
  key_concepts: string[];
  chunk_ids: string[];
}

export interface ChapterData {
  id: string;
  document_id: string;
  chapter_number: number;
  title: string;
  start_page: number;
  end_page: number;
  summary: string;
  topics: TopicData[];
}

export interface DocumentOverviewResponse {
  document: DocumentMetadata;
  chapters: ChapterData[];
  sample_questions: string[];
}

export interface ChapterDetailResponse {
  chapter: ChapterData;
  topics: TopicData[];
  key_concepts: string[];
  pages: number[];
}

export interface TopicDetailResponse {
  topic: TopicData;
  chapter_title: string;
  explanation: string;
  key_concepts: string[];
  source_pages: number[];
  sample_questions: string[];
}

export interface QAResponse {
  question: string;
  answer: string;
  grounded: boolean;
  confidence: number;
  sources: number[];
  context_snippets: string[];
  scope_type: 'document' | 'chapter' | 'topic';
  scope_id?: string;
}

export interface QuizQuestionOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  question_type: 'mcq' | 'true_false' | 'short_answer';
  prompt: string;
  options?: QuizQuestionOption[];
  source_page: number;
  topic_id?: string;
  difficulty: string;
}

export interface QuizPayload {
  quiz_id: string;
  scope_type: 'document' | 'chapter' | 'topic';
  scope_id?: string;
  scope_title: string;
  difficulty: string;
  question_count: number;
  questions: QuizQuestion[];
}

export interface QuestionEvaluationResult {
  question_id: string;
  prompt: string;
  question_type: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  source_page: number;
  topic_title?: string;
}

export interface QuizResultResponse {
  quiz_id: string;
  scope_type: string;
  scope_title: string;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  results: QuestionEvaluationResult[];
  weak_topics: string[];
  suggested_revision_pages: number[];
}

const API_BASE = '/api';

export const api = {
  async createSession(): Promise<{ session_id: string }> {
    const res = await fetch(`${API_BASE}/session/create`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async getSessionStatus(sessionId: string) {
    const res = await fetch(`${API_BASE}/session/${sessionId}/status`);
    if (!res.ok) throw new Error('Failed to fetch session status');
    return res.json();
  },

  async uploadPdf(sessionId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/session/${sessionId}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async processDocument(sessionId: string, ocrMode: string = 'auto', ocrDpi: number = 150) {
    const res = await fetch(`${API_BASE}/document/${sessionId}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ocr_mode: ocrMode, ocr_dpi: ocrDpi }),
    });
    if (!res.ok) throw new Error('Document processing failed');
    return res.json();
  },

  async getDocumentOverview(sessionId: string): Promise<DocumentOverviewResponse> {
    const res = await fetch(`${API_BASE}/document/${sessionId}/overview`);
    if (!res.ok) throw new Error('Failed to load overview');
    return res.json();
  },

  async getChapters(sessionId: string): Promise<ChapterData[]> {
    const res = await fetch(`${API_BASE}/document/${sessionId}/chapters`);
    if (!res.ok) throw new Error('Failed to fetch chapters');
    return res.json();
  },

  async getChapterDetail(sessionId: string, chapterId: string): Promise<ChapterDetailResponse> {
    const res = await fetch(`${API_BASE}/document/${sessionId}/chapters/${chapterId}`);
    if (!res.ok) throw new Error('Failed to load chapter');
    return res.json();
  },

  async getTopicDetail(sessionId: string, topicId: string): Promise<TopicDetailResponse> {
    const res = await fetch(`${API_BASE}/document/${sessionId}/topics/${topicId}`);
    if (!res.ok) throw new Error('Failed to load topic');
    return res.json();
  },

  async askQuestion(
    sessionId: string,
    scopeType: 'document' | 'chapter' | 'topic',
    scopeId: string | undefined,
    question: string
  ): Promise<QAResponse> {
    let endpoint = `${API_BASE}/qa/${sessionId}/document`;
    if (scopeType === 'chapter' && scopeId) {
      endpoint = `${API_BASE}/qa/${sessionId}/chapter/${scopeId}`;
    } else if (scopeType === 'topic' && scopeId) {
      endpoint = `${API_BASE}/qa/${sessionId}/topic/${scopeId}`;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, top_k: 5 }),
    });
    if (!res.ok) throw new Error('Failed to generate answer');
    return res.json();
  },

  async generateQuiz(
    sessionId: string,
    scopeType: 'document' | 'chapter' | 'topic',
    scopeId?: string,
    numQuestions: number = 5,
    difficulty: string = 'medium',
    questionTypes: string[] = ['mcq', 'true_false', 'short_answer']
  ): Promise<QuizPayload> {
    const res = await fetch(`${API_BASE}/quiz/${sessionId}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope_type: scopeType,
        scope_id: scopeId,
        num_questions: numQuestions,
        difficulty,
        question_types: questionTypes,
      }),
    });
    if (!res.ok) throw new Error('Failed to generate quiz');
    return res.json();
  },

  async submitQuiz(
    sessionId: string,
    quizId: string,
    answers: { question_id: string; user_answer: string }[]
  ): Promise<QuizResultResponse> {
    const res = await fetch(`${API_BASE}/quiz/${sessionId}/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (!res.ok) throw new Error('Failed to submit quiz');
    return res.json();
  },

  async deleteSession(sessionId: string) {
    await fetch(`${API_BASE}/session/${sessionId}`, { method: 'DELETE' });
  },
};
