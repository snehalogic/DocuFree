# DocuFree: AI-Powered Document Processing Web Application
DocuFree is an innovative web application that leverages modern AI technologies to extract, summarize, translate, convert, interact with, and listen to documents, revolutionizing the way we work with documents.

## 🏗️ Architecture
The DocuFree system consists of a full-stack architecture, comprising a React-based frontend and a Node.js-based backend. The frontend is responsible for providing a user-friendly interface for users to interact with the application, while the backend handles the core logic of document processing, including OCR-based text extraction, AI-powered summarization, translation, and conversion. The backend is further divided into two main components: the main backend and the file-backend. The main backend handles user authentication, document uploads, and processing, while the file-backend is responsible for handling file-related operations, such as file extraction and conversion.

## ⚙️ Tech Stack
The DocuFree application utilizes a wide range of technologies, including:
* Frontend: React, Radix UI, JavaScript, TypeScript
* Backend: Node.js, Express.js, MongoDB, Mongoose, Multer, Cors, Dotenv, JSON Web Tokens (JWT)
* AI and Machine Learning: Google Generative AI, Tesseract OCR
* Databases: MongoDB
* Python Libraries: PyTesseract, LibreOffice-Convert
* Other: Axios, Bcryptjs, Form-Data, FS-Extra, Mime-Types, PDF-Lib, PDF-Parse, Sharp

## 📁 Project Structure
The project is organized into the following key files and folders:
* `backend`: Contains the main backend logic, including routes, models, services, and middleware.
* `file-backend`: Contains the file-backend logic, including file extraction and conversion.
* `frontend`: Contains the React-based frontend code, including components, containers, and utilities.
* `package.json`: Contains dependencies and scripts for the project.
* `README.md`: This file, containing information about the project.

## 🚀 Getting Started
To get started with the project, follow these steps:
### Frontend
1. Navigate to the `frontend` folder and run `npm install` to install dependencies.
2. Run `npm start` to start the frontend development server.
### Backend
1. Navigate to the `backend` folder and run `npm install` to install dependencies.
2. Create a `.env` file and add the required environment variables (see below).
3. Run `npm start` to start the backend development server.
4. Navigate to the `file-backend` folder and run `npm install` to install dependencies.
5. Create a `.env` file and add the required environment variables (see below).
6. Run `npm start` to start the file-backend development server.

## 📖 Usage
To use the DocuFree application, follow these steps:
1. Upload a document to the application.
2. Select the desired processing options, such as OCR-based text extraction, AI-powered summarization, translation, and conversion.
3. Click the "Process" button to start the processing pipeline.
4. View the processed document, including extracted text, summarized content, translated text, and converted files.

## 🔑 Environment Variables
The following environment variables are required:
* `GEMINI_API_KEY`: Google Generative AI API key
* `MONGO_URI`: MongoDB connection string
* `JWT_SECRET`: JSON Web Token secret key
* `PORT`: Backend port number

## 🤝 Contributing
To contribute to the DocuFree project, follow these steps:
1. Fork the repository on GitHub.
2. Create a new branch for your feature or bug fix.
3. Commit your changes and push them to your fork.
4. Submit a pull request to the main repository.
5. Ensure that your code is well-documented, tested, and follows the project's coding standards.