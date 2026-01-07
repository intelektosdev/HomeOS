import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5055/api';

interface RegisterRequest {
    email: string;
    password: string;
    name: string;
}

interface RegisterResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
    };
}

export function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password.length < 6) {
            setError('A senha deve ter no mínimo 6 caracteres');
            setLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem');
            setLoading(false);
            return;
        }

        try {
            const request: RegisterRequest = { email, password, name };
            const response = await axios.post<RegisterResponse>(`${API_URL}/auth/register`, request);

            login(response.data.token, response.data.user);
            navigate('/');
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || err.message || 'Erro ao criar conta';

            // Mensagens mais amigáveis
            if (errorMessage.includes('Cannot open database') || errorMessage.includes('4060')) {
                setError('Erro: Banco de dados não encontrado. Verifique se o banco "HomeOS" existe.');
            } else if (errorMessage.includes('já existe') || errorMessage.includes('already exists')) {
                setError('Este email já está cadastrado. Tente fazer login.');
            } else {
                setError(errorMessage);
            }
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
                    Criar Conta
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
                        <label className="form-label">Nome</label>
                        <input
                            type="text"
                            className="form-input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                            placeholder="Seu nome completo"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Senha (mínimo 6 caracteres)</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="••••••"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirmar Senha</label>
                        <input
                            type="password"
                            className="form-input"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="••••••"
                            style={{
                                borderColor: confirmPassword && password !== confirmPassword
                                    ? 'var(--color-danger)'
                                    : undefined
                            }}
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <small style={{
                                color: 'var(--color-danger)',
                                fontSize: '0.75rem',
                                marginTop: '0.25rem',
                                display: 'block'
                            }}>
                                ⚠️ As senhas não coincidem
                            </small>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginTop: '1rem' }}
                        disabled={loading || (confirmPassword !== '' && password !== confirmPassword)}
                    >
                        {loading ? 'Criando conta...' : 'Registrar'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--color-text-secondary)' }}>
                        Já tem conta?{' '}
                        <a
                            href="/login"
                            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600 }}
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/login');
                            }}
                        >
                            Faça login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
