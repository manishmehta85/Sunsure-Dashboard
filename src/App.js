import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import AllTasks from './pages/AllTasks';
import LoginPage from './pages/LoginPage';
import AdminPanel from './pages/AdminPanel';
import './App.css';

export const ToastContext = React.createContext(null);

function LoadingScreen() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div>
        <div style={{ fontSize:28, textAlign:'center', marginBottom:12 }}>⚡</div>
        <div className="spinner" style={{ margin:'0 auto' }} />
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="app-main">
        <Routes>
          <Route path="/"           element={<Dashboard />} />
          <Route path="/tasks"      element={<AllTasks />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/admin"      element={<AdminPanel />} />
          <Route path="*"           element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  return (
    <AuthProvider>
      <ToastContext.Provider value={showToast}>
        <AppContent />
        {toast && (
          <div className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </div>
        )}
      </ToastContext.Provider>
    </AuthProvider>
  );
}
