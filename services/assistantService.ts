import { Club, Player, Staff, AssistantManagerAttributes, AssistantSuggestion, TeamTrainingFocus, SecondaryTrainingFocus, PlayerAttributes, IndividualTrainingFocus } from '../types';

const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

type SquadArea = 'attack' | 'defense' | 'technical' | 'physical' | 'generic';

const ATTACK_ATTRS: (keyof PlayerAttributes)[] = ['shooting', 'dribbling', 'creativity'];
const DEFENSE_ATTRS: (keyof PlayerAttributes)[] = ['tackling', 'positioning', 'heading'];
const TECHNICAL_ATTRS: (keyof PlayerAttributes)[] = ['passing', 'crossing'];
const PHYSICAL_ATTRS: (keyof PlayerAttributes)[] = ['pace', 'stamina', 'strength', 'workRate'];

export const generateAssistantSuggestions = (
    club: Club,
    players: Player[],
    assistant: Staff & { attributes: AssistantManagerAttributes }
): AssistantSuggestion[] => {
    const suggestions: AssistantSuggestion[] = [];
    const squad = players.filter(p => p.squadStatus !== 'Base');

    if (squad.length < 11) {
        return [{
            title: "Elenco Insuficiente",
            justification: "Chefe, não temos jogadores suficientes no time principal para fazer uma análise de treino adequada.",
            recommendedPrimaryFocus: 'Equilibrado',
            recommendedSecondaryFocus: 'Nenhum',
        }];
    }

    // 1. Analisar as fraquezas do time
    const avgAttributes = {
        attack: squad.reduce((sum, p) => sum + ATTACK_ATTRS.reduce((s, attr) => s + p.attributes[attr], 0) / ATTACK_ATTRS.length, 0) / squad.length,
        defense: squad.reduce((sum, p) => sum + DEFENSE_ATTRS.reduce((s, attr) => s + p.attributes[attr], 0) / DEFENSE_ATTRS.length, 0) / squad.length,
        technical: squad.reduce((sum, p) => sum + TECHNICAL_ATTRS.reduce((s, attr) => s + p.attributes[attr], 0) / TECHNICAL_ATTRS.length, 0) / squad.length,
        physical: squad.reduce((sum, p) => sum + PHYSICAL_ATTRS.reduce((s, attr) => s + p.attributes[attr], 0) / PHYSICAL_ATTRS.length, 0) / squad.length,
    };

    const sortedAreas = (Object.keys(avgAttributes) as SquadArea[]).sort((a, b) => avgAttributes[a] - avgAttributes[b]);
    let identifiedWeakness: SquadArea = sortedAreas[0];

    // 2. A habilidade do auxiliar influencia a precisão
    const accuracyCheck = Math.random() * 100;
    if (accuracyCheck > assistant.attributes.tacticalKnowledge) {
        // O auxiliar errou! Pega a segunda fraqueza ou uma sugestão genérica.
        identifiedWeakness = sortedAreas[1] || 'generic';
    }

    // 3. Gerar sugestão principal com base na fraqueza
    switch (identifiedWeakness) {
        case 'defense':
            suggestions.push({
                title: "Fortalecer a Defesa",
                justification: "Observei que nossa unidade defensiva parece um pouco desorganizada. Focar nos fundamentos defensivos pode nos tornar mais sólidos.",
                recommendedPrimaryFocus: 'Defensivo',
                recommendedSecondaryFocus: 'Bolas Paradas de Defesa',
            });
            break;
        case 'attack':
            suggestions.push({
                title: "Aumentar o Poder de Fogo",
                justification: "Parece que estamos com dificuldades para criar chances claras e finalizar. Um foco ofensivo pode liberar nosso potencial de ataque.",
                recommendedPrimaryFocus: 'Ofensivo',
                recommendedSecondaryFocus: 'Contra-Ataque',
            });
            break;
        case 'physical':
             suggestions.push({
                title: "Melhorar Condicionamento Físico",
                justification: "Notei que a equipe parece cansada nos estágios finais das partidas. Melhorar nosso condicionamento físico geral pode nos dar uma vantagem.",
                recommendedPrimaryFocus: 'Físico',
                recommendedSecondaryFocus: 'Pressão Alta',
            });
            break;
        case 'technical':
             suggestions.push({
                title: "Aprimorar a Técnica",
                justification: "Nossa posse de bola tem sido um pouco desleixada. Um foco em passes e controle pode nos ajudar a ditar o ritmo dos jogos.",
                recommendedPrimaryFocus: 'Tático',
                recommendedSecondaryFocus: 'Nenhum',
            });
            break;
        default:
            suggestions.push({
                title: "Manter o Equilíbrio",
                justification: "A equipe parece bem equilibrada no geral. Sugiro um programa de treino balanceado para manter todos os aspectos do nosso jogo afiados.",
                recommendedPrimaryFocus: 'Equilibrado',
                recommendedSecondaryFocus: 'Nenhum',
            });
    }

    // 4. (Opcional) Adicionar uma sugestão de foco individual
    const individualSuggestionChance = assistant.attributes.judgingPlayerAbility / 150; // Max ~66% de chance
    if (Math.random() < individualSuggestionChance && identifiedWeakness !== 'generic') {
        const weakAttributes = {
            attack: ATTACK_ATTRS,
            defense: DEFENSE_ATTRS,
            technical: TECHNICAL_ATTRS,
            physical: PHYSICAL_ATTRS
        }[identifiedWeakness];
        
        if (weakAttributes) {
            const attributeToFocus = pickRandom(weakAttributes);
            // Encontrar jogador mais fraco nesse atributo
            const playerToTrain = squad.sort((a,b) => a.attributes[attributeToFocus] - b.attributes[attributeToFocus])[0];

            if(playerToTrain) {
                 suggestions.push({
                    title: `Foco Individual: ${playerToTrain.name}`,
                    justification: `Acredito que ${playerToTrain.name} poderia se beneficiar de um trabalho extra em seu/sua ${attributeToFocus} para fortalecer nossa área mais fraca.`,
                    recommendedPrimaryFocus: club.weeklyTrainingFocus.primary,
                    recommendedSecondaryFocus: club.weeklyTrainingFocus.secondary,
                    individualFocus: {
                        playerId: playerToTrain.id,
                        playerName: playerToTrain.name,
                        focus: { type: 'attribute', attribute: attributeToFocus }
                    }
                });
            }
        }
    }


    return suggestions;
};
