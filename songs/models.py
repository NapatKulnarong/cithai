from django.db import models
from django.core.exceptions import ValidationError


# ── Enumerations ──────────────────────────────────────────────────────────────

class Mood(models.TextChoices):
    HAPPY      = 'HAPPY',      'Happy'
    SAD        = 'SAD',        'Sad'
    ROMANTIC   = 'ROMANTIC',   'Romantic'
    ENERGETIC  = 'ENERGETIC',  'Energetic'
    CALM       = 'CALM',       'Calm'


class Genre(models.TextChoices):
    POP        = 'POP',        'Pop'
    ROCK       = 'ROCK',       'Rock'
    JAZZ       = 'JAZZ',       'Jazz'
    CLASSICAL  = 'CLASSICAL',  'Classical'
    HIPHOP     = 'HIPHOP',     'HipHop'


class Occasion(models.TextChoices):
    BIRTHDAY    = 'BIRTHDAY',    'Birthday'
    WEDDING     = 'WEDDING',     'Wedding'
    GRADUATION  = 'GRADUATION',  'Graduation'
    ANNIVERSARY = 'ANNIVERSARY', 'Anniversary'
    CUSTOM      = 'CUSTOM',      'Custom'


class VoiceType(models.TextChoices):
    MALE         = 'MALE',         'Male'
    FEMALE       = 'FEMALE',       'Female'
    CHILD        = 'CHILD',        'Child'
    CHOIR        = 'CHOIR',        'Choir'
    INSTRUMENTAL = 'INSTRUMENTAL', 'Instrumental'
    DUET         = 'DUET',         'Duet'


class GenerationStatus(models.TextChoices):
    PENDING    = 'PENDING',    'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    COMPLETE   = 'COMPLETE',   'Complete'
    FAILED     = 'FAILED',     'Failed'


# ── Domain Entities ───────────────────────────────────────────────────────────

class User(models.Model):
    """
    Represents an authenticated platform user.
    Auth fields (googleId, passwordHash) are infrastructure concerns — excluded
    per Assumption A-1 from the domain model.
    """
    email = models.EmailField(unique=True)
    name  = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} <{self.email}>"


class MusicGenerationRequest(models.Model):
    """
    Captures the structured input a user submits for song generation.
    Preserved on failure to enable retry (FR-20, C-7).
    """
    user          = models.ForeignKey(User, on_delete=models.CASCADE, related_name='generation_requests')
    title         = models.CharField(max_length=255)
    custom_lyrics = models.TextField(blank=True, null=True)
    mood          = models.CharField(max_length=20, choices=Mood.choices)
    genre         = models.CharField(max_length=20, choices=Genre.choices)
    occasion      = models.CharField(max_length=20, choices=Occasion.choices)
    voice_type    = models.CharField(max_length=20, choices=VoiceType.choices)
    submitted_at  = models.DateTimeField(auto_now_add=True)
    is_retry      = models.BooleanField(default=False)

    def __str__(self):
        return f"Request '{self.title}' by {self.user}"


class Song(models.Model):
    """
    Central domain artifact. Owned by a User, produced from a MusicGenerationRequest.
    Constraints: max 20 per user (C-2), private by default (C-3).
    """
    user               = models.ForeignKey(User, on_delete=models.CASCADE, related_name='songs')
    generation_request = models.OneToOneField(
        MusicGenerationRequest,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='song'
    )
    title           = models.CharField(max_length=255)
    custom_lyrics   = models.TextField(blank=True, null=True)
    duration        = models.PositiveIntegerField(null=True, blank=True)
    is_shared       = models.BooleanField(default=False)
    creation_date   = models.DateTimeField(auto_now_add=True)
    audio_file_path = models.CharField(max_length=500, blank=True, null=True)
    status          = models.CharField(max_length=20, choices=GenerationStatus.choices, default=GenerationStatus.PENDING)
    mood            = models.CharField(max_length=20, choices=Mood.choices)
    genre           = models.CharField(max_length=20, choices=Genre.choices)
    occasion        = models.CharField(max_length=20, choices=Occasion.choices)
    voice_type      = models.CharField(max_length=20, choices=VoiceType.choices)

    class Meta:
        ordering = ['-creation_date']

    def clean(self):
        # C-2: A User may own a maximum of 20 Songs at any time (FR-27, FR-28)
        if self._state.adding:
            existing_count = Song.objects.filter(user=self.user).count()
            if existing_count >= 20:
                raise ValidationError(
                    f"User '{self.user}' has reached the 20-song library limit (C-2)."
                )

    def __str__(self):
        return f"Song '{self.title}' ({self.status})"


class ShareLink(models.Model):
    """
    A unique token-based link for sharing a completed Song.
    Composition: cannot exist without its parent Song (FR-34, C-4).
    """
    song       = models.OneToOneField(Song, on_delete=models.CASCADE, related_name='share_link')
    token      = models.CharField(max_length=255, unique=True)
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ShareLink for '{self.song.title}' (active={self.is_active})"