const moment = require('moment');

class CalVerGenerator {
  constructor(options = {}) {
    this.format = options.format || 'YYYY.MM.DD';
    this.timezone = options.timezone || 'UTC';
  }

  /**
   * Generate CalVer based on format
   * @param {Date} date - Date to generate version from
   * @returns {string} CalVer string
   */
  generate(date = new Date()) {
    const m = moment(date).utc();
    
    switch (this.format.toLowerCase()) {
      case 'yyyy.mm.dd':
        return m.format('YYYY.MM.DD');
      
      case 'yy.mm.dd':
        return m.format('YY.MM.DD');
      
      case 'yyyy.mm':
        return m.format('YYYY.MM');
      
      case 'yyyy.ww':
        return m.format('YYYY.WW'); // Week of year
      
      case 'yyyymmdd':
        return m.format('YYYYMMDD');
      
      case 'yyyy.ddd':
        return m.format('YYYY.DDD'); // Day of year
      
      default:
        return m.format(this.format);
    }
  }

  /**
   * Generate incremental version for same day releases
   * @param {string} baseVersion - Base CalVer
   * @param {Array} existingVersions - Array of existing versions
   * @returns {string} Incremented version
   */
  generateIncremental(baseVersion, existingVersions = []) {
    const matchingVersions = existingVersions
      .filter(v => v.startsWith(baseVersion))
      .map(v => {
        const parts = v.split('.');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart) || 0;
      })
      .sort((a, b) => b - a);

    if (matchingVersions.length === 0) {
      return baseVersion;
    }

    const increment = matchingVersions[0] + 1;
    return `${baseVersion}.${increment}`;
  }

  /**
   * Get all supported formats
   * @returns {Array} Array of format objects
   */
  static getSupportedFormats() {
    return [
      { name: 'YYYY.MM.DD', description: 'Year.Month.Day (e.g., 2024.01.15)', example: '2024.01.15' },
      { name: 'YY.MM.DD', description: 'Year.Month.Day (e.g., 24.01.15)', example: '24.01.15' },
      { name: 'YYYY.MM', description: 'Year.Month (e.g., 2024.01)', example: '2024.01' },
      { name: 'YYYY.WW', description: 'Year.Week (e.g., 2024.03)', example: '2024.03' },
      { name: 'YYYYMMDD', description: 'Compact date (e.g., 20240115)', example: '20240115' },
      { name: 'YYYY.DDD', description: 'Year.DayOfYear (e.g., 2024.015)', example: '2024.015' }
    ];
  }
}

module.exports = CalVerGenerator;
