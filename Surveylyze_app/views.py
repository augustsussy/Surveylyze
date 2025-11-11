from django.shortcuts import render
from . import models
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.contrib import messages
from django.db import IntegrityError, transaction
from django.shortcuts import redirect, get_object_or_404
from django.contrib.auth.models import User


from .models import ClassSection


def landing_page(request):
    return render(request, 'main/landing.html')


def login_view(request):
    return render(request, 'main/login.html')

def dashboard(request):
    template = 'main/dashboard.html'
    return render(request, template)

def survey(request):
    return render(request, 'main/survey.html')

# def addStudentForm(request):
#     template='main/signup.html'
#     context={
#         "title" : "Student Signup"
#     }
#     return render(request,template,context)

def saveSignUp(request):
    if request.method != "POST":
        return redirect("signup")

    section_id = request.POST.get("section")
    section = get_object_or_404(models.ClassSection, pk=section_id)

    firstname = request.POST.get("firstname", "").strip()
    middlename = request.POST.get("middlename", "").strip() or None
    lastname = request.POST.get("lastname", "").strip()
    email = request.POST.get("email", "").strip()
    password = request.POST.get("password", "").strip()

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,  # use email as username
                email=email,
                password=password,
                first_name=firstname,
                last_name=lastname,
            )
            models.Student.objects.create(
                user=user,
                firstname=firstname,
                middlename=middlename,
                lastname=lastname,
                class_section=section,
            )
        messages.success(request, "Account created successfully! You can now log in.")
        return redirect(reverse("login"))
    except Exception as e:
        messages.error(request, f"Error creating account: {e}")
        return redirect("login")


def addStudentForm(request):
    sections = models.ClassSection.objects.all().order_by("year_level", "class_name")
    return render(request, "main/signup.html", {"sections": sections})