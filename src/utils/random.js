function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollXp() {
  return randInt(5, 20);
}

function rollMoney(isWork) {
  const amount = isWork ? randInt(20, 50) + Math.random() : randInt(5, 15) + Math.random();
  return parseFloat(amount.toFixed(2));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatMoney(n) {
  return `$${parseFloat(n).toFixed(2)}`;
}

const CLUB_MESSAGES = [
  'stayed after school and practiced with their club.',
  'participated in a group drill during club time.',
  'helped organise a club event and earned some recognition.',
  'ran extra exercises with their club members.',
  'attended a special club workshop and picked up new skills.',
];

const WORK_MESSAGES = [
  'picked up a shift at their part-time job.',
  'covered extra hours at work and earned a little more.',
  'impressed their employer and walked away with solid pay.',
  'helped close up the shop and received their wages.',
  'got a small tip on top of their usual pay today.',
];

function afterschoolMessage(isWork) {
  return pick(isWork ? WORK_MESSAGES : CLUB_MESSAGES);
}

const STUDY_MESSAGES = [
  'buried themselves in textbooks for hours.',
  'reviewed every note from the week and it showed.',
  'worked through every practice problem without skipping one.',
  'spent the evening reading ahead and gaining an edge.',
  'drilled concepts until they clicked.',
];

const TRAIN_MESSAGES = [
  'pushed past their limits in the training hall.',
  'ran drills until every move felt natural.',
  'worked on weaknesses and came out stronger.',
  'sparred until their technique sharpened.',
  'spent the session on fundamentals and it paid off.',
];

function studyMessage() { return pick(STUDY_MESSAGES); }
function trainMessage()  { return pick(TRAIN_MESSAGES);  }

module.exports = { rollXp, rollMoney, formatMoney, afterschoolMessage, studyMessage, trainMessage };
