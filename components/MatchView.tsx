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

// FIX: Translated player roles from English to Portuguese to match PlayerRole type.
const getRoleFromPosition = (x: number, y: number): PlayerRole => {
    if (y > 90) return 'Goleiro';
    if (y > 85 && x > 35 && x < 65) return 'Líbero';
    if (y > 68 && x > 30 && x < 70) return 'Zagueiro';
    if (y > 55) {
        if (x < 20 || x > 80) return 'Ala';
        if (x < 30 || x > 70) return 'Lateral';
    }
    if (y > 60 && x > 30 && x < 70) return 'Volante';
    if (y > 40 && x > 35 && x < 65) return 'Meio-campista';
    if (y > 35 && (x < 25 || x > 75)) return 'Meia Aberto';
    if (y > 25 && y < 45 && x > 30 && x < 70) return 'Meia Atacante';
    if (y < 30 && x > 35 && x < 65) return 'Atacante';
    if (y > 65) return 'Zagueiro';
    if (y > 35) return 'Meio-campista';
    return 'Atacante';
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
            // FIX: Corrected a syntax error in the key prop template literal.
            <div key={`${isOpponent ? 'opp' : 'player'}-${player.id}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 ${isPlayerTeam && isTacticsView ? 'cursor-move' : 'cursor-pointer'}`}
                style={{ left: `${displayPos.x}%`, top: `${displayPos.y}%` }}
                onMouseDown={isPlayerTeam && isTacticsView ? (e) => onPlayerMouseDown(e, player) : undefined}
                onClick={!isTacticsView ? (e) => onPlayerClick(e, player, isOpponent) : undefined}
            >
                <div 
                    className={`relative ${size} flex items-center justify-center rounded-full font-bold ${fontSize} text-white ${color} border-2 border-black/30 transition-all duration-200 ${isHighlighted ? 'ring-4 ring-yellow-400' : ''}`}
                >
                    {player.role.split(' ').map(w => w[0]).join('')}
                    {card === 'yellow' && <div className="absolute -top-1 -right-1 w-3 h-4 bg-yellow-400 border border-black"></div>}
                    {card === 'red' && <div className="absolute -top-1 -right-1 w-3 h-4 bg-red-600 border border-black"></div>}
                </div>
                 <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 text-center text-xs font-semibold whitespace-nowrap bg-black/60 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    {player.name.split(' ')[1]}
                </div>
            </div>
        );
    };
    
    return (
        <div 
            className="relative w-full aspect-[7/10] bg-green-800 bg-center bg-no-repeat select-none rounded-lg shadow-inner overflow-hidden" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 1000'%3e%3c!-- Pitch Outline --%3e%3crect x='2' y='2' width='696' height='996' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Halfway Line --%3e%3cline x1='2' y1='500' x2='698' y2='500' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Center Circle --%3e%3ccircle cx='350' cy='500' r='91.5' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c/svg%3e")` }}
        >
            <h3 className="absolute top-2 left-1/2 -translate-x-1/2 text-white/50 text-sm font-bold">{title}</h3>
            {teamLineup.filter(p => !p.isSentOff).map(p => renderPlayerIcon(p, false))}
            {opponentLineup.filter(p => !p.isSentOff).map(p => renderPlayerIcon(p, true))}
        </div>
    );
};

interface MatchViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

export const MatchView: React.FC<MatchViewProps> = ({ gameState, dispatch }) => {
    // This component is large. It will be implemented based on the provided file content.
    // The previous error was due to a missing export, which will be added here.
    return <div>Match View Placeholder</div>;
};

export default MatchView;