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
import json
import re
from collections import Counter
from .models import Teacher
from .forms import TeacherUpdateForm
from django.contrib.auth.forms import PasswordChangeForm
from .models import Student
from .forms import StudentUpdateForm



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
        return redirect("addStudentForm")

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

    if pw1 != pw2:
        messages.error(request, "Passwords do not match.")
        return redirect("addStudentForm")

    try:
        temp_user = User(username=email, email=email, first_name=firstname, last_name=lastname)
        validate_password(pw1, user=temp_user)
    except ValidationError as e:
        for msg in e.messages:
            messages.error(request, msg)
        return redirect("addStudentForm")

    try:
        with transaction.atomic():
            user = User.objects.create_user(
                username=email,
                email=email,
                password=pw1,
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


    # ---------------------------
    # FIXED ERROR MESSAGE HERE
    # ---------------------------
    except Exception as e:
        if "UNIQUE constraint failed: auth_user.username" in str(e):
            messages.error(request, "That email is already registered.")
        else:
            messages.error(request, "An unexpected error occurred. Please try again.")
        return redirect("addStudentForm")


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


@login_required
def analytics_admin(request):
    """
    Analytics dashboard with PER-QUESTION breakdown.
    Shows analytics for each question separately.
    """

    # Ensure user is staff/teacher
    if not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, "You don't have permission to access analytics.")
        return redirect('dashboard')

    # Get the teacher's surveys
    try:
        teacher = request.user.teacher_profile
    except models.Teacher.DoesNotExist:
        messages.error(request, "Teacher profile not found. Please contact administrator.")
        return redirect('login')

    all_surveys = models.Survey.objects.filter(teacher=teacher)

    # ==========================================
    # FILTER BY SELECTED SURVEY
    # ==========================================
    selected_survey_id = request.GET.get('survey_id', 'all')
    selected_survey_id_int = None

    if selected_survey_id != 'all':
        try:
            selected_survey_id_int = int(selected_survey_id)
            surveys = all_surveys.filter(survey_id=selected_survey_id_int)
            selected_survey = surveys.first()
        except (ValueError, models.Survey.DoesNotExist):
            surveys = all_surveys
            selected_survey = None
            selected_survey_id = 'all'
    else:
        surveys = all_surveys
        selected_survey = None

    # ==========================================
    # 1. TOP METRICS (Overall)
    # ==========================================
    total_surveys = surveys.count()
    total_submissions = models.SurveyHistory.objects.filter(survey__in=surveys).count()

    today = timezone.now().date()
    active_surveys = surveys.filter(
        status='published'
    ).filter(
        Q(due_date__isnull=True) | Q(due_date__gte=today)
    ).count()

    # ==========================================
    # 2. PER-QUESTION ANALYTICS (NEW!)
    # ==========================================
    question_analytics = []

    # Get all questions from selected surveys
    questions = models.Question.objects.filter(
        survey__in=surveys
    ).select_related('survey').order_by('survey__title', 'order_number')

    # Sentiment word lists
    positive_words = [
        'good', 'great', 'excellent', 'amazing', 'love', 'like', 'best',
        'awesome', 'wonderful', 'fantastic', 'happy', 'helpful', 'clear',
        'interesting', 'enjoyable', 'effective', 'nice', 'fun', 'satisfied',
        'perfect', 'brilliant', 'outstanding'
    ]
    negative_words = [
        'bad', 'poor', 'terrible', 'awful', 'hate', 'dislike', 'worst',
        'boring', 'confusing', 'difficult', 'hard', 'unclear', 'unhelpful',
        'disappointed', 'frustrating', 'useless', 'waste', 'complicated',
        'annoying', 'horrible'
    ]

    stop_words = {
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
        'of', 'with', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
        'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
        'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
        'who', 'when', 'where', 'why', 'how', 'my', 'your', 'his', 'her',
        'its', 'our', 'their', 'me', 'him', 'us', 'them', 'very', 'too',
        'also', 'just', 'so', 'than', 'such', 'both', 'through', 'about',
        'between', 'into', 'during', 'before', 'after', 'above', 'below',
        'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
        'then', 'once', 'here', 'there', 'all', 'any', 'each', 'few', 'more',
        'most', 'other', 'some', 'no', 'not', 'only', 'own', 'same', 'as', 'by'
    }

    for question in questions:
        q_data = {
            'question_id': question.question_id,
            'question_text': question.question,
            'question_type': question.question_type,
            'survey_title': question.survey.title,
            'order_number': question.order_number,
        }

        # Get answers for this specific question
        answers = models.StudentAnswer.objects.filter(
            question=question,
            history__survey__in=surveys
        )

        # === SHORT ANSWER QUESTIONS ===
        if question.question_type == 'short_answer':
            text_answers = answers.exclude(
                shortanswer_text__isnull=True
            ).exclude(
                shortanswer_text=''
            ).values_list('shortanswer_text', flat=True)

            # Sentiment analysis
            positive_count = 0
            negative_count = 0
            neutral_count = 0

            for text in text_answers:
                text_lower = text.lower()
                has_positive = any(word in text_lower for word in positive_words)
                has_negative = any(word in text_lower for word in negative_words)

                if has_positive and not has_negative:
                    positive_count += 1
                elif has_negative and not has_positive:
                    negative_count += 1
                else:
                    neutral_count += 1

            q_data['sentiment'] = {
                'Positive': positive_count,
                'Neutral': neutral_count,
                'Negative': negative_count
            }

            # Keywords
            all_text = ' '.join(text_answers)
            words = re.findall(r'\b[a-z]{3,}\b', all_text.lower())
            filtered_words = [w for w in words if w not in stop_words]
            word_counts = Counter(filtered_words)
            q_data['keywords'] = dict(word_counts.most_common(15))

            q_data['response_count'] = len(text_answers)

        # === LIKERT QUESTIONS ===
        elif question.question_type in ['likert', 'likert_scale']:
            likert_values = answers.exclude(
                likert_value__isnull=True
            ).values_list('likert_value', flat=True)

            likert_labels = {
                1: 'Strongly Disagree',
                2: 'Disagree',
                3: 'Neutral',
                4: 'Agree',
                5: 'Strongly Agree'
            }

            agreement_levels = {label: 0 for label in likert_labels.values()}
            for value in likert_values:
                if value in likert_labels:
                    agreement_levels[likert_labels[value]] += 1

            q_data['agreement_levels'] = agreement_levels
            q_data['response_count'] = len(likert_values)

        # === MCQ QUESTIONS ===
        elif question.question_type == 'mcq':
            mcq_answers = answers.exclude(choice_id__isnull=True)

            # Get all options for this question
            options = models.Option.objects.filter(question=question)
            option_counts = {opt.option_text: 0 for opt in options}

            for answer in mcq_answers:
                try:
                    option = models.Option.objects.get(option_id=answer.choice_id)
                    option_counts[option.option_text] += 1
                except models.Option.DoesNotExist:
                    continue

            q_data['mcq_distribution'] = option_counts
            q_data['response_count'] = mcq_answers.count()

        # Only add questions that have responses
        if q_data.get('response_count', 0) > 0:
            question_analytics.append(q_data)

    # ==========================================
    # 3. PREPARE CONTEXT
    # ==========================================
    context = {
        'title': 'Analytics Dashboard',
        'teacher': teacher,  # <-- add this line

        'all_surveys': all_surveys.order_by('-created_date'),
        'selected_survey_id': selected_survey_id,
        'selected_survey_id_int': selected_survey_id_int,
        'selected_survey': selected_survey,

        'metrics': json.dumps({
            'surveys_total': total_surveys,
            'submissions': total_submissions,
            'active_surveys': active_surveys,
        }),
        'question_analytics': json.dumps(question_analytics),
    }

    return render(request, 'main/analytics_admin.html', context)

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

    # Check if we're editing an existing survey
    edit_survey_id = request.GET.get('edit')
    edit_survey = None
    survey_data = None

    if edit_survey_id:
        try:
            edit_survey = models.Survey.objects.get(pk=edit_survey_id)

            # Check if this teacher owns the survey
            try:
                teacher = request.user.teacher_profile
                if edit_survey.teacher != teacher and not request.user.is_superuser:
                    messages.error(request, "You don't have permission to edit this survey.")
                    return redirect("my_surveys")
            except:
                pass

            # Get all questions with their options
            questions = edit_survey.questions.all().order_by('order_number')
            questions_data = []

            for q in questions:
                question_dict = {
                    'question_id': q.question_id,
                    'order_number': q.order_number,
                    'question': q.question,
                    'question_type': q.question_type,
                }

                # If MCQ, get options
                if q.question_type == 'mcq':
                    options = list(q.options.all().values_list('option_text', flat=True))
                    question_dict['options'] = options

                questions_data.append(question_dict)

            # Get assigned section
            assignment = models.SurveyAssignment.objects.filter(survey=edit_survey).first()
            assigned_section = assignment.class_section.class_id if assignment else None

            survey_data = {
                'survey_id': edit_survey.survey_id,
                'title': edit_survey.title,
                'description': edit_survey.description or '',
                'due_date': edit_survey.due_date.strftime('%Y-%m-%d') if edit_survey.due_date else '',
                'status': edit_survey.status,
                'assigned_section': assigned_section,
                'questions': questions_data
            }

        except models.Survey.DoesNotExist:
            messages.error(request, "Survey not found.")
            return redirect("my_surveys")

    if request.method == "POST":
        # Check if we're updating or creating
        survey_id = request.POST.get('survey_id')

        title = (request.POST.get("title") or "").strip()
        description = (request.POST.get("description") or "").strip() or None
        due_raw = request.POST.get("dueDate")
        section_id = request.POST.get("assignTo")
        action = request.POST.get("action")

        status = "published" if action == "publish" else "draft"

        due_date = None
        if due_raw:
            try:
                due_date = datetime.strptime(due_raw, "%Y-%m-%d").date()
            except ValueError:
                messages.error(request, "Invalid due date format.")
                return redirect("survey_builder")

        try:
            teacher = request.user.teacher_profile
        except Exception:
            teacher = get_object_or_404(models.Teacher, user=request.user)

        # UPDATE existing survey
        if survey_id:
            try:
                survey = models.Survey.objects.get(pk=survey_id)

                # Verify ownership
                if survey.teacher != teacher and not request.user.is_superuser:
                    messages.error(request, "You don't have permission to edit this survey.")
                    return redirect("my_surveys")

                # Update survey fields
                survey.title = title
                survey.description = description
                survey.status = status
                survey.due_date = due_date
                survey.save()

                # Delete old questions
                survey.questions.all().delete()

                # Delete old assignments
                models.SurveyAssignment.objects.filter(survey=survey).delete()

            except models.Survey.DoesNotExist:
                messages.error(request, "Survey not found.")
                return redirect("my_surveys")
        else:
            # CREATE new survey
            survey = models.Survey.objects.create(
                teacher=teacher,
                title=title,
                description=description,
                status=status,
                due_date=due_date,
            )

        # Link survey to section
        if status == "published" and section_id:
            section = get_object_or_404(models.ClassSection, pk=section_id)
            models.SurveyAssignment.objects.create(
                survey=survey,
                class_section=section,
            )

        # Save questions
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

            question_obj = models.Question.objects.create(
                survey=survey,
                question=text,
                question_type=q_type,
                order_number=order,
            )

            if q_type == "mcq":
                for opt_text in options:
                    opt_text = (opt_text or "").strip()
                    if not opt_text:
                        continue
                    models.Option.objects.create(
                        question=question_obj,
                        option_text=opt_text,
                    )

        if survey_id:
            messages.success(request, f'Survey "{survey.title}" updated successfully!')
        else:
            messages.success(request,
                             f'Survey "{survey.title}" saved as {survey.status} with {len(questions)} question(s).')

        if status == "published":
            return redirect("analytics_admin")

        return redirect("my_surveys")

    return render(request, "main/surveyBuilder_admin.html", {
        "sections": sections,
        "title": "Survey Builder",
        "edit_survey": edit_survey,
        "survey_data": json.dumps(survey_data) if survey_data else None,
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
        "student": student,
    })


