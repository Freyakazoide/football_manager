import React, { useState, useMemo } from 'react';
import { GameState, Player, PlayerAttributes, ScoutingFilters, Staff, StaffRole } from '../types';
import { Action } from '../services/reducerTypes';
import { getRoleCategory } from '../services/database';

interface ScoutingViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
    onPlayerClick: (player: Player) => void;
}

const ScoutingView: React.FC<ScoutingViewProps> = ({ gameState, dispatch, onPlayerClick }) => {
    const [activeTab, setActiveTab] = useState<'new' | 'active' | 'reports'>('new');
    const [filters, setFilters] = useState<ScoutingFilters>({});
    const [description, setDescription] = useState('');
    const [selectedScoutId, setSelectedScoutId] = useState<number | null>(null);

    const playerClubScouts = useMemo(() => {
        const club = gameState.clubs[gameState.playerClubId!];
        if (!club) return [];
        return club.staffIds.scouts.map(id => gameState.staff[id]);
    }, [gameState.clubs, gameState.playerClubId, gameState.staff]);

    const handleFilterChange = (key: keyof ScoutingFilters, value: any) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleAttributeFilterChange = (attr: keyof PlayerAttributes, value: string) => {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue > 0) {
            setFilters(prev => ({
                ...prev,
                attributes: { ...prev.attributes, [attr]: numValue }
            }));
        } else {
            const newAttributes = { ...filters.attributes };
            delete newAttributes[attr];
            setFilters(prev => ({ ...prev, attributes: newAttributes }));
        }
    };

    const handleCreateAssignment = () => {
        if (!description) {
            alert("Please provide a description for the assignment.");
            return;
        }
        if (!selectedScoutId) {
            alert("Please select a scout for this assignment.");
            return;
        }
        const completionDate = new Date(gameState.currentDate);
        completionDate.setDate(completionDate.getDate() + 14); // 2-week assignment

        dispatch({
            type: 'CREATE_SCOUTING_ASSIGNMENT',
            payload: { description, filters, completionDate, scoutId: selectedScoutId }
        });
        
        setDescription('');
        setFilters({});
        setSelectedScoutId(null);
        setActiveTab('active');
    };
    
    const renderNewAssignment = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Assignment Description</label>
                    <input
                        type="text"
                        placeholder="e.g., 'Young Strikers for the Future'"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    />
                </div>
                <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Assign Scout</label>
                    <select
                        value={selectedScoutId || ''}
                        onChange={e => setSelectedScoutId(Number(e.target.value))}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    >
                        <option value="">Select a Scout...</option>
                        {playerClubScouts.map(scout => (
                            <option key={scout.id} value={scout.id}>{scout.name}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Position</label>
                    <select
                        value={filters.position || ''}
                        onChange={e => handleFilterChange('position', e.target.value)}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    >
                        <option value="">Any</option>
                        <option value="GK">Goalkeeper</option>
                        <option value="DEF">Defender</option>
                        <option value="MID">Midfielder</option>
                        <option value="FWD">Forward</option>
                    </select>
                </div>
                <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Min Age</label>
                    <input
                        type="number"
                        placeholder="e.g., 17"
                        value={filters.minAge || ''}
                        onChange={e => handleFilterChange('minAge', Number(e.target.value))}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    />
                </div>
                 <div>
                    <label className="block text-gray-400 text-sm font-bold mb-2">Max Age</label>
                    <input
                        type="number"
                        placeholder="e.g., 23"
                        value={filters.maxAge || ''}
                        onChange={e => handleFilterChange('maxAge', Number(e.target.value))}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    />
                </div>
            </div>
            <div>
                 <label className="block text-gray-400 text-sm font-bold mb-2">Minimum Attributes</label>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(Object.keys(gameState.players[1].attributes) as (keyof PlayerAttributes)[]).map(attr => (
                         <div key={attr}>
                            <label className="block text-gray-500 text-xs mb-1 capitalize">{attr.replace(/([A-Z])/g, ' $1')}</label>
                            <input 
                                type="number"
                                placeholder="75+"
                                value={filters.attributes?.[attr] || ''}
                                onChange={e => handleAttributeFilterChange(attr, e.target.value)}
                                className="w-full bg-gray-700/50 text-white p-1 rounded text-sm"
                            />
                        </div>
                    ))}
                 </div>
            </div>
            <button onClick={handleCreateAssignment} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded mt-4">
                Send Scout (14 days)
            </button>
        </div>
    );
    
    const renderActiveAssignments = () => (
        <div>
            {gameState.scoutingAssignments.filter(a => !a.isComplete).map(assignment => {
                const scout = gameState.staff[assignment.scoutId];
                return (
                    <div key={assignment.id} className="bg-gray-700/50 p-4 rounded-lg mb-3">
                        <p className="font-bold">{assignment.description}</p>
                        <p className="text-sm text-gray-400">Scout: {scout.name}</p>
                        <p className="text-sm text-gray-400">In Progress - Report due on {new Date(assignment.completionDate).toLocaleDateString()}</p>
                    </div>
                )
            })}
        </div>
    );

    const renderReports = () => (
        <div>
            {gameState.scoutingAssignments.filter(a => a.isComplete).map(assignment => (
                <div key={assignment.id} className="bg-gray-700/50 p-4 rounded-lg mb-3">
                    <p className="font-bold">{assignment.description} - Report</p>
                    <p className="text-sm text-gray-400">Completed on {new Date(assignment.completionDate).toLocaleDateString()} - Found {assignment.reportPlayerIds.length} players.</p>
                     <div className="mt-2 pt-2 border-t border-gray-600">
                         {assignment.reportPlayerIds.map(pId => {
                            const player = gameState.players[pId];
                            if (!player) return null;
                            return (
                                <div key={pId} onClick={() => onPlayerClick(player)} className="p-2 hover:bg-gray-600 rounded cursor-pointer flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{player.name} ({player.age})</p>
                                        <p className="text-xs text-gray-400">{player.naturalPosition} at {gameState.clubs[player.clubId].name}</p>
                                    </div>
                                    <span className="text-sm font-mono">{player.marketValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}</span>
                                </div>
                            )
                         })}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Scouting Center</h2>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('new')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'new' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    New Assignment
                </button>
                 <button onClick={() => setActiveTab('active')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'active' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Active
                </button>
                 <button onClick={() => setActiveTab('reports')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'reports' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Reports
                </button>
            </div>
            
            {activeTab === 'new' && renderNewAssignment()}
            {activeTab === 'active' && renderActiveAssignments()}
            {activeTab === 'reports' && renderReports()}
        </div>
    );
};

export default ScoutingView;