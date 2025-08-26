# Timetable Tools - Development Tasks

A Chrome extension that helps Carleton University students export their course timetables directly to their preferred calendar service (Google Calendar, Outlook, Apple Calendar, etc.) through direct integration.

## Current Project Status
- [*] Core timetable extraction functionality working
- [*] Website injection approach implemented
- [*] Chrome extension manifest configured
- [*] Needs direct calendar integration implementation
- [ ] Needs UI/UX improvements for calendar selection
- [ ] Needs code cleanup and modernization

---

<details>
<summary><strong>Phase 1: Code Cleanup & Modernization (4-6 hours)</strong></summary>

### Modernize JavaScript code (2-3 hours)
- [*] **Convert to ES6+ syntax**
  <details>
  <summary>Details</summary>
  > **What**: Update carleton-timetables.js to use modern JavaScript features
  > **Why**: Makes code more readable and maintainable
  > **How**: Replace var with const/let, convert functions to arrow functions, use template literals
  </details>

- [*] **Use async/await instead of callbacks**
  <details>
  <summary>Details</summary>
  > **What**: Replace callback-based code with async/await for better readability
  > **Why**: Async/await is easier to read and debug than nested callbacks
  > **How**: Convert functions that use callbacks to use async/await instead
  </details>

- [*] **Implement proper error handling**
  <details>
  <summary>Details</summary>
  > **What**: Add comprehensive error handling throughout the codebase
  > **Why**: Currently errors can cause the extension to fail silently
  > **How**: Add try-catch blocks and proper error logging
  </details>

### Clean up code structure (2-3 hours)
- [*] **Remove all console.log statements**
  <details>
  <summary>Details</summary>
  > **What**: Remove all debug console.log, console.error, and console.warn statements
  > **Why**: Debug code shouldn't be in production and clutters the console
  > **How**: Search for all console statements and remove them, or replace with proper logging
  </details>

- [*] **Add proper JSDoc comments**
  <details>
  <summary>Details</summary>
  > **What**: Add documentation comments to all functions explaining what they do
  > **Why**: Makes the code easier to understand for new developers
  > **How**: Add /** */ comments above each function describing parameters, return values, and purpose
  </details>

- [*] **Implement consistent naming conventions**
  <details>
  <summary>Details</summary>
  > **What**: Ensure all variables, functions, and files follow consistent naming patterns
  > **Why**: Makes code more readable and professional
  > **How**: Use camelCase for variables/functions, PascalCase for classes, kebab-case for files
  </details>

- [-] **Add input validation**
  <details>
  <summary>Details</summary>
  > **What**: Add checks to ensure data is valid before processing it
  > **Why**: Prevents crashes and unexpected behavior from invalid data
  > **How**: Add checks for null/undefined values, validate data types, and handle edge cases
  > **Note**: This is not a priority for now. Use phase1-clean-code-structure branch for development.
  </details>

</details>

<details>
<summary><strong>Phase 2: Direct Calendar Integration (6-8 hours)</strong></summary>

### Implement calendar service integration (4-5 hours)
- [*] **Create calendar service selection UI**
  <details>
  <summary>Details</summary>
  > **What**: Design an interface for users to select their preferred calendar service
  > **Why**: Users need to choose where to export their timetable
  > **How**: Create a modal or dropdown with options for Google Calendar, Outlook, Apple Calendar, etc.
  </details>

- [*] **Implement Google Calendar integration**
  <details>
  <summary>Details</summary>
  > **What**: Add direct integration with Google Calendar API
  > **Why**: Many students use Google Calendar as their primary calendar
  > **How**: Use Google Calendar API to create events directly in the user's calendar
  </details>

- [*] **Implement Outlook calendar integration**
  <details>
  <summary>Details</summary>
  > **What**: Add direct integration with Outlook/Microsoft Calendar
  > **Why**: Many students use Outlook for academic purposes
  > **How**: Use Microsoft Graph API to create events in Outlook calendar
  </details>

- [x] **Implement Apple Calendar integration**
  <details>
  <summary>Details</summary>
  > **What**: Add support for Apple Calendar users
  > **Why**: Mac users often prefer Apple Calendar
  > **How**: Use Apple Calendar API or generate calendar files for import
  </details>

