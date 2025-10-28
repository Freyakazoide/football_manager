import React, { useEffect, useRef, useState } from 'react';
import { GameState, LivePlayer, Mentality, LiveMatchState } from '../types';
import { Action } from '../services/reducerTypes';
import { runMinute } from '../services/matchEngine';

interface MatchViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const pitchPositions: Record<string, { top: string; left: string }[]> = {
    '4-4-2': [ { top: '88%', left: '50%' }, { top: '70%', left: '20%' }, { top: '70%', left: '40%' }, { top: '70%', left: '60%' }, { top: '70%', left: '80%' }, { top: '50%', left: '20%' }, { top: '50%', left: '40%' }, { top: '50%', left: '60%' }, { top: '50%', left: '80%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' } ],
    '4-3-3': [ { top: '88%', left: '50%' }, { top: '70%', left: '20%' }, { top: '70%', left: '40%' }, { top: '70%', left: '60%' }, { top: '70%', left: '80%' }, { top: '50%', left: '30%' }, { top: '50%', left: '50%' }, { top: '50%', left: '70%' }, { top: '25%', left: '25%' }, { top: '25%', left: '50%' }, { top: '25%', left: '75%' } ],
    '3-5-2': [ { top: '88%', left: '50%' }, { top: '70%', left: '30%' }, { top: '70%', left: '50%' }, { top: '70%', left: '70%' }, { top: '50%', left: '15%' }, { top: '50%', left: '35%' }, { top: '50%', left: '50%' }, { top: '50%', left: '65%' }, { top: '50%', left: '85%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' } ],
    '5-3-2': [ { top: '88%', left: '50%' }, { top: '70%', left: '15%' }, { top: '70%', left: '35%' }, { top: '70%', left: '50%' }, { top: '70%', left: '65%' }, { top: '70%', left: '85%' }, { top: '50%', left: '30%' }, { top: '50%', left: '50%' }, { top: '50%', left: '70%' }, { top: '25%', left: '40%' }, { top: '25%', left: '60%' } ],
};

const StatBar: React.FC<{ home: number, away: number, label: string }> = ({ home, away, label }) => {
    const total = home + away;
    const homePercent = total > 0 ? (home / total) * 100 : 50;

    return (
        <div className="w-full">
            <div className="flex justify-between items-center text-sm mb-1">
                <span className="font-bold">{home}</span>
                <span className="text-gray-400 text-xs">{label}</span>
                <span className="font-bold">{away}</span>
            </div>
            <div className="flex w-full h-2 bg-gray-600 rounded">
                <div className="bg-blue-500 rounded-l" style={{ width: `${homePercent}%` }}></div>
                <div className="bg-red-500 rounded-r" style={{ width: `${100 - homePercent}%` }}></div>
            </div>
        </div>
    );
};