@login_required
def response_history(request, history_id):
    # Get the history record
    history = get_object_or_404(models.SurveyHistory, pk=history_id)

    # 🔹 CHECK PERMISSIONS
    # Students can only view their own responses
    # Teachers/admins can view any response
    if not (request.user.is_staff or request.user.is_superuser):
        try:
            student = request.user.student_profile
            if history.student != student:
                messages.error(request, "You don't have permission to view this response.")
                return redirect('dashboard')
        except:
            messages.error(request, "Invalid access.")
            return redirect('dashboard')

    answers = history.answers.select_related("question").all().order_by(
        "question__order_number"
    )

    return render(request, "main/response_history.html", {
        "history": history,
        "answers": answers,
    })


@login_required
def admin_responses(request):
    """Response management page with search and filters"""

    if not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, "You don't have permission to access this page.")
        return redirect('dashboard')

    # Get all surveys for the teacher
    # Get the teacher's surveys ONLY
    try:
        teacher = request.user.teacher_profile
    except models.Teacher.DoesNotExist:
        messages.error(request, "Teacher profile not found. Please contact administrator.")
        return redirect('login')

    all_surveys = models.Survey.objects.filter(teacher=teacher)

    responses = models.SurveyHistory.objects.select_related(
        'student', 'student__class_section', 'survey'
    ).filter(survey__in=all_surveys)

    # Get filter parameters
    search_query = request.GET.get('q', '').strip()
    selected_survey = request.GET.get('survey', '')
    date_from = request.GET.get('date_from', '')
    date_to = request.GET.get('date_to', '')

    # Apply search filter - IMPROVED TO HANDLE FULL NAMES
    if search_query:
        from django.db.models import Q

        # Split search query by spaces
        search_terms = search_query.split()

        if len(search_terms) == 1:
            # Single word - search in firstname, lastname, or survey title
            term = search_terms[0]
            responses = responses.filter(
                Q(student__firstname__icontains=term) |
                Q(student__lastname__icontains=term) |
                Q(survey__title__icontains=term)
            )
        else:
            # Multiple words - assume first name + last name
            # Search for combinations
            query = Q()

            for i in range(len(search_terms)):
                for j in range(i + 1, len(search_terms) + 1):
                    first_part = ' '.join(search_terms[i:j])
                    remaining = ' '.join(search_terms[:i] + search_terms[j:])

                    # Try firstname + lastname
                    query |= (
                            Q(student__firstname__icontains=first_part) &
                            Q(student__lastname__icontains=remaining)
                    )

                    # Try lastname + firstname
                    query |= (
                            Q(student__lastname__icontains=first_part) &
                            Q(student__firstname__icontains=remaining)
                    )

            # Also search each word individually as fallback
            for term in search_terms:
                query |= Q(student__firstname__icontains=term)
                query |= Q(student__lastname__icontains=term)
                query |= Q(survey__title__icontains=term)

            responses = responses.filter(query).distinct()

    # Apply survey filter
    if selected_survey:
        try:
            survey_id = int(selected_survey)
            responses = responses.filter(survey_id=survey_id)
        except ValueError:
            pass

    # Apply date filters
    if date_from:
        from datetime import datetime
        try:
            date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
            responses = responses.filter(submitted_at__date__gte=date_from_obj)
        except ValueError:
            pass

    if date_to:
        from datetime import datetime
        try:
            date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
            responses = responses.filter(submitted_at__date__lte=date_to_obj)
        except ValueError:
            pass

    # Order by most recent
    responses = responses.order_by('-submitted_at')

    # Pagination
    from django.core.paginator import Paginator
    paginator = Paginator(responses, 10)  # 10 responses per page
    page_number = request.GET.get('page', 1)
    responses_page = paginator.get_page(page_number)

    context = {
        'responses': responses_page,
        'all_surveys': all_surveys,
        'search_query': search_query,
        'selected_survey': selected_survey,
        'date_from': date_from,
        'date_to': date_to,
        'teacher': teacher,
    }

    return render(request, 'main/admin_responses.html', context)


