from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Profile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]


class ProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Profile
        fields = ["user", "avatar", "status"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        # create_user handles password hashing
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        # create associated profile (if your Profile model exists)
        Profile.objects.create(user=user)
        return user
