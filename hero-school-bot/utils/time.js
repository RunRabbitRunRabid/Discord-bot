const { DateTime } = require('luxon');

const TIMEZONE = 'America/New_York';

const DAILY_SCHEDULE = {
  1: 'General Studies',
  2: 'Training',
  3: 'Search and Rescue',
  4: 'Front Line',
  5: 'Support',
  6: 'Power Control',
  7: 'Field Training',
};

const DAY_NAMES = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

function getNowEastern() {
  return DateTime.now().setZone(TIMEZONE);
}

function getTodayKey() {
  return getNowEastern().toISODate();
}

function getTodayClass() {
  const dow = getNowEastern().weekday;
  return DAILY_SCHEDULE[dow];
}

function getTodayDayName() {
  const dow = getNowEastern().weekday;
  return DAY_NAMES[dow];
}

function getFormattedTime() {
  return getNowEastern().toFormat('h:mm a ZZZZ');
}

module.exports = {
  DAILY_SCHEDULE,
  DAY_NAMES,
  getNowEastern,
  getTodayKey,
  getTodayClass,
  getTodayDayName,
  getFormattedTime,
};
