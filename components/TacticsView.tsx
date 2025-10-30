import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GameState, Player, Tactics, Mentality, LineupPlayer, PlayerRole, PlayerInstructions, Staff, StaffRole, AssistantManagerAttributes, DepartmentType } from '../types';
import { Action } from '../services/reducerTypes';
import { FORMATION_PRESETS } from '../services/formations';
import { suggestSquadSelection, createDefaultInstructions } from '../services/aiTacticsService';
import PlayerInstructionModal from './PlayerInstructionModal';

interface TacticsViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const Pitch: React.FC<{
    lineup: (LineupPlayer | null)[];
    players: Record<number, Player>;
    onPlayerClick: (lineupPlayer: LineupPlayer) => void;
    onPlayerDragStart: (e: React.DragEvent, player: LineupPlayer, index: number) => void;
    onPlayerDrop: (e: React.DragEvent, targetIndex: number | null) => void;
    onPitchDrop: (e: React.DragEvent) => void;
}> = ({ lineup, players, onPlayerClick, onPlayerDragStart, onPlayerDrop, onPitchDrop }) => {
    return (
        <div 
            className="relative aspect-[7/10] bg-green-900 bg-center bg-no-repeat select-none rounded-lg shadow-inner overflow-hidden" 
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 700 1000'%3e%3c!-- Pitch Outline --%3e%3crect x='2' y='2' width='696' height='996' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Halfway Line --%3e%3cline x1='2' y1='500' x2='698' y2='500' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Center Circle --%3e%3ccircle cx='350' cy='500' r='91.5' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Center Spot --%3e%3ccircle cx='350' cy='500' r='5' fill='%232F855A'/%3e%3c!-- Home Penalty Area --%3e%3crect x='138' y='835' width='424' height='165' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Home Goal Area --%3e%3crect x='257' y='945' width='186' height='55' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Home Penalty Spot --%3e%3ccircle cx='350' cy='890' r='4' fill='%232F855A'/%3e%3c!-- Home Arc --%3e%3cpath d='M 258 835 A 91.5 91.5 0 0 1 442 835' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Away Penalty Area --%3e%3crect x='138' y='0' width='424' height='165' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Away Goal Area --%3e%3crect x='257' y='0' width='186' height='55' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c!-- Away Penalty Spot --%3e%3ccircle cx='350' cy='110' r='4' fill='%232F855A'/%3e%3c!-- Away Arc --%3e%3cpath d='M 258 165 A 91.5 91.5 0 0 0 442 165' fill='none' stroke='%232F855A' stroke-width='4'/%3e%3c/svg%3e")` }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onPitchDrop}
        >
            {lineup.map((lineupPlayer, index) => {
                if (!lineupPlayer) return null;
                const player = players[lineupPlayer.playerId];
                return (
                    <div 
                        key={`${player.id}-${index}`}
                        draggable
                        onDragStart={(e) => onPlayerDragStart(e, lineupPlayer, index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => onPlayerDrop(e, index)}
                        onClick={() => onPlayerClick(lineupPlayer)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                        style={{ top: `${lineupPlayer.position.y}%`, left: `${lineupPlayer.position.x}%` }}
                    >
                        <div className="relative w-12 h-12 flex items-center justify-center rounded-full font-bold text-sm text-white bg-blue-600 shadow-lg border-2 border-yellow-400">
                           {lineupPlayer.role.split(' ').map(w => w[0]).join('')}
                        </div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 text-center text-xs font-semibold whitespace-nowrap bg-black/60 text-white px-1.5 py-0.5 rounded">
                           {player.name.split(' ')[1]}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


const TacticsView: React.FC<TacticsViewProps> = ({ gameState, dispatch }) => {
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;
    const [tactics, setTactics] = useState<Tactics>(playerClub!.tactics);
    const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
    const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<LineupPlayer | null>(null);
    const [selectedFormation, setSelectedFormation] = useState<string>('');

    const assistantId = playerClub?.departments[DepartmentType.Coaching].chiefId;
    const assistant = useMemo(() => {
        if (!assistantId) return null;
        return gameState.staff[assistantId] as Staff & { attributes: AssistantManagerAttributes };
    }, [assistantId, gameState.staff]);

    useEffect(() => {
        if (playerClub) {
            setTactics(playerClub.tactics);
        }
    }, [playerClub]);

    const { benchPlayers, reserves, lineupPlayerIds, benchPlayerIds } = useMemo(() => {
        if (!gameState.playerClubId) return { benchPlayers: [], reserves: [], lineupPlayerIds: new Set(), benchPlayerIds: new Set() };
        
        const lineupPlayerIds = new Set(tactics.lineup.filter(p => p).map(p => p!.playerId));
        const benchPlayerIds = new Set(tactics.bench.filter(p => p).map(p => p!));

        const benchPlayers = tactics.bench
            .map(pId => pId ? gameState.players[pId] : null)
            .filter((p): p is Player => p !== null);

        const allPlayers = (Object.values(gameState.players) as Player[]);
        const reserves = allPlayers.filter(p =>
            p.clubId === gameState.playerClubId &&
            !lineupPlayerIds.has(p.id) &&
            !benchPlayerIds.has(p.id) &&
            !p.injury && !p.suspension
        );

        return { benchPlayers, reserves, lineupPlayerIds, benchPlayerIds };
    }, [gameState.players, gameState.playerClubId, tactics.lineup, tactics.bench]);

    const handleSaveChanges = () => dispatch({ type: 'UPDATE_TACTICS', payload: tactics });
    
    const handleFormationChange = (formationName: string) => {
        setSelectedFormation(formationName);
        handleClearPitch(); // Clear pitch when selecting a new formation to apply assistant to.
    };
    
    const handleAskAssistant = () => {
        const formation = FORMATION_PRESETS.find(f => f.name === selectedFormation);
        if (!formation) {
            alert("Please select a formation first from the dropdown.");
            return;
        }

        const lineupSlots = formation.positions.map(p => ({ position: { x: p.x, y: p.y }, role: p.role }));
        const allPlayers = (Object.values(gameState.players) as Player[])
            .filter(p => p.clubId === gameState.playerClubId && !p.injury && !p.suspension);
        const { lineup, bench } = suggestSquadSelection(lineupSlots, allPlayers, assistant?.attributes);
        setTactics(prev => ({ ...prev, lineup, bench }));
    };

    const handleClearPitch = () => setTactics(prev => ({ 
        ...prev, 
        lineup: Array(11).fill(null),
        bench: Array(7).fill(null),
    }));

    const handlePlayerClick = (lineupPlayer: LineupPlayer) => {
        setSelectedPlayerForModal(lineupPlayer);
        setIsInstructionModalOpen(true);
    };
    
    const handleModalSave = (updatedLineupPlayer: LineupPlayer) => {
        setTactics(prev => ({
            ...prev,
            lineup: prev.lineup.map(lp => lp && lp.playerId === updatedLineupPlayer.playerId ? updatedLineupPlayer : lp)
        }));
    };

    // --- DRAG AND DROP LOGIC ---
    const handlePlayerDragStart = (e: React.DragEvent, player: Player | LineupPlayer, source: 'lineup' | 'bench' | 'reserves', index: number | null) => {
        const playerId = 'id' in player ? player.id : player.playerId;
        e.dataTransfer.setData('playerId', String(playerId));
        e.dataTransfer.setData('source', source);
        e.dataTransfer.setData('sourceIndex', String(index));
    };

    const handleDropOnPitch = (e: React.DragEvent, targetIndex: number | null) => {
        e.stopPropagation();
        e.preventDefault();
        const playerId = Number(e.dataTransfer.getData('playerId'));
        const source = e.dataTransfer.getData('source') as 'lineup' | 'bench' | 'reserves';
        const sourceIndex = Number(e.dataTransfer.getData('sourceIndex'));
        
        const newTactics = JSON.parse(JSON.stringify(tactics));
        
        const playerOnPitch = targetIndex !== null ? newTactics.lineup[targetIndex] : null;

        // Swapping two players on the pitch
        if (source === 'lineup' && targetIndex !== null) {
            [newTactics.lineup[sourceIndex], newTactics.lineup[targetIndex]] = [newTactics.lineup[targetIndex], newTactics.lineup[sourceIndex]];
            setTactics(newTactics);
            return;
        }

        // Moving player from reserves/bench to pitch
        if (source === 'reserves' || source === 'bench') {
            const playerToMove = gameState.players[playerId];
            const newRole = playerToMove.naturalPosition;
            const newInstructions = createDefaultInstructions();
            let position;

            if (playerOnPitch) { // Dropped on an existing player (swap)
                position = playerOnPitch.position;
                if (source === 'bench') {
                    newTactics.bench[sourceIndex] = playerOnPitch.playerId;
                }
                newTactics.lineup[targetIndex] = { playerId, position, role: newRole, instructions: newInstructions };
            } else { // Dropped on empty pitch area
                const pitchRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                position = {
                    x: ((e.clientX - pitchRect.left) / pitchRect.width) * 100,
                    y: ((e.clientY - pitchRect.top) / pitchRect.height) * 100
                };
                const emptySlotIndex = newTactics.lineup.indexOf(null);
                if (emptySlotIndex !== -1) {
                    newTactics.lineup[emptySlotIndex] = { playerId, position, role: newRole, instructions: newInstructions };
                    if (source === 'bench') {
                        newTactics.bench[sourceIndex] = null;
                    }
                }
            }
        }
        setTactics(newTactics);
    };
    
    const handleDropOnSidePanel = (e: React.DragEvent) => {
        e.preventDefault();
        const playerId = Number(e.dataTransfer.getData('playerId'));
        const source = e.dataTransfer.getData('source') as 'lineup' | 'bench' | 'reserves';
        const sourceIndex = Number(e.dataTransfer.getData('sourceIndex'));

        if (source === 'reserves') return; // Do nothing if dragged from reserves to reserves

        const newTactics = JSON.parse(JSON.stringify(tactics));
        if (source === 'lineup') {
            newTactics.lineup[sourceIndex] = null;
        } else if (source === 'bench') {
            newTactics.bench[sourceIndex] = null;
        }
        setTactics(newTactics);
    };
    
    const handleDropOnBench = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        e.stopPropagation();
        const playerId = Number(e.dataTransfer.getData('playerId'));
        const source = e.dataTransfer.getData('source') as 'lineup' | 'bench' | 'reserves';
        const sourceIndex = Number(e.dataTransfer.getData('sourceIndex'));

        if (benchPlayerIds.has(playerId) && source !== 'bench') return;

        const newTactics = JSON.parse(JSON.stringify(tactics));
        const playerInTargetSlot = newTactics.bench[targetIndex];
        
        newTactics.bench[targetIndex] = playerId;

        if (source === 'lineup') {
            newTactics.lineup[sourceIndex] = playerInTargetSlot ? { ...newTactics.lineup[sourceIndex], playerId: playerInTargetSlot } : null;
        } else if (source === 'bench') {
            newTactics.bench[sourceIndex] = playerInTargetSlot;
        }
        
        setTactics(newTactics);
    };

    if (!playerClub) return null;

    return (
        <div className="flex flex-col md:flex-row gap-4 h-full">
            {isInstructionModalOpen && selectedPlayerForModal && (
                <PlayerInstructionModal 
                    player={gameState.players[selectedPlayerForModal.playerId]}
                    lineupPlayer={selectedPlayerForModal}
                    onSave={handleModalSave}
                    onClose={() => setIsInstructionModalOpen(false)}
                />
            )}
            
            <div className="md:w-2/3">
                <Pitch 
                    lineup={tactics.lineup}
                    players={gameState.players}
                    onPlayerClick={handlePlayerClick}
                    onPlayerDragStart={(e, p, i) => handlePlayerDragStart(e, p, 'lineup', i)}
                    onPlayerDrop={handleDropOnPitch}
                    onPitchDrop={(e) => handleDropOnPitch(e, null)}
                />
            </div>
            <div 
                className="md:w-1/3 bg-gray-800 rounded-lg shadow-xl p-4 flex flex-col"
                onDragOver={e => e.preventDefault()}
                onDrop={handleDropOnSidePanel}
            >
                <h2 className="text-xl font-bold text-white mb-4">Team Setup</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1">Mentality</label>
                        <select value={tactics.mentality} onChange={e => setTactics(t => ({...t, mentality: e.target.value as Mentality}))} className="w-full bg-gray-700 text-white p-2 rounded text-sm">
                            <option>Defensive</option> <option>Balanced</option> <option>Offensive</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-gray-400 text-xs font-bold mb-1">Formation</label>
                        <select value={selectedFormation} onChange={(e) => handleFormationChange(e.target.value)} className="w-full bg-gray-700 text-white p-2 rounded text-sm">
                            <option value="">Select...</option>
                            {FORMATION_PRESETS.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                     <button onClick={handleAskAssistant} disabled={!assistant} title={!assistant ? "You must hire an Assistant Manager" : "Ask assistant to pick the best XI for this formation"} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded text-sm">Ask Assistant</button>
                     <button onClick={handleClearPitch} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm">Clear Squad</button>
                </div>

                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                    <div>
                        <h3 className="text-lg font-bold text-white mb-2">Bench ({benchPlayers.length}/7)</h3>
                        <div className="bg-gray-900/50 rounded p-2 space-y-1">
                            {Array.from({ length: 7 }).map((_, index) => {
                                const playerId = tactics.bench[index];
                                if (playerId) {
                                    const player = gameState.players[playerId];
                                    return (
                                        <div 
                                            key={player.id} 
                                            draggable
                                            onDragStart={(e) => handlePlayerDragStart(e, player, 'bench', index)}
                                            onDrop={(e) => handleDropOnBench(e, index)}
                                            onDragOver={e => e.preventDefault()}
                                            className="bg-gray-700 p-2 rounded cursor-grab flex justify-between items-center text-sm"
                                        >
                                            <span>{player.name}</span>
                                            <span className="text-gray-400 text-xs font-mono">{player.naturalPosition.split(' ').map(w=>w[0]).join('')}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div 
                                        key={`bench-empty-${index}`} 
                                        className="h-[36px] bg-gray-700/30 rounded border-2 border-dashed border-gray-600"
                                        onDrop={(e) => handleDropOnBench(e, index)}
                                        onDragOver={e => e.preventDefault()}
                                    />
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        <h3 className="text-lg font-bold text-white mb-2">Reserves</h3>
                        <div className="flex-1 bg-gray-900/50 rounded p-2 overflow-y-auto space-y-1">
                            {reserves.map(player => (
                                <div 
                                    key={player.id} 
                                    draggable
                                    onDragStart={(e) => handlePlayerDragStart(e, player, 'reserves', null)}
                                    className="bg-gray-700 p-2 rounded cursor-grab flex justify-between items-center text-sm"
                                >
                                    <span>{player.name}</span>
                                    <span className="text-gray-400 text-xs font-mono">{player.naturalPosition.split(' ').map(w=>w[0]).join('')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={handleSaveChanges} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded mt-4">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default TacticsView;