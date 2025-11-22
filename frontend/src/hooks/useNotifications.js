import { useState, useEffect, useCallback } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback(
    (title, options = {}) => {
      if (!isSupported || permission !== 'granted') {
        console.warn('Notifications not available or not permitted');
        return null;
      }

      const notification = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });

      return notification;
    },
    [isSupported, permission]
  );

  const showScamAlert = useCallback(
    (riskLevel, confidence, indicators = []) => {
      const titles = {
        critical: '🚨 CRITICAL SCAM ALERT!',
        high: '⚠️ High Risk Scam Detected',
        medium: '⚡ Potential Scam Detected',
        low: 'ℹ️ Low Risk Detected',
      };

      const body = `Scam confidence: ${(confidence * 100).toFixed(0)}%\n${
        indicators.length > 0 ? `Indicators: ${indicators.slice(0, 2).join(', ')}` : ''
      }`;

      return showNotification(titles[riskLevel] || titles.medium, {
        body,
        tag: 'scam-alert',
        requireInteraction: riskLevel === 'critical' || riskLevel === 'high',
        vibrate: riskLevel === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
      });
    },
    [showNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showScamAlert,
  };
};
