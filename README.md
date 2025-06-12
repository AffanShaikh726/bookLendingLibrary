# 📚 Book Lending Library

A modern Angular-based web application for managing book lending in a library or community setting. This application allows users to browse available books, request to borrow them, and manage book inventory.

## ✨ Features

- **User Authentication**: Secure login system for library members and administrators
- **Book Management**: Add, view, and manage books in the library
- **Borrowing System**: Request to borrow available books
- **Request Management**: Track and manage book borrowing requests
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Technologies Used

- **Frontend**: Angular 19
- **UI Framework**: Tailwind CSS
- **Authentication & Database**: Supabase
- **State Management**: RxJS
- **Type Safety**: TypeScript
- **Form Handling**: Reactive Forms
- **Routing**: Angular Router

## 🏗️ Project Structure

```
src/
├── app/
│   ├── auth/           # Authentication related components and services
│   ├── components/     # Reusable UI components
│   ├── guards/         # Route guards for authentication and authorization
│   ├── layout/         # Layout components (header, footer, sidebar)
│   ├── models/         # TypeScript interfaces and types
│   ├── pages/          # Feature modules and pages
│   │   ├── admin/      # Admin specific pages
│   │   ├── books/      # Book related pages
│   │   ├── profile/    # User profile pages
│   │   └── ...
│   ├── services/      # Application services
│   │   ├── auth.service.ts      # Authentication service
│   │   ├── book.service.ts      # Book management service
│   │   ├── borrow.service.ts    # Borrowing logic service
│   │   └── supabase.service.ts  # Supabase integration
│   ├── shared/         # Shared modules and components
│   ├── app.component.* # Root component
│   ├── app.config.ts   # Application configuration
│   └── app.routes.ts   # Application routing
```

## 🚀 Deployment

This application is hosted on Vercel for seamless deployment and continuous integration. Vercel provides:

- Automatic deployments on every push to the main branch
- Preview deployments for pull requests
- Serverless functions for backend operations
- Global CDN for fast content delivery
- Easy rollback to previous versions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.