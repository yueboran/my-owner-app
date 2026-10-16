import { useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
  role?: string;
}

export function useAuth() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('stars:token');
    if (!token) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const payload = await response.json();
        setCurrentUser(payload.data || payload);
      } else {
        localStorage.removeItem('stars:token');
        setCurrentUser(null);
      }
    } catch {
      // 离线时保持未登录状态
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const logout = useCallback(() => {
    localStorage.removeItem('stars:token');
    setCurrentUser(null);
  }, []);

  const updateAvatar = useCallback(async (file: File): Promise<boolean> => {
    const token = localStorage.getItem('stars:token');
    if (!token) return false;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/auth/me/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const avatarUrl = data.data?.avatarUrl;
        if (avatarUrl) {
          setCurrentUser((prev) => (prev ? { ...prev, avatarUrl } : null));
          return true;
        }
      }
    } catch {
      //
    }
    return false;
  }, []);

  return {
    currentUser,
    loading,
    isLoggedIn: !!currentUser,
    checkAuth,
    logout,
    updateAvatar,
  };
}
