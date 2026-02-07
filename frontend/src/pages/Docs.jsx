import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Folder, FileText,
  Receipt, Briefcase, Upload, Download, Trash2, RefreshCw,
  ChevronLeft, ChevronRight, Image, X, Circle, Check, Eye, Wallet
} from 'lucide-react';
import { documentService } from '../services/api';
import Header from '../components/Header'; // Import the new Header component

const DocumentStatusIcon = ({ status }) => {
  switch (status) {
    case 'completed':
      return (
        <div className="flex items-center gap-1.5 text-custom-firs-green">
          <Circle className="w-2 h-2 fill-current" />
          <span className="text-xs font-bold uppercase">Analyzed</span>
        </div>
      );
    case 'processing':
      return (
        <div className="flex items-center gap-1.5 text-orange-500">
          <Circle className="w-2 h-2 fill-current animate-pulse" />
          <span className="text-xs font-bold uppercase">Processing</span>
        </div>
      );
    case 'failed':
      return (
        <div className="flex items-center gap-1.5 text-red-500">
          <Circle className="w-2 h-2 fill-current" />
          <span className="text-xs font-bold uppercase">Error</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 text-gray-500">
          <Circle className="w-2 h-2 fill-current" />
          <span className="text-xs font-bold uppercase">{status}</span>
        </div>
      );
  }
};

// Document Detail Modal Component
const DocumentDetailModal = ({ document, onClose, isLoading, error }) => {
  if (!document && !isLoading && !error) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center p-4 z-50">
      <div className="bg-white dark:bg-background-dark rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-custom-border-light dark:border-custom-dark-border p-4">
          <h3 className="text-lg font-bold dark:text-white">Document Details: {document?.original_filename || 'Loading...'}</h3>
          <button onClick={onClose} className="text-custom-text-primary dark:text-white hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {isLoading ? (
            <p className="text-center text-custom-text-secondary">Loading details...</p>
          ) : error ? (
            <p className="text-center text-red-500">{error}</p>
          ) : document ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm dark:text-gray-300">
                <p><strong>Type:</strong> {document.document_type.replace('_', ' ')}</p>
                <p><strong>Uploaded:</strong> {new Date(document.created_at).toLocaleString()}</p>
                <p><strong>Size:</strong> {(document.file_size / (1024 * 1024)).toFixed(2)} MB</p>
                <p><strong>Processed:</strong> {document.is_processed ? 'Yes' : 'No'}</p>
                {document.processed_at && <p><strong>Processed At:</strong> {new Date(document.processed_at).toLocaleString()}</p>}
                <p><strong>Mime Type:</strong> {document.mime_type}</p>
              </div>

              {document.extraction_data && Object.keys(document.extraction_data).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold dark:text-white mb-2">Extracted Data:</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto dark:text-gray-200">
                    {JSON.stringify(document.extraction_data, null, 2)}
                  </pre>
                </div>
              )}

              {document.analysis_results && Object.keys(document.analysis_results).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold dark:text-white mb-2">Analysis Results:</h4>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto dark:text-gray-200">
                    {JSON.stringify(document.analysis_results, null, 2)}
                  </pre>
                </div>
              )}

              {(!document.extraction_data || Object.keys(document.extraction_data).length === 0) &&
               (!document.analysis_results || Object.keys(document.analysis_results).length === 0) && (
                <p className="text-custom-text-secondary dark:text-gray-400">
                  No extracted data or analysis results available yet. Document may still be processing or analysis not performed.
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-custom-text-secondary">No document selected or data could not be loaded.</p>
          )}
        </div>
        <div className="flex justify-end p-4 border-t border-custom-border-light dark:border-custom-dark-border">
          <button onClick={onClose} className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};


