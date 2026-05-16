# **InboxPilot: AI Email Assistant SaaS**

## **University Full-Stack Software Engineering Project Document**

**Project Name:** InboxPilot: AI Email Assistant SaaS  
**Project Type:** Full-stack SaaS web application  
**Main Domain:** Email productivity, artificial intelligence, task management  
**Frontend:** React.js  
**Backend:** Node.js with Express.js  
**Database:** MongoDB  
**Authentication:** JWT and Google OAuth 2.0  
**Email API:** Gmail API with read-only permission  
**AI API:** Gemini API  
**Styling:** Tailwind CSS  
**Programming Language:** JavaScript  
**Important Safety Boundary:** The system does not automatically send emails.

# **Table of Contents**

| No. | Section | Page |
| ----- | :---- | ----: |
|  | Executive Summary | 3 |
| 1 | 1\. Introduction | 4 |
| 2 | 2\. Problem Statement | 4 |
| 3 | 3\. Objectives | 4 |
| 4 | 4\. Scope | 5 |
| 5 | 5\. Target Users | 6 |
| 6 | 6\. Functional Requirements | 7 |
| 7 | 7\. Non-functional Requirements | 9 |
| 8 | 8\. Technology Stack | 9 |
| 9 | 9\. Software Engineering Approach | 10 |
| 10 | 10\. System Architecture | 13 |
| 11 | 11\. Database Design | 14 |
| 12 | 12\. API Design | 16 |
| 13 | 13\. AI Prompt Design | 17 |
| 14 | 14\. UML Diagrams Explanation and PlantUML Code | 19 |
| 15 | 15\. HCI/UI/UX Design | 26 |
| 16 | 16\. Security and Privacy | 30 |
| 17 | 17\. Testing Plan | 31 |
| 18 | 18\. Limitations | 32 |
| 19 | 19\. Future Improvements | 32 |
| 20 | 20\. Final Presentation Demo Flow | 33 |
| 21 | 21\. Development Roadmap | 34 |
| 22 | 22\. Conclusion | 34 |
| 23 | 23\. References | 35 |
| A | Appendix A: Submission Checklist | 35 |

# **Executive Summary**

InboxPilot is a proposed full-stack SaaS web application that helps users manage Gmail messages more efficiently. The system allows users to register, log in, connect Gmail with Google OAuth, view recent emails, summarize selected emails using the Gemini API, extract tasks and deadlines, and generate AI suggested replies in different tones. The generated reply is not sent automatically. It is shown to the user as an AI suggested reply so that the user can review, edit, copy, or delete it.

This project is designed to be realistic for a university full-stack software engineering project. It uses a JavaScript-only technology stack and focuses on a clear minimum viable product. The system demonstrates important software engineering activities, including requirement analysis, system architecture, database design, API design, UML modeling, security planning, testing, and HCI/UI/UX design.

# **1\. Introduction**

Email remains one of the most common communication tools for students, freelancers, small business owners, and job seekers. However, users often receive long and unstructured email messages that require time to read carefully. Important information such as deadlines, meeting details, assignment requirements, client instructions, and payment updates can be hidden inside long paragraphs.

InboxPilot is proposed as an AI-powered email assistant that improves email productivity while keeping the user in control. The application reads Gmail messages only after the user gives permission through Google OAuth. After an email is selected by the user, the application can summarize the message, extract tasks, identify possible deadlines, classify urgency, and generate an AI suggested reply. The application does not send emails automatically because automatic sending could create privacy, trust, and safety risks.

The project is suitable for a school or university full-stack project because it combines frontend development, backend API development, database modeling, third-party API integration, artificial intelligence integration, authentication, and HCI design. It is also realistic because the MVP is limited to essential features that can be implemented within a semester.

# **2\. Problem Statement**

Many users receive too many emails every day. Some emails are short and simple, but others contain several paragraphs, attachments, dates, tasks, and instructions. Users may waste time reading long messages or may miss important information.

The main problems are:

* Users spend too much time reading long emails.

* Important deadlines may be hidden inside email content.

* Users may forget to reply to important messages.

* Writing polite and professional replies takes time.

* Students need a quick way to identify assignment deadlines and professor instructions.

* Freelancers need a simple way to convert client emails into tasks.

* Existing email applications are powerful, but beginners may need a simpler AI-assisted workflow.

InboxPilot addresses these problems by providing a focused email assistant that summarizes messages, extracts tasks, and generates AI suggested replies. The system is intentionally designed as a helper, not as an automatic email agent. Final control remains with the user.

# **3\. Objectives**

## **3.1 General Objective**

The general objective of InboxPilot is to develop a full-stack AI-powered email assistant that helps users understand, organize, and respond to Gmail messages efficiently while maintaining user permission, privacy, and manual control.

## **3.2 Specific Objectives**

The specific objectives are:

1. To allow users to register and log in securely.

2. To protect private routes using JWT authentication.

3. To allow users to connect Gmail using Google OAuth 2.0.

4. To use read-only Gmail permission only.

5. To fetch and display recent Gmail emails.

6. To allow users to view email details.

7. To summarize selected emails using the Gemini API.

8. To extract tasks, deadlines, and priorities from email content.

9. To generate AI suggested replies based on selected tone and user instruction.

10. To save summaries, tasks, and AI suggested replies in MongoDB.

11. To provide a clean dashboard for email and task management.

12. To apply software engineering principles through modular design and UML diagrams.

13. To apply HCI principles to make the interface simple, clear, and safe.

14. To test authentication, Gmail integration, AI features, database operations, and UI behavior.

# **4\. Scope**

## **4.1 Project Scope**

The project scope is limited to a school-level MVP. The system focuses on core functionality instead of enterprise-level automation. The application should be able to demonstrate a complete full-stack workflow from user login to Gmail reading, AI processing, database saving, and UI display.

## **4.2 Included Features**

The included features are:

* User registration, login, logout, and profile view.

* JWT authentication for protected application pages.

* Google OAuth Gmail connection.

* Gmail read-only email access.

* Recent email listing.

* Email detail view.

* AI email summarization.

