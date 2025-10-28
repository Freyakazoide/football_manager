import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, LivePlayer, Mentality, LiveMatchState, PlayerRole } from '../types';
import { Action } from '../services/reducerTypes';
import { runMinute } from '../services/matchEngine';
import { getUnitRatings } from '../services/simulationService';

// This function can be moved to a shared utility file later
const getRoleFromPosition = (x: number, y: number): PlayerRole => {
    if (y > 90) return 'GK';
    if (y > 65) { // Defence
        if (x < 30) return 'LB';
        if (x > 70) return 'RB';
        return 'CB';
    }
    if (y > 35) { // Midfield
        if (x < 30) return 'LM';
        if (x > 70) return 'RM';
        if (y > 55) return 'DM';
        return 'CM';
    }
    // Attack
    if (x < 35) return 'LW';
    if (x > 65) return 'RW';
    return 'ST';
};


const StatBar: React.FC<{ home: number, away: number, label: string, isXG?: boolean }> = ({ home, away, label, isXG }) => {
    const total = home + away;
    const homePercent = total > 0 ? (home / total) * 100 : 50;

    return (
        <div className="w-full">
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-bold font-mono">{isXG ? home.toFixed(2) : home}</span>
                <span className="text-gray-400 text-xs">{label}</span>
                <span className="font-bold font-mono">{isXG ? away.toFixed(2) : away}</span>
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
                        <span className="font-mono text-gray-400">{player.role}</span>
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


const MatchView: React.FC<{ gameState: GameState, dispatch: React.Dispatch<Action> }> = ({ gameState, dispatch }) => {
    const { liveMatch } = gameState;
    const logEndRef = useRef<HTMLDivElement>(null);
    const pitchRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState<'events' | 'tactics' | 'stats'>('events');
    const [playerToSub, setPlayerToSub] = useState<number | null>(null);
    const [simSpeed, setSimSpeed] = useState(1000);
    const [draggedPlayer, setDraggedPlayer] = useState<{ id: number, element: HTMLDivElement } | null>(null);

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

    const handlePlayerMouseDown = (e: React.MouseEvent<HTMLDivElement>, player: LivePlayer) => {
        if (liveMatch?.isPaused) {
            e.preventDefault();
            setDraggedPlayer({ id: player.id, element: e.currentTarget as HTMLDivElement });
        }
    };
    
    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedPlayer || !pitchRef.current) return;
        const pitchRect = pitchRef.current.getBoundingClientRect();
        const x = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
        const y = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;
        
        draggedPlayer.element.style.transform = `translate(-50%, -50%)`;
        draggedPlayer.element.style.left = `${Math.max(0, Math.min(100, x))}%`;
        draggedPlayer.element.style.top = `${Math.max(0, Math.min(100, y))}%`;

    }, [draggedPlayer]);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (!draggedPlayer || !pitchRef.current || !liveMatch) return;
        const pitchRect = pitchRef.current.getBoundingClientRect();
        
        let x = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
        let y = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));

        const playerTeamIsHome = liveMatch.homeTeamId === gameState.playerClubId;
        
        // Convert back to model coordinates (home is always bottom)
        const modelX = playerTeamIsHome ? x : 100 - x;
        const modelY = playerTeamIsHome ? y : 100 - y;

        dispatch({
            type: 'UPDATE_LIVE_PLAYER_POSITION',
            payload: {
                playerId: draggedPlayer.id,
                position: { x: modelX, y: modelY },
                role: getRoleFromPosition(modelX, modelY)
            }
        });
        setDraggedPlayer(null);
    }, [draggedPlayer, dispatch, liveMatch, gameState.playerClubId]);

    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);

    if (!liveMatch) return <div>Loading match...</div>;

    if (liveMatch.status === 'pre-match') {
        return <PreMatchPreview liveMatch={liveMatch} gameState={gameState} dispatch={dispatch} />;
    }

    const playerTeamIsHome = liveMatch.homeTeamId === gameState.playerClubId;
    const playerTeam = playerTeamIsHome ? liveMatch.homeLineup : liveMatch.awayLineup;
    const opponentTeam = playerTeamIsHome ? liveMatch.awayLineup : liveMatch.homeLineup;
    const playerBench = playerTeamIsHome ? liveMatch.homeBench : liveMatch.awayBench;
    const playerSubsMade = playerTeamIsHome ? liveMatch.homeSubsMade : liveMatch.awaySubsMade;
    
    const handleSimulateToEnd = () => {
        let tempState: LiveMatchState = JSON.parse(JSON.stringify(liveMatch));
        while(tempState.status !== 'full-time') {
            const { newState } = runMinute(tempState);
            tempState = newState;
        }
        dispatch({ type: 'ADVANCE_MINUTE', payload: { newState: tempState, newEvents: [] } });
    };

    const renderSidePanel = () => {
        return (
            <div className="bg-gray-800 rounded-lg flex flex-col h-full overflow-hidden min-h-0">
                <div className="p-2">
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
                    {(['events', 'tactics', 'stats'] as const).map(tab => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 text-sm capitalize ${activeTab === tab ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>
                            {tab}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {activeTab === 'events' && (
                        <div className="space-y-2 text-sm">
                           {liveMatch.log.map((event, i) => (
                               <div key={i} className="flex gap-2">
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
                                    {playerTeam.filter(p => !p.isSentOff).map(p => (
                                        <button key={p.id} onClick={() => setPlayerToSub(p.id)} className={`w-full text-left p-1.5 rounded mb-1 text-xs ${playerToSub === p.id ? 'bg-green-600' : 'bg-gray-700'}`}>
                                            {p.name.split(' ')[1]} ({p.role}) <span className="text-gray-400">{Math.round(p.stamina)}%</span>
                                        </button>
                                    ))}
                                </div>
                                <div>
                                    <h4 className="font-bold text-white mb-2">Bench <span className="text-gray-400 font-normal text-xs">({5-playerSubsMade} left)</span></h4>
                                    {playerBench.map(p => (
                                        <button key={p.id} onClick={() => { if(playerToSub) { dispatch({ type: 'MAKE_SUBSTITUTION', payload: { playerOutId: playerToSub, playerInId: p.id } }); setPlayerToSub(null); } }} disabled={!playerToSub || playerSubsMade >= 5} className="w-full text-left p-1.5 rounded mb-1 text-xs bg-gray-700 disabled:opacity-50">
                                            {p.name.split(' ')[1]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                         </div>
                    )}
                    {activeTab === 'stats' && (
                        <div className="text-sm space-y-4">
                            <StatBar label="Possession" home={50} away={50} />
                            <StatBar label="Shots" home={liveMatch.homeStats.shots} away={liveMatch.awayStats.shots} />
                            <StatBar label="On Target" home={liveMatch.homeStats.shotsOnTarget} away={liveMatch.awayStats.shotsOnTarget} />
                            <StatBar label="xG" home={liveMatch.homeStats.xG} away={liveMatch.awayStats.xG} isXG />
                            <StatBar label="Passes" home={liveMatch.homeStats.passes} away={liveMatch.awayStats.passes} />
                            <StatBar label="Tackles" home={liveMatch.homeStats.tackles} away={liveMatch.awayStats.tackles} />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col p-4 gap-4 font-sans">
            <header className="bg-gray-800 rounded-lg p-4 flex items-center justify-between shadow-lg">
                <div className="text-right w-2/5"><h2 className="text-2xl font-bold">{liveMatch.homeTeamName}</h2></div>
                <div className="text-center w-1/5">
                    <div className="text-5xl font-mono tracking-widest">{liveMatch.homeScore} - {liveMatch.awayScore}</div>
                    <div className="text-xl mt-1">{liveMatch.minute}'</div>
                </div>
                <div className="text-left w-2/5"><h2 className="text-2xl font-bold">{liveMatch.awayTeamName}</h2></div>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden min-h-0">
                <div className="lg:col-span-2 relative bg-green-800 bg-center bg-no-repeat rounded-lg shadow-inner min-h-0" ref={pitchRef} style={{ backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%2338A169' stroke-width='4' stroke-dasharray='6%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}>
                    {[...playerTeam, ...opponentTeam].map((player) => {
                        const isPlayerTeam = playerTeam.some(p => p.id === player.id);
                        const displayPos = {
                            x: isPlayerTeam ? (playerTeamIsHome ? player.currentPosition.x : 100 - player.currentPosition.x) : (playerTeamIsHome ? 100 - player.currentPosition.x : player.currentPosition.x),
                            y: isPlayerTeam ? (playerTeamIsHome ? player.currentPosition.y : 100 - player.currentPosition.y) : (playerTeamIsHome ? 100 - player.currentPosition.y : player.currentPosition.y),
                        };

                        return (
                            <div key={player.id} 
                                 className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ease-in-out ${isPlayerTeam && liveMatch.isPaused ? 'cursor-grab' : 'cursor-default'} ${draggedPlayer?.id === player.id ? 'z-20 scale-125' : 'z-10'}`}
                                 style={{ top: `${displayPos.y}%`, left: `${displayPos.x}%` }}
                                 onMouseDown={(e) => isPlayerTeam && handlePlayerMouseDown(e, player)}>
                               <div className={`relative w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-lg border-2 ${isPlayerTeam ? `border-yellow-400 ${player.stamina > 60 ? 'bg-blue-600' : player.stamina > 30 ? 'bg-yellow-600' : 'bg-red-600'}` : 'border-gray-900 bg-gray-600'}`}>
                                   {player.role}
                                   {liveMatch.ballCarrierId === player.id && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-yellow-300 rounded-full border border-black animate-pulse" />}
                               </div>
                               <div className="absolute top-full mt-1 text-center text-xs font-semibold whitespace-nowrap bg-black/50 px-1 rounded">{player.name.split(' ')[1]}</div>
                            </div>
                        );
                    })}
                </div>

                <div className="lg:col-span-1 h-full min-h-0">
                   {renderSidePanel()}
                </div>
            </main>
        </div>
    );
};

export default MatchView;