import React from 'react';
import { TransferResult } from '../types';

interface TransferResultModalProps {
    result: TransferResult;
    onClose: () => void;
}

const TransferResultModal: React.FC<TransferResultModalProps> = ({ result, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 text-center">
                    <h2 className={`text-2xl font-bold mb-4 ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.success ? 'Transferência Bem-sucedida!' : 'Oferta Rejeitada'}
                    </h2>
                    <p className="text-gray-300 mb-6">{result.message}</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransferResultModal;
