import { Player, Tactics, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, TacklingInstruction, LineupPlayer, PlayerRole, CrossingInstruction, PositioningInstruction, PressingInstruction, MarkingInstruction, AssistantManagerAttributes, Staff, StaffRole, Mentality, CoachingAttributes } from '../types';
import { ROLE_DEFINITIONS } from './database';
import { FORMATION_PRESETS } from './formations';
import { getOverallRating } from './simulationService';

const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

export const createDefaultInstructions = (): PlayerInstructions => ({
    shooting: ShootingInstruction.Normal,
    passing: PassingInstruction.Normal,
    dribbling: DribblingInstruction.Normal,
    crossing: CrossingInstruction.Normal,
    positioning: PositioningInstruction.Normal,
    tackling: TacklingInstruction.Normal,
    pressing: PressingInstruction.Normal,
    marking: MarkingInstruction.Normal,
});

export const suggestSquadSelection = (
    lineupSlots: (Omit<LineupPlayer, 'playerId' | 'instructions'> | null)[], 
    availablePlayers: Player[], 
    assistantAttrs?: AssistantManagerAttributes
): { lineup: (LineupPlayer | null)[], bench: (number | null)[] } => {
    const filledLineup: (LineupPlayer | null)[] = Array(11).fill(null);
    let playersPool = [...availablePlayers];

    const getPlayerScoreForRole = (player: Player, role: PlayerRole): number => {
        const familiarity = player.positionalFamiliarity[role] || 20;
        const overall = getOverallRating(player);
        let score = (familiarity * 1.5) + overall;

        // Apply error factor based on assistant's skill
        if (assistantAttrs) {
            const errorMargin = (100 - assistantAttrs.judgingPlayerAbility) / 5; // Max error of 20 for 0 skill
            const randomError = (Math.random() - 0.5) * errorMargin; // -10 to +10 error
            score += randomError;
        }

        return score;
    };
    
    lineupSlots.forEach((slot, index) => {
        if (slot) {
            if (playersPool.length === 0) return;

            playersPool.sort((a, b) => getPlayerScoreForRole(b, slot.role) - getPlayerScoreForRole(a, slot.role));
            
            const bestPlayer = playersPool[0];
            
            filledLineup[index] = {
                playerId: bestPlayer.id,
                position: slot.position,
                role: slot.role,
                instructions: createDefaultInstructions(),
            };
            
            playersPool = playersPool.filter(p => p.id !== bestPlayer.id);
        }
    });

    // Select bench from the remaining players
    const bench: (number | null)[] = playersPool
        .sort((a, b) => getOverallRating(b) - getOverallRating(a))
        .slice(0, 7)
        .map(p => p.id);

    // Pad bench to 7 players if not enough available
    while(bench.length < 7) {
        bench.push(null);
    }

    return { lineup: filledLineup, bench };
};


