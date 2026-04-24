from django.contrib import admin
from .models import User, MusicGenerationRequest, Song, ShareLink, GenerationJob


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'email']
    search_fields = ['name', 'email']


@admin.register(MusicGenerationRequest)
class MusicGenerationRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'title', 'user', 'mood', 'genre', 'submitted_at', 'is_retry']
    list_filter  = ['mood', 'genre', 'occasion', 'is_retry']


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display  = ['id', 'title', 'user', 'status', 'is_shared', 'creation_date']
    list_filter   = ['status', 'genre', 'mood', 'is_shared']
    search_fields = ['title']


@admin.register(ShareLink)
class ShareLinkAdmin(admin.ModelAdmin):
    list_display = ['id', 'song', 'token', 'is_active', 'created_at']

@admin.register(GenerationJob)
class GenerationJobAdmin(admin.ModelAdmin):
    list_display = ["id", "provider", "task_id", "status", "request", "created_at"]
    list_filter = ["provider", "status"]