* AI task extraction.

* AI suggested reply generation.

* Task management.

* AI suggested reply management.

* Dashboard summary cards.

* Settings page for Gmail connection status and account options.

* Software engineering documentation and UML diagrams.

* HCI/UI/UX design explanation.

## **4.3 Excluded Features**

The excluded features are:

* Auto-send email.

* Sending email through Gmail API.

* Deleting Gmail messages.

* Archiving Gmail messages.

* Modifying labels or marking messages as read/unread.

* Calendar integration.

* Payment subscription system.

* Team collaboration.

* Mobile application.

* Browser extension.

* Full inbox synchronization.

## **4.4 MVP Boundary**

The MVP should fetch only a limited number of recent emails, such as the latest 10 to 20 messages. The user chooses one email at a time for AI processing. This keeps the project manageable and reduces unnecessary processing cost.

# **5\. Target Users**

## **5.1 Primary Users**

The primary users are university students and freelancers.

Students may receive emails from professors, university offices, classmates, or learning platforms. They need to identify deadlines, exam changes, class announcements, and assignment instructions.

Freelancers may receive emails from clients, project managers, or payment services. They need to identify project requirements, revision requests, meeting times, and deadlines.

## **5.2 Secondary Users**

Secondary users include small business owners, job seekers, and junior employees. These users may also benefit from summarization, task extraction, and professional AI suggested reply generation.

## **5.3 User Personas**

| Persona | Description | Main Need |
| :---- | :---- | :---- |
| University Student | Receives professor emails, assignment instructions, and exam announcements. | Quickly understand email meaning and extract academic deadlines. |
| Freelancer | Receives client requests, revisions, and project updates. | Convert emails into tasks and create professional responses. |
| Job Seeker | Receives interview invitations and recruiter messages. | Identify important dates and generate polite AI suggested replies. |
| Small Business Owner | Receives customer and supplier messages. | Prioritize messages and avoid missing important tasks. |

# **6\. Functional Requirements**

Functional requirements describe what the system must do.

## **6.1 User Authentication Module**

The system shall:

* Allow a user to register with name, email, and password.

* Validate required fields during registration.

* Hash passwords before saving them.

* Allow a user to log in with email and password.

* Return a JWT after successful login.

* Allow a user to log out.

* Protect dashboard, inbox, tasks, AI suggested replies, and settings pages.

* Allow a logged-in user to view profile information.

## **6.2 Gmail Connection Module**

The system shall:

* Provide a Connect Gmail button.

* Redirect the user to the Google OAuth consent screen.

* Request Gmail read-only permission.

* Receive an authorization code from Google after permission is approved.

* Exchange the authorization code for tokens in the backend.

* Store Gmail account information securely.

* Allow the user to disconnect Gmail.

The system shall not request Gmail permission for sending, deleting, archiving, or modifying email.

## **6.3 Email Management Module**

The system shall:

* Fetch recent emails from Gmail API.

* Display sender, subject, date, snippet, and read/unread status.

* Allow a user to open an email detail page.

* Display full sender information, subject, date, and email body.

* Save selected email metadata and body text to MongoDB when needed.

* Allow a user to refresh the inbox.

## **6.4 AI Summary Module**

The system shall:

* Allow a user to click Summarize Email.

* Send the selected email body to the backend.

* Send a controlled prompt to the Gemini API.

* Return a short summary, important points, urgency level, and category.

* Save the AI summary result in MongoDB.

* Display the summary in a clear panel.

## **6.5 AI Task Extraction Module**

The system shall:

* Allow a user to click Extract Tasks.

* Send email content to the Gemini API through the backend.

* Extract real tasks only when they are supported by the email content.

* Extract deadline only if it is mentioned in the email.

* Assign priority as low, medium, or high.

* Save extracted tasks in MongoDB.

* Allow a user to view, edit, delete, and mark tasks as completed.

## **6.6 AI Suggested Reply Module**

The system shall:

* Allow a user to select a reply tone.

* Allow a user to write a short instruction for the reply.

* Generate an AI suggested reply using Gemini API.

* Save the AI suggested reply in MongoDB.

* Allow the user to copy the AI suggested reply text.

* Allow the user to delete or regenerate the AI suggested reply.

The system shall not send the generated reply automatically.

## **6.7 Dashboard Module**

The system shall display:

* Number of recent emails.

* Number of pending tasks.

* Number of high-priority tasks.

* Number of saved AI suggested replies.

* Quick links to inbox, tasks, AI suggested replies, and settings.

## **6.8 Settings Module**

The system shall allow the user to:

* View profile information.

* View Gmail connection status.

* Disconnect Gmail.

* Manage preferred reply tone.

* Delete saved data as a future improvement or optional feature.

# **7\. Non-functional Requirements**

Non-functional requirements describe how well the system should work.

| Category | Requirement | Explanation |
| :---- | :---- | :---- |
| Usability | The interface should be simple and easy to learn. | Users should understand the main workflow without training. |
| Security | The system should protect passwords, tokens, and API keys. | Passwords should be hashed and secrets should stay in environment variables. |
| Privacy | Gmail access should be read-only. | The app should not send, delete, or modify email. |
| Performance | Common pages should load quickly. | The MVP should fetch a limited number of emails to reduce waiting time. |
| Reliability | The system should handle API errors. | Gmail or AI API failures should show clear messages. |
| Maintainability | Code should be modular. | Routes, controllers, services, and models should be separated. |
| Scalability | The design should allow future features. | Calendar integration or Outlook support can be added later. |
| Compatibility | The UI should work on common desktop browsers. | Chrome, Edge, and Firefox should be supported for presentation. |
| Accessibility | Text should be readable and navigation should be clear. | UI should use good contrast, labels, and keyboard-friendly components. |

# **8\. Technology Stack**

## **8.1 Stack Summary**

