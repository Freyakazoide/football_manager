import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GameState, LivePlayer, Mentality, LiveMatchState, PlayerRole, PlayerInstructions, LineupPlayer, Player, MatchEvent } from '../types';
import { Action } from '../services/reducerTypes';
import { runMinute } from '../services/matchEngine';
import { getUnitRatings } from '../services/simulationService';
import { ROLE_DEFINITIONS } from '../services/database';
import PlayerInstructionModal from './PlayerInstructionModal';
import Match2DView from './Match2DView';

const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

// --- SUB-COMPONENTS ---

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
                    <p className="text-gray-400 mt-2">Partida da Liga</p>
                </div>

                <div className="mb-8">
                    <h2 className="text-center text-lg font-semibold mb-2">Previsão da Partida</h2>
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
                        Iniciar Partida
                    </button>
                </div>
            </div>
        </div>
    );
};

const Scoreboard: React.FC<{
    liveMatch: LiveMatchState;
    onPause: () => void;
    onResume: () => void;
    gameSpeed: number;
    setGameSpeed: (speed: number) => void;
}> = ({ liveMatch, onPause, onResume, gameSpeed, setGameSpeed }) => {
    const isPlayerHome = liveMatch.playerTeamId === liveMatch.homeTeamId;
    const speeds = [
        { label: 'Lento', value: 2000 },
        { label: 'Normal', value: 1000 },
        { label: 'Rápido', value: 500 },
        { label: 'Instantâneo', value: 100 },
    ];
    
    return (
        <header className="bg-gray-800 p-2 flex justify-between items-center shadow-lg">
            <span className={`text-lg font-bold w-1/3 text-right ${!isPlayerHome ? 'text-red-400' : 'text-blue-400'}`}>{liveMatch.homeTeamName}</span>
            <div className="text-center font-mono w-1/3">
                <div className="text-4xl">{liveMatch.homeScore} - {liveMatch.awayScore}</div>
                <div className="text-lg">{liveMatch.minute}'</div>
                <div className="flex justify-center items-center gap-2 mt-1">
                    <button onClick={liveMatch.isPaused ? onResume : onPause} className="px-2 py-0.5 text-xs bg-gray-600 rounded">
                        {liveMatch.isPaused ? '▶️' : '⏸️'}
                    </button>
                     {speeds.map(speed => (
                        <button key={speed.value} onClick={() => setGameSpeed(speed.value)} className={`px-2 py-0.5 text-xs rounded ${gameSpeed === speed.value ? 'bg-green-600' : 'bg-gray-600'}`}>
                            {speed.label}
                        </button>
                    ))}
                </div>
            </div>
            <span className={`text-lg font-bold w-1/3 text-left ${isPlayerHome ? 'text-red-400' : 'text-blue-400'}`}>{liveMatch.awayTeamName}</span>
        </header>
    );
};

const PlayerIcon: React.FC<{
    player: LivePlayer;
    color: string;
    onClick: () => void;
    onDragStart: (e: React.DragEvent) => void;
}> = ({ player, color, onClick, onDragStart }) => {
    const staminaColor = player.stamina > 60 ? 'bg-green-500' : player.stamina > 30 ? 'bg-yellow-500' : 'bg-red-500';
    
    return (
        <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
            style={{ left: `${player.currentPosition.x}%`, top: `${player.currentPosition.y}%` }}
            onClick={onClick}
            draggable
            onDragStart={onDragStart}
        >
            <div className={`relative w-10 h-10 flex items-center justify-center rounded-full font-bold text-xs text-white ${color} border-2 border-black/30`}>
                {player.role.split(' ').map(w => w[0]).join('')}
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 text-center text-xs font-semibold whitespace-nowrap bg-black/70 px-1 rounded">
                {player.name.split(' ')[1]}
            </div>
            <div className="absolute -bottom-1 left-0 w-full h-1.5 bg-gray-900/50 rounded-full p-px">
                <div className={`${staminaColor} h-full rounded-full transition-all duration-300`} style={{width: `${player.stamina}%`}}></div>
            </div>
        </div>
    );
};

