import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Landing from './components/Landing';
import PhoneInput from './components/PhoneInput';
import VerificationCode from './components/VerificationCode';
import Dashboard from './components/Dashboard';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import PWAInstallBanner from './components/PWAInstallBanner';
import OnboardingFlow from './components/OnboardingFlow';

function AppContent() {
  const { isAuthenticated, isLoading, showOnboarding, login, logout, completeOnboarding } = useAuth();
  const [view, setView] = useState('landing');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  const handleGetStarted = () => {
    setView('phone');
  };

  const handlePhoneSubmit = (phone) => {
    setPhoneNumber(phone);
    setView('verification');
  };

  const handleVerify = (authResponse) => {
    console.log('Verification successful:', authResponse);
    // Login user with JWT from backend
    login(authResponse);
    // View will automatically switch to dashboard via isAuthenticated
  };

  const handleBackToPhone = () => {
    setView('phone');
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  const handleLogout = () => {
    logout();
    setView('landing');
  };

  const handleOnboardingComplete = () => {
    completeOnboarding();
  };

  // If authenticated, show dashboard with optional onboarding
  if (isAuthenticated) {
    return (
      <>
        <PWAUpdatePrompt />
        <Dashboard onLogout={handleLogout} />
        {showOnboarding && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      </>
    );
  }

  // Not authenticated - show auth flow
  return (
    <>
      <PWAInstallBanner />
      <PWAUpdatePrompt />
      {view === 'phone' && <PhoneInput onSubmit={handlePhoneSubmit} onBack={handleBackToLanding} />}
      {view === 'verification' && (
        <VerificationCode
          phoneNumber={phoneNumber}
          onVerify={handleVerify}
          onBack={handleBackToPhone}
        />
      )}
      {view === 'landing' && <Landing onGetStarted={handleGetStarted} />}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
