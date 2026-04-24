from django.db import models
from .choices import GenerationStatus
from .requests import MusicGenerationRequest

class GenerationJob(models.Model):
    PROVIDER_CHOICES = [
        ("mock", "Mock"),
        ("suno", "Suno"),
    ]

    request = models.ForeignKey(MusicGenerationRequest, on_delete=models.CASCADE, related_name="generation_jobs")
    provider = models.CharField(max_length=10, choices=PROVIDER_CHOICES)
    task_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=GenerationStatus.choices, default=GenerationStatus.PENDING)
    audio_url = models.URLField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    raw_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.provider} job {self.task_id or 'local'} ({self.status})"
