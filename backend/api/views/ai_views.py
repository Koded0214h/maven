# api/views/ai_views.py (FIXED VERSION)
import json
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from django.conf import settings
from django.utils import timezone
from django.db.models import Q
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiParameter, OpenApiTypes
from api.models import ChatQuery, AIConversation, TaxCategory, LegalSource, FinancialDocument as Document
from api.serializers import (
    AIQueryRequestSerializer, ChatQuerySerializer,
    AIConversationSerializer, TaxCategorySerializer,
    LegalSourceSerializer
)
from users.models import User
from api.gemini_client import GeminiClient


class StandardResultsSetPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class AIChatAPI(APIView):
    """Main AI Chat endpoint using Gemini"""
    permission_classes = [permissions.IsAuthenticated]
    
    def __init__(self):
        super().__init__()
        # Initialize gemini_client lazily to avoid errors during schema generation
        self._gemini_client = None
    
    @property
    def gemini_client(self):
        """Lazy initialization of Gemini client"""
        if self._gemini_client is None:
            try:
                self._gemini_client = GeminiClient()
            except Exception as e:
                print(f"⚠️  Could not initialize GeminiClient: {str(e)}")
                # Create a dummy client with fallback methods
                self._gemini_client = type('DummyClient', (), {
                    'is_configured': False,
                    'generate_response': lambda self, prompt: ("AI service not configured. Please check your Gemini API key settings.", 0),
                    'create_tax_prompt': lambda self, *args: "AI service not configured."
                })()
        return self._gemini_client
    
    @extend_schema(
        request=AIQueryRequestSerializer,
        responses={
            200: inline_serializer(
                name='AIChatResponse',
                fields={
                    'response': serializers.CharField(),
                    'query_id': serializers.IntegerField(),
                    'legal_sources': serializers.ListField(child=serializers.DictField()),
                    'conversation_id': serializers.IntegerField(),
                    'tokens_used': serializers.IntegerField(),
                    'remaining_queries': serializers.CharField()
                }
            )
        }
    )
    def post(self, request):
        serializer = AIQueryRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        query_text = serializer.validated_data['query']
        conversation_id = serializer.validated_data.get('conversation_id')
        context = serializer.validated_data.get('context', {})
        
        # Check if user can make query
        if not user.can_make_query():
            return Response({
                'error': 'Query limit exceeded. Please upgrade your plan.'
            }, status=status.HTTP_402_PAYMENT_REQUIRED)
        
        # Check for conversation
        conversation = None
        if conversation_id:
            try:
                conversation = AIConversation.objects.get(
                    id=conversation_id,
                    user=user,
                    is_active=True
                )
            except AIConversation.DoesNotExist:
                pass
        
        # Get relevant legal sources
        legal_sources = self.get_relevant_sources(query_text)
        
        # Get relevant user documents for context
        try:
            user_docs = Document.objects.filter(user=user).order_by('-created_at')[:3]
            if user_docs.exists():
                docs_summary = "User's Recent Documents:\n"
                for doc in user_docs:
                    docs_summary += f"- {doc.original_filename} ({doc.document_type})\n"
                    if doc.analysis_results:
                        docs_summary += f"  Analysis: {str(doc.analysis_results)[:1000]}...\n"
                context['user_documents'] = docs_summary
        except Exception as e:
            print(f"Error fetching user docs: {e}")

        # Generate AI response using Gemini
        if hasattr(self.gemini_client, 'is_configured') and not self.gemini_client.is_configured:
            response_text = self.gemini_client.get_fallback_response()
            tokens_used = 0
        else:
            prompt = self.gemini_client.create_tax_prompt(query_text, legal_sources, user, context)
            response_text, tokens_used = self.gemini_client.generate_response(prompt)
        
        # Create chat query record
        chat_query = ChatQuery.objects.create(
            user=user,
            query_text=query_text,
            response_text=response_text,
            context_data=context,
            tokens_used=tokens_used,
            confidence_score=0.9
        )
        
        # Add legal sources
        chat_query.legal_sources.set(legal_sources)
        
        # Update conversation if exists
        if conversation:
            conversation.messages.append({
                'role': 'user',
                'content': query_text,
                'timestamp': timezone.now().isoformat()
            })
            conversation.messages.append({
                'role': 'assistant',
                'content': response_text,
                'timestamp': timezone.now().isoformat()
            })
            conversation.save()
        else:
            # Create new conversation
            conversation = AIConversation.objects.create(
                user=user,
                title=query_text[:50] + ('...' if len(query_text) > 50 else ''),
                messages=[
                    {
                        'role': 'user',
                        'content': query_text,
                        'timestamp': timezone.now().isoformat()
                    },
                    {
                        'role': 'assistant',
                        'content': response_text,
                        'timestamp': timezone.now().isoformat()
                    }
                ]
            )
        
        # Increment user query count
        user.increment_query_count()
        
        return Response({
            'response': response_text,
            'query_id': chat_query.id,
            'legal_sources': [
                {
                    'title': source.title,
                    'reference': source.reference,
                    'url': source.url,
                    'effective_date': source.effective_date.strftime('%Y-%m-%d') if source.effective_date else None
                }
                for source in legal_sources
            ],
            'conversation_id': conversation.id,
            'tokens_used': tokens_used,
            'remaining_queries': user.query_limit - user.queries_used if user.query_limit != -1 else 'unlimited'
        })
    
    def get_relevant_sources(self, query_text):
        """Get relevant legal sources for query"""
        # Tokenize and search
        keywords = query_text.lower().split()
        
        # Build OR query for all keywords
        query = Q()
        for keyword in keywords:
            if len(keyword) > 3:  # Ignore short words
                query |= Q(title__icontains=keyword)
                query |= Q(content__icontains=keyword)
                query |= Q(reference__icontains=keyword)
                query |= Q(related_categories__keywords__icontains=keyword)
        
        # Get active sources
        sources = LegalSource.objects.filter(
            query,
            is_active=True
        ).distinct()[:7]  # Get 7 most relevant
        
        return list(sources)


