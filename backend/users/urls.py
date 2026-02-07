# users/urls.py
from django.urls import path
from .views import (
    RegisterAPI, LoginAPI, UserAPI,
    ProfileUpdateAPI, SettingsAPIView # Import SettingsAPIView
)

urlpatterns = [
    path('register/', RegisterAPI.as_view(), name='register'),
    path('login/', LoginAPI.as_view(), name='login'),
    path('user/', UserAPI.as_view(), name='user'),
    path('profile/', ProfileUpdateAPI.as_view(), name='profile-update'),
    path('settings/', SettingsAPIView.as_view(), name='user-settings'), # Add the new settings URL
]