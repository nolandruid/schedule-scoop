// Modern popup logic for Carleton Schedule Exporter
class ScheduleExporter {
  constructor() {
    this.currentTerm = { semester: '10', year: '2025' };
    this.isInitialized = false;
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadSettings();
  }

  bindEvents() {
    // Main export button
    document.getElementById('export-schedule').addEventListener('click', () => {
      this.showExportOptions();
    });

    // Term change
    document.getElementById('change-term').addEventListener('click', () => {
      this.showTermModal();
    });

    // Calendar quick imports
    document.getElementById('google-calendar').addEventListener('click', () => {
      this.exportToCalendar('google');
    });

    document.getElementById('outlook-calendar').addEventListener('click', () => {
      this.exportToCalendar('outlook');
    });

    document.getElementById('apple-calendar').addEventListener('click', () => {
      this.exportToCalendar('apple');
    });

    // Notion calendar
    document.getElementById('notion-calendar').addEventListener('click', () => {
      this.exportToCalendar('notion');
    });

    // Modal controls
    document.getElementById('close-modal').addEventListener('click', () => {
      this.hideTermModal();
    });

    document.getElementById('save-term').addEventListener('click', () => {
      this.saveTerm();
    });

    // Settings buttons
    document.getElementById('show-history').addEventListener('click', () => {
      this.showHistory();
    });

    document.getElementById('privacy-info').addEventListener('click', () => {
      this.showPrivacyInfo();
    });
  }

  loadSettings() {
    chrome.storage.local.get(['carleton'], (result) => {
      if (result.carleton && Array.isArray(result.carleton)) {
        this.currentTerm = {
          semester: result.carleton[0],
          year: result.carleton[1]
        };
      } else {
        // Set default term if none exists
        this.setDefaultTerm();
      }
      
      if (!this.isInitialized) {
        this.updateTermDisplay();
        this.isInitialized = true;
      }
    });
  }

  setDefaultTerm() {
    const currentDate = new Date();
    const month = currentDate.getMonth() + 1;
    let year = String(currentDate.getFullYear());
    let semester;

    if (month >= 1 && month <= 4) {
      semester = '10'; // Winter
    } else if (month >= 5 && month <= 8) {
      semester = '20'; // Summer
    } else {
      semester = '30'; // Fall
    }

    this.currentTerm = { semester, year };
    
    // Save default term without triggering update loop
    chrome.storage.local.set({
      carleton: [semester, year, true]
    });
  }

  updateTermDisplay() {
    const termNames = { '10': 'Winter', '20': 'Summer', '30': 'Fall' };
    const termText = `${termNames[this.currentTerm.semester] || 'Unknown'} ${this.currentTerm.year}`;
    const termElement = document.getElementById('current-term');
    
    if (termElement) {
      termElement.textContent = termText;
    }
  }

  showExportOptions() {
    const exportOptions = document.getElementById('export-options');
    const exportBtn = document.getElementById('export-schedule');
    
    if (exportOptions.style.display === 'none') {
      exportOptions.style.display = 'block';
      exportBtn.textContent = 'Start Export';
      exportBtn.innerHTML = '<i class="bx bx-play"></i> Start Export';
      exportBtn.onclick = () => this.startExport();
    }
  }

  async startExport() {
    this.showStatus('Starting export...', 'loading');
    
    try {
      // Check if user is on Carleton Central
      const tabs = await this.queryTabs();
      const carletonTab = tabs.find(tab => 
        tab.url && tab.url.includes('central.carleton.ca')
      );

      if (carletonTab) {
        this.exportFromCurrentTab();
      } else {
        this.openCarletonAndExport();
      }
    } catch (error) {
      this.showStatus('Export failed. Please try again.', 'error');
      console.error('Export error:', error);
    }
  }

  queryTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({}, resolve);
    });
  }

  exportFromCurrentTab() {
    // Store export settings
    const format = document.querySelector('input[name="format"]:checked').value;
    const combined = document.getElementById('combined-export').checked;
    
    chrome.storage.session.set({
      'timetable-requested': [true, 'carleton', 'armory/carleton-timetables.js'],
      'export-format': format,
      'export-combined': combined
    }, () => {
      this.showStatus('Navigating to schedule page...', 'loading');
      chrome.runtime.sendMessage({
        action: 'newCarletonTempTab',
        login: 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd',
        type: 'timetable'
      });
      window.close();
    });
  }

  openCarletonAndExport() {
    this.showStatus('Opening Carleton Central...', 'loading');
    chrome.tabs.create({
      url: 'https://ssoman.carleton.ca/ssomanager/c/SSB?pkg=bwskfshd.P_CrseSchd'
    }, () => {
      setTimeout(() => {
        this.exportFromCurrentTab();
      }, 2000);
    });
  }

  async exportToCalendar(provider) {
    this.showStatus(`Preparing ${provider} calendar import...`, 'loading');
    
    // First export the ICS file
    await this.startExport();
    
    // Then provide calendar-specific instructions
    setTimeout(() => {
      this.showCalendarInstructions(provider);
    }, 3000);
  }

  showCalendarInstructions(provider) {
    const instructions = {
      google: {
        title: 'Google Calendar Import',
        steps: [
          '1. Open Google Calendar',
          '2. Click the "+" next to "Other calendars"',
          '3. Select "Import"',
          '4. Choose the downloaded .ics file',
          '5. Select your preferred calendar'
        ],
        url: 'https://calendar.google.com/calendar/u/0/r/settings/export'
      },
      outlook: {
        title: 'Outlook Import',
        steps: [
          '1. Open Outlook Calendar',
          '2. Go to File > Import/Export',
          '3. Choose "Import an iCalendar (.ics) file"',
          '4. Select the downloaded file',
          '5. Choose import options'
        ],
        url: 'https://outlook.live.com/calendar/'
      },
      apple: {
        title: 'Apple Calendar Import',
        steps: [
          '1. Double-click the downloaded .ics file',
          '2. Choose which calendar to add events to',
          '3. Click "Import"',
          'Or drag the file into Calendar app'
        ],
        url: null
      },
      notion: {
        title: 'Notion Calendar Import',
        steps: [
          '1. Open Notion Calendar (cron.com)',
          '2. Click Settings (gear icon)',
          '3. Go to "Import & Export"',
          '4. Select "Import from file"',
          '5. Choose the downloaded .ics file',
          '6. Select which calendar to import to'
        ],
        url: 'https://cron.com'
      }
    };

    const info = instructions[provider];
    this.showStatus(`${info.title} ready! Check Downloads folder for .ics file.`, 'success');
    
    if (info.url) {
      chrome.tabs.create({ url: info.url });
    }
  }

  showTermModal() {
    const modal = document.getElementById('term-modal');
    const semesterSelect = document.getElementById('semester-select');
    const yearSelect = document.getElementById('year-select');
    
    if (semesterSelect && yearSelect) {
      semesterSelect.value = this.currentTerm.semester;
      yearSelect.value = this.currentTerm.year;
      modal.style.display = 'flex';
    } else {
      console.error('Term selector elements not found');
    }
  }

  hideTermModal() {
    const modal = document.getElementById('term-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  saveTerm() {
    const semesterSelect = document.getElementById('semester-select');
    const yearSelect = document.getElementById('year-select');
    
    if (!semesterSelect || !yearSelect) {
      console.error('Term selector elements not found');
      return;
    }
    
    const semester = semesterSelect.value;
    const year = yearSelect.value;
    
    // Update current term
    this.currentTerm = { semester, year };
    
    // Save to storage
    chrome.storage.local.set({
      carleton: [semester, year, true]
    }, () => {
      this.updateTermDisplay();
      this.hideTermModal();
      this.showStatus('Term updated successfully!', 'success');
    });
  }

  showHistory() {
    chrome.storage.local.get(['export_history'], (result) => {
      const history = result.export_history || [];
      
      if (history.length === 0) {
        this.showStatus('No export history found.', 'error');
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

  showPrivacyInfo() {
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

  showStatus(message, type) {
    const statusSection = document.getElementById('status-section');
    const statusMessage = document.getElementById('status-message');
    
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ScheduleExporter();
});

// Handle messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'export-complete') {
    const exporter = new ScheduleExporter();
    exporter.showStatus('Export completed! Check your Downloads folder.', 'success');
  }
});
