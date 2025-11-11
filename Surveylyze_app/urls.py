from django.urls import path
from . import views

urlpatterns = [
    path('', views.landing_page, name='landing'),

    path('login/', views.login_view, name='login'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('survey/', views.survey, name='survey'),
    path('signup/', views.addStudentForm, name='addStudentForm'),
    path('savesignup/',views.saveSignUp, name='savesignup'),
path('logout/', views.logout_view, name='logout'),

]
