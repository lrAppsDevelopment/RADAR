@echo off
echo Creating Python virtual environment...
python -m venv venv

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing requirements...
pip install -r requirements.txt

echo Setup complete! You can now run the script with:
echo python detect_ai.py
echo.
echo To deactivate the virtual environment when done, type:
echo deactivate 