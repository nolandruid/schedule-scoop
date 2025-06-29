// CSV Export utility for schedule data
class CSVExporter {
  static exportToCSV(timetable, userInfo) {
    const headers = [
      'Course Code',
      'Section',
      'Course Name',
      'CRN',
      'Instructor',
      'Days',
      'Start Time',
      'End Time',
      'Location',
      'Start Date',
      'End Date'
    ];

    let csvContent = headers.join(',') + '\n';

    timetable.forEach(course => {
      if (course.courseCode && course.daysOfTheWeek) {
        const row = [
          this.escapeCsvField(course.courseCode || ''),
          this.escapeCsvField(course.courseSection || ''),
          this.escapeCsvField(course.courseName || ''),
          this.escapeCsvField(course.crn || ''),
          this.escapeCsvField(course.instructor || ''),
          this.escapeCsvField(course.daysOfTheWeek || ''),
          this.escapeCsvField(course.classStartTime || ''),
          this.escapeCsvField(course.classEndTime || ''),
          this.escapeCsvField(course.location || ''),
          this.escapeCsvField(course.startDate ? new Date(course.startDate).toDateString() : ''),
          this.escapeCsvField(course.endDate ? new Date(course.endDate).toDateString() : '')
        ];
        csvContent += row.join(',') + '\n';
      }
    });

    this.downloadCSV(csvContent, `${userInfo}-schedule.csv`);
  }

  static escapeCsvField(field) {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return '"' + field.replace(/"/g, '""') + '"';
    }
    return field;
  }

  static downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Make it available globally
window.CSVExporter = CSVExporter;
