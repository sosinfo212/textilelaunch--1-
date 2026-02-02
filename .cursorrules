# Project Rules & Coding Standards

These rules define the coding standards, technology stack, and behavior for the TextileLaunch project. They are designed to guide AI assistants (like Cursor) and developers.

## 1. Project Context

- **Name**: TextileLaunch
- **Type**: SaaS Platform for Textile Sellers (Landing Page Generator)
- **Stack**: React (v19), TypeScript, Tailwind CSS, Lucide React, Google GenAI SDK.
- **Language**: 
  - **UI/UX**: French (Français) - All visible text must be in French.
  - **Code/Comments**: English - All variable names, logic, and comments must be in English.

## 2. Tech Stack & Libraries

- **Framework**: React (Create React App structure currently, migrating to Next.js).
- **Styling**: Tailwind CSS.
- **Icons**: `lucide-react`.
- **Routing**: `react-router-dom` (v6+).
- **AI**: `@google/genai` (Google GenAI SDK).
- **Data Persistence**: `localStorage` (via `StoreContext`).

## 3. Coding Guidelines

### General
- Use **Functional Components** with `React.FC`.
- Use **TypeScript** strictly. Define interfaces in `types.ts`.
- Ensure **Responsiveness**: Mobile-first approach using Tailwind classes (e.g., `w-full md:w-1/2`).

### Google GenAI (Gemini)
- **Import**: `import { GoogleGenAI } from "@google/genai";`
- **Initialization**: `const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });` (or user provided key).
- **Models**: 
  - Text generation: `gemini-3-flash-preview`
  - **Avoid**: Deprecated `GoogleGenerativeAI` classes.

### Data Structure
- **Products**: Stored in `tl_products`. Attributes like size/color are stored in a JSON structure.
- **Orders**: Stored in `tl_orders`. Statuses: `pending`, `shipped`, `completed`.
- **Templates**: Stored in `tl_templates`. Visual builder stores element tree in JSON.

## 4. UI/UX Rules

- **Language**: The interface is strictly for French-speaking users (Morocco/France market).
  - Correct: "Ajouter au panier", "Prix", "Taille".
  - Incorrect: "Add to cart", "Price", "Size".
- **Currency**: Display prices in **DH** (Dirhams) or **€** depending on context, default formatted.
- **Forms**: Use high-contrast inputs for better accessibility.

## 5. File Structure
- `src/components`: Reusable UI components (Buttons, Layouts, Renderers).
- `src/pages`: Main view components matched to Routes.
- `src/context`: Global state management (`StoreContext`, `AuthContext`).
- `src/services`: External API logic (Gemini, etc.).
- `src/types`: Shared TypeScript interfaces.