- [*] **Add ICS file as fallback option**
  <details>
  <summary>Details</summary>
  > **What**: Keep ICS file generation as an option for other calendar services
  > **Why**: Not all calendar services have direct API integration
  > **How**: Generate ICS files for services without direct API access
  </details>

### Enhance injected UI (2-3 hours)
- [ ] **Design contextual export button**
  <details>
  <summary>Details</summary>
  > **What**: Create a clean, contextual export button that appears on Carleton timetable pages
  > **Why**: The button should look native to the page and be easily discoverable
  > **How**: Design a button that matches Carleton's UI style and position it prominently
  </details>

- [x] **Add loading states and progress indicators**
  <details>
  <summary>Details</summary>
  > **What**: Show users exactly what step the extension is on during extraction and integration
  > **Why**: Users need feedback to know the extension is working
  > **How**: Display step-by-step progress like "Extracting courses...", "Connecting to Google Calendar...", "Importing events..."
  </details>

- [ ] **Implement proper error messaging**
  <details>
  <summary>Details</summary>
  > **What**: Show user-friendly error messages when something goes wrong
  > **Why**: Current error messages are technical and confusing
  > **How**: Create simple, actionable error messages like "Please authorize calendar access"
  </details>

- [*] **Add success confirmation**
  <details>
  <summary>Details</summary>
  > **What**: Show a clear success message when calendar import completes
  > **Why**: Users need to know the import worked
  > **How**: Display a success message with confirmation and link to view calendar
  </details>

</details>

<details>
<summary><strong>Phase 3: Core Functionality Refactor (6-8 hours)</strong></summary>

### Modularize timetable logic (4-5 hours)
- [ ] **Break down carleton-timetables.js into smaller, focused functions**
  <details>
  <summary>Details</summary>
  > **What**: Split the large 473-line file into smaller, more manageable functions
  > **Why**: The current file is too large and does too many things, making it hard to understand and maintain
  > **How**: Identify logical sections (extraction, calendar integration, UI) and split them into separate functions
  </details>

- [ ] **Create TimetableExtractor class**
  <details>
  <summary>Details</summary>
  > **What**: Create a class that handles all the timetable extraction logic
  > **Why**: Encapsulate the extraction logic and make it more organized and testable
  > **How**: Move extraction functions into a class with methods like extract(), parseCourses(), etc.
  </details>

- [ ] **Create CalendarIntegrator class**
  <details>
  <summary>Details</summary>
  > **What**: Create a class that handles direct calendar service integration
  > **Why**: Separate calendar integration from extraction logic for better organization
  > **How**: Move calendar-related functions into a class with methods like integrateWithGoogle(), integrateWithOutlook(), etc.
  </details>

- [ ] **Add proper error handling**
  <details>
  <summary>Details</summary>
  > **What**: Add try-catch blocks and proper error messages throughout the extraction and integration process
  > **Why**: Currently the extension can fail silently or with unclear error messages
  > **How**: Wrap each major operation in try-catch and provide user-friendly error messages
  </details>

### Improve state management (2-3 hours)
- [ ] **Replace complex session storage with simple state machine**
  <details>
  <summary>Details</summary>
  > **What**: Replace the complex session storage system with a simple state machine
  > **Why**: Current state management is hard to follow and error-prone
  > **How**: Create a simple state enum (IDLE, EXTRACTING, INTEGRATING, COMPLETE, ERROR) and manage transitions
  </details>

- [ ] **Implement proper loading states**
  <details>
  <summary>Details</summary>
  > **What**: Add visual feedback when the extension is working
  > **Why**: Users need to know the extension is working and not frozen
  > **How**: Show loading spinners, progress bars, or status messages during extraction and integration
  </details>

- [ ] **Handle edge cases (no courses, network errors, etc.)**
  <details>
  <summary>Details</summary>
  > **What**: Add handling for scenarios like no courses enrolled, network failures, or invalid data
  > **Why**: The extension should gracefully handle all possible scenarios
  > **How**: Add checks for empty course lists, network timeouts, and provide helpful error messages
  </details>

</details>

