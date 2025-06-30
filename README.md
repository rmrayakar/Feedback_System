# Feedback System

A modern, real-time feedback collection platform designed for educational institutions. This application enables teachers to create interactive feedback sessions and students to provide anonymous feedback through an intuitive interface.

## 🎯 Features

### For Teachers

- **Session Management**: Create, edit, and delete feedback sessions with custom time limits
- **Student Assignment**: Assign specific students or allow open enrollment via session codes
- **Real-time Analytics**: View response rates, completion status, and detailed feedback results
- **Question Types**: Support for rating scales (1-5 stars), multiple choice, and text responses
- **Session Monitoring**: Track active, pending, and completed sessions with expiry management
- **Profile Management**: Update personal information and view teaching statistics

### For Students

- **Easy Access**: Join sessions using 6-digit codes or view assigned sessions
- **Interactive Forms**: User-friendly feedback forms with progress tracking
- **Session Status**: Clear indication of pending and completed feedback sessions
- **Anonymous Responses**: Submit feedback without revealing identity
- **Dashboard Overview**: View all assigned sessions and completion status

## 🛠️ Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: shadcn/ui components with Tailwind CSS
- **Backend**: Supabase (PostgreSQL database with real-time features)
- **Authentication**: Supabase Auth with role-based access control
- **Routing**: React Router DOM
- **State Management**: TanStack Query for server state
- **Build Tool**: Vite
- **Form Handling**: React Hook Form with Zod validation

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd Feedback_System
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up Supabase**

   - Create a new Supabase project
   - Run the SQL migrations in `src/migrations/` in order
   - Copy your Supabase URL and anon key

4. **Configure environment variables**
   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173`

## 📊 Database Schema

The application uses the following main tables:

- **users**: Teacher and student accounts with role-based access
- **sessions**: Feedback sessions with time limits and expiry dates
- **session_students**: Many-to-many relationship for session assignments
- **questions**: Custom questions for each session with different types
- **responses**: Student feedback responses linked to questions

## 🔐 Security Features

- Row Level Security (RLS) policies in Supabase
- Role-based access control (teacher/student)
- Session expiry management
- Unique response constraints per student per session
- Input validation and sanitization

## 🎨 UI/UX Highlights

- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Modern Interface**: Clean, intuitive design using shadcn/ui components
- **Real-time Updates**: Live session status and response tracking
- **Progress Indicators**: Visual feedback for form completion
- **Toast Notifications**: User-friendly error and success messages
- **Loading States**: Smooth loading experiences throughout the app

## 📱 Usage

### Teacher Workflow

1. Sign up/login as a teacher
2. Create a new feedback session with custom questions
3. Assign students or share the session code
4. Monitor real-time responses and analytics
5. View detailed results and export data

### Student Workflow

1. Sign up/login as a student
2. Enter session code or view assigned sessions
3. Complete feedback forms with various question types
4. Track completion status in dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ for better education through feedback**
