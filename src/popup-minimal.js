// Ultra-simple script with NO storage listeners
let currentTerm = { semester: '10', year: '2025' };

// Load initial term
chrome.storage.local.get(['carleton'], (result) => {
  if (result.carleton) {
    currentTerm.semester = result.carleton[0] || '10';
    currentTerm.year = result.carleton[1] || '2025';
  }
  updateDisplay();
});

function updateDisplay() {
  const terms = { '10': 'Winter', '20': 'Summer', '30': 'Fall' };
  const text = `${terms[currentTerm.semester]} ${currentTerm.year}`;
  document.getElementById('current-term').textContent = text;
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  // Export button
  document.getElementById('export-btn').onclick = function() {
    chrome.storage.session.set({
      'timetable-requested': [true, 'carleton', 'armory/carleton-timetables.js']
    });
    
    chrome.runtime.sendMessage({
      action: 'newCarletonTempTab',
      login: 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd',
      type: 'timetable'
    });
    
    window.close();
  };

  // Change term button
  document.getElementById('change-term-btn').onclick = function() {
    document.getElementById('semester-select').value = currentTerm.semester;
    document.getElementById('year-select').value = currentTerm.year;
    document.getElementById('term-modal').style.display = 'flex';
  };

  // Close modal
  document.getElementById('close-modal-btn').onclick = function() {
    document.getElementById('term-modal').style.display = 'none';
  };

  // Close modal when clicking outside
  document.getElementById('term-modal').onclick = function(e) {
    if (e.target.id === 'term-modal') {
      document.getElementById('term-modal').style.display = 'none';
    }
  };

  // Save term
  document.getElementById('save-term-btn').onclick = function() {
    const newSemester = document.getElementById('semester-select').value;
    const newYear = document.getElementById('year-select').value;
    
    currentTerm.semester = newSemester;
    currentTerm.year = newYear;
    
    chrome.storage.local.set({
      carleton: [currentTerm.semester, currentTerm.year, true]
    }, function() {
      updateDisplay();
      document.getElementById('term-modal').style.display = 'none';
    });
  };

  // Calendar buttons
  document.getElementById('google-btn').onclick = () => {
    document.getElementById('export-btn').click();
    setTimeout(() => {
      chrome.tabs.create({ url: 'https://calendar.google.com' });
    }, 2000);
  };

  document.getElementById('outlook-btn').onclick = () => {
    document.getElementById('export-btn').click();
    setTimeout(() => {
      chrome.tabs.create({ url: 'https://outlook.live.com/calendar/' });
    }, 2000);
  };

  document.getElementById('apple-btn').onclick = () => {
    document.getElementById('export-btn').click();
  };

  document.getElementById('notion-btn').onclick = () => {
    document.getElementById('export-btn').click();
    setTimeout(() => {
      chrome.tabs.create({ url: 'https://cron.com' });
    }, 2000);
  };
});
