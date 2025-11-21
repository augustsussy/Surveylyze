# app/forms.py
from django import forms
from django.contrib.auth.models import User
from .models import Teacher
from .models import Student



class UserUpdateForm(forms.ModelForm):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email']



class TeacherUpdateForm(forms.ModelForm):
    class Meta:
        model = Teacher
        fields = [
            'firstname',
            'middlename',
            'lastname',
            'email_address',
            'profile_picture',
        ]


class StudentUpdateForm(forms.ModelForm):
    class Meta:
        model = Student
        fields = ["firstname", "middlename", "lastname", "profile_picture"]
