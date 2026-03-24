from django.db import models

from .choices import Mood, Genre, Occasion, VoiceType
from .user import User


class MusicGenerationRequest(models.Model):
    """
    Captures the structured input a user submits for song generation.
    Preserved on failure to enable retry (FR-20, C-7).
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="generation_requests"
    )
    title = models.CharField(max_length=255)
    custom_lyrics = models.TextField(blank=True, null=True)
    mood = models.CharField(max_length=20, choices=Mood.choices)
    genre = models.CharField(max_length=20, choices=Genre.choices)
    occasion = models.CharField(max_length=20, choices=Occasion.choices)
    voice_type = models.CharField(max_length=20, choices=VoiceType.choices)
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_retry = models.BooleanField(default=False)

    def __str__(self):
        return f"Request '{self.title}' by {self.user}"
