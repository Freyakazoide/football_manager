import { Player, Tactics, PlayerInstructions, ShootingInstruction, PassingInstruction, DribblingInstruction, TacklingInstruction, LineupPlayer, PlayerRole, CrossingInstruction, PositioningInstruction, PressingInstruction, MarkingInstruction, AssistantAttributes, Staff, StaffRole } from '../types';
import { ROLE_DEFINITIONS } from './database';
import { FORMATION_PRESETS } from './formations';

const getRoleCategory = (role: PlayerRole): 'GK' | 'DEF' | 'MID' | 'FWD' => {
    return ROLE_DEFINITIONS[role]?.category || 'MID';
};

const getOverallRating = (p: Player) => {
    const attrs = p.attributes;
    const keyAttrs = attrs.shooting + attrs.passing + attrs.tackling + attrs.dribbling + attrs.pace + attrs.positioning;
    return keyAttrs / 6;
};

// FIX: Import missing instruction enums to resolve 'Cannot find name' errors.
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

export const suggestBestXI = (lineupSlots: (Omit<LineupPlayer, 'playerId' | 'instructions'> | null)[], availablePlayers: Player[], assistantAttrs?: AssistantAttributes): (LineupPlayer | null)[] => {
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

    return filledLineup;
};


export const generateAITactics = (clubPlayers: Player[], clubStaff: Staff[]): Tactics => {
    // --- New Formation Selection Logic ---
    let bestFormation = FORMATION_PRESETS[0];
    let bestFormationScore = 0;

    const assistant = clubStaff.find(s => s.role === StaffRole.Assistant) as Staff & { attributes: AssistantAttributes } | undefined;

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
    const lineup = suggestBestXI(lineupSlots, clubPlayers, assistant?.attributes);

    const lineupPlayers = lineup.map(lp => lp ? clubPlayers.find(p => p.id === lp.playerId) : null).filter(Boolean) as Player[];
    const lineupIds = new Set(lineupPlayers.map(p => p.id));
    const benchPlayers = clubPlayers.filter(p => !lineupIds.has(p.id)).sort((a, b) => getOverallRating(b) - getOverallRating(a)).slice(0, 7);
    
    // --- New Dynamic Instruction Logic ---
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
                if ((role === 'Deep-Lying Forward' || role === 'False Nine') && attributes.passing > 75) instructions.passing = PassingInstruction.Risky;
                if ((role.includes('Wide') || role === 'Advanced Forward') && attributes.crossing > 75) instructions.crossing = CrossingInstruction.CrossMore;
                break;
            case 'MID':
                if (role.includes('Wide') && attributes.crossing > 75) instructions.crossing = CrossingInstruction.CrossMore;
                if (attributes.dribbling > 80) instructions.dribbling = DribblingInstruction.DribbleMore;
                if (attributes.creativity > 80 && role.includes('Playmaker')) instructions.passing = PassingInstruction.Risky;
                if (attributes.shooting > 75 && (role === 'Box-To-Box Midfielder' || role === 'Mezzala' || role === 'Attacking Midfielder')) instructions.positioning = PositioningInstruction.GetForward;
                if (role === 'Ball Winning Midfielder' || role === 'Carrilero') {
                    instructions.tackling = TacklingInstruction.Harder;
                    instructions.pressing = PressingInstruction.Urgent;
                }
                if (role === 'Defensive Midfielder' || role === 'Deep Lying Playmaker') instructions.positioning = PositioningInstruction.HoldPosition;
                break;
            case 'DEF':
                if ((role === 'Wing-Back' || role === 'Full-Back') && attributes.crossing > 70) instructions.crossing = CrossingInstruction.CrossMore;
                if (role === 'Wing-Back' && attributes.workRate > 80) instructions.positioning = PositioningInstruction.GetForward;
                if (role === 'Ball-Playing Defender' && attributes.passing > 75) instructions.passing = PassingInstruction.Risky;
                if (role.includes('Central') || role === 'Libero') instructions.positioning = PositioningInstruction.HoldPosition;
                break;
        }
        lp.instructions = instructions;
    });

    return {
        mentality: 'Balanced', // This could also be randomized or based on team strength comparison in the future
        lineup,
        bench: benchPlayers.map(p => p.id),
    };
};