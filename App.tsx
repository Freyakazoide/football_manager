import React, { useState, useReducer, useEffect, useCallback } from 'react';
import { GameState, View, Club, Player, Match, PlayerRole } from './types';
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
import PlayerProfileView from './components/PlayerProfileView';
import MatchDayModal from './components/MatchDayModal';
import TransferResultModal from './components/TransferResultModal';
import MatchView from './components/MatchView';
import NewsView from './components/NewsView';
import MatchResultsModal from './components/MatchResultsModal';
import MatchReportModal from './components/MatchReportModal';
import TeamView from './components/TeamView';
import TrainingView from './components/TrainingView';
import ScoutingView from './components/ScoutingView';
import StaffView from './components/StaffView';
import SeasonReviewModal from './components/SeasonReviewModal';

const roleOrder: Record<PlayerRole, number> = {
    // GK
    'Goalkeeper': 1, 'Sweeper Keeper': 2,
    // DEF
    'Libero': 10, 'Central Defender': 11, 'Ball-Playing Defender': 12,
    'Full-Back': 13, 'Wing-Back': 14, 'Inverted Wing-Back': 15,
    // MID
    'Defensive Midfielder': 20, 'Deep Lying Playmaker': 21, 'Ball Winning Midfielder': 22,
    'Carrilero': 23, 'Central Midfielder': 24, 'Box-To-Box Midfielder': 25, 'Roaming Playmaker': 26,
    'Mezzala': 27, 'Wide Midfielder': 28, 'Wide Playmaker': 29,
    // AM
    'Attacking Midfielder': 30, 'Advanced Playmaker': 31, 'Trequartista': 32,
    'Shadow Striker': 33,
    // FWD
    'False Nine': 40, 'Deep-Lying Forward': 41, 'Poacher': 42, 'Advanced Forward': 43, 'Striker': 44, 'Complete Forward': 45,
};

const getMoraleIcon = (morale: number): string => {
    if (morale > 75) return '😊'; if (morale > 50) return '😐'; return '😞';
}

