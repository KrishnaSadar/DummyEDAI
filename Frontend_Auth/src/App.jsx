import React, { useState } from 'react';
import AuthPage from './components/AuthPage';
import ProjectSelection from './components/ProjectSelection';
import Dashboard from './components/Dashboard';
import SQLCompiler from './components/SQLCompiler';
import Home from './components/Home';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showHome, setShowHome] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' or 'sql-compiler'

  const handleLogin = (success) => {
    setIsLoggedIn(success);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setSelectedProject(null);
    setShowHome(true);
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleOpenSQLCompiler = () => {
    setCurrentView('sql-compiler');
  };

  const handleGetStarted = () => {
    setShowHome(false);
  };

  // Render flow
  if (showHome) {
    return <Home onGetStarted={handleGetStarted} />;
  }

  if (!isLoggedIn) {
    return <AuthPage onLogin={handleLogin} />;
  }

  if (!selectedProject) {
    return (
      <ProjectSelection 
        onProjectSelect={handleProjectSelect} 
        onLogout={handleLogout} 
      />
    );
  }

  // Render based on current view
  if (currentView === 'sql-compiler') {
    return (
      <SQLCompiler 
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  return (
    <Dashboard 
      onLogout={handleLogout} 
      selectedProject={selectedProject}
      onBackToProjects={handleBackToProjects}
      onOpenSQLCompiler={handleOpenSQLCompiler}
    />
  );
}

export default App;