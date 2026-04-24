from unittest.mock import Mock, patch

from django.core.exceptions import ValidationError
from django.test import Client, TestCase, override_settings

from songs.generation.factory import get_generator
from songs.generation.mock import MOCK_AUDIO_URL, MockSongGenerator
from songs.generation.suno import SunoSongGenerator
from songs.models import GenerationJob, GenerationStatus, MusicGenerationRequest, ShareLink, Song, User
from songs.services.generation_service import poll_generation, start_generation


class GenerationTestDataMixin:
    def setUp(self):
        super().setUp()
        self.client = Client()
        self.user = User.objects.create(name="Demo User", email="demo@example.com")
        self.payload = {
            "user_id": self.user.id,
            "title": "Birthday Anthem",
            "custom_lyrics": "Celebrate all night long",
            "mood": "HAPPY",
            "genre": "POP",
            "occasion": "BIRTHDAY",
            "voice_type": "FEMALE",
        }

    def create_request(self, **overrides):
        data = {
            "user": self.user,
            "title": "Strategy Test",
            "custom_lyrics": "Test lyrics",
            "mood": "HAPPY",
            "genre": "POP",
            "occasion": "BIRTHDAY",
            "voice_type": "FEMALE",
        }
        data.update(overrides)
        return MusicGenerationRequest.objects.create(**data)


class FactoryTests(TestCase):
    @override_settings(GENERATOR_STRATEGY="mock")
    def test_mock_factory(self):
        self.assertIsInstance(get_generator(), MockSongGenerator)

    @override_settings(GENERATOR_STRATEGY="suno", SUNO_API_TOKEN="test-token")
    def test_suno_factory(self):
        self.assertIsInstance(get_generator(), SunoSongGenerator)

    def test_unknown_factory_raises_error(self):
        with self.assertRaisesMessage(ValueError, "Unknown GENERATOR_STRATEGY 'invalid'"):
            get_generator("invalid")


class MockGeneratorTests(GenerationTestDataMixin, TestCase):
    def test_mock_generator_is_deterministic(self):
        request_obj = self.create_request(title="Predictable Song")
        generator = MockSongGenerator()

        start_result = generator.start(request_obj)
        job = GenerationJob(
            request=request_obj,
            provider="mock",
            task_id=start_result.task_id,
            status=start_result.status,
            audio_url=start_result.audio_url,
        )
        poll_result = generator.poll(job)

        self.assertEqual(generator.provider_name, "mock")
        self.assertEqual(start_result.status, GenerationStatus.COMPLETE)
        self.assertEqual(start_result.audio_url, MOCK_AUDIO_URL)
        self.assertEqual(start_result.raw["provider"], "mock")
        self.assertEqual(poll_result.status, GenerationStatus.COMPLETE)
        self.assertEqual(poll_result.audio_url, MOCK_AUDIO_URL)


@override_settings(SUNO_API_TOKEN="test-token", SUNO_API_BASE="https://api.suno.test")
class SunoGeneratorTests(GenerationTestDataMixin, TestCase):
    @patch("songs.generation.suno.requests.post")
    def test_start_creates_task_from_nested_response(self, mock_post):
        mock_response = Mock(status_code=200)
        mock_response.json.return_value = {"data": {"taskId": "task-123"}}
        mock_post.return_value = mock_response

        generator = SunoSongGenerator()
        result = generator.start(self.create_request())

        self.assertEqual(generator.provider_name, "suno")
        self.assertEqual(result.status, GenerationStatus.PROCESSING)
        self.assertEqual(result.task_id, "task-123")
        self.assertIsNone(result.error)

        _, kwargs = mock_post.call_args
        self.assertEqual(kwargs["headers"]["Authorization"], "Bearer test-token")
        self.assertEqual(kwargs["json"]["title"], "Strategy Test")
        self.assertEqual(kwargs["json"]["prompt"], "Test lyrics")
        self.assertEqual(
            kwargs["json"]["callBackUrl"],
            "http://127.0.0.1:8000/api/suno/callback/",
        )

    @patch("songs.generation.suno.requests.post")
    def test_start_returns_failed_result_for_api_error_payload(self, mock_post):
        mock_response = Mock(status_code=200)
        mock_response.json.return_value = {"code": 400, "msg": "bad request"}
        mock_post.return_value = mock_response

        result = SunoSongGenerator().start(self.create_request())

        self.assertEqual(result.status, GenerationStatus.FAILED)
        self.assertEqual(result.error, "bad request")

    @patch("songs.generation.suno.requests.get")
    def test_poll_maps_success_and_extracts_audio_url(self, mock_get):
        mock_response = Mock(status_code=200)
        mock_response.json.return_value = {
            "data": {
                "taskId": "task-123",
                "status": "SUCCESS",
                "response": {
                    "sunoData": [
                        {"audioUrl": "https://cdn.example.com/song.mp3"},
                    ],
                },
            }
        }
        mock_get.return_value = mock_response

        request_obj = self.create_request()
        job = GenerationJob.objects.create(
            request=request_obj,
            provider="suno",
            task_id="task-123",
            status=GenerationStatus.PROCESSING,
        )

        result = SunoSongGenerator().poll(job)

        self.assertEqual(result.status, GenerationStatus.COMPLETE)
        self.assertEqual(result.audio_url, "https://cdn.example.com/song.mp3")
        self.assertIsNone(result.error)

    @patch("songs.generation.suno.requests.get")
    def test_poll_keeps_processing_for_intermediate_status(self, mock_get):
        mock_response = Mock(status_code=200)
        mock_response.json.return_value = {"data": {"status": "FIRST_SUCCESS"}}
        mock_get.return_value = mock_response

        request_obj = self.create_request()
        job = GenerationJob.objects.create(
            request=request_obj,
            provider="suno",
            task_id="task-456",
            status=GenerationStatus.PROCESSING,
        )

        result = SunoSongGenerator().poll(job)

        self.assertEqual(result.status, GenerationStatus.PROCESSING)
        self.assertIsNone(result.audio_url)

    def test_poll_fails_cleanly_when_task_id_is_missing(self):
        request_obj = self.create_request()
        job = GenerationJob.objects.create(
            request=request_obj,
            provider="suno",
            task_id=None,
            status=GenerationStatus.PROCESSING,
        )

        result = SunoSongGenerator().poll(job)

        self.assertEqual(result.status, GenerationStatus.FAILED)
        self.assertEqual(result.error, "Cannot poll Suno job without task_id")

    @override_settings(SUNO_API_TOKEN="")
    def test_missing_token_raises_configuration_error(self):
        with self.assertRaisesMessage(ValueError, "SUNO_API_TOKEN is required for Suno strategy"):
            SunoSongGenerator()


