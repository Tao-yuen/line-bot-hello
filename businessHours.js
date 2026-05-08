const BUSINESS_HOURS = {
  maintenance: {
    label: "保養廠",
    text: "保養廠營業時間：週一至週六 09:00-18:00",
  },
  carWash: {
    label: "洗車廠",
    text: "洗車廠營業時間：週一至週日 08:00-19:00",
  },
  inspection: {
    label: "驗車廠",
    text: "驗車廠營業時間：週一至週五 08:30-17:30",
  },
};

function findBusinessHoursByLabel(label) {
  return Object.values(BUSINESS_HOURS).find((item) => item.label === label) || null;
}

module.exports = {
  BUSINESS_HOURS,
  findBusinessHoursByLabel,
};