| Layer | Technology | Purpose |
| :---- | :---- | :---- |
| Frontend | React.js | Build component-based user interface. |
| Styling | Tailwind CSS | Create responsive UI quickly with utility classes. |
| Backend | Node.js \+ Express.js | Create REST API endpoints and backend logic. |
| Database | MongoDB | Store users, Gmail accounts, emails, tasks, summaries, and AI suggested replies. |
| Authentication | JWT | Protect private API routes after login. |
| OAuth | Google OAuth 2.0 | Allow the user to grant Gmail read-only permission. |
| Email API | Gmail API | Fetch recent Gmail messages after permission. |
| AI API | Gemini API | Summarize emails, extract tasks, and generate AI suggested replies. |
| Language | JavaScript | Keep frontend and backend in one language for a school project. |

## **8.2 Reason for Technology Choices**

React.js is selected because it supports reusable components such as EmailCard, TaskCard, AISuggestedReplyCard, Navbar, and Sidebar. Express.js is selected because it provides a simple way to build REST APIs using JavaScript. MongoDB is selected because email content, AI responses, and task data are document-like and can be stored naturally as JSON-style documents. Tailwind CSS is selected because it allows fast UI development with consistent spacing, typography, and responsive design.

Google OAuth is required because the application should not ask users for Gmail passwords. Instead, the user grants permission through Google’s authorization process. Gmail API is used only with read-only access. Gemini API is used because the project requires AI features such as summarization, task extraction, and AI suggested reply generation.

# **9\. Software Engineering Approach**

## **9.1 Development Model**

The recommended development model for this project is an iterative waterfall model. The project still follows clear phases, but each phase can be reviewed and improved before final submission.

The main phases are:

1. Requirement analysis.

2. System design.

3. Database and API design.

4. Frontend implementation.

5. Backend implementation.

6. Gmail and AI integration.

7. Testing and debugging.

8. Documentation and presentation.

This model is suitable for a university project because it is easy to explain in a report and still flexible enough for improvements.

## **9.2 Software Engineering Principles Used**

| Principle | Application in InboxPilot |
| :---- | :---- |
| Separation of concerns | React handles UI, Express handles backend logic, MongoDB stores data, and services handle Gmail/AI integration. |
| Modularity | The system is divided into authentication, Gmail, email, AI, task, AI suggested reply, dashboard, and settings modules. |
| Least privilege | The Gmail integration requests only read-only permission. |
| User control | AI replies are only suggestions and are never sent automatically. |
| Reusability | UI components and backend services can be reused across pages and routes. |
| Maintainability | Controllers, routes, models, middleware, and services are stored in separate folders. |
| Error handling | API failures should return clear messages to the frontend. |
| Testability | Each module can be tested separately using unit and integration tests. |

## **9.3 Requirement Traceability Matrix**

This matrix shows how project objectives connect to system features and tests.

| Objective | Feature | Example Test |
| :---- | :---- | :---- |
| Secure login | Authentication module | Register, login, access protected dashboard. |
| Gmail connection | Google OAuth module | Connect Gmail and store account status. |
| Read emails | Email management module | Fetch and display 10 recent emails. |
| Summarize email | AI summary module | Generate summary from selected email body. |
| Extract tasks | AI task module | Extract task title, priority, and deadline. |
| Generate reply | AI suggested reply module | Generate AI suggested reply with selected tone. |
| Save outputs | MongoDB models | Confirm summary, task, and AI suggested reply are stored. |
| Improve usability | HCI design | User completes main workflow with few errors.  |

## **9.4 Project Modules**

| Module | Main Responsibility |
| :---- | :---- |
| User Management Module | Register, login, logout, and profile. |
| Gmail Integration Module | OAuth connection and Gmail API access. |
| Email Management Module | Email list, email detail, and email storage. |
| AI Summary Module | Generate and save email summaries. |
| Task Extraction Module | Extract, save, and manage tasks. |
| AI Suggested Reply Module | Generate, save, copy, delete, and regenerate AI suggested replies. |
| Dashboard Module | Display overview statistics. |
| Settings Module | Manage Gmail connection and user preferences. |

## **9.5  Folder Structure**

inboxpilot/  
  client/  
    src/  
      components/  
        Navbar.jsx  
        Sidebar.jsx  
        EmailCard.jsx  
        TaskCard.jsx  
        AISuggestedReplyCard.jsx  
      pages/  
        Login.jsx  
        Register.jsx  
        Dashboard.jsx  
        Inbox.jsx  
        EmailDetail.jsx  
        Tasks.jsx  
        AISuggestedReplies.jsx  
        Settings.jsx  
      services/  
        api.js  
      App.jsx  
      main.jsx  
  server/  
    controllers/  
      authController.js  
      gmailController.js  
      emailController.js  
      aiController.js  
      taskController.js  
      aiSuggestedReplyController.js  
    models/  
      User.js  
      GmailAccount.js  
      Email.js  
      Task.js  
      AISuggestedReply.js  
    routes/  
      authRoutes.js  
      gmailRoutes.js  
      emailRoutes.js  
      aiRoutes.js  
      taskRoutes.js  
      aiSuggestedReplyRoutes.js  
    middleware/  
      authMiddleware.js  
    services/  
      gmailService.js  
      aiService.js  
      encryptionService.js  
    config/  
      db.js  
      googleOAuth.js  
    server.js

# **10\. System Architecture**

## **10.1 Architecture Overview**

InboxPilot uses a three-layer architecture:

1. Presentation layer: React frontend.

2. Application layer: Node.js and Express.js backend.

3. Data layer: MongoDB database.

The backend also communicates with two external services: Gmail API and Gemini API.

## **10.2 Architecture Flow**

The general system flow is:

1. The user opens the React web application.

2. The user registers or logs in.

3. The backend returns a JWT.

4. The user connects Gmail through Google OAuth.

5. The backend stores Gmail account data securely.

6. The backend fetches recent emails using Gmail API.

7. The frontend displays emails.

8. The user selects an email and requests an AI action.

9. The backend sends controlled content to Gemini API.

10. Gemini returns summary, task list, or AI suggested reply.

11. The backend saves the result in MongoDB.

12. The frontend displays the result to the user.

## **10.3 Text Architecture Diagram**

User Browser  
  |  
  v  
React.js Frontend  
  |  
  | HTTPS REST API requests  
  v  
