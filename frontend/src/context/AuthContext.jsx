import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const loadUserFromStorage = async () => {
            try {
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    // Optionally, verify token with backend if needed
                    // For now, assume stored token is valid
                }
            } catch (err) {
                console.error("Failed to load user from storage:", err);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            } finally {
                setIsLoading(false);
            }
        };

        loadUserFromStorage();
    }, []);

    const register = async (userData) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.register(userData);
            setToken(data.token);
            setUser(data.user);
            navigate('/dashboard'); // Redirect to dashboard after successful registration
            return data;
        } catch (err) {
            setError(err.response?.data || err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (credentials) => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await authService.login(credentials);
            setToken(data.token);
            setUser(data.user);
            navigate('/dashboard'); // Redirect to dashboard after successful login
            return data;
        } catch (err) {
            setError(err.response?.data || err.message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await authService.logout();
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login'); // Redirect to login page after logout
        } catch (err) {
            setError(err.response?.data || err.message);
            // Even if logout fails on server, clear local state
            setToken(null);
            setUser(null);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to check if the user is authenticated
    const isAuthenticated = () => {
        return !!token && !!user;
    };

    const value = {
        user,
        token,
        isLoading,
        error,
        isAuthenticated,
        register,
        login,
        logout,
        setUser, // Add setUser to the context value
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};



