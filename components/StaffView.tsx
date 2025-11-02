import React, { useState, useMemo } from 'react';
import { GameState, Staff, StaffRole, DepartmentType, StaffAttributes } from '../types';
import { Action } from '../services/reducerTypes';

interface StaffViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const getDepartmentMaintenanceCost = (level: number) => {
    return [0, 1000, 3000, 7500, 15000, 25000][level] || 0;
};

const getDepartmentUpgradeCost = (level: number) => {
    return [0, 25000, 75000, 200000, 500000, Infinity][level] || Infinity;
};

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

const DepartmentCard: React.FC<{
    departmentType: DepartmentType;
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}> = ({ departmentType, gameState, dispatch }) => {
    const club = gameState.clubs[gameState.playerClubId!];
    const department = club.departments[departmentType];
    const chief = department.chiefId ? gameState.staff[department.chiefId] : null;

    const handleUpgrade = () => {
        // The confirm() dialog might be blocked, making the button appear unresponsive.
        // Removing it for a direct, immediate action.
        dispatch({ type: 'UPGRADE_DEPARTMENT', payload: { department: departmentType } });
    };

    const handleFire = () => {
         if (chief) {
            // The confirm() dialog might be blocked, making the button appear unresponsive.
            // Removing it for a direct, immediate action.
            dispatch({ type: 'FIRE_STAFF', payload: { staffId: chief.id } });
        }
    };
    
    return (
        <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-bold text-green-400">{departmentType}</h3>
                <div className="text-sm text-gray-400 mb-3">Level {department.level}</div>

                {chief ? (
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                        <h4 className="font-semibold text-white">{chief.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{chief.role}</p>
                        <div className="space-y-1">
                            {Object.entries(chief.attributes).map(([key, value]) => (
                                <StaffAttribute key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value as number} />
                            ))}
                        </div>
                        <button onClick={handleFire} className="mt-3 w-full text-xs bg-red-800 hover:bg-red-700 py-1 rounded">Fire</button>
                    </div>
                ) : (
                    <div className="text-center p-6 border-2 border-dashed border-gray-600 rounded-lg">
                        <p className="text-gray-500">No Chief Hired</p>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="text-xs text-gray-400 flex justify-between">
                    <span>Maint. Cost:</span>
                    <span>${getDepartmentMaintenanceCost(department.level)}/mo</span>
                </div>
                {department.level < 5 && (
                    <button 
                        onClick={handleUpgrade} 
                        disabled={club.balance < getDepartmentUpgradeCost(department.level)}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Upgrade to Lvl {department.level + 1} (${getDepartmentUpgradeCost(department.level).toLocaleString()})
                    </button>
                )}
            </div>
        </div>
    );
};


const StaffMarketCard: React.FC<{ staff: Staff; onHire: (staffId: number, department: DepartmentType) => void; hiredChiefs: Record<DepartmentType, number|null> }> = ({ staff, onHire, hiredChiefs }) => {
    const roleToDepartmentMap: Record<StaffRole, DepartmentType> = {
        [StaffRole.AssistantManager]: DepartmentType.Coaching,
        [StaffRole.HeadOfPerformance]: DepartmentType.Performance,
        [StaffRole.HeadOfPhysiotherapy]: DepartmentType.Medical,
        [StaffRole.HeadOfScouting]: DepartmentType.Scouting,
    };
    const department = roleToDepartmentMap[staff.role];
    const isPositionFilled = !!hiredChiefs[department];
    
    return (
        <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col">
            <div className="flex-1">
                <h4 className="font-bold text-lg text-white">{staff.name}</h4>
                <p className="text-sm text-gray-400">{staff.role} | {staff.age} y/o</p>
                <p className="text-xs text-gray-500 mb-3">{staff.nationality}</p>

                <div className="space-y-1 mb-3">
                    {Object.entries(staff.attributes).map(([key, value]) => (
                        <StaffAttribute key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value as number} />
                    ))}
                </div>
            </div>
            <p className="text-xs text-yellow-400 font-mono mb-3">Wage: {staff.wage.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}/wk</p>
            <button
                onClick={() => onHire(staff.id, department)}
                disabled={isPositionFilled}
                className="w-full py-2 rounded font-bold text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isPositionFilled ? 'Position Filled' : 'Offer Contract'}
            </button>
        </div>
    );
}

const StaffView: React.FC<StaffViewProps> = ({ gameState, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'current' | 'search'>('current');
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const club = gameState.clubs[playerClubId];
    if (!club) return null; // Defensive check to prevent crash

    const unemployedStaff = useMemo(() => {
        return (Object.values(gameState.staff) as Staff[]).filter(s => s.clubId === null);
    }, [gameState.staff]);

    const handleHire = (staffId: number, department: DepartmentType) => {
        dispatch({ type: 'HIRE_STAFF', payload: { staffId, department } });
        setActiveTab('current');
    };

    const hiredChiefs = useMemo(() => ({
        [DepartmentType.Coaching]: club.departments[DepartmentType.Coaching].chiefId,
        [DepartmentType.Medical]: club.departments[DepartmentType.Medical].chiefId,
        [DepartmentType.Scouting]: club.departments[DepartmentType.Scouting].chiefId,
        [DepartmentType.Performance]: club.departments[DepartmentType.Performance].chiefId,
    }), [club.departments]);
    
    const renderCurrentStaff = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DepartmentCard departmentType={DepartmentType.Coaching} gameState={gameState} dispatch={dispatch} />
            <DepartmentCard departmentType={DepartmentType.Performance} gameState={gameState} dispatch={dispatch} />
            <DepartmentCard departmentType={DepartmentType.Medical} gameState={gameState} dispatch={dispatch} />
            <DepartmentCard departmentType={DepartmentType.Scouting} gameState={gameState} dispatch={dispatch} />
        </div>
    );
    
    const renderStaffSearch = () => (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unemployedStaff.map(staff => (
                <StaffMarketCard key={staff.id} staff={staff} onHire={handleHire} hiredChiefs={hiredChiefs} />
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
                    Staff Market
                </button>
            </div>
            
            {activeTab === 'current' ? renderCurrentStaff() : renderStaffSearch()}
        </div>
    );
};

export default StaffView;