Node.js \+ Express.js Backend  
  |        |          |  
  |        |          \+--\> Gemini API  
  |        \+------------\> Gmail API through Google OAuth  
  |  
  v  
MongoDB Database

## **10.4 Layer Responsibilities**

| Layer | Responsibility |
| :---- | :---- |
| React Frontend | User interface, page navigation, forms, dashboard, email display, AI result panels. |
| Express Backend | Authentication, API routes, validation, Gmail API calls, Gemini API calls, database operations. |
| MongoDB Database | Persistent storage for users, Gmail accounts, emails, summaries, tasks, and AI suggested replies. |
| Gmail API | Provides recent Gmail messages after the user grants permission. |
| Gemini API | Processes email text and returns AI-generated results. |

# **11\. Database Design**

## **11.1 MongoDB Collections**

MongoDB is used because it stores JSON-like documents. This is suitable for email bodies, AI summaries, lists of important points, extracted tasks, and generated AI suggested replies.

## **11.2 User Collection**

{  
  \_id: ObjectId,  
  name: String,  
  email: String,  
  passwordHash: String,  
  preferredTone: String,  
  createdAt: Date,  
  updatedAt: Date  
}

## **11.3 GmailAccount Collection**

{  
  \_id: ObjectId,  
  userId: ObjectId,  
  googleEmail: String,  
  accessTokenEncrypted: String,  
  refreshTokenEncrypted: String,  
  scope: String,  
  connectedAt: Date,  
  updatedAt: Date  
}

## **11.4 Email Collection**

{  
  \_id: ObjectId,  
  userId: ObjectId,  
  gmailMessageId: String,  
  threadId: String,  
  sender: String,  
  subject: String,  
  snippet: String,  
  bodyText: String,  
  receivedAt: Date,  
  isRead: Boolean,  
  createdAt: Date  
}

## **11.5 EmailSummary Collection**

{  
  \_id: ObjectId,  
  userId: ObjectId,  
  emailId: ObjectId,  
  summary: String,  
  importantPoints: \[String\],  
  urgency: String,  
  category: String,  
  createdAt: Date  
}

## **11.6 Task Collection**

{  
  \_id: ObjectId,  
  userId: ObjectId,  
  emailId: ObjectId,  
  title: String,  
  description: String,  
  deadline: Date,  
  priority: String,  
  status: String,  
  createdAt: Date,  
  updatedAt: Date  
}

## **11.7 AISuggestedReply Collection**

{  
  \_id: ObjectId,  
  userId: ObjectId,  
  emailId: ObjectId,  
  tone: String,  
  instruction: String,  
  suggestedReplyText: String,  
  createdAt: Date  
}

## **11.8 Collection Relationships**

| Relationship | Meaning |
| :---- | :---- |
| User has one GmailAccount | Each user connects one Gmail account in MVP. |
| User has many Emails | A user can fetch and store multiple recent emails. |
| Email has one or many EmailSummaries | A user may regenerate summaries. |
| Email has many Tasks | One email can contain multiple action items. |
| Email has many AISuggestedReplies | A user can generate AI suggested replies in different tones. |

# **12\. API Design**

The backend exposes REST API endpoints. All private routes require a valid JWT token in the request header.

## **12.1 Authentication API**

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| POST | /api/auth/register | Create a new user account. |
| POST | /api/auth/login | Log in and return a JWT. |
| GET | /api/auth/profile | Return logged-in user profile. |
| POST | /api/auth/logout | End user session on frontend side. |

## **12.2 Gmail API Routes**

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| GET | /api/gmail/connect | Generate Google OAuth URL. |
| GET | /api/gmail/callback | Handle OAuth callback code. |
| GET | /api/gmail/emails | Fetch recent Gmail emails. |
| GET | /api/gmail/emails/:id | Return selected email detail. |
| POST | /api/gmail/disconnect | Disconnect Gmail account. |

## **12.3 AI API Routes**

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| POST | /api/ai/summarize/:emailId | Summarize selected email. |
| POST | /api/ai/extract-tasks/:emailId | Extract tasks from selected email. |
| POST | /api/ai/generate-reply/:emailId | Generate AI Suggested Reply. |

## **12.4 Task API Routes**

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| GET | /api/tasks | Get user tasks. |
| POST | /api/tasks | Create a manual task. |
| PUT | /api/tasks/:id | Update task status or content. |
| DELETE | /api/tasks/:id | Delete a task. |

## **12.5 AI Suggested Reply API Routes**

| Method | Endpoint | Purpose |
| :---- | :---- | :---- |
| GET | /api/suggested-replies | Get saved AI suggested replies. |
| POST | /api/suggested-replies | Save an AI suggested reply. |
| DELETE | /api/suggested-replies/:id | Delete an AI suggested reply. |

## **12.6 Example API Request and Response**

### **Request**

POST /api/ai/summarize/64abc123  
Authorization: Bearer \<jwt\_token\>  
Content-Type: application/json

### **Response**

{  
  "summary": "The professor changed the exam time to Friday at 9:00 AM.",  
  "importantPoints": \[  
    "Exam is on Friday",  
    "Room B203",  
    "Bring student ID"  
  \],  
  "urgency": "high",  
  "category": "school"  
}

# **13\. AI Prompt Design**

## **13.1 Email Summary Prompt**

You are an AI email assistant.  
Summarize the following email for a busy user.

Return the result in JSON format:  
{  
  "summary": "",  
  "importantPoints": \[\],  
  "urgency": "low | medium | high",  
  "category": "school | work | finance | personal | other"  
}

Rules:  
\- Do not invent information.  
\- Only use information from the email.  
\- Keep the summary short and clear.

Email:  
{{emailBody}}

## **13.2 Task Extraction Prompt**

You are an AI task extractor.  
Extract only real tasks or deadlines from the email.

Return JSON:  
{  
  "tasks": \[  
    {  
      "title": "",  
      "description": "",  
      "deadline": "",  
      "priority": "low | medium | high"  
    }  
  \]  
}

Rules:  
\- Do not create tasks if no task exists.  
\- Do not guess deadlines.  
\- If no deadline is mentioned, use null.

