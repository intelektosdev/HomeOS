import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5055/api';

interface LoginRequest {
    email: string;
    password: string;
}

interface LoginResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const request: LoginRequest = { email, password };
            const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, request);

            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Erro ao fazer login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            background: 'var(--color-bg-base)'
        }}>
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
                <h1 className="page-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    HomeOS Login
                </h1>

                {error && (
                    <div style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid var(--color-danger)',
                        color: 'var(--color-danger)',
                        marginBottom: '1.5rem',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="form">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading}
                    >
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-secondary)' }}>
                        Não tem conta?{' '}
                        <a
                            href="/register"
                            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/register');
                            }}
                        >
                            Registre-se
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