const MavenDocumentManager = () => {
  const [documents, setDocuments] = useState([]);
  const [documentStats, setDocumentStats] = useState({ total_documents: 0, processed_documents: 0 });
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocumentType, setSelectedDocumentType] = useState('');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(''); // e.g., 'last_30_days', '2023', '2024'
  const [selectedDocuments, setSelectedDocuments] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10; // Or use backend's default
  const [totalPages, setTotalPages] = useState(1);

  const [fileToUpload, setFileToUpload] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState(null);
  const [uploadErrorMessage, setUploadErrorMessage] = useState(null);
  const [showUploadTypeSelection, setShowUploadTypeSelection] = useState(false); // New state for type selection

  // State for Document Detail Modal
  const [showDocumentDetailModal, setShowDocumentDetailModal] = useState(false);
  const [selectedDocumentForDetail, setSelectedDocumentForDetail] = useState(null);
  const [isDocumentDetailLoading, setIsDocumentDetailLoading] = useState(false);
  const [documentDetailError, setDocumentDetailError] = useState(null);


  const fetchDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        page_size: pageSize,
        search: searchQuery || undefined,
        type: selectedDocumentType || undefined,
        time_period: selectedTimePeriod || undefined, // Include selectedTimePeriod in params
        // processed: true/false for status filter based on what backend provides
      };
      const response = await documentService.getDocuments(params);
      setDocuments(response.results);
      setTotalPages(Math.ceil(response.count / pageSize));
    } catch (err) {
      setError('Failed to fetch documents.');
      console.error('Error fetching documents:', err);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedDocumentType, selectedTimePeriod]);

  const fetchDocumentStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const stats = await documentService.getStats();
      setDocumentStats(stats);
    } catch (err) {
      console.error('Error fetching document stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    fetchDocumentStats();
  }, [fetchDocumentStats]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset page on new search
  };



  const handleTimePeriodChange = (e) => {
    setSelectedTimePeriod(e.target.value);
    setCurrentPage(1);
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allDocumentIds = new Set(documents.map(doc => doc.id));
      setSelectedDocuments(allDocumentIds);
    } else {
      setSelectedDocuments(new Set());
    }
  };

  const handleSelectDocument = (id) => {
    setSelectedDocuments(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedDocuments.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedDocuments.size} selected documents?`)) return;

    setError(null);
    try {
      await documentService.bulkDeleteDocuments(Array.from(selectedDocuments));
      setSelectedDocuments(new Set());
      fetchDocuments(); // Refresh list
      fetchDocumentStats(); // Refresh stats
      setUploadSuccessMessage('Selected documents deleted successfully!');
      setTimeout(() => setUploadSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to delete selected documents.');
      console.error('Bulk delete error:', err);
    }
  };



  const handleRefresh = () => {
    fetchDocuments();
    fetchDocumentStats();
    setSearchQuery('');
    setSelectedDocumentType('');
    setSelectedTimePeriod('');
    setCurrentPage(1);
    setSelectedDocuments(new Set());
    setFileToUpload(null); // Clear any pending upload
    setShowUploadTypeSelection(false);
  };

  const handleFileSelected = (file) => {
    setFileToUpload(file);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);
    setShowUploadTypeSelection(true); // Show document type selection
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleActualUpload = async () => {
    if (!fileToUpload) {
      setUploadErrorMessage('No file selected for upload.');
      return;
    }
    if (!selectedDocumentType) {
      setUploadErrorMessage('Please select a document type before uploading.');
      return;
    }

    setIsUploading(true);
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('document_type', selectedDocumentType);

    try {
      const response = await documentService.upload(formData);
      setUploadSuccessMessage(`File "${response.filename}" uploaded successfully! Processing...`);
      setFileToUpload(null); // Clear selected file
      setShowUploadTypeSelection(false); // Hide type selection
      setSelectedDocumentType(''); // Reset selected type
      fetchDocuments(); // Refresh document list
      fetchDocumentStats(); // Refresh stats
      setTimeout(() => setUploadSuccessMessage(null), 5000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to upload document.';
      setUploadErrorMessage(msg);
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleViewResults = async (documentId) => {
    setShowDocumentDetailModal(true);
    setIsDocumentDetailLoading(true);
    setDocumentDetailError(null);
    try {
      const detail = await documentService.getDocumentDetail(documentId);
      setSelectedDocumentForDetail(detail);
    } catch (err) {
      setDocumentDetailError('Failed to load document details.');
      console.error('Error fetching document details:', err);
      setSelectedDocumentForDetail(null); // Clear any previous document detail
    } finally {
      setIsDocumentDetailLoading(false);
    }
  };

  const handleCloseDocumentDetailModal = () => {
    setShowDocumentDetailModal(false);
    setSelectedDocumentForDetail(null);
    setDocumentDetailError(null);
  };

  const fileInputRef = useRef(null);

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setUploadErrorMessage(null);
    setUploadSuccessMessage(null);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
    e.currentTarget.classList.remove('border-primary-500', 'bg-primary-500/10');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('border-primary-500', 'bg-primary-500/10');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('border-primary-500', 'bg-primary-500/10');
  };


  return (
    <div className="light">
      <div className="bg-background-light dark:bg-background-dark font-sans text-custom-text-primary dark:text-white transition-colors duration-200">
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
          <Header />

          <div className="flex flex-1">
            {/* SideNavBar */}
            <aside className="w-64 flex flex-col border-r border-custom-border-light dark:border-custom-dark-border bg-background-light dark:bg-background-dark p-6 gap-8">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col">
                  <h1 className="text-sm font-bold uppercase tracking-wider text-custom-text-secondary">
                    Filters
                  </h1>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${!selectedDocumentType ? 'bg-primary-500 text-white' : 'text-custom-text-primary dark:text-gray-300 hover:bg-custom-input-bg dark:hover:bg-custom-darker-border'}`}
                    onClick={() => setSelectedDocumentType('')}
                  >
                    <Folder className="w-5 h-5" />
                    <span className="text-sm font-medium">All Documents</span>
                  </button>
                  {[
                    { value: 'tax_return', label: 'Tax Returns', icon: FileText },
                    { value: 'vat', label: 'VAT Documents', icon: Receipt },
                    { value: 'wht', label: 'WHT Documents', icon: Briefcase },
                    { value: 'invoice', label: 'Invoices', icon: Receipt },
                    { value: 'receipt', label: 'Receipts', icon: Receipt },
                    { value: 'bank_statement', label: 'Bank Statements', icon: Wallet },
                    { value: 'financial_statement', label: 'Financial Statements', icon: FileText },
                    { value: 'other', label: 'Other', icon: Folder },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg ${selectedDocumentType === type.value ? 'bg-primary-500 text-white' : 'text-custom-text-primary dark:text-gray-300 hover:bg-custom-input-bg dark:hover:bg-custom-darker-border'}`}
                      onClick={() => setSelectedDocumentType(type.value)}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <h1 className="text-sm font-bold uppercase tracking-wider text-custom-text-secondary">
                  Time Period
                </h1>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4 w-4"
                      type="radio"
                      name="timePeriod"
                      value=""
                      checked={selectedTimePeriod === ''}
                      onChange={handleTimePeriodChange}
                    />
                    <span className="text-sm dark:text-gray-300">All Time</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4 w-4"
                      type="radio"
                      name="timePeriod"
                      value="last_30_days"
                      checked={selectedTimePeriod === 'last_30_days'}
                      onChange={handleTimePeriodChange}
                    />
                    <span className="text-sm dark:text-gray-300">Last 30 Days</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4 w-4"
                      type="radio"
                      name="timePeriod"
                      value="2024"
                      checked={selectedTimePeriod === '2024'}
                      onChange={handleTimePeriodChange}
                    />
                    <span className="text-sm dark:text-gray-300">2024 (Current)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4 w-4"
                      type="radio"
                      name="timePeriod"
                      value="2023"
                      checked={selectedTimePeriod === '2023'}
                      onChange={handleTimePeriodChange}
                    />
                    <span className="text-sm dark:text-gray-300">2023 Tax Year</span>
                  </label>
                </div>
              </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto">
              {error && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                  {error}
                </div>
              )}
              {uploadSuccessMessage && (
                <div className="p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400" role="alert">
                  {uploadSuccessMessage}
                </div>
              )}
              {uploadErrorMessage && (
                <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400" role="alert">
                  {uploadErrorMessage}
                </div>
              )}

              {/* EmptyState / Upload Zone */}
              {!documents.length && !isLoadingDocuments ? (
                <div className="flex flex-col bg-white dark:bg-background-dark rounded-xl shadow-sm border border-custom-border-light dark:border-custom-dark-border overflow-hidden">
                  <div
                    className="nigerian-accent"
                    style={{
                      background: 'linear-gradient(90deg, #008751 0%, #008751 33%, #ffffff 33%, #ffffff 66%, #008751 66%, #008751 100%)',
                      height: '4px'
                    }}
                  ></div>
                  <div
                    className="flex flex-col items-center gap-6 px-6 py-12 border-2 border-dashed border-custom-hover-bg dark:border-custom-darker-border m-4 rounded-lg bg-gray-50/50 dark:bg-white/5"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="flex max-w-[520px] flex-col items-center gap-4">
                      <div className="size-16 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 dark:text-white">
                        <Upload className="w-8 h-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-custom-text-primary dark:text-white text-xl font-bold">
                          Drag and drop tax documents here
                        </p>
                        <p className="text-custom-text-secondary text-sm font-normal mt-1">
                          PDF, JPG, or PNG supported (Max 10MB)
                        </p>
                      </div>
                      {fileToUpload && !showUploadTypeSelection && (
                        <p className="text-sm font-medium text-custom-text-primary dark:text-white">
                          Selected file: {fileToUpload.name}
                          <button type="button" onClick={() => { setFileToUpload(null); setSelectedDocumentType(''); }} className="ml-2 text-red-500">
                            <X className="w-4 h-4 inline" />
                          </button>
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    {!fileToUpload && (
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="flex min-w-[140px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-6 bg-primary-500 text-white text-sm font-bold tracking-wide hover:bg-primary-500/90 transition-all"
                      >
                        <span className="truncate">Browse Files</span>
                      </button>
                    )}
                    {showUploadTypeSelection && (
                      <div className="mt-4 flex flex-col items-center gap-3">
                        <p className="text-sm font-medium dark:text-white">File selected: <span className="font-bold">{fileToUpload?.name}</span></p>
                        <select
                          className="form-select rounded-lg text-primary-500 dark:text-white focus:outline-0 focus:ring-2 focus:ring-secondary-400 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 h-10 p-[10px] text-sm leading-normal"
                          value={selectedDocumentType}
                          onChange={(e) => setSelectedDocumentType(e.target.value)}
                        >
                          <option value="">Select Document Type</option>
                          <option value="bank_statement">Bank Statement</option>
                          <option value="invoice">Invoice</option>
                          <option value="receipt">Receipt</option>
                          <option value="tax_return">Tax Return</option>
                          <option value="financial_statement">Financial Statement</option>
                          <option value="other">Other</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleActualUpload}
                          disabled={isUploading || !selectedDocumentType}
                          className="flex items-center justify-center rounded-lg h-11 px-6 bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isUploading ? 'Uploading...' : 'Upload Selected Document'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFileToUpload(null); setShowUploadTypeSelection(false); setSelectedDocumentType(''); }}
                          className="text-sm text-gray-500 dark:text-gray-400 hover:underline mt-2"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Toolbar & Table Container */
                <div className="flex flex-col bg-white dark:bg-background-dark rounded-xl shadow-sm border border-custom-border-light dark:border-custom-dark-border">
                  {/* ToolBar */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-custom-border-light dark:border-custom-dark-border">
                    {/* Left side: Heading and document count */}
                    <div className="flex items-center gap-4">
                      <h3 className="text-base font-bold dark:text-white">Recent Documents</h3>
                      <span className="bg-primary-500/10 text-primary-500 dark:bg-primary-500/30 dark:text-white text-xs px-2.5 py-1 rounded-full font-semibold">
                        {documentStats.total_documents} Files
                      </span>
                    </div>

                    {/* Right side: Upload button and utility buttons group */}
                    <div className="flex items-center gap-2">
                      {/* Upload Button */}
                      <button
                        type="button"
                        onClick={triggerFileInput}
                        className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary-500 text-white text-sm font-bold tracking-wide hover:bg-primary-500/90 transition-all"
                      >
                        <Upload className="w-4 h-4 mr-2" /> Upload Document
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {/* Utility Buttons Group */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="p-2 text-custom-text-primary dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Refresh List"
                          onClick={handleRefresh}
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto overflow-y-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-custom-dark-bg border-b border-custom-border-light dark:border-custom-dark-border">
                        <tr>
                          <th className="px-6 py-4 w-12">
                            <input
                              className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4 w-4"
                              type="checkbox"
                              onChange={handleSelectAll}
                              checked={selectedDocuments.size === documents.length && documents.length > 0}
                            />
                          </th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">
                            Document Name
                          </th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">
                            Type
                          </th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">
                            Date Uploaded
                          </th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">
                            Status
                          </th>
                          <th className="px-6 py-4 text-sm font-bold text-gray-600 dark:text-gray-300 text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-custom-border-light dark:divide-custom-dark-border">
                        {isLoadingDocuments ? (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-gray-500 dark:text-gray-400">
                              Loading documents...
                            </td>
                          </tr>
                        ) : documents.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center py-8 text-gray-500 dark:text-gray-400">
                              No documents found for current filters.
                            </td>
                          </tr>
                        ) : (
                          documents.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                              <td className="px-6 py-4">
                                <input
                                  className="rounded border-gray-300 text-primary-500 focus:ring-primary-500 h-4 w-4"
                                  type="checkbox"
                                  checked={selectedDocuments.has(doc.id)}
                                  onChange={() => handleSelectDocument(doc.id)}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  {doc.document_type === 'invoice' || doc.document_type === 'receipt' ? <Receipt className="w-5 h-5 text-primary-500/60" /> : <FileText className="w-5 h-5 text-primary-500/60" />}
                                  <span className="text-sm font-medium dark:text-white">
                                    {doc.original_filename}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                  {doc.document_type.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <DocumentStatusIcon status={doc.status} />
                              </td>
                              <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  className="text-primary-500 hover:underline text-sm font-bold"
                                  onClick={() => handleViewResults(doc.id)}
                                >
                                  <Eye className="w-4 h-4 inline mr-1" /> View Results
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination / Footer */}
                  <div className="flex items-center justify-between px-6 py-4 bg-gray-50 dark:bg-custom-dark-bg border-t border-custom-border-light dark:border-custom-dark-border rounded-b-xl">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Showing {documents.length} of {documentStats.total_documents} results
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex items-center justify-center rounded border border-custom-hover-bg dark:border-custom-darker-border h-8 w-8 bg-white dark:bg-background-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || isLoadingDocuments}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-custom-text-primary dark:text-white px-2 flex items-center">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        type="button"
                        className="flex items-center justify-center rounded border border-custom-hover-bg dark:border-custom-darker-border h-8 w-8 bg-white dark:bg-background-dark hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || isLoadingDocuments}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

        {/* Floating Batch Action Toast */}
        {selectedDocuments.size > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-primary-500 text-white px-6 py-3 rounded-full shadow-2xl z-50">
            <span className="text-sm font-medium">{selectedDocuments.size} documents selected</span>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex gap-4">
              <button
                type="button"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-sm font-bold"
                onClick={() => alert('Download functionality not yet implemented.')}
              >
                <Download className="w-4 h-4" /> Download
              </button>
              <button
                type="button"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-sm font-bold text-red-300"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </div>
            <button type="button" className="hover:bg-white/10 rounded-full p-1 transition-colors" onClick={() => setSelectedDocuments(new Set())}>
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {showDocumentDetailModal && (
          <DocumentDetailModal
            document={selectedDocumentForDetail}
            onClose={handleCloseDocumentDetailModal}
            isLoading={isDocumentDetailLoading}
            error={documentDetailError}
          />
        )}
      </div>
    </div>
  );
};

export default MavenDocumentManager;