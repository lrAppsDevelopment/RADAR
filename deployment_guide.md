# Reddit AI Content Filter - Deployment Guide

This guide will help you set up and deploy the Reddit AI Content Filter system, which automatically detects and filters AI-generated content on Reddit.

## System Components

1. **Backend Server**: Hosts the RADAR AI detection model and API
2. **Chrome Extension**: Identifies Reddit posts and filters AI content

## Setup Instructions

### 1. Server Setup

#### Local Development

1. Install Python 3.9+ and pip
2. Install the required packages:
   ```
   pip install -r server_requirements.txt
   ```
3. Run the server:
   ```
   python server.py
   ```
   
This will start the server on `http://localhost:5000`.

#### Production Deployment

For a production server, you'll want to deploy the API using a proper hosting solution:

**Option 1: Virtual Private Server (VPS)**
1. Set up a VPS with Ubuntu/Debian
2. Install Python and dependencies
3. Use Gunicorn and Nginx to serve the Flask app:
   ```
   gunicorn -w 2 -b 127.0.0.1:8000 server:app
   ```
4. Configure Nginx as a reverse proxy

**Option 2: Cloud Services**
- Deploy to Heroku, AWS, Google Cloud, or Azure
- Follow their respective Python app deployment guides
- Ensure you have enough RAM for the RADAR model (at least 4GB)

### 2. Chrome Extension Setup

#### Development Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked" and select the `extension` folder
4. The extension should now appear in your extensions list

#### Configuration

1. Click the extension icon to open the popup
2. Enter your server's API endpoint (e.g., `https://your-domain.com/detect` for production)
3. Adjust the AI detection threshold as needed
4. Click "Save Settings"

## Usage

1. Navigate to Reddit
2. The extension will automatically scan posts for AI-generated content
3. AI-generated posts will be hidden and replaced with a placeholder
4. You can click "Show anyway" to view filtered content

## Troubleshooting

### Server Issues
- Check that the server is running and accessible
- Verify that the RADAR model loaded correctly
- Check for any Python errors in the console output

### Extension Issues
- Make sure the API endpoint is correctly configured
- Check the browser console for any JavaScript errors
- Try refreshing the Reddit page after changing settings

## Performance Considerations

1. **Server Resource Usage**
   - The RADAR model requires approximately 1.5GB of RAM
   - Processing each request takes ~1-2 seconds on CPU (faster on GPU)
   
2. **Scaling Considerations**
   - For high traffic, consider setting up multiple server instances
   - Implement caching to avoid re-checking the same posts

## Privacy Note

The extension sends post text to your server for analysis. Ensure your server is secure and consider adding privacy notices to inform users.

## Support and Feedback

If you encounter issues or have suggestions for improvement, please [create an issue](https://github.com/yourusername/reddit-ai-filter/issues) on our GitHub repository. 