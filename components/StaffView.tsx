import React, { useState, useMemo } from 'react';
import { GameState, Staff, StaffRole, AssistantAttributes, ScoutAttributes, PhysioAttributes } from '../types';
import { Action } from '../services/reducerTypes';

interface StaffViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const StaffAttribute: React.FC<{ label: string; value: number }> = ({ label, value }) => {
    const getColor = (val: number) => {
        if (val >= 85) return 'text-green-400';
        if (val >= 70) return 'text-yellow-400';
        return 'text-gray-300';
    };
    return (
        <div className="flex justify-between text-sm">
            <span className="text-gray-400">{label}</span>
            <span className={`font-bold ${getColor(value)}`}>{value}</span>
        </div>
    );
};

const StaffCard: React.FC<{ staff: Staff; onAction: () => void; actionLabel: string; isHired: boolean }> = ({ staff, onAction, actionLabel, isHired }) => (
    <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col">
        <div className="flex-1">
            <h4 className="font-bold text-lg text-white">{staff.name}</h4>
            <p className="text-sm text-gray-400">{staff.role} | {staff.age} y/o</p>
            <p className="text-xs text-gray-500 mb-3">{staff.nationality}</p>

            <div className="space-y-1 mb-3">
                {Object.entries(staff.attributes).map(([key, value]) => (
                    <StaffAttribute key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value} />
                ))}
            </div>
        </div>
        <p className="text-xs text-yellow-400 font-mono mb-3">Wage: {staff.wage.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}/wk</p>
        <button
            onClick={onAction}
            className={`w-full py-2 rounded font-bold text-sm ${isHired ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
        >
            {actionLabel}
        </button>
    </div>
);


const StaffView: React.FC<StaffViewProps> = ({ gameState, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'current' | 'search'>('current');
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const club = gameState.clubs[playerClubId];

    const currentStaff = useMemo(() => {
        const staffIds = [
            club.staffIds.assistant,
            ...club.staffIds.physios,
            ...club.staffIds.scouts,
        ].filter((id): id is number => id !== null);
        return staffIds.map(id => gameState.staff[id]);
    }, [club.staffIds, gameState.staff]);

    const unemployedStaff = useMemo(() => {
        // FIX: Cast Object.values to Staff[] to correctly infer staff type.
        return (Object.values(gameState.staff) as Staff[]).filter(s => s.clubId === null);
    }, [gameState.staff]);

    const handleHire = (staffId: number) => {
        dispatch({ type: 'HIRE_STAFF', payload: { staffId } });
    };

    const handleFire = (staffId: number) => {
        if (confirm('Are you sure you want to terminate this staff member\'s contract?')) {
            dispatch({ type: 'FIRE_STAFF', payload: { staffId } });
        }
    };
    
    const renderCurrentStaff = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentStaff.map(staff => (
                <StaffCard key={staff.id} staff={staff} onAction={() => handleFire(staff.id)} actionLabel="Terminate Contract" isHired />
            ))}
        </div>
    );
    
    const renderStaffSearch = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unemployedStaff.map(staff => (
                <StaffCard key={staff.id} staff={staff} onAction={() => handleHire(staff.id)} actionLabel="Offer Contract" isHired={false} />
            ))}
        </div>
    );

    return (
         <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Staff Center</h2>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('current')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'current' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Your Staff
                </button>
                 <button onClick={() => setActiveTab('search')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'search' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Staff Search
                </button>
            </div>
            
            {activeTab === 'current' ? renderCurrentStaff() : renderStaffSearch()}
        </div>
    );
};

export default StaffView;