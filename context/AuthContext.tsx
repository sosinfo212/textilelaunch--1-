import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../src/utils/api';

interface AuthContextType {
  user: User | null;
  users: User[];
  isAuthenticated: boolean;
  isLoading: boolean; // Add loading state
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addUser: (user: User) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Initial Admin
const DEFAULT_ADMIN: User = {
  id: 'usr_admin',
  email: 'admin@textile.com',
  password: 'admin',
  name: 'Admin Vendeur',
  role: 'admin'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Track loading state

  useEffect(() => {
    // Load users from API
    const loadUsers = async () => {
      try {
        const res = await authAPI.getUsers();
        setUsers(res.users);
      } catch (error: any) {
        // Only log if it's not a connection error (server might be starting)
        if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.error('Error loading users:', error);
        }
        // Fallback to default admin if API fails
        setUsers([DEFAULT_ADMIN]);
      }
    };

    // Add a small delay to allow server to start
    const timer = setTimeout(() => {
      loadUsers();
    }, 500);

    // Check active session via API (session stored in database, cookie handled automatically)
    const loadUser = async () => {
      setIsLoading(true); // Start loading
      try {
        const res = await authAPI.getMe();
        if (res.user) {
          setUser(res.user);
        } else {
          // No user returned - session might be invalid
          setUser(null);
        }
      } catch (error: any) {
        // Only log if it's not a connection error
        if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('ERR_CONNECTION_REFUSED')) {
          console.error('Error loading user session:', error);
          // If it's a 401, user needs to login
          if (error?.message?.includes('401') || error?.message?.includes('Authentication')) {
            console.log('Session expired or invalid. Please login.');
          }
        }
        // Session invalid - backend will handle cookie cleanup
        setUser(null);
      } finally {
        setIsLoading(false); // Stop loading
      }
    };
    
    setTimeout(() => {
      loadUser();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      const res = await authAPI.login(email, pass);
      if (res.user) {
        setUser(res.user);
        // Session is stored in database and cookie - no localStorage needed
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Session is removed from database and cookie by backend
    }
  };

  const addUser = async (newUser: User) => {
    try {
      const userData = {
        email: newUser.email,
        password: newUser.password || '',
        name: newUser.name,
        role: newUser.role || 'user'
      };
      const res = await authAPI.addUser(userData);
      setUsers([...users, res.user]);
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      const userData: any = {};
      if (updatedUser.email) userData.email = updatedUser.email;
      if (updatedUser.password) userData.password = updatedUser.password;
      if (updatedUser.name) userData.name = updatedUser.name;
      if (updatedUser.role) userData.role = updatedUser.role;

      const res = await authAPI.updateUser(updatedUser.id, userData);
      setUsers(users.map(u => u.id === res.user.id ? res.user : u));
      
      // Update session if self-edit
      if (user && user.id === updatedUser.id) {
        setUser(res.user);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await authAPI.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
      
      // Logout if deleting current user
      if (user && user.id === id) {
        logout();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      users,
      isAuthenticated: !!user,
      isLoading, // Expose loading state
      login, 
      logout,
      addUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};