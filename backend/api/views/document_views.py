# api/views/document_views.py (COMPLETE VERSION)
import pandas as pd
import json
import csv
from datetime import timedelta
from django.http import HttpResponse
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.files.storage import default_storage
from django.db import models
from django.utils import timezone
from api.models import FinancialDocument
from api.serializers import (
    FinancialDocumentSerializer, 
    DocumentAnalysisRequestSerializer
)
from api.gemini_client import GeminiClient
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiTypes, OpenApiParameter


class DocumentUploadAPI(APIView):
    """Upload financial documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    ALLOWED_EXTENSIONS = {
        'pdf': 'application/pdf',
        'csv': 'text/csv',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @extend_schema(
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {'type': 'string', 'format': 'binary'},
                    'document_type': {'type': 'string', 'enum': ['bank_statement', 'invoice', 'receipt', 'tax_return', 'financial_statement', 'other']}
                },
                'required': ['file']
            }
        },
        responses={
            200: inline_serializer(
                name='DocumentUploadResponse',
                fields={
                    'document_id': serializers.IntegerField(),
                    'filename': serializers.CharField(),
                    'file_size': serializers.IntegerField(),
                    'document_type': serializers.CharField(),
                    'message': serializers.CharField(),
                    'estimated_processing_time': serializers.CharField()
                }
            )
        }
    )
    def post(self, request):
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        document_type = request.data.get('document_type', 'other')
        
        # Validate file size
        if file.size > self.MAX_FILE_SIZE:
            return Response(
                {'error': f'File too large. Maximum size is {self.MAX_FILE_SIZE / (1024*1024)}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        extension = file.name.split('.')[-1].lower()
        if extension not in self.ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Invalid file type. Allowed types: {", ".join(self.ALLOWED_EXTENSIONS.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user's document upload limit
        user = request.user
        if not self.can_upload_document(user):
            return Response(
                {'error': 'Document upload limit reached. Upgrade your plan for more uploads.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Create document record
        document = FinancialDocument.objects.create(
            user=user,
            document_type=document_type,
            original_filename=file.name,
            file=file,
            file_size=file.size,
            mime_type=self.ALLOWED_EXTENSIONS[extension]
        )
        
        # Process document asynchronously
        self.process_document_async(document.id)
        
        # Update user's upload count
        self.update_upload_count(user)
        
        return Response({
            'document_id': document.id,
            'filename': file.name,
            'file_size': file.size,
            'document_type': document_type,
            'message': 'Document uploaded successfully. Processing...',
            'estimated_processing_time': '2-5 minutes'
        })
    
    def can_upload_document(self, user):
        """Check if user can upload more documents"""
        # Free tier: 3 documents/month
        # Pro tier: 10 documents/month
        # Business tier: Unlimited
        
        if user.subscription_tier == 'business':
            return True
        
        # Get current month's upload count
        current_month = timezone.now().month
        current_year = timezone.now().year
        
        monthly_uploads = FinancialDocument.objects.filter(
            user=user,
            created_at__year=current_year,
            created_at__month=current_month
        ).count()
        
        if user.subscription_tier == 'pro':
            return monthly_uploads < 10
        else:  # Free tier
            return monthly_uploads < 3
    
    def update_upload_count(self, user):
        """Update user's upload count in metadata"""
        profile = user.profile
        if 'upload_stats' not in profile.notification_preferences:
            profile.notification_preferences['upload_stats'] = {
                'total_uploads': 0,
                'monthly_uploads': {}
            }
        
        current_month = timezone.now().strftime('%Y-%m')
        stats = profile.notification_preferences['upload_stats']
        
        stats['total_uploads'] = stats.get('total_uploads', 0) + 1
        
        if current_month not in stats['monthly_uploads']:
            stats['monthly_uploads'][current_month] = 0
        stats['monthly_uploads'][current_month] += 1
        
        profile.save()
    
    def process_document_async(self, document_id):
        """Process document asynchronously"""
        # TODO: Implement Celery task for document processing
        # For now, process synchronously
        try:
            document = FinancialDocument.objects.get(id=document_id)
            self.extract_document_data(document)
        except Exception as e:
            print(f"Error processing document {document_id}: {str(e)}")
    
    def extract_document_data(self, document):
        """Extract data from uploaded document"""
        try:
            file_path = document.file.path
            
            if document.document_type == 'bank_statement':
                data = self.extract_bank_statement_data(file_path)
            elif document.document_type == 'invoice':
                data = self.extract_invoice_data(file_path)
            elif document.document_type == 'receipt':
                data = self.extract_receipt_data(file_path)
            else:
                data = self.extract_general_data(file_path)
            
            document.extraction_data = data
            document.is_processed = True
            document.processed_at = timezone.now()
            document.save()
            
        except Exception as e:
            document.metadata['processing_error'] = str(e)
            document.save()
    
    def extract_bank_statement_data(self, file_path):
        """Extract data from bank statement"""
        return {
            'type': 'bank_statement',
            'extraction_method': 'placeholder',
            'data_available': False,
            'message': 'Bank statement processing coming soon'
        }
    
    def extract_invoice_data(self, file_path):
        """Extract data from invoice"""
        return {
            'type': 'invoice',
            'extraction_method': 'placeholder',
            'data_available': False,
            'message': 'Invoice processing coming soon'
        }
    
    def extract_receipt_data(self, file_path):
        """Extract data from receipt"""
        return {
            'type': 'receipt',
            'extraction_method': 'placeholder',
            'data_available': False,
            'message': 'Receipt processing coming soon'
        }
    
    def extract_general_data(self, file_path):
        """Extract data from general documents"""
        return {
            'type': 'general',
            'extraction_method': 'placeholder',
            'data_available': False,
            'message': 'Document processing coming soon'
        }


class DocumentListAPI(generics.ListAPIView):
    """List user's documents"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FinancialDocumentSerializer
    
    def get_queryset(self):
        # Filter by document type if provided
        doc_type = self.request.query_params.get('type')
        queryset = FinancialDocument.objects.filter(user=self.request.user)
        
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        # Filter by processing status
        processed = self.request.query_params.get('processed')
        if processed is not None:
            queryset = queryset.filter(is_processed=processed.lower() == 'true')
        
        return queryset.order_by('-created_at')


class DocumentDetailAPI(generics.RetrieveDestroyAPIView):
    """Get or delete a specific document"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FinancialDocumentSerializer
    
    def get_queryset(self):
        return FinancialDocument.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        # Delete the actual file
        if instance.file:
            instance.file.delete(save=False)
        super().perform_destroy(instance)


