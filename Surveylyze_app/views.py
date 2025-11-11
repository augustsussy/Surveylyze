from django.shortcuts import render
from . import models
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.contrib import messages
from django.db import IntegrityError, transaction
from django.shortcuts import redirect, get_object_or_404
from django.contrib.auth.models import User
from django.contrib import messages
from django.contrib.auth import authenticate, login
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout
from django.contrib import messages
from django.contrib.auth import authenticate, login, get_user_model
from django.shortcuts import render, redirect
from django.utils.http import url_has_allowed_host_and_scheme
User = get_user_model()
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import redirect, get_object_or_404
from django.urls import reverse
from . import models


from .models import ClassSection


def landing_page(request):
    return render(request, 'main/landing.html')


def login_view(request):

    if request.method == "POST":
        email_input = (request.POST.get("email") or "").strip().lower()
        password = (request.POST.get("password") or "").strip()

        user = None

        # Case 1: accounts created with username=email
        user = authenticate(request, username=email_input, password=password)

        # Case 2: accounts whose username != email, but email matches
        if user is None:
            try:
                u = User.objects.get(email__iexact=email_input)
                user = authenticate(request, username=u.username, password=password)
            except User.DoesNotExist:
                user = None

        if user is not None:
            if not user.is_active:
                messages.error(request, "Your account is inactive.")
                return redirect("login")
            login(request, user)

            next_url = request.POST.get("next") or request.GET.get("next")
            if next_url and url_has_allowed_host_and_scheme(next_url, {request.get_host()}):
                return redirect(next_url)
            return redirect("dashboard")

        # Helpful messages
        if User.objects.filter(email__iexact=email_input).exists() or User.objects.filter(username__iexact=email_input).exists():
            messages.error(request, "Incorrect password.")
        else:
            messages.error(request, "No account found with that email.")
        return redirect("login")

    return render(request, "main/login.html")

def dashboard(request):
    return render(request, "main/dashboard.html", {
        "title": "Dashboard",
        "user": request.user,
    })

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

    # grab fields
    firstname = (request.POST.get("firstname") or "").strip()
    middlename = (request.POST.get("middlename") or "").strip() or None
    lastname  = (request.POST.get("lastname")  or "").strip()
    email     = (request.POST.get("email")     or "").strip().lower()
    pw1       = (request.POST.get("password1") or "").strip()
    pw2       = (request.POST.get("password2") or "").strip()

    # section
    section_id = request.POST.get("section")
    section = get_object_or_404(models.ClassSection, pk=section_id)

    # passwords must match
    if pw1 != pw2:
        messages.error(request, "Passwords do not match.")
        return redirect("signup")

    # (optional) enforce Django password validators
    try:
        temp_user = User(username=email, email=email, first_name=firstname, last_name=lastname)
        validate_password(pw1, user=temp_user)
    except ValidationError as e:
        for msg in e.messages:
            messages.error(request, msg)
        return redirect("signup")

    # create everything
    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,      # we use email as username
                email=email,
                password=pw1,        # <-- pass the RAW password here
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
        return redirect("signup")


def addStudentForm(request):
    sections = models.ClassSection.objects.all().order_by("year_level", "class_name")

    context = {
        "title": "Student Signup",
        "sections": sections,
    }

    return render(request, "main/signup.html", context)

def logout_view(request):
    logout(request)
    return redirect('login')