class ConversationListAPI(generics.ListCreateAPIView):
    """List and create conversations"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIConversationSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        return AIConversation.objects.filter(
            user=self.request.user,
            is_active=True
        ).order_by('-updated_at')
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ConversationDetailAPI(generics.RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete conversation"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AIConversationSerializer
    
    def get_queryset(self):
        return AIConversation.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()


class QueryHistoryAPI(generics.ListAPIView):
    """Get user's query history"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ChatQuerySerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        # Optional filtering by date
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        queryset = ChatQuery.objects.filter(user=self.request.user)
        
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        
        return queryset.order_by('-created_at')


class QueryFeedbackAPI(APIView):
    """Submit feedback for a query"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request=inline_serializer(
            name='QueryFeedbackRequest',
            fields={
                'score': serializers.IntegerField(min_value=1, max_value=5),
                'comment': serializers.CharField(required=False)
            }
        ),
        responses={200: OpenApiTypes.OBJECT}
    )
    def post(self, request, query_id):
        try:
            query = ChatQuery.objects.get(id=query_id, user=request.user)
        except ChatQuery.DoesNotExist:
            return Response(
                {'error': 'Query not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        score = request.data.get('score')
        comment = request.data.get('comment', '')
        
        if not score or not 1 <= int(score) <= 5:
            return Response(
                {'error': 'Score must be between 1 and 5'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        query.feedback_score = int(score)
        query.feedback_comment = comment
        query.save()
        
        return Response({
            'status': 'success',
            'message': 'Feedback submitted successfully'
        })


class TaxCategoriesAPI(generics.ListAPIView):
    """Get all tax categories"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = TaxCategorySerializer
    queryset = TaxCategory.objects.all().order_by('name')
    
    def list(self, request, *args, **kwargs):
        # Group by tax type for better organization
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        
        # Group categories by tax type
        grouped_data = {}
        for category in serializer.data:
            tax_type = category['tax_type']
            if tax_type not in grouped_data:
                grouped_data[tax_type] = []
            grouped_data[tax_type].append(category)
        
        return Response(grouped_data)


