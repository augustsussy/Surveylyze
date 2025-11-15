from datetime import datetime
import json
from django.contrib import messages
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils.http import url_has_allowed_host_and_scheme
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.db.models import Q
from django.shortcuts import render, get_object_or_404
from . import models
from django.shortcuts import render, get_object_or_404
from django.contrib.auth.decorators import login_required

from . import models
from . import models

User = get_user_model()


def landing_page(request):
    return render(request, 'main/landing.html')


def login_view(request):
    if request.user.is_authenticated:
        # If already logged in, redirect based on role
        if request.user.is_superuser or request.user.is_staff:
            return redirect("analytics_admin")
        else:
            return redirect("dashboard")

    if request.method == "POST":
        email = (request.POST.get("email") or "").strip().lower()
        password = (request.POST.get("password") or "").strip()

        # Use email as username for authentication
        user = authenticate(request, username=email, password=password)

        if user is not None:
            if not user.is_active:
                messages.error(request, "Your account is inactive.")
                return redirect("login")

            login(request, user)

            # ✅ Redirect based on role
            if user.is_superuser or user.is_staff:
                return redirect("analytics_admin")  # Admin or Teacher
            else:
                return redirect("dashboard")  # Student

        # Failed login
        messages.error(request, "Invalid email or password.")
        return redirect("login")

    return render(request, "main/login.html")



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

def analytics_admin(request):
    template = 'main/analytics_admin.html'
    context = {'title': 'Admin Analytics'}
    return render(request, template, context)

def surveybuilder(request):
    sections = models.ClassSection.objects.all().order_by("year_level", "class_name")
    template = 'main/surveyBuilder_admin.html'
    context = {
        'title' : "Survey Builder",
        'sections' : sections
    }
    return render(request, template, context)

def survey_builder(request):
    if not request.user.is_staff and not request.user.is_superuser:
        messages.error(request, "You don't have access to the survey builder.")
        return redirect("dashboard")

    sections = models.ClassSection.objects.all().order_by("year_level", "class_name")

    if request.method == "POST":
        title = (request.POST.get("title") or "").strip()
        description = (request.POST.get("description") or "").strip() or None
        due_raw = request.POST.get("dueDate")
        section_id = request.POST.get("assignTo")
        action = request.POST.get("action")  # "draft" or "publish"

        status = "published" if action == "publish" else "draft"

        # parse due date
        due_date = None
        if due_raw:
            try:
                due_date = datetime.strptime(due_raw, "%Y-%m-%d").date()
            except ValueError:
                messages.error(request, "Invalid due date format.")
                return redirect("survey_builder")

        # teacher linked to this user
        try:
            teacher = request.user.teacher_profile
        except Exception:
            teacher = get_object_or_404(models.Teacher, user=request.user)

        # create survey
        survey = models.Survey.objects.create(
            teacher=teacher,
            title=title,
            description=description,
            status=status,
            due_date=due_date,
        )

        # 🔹 link survey → section
        if section_id:
            section = get_object_or_404(models.ClassSection, pk=section_id)
            models.SurveyAssignment.objects.create(
                survey=survey,
                class_section=section,
            )

        # 🔹 NOW: save questions from the hidden "questions" JSON
        questions_json = request.POST.get("questions", "[]")

        try:
            questions = json.loads(questions_json)
        except json.JSONDecodeError:
            questions = []

        for q in questions:
            text = (q.get("question") or "").strip()
            if not text:
                continue

            q_type = q.get("question_type") or "short_answer"
            order = q.get("order_number") or 1

            models.Question.objects.create(
                survey=survey,
                question=text,
                question_type=q_type,   # "mcq", "likert", "short_answer"
                order_number=order,
            )

        messages.success(
            request,
            f'Survey “{survey.title}” saved as {survey.status} with {len(questions)} question(s).'
        )
        return redirect("survey_builder")

    return render(request, "main/surveyBuilder_admin.html", {
        "sections": sections,
        "title": "Survey Builder",
    })

def dashboard(request):
    # get the logged-in student
    try:
        student = request.user.student_profile
    except Exception:
        student = get_object_or_404(models.Student, user=request.user)

    section = student.class_section

    today = timezone.now().date()

    # 🔹 surveys assigned to this section AND published
    surveys = models.Survey.objects.filter(
        assignments__class_section=section,
        status="published"
    ).filter(
        Q(due_date__isnull=True) | Q(due_date__gte=today)  # active or no due date
    ).distinct().order_by("due_date", "title")

    return render(request, "main/dashboard.html", {
        "student": student,
        "surveys": surveys,
    })

@login_required
def take_survey(request, survey_id):
    # Get the survey
    survey = get_object_or_404(models.Survey, pk=survey_id)

    # Get logged-in student
    try:
        student = request.user.student_profile
    except Exception:
        student = get_object_or_404(models.Student, user=request.user)

    # Check if this student already answered this survey
    already_answered = models.SurveyHistory.objects.filter(
        survey=survey,
        student=student
    ).exists()

    if already_answered:
        messages.info(request, "You have already answered this survey.")
        return redirect("dashboard")  # or render a 'already completed' page

    # Get questions for this survey
    questions = survey.questions.all().order_by("order_number")

    if request.method == "POST":
        # Double-check again on POST, just in case
        if models.SurveyHistory.objects.filter(survey=survey, student=student).exists():
            messages.info(request, "You have already answered this survey.")
            return redirect("dashboard")

        # Create survey attempt record
        history = models.SurveyHistory.objects.create(
            survey=survey,
            student=student,
        )

        # Loop through each question and save answers
        for question in questions:
            field_name = f"q{question.question_id}"
            raw_value = request.POST.get(field_name)

            if not raw_value:
                continue  # skip unanswered

            answer = models.StudentAnswer(
                history=history,
                question=question
            )

            qtype = question.question_type

            if qtype == "short_answer":
                answer.shortanswer_text = raw_value

            elif qtype in ("likert", "likert_scale"):
                try:
                    answer.likert_value = int(raw_value)
                except ValueError:
                    continue

            elif qtype == "mcq":
                try:
                    answer.choice_id = int(raw_value)
                except ValueError:
                    continue

            answer.save()

        messages.success(request, "Survey submitted successfully. Thank you!")
        return redirect("dashboard")

    # GET request — show survey page
    return render(request, "main/survey.html", {
        "survey": survey,
        "questions": questions,
    })
