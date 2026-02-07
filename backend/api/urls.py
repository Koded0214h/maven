# api/urls.py
from django.urls import path, include
from .views import (
    AIChatAPI, ConversationListAPI, 
    ConversationDetailAPI, QueryHistoryAPI,
    QueryFeedbackAPI, TaxCategoriesAPI,
    LegalSourcesAPI, TaxComplianceCheckAPI,
    VoiceCallScheduleAPI, VoiceCallListAPI, 
    VoiceCallDetailAPI, VoiceCallCancelAPI,
    VoiceCallAvailabilityAPI,
    PartnerFirmListAPI, PartnerFirmDetailAPI,
    LeadReferralCreateAPI, LeadReferralListAPI,
    PartnerSignupRequestAPI, PartnerCommissionAPI,
    DocumentUploadAPI, DocumentListAPI,
    DocumentDetailAPI, DocumentAnalysisAPI,
    DocumentExportAPI, DocumentStatsAPI,
    DocumentPreviewAPI, DocumentBulkDeleteAPI,
    DocumentProcessingStatusAPI, DocumentTemplateAPI,
    InitializePaymentAPI, VerifyPaymentAPI,
    PaystackWebhookAPI, SubscriptionPlansAPI,
    PaymentHistoryAPI, DashboardAPI
)

urlpatterns = [
    # Dashboard endpoint
    path('dashboard/', DashboardAPI.as_view(), name='dashboard'),

    # AI Chat endpoints
    path('ai/chat/', AIChatAPI.as_view(), name='ai-chat'),
    path('ai/conversations/', ConversationListAPI.as_view(), name='conversation-list'),
    path('ai/conversations/<int:pk>/', ConversationDetailAPI.as_view(), name='conversation-detail'),
    path('ai/queries/', QueryHistoryAPI.as_view(), name='query-history'),
    path('ai/queries/<int:query_id>/feedback/', QueryFeedbackAPI.as_view(), name='query-feedback'),
    path('ai/tax-categories/', TaxCategoriesAPI.as_view(), name='tax-categories'),
    path('ai/legal-sources/', LegalSourcesAPI.as_view(), name='legal-sources'),
    path('ai/compliance-check/', TaxComplianceCheckAPI.as_view(), name='compliance-check'),
    
    # Voice Call endpoints
    path('voice/schedule/', VoiceCallScheduleAPI.as_view(), name='voice-schedule'),
    path('voice/calls/', VoiceCallListAPI.as_view(), name='voice-list'),
    path('voice/calls/<int:pk>/', VoiceCallDetailAPI.as_view(), name='voice-detail'),
    path('voice/calls/<int:call_id>/cancel/', VoiceCallCancelAPI.as_view(), name='voice-cancel'),
    path('voice/availability/', VoiceCallAvailabilityAPI.as_view(), name='voice-availability'),
    
    # Partner endpoints
    path('partners/', PartnerFirmListAPI.as_view(), name='partner-list'),
    path('partners/<int:pk>/', PartnerFirmDetailAPI.as_view(), name='partner-detail'),
    path('partners/refer/', LeadReferralCreateAPI.as_view(), name='lead-referral'),
    path('partners/my-referrals/', LeadReferralListAPI.as_view(), name='my-referrals'),
    path('partners/signup/', PartnerSignupRequestAPI.as_view(), name='partner-signup'),
    path('partners/commission/', PartnerCommissionAPI.as_view(), name='partner-commission'),
    
    # Document endpoints
    path('documents/upload/', DocumentUploadAPI.as_view(), name='document-upload'),
    path('documents/', DocumentListAPI.as_view(), name='document-list'),
    path('documents/<int:pk>/', DocumentDetailAPI.as_view(), name='document-detail'),
    path('documents/<int:document_id>/export/', DocumentExportAPI.as_view(), name='document-export'),
    path('documents/analyze/', DocumentAnalysisAPI.as_view(), name='document-analyze'),
    path('documents/stats/', DocumentStatsAPI.as_view(), name='document-stats'),
    path('documents/<int:document_id>/preview/', DocumentPreviewAPI.as_view(), name='document-preview'),
    path('documents/bulk-delete/', DocumentBulkDeleteAPI.as_view(), name='document-bulk-delete'),
    path('documents/<int:document_id>/status/', DocumentProcessingStatusAPI.as_view(), name='document-status'),
    path('documents/templates/', DocumentTemplateAPI.as_view(), name='document-templates'),
    
    # Payment endpoints
    path('payments/initialize/', InitializePaymentAPI.as_view(), name='payment-initialize'),
    path('payments/verify/', VerifyPaymentAPI.as_view(), name='payment-verify'),
    path('payments/webhook/', PaystackWebhookAPI.as_view(), name='paystack-webhook'),
    path('subscriptions/plans/', SubscriptionPlansAPI.as_view(), name='subscription-plans'),
    path('payments/history/', PaymentHistoryAPI.as_view(), name='payment-history'),
]