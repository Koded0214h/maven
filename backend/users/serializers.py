# users/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = '__all__'
        read_only_fields = ('user', 'created_at', 'updated_at')


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                  'user_type', 'company_name', 'phone_number', 
                  'business_sector', 'state', 'subscription_tier',
                  'profile', 'queries_used', 'query_limit')
        read_only_fields = ('id', 'subscription_tier')


class UserSettingsSerializer(serializers.ModelSerializer):
    # User fields
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False)
    last_name = serializers.CharField(required=False)
    company_name = serializers.CharField(required=False)
    phone_number = serializers.CharField(required=False)
    business_sector = serializers.CharField(required=False)
    state = serializers.CharField(required=False)

    # UserProfile fields
    tax_identification_number = serializers.CharField(source='profile.tax_identification_number', required=False)
    vat_registered = serializers.BooleanField(source='profile.vat_registered', required=False)
    employees_count = serializers.IntegerField(source='profile.employees_count', required=False)
    annual_revenue = serializers.DecimalField(max_digits=15, decimal_places=2, source='profile.annual_revenue', required=False, allow_null=True)
    preferred_language = serializers.CharField(source='profile.preferred_language', required=False)
    
    class Meta:
        model = User
        fields = (
            'email', 'first_name', 'last_name', 'company_name', 'phone_number', 'business_sector', 'state',
            'tax_identification_number', 'vat_registered', 'employees_count', 'annual_revenue',
            'preferred_language'
        )
        # Read-only fields if any specific user fields should not be editable via settings
        read_only_fields = ('email',) # Email is typically not changed via settings or requires separate verification

    def update(self, instance, validated_data):
        profile_instance = instance.profile

        # Collect fields for the User model
        user_data_to_update = {}
        for field_name in ['first_name', 'last_name', 'company_name',
                           'phone_number', 'business_sector', 'state']:
            if field_name in validated_data:
                user_data_to_update[field_name] = validated_data.pop(field_name)

        # Collect fields for the UserProfile model
        profile_data_to_update = {}
        for field_name in ['tax_identification_number', 'vat_registered',
                           'employees_count', 'annual_revenue', 'preferred_language']:
            if field_name in validated_data: # These fields would still be in validated_data due to source mapping
                profile_data_to_update[field_name] = validated_data.pop(field_name)

        # Update User model fields
        for attr, value in user_data_to_update.items():
            setattr(instance, attr, value)
        instance.save()

        # Update UserProfile model fields
        for attr, value in profile_data_to_update.items():
            setattr(profile_instance, attr, value)
        profile_instance.save()

        return instance


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'first_name', 'last_name',
                  'user_type', 'company_name', 'phone_number', 
                  'business_sector', 'state')
    
    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            user_type=validated_data.get('user_type', 'individual'),
            company_name=validated_data.get('company_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            business_sector=validated_data.get('business_sector', ''),
            state=validated_data.get('state', '')
        )
        # The UserProfile is automatically created via a signal when a new User is created.
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials")