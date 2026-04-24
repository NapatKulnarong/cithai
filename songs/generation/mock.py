from songs.models import GenerationStatus, MusicGenerationRequest, GenerationJob
from .base import SongGenerator, GenerationResult

MOCK_AUDIO_URL = "http://localhost:3000/audio/mock.mp3"

class MockSongGenerator(SongGenerator):
    provider_name = "mock"

    def start(self, request: MusicGenerationRequest) -> GenerationResult:
        return GenerationResult(
            status=GenerationStatus.COMPLETE,
            task_id=None,
            audio_url=MOCK_AUDIO_URL,
            raw={"provider": "mock", "title": request.title},
        )

    def poll(self, job: GenerationJob) -> GenerationResult:
        # Mock is instant; just echo COMPLETE
        return GenerationResult(
            status=GenerationStatus.COMPLETE,
            task_id=job.task_id,
            audio_url=job.audio_url or MOCK_AUDIO_URL,
            raw={"provider": "mock", "polled": True},
        )
