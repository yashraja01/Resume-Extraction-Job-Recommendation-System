import os
import uuid
import json
from dotenv import load_dotenv

import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# --- Document Parsers ---
import fitz  # PyMuPDF
from docx import Document

# --- Configuration ---
# Load environment variables from .env file
load_dotenv()

# Configure the Gemini API
api_key = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=api_key)

# Initialize the Gemini model
# Using flash for speed and cost-effectiveness. Use 'gemini-pro' for higher quality.
model = genai.GenerativeModel('gemini-1.5-flash-latest')

# --- In-Memory Database ---
# For a real application, use a proper database like PostgreSQL or MongoDB.
CANDIDATE_DB = {}

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Intelligent Employee Matcher API",
    description="Upload resumes and find the best employees for a given task using Gemini.",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models for API Data Validation ---
class TaskRequest(BaseModel):
    task_description: str = Field(..., min_length=20, example="We need a senior Python developer to build a data processing pipeline using Pandas and AWS S3.")
    top_n: int = Field(5, gt=0, le=20, example=5)

class CandidateProfile(BaseModel):
    name: str
    total_years_experience: int
    technical_skills: list[str]
    soft_skills: list[str]
    summary: str

class MatchResult(BaseModel):
    employee_id: str
    profile: CandidateProfile
    performance_score: int = Field(..., description="Score from 0-100 indicating match quality.")
    justification: str = Field(..., description="Gemini's reasoning for the score.")


# --- Helper Functions ---

def parse_document_text(file: UploadFile) -> str:
    """Extracts text content from uploaded PDF or DOCX file."""
    content_type = file.content_type
    file_content = file.file.read()

    if content_type == "application/pdf":
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = "".join(page.get_text() for page in doc)
        doc.close()
        return text
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        # The file content is already in bytes, so we need to wrap it in a file-like object
        import io
        doc = Document(io.BytesIO(file_content))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}. Please upload a PDF or DOCX.")


def process_resume_with_gemini(resume_text: str) -> dict:
    """Uses Gemini to parse resume text and extract structured data."""
    prompt = f"""
    You are an expert HR recruitment assistant. Your task is to analyze the following resume text and extract key information in a structured JSON format.

    The JSON object MUST have the following keys:
    - "name": The full name of the candidate.
    - "total_years_experience": An integer representing the total years of professional experience. Estimate if not explicitly stated.
    - "technical_skills": A list of key technical skills, technologies, and programming languages.
    - "soft_skills": A list of key soft skills like 'communication', 'teamwork', etc.
    - "summary": A concise 2-3 sentence summary of the candidate's professional profile.

    If a value cannot be found, use null or an empty list.
    Ensure your entire response is ONLY the raw JSON object, without any surrounding text or markdown.

    Resume Text:
    ---
    {resume_text}
    ---
    """
    try:
        response = model.generate_content(prompt)
        # Clean up the response to ensure it's valid JSON
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(cleaned_response)
    except (json.JSONDecodeError, Exception) as e:
        print(f"Error processing resume with Gemini: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse resume using AI. The resume format might be too complex or the AI model returned an invalid response.")


def find_matches_with_gemini(task_description: str, candidates: list[dict]) -> list[dict]:
    """Uses Gemini to score and rank candidates based on a task description."""
    if not candidates:
        return []

    candidates_json_string = json.dumps(candidates, indent=2)

    prompt = f"""
    You are a senior hiring manager. Your goal is to evaluate a list of candidates for a specific task and provide a ranked list of the best fits.

    THE TASK:
    ---
    {task_description}
    ---

    THE CANDIDATES (in JSON format):
    ---
    {candidates_json_string}
    ---

    INSTRUCTIONS:
    1.  Carefully analyze each candidate's profile against the requirements of THE TASK.
    2.  For each candidate, provide a "performance_score" from 0 to 100, where 100 is a perfect match. Consider skills, experience, and overall profile.
    3.  Provide a brief "justification" (1-2 sentences) explaining your reasoning for the score.
    4.  Your final output MUST be a valid JSON list of objects. Each object must contain "employee_id", "performance_score", and "justification".
    5.  The list must be sorted in descending order based on the "performance_score".
    6.  Ensure your entire response is ONLY the raw JSON list, without any surrounding text or markdown.
    """
    try:
        response = model.generate_content(prompt)
        cleaned_response = response.text.strip().replace("```json", "").replace("```", "")
        ranked_list = json.loads(cleaned_response)
        return ranked_list
    except (json.JSONDecodeError, Exception) as e:
        print(f"Error matching with Gemini: {e}")
        raise HTTPException(status_code=500, detail="Failed to score candidates using AI. The task or profiles may be ambiguous, or the AI model returned an invalid response.")


# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the Intelligent Employee Matcher API!"}


@app.post("/upload-resume/", status_code=201)
async def upload_resume(file: UploadFile = File(...)):
    """
    Upload a resume (PDF or DOCX), process it with Gemini, and store the profile.
    """
    # 1. Parse text from the document
    raw_text = parse_document_text(file)
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="The uploaded document appears to be empty or could not be read.")

    # 2. Process with Gemini to get structured data
    profile_data = process_resume_with_gemini(raw_text)

    # 3. Store in our "database"
    employee_id = str(uuid.uuid4())
    CANDIDATE_DB[employee_id] = {
        "employee_id": employee_id,
        "profile": profile_data
    }

    return {"message": "Resume processed and candidate profile created.", "employee_id": employee_id, "profile": profile_data}


@app.post("/find-matches/", response_model=list[MatchResult])
async def find_matches(request: TaskRequest):
    """
    Provide a task description to find and rank the best-suited employees.
    """
    if not CANDIDATE_DB:
        return []

    # Prepare candidate list for the prompt
    candidate_list_for_prompt = list(CANDIDATE_DB.values())

    # Get ranked list from Gemini
    ranked_results = find_matches_with_gemini(request.task_description, candidate_list_for_prompt)

    # Combine Gemini's ranking with the full profile data from our DB
    final_results = []
    for result in ranked_results:
        employee_id = result.get("employee_id")
        if employee_id in CANDIDATE_DB:
            full_profile = CANDIDATE_DB[employee_id]["profile"]
            final_results.append({
                "employee_id": employee_id,
                "profile": full_profile,
                "performance_score": result.get("performance_score"),
                "justification": result.get("justification")
            })

    # Return the top N results
    return final_results[:request.top_n]


@app.get("/candidates/")
def get_all_candidates():
    """Returns all processed candidates currently in the database."""
    return CANDIDATE_DB
