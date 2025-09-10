from rest_framework import serializers
from .models import Room, Message
from django.contrib.auth.models import User


class UserSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]

class RoomSerializer(serializers.ModelSerializer):
    # participants = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)
    participants = UserSimpleSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = ["id", "name", "room_type", "participants"]
    
    def get_last_message(self, obj):
        last_msg = obj.message_set.order_by("-created_at").first()
        if last_msg:
            return {
                "id": last_msg.id,
                "sender": last_msg.sender.username,
                "content": last_msg.content,
                "created_at": last_msg.created_at,
            }
        return None

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.ReadOnlyField(source="sender.username")

    class Meta:
        model = Message
        fields = ["id", "room", "sender", "content", "created_at"]

class PrivateRoomRequestSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
