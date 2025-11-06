from django.shortcuts import render
from . import models
def landing_page(request):
    return render(request, 'main/landing.html')

def signup(request):
    return render(request, 'main/signup.html')

def login_view(request):
    return render(request, 'main/login.html')

def dashboard(request):
    template = 'dashboard.html'
    return render(request, 'main/dashboard.html')

def survey(request):
    return render(request, 'main/survey.html')
