import { NavLink } from 'react-router-dom';
import './Sidebar.css';

export function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h2 className="sidebar-logo">
                    <span className="logo-icon">💰</span>
                    HomeOS
                </h2>
                <p className="sidebar-subtitle">Gestão Financeira</p>
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
                </div>

                <div className="nav-section">
                    <h3 className="nav-section-title">Financeiro</h3>

                    <NavLink to="/transactions" className="nav-item">
                        <span className="nav-icon">💸</span>
                        <span className="nav-label">Transações</span>
                    </NavLink>
                </div>
            </nav>
        </aside>
    );
}
