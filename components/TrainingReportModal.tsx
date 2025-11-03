import React from 'react';

export interface TrainingReport {
    analysis: string;
    suggestedPrimaryFocus: string;
    primaryFocusRationale: string;
    suggestedSecondaryFocus: string;
    secondaryFocusRationale: string;
    playersToWatch: {
        playerName: string;
        reason: string;
    }[];
}

interface TrainingReportModalProps {
    report: TrainingReport;
    assistantName: string;
    onClose: () => void;
}

const TrainingReportModal: React.FC<TrainingReportModalProps> = ({ report, assistantName, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold">Relatório da Comissão Técnica</h2>
                        <p className="text-gray-400">Análise e sugestões de {assistantName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold">&times;</button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Análise */}
                    <div className="bg-gray-700/50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-green-400 mb-2">Análise de Desempenho</h3>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{report.analysis}</p>
                    </div>

                    {/* Sugestões */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-bold text-green-400">Foco Primário Sugerido</h4>
                            <p className="text-xl font-semibold my-1">{report.suggestedPrimaryFocus}</p>
                            <p className="text-xs text-gray-400">{report.primaryFocusRationale}</p>
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <h4 className="font-bold text-green-400">Foco Secundário Sugerido</h4>
                            <p className="text-xl font-semibold my-1">{report.suggestedSecondaryFocus}</p>
                            <p className="text-xs text-gray-400">{report.secondaryFocusRationale}</p>
                        </div>
                    </div>

                    {/* Jogadores em Destaque */}
                    {report.playersToWatch && report.playersToWatch.length > 0 && (
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                            <h3 className="text-lg font-semibold text-green-400 mb-3">Jogadores em Destaque</h3>
                            <div className="space-y-3">
                                {report.playersToWatch.map((p, index) => (
                                    <div key={index} className="border-l-4 border-yellow-500 pl-3">
                                        <p className="font-bold">{p.playerName}</p>
                                        <p className="text-sm text-gray-400">{p.reason}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-700">
                    <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded">
                        Fechar Relatório
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TrainingReportModal;
