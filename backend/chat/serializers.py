from rest_framework import serializers
from .models import Room, Message
from django.contrib.auth.models import User

class RoomSerializer(serializers.ModelSerializer):
    participants = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)

    class Meta:
        model = Room
        fields = ["id", "name", "room_type", "participants"]

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source="sender.username")

    class Meta:
        model = Message
        fields = ["id", "room", "sender", "content", "created_at"]

class PrivateRoomRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
