from rest_framework import generics, permissions
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.models import User
from .models import Room, Message
from .serializers import RoomSerializer, MessageSerializer, PrivateRoomRequestSerializer

# List all rooms or create group rooms
class RoomListCreateView(generics.ListCreateAPIView):
    # queryset = Room.objects.all()
    # serializer_class = RoomSerializer
    # permission_classes = [permissions.IsAuthenticated]
    serializer_class = RoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return rooms where the logged-in user is a participant
        user = self.request.user
        return Room.objects.filter(participants=user)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, room_type="group")


class PrivateRoomView(generics.GenericAPIView):
    serializer_class = PrivateRoomRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user1 = request.user
        user_id = serializer.validated_data["user_id"]

        try:
            user2 = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"error": f"user with id {user_id} not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if room already exists
        existing = (
            Room.objects.filter(room_type="private", participants=user1)
            .filter(participants=user2)
            .first()
        )
        if existing:
            return Response(RoomSerializer(existing).data)

        # Otherwise create one
        room = Room.objects.create(
            created_by=user1,
            room_type="private",
            name=f"private_{user1.username}_{user2.username}"
            # name=f"{user2.username}"

        )
        room.participants.add(user1, user2) 
        

        users = sorted([u.username for u in room.participants.all()])
        room.name = f"private_{users[0]}_{users[1]}"
        room.save()

        return Response(RoomSerializer(room).data, status=status.HTTP_201_CREATED)
    
# Messages in a room
class MessageListCreateView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(room_id=self.kwargs["room_id"])

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user, room_id=self.kwargs["room_id"])
