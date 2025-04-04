const months = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai',
  'Juin', 'Juillet', 'Août', 'Septembre',
  'Octobre', 'Novembre', 'Décembre',
];

exports.monthNumToName = monthnum => months[monthnum - 1] || '';

exports.monthNameToNum = (monthname) => {
  const month = months.indexOf(monthname);
  return month ? month + 1 : 0;
};
