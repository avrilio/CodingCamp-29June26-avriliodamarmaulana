# Requirements Document

## Introduction

The To-Do List Life Dashboard is a clean, minimal, and responsive personal productivity web application built with HTML, CSS, and Vanilla JavaScript. Inspired by Notion, Linear, and TickTick, it provides a card-based dashboard featuring a greeting widget, a focus timer, a to-do list, and quick links — all persisted via the browser's Local Storage API. No backend server or external framework is required.

---

## Glossary

- **Dashboard**: The single-page web application containing all feature widgets.
- **Widget**: A self-contained card section within the Dashboard (e.g., Greeting, Focus_Timer, Todo_List, Quick_Links).
- **Focus_Timer**: A configurable countdown timer widget (default 25 minutes) based on the Pomodoro technique.
- **Todo_List**: The task management widget that stores, displays, and manages Task items.
- **Task**: A single to-do item with a text description and a completion status.
- **Quick_Links**: The widget that stores and displays user-defined shortcut links to external websites.
- **Link**: A Quick_Links entry composed of a label and a URL.
- **Local_Storage**: The browser's `localStorage` API used for all client-side data persistence.
- **Theme**: The visual color scheme of the Dashboard — either "light" or "dark".
- **User_Name**: The custom name entered by the user, displayed in the Greeting widget.
- **Session**: A single Focus_Timer countdown run from start to natural completion or manual stop.

---

## Requirements

---

### Requirement 1: Greeting Widget

**User Story:** As a user, I want to see a personalized greeting with the current time and date, so that I have a friendly and contextual starting point when I open the dashboard.

#### Acceptance Criteria

1. THE Dashboard SHALL display the current time in HH:MM format using the user's local device time, updating the displayed value every minute on the minute.
2. THE Dashboard SHALL display the current date in a human-readable format (e.g., "Monday, 30 June 2025") using the user's local device date.
3. WHILE the current local device time is between 05:00 and 11:59 (inclusive), THE Dashboard SHALL display the greeting prefix "Good Morning".
4. WHILE the current local device time is between 12:00 and 17:59 (inclusive), THE Dashboard SHALL display the greeting prefix "Good Afternoon".
5. WHILE the current local device time is between 18:00 and 20:59 (inclusive), THE Dashboard SHALL display the greeting prefix "Good Evening".
6. WHILE the current local device time is between 21:00 and 23:59, or between 00:00 and 04:59 (inclusive), THE Dashboard SHALL display the greeting prefix "Good Night".
7. WHEN a User_Name has been saved, THE Dashboard SHALL display the greeting as "[prefix], [User_Name]!".
8. WHEN no User_Name has been saved, THE Dashboard SHALL display the greeting as "[prefix]!" with no name component.
9. WHEN the Dashboard loads, THE Dashboard SHALL evaluate the current local device time and date and render the greeting widget immediately.

---

### Requirement 2: Custom Name in Greeting

**User Story:** As a user, I want to set a custom name for my greeting, so that the dashboard feels personalized to me.

#### Acceptance Criteria

1. THE Dashboard SHALL provide an input field allowing the user to enter a User_Name of up to 50 characters.
2. WHEN a user submits a non-empty (non-whitespace-only) User_Name, THE Dashboard SHALL save the trimmed User_Name to Local_Storage within 500ms and update the greeting display immediately.
3. WHEN a user submits an empty or whitespace-only User_Name, THE Dashboard SHALL clear the saved User_Name from Local_Storage and display the greeting in the name-less format "[prefix]!" with no name component.
4. WHEN the Dashboard loads and a User_Name exists in Local_Storage, THE Dashboard SHALL retrieve and display the User_Name in the greeting immediately.
5. WHEN the Dashboard loads and no User_Name key exists in Local_Storage, THE Dashboard SHALL display the greeting in the name-less format without error.
6. IF Local_Storage is unavailable when saving the User_Name, THEN THE Dashboard SHALL display the updated greeting for the current session using in-memory state only, without throwing a visible error.

---

### Requirement 3: Focus Timer

**User Story:** As a user, I want a configurable countdown timer, so that I can work in focused sessions using the Pomodoro technique.

#### Acceptance Criteria

