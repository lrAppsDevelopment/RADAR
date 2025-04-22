Write-Host "Creating Python virtual environment..."
python -m venv venv

Write-Host "Activating virtual environment..."
.\venv\Scripts\Activate.ps1

Write-Host "Installing requirements..."
pip install -r requirements.txt

Write-Host "Setup complete! You can now run the script with:"
Write-Host "python detect_ai.py"
Write-Host ""
Write-Host "To deactivate the virtual environment when done, type:"
Write-Host "deactivate" 