# Resume Matcher - Intelligent Task Assignment Platform

A modern web application that uses AI to match employee resumes with task requirements, helping employers find the best-suited candidates for specific projects.

## 🚀 Features

- **AI-Powered Resume Parsing**: Automatically extracts skills, experience, and qualifications from PDF/DOCX resumes using Google's Gemini AI
- **Intelligent Task Matching**: Analyzes task descriptions and ranks candidates based on suitability scores
- **Modern Web Interface**: Beautiful, responsive design with drag-and-drop file upload
- **Real-time Processing**: Instant feedback and progress tracking
- **Comprehensive Results**: Detailed candidate profiles with performance scores and justifications

## 🛠️ Technology Stack

- **Backend**: FastAPI (Python)
- **AI**: Google Gemini 1.5 Flash
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Document Processing**: PyMuPDF (PDF), python-docx (DOCX)
- **Styling**: Modern CSS with gradients and animations

## 📋 Prerequisites

- Python 3.8 or higher
- Google Gemini API key
- Modern web browser

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd resume-matcher
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file in the project root:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

4. **Get a Google Gemini API key**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Add it to your `.env` file

## 🚀 Running the Application

### Option 1: Run Everything Together (Recommended)
```bash
python run_server.py
```

This will:
- Start the FastAPI backend on port 8000
- Start a frontend server on a random port
- Automatically open your browser to the application

### Option 2: Run Backend and Frontend Separately

**Backend only:**
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend only:**
Open `index.html` in your browser or serve it with a local server.

## 📖 Usage Guide

### 1. Upload Resumes
- Navigate to the "Upload" section
- Drag and drop PDF or DOCX resume files
- Or click "Choose Files" to browse
- The AI will automatically parse and extract candidate information

### 2. Find Task Matches
- Go to the "Match Tasks" section
- Enter a detailed task description
- Select the number of top candidates you want
- Click "Find Matches" to get AI-recommended candidates

### 3. View Results
- See ranked candidates with performance scores (0-100)
- Review extracted skills and experience
- Read AI-generated justifications for each match

### 4. Browse All Candidates
- Visit the "Candidates" section to see all uploaded profiles
- Review parsed information and skills

## 🔌 API Endpoints

- `GET /` - Welcome message
- `POST /upload-resume/` - Upload and process a resume
- `POST /find-matches/` - Find candidates for a task
- `GET /candidates/` - Get all uploaded candidates
- `GET /docs` - Interactive API documentation

## 🎨 Customization

### Styling
- Modify `styles.css` to change the appearance
- The design uses CSS custom properties for easy theming
- Responsive design works on all device sizes

### Functionality
- Edit `script.js` to modify frontend behavior
- Update `main.py` to add new API endpoints
- Modify AI prompts in the backend for different analysis approaches

## 🔒 Security Notes

- The current setup allows CORS from all origins (`*`) for development
- In production, update the CORS settings in `main.py` to restrict origins
- Store API keys securely using environment variables
- Consider adding authentication for production use

## 🐛 Troubleshooting

### Common Issues

1. **"Failed to parse resume" error**
   - Ensure the resume file is not corrupted
   - Check that the file is in PDF or DOCX format
   - Verify your Google API key is valid

2. **Frontend can't connect to backend**
   - Ensure the backend is running on port 8000
   - Check that CORS is properly configured
   - Verify the API_BASE_URL in `script.js`

3. **Upload progress not showing**
   - Check browser console for JavaScript errors
   - Ensure all files are properly linked

### Debug Mode
Run the backend with debug logging:
```bash
uvicorn main:app --reload --log-level debug
```

## 📝 File Structure

```
resume-matcher/
├── main.py              # FastAPI backend
├── index.html           # Main frontend page
├── styles.css           # Styling and animations
├── script.js            # Frontend functionality
├── run_server.py        # Combined server runner
├── requirements.txt     # Python dependencies
├── README.md           # This file
└── .env                # Environment variables (create this)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request
   

## 🙏 Acknowledgments

- Google Gemini AI for intelligent resume parsing and matching
- FastAPI for the robust backend framework
- Font Awesome for beautiful icons
- Inter font family for modern typography

---

**Happy matching! 🎯** 