const PitchView: React.FC<{
    playerTeam: LivePlayer[];
    opponentTeam: LivePlayer[];
    onPlayerClick: (player: LivePlayer) => void;
    onDrop: (e: React.DragEvent, playerOutId: number) => void;
}> = ({ playerTeam, opponentTeam, onPlayerClick, onDrop }) => {
    return (
        <div 
            className="relative w-full h-full bg-green-800 bg-center bg-no-repeat select-none rounded-lg shadow-inner overflow-hidden" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 1000'%3e%3crect x='2' y='2' width='696' height='996' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3cline x1='2' y1='500' x2='698' y2='500' stroke='%232F855A' stroke-width='4'/%3e%3ccircle cx='350' cy='500' r='91.5' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c/svg%3e")` }}
        >
            {playerTeam.filter(p => !p.isSentOff).map(p => (
                <div onDragOver={e => e.preventDefault()} onDrop={(e) => onDrop(e, p.id)} key={p.id}>
                    <PlayerIcon player={p} color="bg-blue-600" onClick={() => onPlayerClick(p)} onDragStart={() => {}} />
                </div>
            ))}
            {opponentTeam.filter(p => !p.isSentOff).map(p => (
                 <PlayerIcon key={p.id} player={p} color="bg-red-600" onClick={() => {}} onDragStart={() => {}} />
            ))}
        </div>
    );
};

const SubstitutionsPanel: React.FC<{
    lineup: LivePlayer[];
    bench: LivePlayer[];
    subsMade: number;
    onDragStart: (e: React.DragEvent, playerInId: number) => void;
}> = ({ lineup, bench, subsMade, onDragStart }) => (
    <div className="bg-gray-800 rounded-lg p-3 flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-bold mb-2">Substituições ({5 - subsMade} restantes)</h3>
        <div className="flex-1 overflow-y-auto space-y-2">
            <h4 className="text-xs text-gray-400 font-bold uppercase">Banco</h4>
            {bench.map(p => (
                <div key={p.id} draggable onDragStart={e => onDragStart(e, p.id)} className="bg-gray-700 p-2 rounded text-sm cursor-grab flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-gray-400 font-mono">{p.role.split(' ').map(w => w[0]).join('')}</span>
                </div>
            ))}
            <h4 className="text-xs text-gray-400 font-bold uppercase pt-2">Em Campo</h4>
            {lineup.map(p => (
                <div key={p.id} className="bg-gray-900/50 p-2 rounded text-sm flex justify-between">
                    <span>{p.name}</span>
                    <span className="text-gray-400 font-mono">{p.role.split(' ').map(w => w[0]).join('')}</span>
                </div>
            ))}
        </div>
    </div>
);

