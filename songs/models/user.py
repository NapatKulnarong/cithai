from django.db import models


class User(models.Model):
    """
    Represents an authenticated platform user.
    Auth fields (googleId, passwordHash) are infrastructure concerns — excluded
    per Assumption A-1 from the domain model.
    """

    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} <{self.email}>"