const MatchView: React.FC<MatchViewProps> = ({ gameState, dispatch }) => {
    const { liveMatch } = gameState;
    const logEndRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState('subs');
    const [playerToSub, setPlayerToSub] = useState<number | null>(null);
    const [simSpeed, setSimSpeed] = useState(1000);

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
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [liveMatch?.log]);

    if (!liveMatch) return <div>Loading match...</div>;

    const playerTeamIsHome = liveMatch.homeTeamId === gameState.playerClubId;
    const playerLineup = playerTeamIsHome ? liveMatch.homeLineup : liveMatch.awayLineup;
    const playerBench = playerTeamIsHome ? liveMatch.homeBench : liveMatch.awayBench;
    const playerSubsMade = playerTeamIsHome ? liveMatch.homeSubsMade : liveMatch.awaySubsMade;
    const playerClub = gameState.clubs[gameState.playerClubId!];
    const opponentClub = gameState.clubs[playerTeamIsHome ? liveMatch.awayTeamId : liveMatch.homeTeamId];

    const handleSubSelect = (playerInId: number) => {
        if (playerToSub) {
            dispatch({ type: 'MAKE_SUBSTITUTION', payload: { playerOutId: playerToSub, playerInId } });
            setPlayerToSub(null);
        }
    }
    
    const handleMentalityChange = (m: Mentality) => {
        dispatch({ type: 'CHANGE_LIVE_TACTICS', payload: { mentality: m }});
    }

    const handleSimulateToEnd = () => {
        let tempState: LiveMatchState = JSON.parse(JSON.stringify(liveMatch));
        while(tempState.status !== 'full-time') {
            const { newState } = runMinute(tempState);
            tempState = newState;
        }
        dispatch({ type: 'ADVANCE_MINUTE', payload: { newState: tempState, newEvents: [] } });
    }

    const renderPauseControls = () => (
        <div className="bg-gray-800 p-4 rounded-lg">
            <div className="flex border-b border-gray-700 mb-2">
                <button onClick={() => setActiveTab('subs')} className={`py-2 px-4 ${activeTab === 'subs' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Substitutions ({5-playerSubsMade})</button>
                <button onClick={() => setActiveTab('tactics')} className={`py-2 px-4 ${activeTab === 'tactics' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Tactics</button>
                <button onClick={() => setActiveTab('stats')} className={`py-2 px-4 ${activeTab === 'stats' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>Stats</button>
            </div>
            {activeTab === 'subs' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold text-white mb-2">On Pitch</h4>
                        {playerLineup.filter(p => !p.isSentOff).map(p => (
                            <button key={p.id} onClick={() => setPlayerToSub(p.id)} className={`w-full text-left p-2 rounded mb-1 text-sm ${playerToSub === p.id ? 'bg-green-600' : 'bg-gray-700'}`}>
                                {p.name} <span className="text-xs text-gray-400">{Math.round(p.stamina)}% / {p.stats.rating.toFixed(1)}</span>
                            </button>
                        ))}
                    </div>
                    <div>
                        <h4 className="font-bold text-white mb-2">Bench</h4>
                        {playerBench.map(p => (
                            <button key={p.id} onClick={() => handleSubSelect(p.id)} disabled={!playerToSub || playerSubsMade >= 5} className="w-full text-left p-2 rounded mb-1 text-sm bg-gray-700 disabled:opacity-50">
                                {p.name} <span className="text-xs text-gray-400">{Math.round(p.stamina)}%</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
             {activeTab === 'tactics' && (
                <div>
                    <h4 className="font-bold text-white mb-2">Mentality</h4>
                    <div className="flex gap-2 mb-4">
                       {(['Defensive', 'Balanced', 'Offensive'] as Mentality[]).map(m => (
                           <button key={m} onClick={() => handleMentalityChange(m)} className={`flex-1 p-2 rounded text-sm ${liveMatch.homeMentality === m ? 'bg-green-600' : 'bg-gray-700'}`}>{m}</button>
                       ))}
                    </div>
                     <h4 className="font-bold text-white mb-2">Simulation</h4>
                     <button onClick={handleSimulateToEnd} className="w-full p-2 rounded bg-blue-600 hover:bg-blue-700 text-sm">Simulate to End</button>
                </div>
            )}
            {activeTab === 'stats' && (
                <div className="text-sm space-y-4">
                    <div className="text-center font-bold mb-2">
                        <span className="text-blue-400">{liveMatch.homeTeamName}</span> vs <span className="text-red-400">{liveMatch.awayTeamName}</span>
                    </div>
                    <StatBar label="Shots" home={liveMatch.homeStats.shots} away={liveMatch.awayStats.shots} />
                    <StatBar label="Shots on Target" home={liveMatch.homeStats.shotsOnTarget} away={liveMatch.awayStats.shotsOnTarget} />
                    <StatBar label="xG" home={parseFloat(liveMatch.homeStats.xG.toFixed(2))} away={parseFloat(liveMatch.awayStats.xG.toFixed(2))} />
                    <StatBar label="Passes" home={liveMatch.homeStats.passes} away={liveMatch.awayStats.passes} />
                    <StatBar label="Tackles" home={liveMatch.homeStats.tackles} away={liveMatch.awayStats.tackles} />
                    <StatBar label="Corners" home={liveMatch.homeStats.corners} away={liveMatch.awayStats.corners} />
                </div>
            )}
        </div>
    );

    return (
        <div className="h-screen bg-gray-900 text-white flex flex-col p-4 gap-4">
            {/* Header */}
            <header className="bg-gray-800 rounded-lg p-4 flex items-center justify-between shadow-lg">
                <div className="text-right">
                    <h2 className="text-2xl font-bold">{liveMatch.homeTeamName}</h2>
                </div>
                <div className="text-center">
                    <div className="text-5xl font-mono tracking-widest">{liveMatch.homeScore} - {liveMatch.awayScore}</div>
                    <div className="text-xl mt-1">{liveMatch.minute}'</div>
                </div>
                <div>
                    <h2 className="text-2xl font-bold">{liveMatch.awayTeamName}</h2>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 grid grid-cols-3 gap-4 overflow-hidden">
                {/* Pitch and Controls */}
                <div className="col-span-2 flex flex-col gap-4">
                    <div className="flex-1 relative bg-green-800 bg-center bg-no-repeat rounded-lg" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%2338A169' stroke-width='4' stroke-dasharray='6%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}>
                       {pitchPositions[playerClub.tactics.formation]?.map((pos, index) => {
                            const player = playerLineup[index];
                            if(!player) return null;

                            return (
                                <div key={index} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={{ top: pos.top, left: pos.left }}>
                                   {player.isSentOff ? (
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-600 shadow-lg border-2 border-gray-900" title={`${player.name} (Sent Off)`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                   ) : (
                                       <>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white ${player.stamina > 60 ? 'bg-blue-500' : player.stamina > 30 ? 'bg-yellow-500' : 'bg-red-500'} shadow-lg border-2 border-gray-900`}>
                                                {player.role}
                                            </div>
                                            <div className="absolute bottom-full mb-1 w-max bg-gray-900 text-white text-xs rounded py-1 px-2 text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                {player.name} ({Math.round(player.stamina)}%) {player.yellowCards > 0 ? '🟨' : ''}
                                            </div>
                                       </>
                                   )}
                               </div>
                            );
                        })}
                         {/* Ball Marker */}
                        {liveMatch.ballCarrierId && (() => {
                            const ballCarrier = [...liveMatch.homeLineup, ...liveMatch.awayLineup].find(p => p.id === liveMatch.ballCarrierId);
                            const lineup = ballCarrier?.id && liveMatch.homeLineup.some(p => p.id === ballCarrier.id) ? liveMatch.homeLineup : liveMatch.awayLineup;
                            const formation = ballCarrier?.id && liveMatch.homeLineup.some(p => p.id === ballCarrier.id) ? playerClub.tactics.formation : opponentClub.tactics.formation;
                            const playerIndex = lineup.findIndex(p => p.id === liveMatch.ballCarrierId);

                            if(playerIndex === -1 || !pitchPositions[formation]) return null;

                            const pos = pitchPositions[formation][playerIndex];

                            return <div className="absolute w-4 h-4 bg-yellow-300 rounded-full border-2 border-black" style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%) translate(-12px, 12px)', transition: 'top 0.5s, left 0.5s' }} />;
                        })()}
                    </div>
                    <div className="bg-gray-800 p-2 rounded-lg flex items-center gap-2">
                         {liveMatch.isPaused && liveMatch.status !== 'full-time' && <button onClick={() => dispatch({ type: 'RESUME_MATCH' })} className="w-1/2 p-3 bg-green-600 rounded font-bold">Resume Match</button>}
                         {!liveMatch.isPaused && <button onClick={() => dispatch({ type: 'PAUSE_MATCH' })} className="w-1/2 p-3 bg-yellow-600 rounded font-bold">Pause Match</button>}
                         {liveMatch.status === 'full-time' && <button onClick={() => dispatch({ type: 'END_MATCH' })} className="w-full p-3 bg-red-600 rounded font-bold">Finish Match</button>}
                        <div className="w-1/2 flex gap-1 justify-center">
                            {[1, 2, 4, 8].map(speed => (
                                <button key={speed} onClick={() => setSimSpeed(1000/speed)} 
                                className={`flex-1 p-2 rounded text-xs font-bold ${simSpeed === (1000/speed) ? 'bg-green-700' : 'bg-gray-700'}`}>
                                    x{speed}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Log and Controls */}
                <div className="col-span-1 flex flex-col gap-4">
                    <div className="flex-1 bg-gray-800 rounded-lg p-4 overflow-y-auto">
                        <h3 className="text-xl font-bold mb-2 border-b border-gray-700 pb-2">Match Events</h3>
                        <div className="space-y-2 text-sm">
                           {liveMatch.log.map((event, i) => (
                               <div key={i} className="flex gap-2">
                                   <span className="font-bold w-8">{event.minute}'</span>
                                   <span className={`flex-1 ${event.type === 'Goal' ? 'text-green-400 font-bold' : event.type === 'RedCard' ? 'text-red-500 font-bold' : event.type === 'YellowCard' ? 'text-yellow-400' : event.type === 'Highlight' ? 'text-yellow-400' : ''}`}>{event.text}</span>
                               </div>
                           ))}
                           <div ref={logEndRef} />
                        </div>
                    </div>
                    {liveMatch.isPaused && renderPauseControls()}
                </div>
            </main>
        </div>
    );
};

export default MatchView;