const TacticsPanel: React.FC<{ mentality: Mentality, onMentalityChange: (m: Mentality) => void, onShout: (s: any) => void }> = ({ mentality, onMentalityChange, onShout }) => (
    <div className="bg-gray-800 rounded-lg p-3">
        <h3 className="text-lg font-bold mb-2">Táticas</h3>
        <div className="grid grid-cols-3 gap-2 mb-2">
            {(['Defensiva', 'Equilibrada', 'Ofensiva'] as Mentality[]).map(m => (
                <button key={m} onClick={() => onMentalityChange(m)} className={`p-2 rounded text-sm ${mentality === m ? 'bg-green-600' : 'bg-gray-700'}`}>{m}</button>
            ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
            <button onClick={() => onShout('press_more')} className="p-2 rounded text-xs bg-gray-700 hover:bg-gray-600">Pressionar Mais</button>
            <button onClick={() => onShout('hold_position')} className="p-2 rounded text-xs bg-gray-700 hover:bg-gray-600">Manter Posição</button>
            <button onClick={() => onShout('attack_flanks')} className="p-2 rounded text-xs bg-gray-700 hover:bg-gray-600">Atacar Flancos</button>
            <button onClick={() => onShout('short_passes')} className="p-2 rounded text-xs bg-gray-700 hover:bg-gray-600">Passes Curtos</button>
        </div>
    </div>
);

const CommentaryPanel: React.FC<{ log: MatchEvent[] }> = ({ log }) => {
    const commentaryRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (commentaryRef.current) {
            commentaryRef.current.scrollTop = 0;
        }
    }, [log]);

    return (
        <div ref={commentaryRef} className="bg-gray-800 rounded-lg p-3 flex-1 overflow-y-auto space-y-2 flex flex-col-reverse">
            {[...log].reverse().map((event, i) => (
                <div key={i} className="flex gap-2 text-sm">
                    <span className="font-bold w-8 text-gray-500">{event.minute}'</span>
                    <span className={`flex-1 ${event.type === 'Goal' ? 'text-green-400 font-bold' : event.type === 'RedCard' ? 'text-red-500 font-bold' : event.type === 'YellowCard' ? 'text-yellow-400' : ''}`}>{event.text}</span>
                </div>
            ))}
        </div>
    );
};

// FIX: Added missing StatBar component definition.
const StatBar: React.FC<{ home: number; away: number; label: string; isPercentage?: boolean; isXG?: boolean }> = ({ home, away, label, isPercentage, isXG }) => {
    const total = home + away;
    const homePercent = total > 0 ? (home / total) * 100 : 50;
    const homeDisplay = isPercentage ? `${Math.round(home)}%` : isXG ? home.toFixed(2) : Math.round(home);
    const awayDisplay = isPercentage ? `${Math.round(away)}%` : isXG ? away.toFixed(2) : Math.round(away);

    return (
        <div>
            <div className="flex justify-between items-center text-xs text-gray-300 mb-1">
                <span className="font-mono font-bold">{homeDisplay}</span>
                <span className="text-gray-500">{label}</span>
                <span className="font-mono font-bold">{awayDisplay}</span>
            </div>
            <div className="flex w-full h-1.5 bg-gray-900 rounded">
                <div className="bg-blue-500 rounded-l" style={{ width: `${homePercent}%` }}></div>
                <div className="bg-red-500 rounded-r" style={{ width: `${100 - homePercent}%` }}></div>
            </div>
        </div>
    );
};

const StatsPanel: React.FC<{ liveMatch: LiveMatchState }> = ({ liveMatch }) => {
    const totalPossessionMinutes = liveMatch.homePossessionMinutes + liveMatch.awayPossessionMinutes;
    const homePossession = totalPossessionMinutes > 0 ? Math.round((liveMatch.homePossessionMinutes / totalPossessionMinutes) * 100) : 50;
    
    return (
        <div className="bg-gray-800 rounded-lg p-3 space-y-3">
             <StatBar home={homePossession} away={100 - homePossession} label="Posse" isPercentage />
             <StatBar home={liveMatch.homeStats.shots} away={liveMatch.awayStats.shots} label="Finalizações" />
             <StatBar home={liveMatch.homeStats.xG} away={liveMatch.awayStats.xG} label="xG" isXG />
        </div>
    );
};

// --- MAIN COMPONENT ---

// FIX: Added missing MatchViewProps interface definition.
interface MatchViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const MatchView: React.FC<MatchViewProps> = ({ gameState, dispatch }) => {
    const liveMatch = gameState.liveMatch!;
    const [gameSpeed, setGameSpeed] = useState(1000);
    const [selectedPlayer, setSelectedPlayer] = useState<LivePlayer | null>(null);
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);

    const { playerTeamId, homeTeamId } = liveMatch;
    const isPlayerHome = playerTeamId === homeTeamId;
    const playerTeam = isPlayerHome ? liveMatch.homeLineup : liveMatch.awayLineup;
    const opponentTeam = isPlayerHome ? liveMatch.awayLineup : liveMatch.homeLineup;
    const playerBench = isPlayerHome ? liveMatch.homeBench : liveMatch.awayBench;
    const playerSubsMade = isPlayerHome ? liveMatch.homeSubsMade : liveMatch.awaySubsMade;
    const playerMentality = isPlayerHome ? liveMatch.homeMentality : liveMatch.awayMentality;

    // Game loop
    useEffect(() => {
        if (liveMatch.isPaused) return;
        const interval = setInterval(() => {
            const { newState, newEvents } = runMinute(gameState.liveMatch!);
            dispatch({ type: 'ADVANCE_MINUTE', payload: { newState, newEvents } });
        }, gameSpeed);
        return () => clearInterval(interval);
    }, [liveMatch.isPaused, gameState.liveMatch, dispatch, gameSpeed]);
    
    const handleSubDrop = (e: React.DragEvent<HTMLDivElement>, playerOutId: number) => {
        e.preventDefault();
        const playerInId = Number(e.dataTransfer.getData('playerInId'));
        if (playerInId) {
            dispatch({ type: 'MAKE_SUBSTITUTION', payload: { playerInId, playerOutId } });
        }
    };
    
    const handleMentalityChange = (mentality: Mentality) => dispatch({ type: 'CHANGE_LIVE_TACTICS', payload: { mentality } });
    const handleShout = (shout: 'press_more' | 'hold_position' | 'attack_flanks' | 'short_passes' | 'go_direct') => dispatch({ type: 'UPDATE_TEAM_INSTRUCTIONS', payload: { shout } });
    
    const handleSaveInstructions = (updatedLineupPlayer: LineupPlayer) => {
         dispatch({ type: 'UPDATE_LIVE_PLAYER_INSTRUCTIONS', payload: { playerId: updatedLineupPlayer.playerId, instructions: updatedLineupPlayer.instructions }});
    };
    
    const renderOverlay = () => {
        const title = liveMatch.status === 'half-time' ? 'Intervalo' : 'Fim de Jogo';
        const buttonText = liveMatch.status === 'half-time' ? 'Continuar para o Segundo Tempo' : 'Finalizar Partida';
        const onButtonClick = () => {
            if (liveMatch.status === 'half-time') dispatch({ type: 'RESUME_MATCH' });
            else if (liveMatch.status === 'full-time') dispatch({ type: 'END_MATCH' });
        };
        return (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-40">
                <div className="bg-gray-800 p-8 rounded-lg text-center shadow-2xl animate-fade-in">
                    <h2 className="text-3xl font-bold mb-4">{title}</h2>
                    <p className="text-5xl font-mono mb-6">{liveMatch.homeScore} - {liveMatch.awayScore}</p>
                    <button onClick={onButtonClick} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg">{buttonText}</button>
                </div>
            </div>
        );
    };

    if (liveMatch.status === 'pre-match') {
        return <PreMatchPreview liveMatch={liveMatch} gameState={gameState} dispatch={dispatch} />;
    }

    return (
        <div className="h-screen bg-gray-900 text-white font-sans flex flex-col overflow-hidden">
             {isInstructionModalOpen && selectedPlayer && (
                 <PlayerInstructionModal 
                    player={gameState.players[selectedPlayer.id]}
                    lineupPlayer={{playerId: selectedPlayer.id, position: selectedPlayer.currentPosition, role: selectedPlayer.role, instructions: selectedPlayer.instructions}}
                    onSave={handleSaveInstructions}
                    onClose={() => setIsInstructionModalOpen(false)}
                />
            )}
             {(liveMatch.status === 'half-time' || liveMatch.status === 'full-time') && renderOverlay()}

            <Scoreboard 
                liveMatch={liveMatch}
                onPause={() => dispatch({type: 'PAUSE_MATCH'})}
                onResume={() => dispatch({type: 'RESUME_MATCH'})}
                gameSpeed={gameSpeed}
                setGameSpeed={setGameSpeed}
            />
            
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                    <SubstitutionsPanel
                        lineup={playerTeam}
                        bench={playerBench}
                        subsMade={playerSubsMade}
                        onDragStart={(e, pId) => e.dataTransfer.setData('playerInId', String(pId))}
                    />
                    <TacticsPanel mentality={playerMentality} onMentalityChange={handleMentalityChange} onShout={handleShout} />
                </div>

                <div className="lg:col-span-2 min-h-0">
                    <Match2DView
                        playerTeam={playerTeam}
                        opponentTeam={opponentTeam}
                        ball={liveMatch.ball}
                        onPlayerClick={(p) => setSelectedPlayer(p)}
                        onDrop={handleSubDrop}
                    />
                </div>
                
                <div className="lg:col-span-1 flex flex-col gap-4 min-h-0">
                    <CommentaryPanel log={liveMatch.log} />
                    <StatsPanel liveMatch={liveMatch} />
                </div>
            </main>
             {selectedPlayer && (
                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800/90 border border-gray-700 p-4 rounded-lg shadow-lg flex items-center gap-4 z-50 animate-fade-in-up">
                    <div className="flex-1">
                        <h4 className="font-bold">{selectedPlayer.name}</h4>
                        <div className="text-xs grid grid-cols-3 gap-x-3">
                            <span>Nota: {selectedPlayer.stats.rating.toFixed(1)}</span>
                            <span>Moral: {selectedPlayer.morale}</span>
                            <span>Estamina: {Math.round(selectedPlayer.stamina)}</span>
                        </div>
                    </div>
                    <button onClick={() => setIsInstructionModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 px-3 py-2 text-sm rounded">Instruções</button>
                    <button onClick={() => setSelectedPlayer(null)} className="bg-red-600 hover:bg-red-700 px-3 py-2 text-sm rounded">&times;</button>
                </div>
             )}
        </div>
    );
};

export default MatchView;
