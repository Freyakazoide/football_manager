import { GoogleGenAI, Type } from "@google/genai";
import { GameState, DepartmentType, Staff, AssistantManagerAttributes, TeamTrainingFocus, SecondaryTrainingFocus } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateTrainingReport = async (gameState: Game