class GenerationServiceTests(GenerationTestDataMixin, TestCase):
    @override_settings(GENERATOR_STRATEGY="mock")
    def test_start_generation_creates_request_job_and_song(self):
        job, song = start_generation(self.payload)

        self.assertEqual(MusicGenerationRequest.objects.count(), 1)
        self.assertEqual(GenerationJob.objects.count(), 1)
        self.assertEqual(Song.objects.count(), 1)
        self.assertEqual(job.provider, "mock")
        self.assertEqual(job.status, GenerationStatus.COMPLETE)
        self.assertEqual(job.audio_url, MOCK_AUDIO_URL)
        self.assertEqual(song.status, GenerationStatus.COMPLETE)
        self.assertEqual(song.audio_file_path, MOCK_AUDIO_URL)
        self.assertEqual(song.generation_request_id, job.request_id)
        self.assertEqual(song.generation_job_id, job.id)

    @override_settings(GENERATOR_STRATEGY="mock")
    def test_start_generation_ignores_provider_override_in_payload(self):
        job, _ = start_generation({**self.payload, "provider": "suno"})

        self.assertEqual(job.provider, "mock")

    @override_settings(GENERATOR_STRATEGY="mock")
    def test_start_generation_enforces_song_limit_via_model_validation(self):
        for index in range(20):
            Song.objects.create(
                user=self.user,
                title=f"Song {index}",
                mood="HAPPY",
                genre="POP",
                occasion="BIRTHDAY",
                voice_type="FEMALE",
                status=GenerationStatus.COMPLETE,
            )

        with self.assertRaises(ValidationError):
            start_generation(self.payload)

        self.assertEqual(MusicGenerationRequest.objects.count(), 0)
        self.assertEqual(GenerationJob.objects.count(), 0)
        self.assertEqual(Song.objects.count(), 20)

    @override_settings(GENERATOR_STRATEGY="mock")
    def test_poll_generation_updates_existing_job_and_song(self):
        job, song = start_generation(self.payload)
        job.status = GenerationStatus.PENDING
        job.audio_url = None
        job.save()
        song.status = GenerationStatus.PENDING
        song.audio_file_path = None
        song.save()

        updated_job, updated_song = poll_generation(job.id)

        self.assertEqual(updated_job.status, GenerationStatus.COMPLETE)
        self.assertEqual(updated_job.audio_url, MOCK_AUDIO_URL)
        self.assertEqual(updated_song.status, GenerationStatus.COMPLETE)
        self.assertEqual(updated_song.audio_file_path, MOCK_AUDIO_URL)

    @override_settings(GENERATOR_STRATEGY="mock", SUNO_API_TOKEN="test-token")
    @patch("songs.services.generation_service.get_generator")
    def test_poll_generation_uses_job_provider_not_current_setting(self, mock_get_generator):
        request_obj = self.create_request()
        job = GenerationJob.objects.create(
            request=request_obj,
            provider="suno",
            task_id="task-789",
            status=GenerationStatus.PROCESSING,
        )
        song = Song.objects.create(
            user=self.user,
            generation_request=request_obj,
            generation_job=job,
            title=request_obj.title,
            custom_lyrics=request_obj.custom_lyrics,
            mood=request_obj.mood,
            genre=request_obj.genre,
            occasion=request_obj.occasion,
            voice_type=request_obj.voice_type,
            status=GenerationStatus.PROCESSING,
        )
        mock_generator = Mock()
        mock_generator.poll.return_value = Mock(
            status=GenerationStatus.COMPLETE,
            task_id="task-789",
            audio_url="https://cdn.example.com/song.mp3",
            raw={"data": {"status": "SUCCESS"}},
            error=None,
        )
        mock_get_generator.return_value = mock_generator

        updated_job, updated_song = poll_generation(job.id)

        mock_get_generator.assert_called_once_with("suno")
        mock_generator.poll.assert_called_once()
        self.assertEqual(updated_job.status, GenerationStatus.COMPLETE)
        self.assertEqual(updated_job.audio_url, "https://cdn.example.com/song.mp3")
        self.assertEqual(updated_song.id, song.id)
        self.assertEqual(updated_song.audio_file_path, "https://cdn.example.com/song.mp3")


