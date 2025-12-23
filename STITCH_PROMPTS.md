# ERA KANBAN - Google Stitch Design Prompts

Use these prompts with Google Stitch to generate design assets for the missing components.

---

## 🎨 Design System Reference

Before generating, ensure these design tokens are applied:

```
Theme: Era Bulut (Dark)
Primary Color: #14b8a6 (Teal)
Background: #0f1419
Surface: #1e293b
Border: #233948
Font: Inter
Style: Glassmorphism with backdrop blur
Border Radius: 12px (cards), 8px (buttons)
```

---

## 1. Register Page

```
Create a dark themed registration page for a Kanban app called "ERA KANBAN".

Layout:
- Split screen: left side decorative gradient, right side form
- Glassmorphism card containing the form

Form Fields:
- Full Name input with user icon
- Email input with mail icon
- Password input with eye toggle (show/hide)
- Confirm Password input
- Checkbox: "I agree to Terms & Privacy Policy"
- "Create Account" primary button (teal gradient)
- Divider with "or continue with"
- Social buttons: Google, GitHub (outlined style)
- "Already have an account? Log in" link

Colors:
- Background: #0f1419
- Card: rgba(30, 41, 59, 0.7) with backdrop-blur
- Primary: #14b8a6
- Input: dark with subtle border #233948
- Text: white and #94a3b8 for secondary

Include subtle mesh gradient background animation.
```

---

## 2. Projects List Page

```
Create a projects grid page for a Kanban project management app.

Header Section:
- Page title "My Projects" with folder icon
- "New Project" button (teal, with plus icon)
- View toggle: Grid / List icons
- Search input with magnifier icon

Project Cards (Grid Layout - 3 columns):
- Glassmorphism card with hover effect
- Color stripe at top (project color)
- Project name (bold)
- Description (2 lines, truncated)
- Stats row: "12 Tasks" "3 Members" icons
- Member avatars stack (overlapping circles)
- Progress bar showing completion %
- Three-dot menu button

Empty State:
- Illustration of folder
- "No projects yet"
- "Create your first project" button

Use dark theme (#0f1419 background), teal accent (#14b8a6).
```

---

## 3. Create Project Modal

```
Create a modal dialog for creating a new project in a Kanban app.

Modal:
- Glassmorphism background with backdrop blur
- "Create New Project" title with X close button
- Subtle border glow

Form Fields:
- Project Name input (required)
- Description textarea (optional, 3 rows)
- Color picker: 8 preset colors in circles (teal, blue, purple, pink, red, orange, yellow, green)
- Template dropdown: "Blank", "Software Development", "Marketing", "Personal"

Footer:
- "Cancel" ghost button
- "Create Project" teal primary button

Overlay: Semi-transparent dark (#000 at 50% opacity)
Card: Glassmorphism with #1e293b base
Width: 480px centered
```

---

## 4. Calendar Page (Monthly View)

```
Create a monthly calendar view for a Kanban app showing task due dates.

Header:
- Month/Year title with left/right navigation arrows
- "Today" button
- View switcher: Month / Week tabs

Calendar Grid:
- 7 columns (Sun-Sat headers)
- 5-6 rows of day cells
- Current day highlighted with teal ring
- Days outside current month are dimmed

Day Cell Content:
- Date number top-left
- Up to 3 task pills showing:
  - Priority color dot (red/orange/yellow/green)
  - Task title truncated
- "+3 more" indicator if overflow
- Hover: subtle background highlight

Sidebar (Optional - Right):
- "Upcoming" section
- List of next 5 tasks with due dates

Dark theme, glassmorphism cards, teal accent.
```

---

## 5. Metrics Dashboard Page