const ClubSquadModal: React.FC<{
    club: Club;
    gameState: GameState;
    onClose: () => void;
    onPlayerClick: (player: Player) => void;
}> = ({ club, gameState, onClose, onPlayerClick }) => {
    const squadPlayers = Object.values(gameState.players)
        .filter((p: Player) => p.clubId === club.id)
        .sort((a: Player, b: Player) => (roleOrder[a.naturalPosition] || 99) - (roleOrder[b.naturalPosition] || 99));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">{club.name} - Squad</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                <div className="p-4 overflow-y-auto">
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-700 text-gray-400">
                            <tr>
                                <th className="p-3">Name</th>
                                <th className="p-3">Position</th>
                                <th className="p-3 text-center" title="Status">St</th>
                                <th className="p-3 text-center" title="Morale">Mor</th>
                                <th className="p-3 text-center" title="Match Fitness">Fit</th>
                                <th className="p-3">Age</th>
                                <th className="p-3 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {squadPlayers.map((player: Player) => (
                                <tr
                                    key={player.id}
                                    className={`border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${(player.injury || player.suspension) ? 'opacity-60' : ''}`}
                                    onClick={() => onPlayerClick(player)}
                                >
                                    <td className="p-3 font-semibold">{player.name}</td>
                                    <td className="p-3">{player.naturalPosition}</td>
                                    <td className="p-3 text-center">
                                        {player.injury && <span className="text-red-500 font-bold" title={`Injured: ${player.injury.type}`}>✚</span>}
                                        {player.suspension && <span className="text-red-500 font-bold" title={`Suspended`}>■</span>}
                                    </td>
                                    <td className="p-3 text-center" title={`${player.morale}`}>{getMoraleIcon(player.morale)}</td>
                                    <td className="p-3 text-center">{player.matchFitness}</td>
                                    <td className="p-3">{player.age}</td>
                                    <td className="p-3 text-right">
                                        {player.marketValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
    const [state, dispatch] = useReducer(gameReducer, initialState);
    const [viewHistory, setViewHistory] = useState<{ view: View; context?: any }[]>([{ view: View.TEAM }]);
    const [historyIndex, setHistoryIndex] = useState(0);
    const [selectedMatchForReport, setSelectedMatchForReport] = useState<Match | null>(null);
    const [viewingClub, setViewingClub] = useState<Club | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const currentViewInfo = viewHistory[historyIndex];
    const currentView = currentViewInfo.view;

    useEffect(() => {
        if (!isInitialized) {
            const db = generateInitialDatabase();
            dispatch({ type: 'INITIALIZE_GAME', payload: db });
            setIsInitialized(true);
        }
    }, [isInitialized]);

    const handleNavigate = useCallback((view: View, context?: any) => {
        const newHistoryEntry = { view, context };
        const newHistory = [...viewHistory.slice(0, historyIndex + 1), newHistoryEntry];
        setViewHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [viewHistory, historyIndex]);

    const handleGoBack = useCallback(() => {
        if (historyIndex > 0) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex]);

    const handleGoForward = useCallback(() => {
        if (historyIndex < viewHistory.length - 1) {
            setHistoryIndex(prev => prev - 1);
        }
    }, [historyIndex, viewHistory.length]);

    const handleSelectClub = (clubId: number) => {
        dispatch({ type: 'SELECT_PLAYER_CLUB', payload: clubId });
    };

    const handleAdvanceDay = useCallback(() => {
        dispatch({ type: 'ADVANCE_DAY' });
    }, [dispatch]);
    
    const handleStartNewSeason = useCallback(() => {
        dispatch({ type: 'START_NEW_SEASON' });
    }, [dispatch]);

    const handlePlayerClick = (player: Player) => {
        handleNavigate(View.PLAYER_PROFILE, { playerId: player.id });
    };

    const closeMatchDayModal = () => {
        dispatch({ type: 'CLEAR_MATCH_DAY_FIXTURES' });
    };

    const handleGoToTactics = () => {
        handleNavigate(View.TACTICS);
        closeMatchDayModal();
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

    const handleViewClub = (clubId: number) => {
        setViewingClub(state.clubs[clubId]);
    };
    const closeViewClubModal = () => {
        setViewingClub(null);
    };

    const renderView = () => {
        if (!state.playerClubId) return null;
        switch (currentView) {
            case View.SQUAD:
                return <SquadView gameState={state} onPlayerClick={handlePlayerClick} />;
            case View.TEAM:
                return <TeamView gameState={state} />;
            case View.TACTICS:
                return <TacticsView gameState={state} dispatch={dispatch} />;
            case View.STAFF:
                return <StaffView gameState={state} dispatch={dispatch} />;
            case View.COMPETITION:
                return <CompetitionView gameState={state} onClubClick={handleViewClub} />;
            case View.CALENDAR:
                return <CalendarView gameState={state} onMatchClick={handleMatchClick} />;
            case View.FINANCES:
                return <FinancesView gameState={state} />;
            case View.TRANSFERS:
                return <TransfersView gameState={state} onPlayerClick={handlePlayerClick} />;
            case View.NEWS:
                return <NewsView gameState={state} dispatch={dispatch} />;
            case View.TRAINING:
                return <TrainingView gameState={state} dispatch={dispatch} />;
            case View.SCOUTING:
                return <ScoutingView gameState={state} dispatch={dispatch} onPlayerClick={handlePlayerClick} />;
            case View.PLAYER_PROFILE:
                const playerId = currentViewInfo.context?.playerId;
                if (!playerId) return <SquadView gameState={state} onPlayerClick={handlePlayerClick} />;
                return <PlayerProfileView playerId={playerId} gameState={state} dispatch={dispatch} onPlayerClick={handlePlayerClick} />;
            default:
                return <TeamView gameState={state} />;
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
            <Navigation currentView={currentView} onNavigate={handleNavigate} gameState={state} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    gameState={state} 
                    onAdvanceDay={handleAdvanceDay} 
                    onGoBack={handleGoBack}
                    onGoForward={handleGoForward}
                    canGoBack={historyIndex > 0}
                    canGoForward={historyIndex < viewHistory.length - 1}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 lg:p-8">
                    {renderView()}
                </main>
            </div>
            {state.seasonReviewData && <SeasonReviewModal reviewData={state.seasonReviewData} gameState={state} onContinue={handleStartNewSeason} />}
            {state.matchDayFixtures && <MatchDayModal fixtures={state.matchDayFixtures} gameState={state} dispatch={dispatch} onGoToTactics={handleGoToTactics} />}
            {state.matchDayResults && <MatchResultsModal results={state.matchDayResults} gameState={state} onClose={closeMatchResultsModal} />}
            {state.transferResult && <TransferResultModal result={state.transferResult} onClose={closeTransferResultModal} />}
            {selectedMatchForReport && <MatchReportModal match={selectedMatchForReport} gameState={state} onClose={closeMatchReportModal} onPlayerClick={handlePlayerClick} />}
            {viewingClub && <ClubSquadModal club={viewingClub} gameState={state} onClose={closeViewClubModal} onPlayerClick={handlePlayerClick} />}
        </div>
    );
};

export default App;