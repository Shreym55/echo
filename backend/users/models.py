from django.db import models
from django.contrib.auth.models import User

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.URLField(blank=True, null=True)
    status = models.CharField(max_length=120, blank=True, default="")
