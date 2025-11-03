import { Player } from '../types';

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pickRandom = <T extends { likelihood: number }>(arr: T[]): T => {
    const totalLikelihood = arr.reduce((sum, item) => sum + item.likelihood, 0);
    let randomPoint = Math.random() * totalLikelihood;
    for (const item of arr) {
        if (randomPoint < item.likelihood) {
            return item;
        }
        randomPoint -= item.likelihood;
    }
    // Fallback in case of floating point inaccuracies
    return arr[arr.length - 1];
};

interface InjuryDefinition {
    type: string;
    minDays: number;
    maxDays: number;
    likelihood: number; // A weight for this specific injury within its category
}

// All injury types in Portuguese
const MUSCULAR_INJURIES: InjuryDefinition[] = [
    { type: 'Estiramento no Posterior da Coxa (Grau 1)', minDays: 7, maxDays: 21, likelihood: 30 },
    { type: 'Lesão no Posterior da Coxa (Grau 2)', minDays: 28, maxDays: 56, likelihood: 10 },
    { type: 'Estiramento no Adutor (Grau 1)', minDays: 10, maxDays: 25, likelihood: 25 },
    { type: 'Lesão no Adutor (Grau 2)', minDays: 30, maxDays: 60, likelihood: 8 },
    { type: 'Estiramento na Panturrilha (Grau 1)', minDays: 7, maxDays: 18, likelihood: 15 },
    { type: 'Lesão na Panturrilha (Grau 2)', minDays: 25, maxDays: 50, likelihood: 5 },
    { type: 'Estiramento no Quadríceps', minDays: 14, maxDays: 28, likelihood: 7 },
];

const JOINT_LIGAMENT_INJURIES: InjuryDefinition[] = [
    { type: 'Tornozelo Torcido (Leve)', minDays: 7, maxDays: 14, likelihood: 40 },
    { type: 'Entorse de Tornozelo (Moderada)', minDays: 21, maxDays: 42, likelihood: 25 },
    { type: 'Lesão nos Ligamentos do Tornozelo', minDays: 60, maxDays: 90, likelihood: 5 },
    { type: 'Entorse de Joelho (Leve)', minDays: 14, maxDays: 28, likelihood: 20 },
    { type: 'Lesão no Ligamento Colateral Medial (LCM)', minDays: 40, maxDays: 70, likelihood: 10 },
];

const IMPACT_INJURIES: InjuryDefinition[] = [
    { type: 'Pancada Forte na Coxa', minDays: 2, maxDays: 5, likelihood: 50 },
    { type: 'Costelas Machucadas', minDays: 14, maxDays: 28, likelihood: 30 },
    { type: 'Fratura no Dedo do Pé', minDays: 25, maxDays: 40, likelihood: 20 },
    { type: 'Concussão Leve', minDays: 7, maxDays: 14, likelihood: 10 },
];

const SEVERE_INJURIES: InjuryDefinition[] = [
    { type: 'Rompimento do Ligamento Cruzado Anterior (LCA)', minDays: 180, maxDays: 270, likelihood: 30 },
    { type: 'Fratura na Perna (Tíbia/Fíbula)', minDays: 120, maxDays: 180, likelihood: 25 },
    { type: 'Lesão no Menisco', minDays: 60, maxDays: 120, likelihood: 20 },
    { type: 'Ruptura do Tendão de Aquiles', minDays: 150, maxDays: 240, likelihood: 15 },
    { type: 'Fratura no Metatarso', minDays: 50, maxDays: 80, likelihood: 10 },
];


/**
 * Generates a realistic injury with type and duration based on real-world football data.
 * The final duration is modified elsewhere based on the club's medical staff.
 * @param currentDate The current date of the match.
 * @param player The player who got injured.
 * @returns An object with the injury type and the expected return date.
 */
export const generateInjury = (currentDate: Date, player: Player) => {
    const injuryCategoryRoll = Math.random();
    let injuryPool: InjuryDefinition[];

    // Likelihoods for each category
    const muscularChance = 0.60;
    const jointChance = 0.25;
    const impactChance = 0.10;
    // Severe chance is the remaining 0.05

    if (injuryCategoryRoll < muscularChance) {
        injuryPool = MUSCULAR_INJURIES;
    } 
    else if (injuryCategoryRoll < muscularChance + jointChance) {
        injuryPool = JOINT_LIGAMENT_INJURIES;
    } 
    else if (injuryCategoryRoll < muscularChance + jointChance + impactChance) {
        injuryPool = IMPACT_INJURIES;
    } 
    else {
        injuryPool = SEVERE_INJURIES;
    }
    
    const chosenInjury = pickRandom(injuryPool);
    const durationDays = randInt(chosenInjury.minDays, chosenInjury.maxDays);
    const returnDate = new Date(currentDate);
    returnDate.setDate(returnDate.getDate() + durationDays);

    return {
        type: chosenInjury.type,
        returnDate,
        startDate: currentDate,
    };
};