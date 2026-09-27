import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { Breadcrumbs, BreadcrumbItem } from './components/Breadcrumbs';
import { UploadScreen } from './components/UploadScreen';
import { ProcessingProgress } from './components/ProcessingProgress';
import { OverviewView } from './components/OverviewView';
import { ChapterExplorer } from './components/ChapterExplorer';
import { ChapterLearningView } from './components/ChapterLearningView';
import { TopicExplorer } from './components/TopicExplorer';
import { LearnTopicView } from './components/LearnTopicView';
import { QAWorkspace } from './components/QAWorkspace';
import { QuizWorkspace } from './components/QuizWorkspace';
import {
  api,
  DocumentMetadata,
  DocumentOverviewResponse,
  ChapterDetailResponse,
  TopicDetailResponse,
  ChapterData
} from './services/api';

export const App: React.FC = () => {
  const [sessionId, setSessionId] = useState<string>('');
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null);
  const [overview, setOverview] = useState<DocumentOverviewResponse | null>(null);
  const [chapters, setChapters] = useState<ChapterData[]>([]);

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [chapterDetail, setChapterDetail] = useState<ChapterDetailResponse | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [topicDetail, setTopicDetail] = useState<TopicDetailResponse | null>(null);

  // Cross-context action states
  const [initialQAQuery, setInitialQAQuery] = useState<string>('');
  const [quizScope, setQuizScope] = useState<{ scopeType: 'document' | 'chapter' | 'topic'; scopeId?: string }>({
    scopeType: 'document',
  });

  // Loading / Error states
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string>('');
  sessionIdRef.current = sessionId;

  // 1. Initialize temporary session
  useEffect(() => {
    const initSession = async () => {
      try {
        const res = await api.createSession();
        setSessionId(res.session_id);
      } catch (err: any) {
        console.error('Session init error:', err);
      }
    };
    initSession();

    // Cleanup on tab/window close (Task 31)
    const handleUnload = () => {
      if (sessionIdRef.current) {
        navigator.sendBeacon(`/api/session/${sessionIdRef.current}`, '');
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  // 2. Handle PDF Upload & Processing Trigger
  const handleFileSelected = async (file: File, ocrMode: string) => {
    if (!sessionId) return;
    setError(null);
    setIsProcessing(true);

    try {
      // Step A: Upload file
      const uploadRes = await api.uploadPdf(sessionId, file);

      // Step B: Set initial status & start pipeline
      setMetadata({
        id: uploadRes.document_id,
        title: uploadRes.filename.replace(/\.[^/.]+$/, ''),
        page_count: uploadRes.page_count,
        created_at: Date.now() / 1000,
        processing_status: 'extracting',
        processing_progress: 20,
        status_message: 'Extracting pages...',
        summary: '',
        key_topics: [],
        chapters_count: 0,
        topics_count: 0,
      });

      // Step C: Trigger Document Processing
      await api.processDocument(sessionId, ocrMode, 150);

      // Step D: Load complete overview
      const overviewRes = await api.getDocumentOverview(sessionId);
      setOverview(overviewRes);
      setMetadata(overviewRes.document);
      setChapters(overviewRes.chapters);
      setActiveTab('overview');
    } catch (err: any) {
      setError(err.message || 'Processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Chapter Learning Mode Loader
  const handleSelectChapter = async (chapterId: string) => {
    setSelectedChapterId(chapterId);
    setSelectedTopicId(null);
    setTopicDetail(null);
    try {
      const detail = await api.getChapterDetail(sessionId, chapterId);
      setChapterDetail(detail);
      setActiveTab('chapters');
    } catch (err: any) {
      console.error('Failed to load chapter:', err);
    }
  };

  // 4. Topic Learning Mode Loader
  const handleSelectTopic = async (topicId: string) => {
    setSelectedTopicId(topicId);
    try {
      const detail = await api.getTopicDetail(sessionId, topicId);
      setTopicDetail(detail);
      setActiveTab('topics');
    } catch (err: any) {
      console.error('Failed to load topic:', err);
    }
  };

  // 5. Jump to Q&A from anywhere
  const handleAskQuestion = (question: string) => {
    setInitialQAQuery(question);
    setActiveTab('qa');
  };

  // 6. Jump to Quiz from Chapter/Topic
  const handleStartChapterQuiz = (chapterId: string, chapterTitle: string) => {
    setQuizScope({ scopeType: 'chapter', scopeId: chapterId });
    setActiveTab('quiz');
  };

  const handleStartTopicQuiz = (topicId: string, topicTitle: string) => {
    setQuizScope({ scopeType: 'topic', scopeId: topicId });
    setActiveTab('quiz');
  };

  // 7. Reset Workspace
  const handleResetSession = async () => {
    if (sessionId) {
      try {
        await api.deleteSession(sessionId);
      } catch (e) {}
    }
    setMetadata(null);
    setOverview(null);
    setChapters([]);
    setSelectedChapterId(null);
    setChapterDetail(null);
    setSelectedTopicId(null);
    setTopicDetail(null);
    setActiveTab('overview');
    const res = await api.createSession();
    setSessionId(res.session_id);
  };

  // Build Dynamic Breadcrumbs
  const breadcrumbItems: BreadcrumbItem[] = [
    {
      label: metadata ? metadata.title : 'Document Workspace',
      onClick: () => {
        setSelectedChapterId(null);
        setSelectedTopicId(null);
        setActiveTab('overview');
      },
      active: activeTab === 'overview' && !selectedChapterId && !selectedTopicId,
    },
  ];

  if (activeTab === 'chapters') {
    breadcrumbItems.push({
      label: 'Chapters',
      onClick: () => {
        setSelectedChapterId(null);
        setSelectedTopicId(null);
      },
      active: !selectedChapterId,
    });
    if (selectedChapterId && chapterDetail) {
      breadcrumbItems.push({
        label: `Chapter ${chapterDetail.chapter.chapter_number}: ${chapterDetail.chapter.title}`,
        active: true,
      });
    }
  } else if (activeTab === 'topics') {
    breadcrumbItems.push({
      label: 'Topics',
      onClick: () => {
        setSelectedTopicId(null);
      },
      active: !selectedTopicId,
    });
    if (selectedTopicId && topicDetail) {
      breadcrumbItems.push({
        label: topicDetail.topic.title,
        active: true,
      });
    }
  } else if (activeTab === 'qa') {
    breadcrumbItems.push({ label: 'Grounded Q&A', active: true });
  } else if (activeTab === 'quiz') {
    breadcrumbItems.push({ label: 'Assessment Quiz', active: true });
  }

  const hasLoadedDocument = !!metadata && metadata.processing_status === 'ready' && !!overview;

  return (
    <div className="app-container">
      {/* Persistent Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab === 'chapters' && selectedChapterId) {
            // Keep chapter or reset based on user intent
          } else if (tab === 'topics' && selectedTopicId) {
            // Keep topic or show topics directory
          }
          setActiveTab(tab);
        }}
        chaptersCount={chapters.length}
        topicsCount={chapters.reduce((acc, c) => acc + c.topics.length, 0)}
        disabled={!hasLoadedDocument}
      />

      <div className="main-layout">
        {/* Persistent Header */}
        <Header document={metadata} onResetSession={handleResetSession} />

        <main className="content-area">
          {/* Breadcrumbs */}
          {hasLoadedDocument && <Breadcrumbs items={breadcrumbItems} />}

          {/* Screen Routing */}
          {!hasLoadedDocument ? (
            isProcessing ? (
              <ProcessingProgress metadata={metadata} error={error} />
            ) : (
              <UploadScreen
                onFileSelected={handleFileSelected}
                isUploading={isProcessing}
                error={error}
              />
            )
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  overview={overview}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onSelectChapter={handleSelectChapter}
                  onAskQuestion={handleAskQuestion}
                />
              )}

              {activeTab === 'chapters' &&
                (selectedChapterId && chapterDetail ? (
                  <ChapterLearningView
                    sessionId={sessionId}
                    chapterDetail={chapterDetail}
                    allChapters={chapters}
                    onSelectChapter={handleSelectChapter}
                    onSelectTopic={handleSelectTopic}
                    onStartChapterQuiz={handleStartChapterQuiz}
                  />
                ) : (
                  <ChapterExplorer
                    chapters={chapters}
                    onSelectChapter={handleSelectChapter}
                    onStartChapterQuiz={handleStartChapterQuiz}
                    onAskChapterQA={(cId, title) => handleAskQuestion(`Explain Chapter: ${title}`)}
                  />
                ))}

              {activeTab === 'topics' &&
                (selectedTopicId && topicDetail ? (
                  <LearnTopicView
                    sessionId={sessionId}
                    topicDetail={topicDetail}
                    onBackToChapter={(cId) => handleSelectChapter(cId)}
                    onStartTopicQuiz={handleStartTopicQuiz}
                  />
                ) : (
                  <TopicExplorer
                    chapters={chapters}
                    onSelectTopic={handleSelectTopic}
                    onSelectChapter={handleSelectChapter}
                  />
                ))}

              {activeTab === 'qa' && (
                <QAWorkspace
                  sessionId={sessionId}
                  chapters={chapters}
                  initialQuestion={initialQAQuery}
                />
              )}

              {activeTab === 'quiz' && (
                <QuizWorkspace
                  sessionId={sessionId}
                  chapters={chapters}
                  initialScopeType={quizScope.scopeType}
                  initialScopeId={quizScope.scopeId}
                  onReviewTopic={(tId) => handleSelectTopic(tId)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};
export default App;
