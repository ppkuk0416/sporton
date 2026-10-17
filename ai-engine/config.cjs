'use strict';
const path = require('node:path');

function integer(name, fallback, minimum) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isInteger(value) || value < minimum) throw new Error(`${name} must be an integer >= ${minimum}`);
    return value;
}

function number(name, fallback, minimum, maximum) {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isFinite(value) || value < minimum || value > maximum) throw new Error(`${name} must be between ${minimum} and ${maximum}`);
    return value;
}

function loadConfig(root = path.resolve(__dirname, '..')) {
    return Object.freeze({
        dbPath: path.resolve(root, process.env.AI_DB_PATH || '.sporton/ai.sqlite'),
        minTrainGames: integer('AI_MIN_TRAIN_GAMES', 40, 20),
        minTeamGames: integer('AI_MIN_TEAM_GAMES', 5, 3),
        edgeThreshold: number('AI_EDGE_THRESHOLD', 0.04, 0, 0.5),
        oddsApiKey: process.env.ODDS_API_KEY || '',
        oddsRegions: process.env.ODDS_API_REGIONS || 'us'
    });
}

module.exports = { loadConfig };
