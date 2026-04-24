from django.conf import settings
from .mock import MockSongGenerator
from .suno import SunoSongGenerator

def get_generator(strategy: str | None = None):
    strategy = (strategy or getattr(settings, "GENERATOR_STRATEGY", "mock")).lower()
    if strategy == "mock":
        return MockSongGenerator()
    if strategy == "suno":
        return SunoSongGenerator()
    raise ValueError(f"Unknown GENERATOR_STRATEGY '{strategy}'")
