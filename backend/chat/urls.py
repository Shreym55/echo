from django.urls import path
from .views import RoomListCreateView, MessageListCreateView, PrivateRoomView

urlpatterns = [
    path("rooms/", RoomListCreateView.as_view(), name="rooms"),
    path("rooms/private/", PrivateRoomView.as_view(), name="private_room"),
    path("messages/<int:room_id>/", MessageListCreateView.as_view(), name="messages"),
]