Email:  
{{emailBody}}

## **13.3 Reply Generator Prompt**

You are an AI email reply assistant.  
Write a reply to the email.

Tone: {{tone}}  
User instruction: {{instruction}}

Rules:  
\- Be polite and natural.  
\- Do not add fake details.  
\- Do not promise something the user did not mention.  
\- Do not send the email.  
\- Return only AI suggested reply text.

Original email:  
{{emailBody}}

# **14\. UML Diagrams Explanation and PlantUML Code**

This section provides the UML diagrams required for software engineering documentation. The diagrams are written in PlantUML so they can be copied into PlantUML, diagrams.net, or compatible tools to generate images.

## **14.1 Use Case Diagram**

### **Easy Explanation**

The use case diagram shows who interacts with the system and what each actor can do. In this project, the main actor is the User. The user can register, log in, connect Gmail, view emails, summarize emails, extract tasks, generate AI suggested replies, manage tasks, manage AI suggested replies, and log out. Google Gmail API and Gemini API are external systems that support the application.

### **What This Diagram Proves**

This diagram proves that the system has a clear user workflow and that external services are used only for specific purposes. Gmail API provides email data, while Gemini API provides AI processing.

### **PlantUML Code**

## **14.2 Class Diagram**

### **Easy Explanation**

The class diagram shows the main objects of the system and how they are connected. A User can have one GmailAccount and many Emails. Each Email can have summaries, tasks, and AI suggested replies. Service classes such as AuthService, GmailService, and AIService represent backend logic.

### **What This Diagram Proves**

This diagram proves that the backend design is organized. Data models are separated from service logic. 

This makes the project easier to maintain and test.

## 

## **14.3 Sequence Diagram: Connect Gmail**

### **Easy Explanation**

This sequence diagram shows the steps when a user connects Gmail. The user clicks Connect Gmail in the frontend. The backend creates a Google OAuth URL and redirects the user to Google. After the user approves permission, Google sends an authorization code back to the backend. The backend exchanges the code for tokens and saves them securely.

### **What This Diagram Proves**

This diagram proves that the application does not ask for the user’s Gmail password. Gmail access is granted through Google’s OAuth process.

## 

## **14.4 Sequence Diagram: Summarize Email**

### **Easy Explanation**

This sequence diagram shows the process when a user summarizes an email. The user clicks Summarize Email. The frontend sends the selected email ID to the backend. The backend reads the email from MongoDB, sends the email text to Gemini API, saves the result, and returns it to the frontend.

### **What This Diagram Proves**

This diagram proves that AI processing is controlled by the backend. The frontend does not directly expose the Gemini API key.

## 

## **14.5 Activity Diagram**

### **Easy Explanation**

The activity diagram shows the overall workflow from login to AI result display. It is like a step-by-step map of what the user does and what the system does.

### **What This Diagram Proves**

This diagram proves that the system has a clear process and decision points. The user can choose between summarizing, extracting tasks, or generating an AI suggested reply.

 

## **14.6 ERD / Database Diagram**

### **Easy Explanation**

The ERD shows how database collections are related. Even though MongoDB is a NoSQL database, this ERD is useful because it explains data relationships clearly for software engineering documentation.

### **What This Diagram Proves**

This diagram proves that the database design supports the main application workflow. It shows how users connect to Gmail accounts, emails, summaries, tasks, and AI suggested replies.

![][image1] 

# **15\. HCI/UI/UX Design**

## **15.1 HCI Goal**

The HCI goal of InboxPilot is to make email processing easier, safer, and faster for users who may not be highly technical. The interface should reduce cognitive load by showing only the actions needed for the current task.

## **15.2 HCI Principles Applied**

| HCI Principle | Application in InboxPilot |
| :---- | :---- |
| Simplicity | Each page focuses on one main purpose, such as viewing emails or managing tasks. |
| Visibility | Important actions such as Summarize, Extract Tasks, Generate Reply, and Copy AI Suggested Reply are clearly visible. |
| Feedback | The system shows loading indicators, success messages, and error messages. |
| Consistency | Buttons, colors, spacing, icons, and page layout remain consistent. |
| User control | The app never sends email automatically. The user reviews all AI suggested replies. |
| Error prevention | The app warns before disconnecting Gmail and blocks empty reply instructions. |
| Recognition over recall | Users can select actions from visible buttons instead of remembering commands. |
| Accessibility | Text size, color contrast, labels, and keyboard navigation should be considered. |

## **15.3 User-Centered Design Explanation**

InboxPilot is designed around the real tasks of students and freelancers. A student wants to know what an email means, what deadline exists, and whether a reply is needed. A freelancer wants to understand client requests and convert them into tasks. For this reason, the Email Detail page places the email body and AI tools in the same view.

The system avoids complicated automation. It does not automatically send replies because users may not fully trust an AI-generated response. Manual review improves user confidence and prevents accidental communication mistakes.

## **15.4 Main Navigation Structure**

The main navigation includes:

* Dashboard

* Inbox

* Tasks

* AI Suggested Replies

* Settings

* Logout

This navigation is simple and predictable. Users can move from email reading to task management without searching through many menus.

## **15.5 Page-by-Page UI Design**

### **Landing Page**

The landing page introduces the product. It should contain a short headline, feature overview, how-it-works section, and login/register buttons.

### **Login and Register Pages**

The authentication pages should contain simple forms with clear labels. Error messages should appear near the relevant form fields.

### **Dashboard Page**

The dashboard gives a quick overview. It should contain cards for recent emails, pending tasks, high-priority tasks, and saved AI suggested replies.

### **Inbox Page**

The inbox page shows recent emails. Each email item should display sender, subject, date, and short snippet. The user can click an email to open details.

### **Email Detail Page**

The email detail page is the most important page. It should show the email content and three main AI actions: Summarize Email, Extract Tasks, and Generate AI Suggested Reply. The result should appear in clearly separated panels.

### **Tasks Page**

The tasks page shows extracted tasks. Each task should show title, deadline, priority, and status. Users should be able to mark tasks as completed, edit tasks, delete tasks, and filter by priority.

