// Firestoreにまだメニューデータがない場合だけ使われる初期データです。
// 既存のmenu-data.jsを持っている場合は、このファイルだけ既存版を残しても構いません。
window.MENU_DATA = [
  {
    id: "seasonal",
    title: "Seasonal Recommendations",
    description: "A selection of seasonal dishes chosen by our chef.",
    items: [
      {
        id: "sample-item",
        name: "Sample Dish",
        meta: "Please edit this item from the admin page.",
        price: 0,
        imageUrl: "",
        recommended: true,
        seasonal: false,
        soldOut: false,
        hidden: false
      }
    ]
  }
];
