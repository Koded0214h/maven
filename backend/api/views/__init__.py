# api/views/__init__.py
from .ai_views import (
    AIChatAPI, ConversationListAPI, ConversationDetailAPI,
    QueryHistoryAPI, QueryFeedbackAPI, TaxCategoriesAPI,
    LegalSourcesAPI, TaxComplianceCheckAPI
)
from .voice_views import (
    VoiceCallScheduleAPI, VoiceCallListAPI, 
    VoiceCallDetailAPI, VoiceCallCancelAPI,
    VoiceCallAvailabilityAPI
)
from .partner_views import (
    PartnerFirmListAPI, PartnerFirmDetailAPI,
    LeadReferralCreateAPI, LeadReferralListAPI,
    PartnerSignupRequestAPI, PartnerCommissionAPI
)
from .document_views import (
    DocumentUploadAPI, DocumentListAPI,
    DocumentDetailAPI, DocumentAnalysisAPI,
    DocumentExportAPI, DocumentStatsAPI,
    DocumentPreviewAPI, DocumentBulkDeleteAPI,
    DocumentProcessingStatusAPI, DocumentTemplateAPI
)
from .payment_views import (
    InitializePaymentAPI, VerifyPaymentAPI,
    PaystackWebhookAPI, SubscriptionPlansAPI,
    PaymentHistoryAPI
)
from .dashboard_views import DashboardAPI