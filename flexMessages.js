const DEFAULT_TIRE_IMAGE_URL =
  "https://placehold.co/1200x780/png?text=Tire";

function formatPrice(price) {
  if (price === null || price === undefined || price === "") {
    return "請洽門市";
  }

  const numericPrice = Number(price);
  if (Number.isNaN(numericPrice)) {
    return "請洽門市";
  }

  return `NT$${numericPrice.toLocaleString("zh-TW")}`;
}

function formatLoadSpeed(loadIndex, speedRating) {
  const loadText = loadIndex || "-";
  const speedText = speedRating || "-";

  return `${loadText} / ${speedText}`;
}

function buildTireBubble(tire) {
  return {
    type: "bubble",
    hero: {
      type: "image",
      url: tire.image_url || DEFAULT_TIRE_IMAGE_URL,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "text",
          text: tire.brand || "-",
          weight: "bold",
          size: "xl",
          wrap: true,
        },
        {
          type: "text",
          text: tire.pattern || "-",
          size: "md",
          color: "#555555",
          wrap: true,
        },
        {
          type: "separator",
          margin: "md",
        },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            {
              type: "text",
              text: `規格：${tire.size_standard || "-"}`,
              size: "sm",
              wrap: true,
            },
            {
              type: "text",
              text: `載重/速度：${formatLoadSpeed(
                tire.load_index,
                tire.speed_rating
              )}`,
              size: "sm",
              wrap: true,
            },
            {
              type: "text",
              text: `價格：${formatPrice(tire.price)}`,
              size: "sm",
              weight: "bold",
              color: "#D32F2F",
              wrap: true,
            },
          ],
        },
      ],
    },
  };
}

function buildTireFlexMessage(tires, sizeStandard) {
  return {
    type: "flex",
    altText: `${sizeStandard} 輪胎查詢結果`,
    contents: {
      type: "carousel",
      contents: tires.map(buildTireBubble),
    },
  };
}

module.exports = {
  buildTireBubble,
  buildTireFlexMessage,
  formatLoadSpeed,
  formatPrice,
};
