# 2–5 Minute Demo Video Script

## 1. Introduction

Hello, this is my Team Task Manager full-stack project. It helps teams create projects, manage members, assign tasks, and track progress with Admin and Member roles.

## 2. Authentication

First, I will show signup and login. The app uses secure password hashing and JWT authentication. I also added a forgot password button, which creates a reset link for testing and supports SMTP for real email reset.

## 3. Project Management

After login, I can create a project. The project creator automatically becomes Admin. Admin can add registered users as members, remove members, and update their roles.

## 4. Task Management

Admin can create tasks with title, description, due date, priority, and assignee. Tasks are shown in To Do, In Progress, and Done columns. Admin can edit or delete tasks. Members can only update the status of tasks assigned to them.

## 5. Dashboard

The dashboard shows total tasks, completion rate, overdue tasks, task status breakdown, and tasks per user. It also shows overdue tasks separately so the team can take action quickly.

## 6. Backend and Database

The backend is built with Express REST APIs and Prisma. The database has proper relationships between Users, Projects, Project Members, Tasks, and Password Reset tokens. Validation and error handling are included.

## 7. Deployment

The project is deployed on Railway with environment variables. The frontend and backend are connected, and the app is publicly accessible.

## 8. Closing

This completes the demo of my Team Task Manager project. Thank you.
