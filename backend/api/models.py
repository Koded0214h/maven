# api/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User


class TaxCategory(models.Model):
    """Tax categories and topics"""
    TAX_TYPE_CHOICES = (
        ('vat', 'Value Added Tax (VAT)'),
        ('wht', 'Withholding Tax (WHT)'),
        ('cit', 'Company Income Tax (CIT)'),
        ('pita', 'Personal Income Tax (PITA)'),
        ('paye', 'PAYE'),
        ('customs', 'Customs & Excise'),
        ('stamp', 'Stamp Duties'),
        ('other', 'Other Taxes'),
    )
    
    name = models.CharField(max_length=100)
    tax_type = models.CharField(max_length=20, choices=TAX_TYPE_CHOICES)
    description = models.TextField()
    keywords = models.JSONField(default=list)  # For search optimization
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} ({self.get_tax_type_display()})"


class LegalSource(models.Model):
    """Legal sources for tax information"""
    SOURCE_TYPE_CHOICES = (
        ('act', 'Act of Parliament'),
        ('circular', 'FIRS Circular'),
        ('regulation', 'Regulation'),
        ('guideline', 'Guideline'),
        ('case_law', 'Case Law'),
        ('publication', 'Publication'),
    )
    
    title = models.CharField(max_length=500)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES)
    reference = models.CharField(max_length=100)  # e.g., "VAT Act, Section 2"
    content = models.TextField()  # Full text or summary
    url = models.URLField(blank=True)
    effective_date = models.DateField()
    is_active = models.BooleanField(default=True)
    jurisdiction = models.CharField(max_length=100, default='Federal')  # Federal or State
    related_categories = models.ManyToManyField(TaxCategory)
    metadata = models.JSONField(default=dict)  # Additional metadata
    
    def __str__(self):
        return f"{self.title} - {self.reference}"


class ChatQuery(models.Model):
    """User queries and AI responses"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='queries')
    query_text = models.TextField()
    response_text = models.TextField()
    tax_categories = models.ManyToManyField(TaxCategory, blank=True)
    legal_sources = models.ManyToManyField(LegalSource, blank=True)
    context_data = models.JSONField(default=dict)  # User context for the query
    is_premium = models.BooleanField(default=False)  # Whether this was a premium query
    tokens_used = models.IntegerField(default=0)
    confidence_score = models.FloatField(default=0.0)
    feedback_score = models.IntegerField(null=True, blank=True)  # 1-5 rating
    feedback_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email}: {self.query_text[:50]}..."


class AIConversation(models.Model):
    """Extended conversations with AI"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='conversations')
    title = models.CharField(max_length=200)
    messages = models.JSONField(default=list)  # List of message objects
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email}: {self.title}"


class VoiceCall(models.Model):
    """Voice-based advisory calls"""
    CALL_STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Failed'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='voice_calls')
    call_reference = models.CharField(max_length=100, unique=True)
    scheduled_time = models.DateTimeField()
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=CALL_STATUS_CHOICES, default='scheduled')
    topic = models.TextField()
    preferred_language = models.CharField(max_length=10, default='en')
    call_recording_url = models.URLField(blank=True)
    transcription = models.TextField(blank=True)
    summary = models.TextField(blank=True)
    action_items = models.JSONField(default=list)
    legal_references = models.ManyToManyField(LegalSource, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_paid = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Call {self.call_reference} - {self.user.email}"

class PartnerFirm(models.Model):
    """Partner tax and audit firms"""
    FIRM_TYPE_CHOICES = (
        ('tax', 'Tax Consulting'),
        ('audit', 'Audit Firm'),
        ('legal', 'Legal Firm'),
        ('accounting', 'Accounting Firm'),
    )

    name = models.CharField(max_length=255)
    firm_type = models.CharField(max_length=20, choices=FIRM_TYPE_CHOICES)
    description = models.TextField()
    services = models.JSONField(default=list)
    states_covered = models.JSONField(default=list)  # List of Nigerian states
    website = models.URLField(blank=True)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    is_verified = models.BooleanField(default=False)
    rating = models.FloatField(default=0.0)
    review_count = models.IntegerField(default=0)
    lead_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    commission_rate = models.FloatField(default=0.1)  # 10% default commission
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class LeadReferral(models.Model):
    """Referrals to partner firms"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('contacted', 'Contacted'),
        ('converted', 'Converted'),
        ('rejected', 'Rejected'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='referrals')
    partner_firm = models.ForeignKey(PartnerFirm, on_delete=models.CASCADE, related_name='leads')
    query = models.ForeignKey(ChatQuery, on_delete=models.SET_NULL, null=True, blank=True)
    voice_call = models.ForeignKey(VoiceCall, on_delete=models.SET_NULL, null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    partner_feedback = models.TextField(blank=True)
    conversion_value = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    commission_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Lead from {self.user.email} to {self.partner_firm.name}"
class FinancialDocument(models.Model):
    """Uploaded financial documents for analysis"""
    DOCUMENT_TYPE_CHOICES = (
        ('bank_statement', 'Bank Statement'),
        ('invoice', 'Invoice'),
        ('receipt', 'Receipt'),
        ('tax_return', 'Tax Return'),
        ('financial_statement', 'Financial Statement'),
        ('other', 'Other'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPE_CHOICES)
    original_filename = models.CharField(max_length=255)
    file = models.FileField(upload_to='financial_docs/%Y/%m/%d/')
    file_size = models.IntegerField()
    mime_type = models.CharField(max_length=100)
    extraction_data = models.JSONField(null=True, blank=True)  # Extracted data from document
    analysis_results = models.JSONField(null=True, blank=True)  # AI analysis results
    is_processed = models.BooleanField(default=False)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.email} - {self.document_type}"

class SubscriptionPlan(models.Model):


    """Subscription plans"""
    PLAN_TYPE_CHOICES = (
        ('free', 'Free'),
        ('pro', 'Pro'),
        ('business', 'Business'),
        ('enterprise', 'Enterprise'),
    )
    name = models.CharField(max_length=100)
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, unique=True)
    description = models.TextField()
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    price_yearly = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    features = models.JSONField(default=list)
    query_limit = models.IntegerField(default=50)  # -1 for unlimited
    voice_call_minutes = models.IntegerField(default=0)
    document_uploads = models.IntegerField(default=0)
    max_users = models.IntegerField(default=1)  # For team plan
    is_active = models.BooleanField(default=True)
    stripe_price_id = models.CharField(max_length=100, blank=True)
    def __str__(self):
        return f"{self.name} ({self.plan_type})"

class PaymentTransaction(models.Model):

    """Payment transactions"""
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='NGN')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=50)
    payment_type = models.CharField(max_length=50, default='other')
    stripe_payment_intent_id = models.CharField(max_length=100, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    paystack_reference = models.CharField(max_length=100, blank=True)
    paystack_access_code = models.CharField(max_length=100, blank=True)
    paystack_authorization_url = models.URLField(blank=True)
    subscription_plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True)
    voice_call = models.ForeignKey(VoiceCall, on_delete=models.SET_NULL, null=True, blank=True)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return f"Payment {self.id} - {self.user.email} - {self.amount:.2f}"
    def mark_as_success(self, response_data):
        self.status = 'completed'
        self.metadata['verification_response'] = response_data
        self.save()