1. THE Focus_Timer SHALL display a countdown in MM:SS format, initialized to the configured session duration.
2. WHEN the user clicks the Start button while the Focus_Timer is paused or reset, THE Focus_Timer SHALL begin counting down from the current displayed remaining time one second at a time.
3. WHILE the Focus_Timer is running, THE Focus_Timer SHALL update the displayed countdown every second.
4. WHEN the user clicks the Stop button, THE Focus_Timer SHALL pause the countdown at the current remaining time without resetting it.
5. WHEN the user clicks the Reset button, THE Focus_Timer SHALL stop the countdown and reset the display to the configured session duration.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, produce an audible beep lasting no more than 3 seconds, and display an in-page visual notification that the session has ended.
7. THE Focus_Timer SHALL have a default session duration of 25 minutes.
8. IF the Focus_Timer is not running, THEN THE Focus_Timer SHALL allow the user to set a custom session duration between 1 and 120 minutes.
9. WHEN a valid custom session duration is saved, THE Focus_Timer SHALL persist the value to Local_Storage and reset the timer display to the new duration.
10. WHEN the Dashboard loads, THE Focus_Timer SHALL retrieve the saved session duration from Local_Storage and initialize the timer display accordingly.
11. IF the user attempts to set a session duration outside the range of 1 to 120 minutes, THEN THE Focus_Timer SHALL display a validation error message adjacent to the duration input field, the error SHALL persist until the value is corrected, and the input SHALL retain the invalid value to allow the user to correct it. THE Focus_Timer SHALL retain the previous valid session duration.

---

### Requirement 4: To-Do List

**User Story:** As a user, I want to manage a list of tasks, so that I can track what I need to accomplish and mark progress.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field for entering a Task description.
2. WHEN a user submits a non-empty Task description, THE Todo_List SHALL add the Task to the list and persist all tasks to Local_Storage immediately.
3. WHEN a user submits an empty or whitespace-only Task description, THE Todo_List SHALL reject the submission and display a validation message.
4. WHEN the Dashboard loads and tasks exist in Local_Storage, THE Todo_List SHALL retrieve and display all persisted tasks. WHEN the Dashboard loads and Local_Storage is unavailable or unreadable, THE Todo_List SHALL display an empty list and show an error message.
5. WHEN a user clicks the complete toggle on an incomplete Task, THE Todo_List SHALL mark the Task as done with a visual indicator (e.g., strikethrough) and persist the updated state to Local_Storage.
6. WHEN a user clicks the complete toggle on an already-completed Task, THE Todo_List SHALL mark the Task as incomplete and persist the updated state to Local_Storage.
7. WHEN a user clicks the edit action on a Task, THE Todo_List SHALL replace the Task display with an inline editable input field pre-populated with the current Task description.
8. WHEN an edited Task description is submitted, THE Todo_List SHALL validate the new description is non-empty and non-whitespace, check it does not match another existing Task description (case-insensitive, trimmed), persist the updated Task to Local_Storage if valid, or display an appropriate error if invalid.
9. WHEN a user cancels an edit (e.g., presses Escape or clicks Cancel), THE Todo_List SHALL discard changes and restore the original Task description without modifying Local_Storage.
10. WHEN a user clicks the delete action on a Task, THE Todo_List SHALL remove the Task from the list and update Local_Storage immediately.
11. WHEN a user attempts to add a Task whose description (case-insensitive, trimmed) matches an existing Task description, THE Todo_List SHALL reject the submission and display a duplicate warning message.

---

### Requirement 5: Task Sorting

**User Story:** As a user, I want to sort my task list, so that I can view tasks in a meaningful order.

#### Acceptance Criteria

1. THE Todo_List SHALL provide a sort control with at least the following options: "Default" (insertion order), "A–Z" (alphabetical ascending, case-insensitive), "Z–A" (alphabetical descending, case-insensitive), "Completed Last", and "Completed First".
2. WHEN the user selects a sort option, THE Todo_List SHALL re-render the task list in the selected order within 300ms.
3. THE Todo_List SHALL apply sort options non-destructively, preserving the original insertion order in Local_Storage.
4. WHEN the Dashboard loads and a valid sort preference exists in Local_Storage, THE Todo_List SHALL display tasks in that sort order and reflect the active option in the sort control.
5. WHEN the Dashboard loads and no sort preference exists in Local_Storage or the persisted value is unrecognized, THE Todo_List SHALL display tasks in insertion order and set the sort control to "Default".
6. WHEN the user selects a sort option, THE Todo_List SHALL persist the selected sort preference to Local_Storage immediately.

---

### Requirement 6: Quick Links

**User Story:** As a user, I want to save and access favorite website shortcuts, so that I can open frequently visited pages with one click.

#### Acceptance Criteria

1. THE Quick_Links widget SHALL provide an input field for a Link label and a separate input field for a Link URL.
2. WHEN a user submits a Link with a non-empty label (trimmed) and a valid URL beginning with `http://` or `https://`, THE Quick_Links widget SHALL add the Link to the list and persist all links to Local_Storage immediately.
3. WHEN a user submits a Link with an empty or whitespace-only label, THE Quick_Links widget SHALL reject the submission and display a validation error indicating the label is required.
4. WHEN a user submits a Link with an empty URL or a URL that does not begin with `http://` or `https://`, THE Quick_Links widget SHALL reject the submission and display a validation error indicating the URL format is invalid.
5. WHEN a user clicks a Link button, THE Quick_Links widget SHALL open the corresponding URL in a new browser tab using `target="_blank"`.
6. WHEN a user deletes a Link, THE Quick_Links widget SHALL remove it from the display and update Local_Storage immediately.
7. WHEN the Dashboard loads, THE Quick_Links widget SHALL retrieve and display all persisted links from Local_Storage.

