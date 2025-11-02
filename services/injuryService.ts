import { Player } from '../types';

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/**
 * Generates a realistic injury with type and duration based on real-world football data.
 * The final duration is modified elsewhere based on the club's medical staff.
 * @param currentDate The current date of the match.
 * @param player The player who got injured.
 * @returns An object with the injury type and the expected return date.
 */
export const generateInjury = (currentDate: Date, player: Player) => {
    const injuryRoll = Math.random();
    let injuryType: string;
    let durationDays: number;

    const returnDate = new Date(currentDate);

    // 60% chance of Muscular Injury
    if (injuryRoll < 0.60) {
        const severityRoll = Math.random();
        const location = pickRandom(['Posterior da Coxa', 'Adutor', 'Panturrilha']);
        if (severityRoll < 0.70) { // Grade 1 (70% of muscular)
            injuryType = `Estiramento no ${location} (Grau 1)`;
            durationDays = randInt(7, 21);
        } else if (severityRoll < 0.95) { // Grade 2 (25% of muscular)
            injuryType = `Lesão no ${location} (Grau 2)`;
            durationDays = randInt(28, 56);
        } else { // Grade 3 (5% of muscular)
            injuryType = `Ruptura no ${location} (Grau 3)`;
            durationDays = randInt(80, 100);
        }
    } 
    // 20% chance of Sprain
    else if (injuryRoll < 0.80) {
        const severityRoll = Math.random();
        if (severityRoll < 0.60) { // Light (60% of sprains)
            injuryType = 'Tornozelo Torcido';
            durationDays = randInt(7, 10);
        } else { // Moderate (40% of sprains)
            injuryType = 'Entorse de Tornozelo';
            durationDays = randInt(21, 42);
        }
    } 
    // 15% chance of Impact/Bruise
    else if (injuryRoll < 0.95) {
        injuryType = 'Lesão por Contusão';
        durationDays = randInt(2, 5);
    } 
    // 5% chance of Severe Injury
    else {
        const severeTypeRoll = Math.random();
        if (severeTypeRoll < 0.5) {
            injuryType = 'Rompimento do Ligamento Cruzado Anterior';
            durationDays = randInt(180, 270);
        } else if (severeTypeRoll < 0.8) {
            injuryType = 'Fratura na Perna';
            durationDays = randInt(90, 150);
        } else {
            injuryType = 'Lesão no Menisco';
            durationDays = randInt(60, 120);
        }
    }
    
    returnDate.setDate(returnDate.getDate() + durationDays);

    return {
        type: injuryType,
        returnDate,
    };
};