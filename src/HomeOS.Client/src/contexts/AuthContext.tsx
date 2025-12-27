import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

// Fixed user for local development without authentication
const FIXED_USER: User = {
    id: '22f4bd46-313d-424a-83b9-0c367ad46c3b',
    email: 'local@homeos.dev',
    name: 'Local User'
};

export function AuthProvider({ children }: AuthProviderProps) {
    // For local development, start with fixed user already logged in
    const [user, setUser] = useState<User | null>(FIXED_USER);
    const [token, setToken] = useState<string | null>('local-dev-token');

    useEffect(() => {
        // Set fixed userId in localStorage for components that use it directly
        localStorage.setItem('userId', FIXED_USER.id);
        localStorage.setItem('user', JSON.stringify(FIXED_USER));
        localStorage.setItem('token', 'local-dev-token');
    }, []);

    const login = (newToken: string, newUser: User) => {
        setToken(newToken);
        setUser(newUser);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        localStorage.setItem('userId', newUser.id);
    };

    const logout = () => {
        // For local dev, don't really logout - just reset to fixed user
        setToken('local-dev-token');
        setUser(FIXED_USER);
        localStorage.setItem('token', 'local-dev-token');
        localStorage.setItem('user', JSON.stringify(FIXED_USER));
        localStorage.setItem('userId', FIXED_USER.id);
    };

    // Always authenticated in local development
    const isAuthenticated = true;

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
