# 🕒 AI-Powered Daily Time Tracking & Analytics Dashboard

A web application that lets users log daily activities, track how they spend their 24 hours, and view detailed analytics.  
Built using **HTML, CSS, JavaScript, Firebase Authentication, Firestore**, and **Chart.js**.  
All UI and logic were refined with **AI assistance (ChatGPT)**.

---

## 🎥 Video Walkthrough
Add your YouTube or Google Drive walkthrough link here.

---

## 📌 Overview

Users can:

- Log activities (name, category, duration)  
- Track total minutes per day (max 1440)  
- View remaining minutes  
- Edit & delete activities  
- Analyse day using interactive charts  
- Sign in with Google (Firebase Auth)  

Data is stored **per user** and **per date** using Firestore.

---

### 🔐 Authentication
- Google Sign-In (Firebase Auth)
- Only authenticated users can access the app

### 📝 Activity Logging
- Activity name  
- Category selection  
- Duration in minutes  
- Prevent exceeding 1440 minutes  
- Real-time total & remaining minutes  


### 📊 Analytics Dashboard
Includes:

- Total time spent  
- Number of activities  
- Categories used  
- Pie chart: time per category  
- Bar chart: duration per activity  

If no data exists → shows a **“No data available”** screen.

### 🎨 UI/UX
- Fully responsive  
- Custom CSS styling  
- Clean layout + soft animations  
- Intuitive flow: Login → Add Activities → Analyse  

### 🤖 AI Usage
AI tools (ChatGPT) were used for:

- UI design ideas  
- HTML/CSS layout generation  
- JavaScript logic help  
- Debugging Firebase/Auth issues  
- Writing documentation (README)  

---

## 🧰 Tech Stack

- **Frontend:** HTML, CSS, JavaScript (Vanilla)  
- **Backend:** Firebase Firestore  
- **Auth:** Firebase Authentication (Google)  
- **Charts:** Chart.js  



