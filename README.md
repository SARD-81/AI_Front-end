```markdown
# 🎓 University AI Assistant (SBU Smart Assistant)

![Project Status](https://img.shields.io/badge/Status-Development-blue?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css)

A highly advanced, Enterprise-grade AI Assistant designed for **Shahid Beheshti University (SBU)**. This project features a modern, RTL-optimized interface with a robust architecture ready for production scaling.

---

## ✨ Key Features

### 🔐 Authentication & Security
- **Dual-Mode Auth:** Seamless switching between Login and Signup modes.
- **University Verification:** Strict email validation (`@mail.sbu.ac.ir` / `@student.sbu.ac.ir`).
- **OTP System:** 2-Step verification process with countdown timer and rate limiting.
- **Secure Validation:** Enterprise-grade form validation using `Zod` and `React Hook Form`.

### 💬 Chat Interface (DeepSeek Style)
- **Streaming Responses:** Real-time token streaming for a fluid AI experience.
- **Markdown Support:** Full rendering of code blocks, tables, and rich text.
- **Message History:** Virtualized message list handling 2000+ messages efficiently.
- **Feedback System:** Granular feedback (Like/Dislike) with detailed reasoning options (Inaccurate, Tone, etc.).
- **User Message Rail:** Quick navigation to previous user queries.

### ⚙️ User Experience (UX)
- **Settings Modal:** Centralized control for Theme (Light/Dark/System) and Language (Persian/English).
- **Responsive Sidebar:** Collapsible history sidebar with grouped chats (Today, Yesterday, Last 30 Days).
- **RTL Optimization:** Native support for Persian layouts and typography (Vazirmatn Font).
- **Animated Interactions:** Smooth transitions using `Framer Motion`.

### 🏗️ Architecture
- **BFF Pattern (Backend for Frontend):** Service layer abstraction to switch between **Mock** and **Real** backend effortlessly.
- **Type-Safe:** Fully typed with TypeScript strict mode.
- **Modular Components:** Built with `shadcn/ui` and atomic design principles.

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Form Handling:** React Hook Form + Zod
- **Internationalization:** next-intl
- **State Management:** React Query (TanStack Query) + Nuqs (URL State)

---

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites
- Node.js 18.17 or later
- npm or pnpm or yarn

### 1. Clone the repository
```bash
git clone [https://github.com/your-username/ai-front-end.git](https://github.com/your-username/ai-front-end.git)
cd ai-front-end

```

### 2. Install dependencies

```bash
npm install
# or
pnpm install

```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
# Backend Connection
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_AUTH_MODE=mock  # Set to 'real' to use actual backend

# AI Configuration (OpenRouter/DeepSeek)
NEXT_PUBLIC_OPENROUTER_API_KEY=your_api_key_here
NEXT_PUBLIC_OPENROUTER_DEFAULT_MODEL=deepseek/deepseek-chat

```

### 4. Run the development server

```bash
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) with your browser to see the result.

---

## 📂 Project Structure

```bash
.
├── app/                  # Next.js App Router pages & layouts
│   ├── [locale]/         # i18n routes (fa/en)
│   │   ├── auth/         # Authentication pages
│   │   ├── chat/         # Chat interface pages
│   │   └── settings/     # Settings modal routes
│   └── api/              # Local API routes (BFF)
├── components/           # React Components
│   ├── auth/             # Login/Signup forms
│   ├── chat/             # Chat bubbles, composer, message list
│   ├── settings/         # Settings modal components
│   ├── sidebar/          # History sidebar
│   └── ui/               # Reusable shadcn/ui components
├── lib/                  # Utilities & Logic
│   ├── api/              # API Client & Interceptors
│   ├── services/         # Service Layer (Auth, Chat)
│   ├── hooks/            # Custom React Hooks
│   └── types/            # TypeScript Interfaces
├── messages/             # i18n JSON files (fa.json, en.json)
└── public/               # Static assets (fonts, images)

```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is open-source and available under the [MIT License](https://www.google.com/search?q=LICENSE).

---

Developed with ❤️ by **Amir Reza Davarzani**

```