class DocumentAnalysisAPI(APIView):
    """Analyze uploaded document using AI"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request=DocumentAnalysisRequestSerializer,
        responses={200: OpenApiTypes.OBJECT}
    )
    def post(self, request):
        serializer = DocumentAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document_id = serializer.validated_data['document_id']
        analysis_type = serializer.validated_data['analysis_type']
        
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if document is processed
        if not document.is_processed:
            return Response(
                {'error': 'Document is still being processed. Please try again later.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform AI analysis
        analysis_results = self.perform_ai_analysis(document, analysis_type)
        
        # Save analysis results
        if not document.analysis_results:
            document.analysis_results = {}
        
        document.analysis_results[analysis_type] = analysis_results
        document.save()
        
        return Response({
            'document_id': document.id,
            'document_type': document.document_type,
            'analysis_type': analysis_type,
            'results': analysis_results,
            'generated_at': timezone.now().isoformat()
        })
    
    def perform_ai_analysis(self, document, analysis_type):
        """Perform AI analysis on document using Gemini"""
        gemini_client = GeminiClient()
        
        # Create prompt based on document type and analysis type
        prompt = self.create_analysis_prompt(document, analysis_type)
        
        try:
            response_text, _ = gemini_client.generate_response(prompt)
            
            # Parse the response (assuming JSON format)
            try:
                results = json.loads(response_text)
            except json.JSONDecodeError:
                # If not JSON, return as text
                results = {
                    'analysis': response_text,
                    'format': 'text'
                }
            
            return results
            
        except Exception as e:
            return {
                'error': str(e),
                'message': 'AI analysis failed'
            }
    
    def create_analysis_prompt(self, document, analysis_type):
        """Create analysis prompt for Gemini"""
        user = document.user
        
        base_prompt = f"""As a Nigerian Tax and Financial Analysis AI, analyze this document:

DOCUMENT INFORMATION:
- Type: {document.document_type}
- Original Filename: {document.original_filename}
- Uploaded: {document.created_at.strftime('%Y-%m-%d %H:%M:%S')}

USER CONTEXT:
- Business Type: {user.get_user_type_display()}
- Company: {user.company_name or 'Not specified'}
- Location: {user.state or 'Not specified'}
- Business Sector: {user.business_sector or 'Not specified'}

EXTRACTED DATA (if available):
{json.dumps(document.extraction_data, indent=2)}

ANALYSIS TYPE: {analysis_type.upper()}

"""
        
        if analysis_type == 'tax_compliance':
            prompt = base_prompt + """
ANALYZE FOR TAX COMPLIANCE:
1. Identify potential tax obligations (VAT, WHT, CIT, PAYE, etc.)
2. Check for compliance issues or red flags
3. Identify missing documentation or records
4. Estimate potential penalties for non-compliance
5. Recommend corrective actions
6. Provide timeline for compliance actions

FORMAT RESPONSE AS JSON WITH:
- compliance_status (compliant/partially_compliant/non_compliant)
- identified_issues (array)
- tax_obligations (array with amounts and deadlines)
- recommendations (array)
- priority_actions (array)
- estimated_penalties (if any)
"""
        
        elif analysis_type == 'financial_health':
            prompt = base_prompt + """
ANALYZE FINANCIAL HEALTH:
1. Calculate key financial ratios
2. Assess liquidity, profitability, and solvency
3. Identify financial risks
4. Evaluate cash flow patterns
5. Compare to industry benchmarks (Nigerian context)
6. Provide improvement recommendations

FORMAT RESPONSE AS JSON WITH:
- financial_ratios (object with values and interpretations)
- risk_assessment (low/medium/high)
- strengths (array)
- weaknesses (array)
- recommendations (array)
- industry_benchmark_comparison
"""
        
        elif analysis_type == 'forecasting':
            prompt = base_prompt + """
GENERATE FINANCIAL FORECAST:
1. Project revenue trends for next 12 months
2. Forecast expenses and cash flow
3. Predict tax liabilities
4. Identify growth opportunities
5. Highlight potential financial challenges
6. Provide scenario analysis (best case/worst case/base case)

FORMAT RESPONSE AS JSON WITH:
- revenue_forecast (monthly for 12 months)
- expense_forecast (monthly for 12 months)
- cash_flow_projection (monthly for 12 months)
- tax_liability_forecast (quarterly)
- key_assumptions
- risks_and_opportunities
- recommendations
"""
        
        else:  # 'all' or default
            prompt = base_prompt + """
PROVIDE COMPREHENSIVE ANALYSIS INCLUDING:
1. Tax Compliance Assessment
2. Financial Health Analysis
3. Financial Forecasting
4. Actionable Recommendations

