'use strict';

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
function deviation(values) {
    if (values.length < 2) return null;
    const average = mean(values);
    return Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / (values.length - 1));
}

// Peter J. Acklam's inverse-normal approximation; sufficient for probability-to-margin consistency.
function inverseNormal(probability) {
    const p = clamp(probability, 1e-9, 1 - 1e-9);
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    if (p < 0.02425) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    if (p > 0.97575) { const q = Math.sqrt(-2 * Math.log(1-p)); return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1); }
    const q = p - 0.5, r = q*q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
}

function fitElo(games, options = {}) {
    const ratings = {}, teams = {}, margins = [], totals = [], k = options.k || 20, homeAdvantage = options.homeAdvantage || 65;
    const rating = id => ratings[id] ?? 1500;
    const team = id => teams[id] ||= { games: 0, pointsFor: 0, pointsAgainst: 0, recentFor: [], recentAgainst: [] };
    for (const game of games) {
        const home = String(game.home_team_id), away = String(game.away_team_id);
        const homeScore = Number(game.home_score), awayScore = Number(game.away_score);
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore) || homeScore === awayScore) continue;
        const probability = 1 / (1 + 10 ** ((rating(away) - rating(home) - homeAdvantage) / 400));
        const actual = homeScore > awayScore ? 1 : 0;
        ratings[home] = rating(home) + k * (actual - probability);
        ratings[away] = rating(away) + k * ((1 - actual) - (1 - probability));
        const homeStats = team(home), awayStats = team(away);
        for (const [stats, scored, allowed] of [[homeStats,homeScore,awayScore],[awayStats,awayScore,homeScore]]) {
            stats.games++; stats.pointsFor += scored; stats.pointsAgainst += allowed;
            stats.recentFor.push(scored); stats.recentAgainst.push(allowed);
            if (stats.recentFor.length > 10) { stats.recentFor.shift(); stats.recentAgainst.shift(); }
        }
        margins.push(homeScore - awayScore); totals.push(homeScore + awayScore);
    }
    const allScores = games.flatMap(game => [Number(game.home_score), Number(game.away_score)]).filter(Number.isFinite);
    return {
        algorithm: 'elo-score-distribution-v1', k, homeAdvantage, ratings, teams,
        leagueAveragePoints: mean(allScores), marginSd: deviation(margins) || 12,
        totalSd: deviation(totals) || 18, trainedGames: margins.length
    };
}

function predict(artifact, game, minTeamGames = 5) {
    const home = String(game.home_team_id), away = String(game.away_team_id);
    const homeStats = artifact.teams[home], awayStats = artifact.teams[away];
    if (!homeStats || !awayStats || homeStats.games < minTeamGames || awayStats.games < minTeamGames)
        return { state: 'DATA_UNAVAILABLE', reason: 'INSUFFICIENT_TEAM_HISTORY' };
    const homeRating = artifact.ratings[home] ?? 1500, awayRating = artifact.ratings[away] ?? 1500;
    const homeWinProbability = 1 / (1 + 10 ** ((awayRating - homeRating - artifact.homeAdvantage) / 400));
    const shrink = stats => {
        const games = stats.recentFor.length, weight = games / (games + 5), average = artifact.leagueAveragePoints;
        return { offense: weight * mean(stats.recentFor) + (1-weight) * average, defense: weight * mean(stats.recentAgainst) + (1-weight) * average };
    };
    const h = shrink(homeStats), a = shrink(awayStats);
    const expectedTotal = clamp((h.offense + a.defense + a.offense + h.defense) / 2, 80, 320);
    const expectedMargin = inverseNormal(homeWinProbability) * artifact.marginSd;
    const expectedHomeScore = (expectedTotal + expectedMargin) / 2;
    const expectedAwayScore = (expectedTotal - expectedMargin) / 2;
    return {
        state: 'ok', homeWinProbability, awayWinProbability: 1-homeWinProbability,
        expectedHomeScore, expectedAwayScore, expectedMargin, fairSpread: -expectedMargin,
        expectedTotal, fairTotal: expectedTotal,
        features: {
            homeRating, awayRating, ratingDifference: homeRating-awayRating,
            homeGames: homeStats.games, awayGames: awayStats.games,
            homeRecentOffense: h.offense, homeRecentDefense: h.defense,
            awayRecentOffense: a.offense, awayRecentDefense: a.defense,
            leagueAveragePoints: artifact.leagueAveragePoints,
            marginSd: artifact.marginSd, totalSd: artifact.totalSd
        }
    };
}

function metrics(rows) {
    if (!rows.length) return { sampleCount: 0, accuracy: null, brierScore: null, logLoss: null, scoreMae: null, scoreRmse: null };
    const correct = rows.filter(row => (row.probability >= .5) === (row.actual === 1)).length;
    const brier = mean(rows.map(row => (row.probability-row.actual)**2));
    const logLoss = -mean(rows.map(row => row.actual*Math.log(clamp(row.probability,1e-12,1-1e-12)) + (1-row.actual)*Math.log(clamp(1-row.probability,1e-12,1-1e-12))));
    const scoreErrors = rows.flatMap(row => row.scoreErrors || []);
    return { sampleCount: rows.length, accuracy: correct/rows.length, brierScore: brier, logLoss,
        scoreMae: mean(scoreErrors.map(Math.abs)), scoreRmse: scoreErrors.length ? Math.sqrt(mean(scoreErrors.map(value=>value**2))) : null };
}

function walkForward(games, options = {}) {
    const minimum = options.minimum || 20, minTeamGames = options.minTeamGames || 5, rows = [];
    for (let index = minimum; index < games.length; index++) {
        const training = games.slice(0,index), game = games[index], result = predict(fitElo(training,options), game, minTeamGames);
        if (result.state !== 'ok' || game.home_score === game.away_score) continue;
        rows.push({ probability: result.homeWinProbability, actual: game.home_score > game.away_score ? 1 : 0,
            scoreErrors: [result.expectedHomeScore-game.home_score,result.expectedAwayScore-game.away_score], startsAt: game.starts_at });
    }
    return { metrics: metrics(rows), rows };
}

module.exports = { fitElo, predict, walkForward, metrics, inverseNormal };
