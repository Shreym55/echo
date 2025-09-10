from django.contrib.auth.models import User
from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer




class RegisterView(generics.CreateAPIView):
    """
    POST /auth/register
    Body: { "username": "...", "email": "...", "password": "..." }

    On success: 201 + { user, access, refresh }
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.save()  # RegisterSerializer.create handles User (+ Profile)
        refresh = RefreshToken.for_user(user)

        data = {
            "user": UserSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
        return Response(data, status=status.HTTP_201_CREATED)


class MeView(APIView):
    """
    GET /auth/me   (Authorization: Bearer <access>)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        payload = UserSerializer(user).data
        prof = getattr(user, "profile", None)
        payload["profile"] = ProfileSerializer(prof).data if prof else None
        return Response(payload)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_users(request):
    users = User.objects.all().values("id", "username")
    return Response(list(users))