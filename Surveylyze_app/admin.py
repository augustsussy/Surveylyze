from django.contrib import admin
from . import models

admin.site.register(models.Survey)
admin.site.register(models.Teacher)
admin.site.register(models.Student)
admin.site.register(models.ClassSection)


