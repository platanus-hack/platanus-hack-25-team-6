import { useState } from 'react';
import Landing from './components/Landing';
import PhoneInput from './components/PhoneInput';
import VerificationCode from './components/VerificationCode';
import Dashboard from './components/Dashboard';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import PWAInstallBanner from './components/PWAInstallBanner';

function App() {
  const [view, setView] = useState('landing'); // 'landing', 'phone', 'verification', 'dashboard'
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleGetStarted = () => {
    setView('phone');
  };

  const handlePhoneSubmit = (phone) => {
    setPhoneNumber(phone);
    setView('verification');
  };

  const handleVerify = (code) => {
    console.log('Verifying code:', code, 'for phone:', phoneNumber);
    // Add verification logic here
    // On success, navigate to dashboard
    setView('dashboard');
  };

  const handleBack = () => {
    setView('phone');
  };

  const handleLogout = () => {
    setPhoneNumber('');
    setView('landing');
  };

  return (
    <>
      <PWAInstallBanner />
      <PWAUpdatePrompt />
      {view === 'phone' && <PhoneInput onSubmit={handlePhoneSubmit} />}
      {view === 'verification' && (
        <VerificationCode
          phoneNumber={phoneNumber}
          onVerify={handleVerify}
          onBack={handleBack}
        />
      )}
      {view === 'dashboard' && <Dashboard onLogout={handleLogout} />}
      {view === 'landing' && <Landing onGetStarted={handleGetStarted} />}
    </>
  );
}

export default App;