FORMAT RESPONSE AS COMPREHENSIVE JSON REPORT WITH ALL SECTIONS.
"""
        
        prompt += "\n\nIMPORTANT: Base all analysis on Nigerian financial regulations and tax laws. Provide specific references where applicable."
        
        return prompt


class DocumentExportAPI(APIView):
    """Export document analysis results"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='format', description='Export format (json, csv, pdf, excel)', required=False, type=str),
        ],
        responses={200: OpenApiTypes.BINARY}
    )
    def get(self, request, document_id):
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        export_format = request.query_params.get('format', 'json')
        
        if export_format == 'json':
            return self.export_json(document)
        elif export_format == 'csv':
            return self.export_csv(document)
        elif export_format == 'pdf':
            return self.export_pdf(document)
        elif export_format == 'excel':
            return self.export_excel(document)
        else:
            return Response(
                {'error': 'Unsupported export format'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def export_json(self, document):
        """Export analysis results as JSON"""
        data = {
            'document': {
                'id': document.id,
                'type': document.document_type,
                'filename': document.original_filename,
                'uploaded_at': document.created_at.isoformat(),
                'processed_at': document.processed_at.isoformat() if document.processed_at else None
            },
            'extraction_data': document.extraction_data,
            'analysis_results': document.analysis_results,
            'exported_at': timezone.now().isoformat(),
            'metadata': document.metadata
        }
        
        # Create a downloadable JSON file
        filename = f"maven_analysis_{document.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"
        response = Response(data)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Type'] = 'application/json'
        
        return response
    
    def export_csv(self, document):
        """Export analysis results as CSV"""
        if not document.analysis_results:
            return Response(
                {'error': 'No analysis results available for export'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        filename = f"maven_analysis_{document.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # Write document info
        writer.writerow(['Document Analysis Report'])
        writer.writerow(['Document ID', document.id])
        writer.writerow(['Filename', document.original_filename])
        writer.writerow(['Document Type', document.document_type])
        writer.writerow(['Uploaded At', document.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Processed At', document.processed_at.strftime('%Y-%m-%d %H:%M:%S') if document.processed_at else 'N/A'])
        writer.writerow(['Exported At', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])
        
        # Write analysis results
        for analysis_type, results in document.analysis_results.items():
            writer.writerow([f'{analysis_type.upper()} ANALYSIS'])
            writer.writerow([])
            
            if isinstance(results, dict):
                self.write_dict_to_csv(writer, results)
            else:
                writer.writerow(['Results', str(results)])
            
            writer.writerow([])
        
        return response
    
    def write_dict_to_csv(self, writer, data, prefix=''):
        """Recursively write dictionary to CSV"""
        for key, value in data.items():
            full_key = f"{prefix}{key}" if prefix else key
            
            if isinstance(value, dict):
                self.write_dict_to_csv(writer, value, f"{full_key}.")
            elif isinstance(value, list):
                if value and isinstance(value[0], dict):
                    # List of dictionaries - create table
                    writer.writerow([full_key])
                    if value:
                        headers = value[0].keys()
                        writer.writerow(headers)
                        for item in value:
                            writer.writerow([item.get(h, '') for h in headers])
                    writer.writerow([])
                else:
                    writer.writerow([full_key, '; '.join(map(str, value))])
            else:
                writer.writerow([full_key, value])
    
    def export_pdf(self, document):
        """Export analysis results as PDF"""
        return Response(
            {'error': 'PDF export coming soon'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
    
    def export_excel(self, document):
        """Export analysis results as Excel"""
        return Response(
            {'error': 'Excel export coming soon'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )


from django.db.models import Count
from django.db.models.functions import TruncMonth

class DocumentUploadAPI(APIView):
    """Upload financial documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    ALLOWED_EXTENSIONS = {
        'pdf': 'application/pdf',
        'csv': 'text/csv',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'xls': 'application/vnd.ms-excel',
        'txt': 'text/plain',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png'
    }
    
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    @extend_schema(
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {'type': 'string', 'format': 'binary'},
                    'document_type': {'type': 'string', 'enum': ['bank_statement', 'invoice', 'receipt', 'tax_return', 'financial_statement', 'other']}
                },
                'required': ['file']
            }
        },
        responses={
            200: inline_serializer(
                name='DocumentUploadResponse',
                fields={
                    'document_id': serializers.IntegerField(),
                    'filename': serializers.CharField(),
                    'file_size': serializers.IntegerField(),
                    'document_type': serializers.CharField(),
                    'message': serializers.CharField(),
                    'estimated_processing_time': serializers.CharField()
                }
            )
        }
    )
    def post(self, request):
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file = request.FILES['file']
        document_type = request.data.get('document_type', 'other')
        
        # Validate file size
        if file.size > self.MAX_FILE_SIZE:
            return Response(
                {'error': f'File too large. Maximum size is {self.MAX_FILE_SIZE / (1024*1024)}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file extension
        extension = file.name.split('.')[-1].lower()
        if extension not in self.ALLOWED_EXTENSIONS:
            return Response(
                {'error': f'Invalid file type. Allowed types: {", ".join(self.ALLOWED_EXTENSIONS.keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check user's document upload limit
        user = request.user
        if not self.can_upload_document(user):
            return Response(
                {'error': 'Document upload limit reached. Upgrade your plan for more uploads.'},
                status=status.HTTP_402_PAYMENT_REQUIRED
            )
        
        # Create document record
        document = FinancialDocument.objects.create(
            user=user,
            document_type=document_type,
            original_filename=file.name,
            file=file,
            file_size=file.size,
            mime_type=self.ALLOWED_EXTENSIONS[extension]
        )
        
        # Process document asynchronously
        self.process_document_async(document.id)
        
        # Update user's upload count
        self.update_upload_count(user)
        
        return Response({
            'document_id': document.id,
            'filename': file.name,
            'file_size': file.size,
            'document_type': document_type,
            'message': 'Document uploaded successfully. Processing...',
            'estimated_processing_time': '2-5 minutes'
        })
    
    def can_upload_document(self, user):
        """Check if user can upload more documents"""
        # Free tier: 3 documents/month
        # Pro tier: 10 documents/month
        # Business tier: Unlimited
        
        if user.subscription_tier == 'business':
            return True
        
        # Get current month's upload count
        current_month = timezone.now().month
        current_year = timezone.now().year
        
        monthly_uploads = FinancialDocument.objects.filter(
            user=user,
            created_at__year=current_year,
            created_at__month=current_month
        ).count()
        
        if user.subscription_tier == 'pro':
            return monthly_uploads < 10
        else:  # Free tier
            return monthly_uploads < 3
    
    def update_upload_count(self, user):
        """Update user's upload count in metadata"""
        profile = user.profile
        if 'upload_stats' not in profile.notification_preferences:
            profile.notification_preferences['upload_stats'] = {
                'total_uploads': 0,
                'monthly_uploads': {}
            }
        
        current_month = timezone.now().strftime('%Y-%m')
        stats = profile.notification_preferences['upload_stats']
        
        stats['total_uploads'] = stats.get('total_uploads', 0) + 1
        
        if current_month not in stats['monthly_uploads']:
            stats['monthly_uploads'][current_month] = 0
        stats['monthly_uploads'][current_month] += 1
        
        profile.save()
    
    def process_document_async(self, document_id):
        """Process document asynchronously"""
        # TODO: Implement Celery task for document processing
        # For now, process synchronously
        try:
            document = FinancialDocument.objects.get(id=document_id)
            self.extract_document_data(document)
        except Exception as e:
            print(f"Error processing document {document_id}: {str(e)}")
    
    def extract_document_data(self, document):
        """Extract data from uploaded document"""
        try:
            document_content = ""
            is_image = document.mime_type.startswith('image/')
            
            if is_image:
                # Placeholder for OCR processing
                document_content = f"Image file content for '{document.original_filename}' would be extracted via OCR here."
                # In a real implementation, you'd use a library like pytesseract or a cloud service
                # e.g., document_content = pytesseract.image_to_string(Image.open(document.file.path))
            else:
                # For text-based files like PDF (if text-based), TXT, CSV
                try:
                    with document.file.open('r') as f:
                        document_content = f.read()
                except Exception:
                    # Fallback for binary files like some PDFs
                    with document.file.open('rb') as f:
                        # Attempt to decode, this is naive and may fail
                        try:
                            document_content = f.read().decode('utf-8', errors='ignore')
                        except Exception as decode_err:
                             document_content = f"Could not decode file content. Error: {str(decode_err)}"


            data = self._perform_extraction(document, document_content)
            
            document.extraction_data = data
            document.is_processed = True
            document.processed_at = timezone.now()
            document.save()
            
        except Exception as e:
            document.metadata['processing_error'] = str(e)
            document.save()

    def _get_extraction_prompt(self, document_type, document_content):
        """Generates a specialized prompt for Gemini based on the document type."""
        base_prompt = f"""
You are an expert data extraction AI for Nigerian financial documents.
Analyze the following document content and extract the specified information in a structured JSON format.
Ensure all monetary values are returned as numbers (floats), and dates are in 'YYYY-MM-DD' format.

DOCUMENT TYPE: {document_type}
DOCUMENT CONTENT:
---
{document_content[:4000]}
---

JSON OUTPUT FORMAT:
"""

        prompts = {
            'invoice': base_prompt + """
{
  "invoice_number": "string",
  "vendor_name": "string",
  "customer_name": "string",
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "total_amount": "float",
  "tax_amount": "float",
  "line_items": [
    {"description": "string", "quantity": "integer", "unit_price": "float", "total": "float"}
  ]
}
""",
            'receipt': base_prompt + """
{
  "receipt_number": "string",
  "vendor_name": "string",
  "receipt_date": "YYYY-MM-DD",
  "total_amount": "float",
  "payment_method": "string",
  "items_purchased": [
    {"description": "string", "price": "float"}
  ]
}
""",
            'bank_statement': base_prompt + """
{
  "bank_name": "string",
  "account_holder": "string",
  "account_number": "string",
  "statement_period": {"start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD"},
  "opening_balance": "float",
  "closing_balance": "float",
  "total_deposits": "float",
  "total_withdrawals": "float"
}
""",
            'other': base_prompt + """
{
  "document_summary": "string (A brief summary of the document's content)",
  "key_entities": ["string (list of names, companies, or key terms found)"],
  "potential_document_type": "string (Suggest a more specific type if identifiable, e.g., 'Contract Agreement')"
}
"""
        }
        # Use 'other' as fallback
        return prompts.get(document_type, prompts['other'])

    def _perform_extraction(self, document, document_content):
        """Performs the actual data extraction using the Gemini client."""
        if not document_content:
            return {'error': 'Document content is empty or could not be read.'}

        gemini_client = GeminiClient()
        if not gemini_client.is_configured:
            return {'error': 'Gemini client is not configured.'}
        
        prompt = self._get_extraction_prompt(document.document_type, document_content)
        
        response_text, _ = gemini_client.generate_response(prompt)
        
        try:
            # Clean the response to ensure it's valid JSON
            # Gemini might wrap the JSON in ```json ... ```
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0]
            
            extracted_data = json.loads(response_text)
            return extracted_data
        except (json.JSONDecodeError, IndexError) as e:
            return {
                'error': 'Failed to parse AI response as JSON.',
                'raw_response': response_text,
                'parsing_error': str(e)
            }


class DocumentListAPI(generics.ListAPIView):
    """List user's documents"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FinancialDocumentSerializer
    
    def get_queryset(self):
        # Filter by document type if provided
        doc_type = self.request.query_params.get('type')
        queryset = FinancialDocument.objects.filter(user=self.request.user)
        
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        # Filter by processing status
        processed = self.request.query_params.get('processed')
        if processed is not None:
            queryset = queryset.filter(is_processed=processed.lower() == 'true')
        
        return queryset.order_by('-created_at')


class DocumentDetailAPI(generics.RetrieveDestroyAPIView):
    """Get or delete a specific document"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FinancialDocumentSerializer
    
    def get_queryset(self):
        return FinancialDocument.objects.filter(user=self.request.user)
    
    def perform_destroy(self, instance):
        # Delete the actual file
        if instance.file:
            instance.file.delete(save=False)
        super().perform_destroy(instance)


class DocumentAnalysisAPI(APIView):
    """Analyze uploaded document using AI"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request=DocumentAnalysisRequestSerializer,
        responses={200: OpenApiTypes.OBJECT}
    )
    def post(self, request):
        serializer = DocumentAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document_id = serializer.validated_data['document_id']
        analysis_type = serializer.validated_data['analysis_type']
        
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if document is processed
        if not document.is_processed:
            return Response(
                {'error': 'Document is still being processed. Please try again later.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform AI analysis
        analysis_results = self.perform_ai_analysis(document, analysis_type)
        
        # Save analysis results
        if not document.analysis_results:
            document.analysis_results = {}
        
        document.analysis_results[analysis_type] = analysis_results
        document.save()
        
        return Response({
            'document_id': document.id,
            'document_type': document.document_type,
            'analysis_type': analysis_type,
            'results': analysis_results,
            'generated_at': timezone.now().isoformat()
        })
    
    def perform_ai_analysis(self, document, analysis_type):
        """Perform AI analysis on document using Gemini"""
        gemini_client = GeminiClient()
        
        # Create prompt based on document type and analysis type
        prompt = self.create_analysis_prompt(document, analysis_type)
        
        try:
            response_text, _ = gemini_client.generate_response(prompt)
            
            # Parse the response (assuming JSON format)
            try:
                results = json.loads(response_text)
            except json.JSONDecodeError:
                # If not JSON, return as text
                results = {
                    'analysis': response_text,
                    'format': 'text'
                }
            
            return results
            
        except Exception as e:
            return {
                'error': str(e),
                'message': 'AI analysis failed'
            }
    
    def create_analysis_prompt(self, document, analysis_type):
        """Create analysis prompt for Gemini"""
        user = document.user
        
        base_prompt = f"""As a Nigerian Tax and Financial Analysis AI, analyze this document:

DOCUMENT INFORMATION:
- Type: {document.document_type}
- Original Filename: {document.original_filename}
- Uploaded: {document.created_at.strftime('%Y-%m-%d %H:%M:%S')}

USER CONTEXT:
- Business Type: {user.get_user_type_display()}
- Company: {user.company_name or 'Not specified'}
- Location: {user.state or 'Not specified'}
- Business Sector: {user.business_sector or 'Not specified'}

EXTRACTED DATA (if available):
{json.dumps(document.extraction_data, indent=2)}

ANALYSIS TYPE: {analysis_type.upper()}

"""
        
        if analysis_type == 'tax_compliance':
            prompt = base_prompt + """
ANALYZE FOR TAX COMPLIANCE:
1. Identify potential tax obligations (VAT, WHT, CIT, PAYE, etc.)
2. Check for compliance issues or red flags
3. Identify missing documentation or records
4. Estimate potential penalties for non-compliance
5. Recommend corrective actions
6. Provide timeline for compliance actions

FORMAT RESPONSE AS JSON WITH:
- compliance_status (compliant/partially_compliant/non_compliant)
- identified_issues (array)
- tax_obligations (array with amounts and deadlines)
- recommendations (array)
- priority_actions (array)
- estimated_penalties (if any)
"""
        
        elif analysis_type == 'financial_health':
            prompt = base_prompt + """
ANALYZE FINANCIAL HEALTH:
1. Calculate key financial ratios
2. Assess liquidity, profitability, and solvency
3. Identify financial risks
4. Evaluate cash flow patterns
5. Compare to industry benchmarks (Nigerian context)
6. Provide improvement recommendations

FORMAT RESPONSE AS JSON WITH:
- financial_ratios (object with values and interpretations)
- risk_assessment (low/medium/high)
- strengths (array)
- weaknesses (array)
- recommendations (array)
- industry_benchmark_comparison
"""
        
        elif analysis_type == 'forecasting':
            prompt = base_prompt + """
GENERATE FINANCIAL FORECAST:
1. Project revenue trends for next 12 months
2. Forecast expenses and cash flow
3. Predict tax liabilities
4. Identify growth opportunities
5. Highlight potential financial challenges
6. Provide scenario analysis (best case/worst case/base case)

FORMAT RESPONSE AS JSON WITH:
- revenue_forecast (monthly for 12 months)
- expense_forecast (monthly for 12 months)
- cash_flow_projection (monthly for 12 months)
- tax_liability_forecast (quarterly)
- key_assumptions
- risks_and_opportunities
- recommendations
"""
        
        else:  # 'all' or default
            prompt = base_prompt + """
PROVIDE COMPREHENSIVE ANALYSIS INCLUDING:
1. Tax Compliance Assessment
2. Financial Health Analysis
3. Financial Forecasting
4. Actionable Recommendations

FORMAT RESPONSE AS COMPREHENSIVE JSON REPORT WITH ALL SECTIONS.
"""
        
        prompt += "\n\nIMPORTANT: Base all analysis on Nigerian financial regulations and tax laws. Provide specific references where applicable."
        
        return prompt


class DocumentExportAPI(APIView):
    """Export document analysis results"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='format', description='Export format (json, csv, pdf, excel)', required=False, type=str),
        ],
        responses={200: OpenApiTypes.BINARY}
    )
    def get(self, request, document_id):
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        export_format = request.query_params.get('format', 'json')
        
        if export_format == 'json':
            return self.export_json(document)
        elif export_format == 'csv':
            return self.export_csv(document)
        elif export_format == 'pdf':
            return self.export_pdf(document)
        elif export_format == 'excel':
            return self.export_excel(document)
        else:
            return Response(
                {'error': 'Unsupported export format'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def export_json(self, document):
        """Export analysis results as JSON"""
        data = {
            'document': {
                'id': document.id,
                'type': document.document_type,
                'filename': document.original_filename,
                'uploaded_at': document.created_at.isoformat(),
                'processed_at': document.processed_at.isoformat() if document.processed_at else None
            },
            'extraction_data': document.extraction_data,
            'analysis_results': document.analysis_results,
            'exported_at': timezone.now().isoformat(),
            'metadata': document.metadata
        }
        
        # Create a downloadable JSON file
        filename = f"maven_analysis_{document.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.json"
        response = Response(data)
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Type'] = 'application/json'
        
        return response
    
    def export_csv(self, document):
        """Export analysis results as CSV"""
        if not document.analysis_results:
            return Response(
                {'error': 'No analysis results available for export'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create CSV response
        response = HttpResponse(content_type='text/csv')
        filename = f"maven_analysis_{document.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}.csv"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        writer = csv.writer(response)
        
        # Write document info
        writer.writerow(['Document Analysis Report'])
        writer.writerow(['Document ID', document.id])
        writer.writerow(['Filename', document.original_filename])
        writer.writerow(['Document Type', document.document_type])
        writer.writerow(['Uploaded At', document.created_at.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Processed At', document.processed_at.strftime('%Y-%m-%d %H:%M:%S') if document.processed_at else 'N/A'])
        writer.writerow(['Exported At', timezone.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])
        
        # Write analysis results
        for analysis_type, results in document.analysis_results.items():
            writer.writerow([f'{analysis_type.upper()} ANALYSIS'])
            writer.writerow([])
            
            if isinstance(results, dict):
                self.write_dict_to_csv(writer, results)
            else:
                writer.writerow(['Results', str(results)])
            
            writer.writerow([])
        
        return response
    
    def write_dict_to_csv(self, writer, data, prefix=''):
        """Recursively write dictionary to CSV"""
        for key, value in data.items():
            full_key = f"{prefix}{key}" if prefix else key
            
            if isinstance(value, dict):
                self.write_dict_to_csv(writer, value, f"{full_key}.")
            elif isinstance(value, list):
                if value and isinstance(value[0], dict):
                    # List of dictionaries - create table
                    writer.writerow([full_key])
                    if value:
                        headers = value[0].keys()
                        writer.writerow(headers)
                        for item in value:
                            writer.writerow([item.get(h, '') for h in headers])
                    writer.writerow([])
                else:
                    writer.writerow([full_key, '; '.join(map(str, value))])
            else:
                writer.writerow([full_key, value])
    
    def export_pdf(self, document):
        """Export analysis results as PDF"""
        return Response(
            {'error': 'PDF export coming soon'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )
    
    def export_excel(self, document):
        """Export analysis results as Excel"""
        return Response(
            {'error': 'Excel export coming soon'},
            status=status.HTTP_501_NOT_IMPLEMENTED
        )


class DocumentStatsAPI(APIView):
    """Get document upload and analysis statistics"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request):
        user = request.user
        
        # Calculate document statistics
        total_documents = FinancialDocument.objects.filter(user=user).count()
        processed_documents = FinancialDocument.objects.filter(
            user=user, 
            is_processed=True
        ).count()
        
        # Group by document type
        doc_type_stats = FinancialDocument.objects.filter(
            user=user
        ).values('document_type').annotate(
            count=models.Count('id'),
            processed=models.Count('id', filter=models.Q(is_processed=True))
        ).order_by('-count')
        
        # Monthly upload stats
        monthly_stats = FinancialDocument.objects.filter(
            user=user
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            count=Count('id')
        ).order_by('-month')
        
        # Analysis type usage
        analysis_stats = {}
        documents_with_analysis = FinancialDocument.objects.filter(
            user=user,
            analysis_results__isnull=False
        )
        
        for doc in documents_with_analysis:
            if doc.analysis_results:
                for analysis_type in doc.analysis_results.keys():
                    analysis_stats[analysis_type] = analysis_stats.get(analysis_type, 0) + 1
        
        return Response({
            'total_documents': total_documents,
            'processed_documents': processed_documents,
            'processing_rate': (processed_documents / total_documents * 100) if total_documents > 0 else 0,
            'document_types': [
                {
                    'type': stat['document_type'],
                    'count': stat['count'],
                    'processed': stat['processed'],
                    'processing_rate': (stat['processed'] / stat['count'] * 100) if stat['count'] > 0 else 0
                }
                for stat in doc_type_stats
            ],
            'monthly_uploads': [
                {
                    'month': stat['month'].strftime('%Y-%m'),
                    'count': stat['count']
                }
                for stat in monthly_stats
            ],
            'analysis_usage': [
                {
                    'type': analysis_type,
                    'count': count
                }
                for analysis_type, count in analysis_stats.items()
            ],
            'upload_limits': self.get_upload_limits(user)
        })
    
    def get_upload_limits(self, user):
        """Get user's document upload limits"""
        if user.subscription_tier == 'business':
            return {
                'monthly_limit': 'unlimited',
                'remaining': 'unlimited',
                'tier': 'business'
            }
        elif user.subscription_tier == 'pro':
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            monthly_uploads = FinancialDocument.objects.filter(
                user=user,
                created_at__year=current_year,
                created_at__month=current_month
            ).count()
            
            return {
                'monthly_limit': 10,
                'used': monthly_uploads,
                'remaining': 10 - monthly_uploads,
                'tier': 'pro'
            }
        else:  # Free tier
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            monthly_uploads = FinancialDocument.objects.filter(
                user=user,
                created_at__year=current_year,
                created_at__month=current_month
            ).count()
            
            return {
                'monthly_limit': 3,
                'used': monthly_uploads,
                'remaining': 3 - monthly_uploads,
                'tier': 'free'
            }


class DocumentPreviewAPI(APIView):
    """Get document preview (first few lines or summary)"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='type', description='Preview type (info, extracted_data, analysis)', required=False, type=str),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request, document_id):
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        preview_type = request.query_params.get('type', 'info')
        
        if preview_type == 'info':
            return self.get_document_info(document)
        elif preview_type == 'extracted_data':
            return self.get_extracted_data_preview(document)
        elif preview_type == 'analysis':
            return self.get_analysis_preview(document)
        else:
            return Response(
                {'error': 'Invalid preview type'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_document_info(self, document):
        """Get basic document information"""
        return Response({
            'id': document.id,
            'filename': document.original_filename,
            'type': document.document_type,
            'size': document.file_size,
            'size_human': self.format_file_size(document.file_size),
            'mime_type': document.mime_type,
            'uploaded_at': document.created_at.isoformat(),
            'processed': document.is_processed,
            'processed_at': document.processed_at.isoformat() if document.processed_at else None,
            'has_analysis': bool(document.analysis_results)
        })
    
    def get_extracted_data_preview(self, document):
        """Get preview of extracted data"""
        if not document.extraction_data:
            return Response({
                'available': False,
                'message': 'No extracted data available'
            })
        
        # Return first level of extracted data
        preview = {}
        for key, value in document.extraction_data.items():
            if isinstance(value, (list, dict)):
                preview[key] = f"{type(value).__name__} with {len(value)} items"
            else:
                preview[key] = str(value)[:100] + ('...' if len(str(value)) > 100 else '')
        
        return Response({
            'available': True,
            'preview': preview,
            'full_data_available': True
        })
    
    def get_analysis_preview(self, document):
        """Get preview of analysis results"""
        if not document.analysis_results:
            return Response({
                'available': False,
                'message': 'No analysis results available'
            })
        
        # Get summary of each analysis type
        preview = {}
        for analysis_type, results in document.analysis_results.items():
            if isinstance(results, dict):
                preview[analysis_type] = {
                    'has_results': True,
                    'summary': self.get_analysis_summary(results),
                    'key_findings': self.extract_key_findings(results)
                }
            else:
                preview[analysis_type] = {
                    'has_results': True,
                    'summary': str(results)[:200] + ('...' if len(str(results)) > 200 else '')
                }
        
        return Response({
            'available': True,
            'preview': preview,
            'analysis_types': list(document.analysis_results.keys())
        })
    
    def format_file_size(self, size):
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"
    
    def get_analysis_summary(self, results):
        """Extract summary from analysis results"""
        summary_keys = ['summary', 'compliance_status', 'risk_assessment', 'key_findings']
        
        for key in summary_keys:
            if key in results:
                return results[key]
        
        # If no summary key found, return first few items
        return str(list(results.items())[:3])
    
    def extract_key_findings(self, results):
        """Extract key findings from analysis results"""
        key_findings = []
        
        # Look for specific sections that might contain key findings
        finding_sections = ['identified_issues', 'recommendations', 'priority_actions', 
                           'strengths', 'weaknesses', 'risks_and_opportunities']
        
        for section in finding_sections:
            if section in results:
                findings = results[section]
                if isinstance(findings, list):
                    key_findings.extend(findings[:3])  # Take first 3 items
                elif isinstance(findings, str):
                    key_findings.append(findings)
        
        return key_findings[:5]  # Limit to 5 key findings


class DocumentBulkDeleteAPI(APIView):
    """Bulk delete documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request=inline_serializer(
            name='BulkDeleteRequest',
            fields={'document_ids': serializers.ListField(child=serializers.IntegerField())}
        ),
        responses={200: OpenApiTypes.OBJECT}
    )
    def post(self, request):
        document_ids = request.data.get('document_ids', [])
        
        if not document_ids:
            return Response(
                {'error': 'No document IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify all documents belong to the user
        documents = FinancialDocument.objects.filter(
            id__in=document_ids,
            user=request.user
        )
        
        if documents.count() != len(document_ids):
            return Response(
                {'error': 'Some documents not found or unauthorized'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete documents
        deleted_count = 0
        for document in documents:
            if document.file:
                document.file.delete(save=False)
            document.delete()
            deleted_count += 1
        
        return Response({
            'message': f'Successfully deleted {deleted_count} documents',
            'deleted_count': deleted_count
        })


class DocumentProcessingStatusAPI(APIView):
    """Check document processing status"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request, document_id):
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        status_info = {
            'document_id': document.id,
            'filename': document.original_filename,
            'is_processed': document.is_processed,
            'uploaded_at': document.created_at.isoformat(),
            'processed_at': document.processed_at.isoformat() if document.processed_at else None,
            'processing_time': None
        }
        
        if document.is_processed and document.processed_at:
            processing_time = (document.processed_at - document.created_at).total_seconds()
            status_info['processing_time'] = processing_time
            status_info['processing_time_human'] = self.format_processing_time(processing_time)
        
        if document.metadata and 'processing_error' in document.metadata:
            status_info['error'] = document.metadata['processing_error']
            status_info['status'] = 'failed'
        elif document.is_processed:
            status_info['status'] = 'completed'
        else:
            status_info['status'] = 'processing'
            # Estimate remaining time (placeholder)
            status_info['estimated_completion'] = (timezone.now() + timedelta(minutes=2)).isoformat()
        
        return Response(status_info)
    
    def format_processing_time(self, seconds):
        """Format processing time in human readable format"""
        if seconds < 60:
            return f"{seconds:.1f} seconds"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f} minutes"
        else:
            hours = seconds / 3600
            return f"{hours:.1f} hours"


class DocumentTemplateAPI(APIView):
    """Get document templates for different document types"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='type', description='Template type (bank_statement, invoice, etc.)', required=False, type=str),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        template_type = request.query_params.get('type', 'all')
        
        templates = {
            'bank_statement': {
                'name': 'Bank Statement Template',
                'description': 'Template for bank statements from Nigerian banks',
                'recommended_format': 'PDF or CSV',
                'required_fields': [
                    'Account holder name',
                    'Account number',
                    'Bank name',
                    'Statement period',
                    'Transaction details',
                    'Opening balance',
                    'Closing balance'
                ],
                'example_filename': 'bank_statement_example.pdf',
                'notes': 'Ensure statement covers at least 3 months for better analysis'
            },
            'invoice': {
                'name': 'Invoice Template',
                'description': 'Template for tax-compliant invoices',
                'recommended_format': 'PDF or Excel',
                'required_fields': [
                    'Invoice number',
                    'Date',
                    'Supplier/Vendor details',
                    'Customer details',
                    'Description of goods/services',
                    'Quantity',
                    'Unit price',
                    'Total amount',
                    'VAT amount (if applicable)',
                    'Withholding Tax (if applicable)'
                ],
                'example_filename': 'invoice_template.xlsx',
                'notes': 'Include TIN and VAT registration numbers for tax compliance'
            },
            'receipt': {
                'name': 'Receipt Template',
                'description': 'Template for expense receipts',
                'recommended_format': 'PDF or Image',
                'required_fields': [
                    'Receipt number',
                    'Date',
                    'Vendor name',
                    'Amount',
                    'Payment method',
                    'Description of expense',
                    'Tax details'
                ],
                'example_filename': 'receipt_template.jpg',
                'notes': 'Clear images with all text readable'
            },
            'financial_statement': {
                'name': 'Financial Statement Template',
                'description': 'Template for income statements, balance sheets, etc.',
                'recommended_format': 'Excel',
                'required_fields': [
                    'Statement period',
                    'Revenue',
                    'Expenses',
                    'Assets',
                    'Liabilities',
                    'Equity',
                    'Profit/Loss'
                ],
                'example_filename': 'financial_statement_template.xlsx',
                'notes': 'Follow Nigerian GAAP or IFRS standards'
            }
        }
        
        if template_type == 'all':
            return Response(templates)
        elif template_type in templates:
            return Response(templates[template_type])
        else:
            return Response(
                {'error': 'Template type not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_upload_limits(self, user):
        """Get user's document upload limits"""
        if user.subscription_tier == 'business':
            return {
                'monthly_limit': 'unlimited',
                'remaining': 'unlimited',
                'tier': 'business'
            }
        elif user.subscription_tier == 'pro':
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            monthly_uploads = FinancialDocument.objects.filter(
                user=user,
                created_at__year=current_year,
                created_at__month=current_month
            ).count()
            
            return {
                'monthly_limit': 10,
                'used': monthly_uploads,
                'remaining': 10 - monthly_uploads,
                'tier': 'pro'
            }
        else:  # Free tier
            current_month = timezone.now().month
            current_year = timezone.now().year
            
            monthly_uploads = FinancialDocument.objects.filter(
                user=user,
                created_at__year=current_year,
                created_at__month=current_month
            ).count()
            
            return {
                'monthly_limit': 3,
                'used': monthly_uploads,
                'remaining': 3 - monthly_uploads,
                'tier': 'free'
            }


class DocumentPreviewAPI(APIView):
    """Get document preview (first few lines or summary)"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='type', description='Preview type (info, extracted_data, analysis)', required=False, type=str),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request, document_id):
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        preview_type = request.query_params.get('type', 'info')
        
        if preview_type == 'info':
            return self.get_document_info(document)
        elif preview_type == 'extracted_data':
            return self.get_extracted_data_preview(document)
        elif preview_type == 'analysis':
            return self.get_analysis_preview(document)
        else:
            return Response(
                {'error': 'Invalid preview type'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_document_info(self, document):
        """Get basic document information"""
        return Response({
            'id': document.id,
            'filename': document.original_filename,
            'type': document.document_type,
            'size': document.file_size,
            'size_human': self.format_file_size(document.file_size),
            'mime_type': document.mime_type,
            'uploaded_at': document.created_at.isoformat(),
            'processed': document.is_processed,
            'processed_at': document.processed_at.isoformat() if document.processed_at else None,
            'has_analysis': bool(document.analysis_results)
        })
    
    def get_extracted_data_preview(self, document):
        """Get preview of extracted data"""
        if not document.extraction_data:
            return Response({
                'available': False,
                'message': 'No extracted data available'
            })
        
        # Return first level of extracted data
        preview = {}
        for key, value in document.extraction_data.items():
            if isinstance(value, (list, dict)):
                preview[key] = f"{type(value).__name__} with {len(value)} items"
            else:
                preview[key] = str(value)[:100] + ('...' if len(str(value)) > 100 else '')
        
        return Response({
            'available': True,
            'preview': preview,
            'full_data_available': True
        })
    
    def get_analysis_preview(self, document):
        """Get preview of analysis results"""
        if not document.analysis_results:
            return Response({
                'available': False,
                'message': 'No analysis results available'
            })
        
        # Get summary of each analysis type
        preview = {}
        for analysis_type, results in document.analysis_results.items():
            if isinstance(results, dict):
                preview[analysis_type] = {
                    'has_results': True,
                    'summary': self.get_analysis_summary(results),
                    'key_findings': self.extract_key_findings(results)
                }
            else:
                preview[analysis_type] = {
                    'has_results': True,
                    'summary': str(results)[:200] + ('...' if len(str(results)) > 200 else '')
                }
        
        return Response({
            'available': True,
            'preview': preview,
            'analysis_types': list(document.analysis_results.keys())
        })
    
    def format_file_size(self, size):
        """Format file size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f} {unit}"
            size /= 1024.0
        return f"{size:.2f} TB"
    
    def get_analysis_summary(self, results):
        """Extract summary from analysis results"""
        summary_keys = ['summary', 'compliance_status', 'risk_assessment', 'key_findings']
        
        for key in summary_keys:
            if key in results:
                return results[key]
        
        # If no summary key found, return first few items
        return str(list(results.items())[:3])
    
    def extract_key_findings(self, results):
        """Extract key findings from analysis results"""
        key_findings = []
        
        # Look for specific sections that might contain key findings
        finding_sections = ['identified_issues', 'recommendations', 'priority_actions', 
                           'strengths', 'weaknesses', 'risks_and_opportunities']
        
        for section in finding_sections:
            if section in results:
                findings = results[section]
                if isinstance(findings, list):
                    key_findings.extend(findings[:3])  # Take first 3 items
                elif isinstance(findings, str):
                    key_findings.append(findings)
        
        return key_findings[:5]  # Limit to 5 key findings


class DocumentBulkDeleteAPI(APIView):
    """Bulk delete documents"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        request=inline_serializer(
            name='BulkDeleteRequest',
            fields={'document_ids': serializers.ListField(child=serializers.IntegerField())}
        ),
        responses={200: OpenApiTypes.OBJECT}
    )
    def post(self, request):
        document_ids = request.data.get('document_ids', [])
        
        if not document_ids:
            return Response(
                {'error': 'No document IDs provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify all documents belong to the user
        documents = FinancialDocument.objects.filter(
            id__in=document_ids,
            user=request.user
        )
        
        if documents.count() != len(document_ids):
            return Response(
                {'error': 'Some documents not found or unauthorized'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete documents
        deleted_count = 0
        for document in documents:
            if document.file:
                document.file.delete(save=False)
            document.delete()
            deleted_count += 1
        
        return Response({
            'message': f'Successfully deleted {deleted_count} documents',
            'deleted_count': deleted_count
        })


class DocumentProcessingStatusAPI(APIView):
    """Check document processing status"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(responses={200: OpenApiTypes.OBJECT})
    def get(self, request, document_id):
        try:
            document = FinancialDocument.objects.get(
                id=document_id,
                user=request.user
            )
        except FinancialDocument.DoesNotExist:
            return Response(
                {'error': 'Document not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        status_info = {
            'document_id': document.id,
            'filename': document.original_filename,
            'is_processed': document.is_processed,
            'uploaded_at': document.created_at.isoformat(),
            'processed_at': document.processed_at.isoformat() if document.processed_at else None,
            'processing_time': None
        }
        
        if document.is_processed and document.processed_at:
            processing_time = (document.processed_at - document.created_at).total_seconds()
            status_info['processing_time'] = processing_time
            status_info['processing_time_human'] = self.format_processing_time(processing_time)
        
        if document.metadata and 'processing_error' in document.metadata:
            status_info['error'] = document.metadata['processing_error']
            status_info['status'] = 'failed'
        elif document.is_processed:
            status_info['status'] = 'completed'
        else:
            status_info['status'] = 'processing'
            # Estimate remaining time (placeholder)
            status_info['estimated_completion'] = (timezone.now() + timedelta(minutes=2)).isoformat()
        
        return Response(status_info)
    
    def format_processing_time(self, seconds):
        """Format processing time in human readable format"""
        if seconds < 60:
            return f"{seconds:.1f} seconds"
        elif seconds < 3600:
            minutes = seconds / 60
            return f"{minutes:.1f} minutes"
        else:
            hours = seconds / 3600
            return f"{hours:.1f} hours"


class DocumentTemplateAPI(APIView):
    """Get document templates for different document types"""
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='type', description='Template type (bank_statement, invoice, etc.)', required=False, type=str),
        ],
        responses={200: OpenApiTypes.OBJECT}
    )
    def get(self, request):
        template_type = request.query_params.get('type', 'all')
        
        templates = {
            'bank_statement': {
                'name': 'Bank Statement Template',
                'description': 'Template for bank statements from Nigerian banks',
                'recommended_format': 'PDF or CSV',
                'required_fields': [
                    'Account holder name',
                    'Account number',
                    'Bank name',
                    'Statement period',
                    'Transaction details',
                    'Opening balance',
                    'Closing balance'
                ],
                'example_filename': 'bank_statement_example.pdf',
                'notes': 'Ensure statement covers at least 3 months for better analysis'
            },
            'invoice': {
                'name': 'Invoice Template',
                'description': 'Template for tax-compliant invoices',
                'recommended_format': 'PDF or Excel',
                'required_fields': [
                    'Invoice number',
                    'Date',
                    'Supplier/Vendor details',
                    'Customer details',
                    'Description of goods/services',
                    'Quantity',
                    'Unit price',
                    'Total amount',
                    'VAT amount (if applicable)',
                    'Withholding Tax (if applicable)'
                ],
                'example_filename': 'invoice_template.xlsx',
                'notes': 'Include TIN and VAT registration numbers for tax compliance'
            },
            'receipt': {
                'name': 'Receipt Template',
                'description': 'Template for expense receipts',
                'recommended_format': 'PDF or Image',
                'required_fields': [
                    'Receipt number',
                    'Date',
                    'Vendor name',
                    'Amount',
                    'Payment method',
                    'Description of expense',
                    'Tax details'
                ],
                'example_filename': 'receipt_template.jpg',
                'notes': 'Clear images with all text readable'
            },
            'financial_statement': {
                'name': 'Financial Statement Template',
                'description': 'Template for income statements, balance sheets, etc.',
                'recommended_format': 'Excel',
                'required_fields': [
                    'Statement period',
                    'Revenue',
                    'Expenses',
                    'Assets',
                    'Liabilities',
                    'Equity',
                    'Profit/Loss'
                ],
                'example_filename': 'financial_statement_template.xlsx',
                'notes': 'Follow Nigerian GAAP or IFRS standards'
            }
        }
        
        if template_type == 'all':
            return Response(templates)
        elif template_type in templates:
            return Response(templates[template_type])
        else:
            return Response(
                {'error': 'Template type not found'},
                status=status.HTTP_404_NOT_FOUND
            )