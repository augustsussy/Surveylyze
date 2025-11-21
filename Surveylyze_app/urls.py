from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing_page, name='landing'),
    path('login/', views.login_view, name='login'),
    path('signup/', views.addStudentForm, name='addStudentForm'),
    path('savesignup/', views.saveSignUp, name='savesignup'),
    path('logout/', views.logout_view, name='logout'),

    # Student routes
    path('dashboard/', views.dashboard, name='dashboard'),
    path('survey/<int:survey_id>/', views.take_survey, name='take_survey'),
    path('response-history/<int:history_id>/', views.response_history, name='response_history'),

    # Teacher/Admin routes
    path('analytics-admin/', views.analytics_admin, name='analytics_admin'),
    path('survey-builder/', views.survey_builder, name='survey_builder'),
    path('my-surveys/', views.my_surveys, name='my_surveys'),
    path('delete-survey/<int:survey_id>/', views.delete_survey, name='delete_survey'),
    path('admin-responses/', views.admin_responses, name='admin_responses'),
]