---

### Requirement 7: Light / Dark Mode Toggle

**User Story:** As a user, I want to switch between light and dark visual themes, so that I can use the dashboard comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL provide a toggle control to switch between "light" and "dark" Theme values.
2. WHEN the user activates the toggle, THE Dashboard SHALL apply the new Theme to all background, text, border, and icon colors across all UI elements within 100ms without a page reload, and persist the new Theme value to Local_Storage.
3. WHEN the Dashboard loads, THE Dashboard SHALL retrieve the saved Theme from Local_Storage and apply it before the first visible paint to prevent a flash of unstyled content.
4. WHEN no Theme has been saved in Local_Storage, or when a Local_Storage read error occurs, THE Dashboard SHALL default to the "light" Theme.
5. IF Local_Storage is unavailable when saving the Theme, THEN THE Dashboard SHALL apply the new Theme for the current session using in-memory state only, without displaying an error to the user.

---

### Requirement 8: Data Persistence and Recovery

**User Story:** As a user, I want my data to survive page refreshes and browser restarts, so that I never lose my tasks, links, timer settings, or preferences.

#### Acceptance Criteria

1. THE Dashboard SHALL persist all mutable state — including tasks, links, timer duration (on explicit user action only, not on each countdown tick), User_Name, Theme, and sort preference — to Local_Storage on every user-initiated change.
2. WHEN the Dashboard loads, THE Dashboard SHALL restore all persisted state from Local_Storage before rendering any content visible to the user.
3. WHEN the Dashboard loads and a specific state key is absent from Local_Storage, THE Dashboard SHALL apply the defined default value for that key without displaying an error.
4. IF a Local_Storage read, write, or parse operation fails for one or more state keys, THEN THE Dashboard SHALL display a non-blocking error message visible to the user and operate with the default value for each affected state key for the duration of the session.

---

### Requirement 9: Responsive Layout and Visual Design

**User Story:** As a user, I want the dashboard to look clean and work well on different screen sizes, so that I can use it comfortably on desktop, tablet, or mobile.

#### Acceptance Criteria

1. THE Dashboard SHALL use a card-based layout where each Widget is contained in a card with a visible border or shadow, a minimum of 16px internal padding, and a distinct background color separating it from the page background.
2. THE Dashboard SHALL be fully usable on viewport widths from 320px to 2560px without horizontal scrolling, with all interactive elements having a minimum touch target size of 44×44px.
3. WHEN the user switches the Theme, THE Dashboard SHALL apply all color changes with a CSS transition of duration ≤ 300ms.
4. WHEN a task is toggled complete or incomplete, THE Dashboard SHALL apply the visual change (e.g., strikethrough) with a CSS transition of duration ≤ 300ms.
5. WHEN a modal or panel appears or disappears, THE Dashboard SHALL animate the transition with a CSS transition of duration ≤ 300ms.
6. THE Dashboard SHALL use legible font sizes: body text no smaller than 14px, headings no smaller than 18px.
7. THE Dashboard SHALL meet a minimum color contrast ratio of 4.5:1 between text and its background for both light and dark themes, in compliance with WCAG 2.1 Level AA.
8. THE Dashboard SHALL implement responsive breakpoints such that on viewports ≥ 1024px the layout displays at least two columns of Widgets side by side; on viewports between 600px and 1023px the layout adjusts to a single-column or two-column layout as appropriate; and on viewports ≤ 599px all Widgets stack in a single column.

---

### Requirement 10: Browser Compatibility and Standalone Use

**User Story:** As a user, I want the dashboard to work across modern browsers without any installation or build step, so that I can open it directly as an HTML file or browser extension.

#### Acceptance Criteria

1. THE Dashboard SHALL function correctly — defined as: all UI elements render, all interactive controls respond to user input, all data operations complete without JavaScript console errors, and no content or layout failures occur — in the latest stable browser versions of Chrome, Firefox, Edge, and Safari released within 12 months prior to the test date, using only HTML, CSS, and Vanilla JavaScript without build tools, compilation, or transpilation.
2. THE Dashboard SHALL consist of exactly one HTML file at the project root, one CSS file located inside a `css/` directory, and one JavaScript file located inside a `js/` directory.
3. THE Dashboard SHALL not require a backend server, build tool, or package manager to run.
4. THE Dashboard SHALL use only Vanilla JavaScript patterns that execute without CORS errors when opened via the `file://` protocol, specifically avoiding ES6 module `import`/`export` statements across separate files.
5. WHEN the Dashboard is opened as a local file via the `file://` protocol, THE Dashboard SHALL meet all the observable criteria defined in criterion 1 without generating CORS errors or broken functionality.