<details>
<summary><strong>Phase 4: Testing & Validation (3-4 hours)</strong></summary>

### Test core functionality (2-3 hours)
- [ ] **Test timetable extraction on Carleton site**
  <details>
  <summary>Details</summary>
  > **What**: Test the extension on the actual Carleton University website
  > **Why**: Need to ensure it works with the real website, not just in isolation
  > **How**: Load the extension in Chrome, go to Carleton's site, and test the export feature
  </details>

- [ ] **Test direct calendar integrations**
  <details>
  <summary>Details</summary>
  > **What**: Test that events are properly created in each calendar service
  > **Why**: Users need to verify their schedule appears correctly in their chosen calendar
  > **How**: Test Google Calendar, Outlook, and Apple Calendar integrations with real accounts
  </details>

- [ ] **Verify term detection logic**
  <details>
  <summary>Details</summary>
  > **What**: Test that the extension correctly detects the current academic term
  > **Why**: Users need the correct term to be selected automatically
  > **How**: Test during different times of year to ensure term detection works correctly
  </details>

### Error handling tests (1-2 hours)
- [ ] **Test with no courses enrolled**
  <details>
  <summary>Details</summary>
  > **What**: Test what happens when a user has no courses enrolled for the selected term
  > **Why**: Need to handle this edge case gracefully
  > **How**: Create a test scenario where no courses are found and verify proper error message
  </details>

- [ ] **Test calendar authorization failures**
  <details>
  <summary>Details</summary>
  > **What**: Test how the extension behaves when calendar access is denied
  > **Why**: Users might not authorize calendar access
  > **How**: Test with revoked permissions and verify proper error handling
  </details>

- [ ] **Test with network failures**
  <details>
  <summary>Details</summary>
  > **What**: Test how the extension behaves when calendar services are unavailable
  > **Why**: Network issues can cause calendar integration to fail
  > **How**: Simulate slow network or service outages and test error handling
  </details>

</details>

<details>
<summary><strong>Phase 5: Documentation & Deployment (2-3 hours)</strong></summary>

### Update documentation (1-2 hours)
- [ ] **Rewrite README.md with clear project description**
  <details>
  <summary>Details</summary>
  > **What**: Update the README to clearly describe what the extension does and how to use it
  > **Why**: Users and developers need accurate documentation
  > **How**: Add clear description, features list, installation instructions, and usage guide
  </details>

- [ ] **Add installation instructions**
  <details>
  <summary>Details</summary>
  > **What**: Create clear step-by-step installation instructions
  > **Why**: Users need to know how to install the extension
  > **How**: Add instructions for both Chrome Web Store and manual installation
  </details>

- [ ] **Document API/function usage**
  <details>
  <summary>Details</summary>
  > **What**: Document how to use the main functions and classes
  > **Why**: Future developers need to understand how the code works
  > **How**: Add JSDoc comments and create API documentation
  </details>

- [ ] **Create user guide**
  <details>
  <summary>Details</summary>
  > **What**: Create a simple guide for end users
  > **Why**: Users need to know how to use the extension
  > **How**: Create a simple guide with screenshots and step-by-step instructions
  </details>

### Prepare for deployment (1-1 hours)
- [ ] **Update manifest.json version**
  <details>
  <summary>Details</summary>
  > **What**: Increment the version number in manifest.json
  > **Why**: Chrome Web Store requires version updates for new releases
  > **How**: Update the version field in manifest.json (e.g., from 2.5.8.0 to 2.6.0.0)
  </details>

- [ ] **Test in Chrome Web Store**
  <details>
  <summary>Details</summary>
  > **What**: Test the extension as it would appear in the Chrome Web Store
  > **Why**: Ensure the extension works properly when installed from the store
  > **How**: Package the extension and test installation from a .crx file
  </details>

- [ ] **Create release notes**
  <details>
  <summary>Details</summary>
  > **What**: Document what changes were made in this version
  > **Why**: Users need to know what's new or fixed
  > **How**: Create a CHANGELOG.md or update release notes with key changes
  </details>

</details>

<details>
<summary><strong>Phase 6: Optional Enhancements (4-6 hours)</strong></summary>

