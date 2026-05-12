const { WEEKDAY_CLASS, WEEKDAY_NAME } = require('../constants');

const TZ = 'America/New_York';

function ohioDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
}

function getClassOfDay() {
  return WEEKDAY_CLASS[ohioDate().getDay()];
}

function getWeekdayName() {
  return WEEKDAY_NAME[ohioDate().getDay()];
}

function getOhioTimeString() {
  return new Date().toLocaleString('en-US', {
    timeZone: TZ,
    weekday: 'long',
    month:   'short',
    day:     'numeric',
    year:    'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
    second:  '2-digit',
    hour12:  true,
  });
}

function todayString() {
  return ohioDate().toLocaleDateString('en-US');
}

function isProficient(character, className) {
  return character.prof1 === className || character.prof2 === className;
}

module.exports = { getClassOfDay, getWeekdayName, getOhioTimeString, todayString, isProficient };
