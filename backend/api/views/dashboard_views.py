# backend/api/views/dashboard_views.py
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from datetime import timedelta 

from api.models import FinancialDocument, VoiceCall, AIConversation, ChatQuery
from api.serializers import (
    FinancialDocumentSerializer, 
    VoiceCallSerializer, 
    AIConversationSerializer
)
from users.serializers import UserSerializer # Import UserSerializer

class DashboardAPI(APIView):
    """
    Aggregate data for the user's dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Current month calculation for monthly stats
        now = timezone.now()
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Queries used this month
        monthly_queries_used = ChatQuery.objects.filter(
            user=user,
            created_at__gte=start_of_month
        ).count()

        # Documents analyzed this month
        monthly_documents_analyzed = FinancialDocument.objects.filter(
            user=user,
            created_at__gte=start_of_month,
            is_processed=True
        ).count()

        # Document Stats
        doc_stats_data = {
            'total_documents': FinancialDocument.objects.filter(user=user).count(),
            'monthly_analyzed': monthly_documents_analyzed, 
        }

        # Recent Conversations (for query history)
        recent_conversations = AIConversation.objects.filter(user=user, is_active=True).order_by('-updated_at')[:3]
        conversations_data = AIConversationSerializer(recent_conversations, many=True).data

        # Recent Documents
        recent_documents = FinancialDocument.objects.filter(user=user).order_by('-created_at')[:3]
        documents_data = FinancialDocumentSerializer(recent_documents, many=True).data

        # Upcoming Voice Calls (scheduled)
        upcoming_calls = VoiceCall.objects.filter(
            user=user,
            status='scheduled',
            scheduled_time__gte=timezone.now()
        ).order_by('scheduled_time')[:3]
        voice_calls_data = VoiceCallSerializer(upcoming_calls, many=True).data

        # Serialize current user data to include updated query counts
        current_user_data = UserSerializer(user).data
        current_user_data['queries_used'] = monthly_queries_used # Override queries_used with monthly count

        data = {
            'docStats': doc_stats_data,
            'queryHistory': { 'results': conversations_data },
            'documents': { 'results': documents_data },
            'voiceCalls': { 'results': voice_calls_data },
            'current_user_data': current_user_data, # Add serialized user data
        }
        
        return Response(data)
