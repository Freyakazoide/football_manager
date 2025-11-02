import React, { useState } from 'react';
import { GameState, View } from '../types';

interface NavigationProps {
    currentView: View;
    onNavigate: (view: View) => void;
    gameState: GameState;
}

// O NavItem foi levemente ajustado (p-2, my-0.5) para parecer melhor como sub-item
const NavItem: React.FC<{
    view: View;
    currentView: View;
    onNavigate: (view: View) => void;
    children: React.ReactNode;
    badgeCount: number;
    isSubItem?: boolean;
}> = ({ view, currentView, onNavigate, children, badgeCount, isSubItem = false }) => {
    const isActive = currentView === view;
    return (
        <li>
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    onNavigate(view);
                }}
                className={`relative flex items-center justify-between ${isSubItem ? 'p-2 my-0.5' : 'p-3 my-1'} rounded-lg transition-colors duration-200 ${
                    isActive
                        ? 'bg-green-600 text-white shadow-lg'
                        : `text-gray-300 ${isSubItem ? 'hover:bg-gray-700/70' : 'hover:bg-gray-700'} hover:text-white`
                }`}
            >
                {children}
                {badgeCount > 0 && (
                    <span className={`absolute top-1 right-1 ${isSubItem ? '' : 'md:relative md:top-auto md:right-auto md:ml-auto'} bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center`}>
                        {badgeCount}
                    </span>
                )}
            </a>
        </li>
    );
};

// --- NOVO COMPONENTE DE GRUPO ---
const NavGroup: React.FC<{
    title: string;
    icon: string; // Ícone para versão mobile (uma letra)
    children: React.ReactNode;
    activeViews: View[]; // Lista de views que pertencem a este grupo
    currentView: View;
}> = ({ title, icon, children, activeViews, currentView }) => {
    
    // O grupo começa aberto se a view atual pertencer a ele
    const [isOpen, setIsOpen] = useState(activeViews.includes(currentView));

    return (
        <li className="my-1">
            {/* Botão principal do grupo */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full p-3 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200"
            >
                <span className="flex items-center">
                    {/* Ícone para mobile */}
                    <span className="md:hidden font-bold">{icon}</span>
                    {/* Texto para desktop */}
                    <span className="hidden md:inline font-semibold">{title}</span>
                </span>
                
                {/* Seta indicadora (só desktop) */}
                <svg className={`w-4 h-4 transition-transform hidden md:inline ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            
            {/* Sub-menu (só desktop) */}
            <ul className={`pl-4 transition-all duration-300 overflow-hidden ${isOpen ? 'max-h-96' : 'max-h-0'} hidden md:block`}>
                {children}
            </ul>
        </li>
    );
};
// --- FIM DO NOVO COMPONENTE ---


const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate, gameState }) => {
    const unreadNewsCount = gameState.news.filter(item => !item.isRead).length;
    
    // Lista de views que não são "Pergil do Jogador"
    const allViews = Object.values(View).filter(v => v !== View.PLAYER_PROFILE);

    return (
        <nav className="w-16 md:w-64 bg-gray-800 text-white flex flex-col p-2 md:p-4 shadow-lg">
            <div className="text-2xl font-bold text-white mb-8 hidden md:block">
                foot
            </div>
            
            {/* --- MENU MOBILE (só ícones) --- */}
            <ul className="space-y-1 md:hidden">
                 <NavItem view={View.NEWS} currentView={currentView} onNavigate={onNavigate} badgeCount={unreadNewsCount}>
                    <span className="font-bold">N</span>
                </NavItem>
                <NavItem view={View.TEAM} currentView={currentView} onNavigate={onNavigate} badgeCount={0}>
                    <span className="font-bold">T</span>
                </NavItem>
                {/* Iterar sobre todas as outras views para mobile */}
                {allViews.filter(v => ![View.NEWS, View.TEAM].includes(v)).map((view) => (
                   <NavItem 
                        key={view} 
                        view={view} 
                        currentView={currentView} 
                        onNavigate={onNavigate}
                        badgeCount={0}
                   >
                        <span className="font-bold">{view.substring(0,1)}</span>
                   </NavItem>
                ))}
            </ul>

            {/* --- MENU DESKTOP (com grupos) --- */}
            <ul className="space-y-1 hidden md:block">
                {/* Itens de Nível Superior */}
                <NavItem view={View.NEWS} currentView={currentView} onNavigate={onNavigate} badgeCount={unreadNewsCount}>
                    <span className="hidden md:inline">{View.NEWS}</span>
                </NavItem>
                <NavItem view={View.TEAM} currentView={currentView} onNavigate={onNavigate} badgeCount={0}>
                    <span className="hidden md:inline">{View.TEAM}</span>
                </NavItem>

                {/* Grupo: Ger. de Elenco */}
                <NavGroup 
                    title="Ger. de Elenco" 
                    icon="E" 
                    currentView={currentView}
                    activeViews={[View.SQUAD, View.TACTICS, View.TRAINING, View.ACADEMY]}
                >
                    <NavItem view={View.SQUAD} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.SQUAD}
                    </NavItem>
                    <NavItem view={View.TACTICS} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.TACTICS}
                    </NavItem>
                    <NavItem view={View.TRAINING} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.TRAINING}
                    </NavItem>
                    <NavItem view={View.ACADEMY} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.ACADEMY}
                    </NavItem>
                </NavGroup>

                {/* Grupo: Mercado */}
                <NavGroup 
                    title="Mercado" 
                    icon="M"
                    currentView={currentView}
                    activeViews={[View.TRANSFERS, View.SCOUTING]}
                >
                    <NavItem view={View.TRANSFERS} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.TRANSFERS}
                    </NavItem>
                    <NavItem view={View.SCOUTING} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.SCOUTING}
                    </NavItem>
                </NavGroup>

                {/* Grupo: Clube */}
                <NavGroup 
                    title="Clube" 
                    icon="C"
                    currentView={currentView}
                    activeViews={[View.FINANCES, View.BOARD, View.STAFF]}
                >
                    <NavItem view={View.FINANCES} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.FINANCES}
                    </NavItem>
                    <NavItem view={View.BOARD} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.BOARD}
                    </NavItem>
                    <NavItem view={View.STAFF} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.STAFF}
                    </NavItem>
                </NavGroup>

                {/* Grupo: Competição */}
                <NavGroup 
                    title="Competição" 
                    icon="K" // 'K' para Calendário/Competição
                    currentView={currentView}
                    activeViews={[View.COMPETITION, View.CALENDAR]}
                >
                    <NavItem view={View.COMPETITION} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.COMPETITION}
                    </NavItem>
                    <NavItem view={View.CALENDAR} currentView={currentView} onNavigate={onNavigate} badgeCount={0} isSubItem={true}>
                        {View.CALENDAR}
                    </NavItem>
                </NavGroup>
            </ul>
        </nav>
    );
};

export default Navigation;