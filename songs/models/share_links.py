from django.db import models

from .songs import Song


class ShareLink(models.Model):
    """
    A unique token-based link for sharing a completed Song.
    Composition: cannot exist without its parent Song (FR-34, C-4).
    """

    song = models.OneToOneField(Song, on_delete=models.CASCADE, related_name="share_link")
    token = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"ShareLink for '{self.song.title}' (active={self.is_active})"
