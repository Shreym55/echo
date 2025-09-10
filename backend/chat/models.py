from django.db import models
from django.contrib.auth.models import User


class Room(models.Model):
   ROOM_TYPES = (
        ("group", "Group"),
        ("private", "Private"),
    )
   name = models.CharField(max_length=100, blank=True)
   room_type = models.CharField(max_length=10, choices=ROOM_TYPES, default="group")
   created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="rooms_created")
   participants = models.ManyToManyField(User, related_name="rooms", blank=True)

   def __str__(self):
        return f"{self.room_type} room {self.id or 'unsaved'}"
    


class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