class GenerationApiTests(GenerationTestDataMixin, TestCase):
    @override_settings(GENERATOR_STRATEGY="mock")
    def test_generate_endpoint_returns_job_and_song_payloads(self):
        response = self.client.post(
            "/api/generate/",
            data=self.payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        self.assertEqual(body["job"]["provider"], "mock")
        self.assertEqual(body["job"]["status"], GenerationStatus.COMPLETE)
        self.assertEqual(body["song"]["title"], self.payload["title"])
        self.assertEqual(body["song"]["audio_file_path"], MOCK_AUDIO_URL)

    def test_suno_callback_updates_job_and_song(self):
        request_obj = self.create_request()
        job = GenerationJob.objects.create(
            request=request_obj,
            provider="suno",
            task_id="task-callback-1",
            status=GenerationStatus.PROCESSING,
        )
        song = Song.objects.create(
            user=self.user,
            generation_request=request_obj,
            generation_job=job,
            title=request_obj.title,
            custom_lyrics=request_obj.custom_lyrics,
            mood=request_obj.mood,
            genre=request_obj.genre,
            occasion=request_obj.occasion,
            voice_type=request_obj.voice_type,
            status=GenerationStatus.PROCESSING,
        )

        response = self.client.post(
            "/api/suno/callback/",
            data={
                "code": 200,
                "msg": "All generated successfully.",
                "data": {
                    "callbackType": "complete",
                    "task_id": "task-callback-1",
                    "data": [
                        {"audio_url": "https://cdn.example.com/from-callback.mp3"},
                    ],
                },
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        job.refresh_from_db()
        song.refresh_from_db()
        self.assertEqual(job.status, GenerationStatus.COMPLETE)
        self.assertEqual(job.audio_url, "https://cdn.example.com/from-callback.mp3")
        self.assertEqual(song.status, GenerationStatus.COMPLETE)
        self.assertEqual(song.audio_file_path, "https://cdn.example.com/from-callback.mp3")

    def test_owner_can_share_completed_song_and_get_link(self):
        song = Song.objects.create(
            user=self.user,
            title="Shareable Song",
            mood="HAPPY",
            genre="POP",
            occasion="BIRTHDAY",
            voice_type="FEMALE",
            status=GenerationStatus.COMPLETE,
            audio_file_path="https://cdn.example.com/shareable.mp3",
        )

        response = self.client.post(
            f"/api/songs/{song.id}/share/",
            data={"viewer_id": self.user.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        body = response.json()
        song.refresh_from_db()
        self.assertTrue(song.is_shared)
        self.assertEqual(body["song"]["id"], song.id)
        self.assertTrue(body["share_path"].startswith("/share/"))

    def test_non_owner_can_share_song_already_visible_in_browse(self):
        other_user = User.objects.create(name="Other User", email="other@example.com")
        song = Song.objects.create(
            user=other_user,
            title="Browseable Song",
            mood="HAPPY",
            genre="POP",
            occasion="BIRTHDAY",
            voice_type="FEMALE",
            status=GenerationStatus.COMPLETE,
            audio_file_path="https://cdn.example.com/browseable.mp3",
            is_shared=True,
        )

        response = self.client.post(
            f"/api/songs/{song.id}/share/",
            data={"viewer_id": self.user.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["song"]["id"], song.id)

    def test_non_owner_cannot_share_private_song(self):
        other_user = User.objects.create(name="Other User", email="other-2@example.com")
        song = Song.objects.create(
            user=other_user,
            title="Private Song",
            mood="HAPPY",
            genre="POP",
            occasion="BIRTHDAY",
            voice_type="FEMALE",
            status=GenerationStatus.COMPLETE,
            audio_file_path="https://cdn.example.com/private.mp3",
            is_shared=False,
        )

        response = self.client.post(
            f"/api/songs/{song.id}/share/",
            data={"viewer_id": self.user.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 403)

    def test_share_link_detail_returns_song(self):
        song = Song.objects.create(
            user=self.user,
            title="Linked Song",
            mood="HAPPY",
            genre="POP",
            occasion="BIRTHDAY",
            voice_type="FEMALE",
            status=GenerationStatus.COMPLETE,
            audio_file_path="https://cdn.example.com/linked.mp3",
            is_shared=True,
        )
        share_link = ShareLink.objects.create(song=song, token="share-token-123")

        response = self.client.get(f"/api/share-links/{share_link.token}/")

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["token"], "share-token-123")
        self.assertEqual(body["song"]["id"], song.id)
