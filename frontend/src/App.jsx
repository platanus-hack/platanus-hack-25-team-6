import { useState } from 'react';
import Landing from './components/Landing';
import PhoneInput from './components/PhoneInput';
import VerificationCode from './components/VerificationCode';
import Dashboard from './components/Dashboard';
import InstallPrompt from './components/InstallPrompt';

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
    return (
      <>
        <Dashboard onLogout={handleLogout} />
        <InstallPrompt />
      </>
    );
  }

  return (
    <>
      <Landing onGetStarted={handleGetStarted} />
      <InstallPrompt />
    </>
  );
}

export default App;
