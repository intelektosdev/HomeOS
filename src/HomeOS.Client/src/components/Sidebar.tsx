import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import './Sidebar.css';

export function Sidebar() {
    const { user, logout } = useAuth();
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({
        cadastros: true,
        financeiro: true,
        estoque: true
    });
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    const toggleSection = (section: string) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleLogout = () => {
        if (confirm('Deseja realmente sair?')) {
            logout();
            window.location.href = '/login';
        }
    };

    // Wrapper for NavLink to close sidebar on click (mobile)
    const NavLinkMobile = (props: any) => (
        <NavLink {...props} onClick={() => setIsMobileOpen(false)} />
    );

    return (
        <>
            {/* Mobile Toggle Button (Visible only on mobile) */}
            <button
                className="mobile-toggle-btn"
                onClick={() => setIsMobileOpen(true)}
                aria-label="Abrir Menu"
            >
                ☰
            </button>

            {/* Mobile Overlay */}
            <div
                className={`sidebar-overlay ${isMobileOpen ? 'visible' : ''}`}
                onClick={() => setIsMobileOpen(false)}
            />

            <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 className="sidebar-logo">
                            <span className="logo-icon">💰</span>
                            HomeOS
                        </h2>
                        {/* Close Button for Mobile */}
                        <button
                            className="mobile-close-btn"
                            onClick={() => setIsMobileOpen(false)}
                        >
                            ✕
                        </button>
                    </div>
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
                    <NavLinkMobile to="/" className="nav-item" end>
                        <span className="nav-icon">📊</span>
                        <span className="nav-label">Dashboard</span>
                    </NavLinkMobile>

                    <div className="nav-section">
                        <button
                            className="nav-section-title-btn"
                            onClick={() => toggleSection('cadastros')}
                        >
                            <span>Cadastros</span>
                            <span className={`chevron ${openSections.cadastros ? 'open' : ''}`}>▼</span>
                        </button>

                        <div className={`nav-section-content ${openSections.cadastros ? 'open' : ''}`}>
                            <NavLinkMobile to="/categories" className="nav-item">
                                <span className="nav-icon">🏷️</span>
                                <span className="nav-label">Categorias</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/accounts" className="nav-item">
                                <span className="nav-icon">🏦</span>
                                <span className="nav-label">Contas</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/credit-cards" className="nav-item">
                                <span className="nav-icon">💳</span>
                                <span className="nav-label">Cartões de Crédito</span>
                            </NavLinkMobile>
                            <NavLinkMobile to="/product-groups" className="nav-item">
                                <span className="nav-icon">🗃️</span>
                                <span className="nav-label">Grupos de Produtos</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/suppliers" className="nav-item">
                                <span className="nav-icon">🚚</span>
                                <span className="nav-label">Fornecedores</span>
                            </NavLinkMobile>
                        </div>
                    </div>

                    <div className="nav-section">
                        <button
                            className="nav-section-title-btn"
                            onClick={() => toggleSection('financeiro')}
                        >
                            <span>Financeiro</span>
                            <span className={`chevron ${openSections.financeiro ? 'open' : ''}`}>▼</span>
                        </button>

                        <div className={`nav-section-content ${openSections.financeiro ? 'open' : ''}`}>
                            <NavLinkMobile to="/transactions" className="nav-item">
                                <span className="nav-icon">💸</span>
                                <span className="nav-label">Transações</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/recurring-transactions" className="nav-item">
                                <span className="nav-icon">🔄</span>
                                <span className="nav-label">Recorrências</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/analytics/cash-flow" className="nav-item">
                                <span className="nav-icon">🗓️</span>
                                <span className="nav-label">Fluxo de Caixa</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/debts" className="nav-item">
                                <span className="nav-icon">💳</span>
                                <span className="nav-label">Dívidas</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/investments" className="nav-item">
                                <span className="nav-icon">📈</span>
                                <span className="nav-label">Investimentos</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/budgets" className="nav-item">
                                <span className="nav-icon">📉</span>
                                <span className="nav-label">Orçamentos</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/goals" className="nav-item">
                                <span className="nav-icon">🎯</span>
                                <span className="nav-label">Metas</span>
                            </NavLinkMobile>
                        </div>
                    </div>

                    <div className="nav-section">
                        <button
                            className="nav-section-title-btn"
                            onClick={() => toggleSection('estoque')}
                        >
                            <span>Estoque</span>
                            <span className={`chevron ${openSections.estoque ? 'open' : ''}`}>▼</span>
                        </button>

                        <div className={`nav-section-content ${openSections.estoque ? 'open' : ''}`}>
                            <NavLinkMobile to="/products" className="nav-item">
                                <span className="nav-icon">📦</span>
                                <span className="nav-label">Produtos</span>
                            </NavLinkMobile>

                            <NavLinkMobile to="/shopping-list" className="nav-item">
                                <span className="nav-icon">🛒</span>
                                <span className="nav-label">Lista de Compras</span>
                            </NavLinkMobile>
                        </div>
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
        </>
    );
}
