/**
 * Duplicate Detection Service for civic complaints
 */

// Helper to calculate distance in meters using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// Simple text token overlap similarity score (0 to 1)
function calculateTextSimilarity(text1 = '', text2 = '') {
  const words1 = new Set(text1.toLowerCase().match(/\b\w+\b/g) || []);
  const words2 = new Set(text2.toLowerCase().match(/\b\w+\b/g) || []);
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  // Filter out common stop words
  const stopWords = new Set(['the', 'is', 'a', 'on', 'in', 'at', 'of', 'and', 'to', 'for', 'it', 'this', 'that', 'with']);
  const filtered1 = [...words1].filter(w => !stopWords.has(w));
  const filtered2 = [...words2].filter(w => !stopWords.has(w));
  
  if (filtered1.length === 0 || filtered2.length === 0) return 0;
  
  const intersection = filtered1.filter(w => filtered2.includes(w));
  return intersection.length / Math.max(filtered1.length, filtered2.length);
}

/**
 * Searches for duplicate reports in active status near the new report coordinates
 * @param {Object} newReport - { latitude, longitude, category, description, title }
 * @param {Array} existingReports - List of all existing reports from the DB
 * @returns {Array} List of suspected duplicate reports with similarity details
 */
function detectDuplicates(newReport, existingReports) {
  const { latitude, longitude, category, description = '', title = '' } = newReport;
  
  if (!latitude || !longitude) return [];

  const latNum = parseFloat(latitude);
  const lngNum = parseFloat(longitude);

  return existingReports
    .filter(report => report.status !== 'Resolved') // Only check unresolved complaints
    .map(report => {
      const distance = calculateDistance(latNum, lngNum, report.latitude, report.longitude);
      const textSim = calculateTextSimilarity(
        `${title} ${description}`,
        `${report.title} ${report.description}`
      );
      
      let duplicateScore = 0;
      let reasons = [];

      // Reason 1: Geographic proximity (150 meters is very close for civic issues)
      if (distance <= 150) {
        duplicateScore += 50;
        reasons.push(`Located within ${Math.round(distance)} meters.`);
      } else if (distance <= 300) {
        duplicateScore += 20;
        reasons.push(`Nearby location (${Math.round(distance)} meters).`);
      }

      // Reason 2: Same category
      if (report.category === category) {
        duplicateScore += 20;
        reasons.push('Matches the same report category.');
      }

      // Reason 3: Text content overlap
      if (textSim >= 0.3) {
        duplicateScore += 30;
        reasons.push('Highly similar textual descriptions.');
      } else if (textSim >= 0.15) {
        duplicateScore += 10;
        reasons.push('Some description overlap.');
      }

      return {
        report,
        distance,
        similarityScore: Math.min(100, duplicateScore),
        reasons
      };
    })
    // Filter to only those with significant similarity
    .filter(match => match.similarityScore >= 50)
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

module.exports = {
  detectDuplicates
};
