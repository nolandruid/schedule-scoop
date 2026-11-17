# ScheduleScoop

A Chrome extension that helps Carleton University students easily export their course timetables to popular calendar services.

## Features

- **Multiple Calendar Support**: Export directly to Google Calendar, Outlook or download as ICS files
- **Smart Course Detection**: Automatically handles lectures, tutorials, and labs with proper scheduling
- **Weekly or Biweekly Labs**: Choose whether labs repeat every week or every 2 weeks
- **Tutorial/Lab Week Adjustment**: Tutorials and labs start in the second week of term
- **Reading Week and Holidays Skipped**: No classes are added on reading week or statutory holidays
- **Live Progress**: A status card on Carleton Central shows each step and the result
- **Duplicate Warning**: Exporting the same term to the same calendar twice asks before adding duplicates
- **Term Selection**: Support for Winter, Summer, and Fall terms
- **Light and Dark Mode**: Follows your system setting

## Installation

1. Download the extension from the Chrome Web Store
2. Click "Add to Chrome" to install
3. The extension icon will appear in your browser toolbar

## How to Use

### Step 1: Configure Your Export
1. Click the Schedule Scoop extension icon in your toolbar
2. **Select Term**: Choose your term (Winter/Summer/Fall) and year
3. **Labs**: Choose "Every week" or "Every 2 weeks"
4. **Select Calendar**: Choose your preferred calendar service:
   - **Google Calendar**: Direct integration (requires Google account)
   - **Outlook**: Direct integration (requires personal Microsoft account. cmail not supported)
   - **ICS File**: Standard calendar file for any calendar app

### Step 2: Export Your Timetable
1. Click **Export**. ScheduleScoop opens Carleton Central (sign in if asked)
2. Watch the status card in the bottom-right corner of the Carleton tab
3. Follow any sign-in prompt for Google or Outlook
4. The card tells you when your classes are in your calendar, or what went wrong

## Calendar Integration Details

### Google Calendar
- **Direct Integration**: Events are created directly in your Google Calendar
- **Authentication**: Uses secure OAuth2 flow
- **No Downloads**: Everything happens automatically

### Outlook Calendar
- **Direct Integration**: Events are created via Microsoft Graph API
- **Authentication**: Uses Microsoft OAuth2 flow
- **Batch Processing**: All events are created efficiently

### ICS File
- **Universal Format**: Works with any calendar application
- **Manual Import**: Download and import into your preferred calendar app

## Course Scheduling Logic

### Lectures
- Start in the first week of term
- Weekly recurrence throughout the semester

### Tutorials
- Start in the **second week** of term
- Weekly recurrence from the second week onward

### Labs
- Start in the **second week** of term
- **Biweekly recurrence** (every other week) by default, or weekly if you pick "Every week"

### Skipped days
- Reading week (Winter: the Family Day week; Fall: Carleton's fall break)
- Statutory holidays during the term: Labour Day, Thanksgiving, Good Friday, Victoria Day, Canada Day and the Civic Holiday

## Development

- `npm install`, then `npm test` runs the unit tests (Node's built-in test runner)
- `tests/manual/popup-preview.html` and `tests/manual/status-card.html` preview the popup and status card in a normal browser tab (serve the repo root, e.g. `python3 -m http.server`)
- Saved Carleton pages for local testing go in `tests/fixtures/private/`, which git ignores

## Privacy & Security

- **No Data Storage**: Your timetable data is processed locally and not stored
- **Secure Authentication**: All calendar integrations use industry-standard OAuth2
- **Minimal Permissions**: Extension only requests necessary permissions
- **Open Source**: Code is available for review

## Troubleshooting

### Extension Not Working
- Ensure you're logged into Carleton Central
- Refresh the timetable page and try again

### Calendar Integration Issues
- **Google Calendar**: Ensure you're logged into the correct Google account
- **Outlook**: Verify your Microsoft account has calendar access

### Missing Courses
- Verify all courses are visible on your Carleton timetable page
- Some online courses may not have location/time information

##  Support

If you encounter issues:
1. Ensure your browser allows the extension to run on the page and popups are enabled
2. Try refreshing the page and running the extension again
3. Use the Feedback button to report issues

## License

This project is licensed under the terms included in the [LICENSE](LICENSE) file.

---