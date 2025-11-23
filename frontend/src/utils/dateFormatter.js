/**
 * Formats an ISO date string to Chile timezone
 * @param {string} isoString - ISO date string
 * @returns {object} Object with formatted date and time
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return { date: '', time: '' };

  try {
    // Parse the date string - if no timezone info, assume it's UTC
    let date;

    // If the string doesn't have timezone info (Z or +/-), assume it's UTC
    if (!isoString.includes('Z') && !isoString.includes('+') && !isoString.match(/[+-]\d{2}:\d{2}$/)) {
      // Add 'Z' to indicate UTC
      date = new Date(isoString + 'Z');
    } else {
      // Has timezone info, parse normally
      date = new Date(isoString);
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.error('Invalid date value:', isoString);
      return { date: '', time: '' };
    }

    // Format both date and time in Chile timezone
    const dateFormatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    const timeFormatter = new Intl.DateTimeFormat('es-CL', {
      timeZone: 'America/Santiago',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    return {
      date: dateFormatter.format(date),
      time: timeFormatter.format(date)
    };
  } catch (error) {
    console.error('Error formatting date:', error, 'Input:', isoString);
    return { date: '', time: '' };
  }
};

/**
 * Formats an ISO date string to a complete date-time string in Chile timezone
 * @param {string} isoString - ISO date string
 * @returns {string} Formatted date-time string (e.g., "23-11-2025 14:30:45")
 */
export const formatDateTimeFull = (isoString) => {
  const { date, time } = formatDateTime(isoString);
  if (!date && !time) return '';
  return date && time ? `${date} ${time}` : (date || time);
};
