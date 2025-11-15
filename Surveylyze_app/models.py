from django.db import models
from django.contrib.auth.models import User






class Teacher(models.Model):
    teacher_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')

    lastname = models.CharField(max_length=50)
    firstname = models.CharField(max_length=50)
    middlename = models.CharField(max_length=50, blank=True, null=True)
    email_address = models.EmailField(unique=True)



class Student(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="student_profile")
    student_id = models.AutoField(primary_key=True, name='student_id')
    lastname = models.CharField(max_length=50, name='lastname')
    firstname = models.CharField(max_length=50, name='firstname')
    middlename = models.CharField(max_length=50, blank=True, null=True, name='middlename')
    class_section = models.ForeignKey(
        "ClassSection", on_delete=models.PROTECT, related_name="students"
    )

class ClassSection(models.Model):
    class_id = models.CharField(max_length=50, primary_key=True,name='class_id')
    class_name = models.CharField(max_length=50,name='class_name')
    year_level = models.IntegerField(name='year_level')

class Survey(models.Model):
    survey_id = models.AutoField(primary_key=True)
    teacher = models.ForeignKey(
        "Teacher", on_delete=models.CASCADE, related_name="surveys"
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('published', 'Published'),
        ('closed', 'Closed'),
    ], default='draft')
    created_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(blank=True, null=True)


class Question(models.Model):
    question_id = models.AutoField(primary_key=True)
    survey = models.ForeignKey(
        Survey,
        on_delete=models.CASCADE,
        related_name="questions"
    )
    question = models.TextField()
    question_type = models.CharField(
        max_length=20,
        choices=[
            ("mcq", "Multiple Choice"),
            ("likert", "Likert Scale"),
            ("short_answer", "Short Answer"),
        ],
    )
    order_number = models.PositiveIntegerField(default=1)

class SurveyAssignment(models.Model):
    assignment_id = models.AutoField(primary_key=True)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="assignments")
    class_section = models.ForeignKey(ClassSection, on_delete=models.CASCADE, related_name="survey_assignments")

class Option(models.Model):
    option_id = models.AutoField(primary_key=True)
    question = models.ForeignKey(
        Question,
        on_delete=models.CASCADE,
        related_name="options"
    )
    option_text = models.CharField(max_length=255)

class SurveyHistory(models.Model):
    history_id = models.AutoField(primary_key=True)
    survey = models.ForeignKey(Survey, on_delete=models.CASCADE, related_name="history_records")
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="survey_attempts")
    duration = models.IntegerField(null=True, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("survey", "student")
        ordering = ["-submitted_at"]

class StudentAnswer(models.Model):
    answer_id = models.AutoField(primary_key=True)
    history = models.ForeignKey("SurveyHistory", on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey("Question", on_delete=models.CASCADE, related_name="student_answers")
    choice_id = models.IntegerField(null=True, blank=True)
    likert_value = models.IntegerField(null=True, blank=True)
    shortanswer_text = models.TextField(null=True, blank=True)