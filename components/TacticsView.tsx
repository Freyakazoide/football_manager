import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Tactics, Mentality, LineupPlayer, PlayerRole, ShootingInstruction, PassingInstruction, DribblingInstruction, CrossingInstruction, PositioningInstruction, TacklingInstruction, PressingInstruction, MarkingInstruction, PlayerInstructions } from '../types';
import { Action } from '../services/reducerTypes';

interface TacticsViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

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

const InstructionEditor: React.FC<{
    instructions: PlayerInstructions;
    onInstructionChange: (key: keyof PlayerInstructions, value: any) => void;
}> = ({ instructions, onInstructionChange }) => {
    const instructionSet = [
        { title: 'In Possession', instructions: [
            { key: 'shooting', enum: ShootingInstruction, label: 'Shooting' },
            { key: 'passing', enum: PassingInstruction, label: 'Passing' },
            { key: 'dribbling', enum: DribblingInstruction, label: 'Dribbling' },
            { key: 'crossing', enum: CrossingInstruction, label: 'Crossing' },
            { key: 'positioning', enum: PositioningInstruction, label: 'Positioning' },
        ]},
        { title: 'Out of Possession', instructions: [
            { key: 'tackling', enum: TacklingInstruction, label: 'Tackling' },
            { key: 'pressing', enum: PressingInstruction, label: 'Pressing' },
            { key: 'marking', enum: MarkingInstruction, label: 'Marking' },
        ]},
    ];

    return (
        <div className="space-y-4">
            {instructionSet.map(group => (
                 <div key={group.title}>
                    <h4 className="text-md font-bold text-green-400 mb-2">{group.title}</h4>
                    <div className="space-y-2">
                        {group.instructions.map(inst => (
                            <div key={inst.key}>
                                <label className="block text-gray-400 text-xs font-bold mb-1">{inst.label}</label>
                                <select 
                                    value={instructions[inst.key as keyof PlayerInstructions]} 
                                    onChange={(e) => onInstructionChange(inst.key as keyof PlayerInstructions, e.target.value)}
                                    className="w-full bg-gray-700 text-white p-1 rounded text-sm"
                                >
                                    {Object.values(inst.enum).map(val => <option key={val} value={val}>{val}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


const TacticsView: React.FC<TacticsViewProps> = ({ gameState, dispatch }) => {
    const playerClub = gameState.playerClubId ? gameState.clubs[gameState.playerClubId] : null;
    const [tactics, setTactics] = useState<Tactics>(playerClub!.tactics);
    const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
    const [draggedPlayer, setDraggedPlayer] = useState<{ index: number, type: 'lineup' | 'bench', initialX: number, initialY: number} | null>(null);
    const pitchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (playerClub) {
            setTactics(playerClub.tactics);
        }
    }, [playerClub]);

    const handleMentalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setTactics({ ...tactics, mentality: e.target.value as Mentality });
    };

    const handleSaveChanges = () => {
        dispatch({ type: 'UPDATE_TACTICS', payload: tactics });
    };

    const onPlayerMouseDown = (e: React.MouseEvent, index: number, type: 'lineup' | 'bench') => {
        e.preventDefault();
        setDraggedPlayer({ index, type, initialX: e.clientX, initialY: e.clientY });
    };

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!draggedPlayer || !pitchRef.current) return;

        const pitchRect = pitchRef.current.getBoundingClientRect();
        let x = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
        let y = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        
        setTactics(currentTactics => {
            const newTactics = JSON.parse(JSON.stringify(currentTactics));
            if (draggedPlayer.type === 'lineup') {
                const player = newTactics.lineup[draggedPlayer.index];
                if (player) {
                    player.position.x = x;
                    player.position.y = y;
                    player.role = getRoleFromPosition(x, y);
                }
            }
            return newTactics;
        });

    }, [draggedPlayer]);

    const onMouseUp = useCallback((e: MouseEvent) => {
        if (!draggedPlayer) return;

        const pitchRect = pitchRef.current?.getBoundingClientRect();
        const isOverPitch = pitchRect && e.clientX > pitchRect.left && e.clientX < pitchRect.right && e.clientY > pitchRect.top && e.clientY < pitchRect.bottom;
        
        setTactics(currentTactics => {
            let newTactics = JSON.parse(JSON.stringify(currentTactics));
            const { index, type } = draggedPlayer;
            
            // Swap lineup players
            if (type === 'lineup' && isOverPitch) {
                const droppedOnPlayerIndex = newTactics.lineup.findIndex((p: LineupPlayer | null) => {
                    if (!p) return false;
                    const dx = (p.position.x / 100 * pitchRect.width + pitchRect.left) - e.clientX;
                    const dy = (p.position.y / 100 * pitchRect.height + pitchRect.top) - e.clientY;
                    return Math.sqrt(dx*dx + dy*dy) < 20 && newTactics.lineup.indexOf(p) !== index;
                });

                if (droppedOnPlayerIndex !== -1) {
                    [newTactics.lineup[index], newTactics.lineup[droppedOnPlayerIndex]] = [newTactics.lineup[droppedOnPlayerIndex], newTactics.lineup[index]];
                }
            }

            // Drag bench to lineup
            if (type === 'bench' && isOverPitch) {
                const benchPlayerId = newTactics.bench[index];
                if (!benchPlayerId) return newTactics;

                const droppedOnPlayerIndex = newTactics.lineup.findIndex((p: LineupPlayer | null) => {
                    if (!p) return false;
                    const dx = (p.position.x / 100 * pitchRect.width + pitchRect.left) - e.clientX;
                    const dy = (p.position.y / 100 * pitchRect.height + pitchRect.top) - e.clientY;
                    return Math.sqrt(dx*dx + dy*dy) < 20;
                });
                
                if (droppedOnPlayerIndex !== -1) {
                    const lineupPlayer = newTactics.lineup[droppedOnPlayerIndex];
                    newTactics.bench[index] = lineupPlayer.playerId; // Move lineup player to bench
                    
                    let x = ((e.clientX - pitchRect.left) / pitchRect.width) * 100;
                    let y = ((e.clientY - pitchRect.top) / pitchRect.height) * 100;

                    const pData = gameState.players[benchPlayerId];
                    const instructions = pData ? { shooting: ShootingInstruction.Normal, passing: PassingInstruction.Normal, dribbling: DribblingInstruction.Normal, crossing: CrossingInstruction.Normal, positioning: PositioningInstruction.Normal, tackling: TacklingInstruction.Normal, pressing: PressingInstruction.Normal, marking: MarkingInstruction.Normal } : {};

                    newTactics.lineup[droppedOnPlayerIndex] = {
                        playerId: benchPlayerId,
                        position: { x, y },
                        role: getRoleFromPosition(x, y),
                        instructions
                    };
                }
            }

            return newTactics;
        });

        setDraggedPlayer(null);
    }, [draggedPlayer, gameState.players]);
    
    useEffect(() => {
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };
    }, [onMouseMove, onMouseUp]);
    
    const handleInstructionChange = (key: keyof PlayerInstructions, value: any) => {
        if (!selectedPlayerId) return;
        setTactics(currentTactics => {
            const newTactics = JSON.parse(JSON.stringify(currentTactics));
            const playerInLineup = newTactics.lineup.find((p: LineupPlayer | null) => p && p.playerId === selectedPlayerId);
            if (playerInLineup) {
                playerInLineup.instructions[key] = value;
            }
            return newTactics;
        })
    };
    
    if (!playerClub) return null;

    const selectedPlayerInstructions = tactics.lineup.find(p => p && p.playerId === selectedPlayerId)?.instructions;
    const selectedPlayerInfo = selectedPlayerId ? gameState.players[selectedPlayerId] : null;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
            <div className="lg:w-2/3 bg-gray-800 rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Tactics</h2>
                <div ref={pitchRef} className="relative aspect-[7/10] bg-green-800 bg-center bg-no-repeat select-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' stroke='%2338A169' stroke-width='4' stroke-dasharray='6%2c 12' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`}}>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4 aspect-square border-2 border-green-600 rounded-full"></div>
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1/2 bg-green-600"></div>

                    {tactics.lineup.map((lineupPlayer, index) => {
                        if (!lineupPlayer) return null;
                        const player = gameState.players[lineupPlayer.playerId];
                        return (
                            <div key={index} 
                                 className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-grab ${draggedPlayer?.index === index && draggedPlayer.type === 'lineup' ? 'cursor-grabbing z-10' : ''}`}
                                 style={{ top: `${lineupPlayer.position.y}%`, left: `${lineupPlayer.position.x}%` }}
                                 onMouseDown={(e) => onPlayerMouseDown(e, index, 'lineup')}
                                 onClick={() => setSelectedPlayerId(lineupPlayer.playerId)}>
                               <div className={`relative w-12 h-12 flex items-center justify-center rounded-full font-bold text-sm text-white ${selectedPlayerId === player.id ? 'bg-yellow-500 ring-2 ring-white' : 'bg-blue-500'}`}>
                                   {lineupPlayer.role}
                               </div>
                               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 text-center text-xs font-semibold whitespace-nowrap">{player.name.split(' ')[1]}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="lg:w-1/3 bg-gray-800 rounded-lg shadow-xl p-6 flex flex-col">
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="mentality" className="block text-gray-400 text-sm font-bold mb-2">Mentality</label>
                        <select id="mentality" value={tactics.mentality} onChange={handleMentalityChange} className="w-full bg-gray-700 text-white p-2 rounded">
                            <option>Defensive</option> <option>Balanced</option> <option>Offensive</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    {selectedPlayerInfo && selectedPlayerInstructions ? (
                         <div>
                            <h3 className="text-xl font-bold text-white mb-2">{selectedPlayerInfo.name}</h3>
                            <InstructionEditor instructions={selectedPlayerInstructions} onInstructionChange={handleInstructionChange} />
                         </div>
                    ) : (
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white mb-2">Bench</h3>
                            <div className="space-y-2">
                                {tactics.bench.map((playerId, index) => {
                                    if (!playerId) return <div key={index} className="bg-gray-700 p-2 rounded text-gray-500">Empty</div>
                                    const player = gameState.players[playerId];
                                    return (
                                        <div key={index} onMouseDown={(e) => onPlayerMouseDown(e, index, 'bench')} className="bg-gray-700 p-2 rounded cursor-grab flex justify-between">
                                            <span>{player.name}</span>
                                            <span className="text-gray-400">{player.position}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <button onClick={handleSaveChanges} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4">
                    Save Changes
                </button>
            </div>
        </div>
    );
};

export default TacticsView;