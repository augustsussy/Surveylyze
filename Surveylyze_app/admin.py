from django.contrib import admin
from . import models
from django.contrib.auth.models import User
from .models import Teacher

def create_teacher_account(firstname, lastname, email, password):
    user = User.objects.create_user(
        username=email.lower(),
        email=email.lower(),
        password=password,
        first_name=firstname,
        last_name=lastname,
    )
    # ✅ Make them staff (can access analytics dashboard)
    user.is_staff = True
    user.save()

    Teacher.objects.create(
        user=user,
        firstname=firstname,
        lastname=lastname,
        email_address=email,
    )

admin.site.register(models.Survey)
admin.site.register(models.Teacher)
admin.site.register(models.Student)
admin.site.register(models.ClassSection)


