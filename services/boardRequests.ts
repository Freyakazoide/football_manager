import { BoardRequest, BoardRequestType } from '../types';

export const BOARD_REQUESTS: BoardRequest[] = [
    // --- FINANCIAL ---
    {
        type: BoardRequestType.INCREASE_TRANSFER_BUDGET,
        title: "Aumentar Orçamento de Transferência",
        description: "Peça um aumento no orçamento de transferências para contratar jogadores de maior calibre.",
        cost: 0, // O 'custo' é a injeção de fundos, não uma despesa.
        cooldownMonths: 6,
        requirements: { minConfidence: 75, minBalance: 1000000 },
    },
    {
        type: BoardRequestType.INCREASE_WAGE_BUDGET,
        title: "Aumentar Orçamento de Salários",
        description: "Solicite um aumento no orçamento de salários para contratar jogadores melhores ou renovar contratos.",
        cost: 0,
        cooldownMonths: 6,
        requirements: { minConfidence: 70 },
    },
    // --- FACILITIES & STAFF ---
    {
        type: BoardRequestType.INVEST_IN_YOUTH_SETUP,
        title: "Investir na Estrutura de Base",
        description: "Invista na estrutura de base para potencialmente aumentar a qualidade da próxima leva de jovens talentos.",
        cost: 500000,
        cooldownMonths: 12,
        requirements: { minConfidence: 65, minBalance: 500000 },
    },
    {
        type: BoardRequestType.UPGRADE_TRAINING_FACILITIES,
        title: "Melhorar Instalações de Treino",
        description: "Melhore as instalações de treino do clube para acelerar o desenvolvimento dos jogadores.",
        cost: 1000000,
        cooldownMonths: 24,
        requirements: { minConfidence: 80, minBalance: 1000000 },
    },
    {
        type: BoardRequestType.UPGRADE_MEDICAL_DEPARTMENT,
        title: "Melhorar Departamento Médico",
        description: "Melhore o departamento médico para reduzir os tempos de recuperação de lesões.",
        cost: 250000,
        cooldownMonths: 12,
        requirements: { minConfidence: 60, minBalance: 250000 },
    },
    {
        type: BoardRequestType.EXPAND_SCOUTING_NETWORK,
        title: "Expandir Rede de Observação",
        description: "Aumente o alcance e a eficácia da sua rede de observação.",
        cost: 200000,
        cooldownMonths: 12,
        requirements: { minConfidence: 60, minBalance: 200000 },
    },
    {
        type: BoardRequestType.IMPROVE_PERFORMANCE_ANALYSIS,
        title: "Melhorar Análise de Desempenho",
        description: "Invista em tecnologia de análise de desempenho para otimizar o treino.",
        cost: 150000,
        cooldownMonths: 12,
        requirements: { minConfidence: 60, minBalance: 150000 },
    },
    {
        type: BoardRequestType.EXPAND_STADIUM_CAPACITY,
        title: "Expandir Capacidade do Estádio",
        description: "Um projeto de longo prazo para aumentar a capacidade do estádio, aumentando a receita e a reputação.",
        cost: 20000000,
        cooldownMonths: 48,
        requirements: { minConfidence: 90, minReputation: 80, minBalance: 20000000 },
    },
    {
        type: BoardRequestType.RELAY_PITCH,
        title: "Reformar o Gramado",
        description: "Solicite uma reforma completa do gramado para melhorar a qualidade e reduzir o risco de lesões.",
        cost: 300000,
        cooldownMonths: 24,
        requirements: { minConfidence: 50, minBalance: 300000 },
    },
    // --- AFFILIATIONS ---
    {
        type: BoardRequestType.SEARCH_FOR_AFFILIATE_CLUB,
        title: "Procurar Clube Afiliado",
        description: "Peça à diretoria para encontrar um clube menor para onde você possa emprestar jovens jogadores para ganhar experiência.",
        cost: 50000,
        cooldownMonths: 18,
        requirements: { minConfidence: 70, minReputation: 60 },
    },
    {
        type: BoardRequestType.SEARCH_FOR_PARENT_CLUB,
        title: "Procurar Clube Parceiro",
        description: "Peça à diretoria para estabelecer uma afiliação com um clube maior, permitindo que você receba jogadores por empréstimo gratuitamente.",
        cost: 25000,
        cooldownMonths: 18,
        requirements: { minConfidence: 75, minReputation: 50 },
    },
    // --- PERSONAL / STRATEGIC ---
    {
        type: BoardRequestType.REQUEST_MORE_TIME,
        title: "Pedir Mais Tempo",
        description: "Se sua confiança estiver baixa, peça à diretoria um voto de confiança para lhe dar mais tempo para provar seu valor.",
        cost: 0,
        cooldownMonths: 6,
        requirements: { minConfidence: 1, minReputation: 0, minBalance: -Infinity }, // Can be requested even with low confidence
    },
    {
        type: BoardRequestType.PRAISE_BOARD,
        title: "Elogiar a Diretoria",
        description: "Elogie publicamente a diretoria pelo seu apoio, proporcionando um pequeno aumento na confiança.",
        cost: 0,
        cooldownMonths: 3,
        requirements: { minConfidence: 0 },
    },
    {
        type: BoardRequestType.CHANGE_CLUB_PHILOSOPHY,
        title: "Mudar Filosofia do Clube",
        description: "Peça à diretoria para reconsiderar ou alterar uma das filosofias atuais do clube.",
        cost: 0,
        cooldownMonths: 12,
        requirements: { minConfidence: 85 },
    },
    {
        type: BoardRequestType.IMPROVE_CLUB_REPUTATION,
        title: "Melhorar Reputação do Clube",
        description: "Solicite uma campanha de relações públicas para ajudar a aumentar a reputação do clube.",
        cost: 100000,
        cooldownMonths: 12,
        requirements: { minConfidence: 70, minBalance: 100000 },
    },
];