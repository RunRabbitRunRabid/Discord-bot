const OHIO_TZ = 'America/New_York';

const WEEKDAY_CLASS = {
  1: 'General Studies',
  2: 'Training',
  3: 'Search and Rescue',
  4: 'Front Line',
  5: 'Support',
  6: 'Quirk Control',
  0: 'Field Training',
};

const WEEKDAY_NAMES = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

function getOhioDate() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: OHIO_TZ }));
}

function getClassOfDay() {
  const day = getOhioDate().getDay();
  return WEEKDAY_CLASS[day];
}

function getWeekdayName() {
  const day = getOhioDate().getDay();
  return WEEKDAY_NAMES[day];
}

function getOhioTimeString() {
  return new Date().toLocaleString('en-US', {
    timeZone: OHIO_TZ,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function isProficientInClass(character, className) {
  return character.class1 === className || character.class2 === className;
}

module.exports = {
  getClassOfDay,
  getWeekdayName,
  getOhioTimeString,
  isProficientInClass,
};
