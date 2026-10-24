/**
 * Data Masking Utility (NF-05, F-23, Design §8)
 * Disguises personal identifiable information (PII) like phone numbers, emails, and NIK before logging
 */

function maskPersonalData(text) {
  if (!text || typeof text !== 'string') return text;

  let result = text;

  // 1. Mask Email (e.g. user@gmail.com -> u***@gmail.com)
  result = result.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, (match, username, domain) => {
    if (username.length <= 1) {
      return `*@${domain}`;
    }
    return `${username.slice(0, 1)}***@${domain}`;
  });

  // 2. Mask Phone Number (Indonesian: 08xx or +628xx or 628xx with separators)
  result = result.replace(/(?:\+?62|0)8[0-9]{1,3}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,5}/g, (match) => {
    const cleanDigits = match.replace(/[-.\s]/g, '');
    if (cleanDigits.length < 9) return match;
    const prefix = cleanDigits.slice(0, 4);
    const suffix = cleanDigits.slice(-4);
    return `${prefix}****${suffix}`;
  });

  // 3. Mask 16-digit National ID (NIK / KTP)
  result = result.replace(/\b\d{16}\b/g, (match) => {
    return `${match.slice(0, 4)}********${match.slice(-4)}`;
  });

  return result;
}

module.exports = {
  maskPersonalData,
};
