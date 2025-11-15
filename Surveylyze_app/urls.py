from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing_page, name='landing'),

    path('login/', views.login_view, name='login'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('survey/<int:survey_id>/', views.take_survey, name='take_survey'),
    path('signup/', views.addStudentForm, name='addStudentForm'),
    path('savesignup/',views.saveSignUp, name='savesignup'),
path('logout/', views.logout_view, name='logout'),
path('analyticsadmin/', views.analytics_admin, name='analytics_admin'),
path('surveybuilder/', views.surveybuilder, name='surveybuilder'),
    path("survey-builder/", views.survey_builder, name="survey_builder"),
path("survey/<int:survey_id>/", views.take_survey, name="take_survey"),

]
