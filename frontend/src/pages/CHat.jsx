import React, { useState, useEffect, useRef } from 'react';
import { Panel, Group, Separator } from 'react-resizable-panels';
import {
  Scale, Search, Bell, Settings, FileText, Briefcase,
  Upload, Printer, Share, Mic, Send, Paperclip,
  History, Bookmark, BarChart3, MessageSquare,
  ChevronDown, Gavel, Lightbulb, MoreHorizontal,
  CheckCircle, Circle, XCircle, X
} from 'lucide-react';
import { aiService, documentService } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MavenAIChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  // New states for document upload and compliance
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [complianceScore, setComplianceScore] = useState(94); // Initial value from existing widget
  const fileInputRef = useRef(null); // Ref for hidden file input

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initial welcome message from AI
    setMessages([
      {
        id: 1,
        type: 'ai',
        content: `Hello ${user?.first_name || 'there'}! How can I assist you with Nigerian tax matters today?`,
        timestamp: new Date().toLocaleString(),
        legalSources: [],
      },
    ]);
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const currentInput = inputMessage;
    setInputMessage(''); // Clear input immediately
    setError(null);

    const newUserMessage = {
      id: messages.length + 1,
      type: 'user',
      content: currentInput,
      timestamp: new Date().toLocaleString(),
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await aiService.chat({
        query: currentInput,
        conversation_id: conversationId,
        // context: {} // Add any relevant context here if needed
      });

      const newAiMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: response.response,
        timestamp: new Date().toLocaleString(),
        legalSources: response.legal_sources || [],
      };
      setMessages((prevMessages) => [...prevMessages, newAiMessage]);
      setConversationId(response.conversation_id);
    } catch (err) {
      console.error("Failed to fetch AI response:", err);
      setError(err.message || "An unexpected error occurred.");
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: messages.length + 2,
          type: 'ai',
          content: `Apologies, I encountered an error: ${err.response?.data?.error || err.message}. Please try again.`,
          timestamp: new Date().toLocaleString(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const toggleTab = (tab) => {
    setActiveTab(activeTab === tab ? null : tab);
  };

  const handleFileSelect = (file) => {
    if (file) {
      // Basic validation for allowed file types
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
      if (!allowedTypes.includes(file.type)) {
        setUploadError('Invalid file type. Allowed: PDF, JPG, PNG, XLSX, XLS.');
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setUploadError('');
      setUploadMessage('');
      setUploadProgress(0);
    } else {
      setSelectedFile(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary-500', 'bg-primary-500/10');
    const file = event.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-primary-500', 'bg-primary-500/10');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-primary-500', 'bg-primary-500/10');
  };

  const handleUploadDocument = async () => {
    if (!selectedFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setIsUploadingDocument(true);
    setUploadProgress(0);
    setUploadMessage('Uploading...');
    setUploadError('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Assuming a default document type for simplicity, or we could add a selector
    // For now, let's hardcode 'other' or try to infer from file type if possible
    let documentType = 'other';
    if (selectedFile.type.includes('pdf')) documentType = 'tax_return';
    if (selectedFile.type.includes('image')) documentType = 'receipt';
    if (selectedFile.name.includes('bank') || selectedFile.name.includes('statement')) documentType = 'bank_statement';
    if (selectedFile.name.includes('invoice')) documentType = 'invoice';

    formData.append('document_type', documentType); 

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadProgress(i);
      }

      const response = await documentService.upload(formData);
      setUploadMessage(`File "${response.filename}" uploaded successfully! Processing...`);
      setSelectedFile(null);
      // Simulate compliance status update after successful upload
      setComplianceScore(prev => Math.min(prev + 3, 100)); // Increment compliance score by a small amount

    } catch (err) {
      console.error("Document upload error:", err);
      setUploadError(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setIsUploadingDocument(false);
      setUploadProgress(0); // Reset progress bar after completion/error
      setTimeout(() => {
        setUploadMessage('');
        setUploadError('');
      }, 5000); // Clear messages after 5 seconds
    }
  };

  // Helper to format message text (bolding and newlines)
  const formatMessageContent = (content) => {
    if (!content) return null;
    return content.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
        <br />
      </React.Fragment>
    ));
  };

  return (
    <div className="light">
      <div className="bg-background-light dark:bg-background-dark text-custom-text-primary dark:text-white h-screen flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-background-dark px-10 py-3 sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <Link to="/" className="flex items-center gap-4 text-primary-500 dark:text-white">
                    <div className="size-8 bg-primary-500 rounded-lg flex items-center justify-center text-white">
                        <Scale />
                    </div>
                    <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Maven Tax Assistant</h2>
                </Link>
            </div>
            <div className="flex flex-1 justify-end gap-8">
                <div className="flex items-center gap-9">
                    <Link to="/dashboard" className="text-sm font-medium leading-normal text-gray-500 dark:text-gray-400 hover:text-primary-500 transition-colors">
                        Dashboard
                    </Link>
                    <Link to="/docs" className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal hover:text-primary-500">
                        Documents
                    </Link>
                    <Link to="/chat" className="text-sm font-medium leading-normal text-primary-500 transition-colors">
                        Maven AI
                    </Link>
                </div>
                <div className="flex gap-2">
                    <Link to="/settings" className="flex items-center justify-center rounded-lg h-10 w-10 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 transition-colors">
                        <Settings className="text-xl" />
                    </Link>
                </div>
            </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          <Group direction="horizontal" className="flex-1">
            <Panel defaultSize={40} minSize={20}>
          <aside className="w-full h-full flex flex-col border-r border-custom-border-light dark:border-gray-700 bg-white dark:bg-custom-dark-bg overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-primary-500 dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-2">
                  Maven AI
                </h2>
                <p className="text-sm text-custom-text-secondary dark:text-gray-400 leading-relaxed">
                  Your intelligent assistant for Nigerian tax compliance. Maven analyzes your documents and provides real-time regulatory guidance.
                </p>
              </div>

              {/* Document Upload Dropzone */}
              <div className="flex flex-col">
                <div
                  className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 bg-background-light/50 dark:bg-gray-800/30 px-6 py-8 transition-colors"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="size-12 bg-primary-500/10 text-primary-500 rounded-full flex items-center justify-center">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="flex max-w-[320px] flex-col items-center gap-1">
                    <p className="text-custom-text-primary dark:text-white text-base font-bold text-center">
                      Analyze Documents
                    </p>
                    <p className="text-custom-text-secondary dark:text-gray-400 text-xs font-normal text-center">
                      Drag and drop tax files (PDF, XLSX, JPG, PNG) for Maven AI to audit.
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    className="hidden"
                    accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
                  />
                  {!selectedFile ? (
                    <button
                      className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary-500 text-white text-xs font-bold leading-normal tracking-[0.015em]"
                      onClick={triggerFileInput}
                    >
                      Browse Files
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-medium text-custom-text-primary dark:text-white">
                        Selected: {selectedFile.name}
                      </p>
                      {uploadError && <p className="text-red-500 text-xs">{uploadError}</p>}
                      {uploadMessage && <p className="text-green-500 text-xs">{uploadMessage}</p>}
                      {isUploadingDocument && (
                        <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                          <div className="bg-primary-500 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                        </div>
                      )}
                      <button
                        className="flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-secondary-400 text-primary-900 text-xs font-bold leading-normal tracking-[0.015em] disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleUploadDocument}
                        disabled={isUploadingDocument || !!uploadError}
                      >
                        {isUploadingDocument ? `Uploading (${uploadProgress}%)` : 'Upload & Analyze'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Compliance Widget */}
              <div className="bg-primary-500/5 dark:bg-primary-500/10 rounded-xl p-5 border border-primary-500/10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-primary-500 dark:text-primary-300 font-bold text-sm uppercase tracking-wider">
                    Compliance Status
                  </h3>
                  <span className={`flex h-2 w-2 rounded-full ${complianceScore >= 90 ? 'bg-green-500' : 'bg-orange-500'}`}></span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-custom-text-secondary dark:text-gray-300">
                      Overall Compliance Score
                    </span>
                    <span className="text-xs font-bold text-primary-500">{complianceScore}% Compliant</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-primary-500 h-full rounded-full" style={{ width: `${complianceScore}%` }}></div>
                  </div>
                  <p className="text-[11px] text-custom-text-secondary dark:text-gray-400 leading-relaxed">
                    Your profile is {complianceScore}% complete for the Q4 Tax Reporting Cycle.{' '}
                    <a className="text-primary-500 underline font-medium" href="#">
                      Finalize now
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </aside>
            </Panel>
            <Separator className="w-2 bg-gray-200 dark:bg-gray-800 hover:bg-primary-500 transition-colors" />
            <Panel defaultSize={60} minSize={30}>
          <div className="h-full flex flex-col bg-background-light dark:bg-background-dark relative">
            {/* Chat Header */}
            <div className="px-6 py-4 bg-white dark:bg-custom-dark-bg border-b border-custom-border-light dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm font-bold text-custom-text-primary dark:text-white">
                    Maven AI Consultant
                  </p>
                  <p className="text-[11px] text-custom-text-secondary dark:text-gray-400 font-medium uppercase tracking-tight">
                    Active Consultation #2948
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message) => (
                message.type === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] bg-primary-500 text-white rounded-xl rounded-tr-none px-4 py-3 shadow-sm">
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className="text-[10px] mt-1 text-primary-200 text-right">{message.timestamp}</p>
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex justify-start gap-3">
                    <div className="size-8 rounded bg-primary-500 flex items-center justify-center text-white shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div className="max-w-[85%] space-y-3">
                      <div className="bg-white dark:bg-custom-dark-border border border-custom-border-light dark:border-gray-700 rounded-xl rounded-tl-none px-5 py-4 shadow-sm">
                        <p className="text-sm leading-relaxed text-custom-text-primary dark:text-gray-200">
                          {formatMessageContent(message.content)}
                        </p>
                        {message.legalSources && message.legalSources.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <details className="group bg-background-light dark:bg-gray-800 rounded-lg overflow-hidden border border-transparent hover:border-primary-500/20 transition-all">
                              <summary className="flex items-center justify-between px-4 py-2 cursor-pointer list-none">
                                <div className="flex items-center gap-2">
                                  <Gavel className="w-4 h-4 text-primary-500" />
                                  <span className="text-xs font-bold text-primary-500 dark:text-primary-300">
                                    Legal Bases
                                  </span>
                                </div>
                                <ChevronDown className="w-4 h-4 text-sm text-primary-500 group-open:rotate-180" />
                              </summary>
                              <div className="px-4 pb-3 pt-1">
                                {message.legalSources.map((source, idx) => (
                                  <p key={idx} className="text-xs text-custom-text-secondary dark:text-gray-400 italic">
                                    {source.reference}: {source.title} {source.url && <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">(Link)</a>}
                                  </p>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                        <p className="text-[10px] mt-3 text-custom-text-secondary dark:text-gray-400">
                          {message.timestamp} · Maven AI
                        </p>
                      </div>
                    </div>
                  </div>
                )
              ))}

              {isLoading && (
                <div className="flex justify-start gap-3 opacity-60">
                  <div className="size-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 shrink-0">
                    <MoreHorizontal className="w-4 h-4 animate-pulse" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                    <p className="text-xs font-medium italic">
                      Maven is analyzing your query...
                    </p>
                  </div>
                </div>
              )}
              {error && (
                <div className="flex justify-start gap-3">
                  <div className="size-8 rounded bg-red-500 flex items-center justify-center text-white shrink-0">
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg px-4 py-2">
                    <p className="text-xs font-medium italic">{error}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <form onSubmit={handleSendMessage} className="p-6 bg-white dark:bg-custom-dark-bg border-t border-custom-border-light dark:border-gray-700">
              <div className="flex items-end gap-3 bg-background-light dark:bg-gray-800 rounded-xl p-2 border border-transparent focus-within:border-primary-500/50 transition-all">
                <button type="button" className="p-2 text-custom-text-secondary hover:text-primary-500">
                  <Paperclip className="w-5 h-5" />
                </button>
                <textarea
                  className="form-input flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none placeholder:text-custom-text-secondary min-h-[2.5rem]"
                  placeholder="Ask Maven about CIT compliance..."
                  rows="1"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                ></textarea>
                <div className="flex gap-1 pb-1 pr-1">
                  <button type="button" className="p-2 text-custom-text-secondary hover:text-primary-500" disabled={isLoading}>
                    <Mic className="w-5 h-5" />
                  </button>
                  <button
                    type="submit"
                    className="size-9 bg-primary-500 text-white rounded-lg flex items-center justify-center hover:bg-primary-500/90"
                    disabled={!inputMessage.trim() || isLoading}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-center text-custom-text-secondary dark:text-gray-500 mt-3">
                Maven AI can make mistakes. Please verify important legal citations with official tax gazettes.
              </p>
            </form>
          </div>
            </Panel>
          </Group>
          
          {/* Right Sidebar Panel */}
          {activeTab && (
            <div className="w-80 border-l border-custom-border-light dark:border-gray-700 bg-white dark:bg-custom-dark-bg flex flex-col shrink-0 transition-all duration-300 ease-in-out">
              <div className="h-16 border-b border-custom-border-light dark:border-gray-700 flex items-center justify-between px-6">
                <h3 className="font-bold text-custom-text-primary dark:text-white capitalize">
                  {activeTab === 'history' ? 'History' :
                   activeTab === 'bookmarked' ? 'Bookmarks' :
                   activeTab === 'reports' ? 'Reports' : 'Community'}
                </h3>
                <button onClick={() => setActiveTab(null)} className="text-custom-text-secondary hover:text-primary-500">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'history' && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-custom-text-secondary uppercase tracking-wider mb-3">Recent Chats</p>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-lg bg-background-light dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group">
                        <p className="text-sm font-medium text-custom-text-primary dark:text-white mb-1 group-hover:text-primary-500">Tax Inquiry #{2940 + i}</p>
                        <p className="text-xs text-custom-text-secondary dark:text-gray-400 truncate">How do I calculate VAT for digital services...</p>
                        <p className="text-[10px] text-custom-text-secondary dark:text-gray-500 mt-2 text-right">2 days ago</p>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'bookmarked' && (
                  <div className="flex flex-col items-center justify-center h-64 text-custom-text-secondary dark:text-gray-400">
                    <Bookmark className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">No bookmarks saved yet.</p>
                  </div>
                )}
                {activeTab === 'reports' && (
                  <div className="flex flex-col items-center justify-center h-64 text-custom-text-secondary dark:text-gray-400">
                    <BarChart3 className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Analytics reports unavailable.</p>
                  </div>
                )}
                {activeTab === 'community' && (
                  <div className="flex flex-col items-center justify-center h-64 text-custom-text-secondary dark:text-gray-400">
                    <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-sm">Community forum coming soon.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* History Sidebar Toggle (Far Right) */}
          <aside className="w-12 border-l border-custom-border-light dark:border-gray-700 bg-white dark:bg-custom-dark-bg flex flex-col items-center py-4 gap-6 shrink-0">
            <button onClick={() => toggleTab('history')} className={`${activeTab === 'history' ? 'text-primary-500' : 'text-custom-text-secondary hover:text-primary-500'}`} title="History" aria-label="View history">
              <History className="w-5 h-5" />
            </button>
            <button onClick={() => toggleTab('bookmarked')} className={`${activeTab === 'bookmarked' ? 'text-primary-500' : 'text-custom-text-secondary hover:text-primary-500'}`} title="Bookmarked" aria-label="View bookmarks">
              <Bookmark className="w-5 h-5" />
            </button>
            <div className="w-6 h-[1px] bg-custom-border-light dark:bg-gray-700"></div>
            <button onClick={() => toggleTab('reports')} className={`${activeTab === 'reports' ? 'text-primary-500' : 'text-custom-text-secondary hover:text-primary-500'}`} title="Reports" aria-label="View reports">
              <BarChart3 className="w-5 h-5" />
            </button>
            <button onClick={() => toggleTab('community')} className={`${activeTab === 'community' ? 'text-primary-500' : 'text-custom-text-secondary hover:text-primary-500'}`} title="Community" aria-label="View community chats">
              <MessageSquare className="w-5 h-5" />
            </button>
          </aside>
        </main>
      </div>
    </div>
  );
};

export default MavenAIChat;