// Simplified popup logic for Carleton Schedule Exporter - No loops!
document.addEventListener('DOMContentLoaded', () => {
  let currentTerm = { semester: '10', year: '2025' };
  
  // Load saved term
  chrome.storage.local.get(['carleton'], (result) => {
    if (result.carleton && Array.isArray(result.carleton)) {
      currentTerm = {
        semester: result.carleton[0] || '10',
        year: result.carleton[1] || '2025'
      };
    }
    updateTermDisplay();
  });

  function updateTermDisplay() {
    const termNames = { '10': 'Winter', '20': 'Summer', '30': 'Fall' };
    const termText = `${termNames[currentTerm.semester] || 'Unknown'} ${currentTerm.year}`;
    const termElement = document.getElementById('current-term');
    if (termElement) {
      termElement.textContent = termText;
    }
  }

  // Export button
  document.getElementById('export-schedule')?.addEventListener('click', showExportOptions);

  function showExportOptions() {
    const exportOptions = document.getElementById('export-options');
    const exportBtn = document.getElementById('export-schedule');
    
    if (exportOptions && exportBtn) {
      if (exportOptions.style.display === 'none' || !exportOptions.style.display) {
        exportOptions.style.display = 'block';
        exportBtn.innerHTML = '<i class="bx bx-play"></i> Start Export';
        exportBtn.onclick = startExport;
      }
    }
  }

  function startExport() {
    showStatus('Starting export...', 'loading');
    
    // Get export settings
    const formatElement = document.querySelector('input[name="format"]:checked');
    const combinedElement = document.getElementById('combined-export');
    
    const format = formatElement ? formatElement.value : 'ics';
    const combined = combinedElement ? combinedElement.checked : true;
    
    // Store export settings and start
    chrome.storage.session.set({
      'timetable-requested': [true, 'carleton', 'armory/carleton-timetables.js'],
      'export-format': format,
      'export-combined': combined
    }, () => {
      showStatus('Opening Carleton Central...', 'loading');
      chrome.runtime.sendMessage({
        action: 'newCarletonTempTab',
        login: 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd',
        type: 'timetable'
      });
      setTimeout(() => window.close(), 1000);
    });
  }

  // Term change button
  document.getElementById('change-term')?.addEventListener('click', showTermModal);

  function showTermModal() {
    const modal = document.getElementById('term-modal');
    const semesterSelect = document.getElementById('semester-select');
    const yearSelect = document.getElementById('year-select');
    
    if (semesterSelect && yearSelect && modal) {
      semesterSelect.value = currentTerm.semester;
      yearSelect.value = currentTerm.year;
      modal.style.display = 'flex';
    }
  }

  // Modal controls
  document.getElementById('close-modal')?.addEventListener('click', hideTermModal);
  document.getElementById('save-term')?.addEventListener('click', saveTerm);
  
  // Close modal when clicking outside
  document.getElementById('term-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'term-modal') {
      hideTermModal();
    }
  });

  function hideTermModal() {
    const modal = document.getElementById('term-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function saveTerm() {
    const semesterSelect = document.getElementById('semester-select');
    const yearSelect = document.getElementById('year-select');
    
    if (semesterSelect && yearSelect) {
      const semester = semesterSelect.value;
      const year = yearSelect.value;
      
      currentTerm = { semester, year };
      
      chrome.storage.local.set({
        carleton: [semester, year, true]
      }, () => {
        updateTermDisplay();
        hideTermModal();
        showStatus('Term updated successfully!', 'success');
      });
    }
  }

  // Calendar buttons
  document.getElementById('google-calendar')?.addEventListener('click', () => exportToCalendar('google'));
  document.getElementById('outlook-calendar')?.addEventListener('click', () => exportToCalendar('outlook'));
  document.getElementById('apple-calendar')?.addEventListener('click', () => exportToCalendar('apple'));
  document.getElementById('notion-calendar')?.addEventListener('click', () => exportToCalendar('notion'));

  function exportToCalendar(provider) {
    showStatus(`Preparing ${provider} calendar import...`, 'loading');
    
    // Start export first
    startExport();
    
    // Then show calendar-specific instructions
    setTimeout(() => {
      showCalendarInstructions(provider);
    }, 3000);
  }

  function showCalendarInstructions(provider) {
    const instructions = {
      google: {
        title: 'Google Calendar Import',
        url: 'https://calendar.google.com/calendar/u/0/r/settings/export'
      },
      outlook: {
        title: 'Outlook Import',
        url: 'https://outlook.live.com/calendar/'
      },
      apple: {
        title: 'Apple Calendar Import',
        url: null
      },
      notion: {
        title: 'Notion Calendar Import',
        url: 'https://cron.com'
      }
    };

    const info = instructions[provider];
    showStatus(`${info.title} ready! Check Downloads folder for .ics file.`, 'success');
    
    if (info.url) {
      chrome.tabs.create({ url: info.url });
    }
  }

  // Settings buttons
  document.getElementById('show-history')?.addEventListener('click', showHistory);
  document.getElementById('privacy-info')?.addEventListener('click', showPrivacyInfo);

  function showHistory() {
    chrome.storage.local.get(['export_history'], (result) => {
      const history = result.export_history || [];
      
      if (history.length === 0) {
        showStatus('No export history found.', 'error');
        return;
      }

      let historyText = 'Recent Exports:\n';
      history.forEach((record, index) => {
        const date = new Date(record.timestamp).toLocaleDateString();
        historyText += `${index + 1}. ${record.term} - ${date} (${record.course_count} courses)\n`;
      });

      alert(historyText);
    });
  }

  function showPrivacyInfo() {
    const privacyText = `🔒 Privacy First Approach

✅ What we do:
• Process your schedule locally in your browser
• Store preferences on your device only
• Export files directly to your Downloads

❌ What we DON'T do:
• Send your data to any servers
• Track your personal information
• Store your passwords or login details
• Share data with third parties

Your schedule data never leaves your device!`;

    alert(privacyText);
  }

  function showStatus(message, type) {
    const statusSection = document.getElementById('status-section');
    const statusMessage = document.getElementById('status-message');
    
    if (statusSection && statusMessage) {
      statusSection.className = `status-section ${type}`;
      statusMessage.textContent = message;
      statusSection.style.display = 'block';

      if (type === 'success' || type === 'error') {
        setTimeout(() => {
          statusSection.style.display = 'none';
        }, 5000);
      }
    }
  }
});

// Handle messages from background script
chrome.runtime?.onMessage?.addListener((message, sender, sendResponse) => {
  if (message.action === 'export-complete') {
    const statusSection = document.getElementById('status-section');
    const statusMessage = document.getElementById('status-message');
    
    if (statusSection && statusMessage) {
      statusSection.className = 'status-section success';
      statusMessage.textContent = 'Export completed! Check your Downloads folder.';
      statusSection.style.display = 'block';
    }
  }
});
