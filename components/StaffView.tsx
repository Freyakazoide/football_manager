import React, { useState, useMemo } from 'react';
import { GameState, Staff, StaffRole, DepartmentType, StaffAttributes, Club, Player, HeadOfPhysiotherapyAttributes } from '../types';
import { Action } from '../services/reducerTypes';

interface StaffViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const PhysioRoomModal: React.FC<{ gameState: GameState; onClose: () => void; }> = ({ gameState, onClose }) => {
    const playerClubId = gameState.playerClubId!;
    const injuredPlayers = (Object.values(gameState.players) as Player[]).filter(p => p.clubId === playerClubId && p.injury);
    const headOfPhysioId = gameState.clubs[playerClubId].departments[DepartmentType.Medical].chiefId;
    const headOfPhysio = headOfPhysioId ? gameState.staff[headOfPhysioId] as Staff & { attributes: HeadOfPhysiotherapyAttributes } : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold">Sala de Fisioterapia</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-sm text-gray-400 mb-4">
                        {headOfPhysio 
                            ? `Sob os cuidados de ${headOfPhysio.name}, a recuperação dos jogadores está sendo monitorada de perto.`
                            : "Sem um Chefe de Fisioterapia, os tempos de recuperação podem ser maiores e menos previsíveis."
                        }
                    </p>
                    <table className="w-full text-left">
                        <thead className="border-b-2 border-gray-700 text-gray-400">
                            <tr>
                                <th className="p-3">Jogador</th>
                                <th className="p-3">Lesão</th>
                                <th className="p-3">Recuperação</th>
                                <th className="p-3 text-right">Retorno Previsto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {injuredPlayers.length > 0 ? injuredPlayers.map(player => {
                                const injury = player.injury!;
                                const totalDuration = injury.returnDate.getTime() - injury.startDate.getTime();
                                const timePassed = gameState.currentDate.getTime() - injury.startDate.getTime();
                                let progress = totalDuration > 0 ? (timePassed / totalDuration) * 100 : 100;
                                progress = Math.min(100, Math.max(0, progress));

                                return (
                                <tr key={player.id} className="border-b border-gray-700">
                                    <td className="p-3 font-semibold">{player.name}</td>
                                    <td className="p-3 text-sm">{injury.type}</td>
                                    <td className="p-3">
                                        <div className="w-full bg-gray-600 rounded-full h-4 relative">
                                            <div className="bg-green-500 h-4 rounded-full" style={{ width: `${progress}%` }}></div>
                                            <span className="absolute inset-0 text-xs font-bold text-white flex items-center justify-center">{Math.round(progress)}%</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-right text-sm">{injury.returnDate.toLocaleDateString()}</td>
                                </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-8 text-gray-500">Nenhum jogador lesionado no momento.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


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
        dispatch({ type: 'UPGRADE_DEPARTMENT', payload: { department: departmentType } });
    };

    const handleFire = (staffId: number) => {
        dispatch({ type: 'FIRE_STAFF', payload: { staffId } });
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
                        <button onClick={() => handleFire(chief.id)} className="mt-3 w-full text-xs bg-red-800 hover:bg-red-700 py-1 rounded">Demitir</button>
                    </div>
                ) : (
                    <div className="text-center p-6 border-2 border-dashed border-gray-600 rounded-lg">
                        <p className="text-gray-500">Nenhum Chefe Contratado</p>
                    </div>
                )}

                 {departmentType === DepartmentType.Coaching && (
                    <div className="mt-3">
                        <h4 className="text-md font-semibold text-gray-300 mb-2">Treinadores ({department.coachIds?.length || 0}/{department.level})</h4>
                        <div className="space-y-2">
                            {department.coachIds?.map(id => gameState.staff[id]).map(coach => (
                                <div key={coach.id} className="bg-gray-900/50 p-3 rounded-lg">
                                    <h4 className="font-semibold text-white">{coach.name}</h4>
                                    <p className="text-xs text-gray-500 mb-2">{coach.role}</p>
                                    <div className="space-y-1">
                                         {Object.entries(coach.attributes).map(([key, value]) => (
                                            <StaffAttribute key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value as number} />
                                        ))}
                                    </div>
                                    <button onClick={() => handleFire(coach.id)} className="mt-3 w-full text-xs bg-red-800 hover:bg-red-700 py-1 rounded">Demitir</button>
                                </div>
                            ))}
                            {Array.from({ length: department.level - (department.coachIds?.length || 0) }).map((_, i) => (
                                <div key={`empty-${i}`} className="text-center p-4 border-2 border-dashed border-gray-600 rounded-lg">
                                    <p className="text-gray-500 text-sm">Vaga para Treinador</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-600">
                <div className="text-xs text-gray-400 flex justify-between">
                    <span>Custo Manutenção:</span>
                    <span>{getDepartmentMaintenanceCost(department.level).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}/mês</span>
                </div>
                {department.level < 5 && (
                    <button 
                        onClick={handleUpgrade} 
                        disabled={club.balance < getDepartmentUpgradeCost(department.level)}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Melhorar para Nível {department.level + 1} ({getDepartmentUpgradeCost(department.level).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })})
                    </button>
                )}
            </div>
        </div>
    );
};


const StaffMarketCard: React.FC<{ staff: Staff; onHire: (staffId: number, department: DepartmentType) => void; hiredChiefs: Record<DepartmentType, number|null>; club: Club }> = ({ staff, onHire, hiredChiefs, club }) => {
    const roleToDepartmentMap: Record<string, DepartmentType> = {
        [StaffRole.AssistantManager]: DepartmentType.Coaching,
        [StaffRole.HeadOfPerformance]: DepartmentType.Performance,
        [StaffRole.HeadOfPhysiotherapy]: DepartmentType.Medical,
        [StaffRole.HeadOfScouting]: DepartmentType.Scouting,
    };
    
    let isPositionFilled = false;
    let department: DepartmentType | undefined;

    if (staff.role === StaffRole.Coach) {
        department = DepartmentType.Coaching;
        const coachingDept = club.departments[department];
        isPositionFilled = (coachingDept.coachIds?.length || 0) >= coachingDept.level;
    } else {
        department = roleToDepartmentMap[staff.role];
        isPositionFilled = !!hiredChiefs[department!];
    }
    
    return (
        <div className="bg-gray-700/50 rounded-lg p-4 flex flex-col">
            <div className="flex-1">
                <h4 className="font-bold text-lg text-white">{staff.name}</h4>
                <p className="text-sm text-gray-400">{staff.role} | {staff.age} anos</p>
                <p className="text-xs text-gray-500 mb-3">{staff.nationality}</p>

                <div className="space-y-1 mb-3">
                    {Object.entries(staff.attributes).map(([key, value]) => (
                        <StaffAttribute key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} value={value as number} />
                    ))}
                </div>
            </div>
            <p className="text-xs text-yellow-400 font-mono mb-3">Salário: {staff.wage.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })}/sem</p>
            <button
                onClick={() => onHire(staff.id, department!)}
                disabled={isPositionFilled}
                className="w-full py-2 rounded font-bold text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isPositionFilled ? (staff.role === StaffRole.Coach ? 'Vagas de Treinador preenchidas' : 'Posição Preenchida') : 'Oferecer Contrato'}
            </button>
        </div>
    );
}

const StaffView: React.FC<StaffViewProps> = ({ gameState, dispatch }) => {
    const [activeTab, setActiveTab] = useState<'current' | 'search'>('current');
    const [isPhysioRoomOpen, setIsPhysioRoomOpen] = useState(false);
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
                <StaffMarketCard key={staff.id} staff={staff} onHire={handleHire} hiredChiefs={hiredChiefs} club={club} />
            ))}
        </div>
    );

    return (
         <div className="bg-gray-800 rounded-lg shadow-xl p-6">
            {isPhysioRoomOpen && <PhysioRoomModal gameState={gameState} onClose={() => setIsPhysioRoomOpen(false)} />}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Centro de Staff</h2>
                <button 
                    onClick={() => setIsPhysioRoomOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Sala de Fisioterapia
                </button>
            </div>
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setActiveTab('current')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'current' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Seu Staff
                </button>
                 <button onClick={() => setActiveTab('search')} className={`capitalize py-2 px-4 text-sm font-semibold ${activeTab === 'search' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Mercado de Staff
                </button>
            </div>
            
            {activeTab === 'current' ? renderCurrentStaff() : renderStaffSearch()}
        </div>
    );
};

export default StaffView;