```
Create a metrics/analytics dashboard for a Kanban project management app.

Top Stats Row (4 cards):
- Total Tasks: number with icon
- Completed: number with green checkmark
- In Progress: number with teal spinner
- Overdue: number with red warning

Charts Section (2 columns):

Left - Burndown Chart:
- Line chart
- X-axis: Days (1-14)
- Y-axis: Remaining tasks
- Ideal line (dashed gray)
- Actual line (solid teal)
- Area fill under actual line

Right - Priority Distribution:
- Donut/Pie chart
- Segments: Critical (red), High (orange), Medium (yellow), Low (green)
- Center: Total task count
- Legend below

Bottom Section:

Team Performance Table:
- Columns: Member, Completed, In Progress, Overdue
- Avatar + Name column
- Number badges with colors
- Sortable headers

Activity Feed (sidebar):
- Timeline with dots
- Recent actions: "John completed Task X"
- Timestamps

Dark theme, glassmorphism, Inter font.
```

---

## 6. User Profile Page

```
Create a user profile settings page for a Kanban app.

Layout: Two-column

Left Column - Profile Card:
- Large avatar (80px) with edit overlay on hover
- Full name (editable)
- Email (read-only with lock icon)
- Role badge: "Admin" / "Member"
- "Member since Dec 2024"

Right Column - Settings Sections:

Personal Information:
- Full Name input
- Email input (disabled)
- "Save Changes" button

Security:
- "Change Password" button
- Two-factor authentication toggle

Preferences:
- Theme toggle: Dark / Light / System
- Notification settings checkboxes
- Language dropdown

Danger Zone (red border):
- "Delete Account" destructive button

Glassmorphism cards, dark theme, teal primary.
```

---

## 7. Tag Selector Component

```
Create a tag selector dropdown component for a Kanban task card.

Trigger Button:
- "Add Tag" with plus icon
- Small, pill-shaped

Dropdown Panel:
- Search input "Search tags..."
- Existing tags list:
  - Color dot + Tag name
  - Checkmark if selected
  - Hover highlight
- Divider
- "Create new tag" option with color picker
- Color options: 8 colors in row

Selected Tags Display:
- Row of pill badges
- Each: colored background + white text + X remove
- Example tags: "Bug" (red), "Feature" (blue), "Urgent" (orange)

Compact, dark theme, fits within task modal sidebar.
```

---

## 8. Activity Feed Component

```
Create an activity timeline component for a Kanban project.

Container:
- "Recent Activity" header with filter dropdown
- Scrollable list

Activity Items:
- Avatar (32px)
- Action text: "[User] completed [Task Name]"
- Timestamp: "2 hours ago"
- Vertical timeline line connecting items

Action Types with Icons:
- Task created (plus icon)
- Task completed (checkmark icon)
- Task moved (arrows icon)
- Comment added (chat icon)
- File uploaded (paperclip icon)
- Member joined (user-plus icon)

Dark theme, subtle borders, teal accent for links.
```

---

## 9. Empty States

```
Create empty state illustrations for a Kanban app.

Variations needed:

1. No Projects:
- Folder illustration
- "No projects yet"
- "Create your first project to get started"
- "Create Project" button

2. Empty Board (No Tasks):
- Clipboard illustration
- "No tasks in this column"
- "Drag tasks here or create new"
- "Add Task" subtle button

3. No Search Results:
- Magnifier with X illustration
- "No results found"
- "Try adjusting your search or filters"

4. No Activity:
- Clock/timeline illustration
- "No recent activity"
- "Actions will appear here"

Style: Minimal line illustrations, teal accent, dark background.
Size: 200px illustrations, centered.
```

---

## 10. Mobile Navigation

```
Create a mobile bottom navigation bar for a Kanban app.

Bar Style:
- Fixed to bottom
- Glassmorphism background
- Safe area padding for notch devices

Navigation Items (5 icons):
1. Home (house icon)
2. Projects (folder icon)
3. Add Task (plus in circle, prominent/teal)
4. Calendar (calendar icon)
5. Profile (user icon)

States:
- Default: gray icon
- Active: teal icon with label underneath
- Add button: larger, teal filled circle

Height: 64px + safe area
Dark theme, blur effect.
```

---

## Usage Notes

1. Generate each design at 2x resolution for retina displays
2. Export as PNG with transparent background where applicable
3. Also export code snippets (HTML/CSS) for reference
4. Ensure all interactive states are shown (default, hover, active, disabled)

---

*Generated for ERA KANBAN project - December 2024*
