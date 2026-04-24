from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from .choices import Mood, Genre, Occasion, VoiceType, GenerationStatus
from .user import User
from .requests import MusicGenerationRequest
from .generation import GenerationJob


class Song(models.Model):
    """
    Central domain artifact. Owned by a User, produced from a MusicGenerationRequest.
    Constraints: max 20 per user (C-2), private by default (C-3).
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="songs")
    generation_request = models.OneToOneField(
        MusicGenerationRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="song",
    )
    title = models.CharField(max_length=255)
    custom_lyrics = models.TextField(blank=True, null=True)
    duration = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
    )
    is_shared = models.BooleanField(default=False)
    creation_date = models.DateTimeField(auto_now_add=True)
    audio_file_path = models.CharField(max_length=500, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=GenerationStatus.choices,
        default=GenerationStatus.PENDING,
    )
    mood = models.CharField(max_length=20, choices=Mood.choices)
    genre = models.CharField(max_length=20, choices=Genre.choices)
    occasion = models.CharField(max_length=20, choices=Occasion.choices)
    voice_type = models.CharField(max_length=20, choices=VoiceType.choices)
    generation_job = models.OneToOneField(
        GenerationJob,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="song",
    )


    class Meta:
        ordering = ["-creation_date"]

    def clean(self):
        # C-2: A User may own a maximum of 20 Songs at any time (FR-27, FR-28)
        # Skip until a user is set; admin/form validation will require it.
        if self._state.adding and self.user_id:
            existing_count = Song.objects.filter(user=self.user).count()
            if existing_count >= 20:
                raise ValidationError(
                    f"User '{self.user}' has reached the 20-song library limit (C-2)."
                )

    def __str__(self):
        return f"Song '{self.title}' ({self.status})"
