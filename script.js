// Global variables
let uploadedFiles = [];
let candidates = [];
let stats = {
    uploadCount: 0,
    taskCount: 0,
    avgScore: 0
};

// API base URL - update this to match your FastAPI server
const API_BASE_URL = 'http://localhost:8000';

// DOM elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const uploadedFilesContainer = document.getElementById('uploadedFiles');
const findMatchesBtn = document.getElementById('findMatchesBtn');
const resultsSection = document.getElementById('resultsSection');
const resultsGrid = document.getElementById('resultsGrid');
const candidatesGrid = document.getElementById('candidatesGrid');
const loadingModal = document.getElementById('loadingModal');
const loadingText = document.getElementById('loadingText');

// Navigation
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
        
        // Update active nav link
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    });
});

// File upload handling
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
});

async function handleFiles(files) {
    const validFiles = files.filter(file => 
        file.type === 'application/pdf' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    if (validFiles.length === 0) {
        showNotification('Please select PDF or DOCX files only.', 'error');
        return;
    }

    showLoadingModal('Uploading resumes...');
    
    for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const progress = ((i + 1) / validFiles.length) * 100;
        
        updateProgress(progress, `Processing ${file.name}...`);
        
        try {
            await uploadResume(file);
            stats.uploadCount++;
            updateStats();
        } catch (error) {
            console.error('Upload error:', error);
            addFileItem(file.name, 'error', error.message);
        }
    }
    
    hideLoadingModal();
    updateProgress(0, '');
    loadCandidates();
    showNotification(`${validFiles.length} resume(s) processed successfully!`, 'success');
}

async function uploadResume(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/upload-resume/`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
    }

    const result = await response.json();
    addFileItem(file.name, 'success', `Employee ID: ${result.employee_id}`);
    uploadedFiles.push(result);
}

function addFileItem(fileName, status, message) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const fileIcon = status === 'success' ? 'fa-file-pdf' : 'fa-exclamation-triangle';
    const statusClass = status === 'success' ? 'status-success' : 'status-error';
    
    fileItem.innerHTML = `
        <div class="file-info">
            <i class="fas ${fileIcon}"></i>
            <div class="file-details">
                <h4>${fileName}</h4>
                <p>${message}</p>
            </div>
        </div>
        <span class="file-status ${statusClass}">${status}</span>
    `;
    
    uploadedFilesContainer.appendChild(fileItem);
}

// Task matching
findMatchesBtn.addEventListener('click', async () => {
    const taskDescription = document.getElementById('taskDescription').value.trim();
    const topN = parseInt(document.getElementById('topN').value);

    if (!taskDescription) {
        showNotification('Please enter a task description.', 'error');
        return;
    }

    if (candidates.length === 0) {
        showNotification('Please upload some resumes first.', 'error');
        return;
    }

    showLoadingModal('Finding best matches...');
    
    try {
        const matches = await findMatches(taskDescription, topN);
        displayResults(matches);
        stats.taskCount++;
        updateStats();
        showNotification('Matches found successfully!', 'success');
    } catch (error) {
        console.error('Matching error:', error);
        showNotification('Failed to find matches. Please try again.', 'error');
    }
    
    hideLoadingModal();
});

async function findMatches(taskDescription, topN) {
    const response = await fetch(`${API_BASE_URL}/find-matches/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            task_description: taskDescription,
            top_n: topN
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Matching failed');
    }

    return await response.json();
}