@login_required
def my_surveys(request):
    """Display all surveys created by the teacher"""

    # Ensure user is staff/teacher
    if not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, "You don't have permission to access analytics.")
        return redirect('dashboard')

    # Verify teacher profile exists
    try:
        teacher = request.user.teacher_profile
    except models.Teacher.DoesNotExist:
        messages.error(request, "No teacher profile found. Please contact administrator.")
        return redirect('login')

    # Get surveys for THIS teacher only
    all_surveys = models.Survey.objects.filter(teacher=teacher)
    context = {
        'surveys': all_surveys,
        'teacher': teacher,

    }

    return render(request, 'main/my_surveys.html', context)


@login_required
def delete_survey(request, survey_id):
    """Delete a survey"""

    if not (request.user.is_staff or request.user.is_superuser):
        messages.error(request, "You don't have permission to delete surveys.")
        return redirect('dashboard')

    survey = get_object_or_404(models.Survey, pk=survey_id)

    # Check if the survey belongs to this teacher
    try:
        teacher = request.user.teacher_profile
        if survey.teacher != teacher and not request.user.is_superuser:
            messages.error(request, "You don't have permission to delete this survey.")
            return redirect('my_surveys')
    except:
        pass

    survey_title = survey.title
    survey.delete()

    messages.success(request, f'Survey "{survey_title}" has been deleted successfully.')
    return redirect('my_surveys')

