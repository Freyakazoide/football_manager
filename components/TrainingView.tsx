import React, { useState, useEffect, useMemo } from 'react';
import { GameState, Player, TeamTrainingFocus, IndividualTrainingFocus, PlayerAttributes, PlayerRole, DepartmentType, SecondaryTrainingFocus, AssistantManagerAttributes, Staff } from '../types';
import { Action } from '../services/reducerTypes';
import { ALL_ROLES } from '../services/database';
import { generateTrainingReport } from '../services/aiTrainingService';
import TrainingReportModal from './TrainingReportModal';

interface TrainingViewProps {
    gameState: GameState;
    dispatch: React.Dispatch<Action>;
}

const ATTRIBUTE_KEYS = [
    'passing', 'dribbling', 'shooting', 'tackling', 'heading', 'crossing',
    'aggression', 'creativity', 'positioning', 'teamwork', 'workRate',
    'pace', 'stamina', 'strength', 'naturalFitness'
] as (keyof PlayerAttributes)[];

const TrainingView: React.FC<TrainingViewProps> = ({ gameState, dispatch }) => {
    const playerClubId = gameState.playerClubId;
    if (!playerClubId) return null;

    const club = gameState.clubs[playerClubId];
    const assistantId = club.departments[DepartmentType.Coaching].chiefId;
    const assistant = assistantId ? gameState.staff[assistantId] as Staff & { attributes: AssistantManagerAttributes } : null;

    const clubPlayers = useMemo(() =>
        (Object.values(gameState.players) as Player[]).filter(p => p.clubId === playerClubId)
    , [gameState.players, playerClubId]);
    
    const [activeTab, setActiveTab] = useState<'schedule' | 'individual'>('schedule');

    // State for Weekly Schedule tab
    const [primaryFocus, setPrimaryFocus] = useState<TeamTrainingFocus>(club.weeklyTrainingFocus.primary);
    const [secondaryFocus, setSecondaryFocus] = useState<SecondaryTrainingFocus>(club.weeklyTrainingFocus.secondary);

    // State for Individual Focuses tab
    const [individualFocuses, setIndividualFocuses] = useState<Record<number, IndividualTrainingFocus>>({});

    // State for AI Report Modal
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [reportContent, setReportContent] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        setPrimaryFocus(club.weeklyTrainingFocus.primary);
        setSecondaryFocus(club.weeklyTrainingFocus.secondary);
        const initialFocuses: Record<number, IndividualTrainingFocus> = {};
        clubPlayers.forEach(p => {
            initialFocuses[p.id] = p.individualTrainingFocus;
        });
        setIndividualFocuses(initialFocuses);
    }, [club, clubPlayers]);

    const handleIndividualFocusChange = (playerId: number, value: string) => {
        let newFocus: IndividualTrainingFocus = null;
        if (value.startsWith('attr_')) {
            newFocus = { type: 'attribute', attribute: value.replace('attr_', '') as keyof PlayerAttributes };
        } else if (value.startsWith('role_')) {
            newFocus = { type: 'role', role: value.replace('role_', '') as PlayerRole };
        }
        setIndividualFocuses(prev => ({ ...prev, [playerId]: newFocus }));
    };

    // FIX: Replaced the single 'UPDATE_TRAINING_SETTINGS' dispatch with two separate dispatches based on the active tab, to align with the new reducer actions.
    const handleSaveChanges = () => {
        if (activeTab === 'schedule') {
            dispatch({ type: 'UPDATE_WEEKLY_TRAINING_FOCUS', payload: { primary: primaryFocus, secondary: secondaryFocus } });
        } else {
            dispatch({ type: 'UPDATE_INDIVIDUAL_TRAINING_FOCUSES', payload: { individualFocuses } });
        }
    };
    
    const handleGenerateReport = async (period: 'weekly' | 'monthly') => {
        setIsGenerating(true);
        try {
            const report = await generateTrainingReport(gameState, period);
            setReportContent(report);
            setIsReportModalOpen(true);
        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("Could not generate the training report. Please check the console for errors.");
        } finally {
            setIsGenerating(false);
        }
    };

    const getIndividualFocusValue = (focus: IndividualTrainingFocus): string => {
        if (!focus) return 'none';
        if (focus.type === 'attribute') return `attr_${focus.attribute}`;
        if (focus.type === 'role') return `role_${focus.role}`;
        return 'none';
    };

    const TEAM_FOCUS_OPTIONS: TeamTrainingFocus[] = ['Equilibrado', 'Ofensivo', 'Defensivo', 'Tático', 'Físico', 'Bolas Paradas'];
    const SECONDARY_FOCUS_OPTIONS: SecondaryTrainingFocus[] = ['Nenhum', 'Bolas Paradas de Ataque', 'Bolas Paradas de Defesa', 'Contra-Ataque', 'Pressão Alta'];

    const renderWeeklySchedule = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-lg font-semibold text-green-400 mb-2">Foco Primário</label>
                    <p className="text-sm text-gray-400 mb-3">Defina o foco principal para o treino da equipe nesta semana.</p>
                     <select
                        value={primaryFocus}
                        onChange={e => setPrimaryFocus(e.target.value as TeamTrainingFocus)}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    >
                        {TEAM_FOCUS_OPTIONS.map(focus => (
                            <option key={focus} value={focus}>{focus}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-lg font-semibold text-green-400 mb-2">Foco Secundário</label>
                    <p className="text-sm text-gray-400 mb-3">Adicione um foco secundário para trabalhar em um aspecto específico do jogo.</p>
                     <select
                        value={secondaryFocus}
                        onChange={e => setSecondaryFocus(e.target.value as SecondaryTrainingFocus)}
                        className="w-full bg-gray-700 text-white p-2 rounded"
                    >
                        {SECONDARY_FOCUS_OPTIONS.map(focus => (
                            <option key={focus} value={focus}>{focus}</option>
                        ))}
                    </select>
                </div>
            </div>
             <div className="bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-lg font-semibold text-green-400 mb-3">Relatórios da Comissão Técnica</h4>
                <p className="text-sm text-gray-400 mb-4">Peça ao seu auxiliar técnico para analisar o desempenho recente da equipe e sugerir um plano de treino.</p>
                <div className="flex gap-4">
                     <button onClick={() => handleGenerateReport('weekly')} disabled={!assistant || isGenerating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isGenerating ? 'Gerando...' : 'Gerar Relatório Semanal'}
                    </button>
                    <button onClick={() => handleGenerateReport('monthly')} disabled={!assistant || isGenerating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isGenerating ? 'Gerando...' : 'Gerar Relatório Mensal'}
                    </button>
                </div>
                 {!assistant && <p className="text-xs text-yellow-400 mt-2 text-center">Você precisa contratar um Auxiliar Técnico para gerar relatórios.</p>}
            </div>
        </div>
    );

    const renderIndividualFocuses = () => (
        <div>
            <p className="text-sm text-gray-400 mb-3">Atribua um foco de treino específico a jogadores individuais para melhorar um atributo particular ou treiná-los em uma nova posição/função.</p>
            <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left text-sm">
                    <thead className="border-b-2 border-gray-700 text-gray-400 sticky top-0 bg-gray-900/50 z-10">
                        <tr>
                            <th className="p-3">Jogador</th>
                            <th className="p-3">Posição</th>
                            <th className="p-3">Foco Individual</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clubPlayers.map(player => (
                            <tr key={player.id} className="border-b border-gray-700">
                                <td className="p-3 font-semibold">{player.name}</td>
                                <td className="p-3">{player.naturalPosition}</td>
                                <td className="p-3">
                                    <select
                                        value={getIndividualFocusValue(individualFocuses[player.id])}
                                        onChange={e => handleIndividualFocusChange(player.id, e.target.value)}
                                        className="w-full bg-gray-700 text-white p-2 rounded text-xs"
                                    >
                                        <option value="none">Nenhum</option>
                                        <optgroup label="Atributos">
                                            {ATTRIBUTE_KEYS.map(attr => (
                                                <option key={attr} value={`attr_${attr}`}>{attr.charAt(0).toUpperCase() + attr.slice(1).replace(/([A-Z])/g, ' $1')}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Nova Função">
                                            {ALL_ROLES.map(role => (
                                                <option key={role} value={`role_${role}`}>{role}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 space-y-6">
            {isReportModalOpen && reportContent && (
                <TrainingReportModal 
                    report={reportContent} 
                    onClose={() => setIsReportModalOpen(false)} 
                    assistantName={assistant?.name || 'Auxiliar'}
                />
            )}
            <h2 className="text-2xl font-bold text-white">Centro de Treinamento</h2>

            <div className="flex border-b border-gray-700">
                <button onClick={() => setActiveTab('schedule')} className={`py-2 px-4 font-semibold ${activeTab === 'schedule' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>
                    Planejamento Semanal
                </button>
                <button onClick={() => setActiveTab('individual')} className={`py-2 px-4 font-semibold ${activeTab === 'individual' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400'}`}>
                    Focos Individuais
                </button>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg">
                {activeTab === 'schedule' ? renderWeeklySchedule() : renderIndividualFocuses()}
            </div>
            
            <button
                onClick={handleSaveChanges}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-transform duration-200 hover:scale-105"
            >
                Confirmar Alterações de Treino
            </button>
        </div>
    );
};

export default TrainingView;
