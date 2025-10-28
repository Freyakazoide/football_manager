import { Match, Club } from '../types';

export const generateNarrativeReport = (match: Match, playerClubId: number | null, clubs: Record<number, Club>): { headline: string, content: string } => {
    const homeTeam = clubs[match.homeTeamId];
    const awayTeam = clubs[match.awayTeamId];
    const { homeScore, awayScore, homeStats, awayStats } = match;

    if (homeScore === undefined || awayScore === undefined || !homeStats || !awayStats) {
        return { headline: "Match Report", content: "Match details are unavailable." };
    }

    const playerTeam = playerClubId === homeTeam.id ? homeTeam : playerClubId === awayTeam.id ? awayTeam : null;
    const opponentTeam = playerClubId === homeTeam.id ? awayTeam : playerClubId === awayTeam.id ? homeTeam : null;

    let headline = "";
    let content = "";

    const scoreline = `${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}`;
    
    // Determine the result from the player's perspective
    let resultType: 'win' | 'draw' | 'loss' | 'neutral' = 'neutral';
    if (playerTeam) {
        if ((playerTeam.id === homeTeam.id && homeScore > awayScore) || (playerTeam.id === awayTeam.id && awayScore > homeScore)) {
            resultType = 'win';
        } else if (homeScore === awayScore) {
            resultType = 'draw';
        } else {
            resultType = 'loss';
        }
    }

    // Headline generation
    if (resultType === 'win') {
        if (Math.abs(homeScore - awayScore) >= 3) {
            headline = `Dominant Victory for ${playerTeam!.name}`;
        } else {
            headline = `${playerTeam!.name} Secure Hard-Fought Win`;
        }
    } else if (resultType === 'loss') {
        headline = `Disappointment for ${playerTeam!.name} in ${opponentTeam!.name} Clash`;
    } else if (resultType === 'draw') {
        if (homeScore >= 2) {
            headline = `Thrilling Draw in ${homeTeam.name} vs ${awayTeam.name} Encounter`;
        } else {
            headline = `Stalemate Between ${homeTeam.name} and ${awayTeam.name}`;
        }
    } else {
        headline = `Match Report: ${scoreline}`;
    }

    // Content generation based on stats
    content += `The final whistle blows on a compelling match between ${homeTeam.name} and ${awayTeam.name}, with the final scoreline reading ${homeScore}-${awayScore}.\n\n`;

    // Possession narrative
    if (homeStats.possession > 65) {
        content += `${homeTeam.name} controlled the game, dominating possession with ${homeStats.possession}% of the ball. `;
    } else if (awayStats.possession > 65) {
        content += `${awayTeam.name} saw the lion's share of the ball, holding ${awayStats.possession}% possession. `;
    } else {
        content += `It was an evenly contested match, with possession split nearly down the middle (${homeStats.possession}%-${awayStats.possession}%). `;
    }

    // Shots narrative
    const homeClinical = homeScore > 0 && (homeStats.shotsOnTarget / homeScore) < 2.5;
    const awayClinical = awayScore > 0 && (awayStats.shotsOnTarget / awayScore) < 2.5;

    if (homeClinical && awayClinical) {
        content += "Both sides were clinical in front of goal. ";
    } else if (homeClinical) {
        content += `${homeTeam.name} were particularly sharp, converting their chances effectively. `;
    } else if (awayClinical) {
        content += `${awayTeam.name} showed a clinical edge today. `;
    }
    
    if (homeStats.shots > awayStats.shots + 8) {
        content += `${homeTeam.name} relentlessly peppered the opposition goal with ${homeStats.shots} shots throughout the match. `;
    } else if (awayStats.shots > homeStats.shots + 8) {
        content += `Despite being on the back foot, ${awayTeam.name} created numerous chances, registering ${awayStats.shots} shots. `;
    }

    content += `\n\nMatch Statistics:\n`;
    content += `             ${homeTeam.name.substring(0,3).toUpperCase()} - ${awayTeam.name.substring(0,3).toUpperCase()}\n`;
    content += `Possession:    ${homeStats.possession}% - ${awayStats.possession}%\n`;
    content += `Shots:         ${homeStats.shots} - ${awayStats.shots}\n`;
    content += `Shots on Target: ${homeStats.shotsOnTarget} - ${awayStats.shotsOnTarget}\n`;
    content += `Tackles:       ${homeStats.tackles} - ${awayStats.tackles}`;


    return { headline, content };
};