function displayResults(matches) {
    resultsSection.style.display = 'block';
    resultsGrid.innerHTML = '';

    if (matches.length === 0) {
        resultsGrid.innerHTML = '<p class="loading">No matches found for this task.</p>';
        return;
    }

    // Calculate average score
    const totalScore = matches.reduce((sum, match) => sum + match.performance_score, 0);
    stats.avgScore = Math.round(totalScore / matches.length);
    updateStats();

    matches.forEach((match, index) => {
        const resultCard = createResultCard(match, index + 1);
        resultsGrid.appendChild(resultCard);
    });

    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function createResultCard(match, rank) {
    const card = document.createElement('div');
    card.className = 'result-card';
    
    const profile = match.profile;
    const technicalSkills = profile.technical_skills || [];
    const softSkills = profile.soft_skills || [];
    
    card.innerHTML = `
        <div class="result-header">
            <div class="candidate-name">#${rank} ${profile.name}</div>
            <div class="score-badge">${match.performance_score}/100</div>
        </div>
        
        <div class="candidate-details">
            <div class="detail-item">
                <span class="detail-label">Experience:</span>
                <span class="detail-value">${profile.total_years_experience} years</span>
            </div>
        </div>
        
        ${technicalSkills.length > 0 ? `
            <div class="skills-section">
                <h4>Technical Skills</h4>
                <div class="skills-list">
                    ${technicalSkills.slice(0, 5).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    ${technicalSkills.length > 5 ? `<span class="skill-tag">+${technicalSkills.length - 5} more</span>` : ''}
                </div>
            </div>
        ` : ''}
        
        ${softSkills.length > 0 ? `
            <div class="skills-section">
                <h4>Soft Skills</h4>
                <div class="skills-list">
                    ${softSkills.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    ${softSkills.length > 3 ? `<span class="skill-tag">+${softSkills.length - 3} more</span>` : ''}
                </div>
            </div>
        ` : ''}
        
        <div class="justification">
            <strong>Why this match:</strong> ${match.justification}
        </div>
    `;
    
    return card;
}

// Load candidates
async function loadCandidates() {
    try {
        const response = await fetch(`${API_BASE_URL}/candidates/`);
        if (response.ok) {
            const data = await response.json();
            candidates = Object.values(data);
            displayCandidates();
        }
    } catch (error) {
        console.error('Failed to load candidates:', error);
    }
}

function displayCandidates() {
    candidatesGrid.innerHTML = '';

    if (candidates.length === 0) {
        candidatesGrid.innerHTML = '<p class="loading">No candidates uploaded yet.</p>';
        return;
    }

    candidates.forEach(candidate => {
        const candidateCard = createCandidateCard(candidate);
        candidatesGrid.appendChild(candidateCard);
    });
}

function createCandidateCard(candidate) {
    const card = document.createElement('div');
    card.className = 'candidate-card';
    
    const profile = candidate.profile;
    const technicalSkills = profile.technical_skills || [];
    const softSkills = profile.soft_skills || [];
    
    card.innerHTML = `
        <h3>${profile.name}</h3>
        <div class="candidate-summary">${profile.summary}</div>
        
        <div class="candidate-details">
            <div class="detail-item">
                <span class="detail-label">Experience:</span>
                <span class="detail-value">${profile.total_years_experience} years</span>
            </div>
        </div>
        
        ${technicalSkills.length > 0 ? `
            <div class="skills-section">
                <h4>Technical Skills</h4>
                <div class="skills-list">
                    ${technicalSkills.slice(0, 4).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    ${technicalSkills.length > 4 ? `<span class="skill-tag">+${technicalSkills.length - 4} more</span>` : ''}
                </div>
            </div>
        ` : ''}
        
        ${softSkills.length > 0 ? `
            <div class="skills-section">
                <h4>Soft Skills</h4>
                <div class="skills-list">
                    ${softSkills.slice(0, 3).map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    ${softSkills.length > 3 ? `<span class="skill-tag">+${softSkills.length - 3} more</span>` : ''}
                </div>
            </div>
        ` : ''}
    `;
    
    return card;
}

// Utility functions
function updateProgress(percentage, text) {
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = text;
    uploadProgress.style.display = percentage > 0 ? 'block' : 'none';
}

function showLoadingModal(text) {
    loadingText.textContent = text;
    loadingModal.style.display = 'flex';
}

function hideLoadingModal() {
    loadingModal.style.display = 'none';
}

function updateStats() {
    document.getElementById('uploadCount').textContent = stats.uploadCount;
    document.getElementById('taskCount').textContent = stats.taskCount;
    document.getElementById('avgScore').textContent = stats.avgScore;
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
    `;
    
    if (type === 'success') {
        notification.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)';
    }
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    loadCandidates();
    updateStats();
    
    // Add smooth scrolling for all internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

// Add some sample data for demonstration (remove in production)
function addSampleData() {
    if (candidates.length === 0) {
        const sampleCandidates = [
            {
                employee_id: "sample-1",
                profile: {
                    name: "John Smith",
                    total_years_experience: 5,
                    technical_skills: ["Python", "JavaScript", "React", "Node.js", "MongoDB"],
                    soft_skills: ["Leadership", "Communication", "Problem Solving"],
                    summary: "Senior full-stack developer with expertise in modern web technologies and team leadership."
                }
            },
            {
                employee_id: "sample-2", 
                profile: {
                    name: "Sarah Johnson",
                    total_years_experience: 3,
                    technical_skills: ["Java", "Spring Boot", "MySQL", "Docker"],
                    soft_skills: ["Collaboration", "Time Management"],
                    summary: "Backend developer specializing in Java enterprise applications and microservices architecture."
                }
            }
        ];
        
        candidates = sampleCandidates;
        displayCandidates();
        stats.uploadCount = 2;
        updateStats();
    }
}

// Uncomment the line below to add sample data for testing
// addSampleData(); 
