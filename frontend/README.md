# Novox Frontend Dashboard

A comprehensive and modern management dashboard built for educational institutions and organizations. The application provides dedicated modules for managing students, courses, employees, payroll, recruitment, CRM leads, and work reports. 

## Features

- **Student Management:** Track student enrollments, academic progress, attendance, and documents.
- **Course Administration:** Create and manage courses, curriculums, and schedules.
- **Employee Portal:** Manage staff profiles, attendance, leaves, and payroll records.
- **Sales CRM:** Manage incoming leads and track sales pipelines across different stages.
- **Recruitment:** Manage job applicants and schedule interviews efficiently.
- **Work Reports:** Track employee daily/weekly work reports and project statuses.

## Tech Stack

The application is built using modern frontend technologies designed for performance and developer experience:

- **Framework:** [React 19](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Routing:** [React Router v7](https://reactrouter.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **PDF Generation:** [jsPDF](https://github.com/parallax/jsPDF) & [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Linting:** [ESLint](https://eslint.org/)

## Folder Structure

```text
FE/
├── public/                 # Static assets that bypass Vite's build process
├── src/                    # Main source code directory
│   ├── assets/             # Images, fonts, and other compiled assets
│   ├── components/         # Reusable React components and main view contents
│   │   ├── employee/       # Employee-specific dashboard components
│   │   └── ...             # Core modules like StudentsContent, CoursesContent, etc.
│   ├── hooks/              # Custom React hooks (e.g., useClickOutside)
│   ├── utils/              # Utility functions and helpers
│   ├── App.jsx             # Main application component and routing setup
│   ├── App.css             # Global CSS styles
│   ├── index.css           # Tailwind base styles and configurations
│   └── main.jsx            # Application entry point
├── .gitignore              # Git ignore configuration
├── eslint.config.js        # ESLint configuration rules
├── index.html              # Main HTML template
├── package.json            # Project dependencies and scripts
└── vite.config.js          # Vite configuration options
```

## Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/novoxedtechllp-dotcom/Novox-Frontend.git
   ```

2. Navigate to the project directory:
   ```bash
   cd Novox-Frontend/FE
   ```

3. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Application

To start the development server, run:
```bash
npm run dev
```
The application will be available at `http://localhost:5173` (or the port specified in your terminal).

### Building for Production

To create a production-ready build, run:
```bash
npm run build
```
This will compile the application into the `dist` directory. You can preview the production build locally using:
```bash
npm run preview
```

### Linting the Code

To run ESLint and check for potential issues:
```bash
npm run lint
```

## Frontend Development Guidelines

### The Four States Rule
Every screen has four states and all four must be designed before the backend touches it. If you only design the happy path, you will always have broken-looking screens in production.

1. **Loading State**: Skeleton cards or a spinner. Never a blank white screen. The user must know something is happening while data fetches.
2. **Success State with Data**: The main happy path. Student list loads, attendance marks show, fee records display. This is what you build with mock data first.
3. **Empty State**: No students enrolled yet. No fee payments recorded. No assignments created. Design a helpful empty state — not a blank table with no rows. Show a message and an action button.
4. **Error State**: API failed. Network down. Unauthorized. Design these screens too. A red error message with a retry button. Never let a broken API show a white crash screen to users.

### Adding New Features
Every time a frontend developer adds a new feature, they must:
- Notify and update this README with relevant details.
- Ensure the new feature uses a feature-based architecture.
- Ensure the screen and its components are fully responsive across all device sizes.

