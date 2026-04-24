from dataclasses import dataclass
from abc import ABC, abstractmethod
from songs.models import MusicGenerationRequest, GenerationJob

@dataclass
class GenerationResult:
    status: str
    task_id: str | None = None
    audio_url: str | None = None
    raw: dict | None = None
    error: str | None = None

class SongGenerator(ABC):
    provider_name: str

    @abstractmethod
    def start(self, request: MusicGenerationRequest) -> GenerationResult:
        """Create a generation task or produce a deterministic local result."""

    @abstractmethod
    def poll(self, job: GenerationJob) -> GenerationResult:
        """Refresh the status of an existing generation job."""