### Performance optimizations (2-3 hours)
- [ ] **Minimize bundle size**
  <details>
  <summary>Details</summary>
  > **What**: Reduce the total size of the extension files
  > **Why**: Smaller extensions load faster and use less memory
  > **How**: Remove unused code, minify JavaScript/CSS, optimize images
  </details>

- [ ] **Optimize DOM queries**
  <details>
  <summary>Details</summary>
  > **What**: Make DOM element selection more efficient
  > **Why**: Faster DOM queries improve extension performance
  > **How**: Cache DOM elements, use more specific selectors, avoid repeated queries
  </details>

- [ ] **Implement caching where appropriate**
  <details>
  <summary>Details</summary>
  > **What**: Cache frequently accessed data to avoid repeated operations
  > **Why**: Caching can significantly improve performance
  > **How**: Cache term data, user preferences, and other frequently accessed information
  </details>

### Additional features (2-3 hours)
- [ ] **Add support for other universities (if needed)**
  <details>
  <summary>Details</summary>
  > **What**: Extend the extension to work with other university websites
  > **Why**: Could expand the user base beyond Carleton University
  > **How**: Create modular extractors for different university systems
  </details>

- [ ] **Implement batch export for multiple terms**
  <details>
  <summary>Details</summary>
  > **What**: Allow users to export multiple terms at once
  > **Why**: Some users want their entire academic schedule
  > **How**: Add checkboxes for multiple terms and integrate all courses into calendar
  </details>

- [ ] **Add calendar sync options**
  <details>
  <summary>Details</summary>
  > **What**: Allow users to sync existing calendar events or update them
  > **Why**: Users might want to update their schedule when courses change
  > **How**: Add options to update existing events or sync with current calendar
  </details>

</details>

<details>
<summary><strong>Technical Debt Items (2-3 hours)</strong></summary>

### Security improvements (1-2 hours)
- [ ] **Audit permissions in manifest.json**
  <details>
  <summary>Details</summary>
  > **What**: Review all permissions requested by the extension
  > **Why**: Only request permissions that are actually needed for security
  > **How**: Check each permission and remove any that aren't essential
  </details>

- [ ] **Implement Content Security Policy**
  <details>
  <summary>Details</summary>
  > **What**: Add CSP headers to prevent XSS attacks
  > **Why**: Improves security by restricting what scripts can run
  > **How**: Add appropriate CSP headers in manifest.json
  </details>

- [ ] **Validate all user inputs**
  <details>
  <summary>Details</summary>
  > **What**: Add validation for any data entered by users
  > **Why**: Prevents security vulnerabilities from malicious input
  > **How**: Add input validation for settings, term selection, etc.
  </details>

### Privacy & Accessibility (1-1 hours)
- [ ] **Ensure all processing happens locally**
  <details>
  <summary>Details</summary>
  > **What**: Verify that no user data is sent to external servers
  > **Why**: Privacy is a core principle of the extension
  > **How**: Audit all network requests and ensure data stays local
  </details>

- [ ] **Add ARIA labels**
  <details>
  <summary>Details</summary>
  > **What**: Add accessibility labels to UI elements
  > **Why**: Makes the extension usable by people with disabilities
  > **How**: Add aria-label attributes to buttons, inputs, and other interactive elements
  </details>

- [ ] **Ensure keyboard navigation**
  <details>
  <summary>Details</summary>
  > **What**: Make sure all functionality can be accessed via keyboard
  > **Why**: Some users rely on keyboard navigation
  > **How**: Test tab order and ensure all buttons/links are keyboard accessible
  </details>

</details>

## Success Criteria
- [*] Extension works reliably with Carleton University's website
- [*] Direct calendar integration with major calendar services (Google, Outlook, ~~Apple~~)
- [ ] Clean, maintainable codebase with modern JavaScript
- [ ] User-friendly interface with clear feedback
- [ ] Proper error handling for all edge cases
- [ ] Privacy-first approach with local processing
- [ ] Well-documented code and user guide

## Notes for Development
- Focus on direct calendar integration rather than file generation
- Maintain privacy by keeping all processing local
- Test calendar integrations thoroughly with real accounts
- Ensure proper authorization flows for calendar services
- Document any changes or decisions made 