### **AI Suggested Replies page**

The AI Suggested Replies page shows generated AI suggested replies. Users should be able to copy, delete, or regenerate an AI suggested reply. The tone should be visible so users know why an AI suggested reply sounds formal, friendly, short, professional, or apologetic.

### **Settings Page**

The settings page shows user profile information and Gmail connection status. It should also include a Disconnect Gmail button with confirmation.

## **15.6 UI Component Design**

| Component | Purpose |
| :---- | :---- |
| Navbar | Shows application name and user actions. |
| Sidebar | Provides navigation to dashboard, inbox, tasks, AI suggested replies, and settings. |
| EmailCard | Displays one email preview. |
| SummaryPanel | Displays AI summary, points, urgency, and category. |
| TaskCard | Displays one extracted task. |
| AISuggestedReplyCard | Displays generated AI suggested reply and copy button. |
| LoadingSpinner | Shows that Gmail or AI processing is in progress. |
| ErrorAlert | Shows clear error messages. |
| EmptyState | Explains what to do when no emails, tasks, or AI suggested replies exist. |

## **15.7 Usability Scenarios**

### **Scenario 1: Student Summarizes Professor Email**

1. Student logs in.

2. Student connects Gmail.

3. Student opens an email from a professor.

4. Student clicks Summarize Email.

5. System displays summary, important points, and urgency.

6. Student understands the email quickly.

### **Scenario 2: Freelancer Extracts Client Tasks**

1. Freelancer opens a client email.

2. Freelancer clicks Extract Tasks.

3. System creates tasks from the client request.

4. Freelancer marks tasks as pending and tracks deadlines.

### **Scenario 3: User Generates AI suggested reply**

1. User opens an email.

2. User selects Formal tone.

3. User enters instruction such as “confirm that I received the update”.

4. System generates an AI suggested reply.

5. User reviews and copies the AI suggested reply manually.

## **15.8 Accessibility Considerations**

The interface should:

* Use readable font sizes.

* Maintain sufficient color contrast.

* Provide labels for input fields.

* Allow keyboard navigation for forms and buttons.

* Avoid relying only on color to show priority.

* Use clear text messages for errors.

* Provide empty state instructions.

## **15.9 HCI Evaluation Plan**

HCI evaluation can be done using task-based testing. A small group of users can be asked to complete common tasks:

1. Register and log in.

2. Connect Gmail.

3. Open an email.

4. Generate a summary.

5. Extract a task.

6. Generate an AI suggested reply.

7. Copy the AI suggested reply.

8. Mark a task as completed.

The evaluation should measure completion rate, user errors, time taken, and user satisfaction. Feedback should be used to improve layout, labels, buttons, and error messages.

# **16\. Security and Privacy**

## **16.1 Security Principles**

The system should apply the following security principles:

* Store passwords as hashes, not plain text.

* Keep API keys in environment variables.

* Keep Gmail tokens on the backend only.

* Encrypt Gmail tokens before saving them.

* Use HTTPS in production.

* Verify JWT tokens on protected routes.

* Validate input data on the backend.

* Use read-only Gmail permission.

* Do not automatically send email.

## **16.2 Gmail Privacy Boundary**

InboxPilot only reads Gmail emails after the user gives permission. The system should request the minimum necessary permission for the MVP. The user should clearly see Gmail connection status and should be able to disconnect Gmail.

## **16.3 AI Privacy Boundary**

The backend should send only the selected email content to the Gemini API when the user requests an AI action. The system should not automatically process the entire inbox.

## **16.4 Important Security Controls**

| Area | Control |
| :---- | :---- |
| Passwords | Hash with bcrypt before storage. |
| JWT | Set expiration time and verify on protected routes. |
| Gmail tokens | Encrypt before saving in MongoDB. |
| API keys | Store in .env and never expose to frontend. |
| OAuth scopes | Use read-only Gmail permission. |
| AI output | Require user review before using AI suggested replies. |
| Error messages | Avoid exposing sensitive technical details. |

# **17\. Testing Plan**

## **17.1 Testing Strategy**

The testing strategy includes unit testing, integration testing, API testing, UI testing, usability testing, and security testing. Testing is important because the system depends on authentication, third-party APIs, AI responses, and database operations.

## **17.2 Test Types**

| Test Type | Purpose | Example |
| :---- | :---- | :---- |
| Unit Testing | Test small functions separately. | Test password hashing and JWT generation. |
| Integration Testing | Test multiple modules together. | Test login and protected route access. |
| API Testing | Test backend endpoints. | Test /api/ai/summarize/:emailId. |
| UI Testing | Test user interface behavior. | Test clicking Summarize button. |
| Usability Testing | Test ease of use with users. | Ask a student to generate an AI suggested reply. |
| Security Testing | Test authentication and permission controls. | Access inbox without JWT should fail. |

## **17.3 Example Test Cases**

| ID | Test Case | Expected Result |
| :---- | :---- | :---- |
| TC-01 | Register with valid data. | User account is created. |
| TC-02 | Register with existing email. | System shows duplicate email error. |
| TC-03 | Login with correct credentials. | JWT is returned and dashboard opens. |
| TC-04 | Access dashboard without token. | Access is denied. |
| TC-05 | Connect Gmail successfully. | Gmail connection status becomes connected. |
| TC-06 | Fetch recent emails. | Latest emails are displayed. |
| TC-07 | Summarize selected email. | Summary panel displays result. |
| TC-08 | Extract tasks from email with deadline. | Task is created with deadline and priority. |
| TC-09 | Extract tasks from email without task. | System returns empty task list. |
| TC-10 | Generate formal AI suggested reply. | Formal AI suggested reply is displayed and saved. |
| TC-11 | Submit empty reply instruction. | System shows validation message. |
| TC-12 | Delete AI suggested reply. | AI suggested reply is removed from AI Suggested Replies page. |
| TC-13 | Disconnect Gmail. | Gmail tokens are removed or invalidated. |
| TC-14 | Gemini API fails. | User sees clear error message. |
| TC-15 | Gmail API fails. | User sees clear error message. |