class LegalSourcesAPI(generics.ListAPIView):
    """Get legal sources with filtering"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = LegalSourceSerializer
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self):
        queryset = LegalSource.objects.filter(is_active=True)
        
        # Filter by tax type
        tax_type = self.request.query_params.get('tax_type')
        if tax_type:
            queryset = queryset.filter(related_categories__tax_type=tax_type)
        
        # Filter by jurisdiction
        jurisdiction = self.request.query_params.get('jurisdiction')
        if jurisdiction:
            queryset = queryset.filter(jurisdiction__iexact=jurisdiction)
        
        # Filter by source type
        source_type = self.request.query_params.get('source_type')
        if source_type:
            queryset = queryset.filter(source_type=source_type)
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(reference__icontains=search) |
                Q(content__icontains=search)
            )
        
        return queryset.distinct().order_by('-effective_date', 'title')


class TaxComplianceCheckAPI(APIView):
    """Check tax compliance for a business"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request=inline_serializer(
            name='ComplianceCheckRequest',
            fields={
                'business_data': serializers.DictField()
            }
        ),
        responses={200: OpenApiTypes.OBJECT}
    )
    def post(self, request):
        business_data = request.data.get('business_data', {})
        
        # Validate required fields
        required_fields = ['business_type', 'annual_revenue', 'employees_count', 'state']
        for field in required_fields:
            if field not in business_data:
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Generate compliance check using AI
        try:
            gemini_client = GeminiClient()
            if hasattr(gemini_client, 'is_configured') and not gemini_client.is_configured:
                response_text = gemini_client.get_fallback_response()
            else:
                prompt = self.create_compliance_prompt(business_data, request.user)
                response_text, _ = gemini_client.generate_response(prompt)
        except Exception as e:
            response_text = f"AI service error: {str(e)}. Please check your configuration."
        
        # Store compliance check result
        compliance_check = {
            'business_data': business_data,
            'compliance_report': response_text,
            'generated_at': timezone.now().isoformat()
        }
        
        # Update user profile with compliance data
        user_profile = request.user.profile
        if 'compliance_checks' not in user_profile.notification_preferences:
            user_profile.notification_preferences['compliance_checks'] = []
        user_profile.notification_preferences['compliance_checks'].append(compliance_check)
        user_profile.save()
        
        return Response({
            'compliance_report': response_text,
            'business_data': business_data,
            'generated_at': compliance_check['generated_at']
        })
    
    def create_compliance_prompt(self, business_data, user):
        """Create prompt for compliance check"""
        # Format the revenue nicely
        try:
            annual_revenue = float(business_data.get('annual_revenue', 0))
            revenue_formatted = f"₦{annual_revenue:,.2f}"
        except:
            revenue_formatted = business_data.get('annual_revenue', '0')
        
        prompt = f"""As a Nigerian Tax Compliance Expert, analyze this business for tax compliance:

BUSINESS PROFILE:
- Type: {business_data.get('business_type')}
- Annual Revenue: {revenue_formatted}
- Employees: {business_data.get('employees_count')}
- State: {business_data.get('state')}
- Sector: {business_data.get('sector', 'Not specified')}
- VAT Registered: {business_data.get('vat_registered', 'Not specified')}
- TIN: {business_data.get('tin', 'Not specified')}

COMPLIANCE CHECKLIST:
1. Company Registration & Business Name
2. Tax Identification Number (TIN)
3. VAT Registration Requirements
4. PAYE Registration & Compliance
5. Withholding Tax (WHT) Obligations
6. Annual Returns & Tax Clearance Certificate
7. State-specific levies and taxes
8. Industry-specific regulations

PROVIDE A DETAILED COMPLIANCE REPORT INCLUDING:
1. Current compliance status for each requirement
2. Missing registrations or filings
3. Estimated penalties for non-compliance
4. Step-by-step actions to achieve compliance
5. Recommended timeline for each action
6. Estimated costs (government fees & professional fees)
7. Priority actions (urgent vs important)

FORMAT THE RESPONSE CLEARLY WITH SECTIONS AND BULLET POINTS.
BASE ALL ADVICE ON CURRENT NIGERIAN TAX LAWS AND REGULATIONS."""

        return prompt