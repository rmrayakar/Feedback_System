
export interface Session {
  id: string;
  title: string;
  teacher: string;
  code: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'expired';
  subject: string;
  createdAt?: string;
  expiresAt?: string;
}

export const isSessionExpired = (session: Session): boolean => {
  if (!session.expiresAt) {
    return false; // If no expiry time set, session doesn't expire
  }
  
  const now = new Date();
  const expiryTime = new Date(session.expiresAt);
  
  return now > expiryTime;
};

export const filterActiveSessionsForStudents = (sessions: Session[]): Session[] => {
  return sessions.filter(session => {
    // Only show sessions that are not expired
    if (isSessionExpired(session)) {
      return false;
    }
    
    // Don't show completed sessions as active
    if (session.status === 'completed') {
      return false;
    }
    
    return true;
  });
};

export const getSessionTimeRemaining = (session: Session): string | null => {
  if (!session.expiresAt) {
    return null;
  }
  
  const now = new Date();
  const expiryTime = new Date(session.expiresAt);
  const timeDiff = expiryTime.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return 'Expired';
  }
  
  const minutes = Math.floor(timeDiff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

export const validateSessionCode = (code: string, sessions: Session[]): boolean => {
  const session = sessions.find(s => s.code === code);
  
  if (!session) {
    return false; // Session not found
  }
  
  if (isSessionExpired(session)) {
    return false; // Session expired
  }
  
  return true; // Valid session code
};