## **17.4 Testing Tools**

Suggested tools:

* Postman or Thunder Client for API testing.

* Jest for backend utility testing.

* React Testing Library for frontend component testing.

* Browser developer tools for UI debugging.

* MongoDB Compass for checking stored data.

# **18\. Limitations**

The project has the following limitations:

* The system supports Gmail only.

* The system fetches only recent emails, not the full inbox.

* The system requires internet access.

* AI results may not always be perfect.

* The user must review generated replies manually.

* The MVP does not create Gmail draft messages inside Gmail.

* The MVP does not send, archive, delete, or modify emails.

* The MVP does not include a payment system.

* The MVP does not include team collaboration.

* The system depends on Gmail API and Gemini API availability.

# **19\. Future Improvements**

Future improvements may include:

* Google Calendar integration for extracted deadlines.

* Daily email digest.

* Automatic Gmail draft creation without sending.

* Outlook email support.

* Browser extension.

* Mobile application.

* Team inbox collaboration.

* Advanced email priority prediction.

* Attachment summarization.

* Multilingual summary and reply generation.

* Payment subscription system for SaaS deployment.

* Admin analytics dashboard.

# **20\. Final Presentation Demo Flow**

This demo flow is designed for a classroom presentation. It shows the most important features in a simple and logical order.

| Step | Demo Action | What to Explain |
| :---- | :---- | :---- |
| 1 | Open landing page. | Introduce InboxPilot and the problem of email overload. |
| 2 | Register or log in. | Explain JWT authentication and protected pages. |
| 3 | Open dashboard. | Show overview cards for emails, tasks, and AI suggested replies. |
| 4 | Click Connect Gmail. | Explain Google OAuth and read-only Gmail permission. |
| 5 | Show recent emails. | Explain that the app fetches only recent Gmail messages. |
| 6 | Open one email detail page. | Show sender, subject, date, and email body. |
| 7 | Click Summarize Email. | Show summary, important points, urgency, and category. |
| 8 | Click Extract Tasks. | Show task title, deadline, priority, and status. |
| 9 | Generate AI Suggested Reply. | Select Formal tone and enter a short instruction. |
| 10 | Copy the AI suggested reply. | Explain that the system does not auto-send email. |
| 11 | Open Tasks page. | Show saved tasks and mark one as completed. |
| 12 | Open AI Suggested Replies page. | Show saved AI suggested replies and delete/regenerate option. |
| 13 | Open Settings page. | Show Gmail connection status and disconnect option. |
| 14 | Explain UML diagrams. | Use diagrams to explain actors, classes, workflow, and database. |
| 15 | Conclude the demo. | Explain limitations and future improvements. |

## **20.1 Suggested Presentation Script**

InboxPilot is an AI email assistant SaaS designed for students and freelancers. The system reads Gmail messages only after user permission. It helps users summarize long emails, extract tasks, and generate AI suggested replies. The most important safety decision is that InboxPilot does not send emails automatically. It only creates AI suggested replies for manual review.

During the demo, the presenter should emphasize three key points:

1. The project is a complete full-stack application.

2. The system uses read-only Gmail access and keeps the user in control.

3. The AI features are useful but limited to safe assistance.

# **21\. Development Roadmap**

| Phase | Tasks | Deliverable |
| :---- | :---- | :---- |
| Phase 1 | Set up React, Express, MongoDB, folder structure, and GitHub. | Project runs locally. |
| Phase 2 | Build register, login, JWT middleware, and protected routes. | User authentication works. |
| Phase 3 | Configure Google Cloud project, OAuth consent, and Gmail API. | Gmail connection works. |
| Phase 4 | Fetch and display recent emails. | Inbox and email detail pages work. |
| Phase 5 | Integrate Gemini API for summarization. | Summary feature works. |
| Phase 6 | Add task extraction and task management. | Tasks page works. |
| Phase 7 | Add AI suggested reply generator and AI suggested reply management. | AI Suggested Replies page works. |
| Phase 8 | Improve dashboard, loading states, errors, and responsive design. | UI feels complete. |
| Phase 9 | Test main features and fix bugs. | Stable demo-ready project. |
| Phase 10 | Finalize documentation, UML diagrams, and presentation. | Submission-ready project. |

# **22\. Conclusion**

InboxPilot is a realistic and useful full-stack SaaS project for a university software engineering course. It solves a practical problem by helping users understand emails faster, extract tasks, and prepare professional AI suggested replies. The system uses a modern JavaScript-only stack with React.js, Node.js, Express.js, MongoDB, Gmail API, Google OAuth, Gemini API, and Tailwind CSS.

The project is intentionally limited to a safe MVP. It uses read-only Gmail access and does not send emails automatically. This design improves trust, privacy, and user control. From a software engineering perspective, the project demonstrates requirement analysis, modular architecture, database design, API design, UML modeling, HCI planning, security thinking, and testing strategy.

Overall, InboxPilot is suitable for a school full-stack project because it is practical, technically meaningful, and achievable within a semester.

# **23\. References**

1. Google Workspace Developers. Gmail API Authorization Scopes. https://developers.google.com/workspace/gmail/api/auth/scopes

2. Google Identity. OAuth 2.0 for Web Server Applications. https://developers.google.com/identity/protocols/oauth2/web-server

3. Google AI for Developers. Gemini API Documentation. https://ai.google.dev/gemini-api/docs

4. React Documentation. https://react.dev/

5. Express.js Documentation. https://expressjs.com/

6. MongoDB Documentation. https://www.mongodb.com/docs/

7. Tailwind CSS Documentation. https://tailwindcss.com/docs

8. OWASP Cheat Sheet Series. Password Storage Cheat Sheet. https://cheatsheetseries.owasp.org/cheatsheets/Password\_Storage\_Cheat\_Sheet.html

# **Appendix A: Submission Checklist**

