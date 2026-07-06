# DocuFree - AI-Powered Document Summarization and OCR Platform
DocuFree is an innovative platform that leverages AI and machine learning to provide accurate document summarization and optical character recognition (OCR) capabilities, streamlining document processing and analysis.

## 🏗️ Architecture
The DocuFree platform consists of a backend server built using Node.js and Express.js, which handles document uploads, processing, and summarization. The backend utilizes various libraries, including `@google/generative-ai` and `@xenova/transformers`, to perform AI-powered document summarization. Additionally, the platform employs `libreoffice-convert` and `pdf-lib` to handle document conversions. The frontend is built using React and Radix UI, providing a user-friendly interface for uploading documents and viewing summarized results.

## ⚙️ Tech Stack
The following technologies are used in the DocuFree platform:
* Node.js
* Express.js
* `@google/generative-ai`
* `@xenova/transformers`
* `libreoffice-convert`
* `pdf-lib`
* React
* Radix UI
* `axios`
* `bcryptjs`
* `cors`
* `multer`
* `sharp`
* `mime-types`

## 📁 Project Structure
The project is organized into the following key files and folders:
* `backend`: Contains the server-side code, including the Express.js server, document processing logic, and AI-powered summarization models.
* `backend/models`: Defines the database models for documents, summaries, and users.
* `backend/ocr`: Handles optical character recognition (OCR) using `tesseract.js`.
* `backend/results`: Stores the summarized results of processed documents.
* `frontend`: Contains the client-side code, including the React application and Radix UI components.
* `package.json`: Defines the project dependencies and scripts.

## 🚀 Getting Started
To set up the DocuFree platform, follow these steps:
1. Clone the repository: `git clone https://github.com/snehalogic/DocuFree.git`
2. Install dependencies: `npm install`
3. Start the backend server: `npm run start`
4. Start the frontend development server: `npm run dev`
5. Access the platform at `http://localhost:3000`

## 📖 Usage
To use the DocuFree platform, follow these steps:
1. Upload a document using the file upload interface.
2. Select the document type and processing options.
3. Click the "Process" button to initiate document summarization and OCR.
4. View the summarized results in the dashboard.

## 🔑 Environment Variables
The following environment variables are required:
* `NODE_ENV`: Set to `development` or `production`
* `PORT`: Set to the desired port number (default: 3000)
* `DATABASE_URL`: Set to the database connection URL

## 🤝 Contributing
To contribute to the DocuFree platform, please follow these steps:
1. Fork the repository: `git fork https://github.com/snehalogic/DocuFree.git`
2. Create a new branch: `git branch feature/your-feature`
3. Commit your changes: `git commit -m "Your commit message"`
4. Push your changes: `git push origin feature/your-feature`
5. Submit a pull request to the main repository.