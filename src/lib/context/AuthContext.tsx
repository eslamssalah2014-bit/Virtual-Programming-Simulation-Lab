'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { SEED_USERS } from '../db/seed';

interface AuthContextType {
  currentUser: User;
  switchUser: (userId: string) => void;
  availableUsers: User[];
  isSimulationActive: boolean;
  toggleSimulation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(SEED_USERS[1]); // Default to Student Alex Chen
  const [simulationActive, setSimulationActive] = useState<boolean>(false);

  useEffect(() => {
    // Check saved user in local storage
    const savedId = localStorage.getItem('vlab_active_user_id');
    if (savedId) {
      const found = SEED_USERS.find(u => u.id === savedId);
      if (found) setCurrentUser(found);
    }

    // Check simulation status
    fetch('/api/simulation/status')
      .then(r => r.json())
      .then(data => {
        if (data && typeof data.active === 'boolean') {
          setSimulationActive(data.active);
        }
      })
      .catch(() => {});
  }, []);

  const switchUser = (userId: string) => {
    const found = SEED_USERS.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('vlab_active_user_id', userId);
    }
  };

  const toggleSimulation = async () => {
    try {
      const res = await fetch('/api/simulation/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'session-101' })
      });
      const data = await res.json();
      setSimulationActive(data.active);
    } catch (e) {
      console.error('Failed to toggle simulation:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchUser,
        availableUsers: SEED_USERS,
        isSimulationActive: simulationActive,
        toggleSimulation
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
