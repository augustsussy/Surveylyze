from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, UniqueConstraint

User = settings.AUTH_USER_MODEL  # usually "auth.User" or your custom user


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# -----------------------------
# People & Classes
# -----------------------------

class Teacher(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="teacher_profile")

    def __str__(self):
        return f"Teacher: {self.user.get_full_name() or self.user.username}"


class ClassSection(TimeStampedModel):
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=32, unique=True)

    def __str__(self):
        return f"{self.code} — {self.name}"


class Student(TimeStampedModel):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    # 0..1: allow temporarily unassigned students
    class_section = models.ForeignKey(
        ClassSection,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="students"
    )

    def __str__(self):
        return f"Student: {self.user.get_full_name() or self.user.username}"


# -----------------------------
# Surveys & Assignments
# -----------------------------

class Survey(TimeStampedModel):
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name="surveys")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_published = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=["teacher", "is_published"])]

    def __str__(self):
        return self.title


class SurveyAssignment(TimeStampedModel):
    """Bridge: Survey ↔ ClassSection (many-to-many via through)"""
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="assignments")
    class_section = models.ForeignKey(ClassSection, on_delete=models.CASCADE, related_name="survey_assignments")
    assigned_at = models.DateTimeField(auto_now_add=True)
    due_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("survey", "class_section")]
        indexes = [
            models.Index(fields=["survey", "class_section"]),
            models.Index(fields=["class_section", "due_at"]),
        ]

    def __str__(self):
        return f"{self.survey} → {self.class_section}"


# -----------------------------
# Questions (with subtypes)
# -----------------------------

class Question(TimeStampedModel):
    class QuestionType(models.TextChoices):
        MCQ = "MCQ", "Multiple Choice"
        LIKERT = "LIKERT", "Likert"
        SHORT = "SHORT", "Short Answer"

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    question_type = models.CharField(max_length=12, choices=QuestionType.choices)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ["survey_id", "order", "id"]
        unique_together = [("survey", "order")]

    def __str__(self):
        return f"[{self.question_type}] Q{self.order}: {self.text[:60]}"


class MCQOption(TimeStampedModel):
    """Options for MCQ questions."""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="mcq_options")
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)  # optional; can be used for auto-grading

    class Meta:
        indexes = [models.Index(fields=["question"])]

    def __str__(self):
        return f"Option({self.question_id}): {self.text[:40]}"


class LikertQuestion(TimeStampedModel):
    """Subtype settings for Likert questions."""
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name="likert")
    scale_min = models.IntegerField(default=1)
    scale_max = models.IntegerField(default=5)
    step = models.IntegerField(default=1)

    def clean(self):
        if self.question.question_type != Question.QuestionType.LIKERT:
            raise ValidationError("Likert settings must attach to a LIKERT question.")
        if self.scale_min >= self.scale_max:
            raise ValidationError("scale_min must be < scale_max.")
        if self.step <= 0:
            raise ValidationError("step must be positive.")

    def __str__(self):
        return f"Likert[{self.scale_min}-{self.scale_max} step {self.step}] for Q{self.question_id}"


class ShortAnswerQuestion(TimeStampedModel):
    """Subtype settings for Short Answer questions."""
    question = models.OneToOneField(Question, on_delete=models.CASCADE, related_name="short_answer")
    max_length = models.PositiveIntegerField(default=500)

    def clean(self):
        if self.question.question_type != Question.QuestionType.SHORT:
            raise ValidationError("ShortAnswer settings must attach to a SHORT question.")

    def __str__(self):
        return f"Short(max {self.max_length}) for Q{self.question_id}"


# -----------------------------
# Taking Surveys
# -----------------------------

class SurveyHistory(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft / In progress"
        SUBMITTED = "SUBMITTED", "Submitted"

    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="histories")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="histories")
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)

    class Meta:
        indexes = [
            models.Index(fields=["survey", "student"]),
            models.Index(fields=["status", "submitted_at"]),
        ]
        # One submitted attempt per student per survey; drafts allowed in parallel if you want.
        constraints = [
            UniqueConstraint(
                fields=["survey", "student"],
                condition=Q(status="SUBMITTED"),
                name="uq_one_submitted_attempt_per_student_survey",
            )
        ]

    def __str__(self):
        return f"History({self.student_id} ↔ {self.survey_id}) [{self.status}]"


class StudentAnswer(TimeStampedModel):
    """Answers per (SurveyHistory, Question). Exactly one value kind must be set."""
    history = models.ForeignKey(SurveyHistory, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")

    # One-of-three payloads:
    mcq_option = models.ForeignKey(MCQOption, on_delete=models.SET_NULL, null=True, blank=True, related_name="answers")
    likert_value = models.IntegerField(null=True, blank=True)
    short_text = models.TextField(null=True, blank=True)

    class Meta:
        unique_together = [("history", "question")]  # one answer per question per submission
        constraints = [
            # Ensure exactly one of the three is populated
            models.CheckConstraint(
                name="answer_exactly_one_value",
                check=(
                    # mcq only
                    (Q(mcq_option__isnull=False) & Q(likert_value__isnull=True) & Q(short_text__isnull=True))
                    |
                    # likert only
                    (Q(mcq_option__isnull=True) & Q(likert_value__isnull=False) & Q(short_text__isnull=True))
                    |
                    # short only
                    (Q(mcq_option__isnull=True) & Q(likert_value__isnull=True) & Q(short_text__isnull=False))
                ),
            ),
        ]

    def clean(self):
        """App-level guardrails that are hard to guarantee with pure DB constraints."""
        qt = self.question.question_type

        # Enforce payload matches question type
        if qt == Question.QuestionType.MCQ:
            if not self.mcq_option or self.likert_value is not None or self.short_text:
                raise ValidationError("MCQ answer must set mcq_option only.")
            # Ensure the option belongs to the same question
            if self.mcq_option.question_id != self.question_id:
                raise ValidationError("Selected MCQ option does not belong to this question.")

        elif qt == Question.QuestionType.LIKERT:
            if self.mcq_option or self.short_text:
                raise ValidationError("Likert answer must set likert_value only.")
            # ensure value fits configured scale, if exists
            lk = getattr(self.question, "likert", None)
            if lk:
                if self.likert_value is None:
                    raise ValidationError("Likert answer requires likert_value.")
                if not (lk.scale_min <= self.likert_value <= lk.scale_max):
                    raise ValidationError(f"Likert value must be between {lk.scale_min} and {lk.scale_max}.")
                # optional step check
                if ((self.likert_value - lk.scale_min) % lk.step) != 0:
                    raise ValidationError(f"Likert value must advance by step={lk.step} from {lk.scale_min}.")

        elif qt == Question.QuestionType.SHORT:
            if self.mcq_option or self.likert_value is not None:
                raise ValidationError("Short answer must set short_text only.")
            sa = getattr(self.question, "short_answer", None)
            if sa and self.short_text and len(self.short_text) > sa.max_length:
                raise ValidationError(f"Short answer exceeds max length of {sa.max_length}.")

    def __str__(self):
        return f"Ans(h={self.history_id}, q={self.question_id})"
    