@login_required
def teacher_settings(request):
    # get the Teacher object for the logged-in user
    teacher= get_object_or_404(Teacher, user=request.user)

    if request.method == 'POST':
        # Decide which form was submitted by button name
        if 'save_profile' in request.POST:
            teacher_form = TeacherUpdateForm(
                request.POST,
                request.FILES,
                instance=teacher
            )
            if teacher_form.is_valid():
                teacher_form.save()
                messages.success(request, "Profile updated successfully.")
                return redirect('teacher_settings')

        elif 'change_password' in request.POST:
            password_form = PasswordChangeForm(request.user, request.POST)
            if password_form.is_valid():
                user = password_form.save()
                update_session_auth_hash(request, user)  # keep user logged in
                messages.success(request, "Password changed successfully.")
                return redirect('teacher_settings')
    else:
        teacher_form = TeacherUpdateForm(instance=teacher)
        password_form = PasswordChangeForm(request.user)

    context = {
        'teacher_form': teacher_form,
        'password_form': password_form,
        'teacher': teacher,
    }
    return render(request, 'main/teacher_settings.html', context)

@login_required
def student_settings(request):
    student = get_object_or_404(Student, user=request.user)

    if request.method == "POST":
        # profile info (name + profile picture)
        if "save_profile" in request.POST:
            student_form = StudentUpdateForm(
                request.POST,
                request.FILES,          # 👈 IMPORTANT for profile_picture
                instance=student,
            )
            password_form = PasswordChangeForm(request.user)  # still show empty

            if student_form.is_valid():
                student_form.save()
                messages.success(request, "Profile updated successfully.")
                return redirect("student_settings")

        # password change
        elif "change_password" in request.POST:
            student_form = StudentUpdateForm(instance=student)
            password_form = PasswordChangeForm(request.user, request.POST)

            if password_form.is_valid():
                user = password_form.save()
                update_session_auth_hash(request, user)
                messages.success(request, "Password changed successfully.")
                return redirect("student_settings")
    else:
        student_form = StudentUpdateForm(instance=student)
        password_form = PasswordChangeForm(request.user)

    context = {
        "student": student,
        "student_form": student_form,
        "password_form": password_form,
    }
    return render(request, "main/student_settings.html", context)