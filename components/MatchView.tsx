import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameState, LivePlayer, Mentality, LiveMatchState, PlayerRole, PlayerInstructions, LineupPlayer, Player, MatchEvent } from '../types';
import { Action } from '../services/reducerTypes';
import { runMinute } from '../services/matchEngine';
import { getUnitRatings } from '../services/simulationService';
import { ROLE_DEFINITIONS } from '../services/database';
import PlayerInstructionModal from './PlayerInstructionModal';


const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

const getRoleFromPosition = (x: number, y: number): PlayerRole => {
    if (y > 90) return 'Goalkeeper';
    if (y > 85 && x > 35 && x < 65) return 'Libero';
    if (y > 68 && x > 30 && x < 70) return 'Central Defender';
    if (y > 55) {
        if (x < 20 || x > 80) return 'Wing-Back';
        if (x < 30 || x > 70) return 'Full-Back';
    }
    if (y > 60 && x > 30 && x < 70) return 'Defensive Midfielder';
    if (y > 40 && x > 35 && x < 65) return 'Central Midfielder';
    if (y > 35 && (x < 25 || x > 75)) return 'Wide Midfielder';
    if (y > 25 && y < 45 && x > 30 && x < 70) return 'Attacking Midfielder';
    if (y < 30 && x > 35 && x < 65) return 'Striker';
    if (y > 65) return 'Central Defender';
    if (y > 35) return 'Central Midfielder';
    return 'Striker';
};