| Item | Status |
| :---- | :---- |
| Introduction completed | Ready |
| Problem statement completed | Ready |
| Objectives completed | Ready |
| Scope completed | Ready |
| Target users completed | Ready |
| Functional requirements completed | Ready |
| Non-functional requirements completed | Ready |
| Technology stack completed | Ready |
| Software engineering section expanded | Ready |
| System architecture completed | Ready |
| Database design completed | Ready |
| API design completed | Ready |
| UML diagrams with PlantUML code completed | Ready |
| HCI/UI/UX section expanded | Ready |
| Security and privacy completed | Ready |
| Testing plan completed | Ready |
| Limitations completed | Ready |
| Future improvements completed | Ready |
| Final presentation demo flow added | Ready |
| Conclusion completed | Ready |

[image1]: <data:image/png;base64,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uLmGpS7M2Z577pkzDmYfQVrmK27Tpo0zelgWY4hl6bXT68pMKjquNrBpPYcHHXRQcO2118byRbnMoRhZLMv2ZU5n9CjCKEtdlEnPoZhIGRD7tNNOixyjRpXvX46EJOH7+d9SLmxgQkjtKcUcimmD0EuH6d9sPQi3dcUcYt5j3Yt4xhlnBH369Mm5DRjHN998M0xPnz49LN93330j8zW/8sorkXWPPfbYiBnr1auXM62STjOHacplDmH2ZB/Qqzpx4sRIuTXTYg67desWjBkzJlLXHsNGlO9fjoQk4fv5L96uZGxgQkjtKcUc6rIuXboEJ510Us4yXCS1IUS5CLdv85lDXU8LZf379w8uvvjisK7MT1zIulAlzOFLL70U2Ub79u3D7cLo5jOHmILP7qeO06jy/cuRkCR8P/9byoUNTAipPaWYQ91ziN7Bp59+OizTt3BhAMUc4vlD/Szfr371q7zmEHVfe+21MA0zJds44IADXG+glKGH0e6fLOs82a9KmMMVV1wxGDJkiFvGZ5I5n0X5zCF6OK+55ppIXcwZbeM3mnz/ciQkCd/P/9DclYoNTAipPWnm8I033nDLO+20U8x8wbxh2T7ft9tuu4Vld9xxhysTc4jbzzCEWMYzdihbeeWVI3FlWXri0CuIdOvWrYOjjjrKLctzhno9SeNZxV122SUsE11++eXBYYcd5pZhDvECjK0jwgs1Z511VixfZM1h3759I+YThm+NNdYIy1dZZZXwmECoi5dosDx79myXnjt3rkujB1Z/tkaV71+OhCTh+/nfUi5sYEJI7Ukyh3huDr1+MGW5euZg7vCSCHoN7bqnn366e6li7bXXDjp27Bi5rSxv68KALViwwMWXshVWWCGyHRgm3JJFnSuvvDK2HdySxT6inqyHt33t29OQNZTYb53WSntbGeuJsG9rrbVWrA6+HFC+/PLLB999911kWw888IBLX3LJJS69ePHioF27di5PPyvZyPL9y5GQJHw//+HryoINTAipPUnmMElo0jaPorR8/3IkJAnfz3/r8TJjAxNCag/NIVUp+f7lSEgSvp//1uNlxgYmhNQemkOqUvL9y5GQJHw//63Hy4wNTAipPdOmTYt9qVNUObT99tvb042QpoHmsEBsYEJIfTB48ODYFztFlSK8wf6vf/3LnmqENA00hwViAxNC6gdMSzdy5MiY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9mH++++/7/KWXHLJ0BD26tXLLe+6667Bzz//7Jbbtm3r/q699trhurmoljkcNWpUsPnmm8fyRdhXm1eMrrnmGhejdevWQdeuXd3yCSecEKnTpUuX2HqiHXfcMdh3331j+cUK/zed7tu3r5v9x9YTZf3cX375ZXh+aB1++OFhnZkzZwY33HBDZL0RI0Zk3max8t0QkMLx/VxoKRc2sGAbl09ab731wgvYq6++Gl6gVltttWDSpElh2fLLLx98++23YfrWW28NY6B3UPIhmCjkZ+k5PPPMMyOxrr/++rDs+OOPD/OXXXbZMP+uu+6KrCP5n376aST/ueeec/m4OFuT165dO/f3mWeeccekc+fObh18qUkduw35soPWXHPNSDzf1AjmEP8HDPQL8CXdpk2bYPHixZEL4JVXXhmsvvrqYf3HHnvMLeORh6WWWsotwxyusMIK4TqoB+T8F4499tjgtNNOi9QB1113XTBw4MBI/gEHHODajNCtW7dwORfVModp0u2pWP3pT39y6//www9h3o8//ujyRo8eHeYlmcNyyX6OSptDnSfnjTxWY80hfjyg/KefforFq4R8NwSkcHw/F1rKhQ0s2Mbli3DR1uZHelywDHMoyxCWpe7ChQvDMhg+Xe83v/lNmM5iDnWsr7/+Okzj2UVddthhh7kvcBhRnf/kk0+6bUksmAMbO80cop5cqLt37x4MGDDALeueQ3y5bbfdduH6yy23XPDQQw9FYvqkRjGHlvPPPz9yAZQePIC/0rsIpFcR5lBMH5D66H1Cz2DPnj2dYPBQ9r//+785tw0k/29/+5tbhmBQ00gzh++9914YT5//xSpXzyHO9xVXXNG1gaTYDzzwQDB06NBYvgjrPvvss7H86dOnR+KKOezTp0+w1lprRerm6jnEdQXrT5kyJRb7q6++cmUwXJKHc8Aep1zm8JhjjnE/KGDikj53knKZQwjnDX7EYlmbw1122SVn/UrKd0NACsf3c6GlXNjAgm1cvghfCtaw4TDgL8zhZZddFubj1tqdd94Zq2d17733hmVZzKGWfAlguUOHDm4KN1tn9913D/bZZ59YPr70Vl111VhdGLw0c4htSf4VV1wR9lJqcyi3HTHvcLV+8ddSjWoOL7nkksgFUBs5/C3GHKJXG72FlkLMoTB//nz3o8LmW5LMofwgs7L1CpE1h4hz6qmn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>
