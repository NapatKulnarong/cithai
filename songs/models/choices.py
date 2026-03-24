from django.db import models


class Mood(models.TextChoices):
    HAPPY = "HAPPY", "Happy"
    SAD = "SAD", "Sad"
    ROMANTIC = "ROMANTIC", "Romantic"
    ENERGETIC = "ENERGETIC", "Energetic"
    CALM = "CALM", "Calm"


class Genre(models.TextChoices):
    POP = "POP", "Pop"
    ROCK = "ROCK", "Rock"
    JAZZ = "JAZZ", "Jazz"
    CLASSICAL = "CLASSICAL", "Classical"
    HIPHOP = "HIPHOP", "HipHop"


class Occasion(models.TextChoices):
    BIRTHDAY = "BIRTHDAY", "Birthday"
    WEDDING = "WEDDING", "Wedding"
    GRADUATION = "GRADUATION", "Graduation"
    ANNIVERSARY = "ANNIVERSARY", "Anniversary"
    CUSTOM = "CUSTOM", "Custom"


class VoiceType(models.TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    CHILD = "CHILD", "Child"
    CHOIR = "CHOIR", "Choir"
    INSTRUMENTAL = "INSTRUMENTAL", "Instrumental"
    DUET = "DUET", "Duet"


class GenerationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETE = "COMPLETE", "Complete"
    FAILED = "FAILED", "Failed"
