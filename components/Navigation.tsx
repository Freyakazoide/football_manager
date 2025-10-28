import React from 'react';
import { GameState, View } from '../types';

interface NavigationProps {
    currentView: View;
    setCurrentView: (view: View) => void;
    gameState: GameState;
}

const NavItem: React.FC<{
    view: View;
    currentView: View;
    setCurrentView: (view: View) => void;
    children: React.ReactNode;
    badgeCount: number;
}> = ({ view, currentView, setCurrentView, children, badgeCount }) => {
    const isActive = currentView === view;
    return (
        <li>
            <a
                href="#"
                onClick={(e) => {
                    e.preventDefault();
                    setCurrentView(view);
                }}
                className={`relative flex items-center justify-between p-3 my-1 rounded-lg transition-colors duration-200 ${
                    isActive
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
            >
                {children}
                {badgeCount > 0 && (
                    <span className="absolute top-1 right-1 md:relative md:top-auto md:right-auto md:ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {badgeCount}
                    </span>
                )}
            </a>
        </li>
    );
};


const Navigation: React.FC<NavigationProps> = ({ currentView, setCurrentView, gameState }) => {
    const unreadNewsCount = gameState.news.filter(item => !item.isRead).length;

    return (
        <nav className="w-16 md:w-64 bg-gray-800 text-white flex flex-col p-2 md:p-4 shadow-lg">
            <div className="text-2xl font-bold text-white mb-8 hidden md:block">
                foot
            </div>
            <ul className="space-y-2">
                {Object.values(View).map((view) => (
                   <NavItem 
                        key={view} 
                        view={view} 
                        currentView={currentView} 
                        setCurrentView={setCurrentView}
                        badgeCount={view === View.NEWS ? unreadNewsCount : 0}
                   >
                        <span className="md:hidden">{view.substring(0,1)}</span>
                        <span className="hidden md:inline">{view}</span>
                   </NavItem>
                ))}
            </ul>
        </nav>
    );
};

export default Navigation;