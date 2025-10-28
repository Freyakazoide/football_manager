import React, { useState, useReducer, useEffect, useCallback } from 'react';
import { GameState, View, Club, Player, Match } from './types';
import { gameReducer, initialState } from './services/gameReducer';
import { generateInitialDatabase } from './services/database';
import Navigation from './components/Navigation';
import Header from './components/Header';
import SquadView from './components/SquadView';
import TacticsView from './components/TacticsView';
import CompetitionView from './components/CompetitionView';
import CalendarView from './components/CalendarView';
import FinancesView from './components/FinancesView';
import TransfersView from './components/TransfersView';
import PlayerProfileModal from './components/PlayerProfileModal';
import MatchDayModal from './components/MatchDayModal';
import TransferResultModal from './components/TransferResultModal';
import MatchView from './components/MatchView';
import NewsView from './components/NewsView';
import MatchResultsModal from './components/MatchResultsModal';
import MatchReportModal from './components/MatchReportModal';

const App: React.FC = () => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const [currentView, setCurrentView] = useState<View>(View.SQUAD);
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
    const [selectedMatchForReport, setSelectedMatchForReport] = useState<Match | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!isInitialized) {
            const db = generateInitialDatabase();
            dispatch({ type: 'INITIALIZE_GAME', payload: db });
            setIsInitialized(true);
        }
    }, [isInitialized]);

    const handleSelectClub = (clubId: number) => {
        dispatch({ type: 'SELECT_PLAYER_CLUB', payload: clubId });
    };

    const handleAdvanceDay = useCallback(() => {
        dispatch({ type: 'ADVANCE_DAY' });
    }, [dispatch]);

    const handlePlayerClick = (player: Player) => {
        setSelectedPlayer(player);
    };

    const closePlayerModal = () => {
        setSelectedPlayer(null);
    };

    const closeMatchDayModal = () => {
        dispatch({ type: 'CLEAR_MATCH_DAY_FIXTURES' });
    };
    
    const closeMatchResultsModal = () => {
        dispatch({ type: 'CLEAR_MATCH_RESULTS' });
    }

    const closeTransferResultModal = () => {
        dispatch({ type: 'CLEAR_TRANSFER_RESULT' });
    };

    const handleMatchClick = (match: Match) => {
        if (match.homeScore !== undefined && match.log) { // Only open for played matches with logs
            setSelectedMatchForReport(match);
        }
    };

    const closeMatchReportModal = () => {
        setSelectedMatchForReport(null);
    };

    const renderView = () => {
        if (!state.playerClubId) return null;
        switch (currentView) {
            case View.SQUAD:
                return <SquadView gameState={state} onPlayerClick={handlePlayerClick} />;
            case View.TACTICS:
                return <TacticsView gameState={state} dispatch={dispatch} />;
            case View.COMPETITION:
                return <CompetitionView gameState={state} />;
            case View.CALENDAR:
                return <CalendarView gameState={state} onMatchClick={handleMatchClick} />;
            case View.FINANCES:
                return <FinancesView gameState={state} />;
            case View.TRANSFERS:
                return <TransfersView gameState={state} onPlayerClick={handlePlayerClick} />;
            case View.NEWS:
                return <NewsView gameState={state} dispatch={dispatch} />;
            default:
                return <SquadView gameState={state} onPlayerClick={handlePlayerClick} />;
        }
    };
    
    if (!isInitialized) {
        return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading Game World...</div>;
    }

    if (state.liveMatch) {
        return <MatchView gameState={state} dispatch={dispatch} />
    }

    if (!state.playerClubId) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
                <h1 className="text-4xl font-bold text-white mb-2">foot</h1>
                <p className="text-lg text-gray-400 mb-8">Select a club to manage</p>
                <div className="w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg p-4">
                    <ul className="space-y-2">
                        {Object.values(state.clubs).map((club: Club) => (
                            <li key={club.id}>
                                <button
                                    onClick={() => handleSelectClub(club.id)}
                                    className="w-full text-left p-3 bg-gray-700 hover:bg-green-600 rounded-md transition-colors duration-200"
                                >
                                    <span className="font-semibold">{club.name}</span>
                                    <span className="text-sm text-gray-400 ml-4">Rep: {club.reputation}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }
    
    return (
        <div className="flex h-screen bg-gray-800 font-sans">
            <Navigation currentView={currentView} setCurrentView={setCurrentView} gameState={state} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header gameState={state} onAdvanceDay={handleAdvanceDay} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
                    {renderView()}
                </main>
            </div>
            {selectedPlayer && <PlayerProfileModal player={selectedPlayer} gameState={state} dispatch={dispatch} onClose={closePlayerModal} />}
            {state.matchDayFixtures && <MatchDayModal fixtures={state.matchDayFixtures} gameState={state} dispatch={dispatch} onClose={closeMatchDayModal} />}
            {state.matchDayResults && <MatchResultsModal results={state.matchDayResults} gameState={state} onClose={closeMatchResultsModal} />}
            {state.transferResult && <TransferResultModal result={state.transferResult} onClose={closeTransferResultModal} />}
            {selectedMatchForReport && <MatchReportModal match={selectedMatchForReport} gameState={state} onClose={closeMatchReportModal} />}
        </div>
    );
};

export default App;