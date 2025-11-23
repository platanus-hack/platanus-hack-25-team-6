import { useState, useEffect } from 'react';
import Landing from './components/Landing';
import PhoneInput from './components/PhoneInput';
import VerificationCode from './components/VerificationCode';
import Dashboard from './components/Dashboard';

function App() {
  const [view, setView] = useState('landing');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Check for existing session on mount
  useEffect(() => {
    const savedPhone = localStorage.getItem('safeline_phone');
    if (savedPhone) {
      setPhoneNumber(savedPhone);
      setView('dashboard');
    }
  }, []);

  const handleGetStarted = () => {
    setView('phone');
  };

  const handlePhoneSubmit = (phone) => {
    setPhoneNumber(phone);
    setView('verification');
  };

  const handleVerify = (code) => {
    console.log('Verifying code:', code, 'for phone:', phoneNumber);
    // Save session
    localStorage.setItem('safeline_phone', phoneNumber);
    setView('dashboard');
  };

  const handleBack = () => {
    setView('phone');
  };

  const handleLogout = () => {
    localStorage.removeItem('safeline_phone');
    setPhoneNumber('');
    setView('landing');
  };

  if (view === 'phone') {
    return <PhoneInput onSubmit={handlePhoneSubmit} />;
  }

  if (view === 'verification') {
    return (
      <VerificationCode
        phoneNumber={phoneNumber}
        onVerify={handleVerify}
        onBack={handleBack}
      />
    );
  }

  if (view === 'dashboard') {
    return <Dashboard onLogout={handleLogout} />;
  }

  return <Landing onGetStarted={handleGetStarted} />;
}

export default App;