export const generateAITactics = (
    clubPlayers: Player[],
    clubStaff: Staff[],
    ownRatings: { def: number, mid: number, fwd: number, gk: number },
    opponentRatings: { def: number, mid: number, fwd: number, gk: number }
): Tactics => {
    // --- New Mentality Selection Logic ---
    const ownOverall = (ownRatings.def + ownRatings.mid + ownRatings.fwd) / 3;
    const opponentOverall = (opponentRatings.def + opponentRatings.mid + opponentRatings.fwd) / 3;
    const strengthDiff = ownOverall - opponentOverall;

    // FIX: Translated mentality strings to match Mentality type.
    let mentality: Mentality = 'Equilibrada';
    if (strengthDiff > 8) {
        mentality = 'Ofensiva';
    } else if (strengthDiff < -8) {
        mentality = 'Defensiva';
    }
    
    // --- New Formation Selection Logic ---
    let bestFormation = FORMATION_PRESETS[0];
    let bestFormationScore = 0;

    const assistant = clubStaff.find(s => s.role === StaffRole.AssistantManager) as Staff & { attributes: AssistantManagerAttributes } | undefined;

    const getPlayerScoreForRole = (player: Player, role: PlayerRole): number => {
        const familiarity = player.positionalFamiliarity[role] || 20;
        const overall = getOverallRating(player);
        // More weight on familiarity for AI team cohesion
        let score = (familiarity * 2) + overall;
        if (assistant) {
             const errorMargin = (100 - assistant.attributes.judgingPlayerAbility) / 8;
             const randomError = (Math.random() - 0.5) * errorMargin;
             score += randomError;
        }
        return score;
    };

    for (const formation of FORMATION_PRESETS) {
        let currentFormationScore = 0;
        let availablePlayers = [...clubPlayers];

        const lineupSlots = formation.positions.map(p => ({ role: p.role }));
        
        for (const slot of lineupSlots) {
            if (availablePlayers.length === 0) break;

            availablePlayers.sort((a, b) => getPlayerScoreForRole(b, slot.role) - getPlayerScoreForRole(a, slot.role));
            const bestPlayerForSlot = availablePlayers[0];
            
            currentFormationScore += getPlayerScoreForRole(bestPlayerForSlot, slot.role);
            
            // Remove player from pool so they can't be picked again
            availablePlayers = availablePlayers.filter(p => p.id !== bestPlayerForSlot.id);
        }

        if (currentFormationScore > bestFormationScore) {
            bestFormationScore = currentFormationScore;
            bestFormation = formation;
        }
    }

    // --- Generate Best XI for the chosen formation ---
    const lineupSlots = bestFormation.positions.map(p => ({ position: { x: p.x, y: p.y }, role: p.role }));
    const { lineup, bench } = suggestSquadSelection(lineupSlots, clubPlayers, assistant?.attributes);
    
    // --- New Dynamic Instruction Logic ---
    // FIX: Translated player roles from English to Portuguese.
    lineup.forEach(lp => {
        if (!lp) return;
        
        const player = clubPlayers.find(p => p.id === lp.playerId);
        if (!player) return;

        const { attributes } = player;
        const role = lp.role;
        const instructions = createDefaultInstructions();
        const category = getRoleCategory(role);

        // Universal instructions based on standout attributes
        if (attributes.aggression > 80) instructions.tackling = TacklingInstruction.Harder;
        if (attributes.workRate > 85) instructions.pressing = PressingInstruction.Urgent;

        // Role-specific instructions
        switch(category) {
            case 'FWD':
                if (attributes.shooting > 80) instructions.shooting = ShootingInstruction.ShootMoreOften;
                if (attributes.dribbling > 80 && attributes.pace > 80) instructions.dribbling = DribblingInstruction.DribbleMore;
                if ((role === 'Atacante Recuado' || role === 'Falso Nove') && attributes.passing > 75) instructions.passing = PassingInstruction.Risky;
                break;
            case 'MID':
                if (attributes.dribbling > 80) instructions.dribbling = DribblingInstruction.DribbleMore;
                if (attributes.creativity > 80 && (role.includes('Armador') || role.includes('Construtor'))) instructions.passing = PassingInstruction.Risky;
                if (attributes.shooting > 75 && (role === 'Meia Box-to-Box' || role === 'Mezzala' || role === 'Meia Atacante')) instructions.positioning = PositioningInstruction.GetForward;
                if (role === 'Volante Ladrão de Bolas' || role === 'Carrilero') {
                    instructions.tackling = TacklingInstruction.Harder;
                    instructions.pressing = PressingInstruction.Urgent;
                }
                if (role === 'Volante' || role === 'Construtor de Jogo Recuado') instructions.positioning = PositioningInstruction.HoldPosition;
                break;
            case 'DEF':
                if (role === 'Ala' && attributes.workRate > 80) instructions.positioning = PositioningInstruction.GetForward;
                if (role === 'Zagueiro com Passe' && attributes.passing > 75) instructions.passing = PassingInstruction.Risky;
                if (role.includes('Zagueiro') || role === 'Líbero') instructions.positioning = PositioningInstruction.HoldPosition;
                break;
        }
        
        // Synergistic instructions
        if (category === 'FWD' || category === 'MID' || category === 'DEF') {
            if ((role.includes('Ala') || role.includes('Aberto') || role.includes('Lateral')) && attributes.crossing > 75) {
                instructions.crossing = CrossingInstruction.CrossMore;
                instructions.positioning = PositioningInstruction.GetForward; // Encourage them to get into crossing positions
            }
        }
        
        lp.instructions = instructions;
    });

    return {
        mentality,
        lineup,
        bench,
    };
};
