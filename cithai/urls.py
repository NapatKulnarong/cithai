"""
URL configuration for cithai project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path

from songs import api as songs_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/bootstrap/', songs_api.bootstrap, name='bootstrap'),
    # Simple JSON API endpoints for Songs
    path('api/songs/', songs_api.song_list_create, name='song-list-create'),
    path('api/songs/<int:pk>/', songs_api.song_detail, name='song-detail'),
    # Simple JSON API endpoints for Users (domain user)
    path('api/users/', songs_api.user_list_create, name='user-list-create'),
    path('api/users/<int:pk>/', songs_api.user_detail, name='user-detail'),
    path('api/songs/<int:pk>/share/', songs_api.song_share, name='song-share'),
    path('api/share-links/<str:token>/', songs_api.share_link_detail, name='share-link-detail'),
    path('api/generation-jobs/', songs_api.generation_job_list, name='generation-job-list'),
    path('api/generate/', songs_api.generate_start, name='generate-start'),
    path('api/generate/<int:pk>/', songs_api.generate_poll, name='generate-poll'),
    path('api/generate/<int:pk>/poll/', songs_api.generate_poll, name='generate-poll-alias'),
    path('api/suno/callback/', songs_api.suno_callback, name='suno-callback'),
]
