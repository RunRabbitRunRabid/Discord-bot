function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollXp() {
  return randomBetween(5, 20);
}

function rollMoney(isWork) {
  if (isWork) {
    return parseFloat((Math.random() * (50 - 20) + 20).toFixed(2));
  }
  return parseFloat((Math.random() * (15 - 5) + 5).toFixed(2));
}

const CLUB_MESSAGES = [
  'You stayed after school and practiced with your club, honing your skills.',
  'Club activities were intense today — you pushed yourself hard.',
  'Your club members challenged you in a friendly sparring session.',
  'After-school club practice had you working on group coordination.',
  'You volunteered for an extra club demonstration and learned a lot.',
];

const WORK_MESSAGES = [
  'You picked up a shift at your part-time job and earned some cash.',
  'Work was busy today but rewarding — your wallet is a little heavier.',
  'You helped out at your job and received your pay for the day.',
  'Your employer gave you a bonus for your hard work today.',
  'You covered an extra shift and walked away with more money than expected.',
];

function getAfterSchoolMessage(isWork) {
  const pool = isWork ? WORK_MESSAGES : CLUB_MESSAGES;
  return pool[Math.floor(Math.random() * pool.length)];
}

function formatMoney(amount) {
  return `$${parseFloat(amount).toFixed(2)}`;
}

module.exports = {
  rollXp,
  rollMoney,
  getAfterSchoolMessage,
  formatMoney,
};
