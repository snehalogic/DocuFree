# DocuFree: AI-Powered Document Processing Web Application
DocuFree is an innovative web application that leverages modern AI technologies to extract, summarize, translate, convert, interact with, and listen to documents, revolutionizing the way we work with documents.

## 🏗️ Architecture
The DocuFree system consists of a full-stack architecture, comprising a React-based frontend and a Node.js-based backend. The frontend handles user interactions, while the backend processes document-related tasks using AI-powered services. The system utilizes a MongoDB database to store user data and document metadata. The backend is divided into two main components: the main backend and the file-backend. The main backend handles user authentication, document uploading, and AI-powered services such as summarization, translation, and OCR. The file-backend is responsible for handling file-related operations, including file extraction and conversion.

## ⚙️ Tech Stack
The DocuFree project employs a wide range of technologies, including:
* Frontend: React, Radix UI, JavaScript, TypeScript
* Backend: Node.js, Express.js, MongoDB, Mongoose, Multer, Cors
* AI-Powered Services: Google Generative AI, Tesseract OCR
* Databases: MongoDB
* Python Libraries: used in the file-backend for file extraction and conversion
* Dependencies: axios, bcryptjs, dotenv, fs-extra, jsonwebtoken, libreoffice-convert, mammoth, mime-types, pdf-lib, pdf-parse, sharp

## 📁 Project Structure
The project is divided into two main folders: backend and file-backend.
* Backend:
	+ `server.js`: the main entry point of the backend
	+ `routes`: contains route handlers for user authentication, document uploading, and AI-powered services
	+ `models`: defines MongoDB schema for user data and document metadata
	+ `services`: contains functions for AI-powered services such as summarization and translation
	+ `middleware`: includes authentication middleware
	+ `utils`: contains utility functions for file extraction and conversion
* File-Backend:
	+ `app.py`: the main entry point of the file-backend
	+ `package.json`: lists dependencies for the file-backend

## 🚀 Getting Started
### Frontend Setup
1. Clone the repository and navigate to the frontend folder
2. Run `npm install` to install dependencies
3. Run `npm start` to start the frontend development server
### Backend Setup
1. Clone the repository and navigate to the backend folder
2. Run `npm install` to install dependencies
3. Create a `.env` file and add required environment variables (see below)
4. Run `npm start` to start the backend development server
5. Navigate to the file-backend folder and run `npm install` to install dependencies
6. Run `node app.py` to start the file-backend server

## 📖 Usage
1. Upload a document to the application
2. Select the desired AI-powered service (e.g., summarization, translation)
3. The application will process the document and display the results
Examples:
* Upload a PDF document and select the summarization service
* The application will extract the text from the PDF and summarize it using the Google Generative AI model

## 🔑 Environment Variables
The following environment variables are required:
* `MONGO_URI`: the MongoDB connection string
* `GEMINI_API_KEY`: the Google Generative AI API key
* `PORT`: the port number for the backend server
* `FILE_BACKEND_PORT`: the port number for the file-backend server

## 🤝 Contributing
To contribute to the DocuFree project, please follow these steps:
1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Implement your changes and commit them
4. Open a pull request against the main branch
5. Wait for review and approval from the maintainers
Note: Please ensure that your code adheres to the project's coding standards and includes proper documentation and testing.