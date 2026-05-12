const PINK = 0xFFB7C5;

const CLASS_CHOICES = [
  { name: 'General Studies', value: 'General Studies' },
  { name: 'Training',         value: 'Training'         },
  { name: 'Search and Rescue',value: 'Search and Rescue'},
  { name: 'Front Line',       value: 'Front Line'       },
  { name: 'Support',          value: 'Support'          },
  { name: 'Quirk Control',    value: 'Quirk Control'    },
  { name: 'Field Training',   value: 'Field Training'   },
];

const ACTIVITY_CHOICES = [
  { name: 'Club',             value: 'club'  },
  { name: 'Work (part-time)', value: 'work'  },
];

const WEEKDAY_CLASS = {
  0: 'Field Training',
  1: 'General Studies',
  2: 'Training',
  3: 'Search and Rescue',
  4: 'Front Line',
  5: 'Support',
  6: 'Quirk Control',
};

const WEEKDAY_NAME = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

module.exports = { PINK, CLASS_CHOICES, ACTIVITY_CHOICES, WEEKDAY_CLASS, WEEKDAY_NAME };
