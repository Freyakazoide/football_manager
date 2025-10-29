import React, { useState } from 'react';
import { Player, LineupPlayer, PlayerRole, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, CrossingInstruction, PositioningInstruction, TacklingInstruction, PressingInstruction, MarkingInstruction } from '../types';
import { ALL_ROLES, getRoleCategory } from '../services/database';

interface PlayerInstructionModalProps {
    player: Player;
    lineupPlayer: LineupPlayer;
    onSave: (updatedLineupPlayer: LineupPlayer) => void;
    onClose: () => void;
}

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
                                    {(Object.values(inst.enum) as string[]).map(val => <option key={val} value={val}>{val}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const PlayerInstructionModal: React.FC<PlayerInstructionModalProps> = ({ player, lineupPlayer, onSave, onClose }) => {
    const [localLineupPlayer, setLocalLineupPlayer] = useState<LineupPlayer>(lineupPlayer);
    
    const handleInstructionChange = (key: keyof PlayerInstructions, value: any) => {
        setLocalLineupPlayer(prev => ({
            ...prev,
            instructions: {
                ...prev.instructions,
                [key]: value
            }
        }));
    };

    const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocalLineupPlayer(prev => ({
            ...prev,
            role: e.target.value as PlayerRole
        }));
    };
    
    const handleSaveChanges = () => {
        onSave(localLineupPlayer);
        onClose();
    };
    
    const relevantRoles = ALL_ROLES.filter(role => getRoleCategory(role) === getRoleCategory(localLineupPlayer.role));

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">{player.name}</h2>
                        <p className="text-gray-400">Player Instructions</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <div className="mb-4">
                        <label className="block text-gray-400 text-sm font-bold mb-2">Role</label>
                        <select
                            value={localLineupPlayer.role}
                            onChange={handleRoleChange}
                            className="w-full bg-gray-700 text-white p-2 rounded"
                        >
                            {relevantRoles.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </div>
                    <InstructionEditor 
                        instructions={localLineupPlayer.instructions} 
                        onInstructionChange={handleInstructionChange}
                    />
                </div>
                <div className="p-4 border-t border-gray-700">
                    <button onClick={handleSaveChanges} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        Save and Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlayerInstructionModal;
