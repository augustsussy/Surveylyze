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

        # 🔹 save questions from the hidden "questions" JSON
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
            options = q.get("options") or []

            # create the Question first
            question_obj = models.Question.objects.create(
                survey=survey,
                question=text,
                question_type=q_type,   # "mcq", "likert", "short_answer"
                order_number=order,
            )

            # 🔹 if MCQ, create Option rows
            if q_type == "mcq":
                for opt_text in options:
                    opt_text = (opt_text or "").strip()
                    if not opt_text:
                        continue
                    models.Option.objects.create(
                        question=question_obj,
                        option_text=opt_text,
                    )

        messages.success(
            request,
            f'Survey “{survey.title}” saved as {survey.status} with {len(questions)} question(s).'
        )

        if status == "published":
            return redirect("analytics_admin")

        return redirect("survey_builder")

    return render(request, "main/surveyBuilder_admin.html", {
        "sections": sections,
        "title": "Survey Builder",
    })

from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404, render
from . import models


@login_required
def dashboard(request):
    # get the logged-in student
    try:
        student = request.user.student_profile
    except Exception:
        student = get_object_or_404(models.Student, user=request.user)

    section = student.class_section
    today = timezone.now().date()

    # 🔹 All published, not-expired surveys assigned to this section
    base_surveys = models.Survey.objects.filter(
        assignments__class_section=section,
        status="published",
    ).filter(
        Q(due_date__isnull=True) | Q(due_date__gte=today)
    ).distinct()

    # 🔹 Surveys THIS student has already answered
    answered_ids = models.SurveyHistory.objects.filter(
        student=student
    ).values_list("survey_id", flat=True)

    # 🔹 Assigned (to show in "ASSIGNED SURVEY" card): base − answered_by_this_student
    assigned_surveys = base_surveys.exclude(survey_id__in=answered_ids).order_by("due_date", "title")

    # 🔹 Response history (only THIS student's attempts)
    responses = models.SurveyHistory.objects.filter(
        student=student
    ).select_related("survey").order_by("-submitted_at")

    return render(request, "main/dashboard.html", {
        "student": student,
        "surveys": assigned_surveys,   # your template uses 'surveys' for the card
        "responses": responses,        # your response history table
    })


@login_required
def take_survey(request, survey_id):
    survey = get_object_or_404(models.Survey, pk=survey_id)

    # Logged-in student
    try:
        student = request.user.student_profile
    except Exception:
        student = get_object_or_404(models.Student, user=request.user)

    # Has THIS student already answered THIS survey?
    existing_history = models.SurveyHistory.objects.filter(
        survey=survey,
        student=student
    ).first()

    if request.method == "POST":
        if existing_history:
            messages.warning(request, "You have already answered this survey.")
            return redirect("dashboard")

        # Create history record
        history = models.SurveyHistory.objects.create(
            survey=survey,
            student=student,
            duration=None,
        )

        # Loop all questions for this survey
        for question in survey.questions.all().order_by("order_number"):
            field_name = f"q{question.question_id}"
            raw_value = request.POST.get(field_name)

            # normalize type
            qtype = (question.question_type or "").strip().lower()

            # 🔍 DEBUG: see exactly what is coming in
            print(
                "ANSWER DEBUG ->",
                "QID:", question.question_id,
                "| TYPE:", repr(qtype),
                "| FIELD:", field_name,
                "| VALUE:", repr(raw_value),
            )

            # nothing submitted
            if raw_value in (None, ""):
                continue

            # SHORT ANSWER
            if qtype == "short_answer":
                models.StudentAnswer.objects.create(
                    history=history,
                    question=question,
                    shortanswer_text=raw_value
                )

            # LIKERT (likert / likert_scale)
            elif qtype.startswith("likert"):
                try:
                    likert_val = int(raw_value)
                except (TypeError, ValueError):
                    print("  -> LIKERT: cannot convert", raw_value, "to int")
                    continue

                models.StudentAnswer.objects.create(
                    history=history,
                    question=question,
                    likert_value=likert_val
                )
                print("  -> LIKERT: saved", likert_val)

            # MCQ
            elif qtype in ("mcq", "multiple_choice"):
                try:
                    choice_pk = int(raw_value)   # from <option value="{{ opt.option_id }}">
                except (TypeError, ValueError):
                    print("  -> MCQ: cannot convert", raw_value, "to int")
                    continue

                try:
                    option = models.Option.objects.get(
                        option_id=choice_pk,
                        question=question
                    )
                except models.Option.DoesNotExist:
                    print("  -> MCQ: Option", choice_pk, "does not belong to Question", question.question_id)
                    continue

                models.StudentAnswer.objects.create(
                    history=history,
                    question=question,
                    choice_id=option.option_id,
                )
                print("  -> MCQ: SAVED choice_id =", option.option_id)

            # else: skip unknown types
            else:
                print("  -> SKIP: unknown type", repr(qtype))
                continue

        messages.success(request, "Your responses have been submitted.")
        return redirect("dashboard")

    else:
        # GET: block if already answered
        if existing_history:
            messages.warning(request, "You have already answered this survey.")
            return redirect("dashboard")

    questions = survey.questions.all().order_by("order_number")
    return render(request, "main/survey.html", {
        "survey": survey,
        "questions": questions,
    })

@login_required
def response_history(request, history_id):
    try:
        student = request.user.student_profile
    except Exception:
        student = get_object_or_404(models.Student, user=request.user)

    history = get_object_or_404(
        models.SurveyHistory,
        pk=history_id,
        student=student,  # <= important filter
    )

    answers = history.answers.select_related("question").all().order_by(
        "question__order_number"
    )

    return render(request, "main/response_history.html", {
        "history": history,
        "answers": answers,
    })