const ForcedSubstitutionModal: React.FC<{
    liveMatch: LiveMatchState;
    dispatch: React.Dispatch<Action>;
    playerBench: LivePlayer[];
    playerTeam: LivePlayer[];
    subsMade: number;
}> = ({ liveMatch, dispatch, playerBench, playerTeam, subsMade }) => {
    if (!liveMatch.forcedSubstitution) return null;

    const { playerOutId, reason } = liveMatch.forcedSubstitution;
    const playerOut = [...playerTeam, ...playerBench].find(p => p.id === playerOutId);
    
    const handleSubstitute = (playerInId: number) => {
        dispatch({ type: 'MAKE_SUBSTITUTION', payload: { playerOutId, playerInId }});
    }

    const handleDismiss = () => {
        dispatch({ type: 'DISMISS_FORCED_SUBSTITUTION' });
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md text-white p-6">
                <h2 className={`text-2xl font-bold mb-2 ${reason === 'injury' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {reason === 'injury' ? 'Player Injured!' : 'Player Sent Off!'}
                </h2>
                <p className="text-gray-300 mb-4">{playerOut?.name} ({playerOut?.role}) must leave the pitch. You need to make a tactical change.</p>
                
                <h3 className="font-bold mb-2">Bring On:</h3>
                <div className="grid grid-cols-2 gap-2 mb-4 max-h-48 overflow-y-auto">
                    {playerBench.map(p => (
                        <button 
                            key={p.id}
                            onClick={() => handleSubstitute(p.id)}
                            disabled={subsMade >= 5}
                            className="bg-gray-700 hover:bg-green-600 p-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {p.name}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                    <button 
                        onClick={handleDismiss}
                        className="w-full bg-gray-600 hover:bg-gray-700 p-2 rounded text-sm">
                        Continue with fewer players
                    </button>
                </div>
            </div>
        </div>
    );
};


const StatBar: React.FC<{ home: number, away: number, label: string, isXG?: boolean }> = ({ home, away, label, isXG }) => {
    const total = home + away;
    const homePercent = total > 0 ? (home / total) * 100 : 50;

    return (
        <div className="w-full">
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-bold font-mono">{isXG ? home.toFixed(2) : Math.round(home)}</span>
                <span className="text-gray-400 text-xs">{label}</span>
                <span className="font-bold font-mono">{isXG ? away.toFixed(2) : Math.round(away)}</span>
            </div>
            <div className="flex w-full h-2 bg-gray-700/50 rounded">
                <div className="bg-blue-500 rounded-l" style={{ width: `${homePercent}%` }}></div>
                <div className="bg-red-500 rounded-r" style={{ width: `${100 - homePercent}%` }}></div>
            </div>
        </div>
    );
};

const PreMatchPreview: React.FC<{ liveMatch: LiveMatchState, gameState: GameState, dispatch: React.Dispatch<Action> }> = ({ liveMatch, gameState, dispatch }) => {
    const homeRatings = getUnitRatings(liveMatch.homeTeamId, gameState.clubs, gameState.players);
    const awayRatings = getUnitRatings(liveMatch.awayTeamId, gameState.clubs, gameState.players);
    const homeOverall = (homeRatings.def + homeRatings.mid + homeRatings.fwd + homeRatings.gk) / 4;
    const awayOverall = (awayRatings.def + awayRatings.mid + awayRatings.fwd + awayRatings.gk) / 4;

    const getProbabilities = () => {
        const diff = homeOverall - awayOverall;
        if (diff > 10) return { homeWin: 70, draw: 20, awayWin: 10 };
        if (diff > 5) return { homeWin: 55, draw: 25, awayWin: 20 };
        if (diff > -5) return { homeWin: 40, draw: 30, awayWin: 30 };
        if (diff > -10) return { homeWin: 20, draw: 25, awayWin: 55 };
        return { homeWin: 10, draw: 20, awayWin: 70 };
    };

    const { homeWin, draw, awayWin } = getProbabilities();

    const renderLineup = (lineup: LivePlayer[], teamName: string) => (
        <div>
            <h3 className="text-xl font-bold mb-3 text-center">{teamName}</h3>
            <ul className="bg-gray-700/50 rounded p-3 space-y-1 text-sm h-64 overflow-y-auto">
                {lineup.map(player => (
                    <li key={player.id} className="flex justify-between">
                        <span>{player.name}</span>
                        <span className="font-mono text-gray-400">{player.role.split(' ').map(w=>w[0]).join('')}</span>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <div className="h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gray-800 rounded-lg shadow-xl p-6 animate-fade-in">
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold">{liveMatch.homeTeamName} vs {liveMatch.awayTeamName}</h1>
                    <p className="text-gray-400 mt-2">League Match</p>
                </div>

                <div className="mb-8">
                    <h2 className="text-center text-lg font-semibold mb-2">Match Prediction</h2>
                    <div className="flex w-full h-8 rounded-lg overflow-hidden bg-gray-700 shadow-inner">
                        <div style={{ width: `${homeWin}%` }} className="bg-blue-600 flex items-center justify-center font-bold text-xs transition-all duration-500">{homeWin}%</div>
                        <div style={{ width: `${draw}%` }} className="bg-gray-500 flex items-center justify-center font-bold text-xs transition-all duration-500">{draw}%</div>
                        <div style={{ width: `${awayWin}%` }} className="bg-red-600 flex items-center justify-center font-bold text-xs transition-all duration-500">{awayWin}%</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {renderLineup(liveMatch.homeLineup, liveMatch.homeTeamName)}
                    {renderLineup(liveMatch.awayLineup, liveMatch.awayTeamName)}
                </div>

                <div className="text-center mt-8">
                    <button onClick={() => dispatch({ type: 'RESUME_MATCH' })} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-12 rounded-lg text-lg transition duration-300 transform hover:scale-105">
                        Start Match
                    </button>
                </div>
            </div>
        </div>
    );
};

const FormationDisplayPitch: React.FC<{
    title: string;
    teamLineup: LivePlayer[];
    opponentLineup?: LivePlayer[];
    teamColor: string;
    opponentColor?: string;
    isPlayerTeam: boolean;
    isTacticsView: boolean;
    onPlayerMouseDown: (e: React.MouseEvent<HTMLDivElement>, player: LivePlayer) => void;
    onPlayerClick: (e: React.MouseEvent<HTMLDivElement>, player: LivePlayer, isOpponent: boolean) => void;
    gameState: GameState;
    highlightedPlayerIds: Set<number>;
    cardedPlayers: Map<number, 'yellow' | 'red'>;
    isHome: boolean;
}> = ({ title, teamLineup, opponentLineup = [], teamColor, opponentColor = 'bg-gray-500', isPlayerTeam, isTacticsView, onPlayerMouseDown, onPlayerClick, gameState, highlightedPlayerIds, cardedPlayers, isHome }) => {

    const renderPlayerIcon = (player: LivePlayer, isOpponent: boolean) => {
        const displayPos = {
            x: isHome ? player.currentPosition.x : 100 - player.currentPosition.x,
            y: isHome ? player.currentPosition.y : 100 - player.currentPosition.y,
        };
        const isHighlighted = highlightedPlayerIds.has(player.id);
        const card = cardedPlayers.get(player.id);
        const color = isOpponent ? opponentColor : teamColor;
        const size = isPlayerTeam ? 'w-10 h-10' : 'w-8 h-8';
        const fontSize = isPlayerTeam ? 'text-xs' : 'text-[10px]';

        return (
            <div key={`${isOpponent ? 'opp' : 'player'}-${player.id}`}
                 className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ease-in-out ${isTacticsView ? 'cursor-grab' : 'cursor-pointer'} ${isHighlighted ? 'z-30' : 'z-10'}`}
                 style={{ top: `${displayPos.y}%`, left: `${displayPos.x}%` }}
                 onMouseDown={(e) => isTacticsView && onPlayerMouseDown(e, player)}
                 onClick={(e) => onPlayerClick(e, player, isOpponent)}
            >
                {isHighlighted && <div className="absolute -inset-2 rounded-full bg-yellow-400/50 animate-ping"></div>}
                
                <div className={`relative ${size} rounded-full flex items-center justify-center font-bold ${fontSize} text-white shadow-lg border-2 border-yellow-400 ${player.stamina > 60 ? color : player.stamina > 30 ? 'bg-yellow-600' : 'bg-red-600'}`}>
                    {player.role.split(' ').map(w => w[0]).join('')}
                    {card && <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-sm ${card === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'} border border-black`}></div>}
                </div>

                <div className="absolute top-full text-center text-xs font-semibold whitespace-nowrap bg-black/50 px-1 rounded flex flex-col items-center mt-1 -translate-x-1/2 left-1/2">
                    <span>{player.name.split(' ')[1]}</span>
                    {isPlayerTeam && (
                        <div className='w-10 mt-1 space-y-0.5'>
                            <div className='w-full bg-gray-600 rounded-full h-1' title={`Stamina: ${Math.round(player.stamina)}%`}><div className='bg-green-500 h-1 rounded-full' style={{width: `${player.stamina}%`}}></div></div>
                            <div className='w-full bg-gray-600 rounded-full h-1' title={`Rating: ${player.stats.rating.toFixed(1)}`}><div className='bg-blue-400 h-1 rounded-full' style={{width: `${player.stats.rating * 10}%`}}></div></div>
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    return (
        <div className="relative h-full bg-green-900 bg-center bg-no-repeat rounded-lg shadow-inner flex flex-col p-2">
            <h3 className="text-center text-white font-bold text-sm bg-black/30 rounded-t-md py-1">{title}</h3>
            <div className="relative flex-1" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 1000'%3e%3crect x='2' y='2' width='696' height='996' fill='none' stroke='%231A4731' stroke-width='4'/%3e%3cline x1='2' y1='500' x2='698' y2='500' stroke='%231A4731' stroke-width='4'/%3e%3ccircle cx='350' cy='500' r='91.5' fill='none' stroke='%231A4731' stroke-width='4'/%3e%3c/svg%3e")`}}>
                {teamLineup.filter(p => !p.isSentOff && !p.isInjured).map(player => renderPlayerIcon(player, false))}
                {opponentLineup.filter(p => !p.isSentOff && !p.isInjured).map(player => renderPlayerIcon(player, true))}
            </div>
        </div>
    );
};


const MatchView: React.FC<{ gameState: GameState, dispatch: React.Dispatch<Action> }> = ({ gameState, dispatch }) => {
    const { liveMatch } = gameState;
    const logEndRef = useRef<HTMLDivElement>(null);
    const pitchRef = useRef<HTMLDivElement>(null);
    const dragInfo = useRef({ isMouseDown: false, isDragging: false, startX: 0, startY: 0, player: null as LivePlayer | null, element: null as HTMLDivElement | null });

    const [activeTab, setActiveTab] = useState<'events' | 'tactics' | 'stats' | 'player stats'>('events');
    const [playerToSub, setPlayerToSub] = useState<number | null>(null);
    const [simSpeed, setSimSpeed] = useState(1000);
    const [instructionModalPlayer, setInstructionModalPlayer] = useState<LivePlayer | null>(null);
    const [highlightedPlayerIds, setHighlightedPlayerIds] = useState<Set<number>>(new Set());
    const [playerPopover, setPlayerPopover] = useState<{ player: Player; livePlayer: LivePlayer; position: { top: number; left: number } } | null>(null);
    const [activeShout, setActiveShout] = useState<string | null>(null);
    
    const cardedPlayers = useMemo(() => {
        const cards = new Map<number, 'yellow' | 'red'>();
        if (!liveMatch) return cards;
        for (const event of liveMatch.log) {
            if (event.type === 'YellowCard' && event.primaryPlayerId) {
                if (cards.get(event.primaryPlayerId) !== 'red') {
                    cards.set(event.primaryPlayerId, 'yellow');
                }
            } else if (event.type === 'RedCard' && event.primaryPlayerId) {
                cards.set(event.primaryPlayerId, 'red');
            }
        }
        return cards;
    }, [liveMatch?.log]);


    useEffect(() => {
        if (liveMatch && !liveMatch.isPaused) {
            const timer = setInterval(() => {
                const { newState, newEvents } = runMinute(liveMatch);
                dispatch({ type: 'ADVANCE_MINUTE', payload: { newState, newEvents } });
            }, simSpeed);
            return () => clearInterval(timer);
        }
    }, [liveMatch, dispatch, simSpeed]);

    useEffect(() => {
        if (activeTab === 'events') {
             logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [liveMatch?.log, activeTab]);
    
    const handleEventClick = (event: MatchEvent) => {
        const idsToHighlight = new Set<number>();
        if (event.primaryPlayerId) idsToHighlight.add(event.primaryPlayerId);
        if (event.secondaryPlayerId) idsToHighlight.add(event.secondaryPlayerId);

        if (idsToHighlight.size > 0) {
            setHighlightedPlayerIds(idsToHighlight);
            setTimeout(() => setHighlightedPlayerIds(new Set()), 3000);
        }
    }
    
    const handlePlayerMouseDown = (e: React.MouseEvent<HTMLDivElement>, player: LivePlayer) => {
        e.preventDefault();
        dragInfo.current = { isMouseDown: true, isDragging: false, startX: e.clientX, startY: e.clientY, player: player, element: e.currentTarget as HTMLDivElement };
    };
    
    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!dragInfo.current.isMouseDown || !pitchRef.current) return;
        const { startX, startY, element } = dragInfo.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (!dragInfo.current.isDragging && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
            dragInfo.current.isDragging = true;
            if (element) {
                element.style.zIndex = '20';
                element.style.transform = 'translate(-50%, -50%) scale(1.25)';
            }
        }

        if (dragInfo.current.isDragging && element) {
            const pitchRect = pitchRef.current.getBoundingClientRect();
            const x = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
            const y = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;
            element.style.left = `${Math.max(0, Math.min(100, x))}%`;
            element.style.top = `${Math.max(0, Math.min(100, y))}%`;
        }
    }, []);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (!dragInfo.current.isMouseDown) return;
        const { isDragging, player, element } = dragInfo.current;
        if (element) {
            element.style.zIndex = '10';
            element.style.transform = 'translate(-50%, -50%)';
        }

        if (isDragging && player && pitchRef.current) {
            const pitchRect = pitchRef.current.getBoundingClientRect();
            let x = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
            let y = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            const playerTeamIsHome = liveMatch!.homeTeamId === gameState.playerClubId;
            const modelX = playerTeamIsHome ? x : 100 - x;
            const modelY = playerTeamIsHome ? y : 100 - y;

            dispatch({
                type: 'UPDATE_LIVE_PLAYER_POSITION',
                payload: { playerId: player.id, position: { x: modelX, y: modelY }, role: getRoleFromPosition(modelX, modelY) }
            });
        } else if (player && liveMatch?.isPaused) {
            setInstructionModalPlayer(player);
        }

        dragInfo.current = { isMouseDown: false, isDragging: false, startX: 0, startY: 0, player: null, element: null };
    }, [dispatch, liveMatch, gameState.playerClubId]);

    useEffect(() => {
        const handleGlobalClick = () => setPlayerPopover(null);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('click', handleGlobalClick);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('click', handleGlobalClick);
        };
    }, [onMouseMove, onMouseUp]);

    const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>, player: LivePlayer, isOpponent: boolean) => {
        if (dragInfo.current.isDragging || (liveMatch?.isPaused && isOpponent === false)) return;
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPlayerPopover({ player: gameState.players[player.id], livePlayer: player, position: { top: rect.bottom, left: rect.left } });
    };

    const handleSaveInstructions = (updatedLineupPlayer: LineupPlayer) => {
        dispatch({
            type: 'UPDATE_LIVE_PLAYER_INSTRUCTIONS',
            payload: { playerId: updatedLineupPlayer.playerId, instructions: updatedLineupPlayer.instructions, }
        });
        dispatch({
            type: 'UPDATE_LIVE_PLAYER_POSITION',
            payload: { playerId: updatedLineupPlayer.playerId, position: updatedLineupPlayer.position, role: updatedLineupPlayer.role, }
        });
        setInstructionModalPlayer(null);
    };

    if (!liveMatch) return <div>Loading match...</div>;

    if (liveMatch.status === 'pre-match') {
        return <PreMatchPreview liveMatch={liveMatch} gameState={gameState} dispatch={dispatch} />;
    }

    const playerTeamIsHome = liveMatch.homeTeamId === gameState.playerClubId;
    const playerTeam = playerTeamIsHome ? liveMatch.homeLineup : liveMatch.awayLineup;
    const opponentTeam = playerTeamIsHome ? liveMatch.awayLineup : liveMatch.homeLineup;
    const playerBench = playerTeamIsHome ? liveMatch.homeBench : liveMatch.awayBench;
    const playerSubsMade = playerTeamIsHome ? liveMatch.homeSubsMade : liveMatch.awaySubsMade;
    
    const totalPossession = liveMatch.homePossessionMinutes + liveMatch.awayPossessionMinutes;
    const homePossession = totalPossession > 0 ? (liveMatch.homePossessionMinutes / totalPossession) * 100 : 50;
    const awayPossession = totalPossession > 0 ? 100 - homePossession : 50;

    const handleSimulateToEnd = () => {
        let tempState: LiveMatchState = JSON.parse(JSON.stringify(liveMatch));
        
        while (tempState.status !== 'full-time') {
            if (tempState.isPaused && tempState.forcedSubstitution) {
                // Simplified AI sub logic for sim-to-end
                 tempState.forcedSubstitution = null;
                 tempState.isPaused = false;
            }

            const { newState } = runMinute(tempState);
            tempState = newState;
        }
        dispatch({ type: 'ADVANCE_MINUTE', payload: { newState: tempState, newEvents: [] } });
    };
    
    const renderTeamStatsTable = (players: LivePlayer[], bench: LivePlayer[], teamName: string) => {
        const allPlayers = [...players, ...bench];
        return (
            <div className="mb-4">
                <h4 className="font-bold text-white mb-2">{teamName}</h4>
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="text-gray-400">
                            <th className="p-1">Name</th>
                            <th className="p-1 text-center" title="Goals">G</th>
                            <th className="p-1 text-center" title="Assists">A</th>
                            <th className="p-1 text-center" title="Shots">S</th>
                            <th className="p-1 text-center" title="Tackles">T</th>
                            <th className="p-1 text-center font-bold" title="Rating">Rat</th>
                        </tr>
                    </thead>
                    <tbody>
                        {allPlayers.map(player => (
                            <tr key={player.id} className="border-t border-gray-700">
                                <td className="p-1">{player.name}</td>
                                <td className="p-1 text-center">{player.stats.goals}</td>
                                <td className="p-1 text-center">{player.stats.assists}</td>
                                <td className="p-1 text-center">{player.stats.shots}</td>
                                <td className="p-1 text-center">{player.stats.tackles}</td>
                                <td className={`p-1 text-center font-bold ${player.stats.rating >= 8 ? 'text-green-400' : player.stats.rating < 6 ? 'text-red-400' : ''}`}>
                                    {player.stats.rating.toFixed(1)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderSidePanel = () => (
        <div className="bg-gray-800 rounded-lg flex flex-col h-full overflow-hidden min-h-0">
            <div className="p-2">
                {liveMatch.status !== 'full-time' && (
                     <div className="mb-2">
                        <h4 className="font-bold text-white mb-1 text-center text-xs">Sim Speed</h4>
                        <div className="grid grid-cols-3 gap-1">
                            <button onClick={() => setSimSpeed(2000)} className={`p-1 rounded text-xs ${simSpeed === 2000 ? 'bg-green-600' : 'bg-gray-700'}`}>Slow</button>
                            <button onClick={() => setSimSpeed(1000)} className={`p-1 rounded text-xs ${simSpeed === 1000 ? 'bg-green-600' : 'bg-gray-700'}`}>Normal</button>
                            <button onClick={() => setSimSpeed(500)} className={`p-1 rounded text-xs ${simSpeed === 500 ? 'bg-green-600' : 'bg-gray-700'}`}>Fast</button>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                    {liveMatch.status !== 'full-time' && (
                        liveMatch.isPaused
                        ? <button onClick={() => dispatch({ type: 'RESUME_MATCH' })} className="p-3 bg-green-600 rounded font-bold text-sm">Resume</button>
                        : <button onClick={() => dispatch({ type: 'PAUSE_MATCH' })} className="p-3 bg-yellow-600 rounded font-bold text-sm">Pause</button>
                    )}
                     {liveMatch.status === 'full-time' && (
                        <button onClick={() => dispatch({ type: 'END_MATCH' })} className="col-span-2 p-3 bg-red-600 rounded font-bold text-sm">Finish Match</button>
                     )}
                    {liveMatch.status !== 'full-time' && <button onClick={handleSimulateToEnd} className="w-full p-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Sim to End</button>}
                </div>
            </div>

            <div className="flex border-b border-t border-gray-700">
                {(['events', 'tactics', 'stats', 'player stats'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 text-sm capitalize ${activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>
                        {tab.replace(' stats', ' Stats')}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'events' && (
                    <div className="space-y-2 text-sm">
                       {liveMatch.log.map((event, i) => (
                           <div key={i} className="flex gap-2 cursor-pointer hover:bg-gray-700/50 p-1 rounded" onClick={() => handleEventClick(event)}>
                               <span className="font-bold w-8">{event.minute}'</span>
                               <span className={`flex-1 ${event.type === 'Goal' ? 'text-green-400 font-bold' : event.type === 'RedCard' ? 'text-red-500 font-bold' : event.type === 'YellowCard' ? 'text-yellow-400' : ''}`}>{event.text}</span>
                           </div>
                       ))}
                       <div ref={logEndRef} />
                    </div>
                )}
                {activeTab === 'tactics' && (
                     <div>
                        <h4 className="font-bold text-white mb-2">Mentality</h4>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                        {(['Defensive', 'Balanced', 'Offensive'] as Mentality[]).map(m => (
                            <button key={m} onClick={() => dispatch({ type: 'CHANGE_LIVE_TACTICS', payload: { mentality: m } })} className={`p-2 rounded text-xs ${liveMatch.homeMentality === m ? 'bg-green-600' : 'bg-gray-700'}`}>{m}</button>
                        ))}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-bold text-white mb-2">On Pitch <span className="text-gray-400 font-normal text-xs">(click to sub)</span></h4>
                                {playerTeam.filter(p => !p.isSentOff && !p.isInjured).map(p => (
                                    <button key={p.id} onClick={() => setPlayerToSub(p.id)} className={`w-full text-left p-1.5 rounded mb-1 text-xs ${playerToSub === p.id ? 'bg-green-600' : 'bg-gray-700'}`}>
                                        {p.name.split(' ')[1]} ({p.role.split(' ').map(w=>w[0]).join('')}) <span className="text-gray-400">{Math.round(p.stamina)}%</span>
                                    </button>
                                ))}
                            </div>
                            <div>
                                <h4 className="font-bold text-white mb-2">Bench <span className="text-gray-400 font-normal text-xs">({5-playerSubsMade} left)</span></h4>
                                {playerBench.map(p => {
                                    const fullPlayer = gameState.players[p.id];
                                    const isUnavailable = !!fullPlayer.suspension;
                                    return (
                                        <button key={p.id} onClick={() => { if(playerToSub) { dispatch({ type: 'MAKE_SUBSTITUTION', payload: { playerOutId: playerToSub, playerInId: p.id } }); setPlayerToSub(null); } }} disabled={!playerToSub || playerSubsMade >= 5 || isUnavailable} className="w-full text-left p-1.5 rounded mb-1 text-xs bg-gray-700 disabled:opacity-50 relative">
                                            {p.name.split(' ')[1]}
                                            {isUnavailable && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 font-bold">■</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                     </div>
                )}
                {activeTab === 'stats' && (
                    <div className="text-sm space-y-4">
                        <StatBar label="Possession" home={homePossession} away={awayPossession} />
                        <StatBar label="Shots" home={liveMatch.homeStats.shots} away={liveMatch.awayStats.shots} />
                        <StatBar label="On Target" home={liveMatch.homeStats.shotsOnTarget} away={liveMatch.awayStats.shotsOnTarget} />
                        <StatBar label="xG" home={liveMatch.homeStats.xG} away={liveMatch.awayStats.xG} isXG />
                        <StatBar label="Passes" home={liveMatch.homeStats.passes} away={liveMatch.awayStats.passes} />
                        <StatBar label="Tackles" home={liveMatch.homeStats.tackles} away={liveMatch.awayStats.tackles} />
                    </div>
                )}
                 {activeTab === 'player stats' && (
                    <div>
                        {renderTeamStatsTable(liveMatch.homeLineup, liveMatch.homeBench, liveMatch.homeTeamName)}
                        {renderTeamStatsTable(liveMatch.awayLineup, liveMatch.awayBench, liveMatch.awayTeamName)}
                    </div>
                )}
            </div>
        </div>
    );
    
    const lineupPlayerForModal = instructionModalPlayer ? {
        playerId: instructionModalPlayer.id,
        position: instructionModalPlayer.currentPosition,
        role: instructionModalPlayer.role,
        instructions: instructionModalPlayer.instructions,
    } : null;
    
    // FIX: Changed JSX.Element to React.JSX.Element to fix TypeScript error.
    const shouts: {label: string, key: Extract<Action, { type: 'UPDATE_TEAM_INSTRUCTIONS' }>['payload']['shout'], icon: React.JSX.Element}[] = [
        { label: 'Press More', key: 'press_more', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clipRule="evenodd" /></svg> },
        { label: 'Hold Position', key: 'hold_position', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg> },
        { label: 'Attack Flanks', key: 'attack_flanks', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M11 3a1 1 0 10-2 0v1.586l-3.293-3.293a1 1 0 10-1.414 1.414L7.586 6H6a1 1 0 000 2h1.586l-3.293 3.293a1 1 0 101.414 1.414L9 9.414V11a1 1 0 102 0V9.414l3.293 3.293a1 1 0 001.414-1.414L12.414 8H14a1 1 0 100-2h-1.586l3.293-3.293a1 1 0 00-1.414-1.414L11 4.586V3z" /></svg> },
        { label: 'Short Passes', key: 'short_passes', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" /></svg> },
        { label: 'Go Direct', key: 'go_direct', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1z" clipRule="evenodd" /><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg> },
    ];
    
    const handleShout = (shout: typeof shouts[0]) => {
        dispatch({ type: 'UPDATE_TEAM_INSTRUCTIONS', payload: { shout: shout.key } });
        setActiveShout(shout.label);
        setTimeout(() => setActiveShout(null), 2000);
    };

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col p-2 gap-2 font-sans">
             {liveMatch.forcedSubstitution && (
                <ForcedSubstitutionModal liveMatch={liveMatch} dispatch={dispatch} playerBench={playerBench} playerTeam={playerTeam} subsMade={playerSubsMade} />
            )}
            {instructionModalPlayer && lineupPlayerForModal && (
                <PlayerInstructionModal player={gameState.players[instructionModalPlayer.id]} lineupPlayer={lineupPlayerForModal} onSave={handleSaveInstructions} onClose={() => setInstructionModalPlayer(null)} />
            )}
            {playerPopover && (
                <div className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 text-xs w-48 z-50 animate-fade-in" style={{ top: playerPopover.position.top + 5, left: playerPopover.position.left }}>
                    <p className="font-bold text-base mb-1">{playerPopover.player.name}</p>
                    <p>Rating: <span className="font-bold">{playerPopover.livePlayer.stats.rating.toFixed(1)}</span></p>
                    <p>Stamina: <span className="font-bold">{Math.round(playerPopover.livePlayer.stamina)}%</span></p>
                    <p>Goals: <span className="font-bold">{playerPopover.livePlayer.stats.goals}</span> | Shots: <span className="font-bold">{playerPopover.livePlayer.stats.shots}</span></p>
                    <p className="mt-2 border-t border-gray-700 pt-2">Pace: {playerPopover.player.attributes.pace} | Tackling: {playerPopover.player.attributes.tackling}</p>
                </div>
            )}

            <header className="bg-gray-800 rounded-lg p-2 flex items-center justify-between shadow-lg">
                <div className="text-right w-2/5"><h2 className="text-xl md:text-2xl font-bold">{liveMatch.homeTeamName}</h2></div>
                <div className="text-center w-1/5">
                    <div className="text-3xl md:text-5xl font-mono tracking-widest">{liveMatch.homeScore} - {liveMatch.awayScore}</div>
                    <div className="text-lg md:text-xl mt-1">{liveMatch.minute}'</div>
                </div>
                <div className="text-left w-2/5"><h2 className="text-xl md:text-2xl font-bold">{liveMatch.awayTeamName}</h2></div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-2 overflow-hidden min-h-0">
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-2" ref={pitchRef}>
                    <FormationDisplayPitch 
                        title="Live View"
                        teamLineup={playerTeam}
                        opponentLineup={opponentTeam}
                        teamColor={playerTeamIsHome ? 'bg-blue-600' : 'bg-red-600'}
                        opponentColor={playerTeamIsHome ? 'bg-red-600' : 'bg-blue-600'}
                        isPlayerTeam={false}
                        isTacticsView={false}
                        onPlayerMouseDown={() => {}}
                        onPlayerClick={handlePlayerClick}
                        gameState={gameState}
                        highlightedPlayerIds={highlightedPlayerIds}
                        cardedPlayers={cardedPlayers}
                        isHome={true} // For positioning reference
                    />
                     <FormationDisplayPitch 
                        title="Your Tactics"
                        teamLineup={playerTeam}
                        teamColor={playerTeamIsHome ? 'bg-blue-600' : 'bg-red-600'}
                        isPlayerTeam={true}
                        isTacticsView={liveMatch.isPaused}
                        onPlayerMouseDown={handlePlayerMouseDown}
                        onPlayerClick={handlePlayerClick}
                        gameState={gameState}
                        highlightedPlayerIds={highlightedPlayerIds}
                        cardedPlayers={cardedPlayers}
                        isHome={playerTeamIsHome}
                    />
                </div>

                <div className="lg:col-span-1 h-full min-h-0">
                   {renderSidePanel()}
                </div>
            </main>
            
            <footer className="relative bg-gray-800 rounded-lg p-3 shadow-lg">
                 {activeShout && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-full animate-fade-out">
                        {activeShout} Activated!
                    </div>
                )}
                <div className="flex justify-center items-center gap-4">
                    {shouts.map(shout => (
                        <button key={shout.key} onClick={() => handleShout(shout)} title={shout.label} className="flex flex-col items-center gap-1 text-gray-300 hover:text-green-400 transition-colors duration-200 disabled:opacity-50" disabled={liveMatch.isPaused || liveMatch.status === 'full-time'}>
                            {shout.icon}
                            <span className="text-xs font-semibold">{shout.label}</span>
                        </button>
                    ))}
                </div>
            </footer>
        </div>
    );
};

export default MatchView;