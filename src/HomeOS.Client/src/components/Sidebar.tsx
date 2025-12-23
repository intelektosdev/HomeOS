import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

export function Sidebar() {
    const { user, logout } = useAuth();

    const handleLogout = () => {
        if (confirm('Deseja realmente sair?')) {
            logout();
            window.location.href = '/login';
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-logo">
                    <span className="logo-icon">💰</span>
                    HomeOS
                </h2>
                <p className="sidebar-subtitle">Gestão Financeira</p>
                {user && (
                    <div style={{
                        marginTop: '1rem',
                        padding: '0.75rem',
                        background: 'rgba(99, 102, 241, 0.1)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.875rem'
                    }}>
                        <div style={{ color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                            {user.name}
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                            {user.email}
                        </div>
                    </div>
                )}
            </div>

            <nav className="sidebar-nav">
                <NavLink to="/" className="nav-item" end>
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">Dashboard</span>
                </NavLink>

                <div className="nav-section">
                    <h3 className="nav-section-title">Cadastros</h3>

                    <NavLink to="/categories" className="nav-item">
                        <span className="nav-icon">🏷️</span>
                        <span className="nav-label">Categorias</span>
                    </NavLink>

                    <NavLink to="/accounts" className="nav-item">
                        <span className="nav-icon">🏦</span>
                        <span className="nav-label">Contas</span>
                    </NavLink>

                    <NavLink to="/credit-cards" className="nav-item">
                        <span className="nav-icon">💳</span>
                        <span className="nav-label">Cartões de Crédito</span>
                    </NavLink>
                    <NavLink to="/product-groups" className="nav-item">
                        <span className="nav-icon">🗃️</span>
                        <span className="nav-label">Grupos de Produtos</span>
                    </NavLink>

                    <NavLink to="/suppliers" className="nav-item">
                        <span className="nav-icon">🚚</span>
                        <span className="nav-label">Fornecedores</span>
                    </NavLink>
                </div>

                <div className="nav-section">
                    <h3 className="nav-section-title">Financeiro</h3>

                    <NavLink to="/transactions" className="nav-item">
                        <span className="nav-icon">💸</span>
                        <span className="nav-label">Transações</span>
                    </NavLink>
                </div>

                <div className="nav-section">
                    <h3 className="nav-section-title">Estoque</h3>

                    <NavLink to="/products" className="nav-item">
                        <span className="nav-icon">📦</span>
                        <span className="nav-label">Produtos</span>
                    </NavLink>

                    <NavLink to="/shopping-list" className="nav-item">
                        <span className="nav-icon">🛒</span>
                        <span className="nav-label">Lista de Compras</span>
                    </NavLink>
                </div>

                <div className="nav-section" style={{ marginTop: 'auto' }}>
                    <button
                        onClick={handleLogout}
                        className="nav-item"
                        style={{
                            width: '100%',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <span className="nav-icon">🚪</span>
                        <span className="nav-label">Sair</span>
                    </button>
                </div>
            </nav>
        </aside>
    );
}
