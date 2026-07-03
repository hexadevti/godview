// Curated maritime corridors between real ports, routed through the real
// chokepoints of world shipping (Suez, Gibraltar, Malacca/Singapore,
// Bab-el-Mandeb, Cape of Good Hope, trans-Pacific). Each lane is an ordered
// list of [lat, lng] waypoints (first = origin port, last = destination port).
//
// This is a curated subset for the prototype — full generic sea routing (any
// port to any port, avoiding all land) is the `searoute` pipeline in Fase 0
// (see plan §3.1). These lanes cover the largest real trade corridors.

export interface SeaLane {
  from: number; // origin ISO
  to: number; // destination ISO
  value: number; // annual trade value, USD billions (drives ship count/thickness)
  waypoints: Array<[number, number]>;
}

export const SEA_LANES: SeaLane[] = [
  // China (Shanghai) -> US West Coast (Los Angeles/Long Beach), trans-Pacific
  {
    from: 156, to: 840, value: 450,
    waypoints: [[30.63, 122.07], [34, 140], [41, 158], [47, 175], [47, -160], [42, -135], [34.5, -121], [33.74, -118.26]],
  },
  // US (LA) -> China
  {
    from: 840, to: 156, value: 150,
    waypoints: [[33.74, -118.26], [34.5, -121], [42, -135], [47, -160], [47, 175], [41, 158], [34, 140], [30.63, 122.07]],
  },
  // China (Shanghai) -> Germany (Hamburg) via Malacca + Suez + Gibraltar
  {
    from: 156, to: 276, value: 110,
    waypoints: [
      [30.63, 122.07], [22, 118], [10, 114], [3, 105], [1.2, 104.2], [6, 95], [8, 78], [13, 60],
      [12.6, 43.4], [20, 38], [27, 34], [29.9, 32.55], [31.25, 32.3], [34, 26], [37, 11], [37.5, 3],
      [35.95, -5.6], [36.8, -9], [44, -10], [48.5, -6], [50, -2], [51, 2], [53, 5], [53.54, 9.97],
    ],
  },
  // Germany (Hamburg) -> China (Shanghai)
  {
    from: 276, to: 156, value: 65,
    waypoints: [
      [53.54, 9.97], [53, 5], [51, 2], [50, -2], [48.5, -6], [44, -10], [36.8, -9], [35.95, -5.6],
      [37.5, 3], [37, 11], [34, 26], [31.25, 32.3], [29.9, 32.55], [27, 34], [20, 38], [12.6, 43.4],
      [13, 60], [8, 78], [6, 95], [1.2, 104.2], [3, 105], [10, 114], [22, 118], [30.63, 122.07],
    ],
  },
  // Saudi Arabia (Jeddah) -> China (Shanghai) via Bab-el-Mandeb + Malacca
  {
    from: 682, to: 156, value: 55,
    waypoints: [[21.48, 39.18], [14, 42], [12.6, 43.4], [13, 52], [10, 65], [6, 80], [6, 95], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07]],
  },
  // Brazil (Santos) -> China (Shanghai) via Cape of Good Hope
  {
    from: 76, to: 156, value: 90,
    waypoints: [[-23.96, -46.3], [-30, -30], [-34, -5], [-34.8, 20], [-32, 45], [-10, 68], [3, 90], [3, 100], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07]],
  },
  // Australia (Sydney) -> China (Shanghai)
  {
    from: 36, to: 156, value: 110,
    waypoints: [[-33.98, 151.23], [-25, 153], [-10, 148], [0, 130], [8, 118], [20, 116], [30.63, 122.07]],
  },
  // US (New York) -> UK (Felixstowe), trans-Atlantic
  {
    from: 840, to: 826, value: 75,
    waypoints: [[40.67, -74.05], [41, -66], [46, -45], [49, -20], [49.5, -8], [50, -3], [51, 1], [51.96, 1.33]],
  },
  // Indonesia (Jakarta) -> China (Shanghai)
  {
    from: 360, to: 156, value: 65,
    waypoints: [[-6.1, 106.88], [-2, 108], [5, 110], [15, 114], [24, 118], [30.63, 122.07]],
  },
  // South Korea (Busan) -> US West Coast, trans-Pacific
  {
    from: 410, to: 840, value: 110,
    waypoints: [[35.1, 129.04], [38, 148], [45, 170], [47, -165], [42, -135], [34, -121], [33.74, -118.26]],
  },
  // Germany (Hamburg) -> UK (Felixstowe), short-sea
  {
    from: 276, to: 826, value: 90,
    waypoints: [[53.54, 9.97], [54, 6], [52.5, 3.5], [51.96, 1.33]],
  },
  // Saudi Arabia (Jeddah) -> India (Mumbai)
  {
    from: 682, to: 356, value: 40,
    waypoints: [[21.48, 39.18], [13, 44], [12, 52], [16, 60], [19, 68], [18.95, 72.95]],
  },
  // China (Shenzhen) -> Germany (Hamburg) via Malacca + Suez
  {
    from: 156, to: 276, value: 60,
    waypoints: [
      [22.5, 114.0], [10, 110], [3, 105], [1.2, 104.2], [6, 95], [8, 78], [13, 60], [12.6, 43.4],
      [20, 38], [27, 34], [29.9, 32.55], [31.25, 32.3], [34, 26], [37, 11], [37.5, 3], [35.95, -5.6],
      [36.8, -9], [44, -10], [48.5, -6], [50, -2], [51, 2], [53, 5], [53.54, 9.97],
    ],
  },
  // China (Ningbo) -> US West Coast, trans-Pacific
  {
    from: 156, to: 840, value: 90,
    waypoints: [[29.87, 121.9], [33, 140], [41, 158], [47, 175], [47, -160], [42, -135], [34.5, -121], [33.74, -118.26]],
  },
  // Japan (Yokohama) -> US West Coast, trans-Pacific
  {
    from: 392, to: 840, value: 90,
    waypoints: [[35.45, 139.66], [38, 150], [44, 175], [47, -165], [42, -135], [34, -121], [33.74, -118.26]],
  },
  // US (Houston) -> Germany (Hamburg) via Florida Straits + Atlantic
  {
    from: 840, to: 276, value: 50,
    waypoints: [
      [29.6, -94.9], [27, -90], [24.5, -83], [24, -80.5], [26, -79], [31, -73], [38, -60], [45, -40],
      [49, -20], [50, -8], [50, -2], [51, 2], [53, 5], [53.54, 9.97],
    ],
  },
  // Brazil (Santos) -> Germany (Hamburg) via Atlantic
  {
    from: 76, to: 276, value: 40,
    waypoints: [
      [-23.96, -46.3], [-23, -42], [-15, -35], [-5, -33], [5, -40], [15, -45], [25, -45], [35, -35],
      [43, -25], [48, -12], [50, -6], [50, -2], [51, 2], [53, 5], [53.54, 9.97],
    ],
  },
  // India (Mumbai) -> Germany (Hamburg) via Suez
  {
    from: 356, to: 276, value: 45,
    waypoints: [
      [18.95, 72.95], [15, 66], [13, 58], [12.6, 43.4], [20, 38], [27, 34], [29.9, 32.55], [31.25, 32.3],
      [34, 26], [37, 11], [37.5, 3], [35.95, -5.6], [44, -10], [49, -6], [50, -2], [51, 2], [53.54, 9.97],
    ],
  },
  // Canada (Vancouver) -> China (Shanghai), trans-Pacific
  {
    from: 124, to: 156, value: 40,
    waypoints: [[49.29, -123.11], [50, -135], [52, -160], [50, 175], [43, 158], [35, 140], [30.63, 122.07]],
  },
  // South Africa (Durban) -> China (Shanghai) via Indian Ocean
  {
    from: 710, to: 156, value: 30,
    waypoints: [[-29.87, 31.03], [-30, 40], [-20, 55], [-5, 72], [3, 90], [3, 100], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07]],
  },
  // China (Shanghai) -> US East Coast (New York) via Panama Canal
  {
    from: 156, to: 840, value: 80,
    waypoints: [
      [30.63, 122.07], [25, 135], [15, 155], [10, -170], [9, -120], [8.9, -90], [8.9, -79.6],
      [9.4, -79.9], [15, -75], [22, -72], [30, -74], [40.67, -74.05],
    ],
  },
  // China (Guangzhou) -> US West Coast, trans-Pacific
  {
    from: 156, to: 840, value: 70,
    waypoints: [[23.1, 113.25], [20, 118], [25, 132], [35, 152], [44, 175], [47, -165], [42, -135], [34, -121], [33.74, -118.26]],
  },
  // Saudi Arabia (Dammam) -> China via Strait of Hormuz + Malacca
  {
    from: 682, to: 156, value: 50,
    waypoints: [[26.9, 50.0], [26, 56.5], [24, 58], [15, 62], [8, 75], [6, 90], [3, 100], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07]],
  },
  // Australia (Melbourne) -> Japan (Osaka)
  {
    from: 36, to: 392, value: 40,
    waypoints: [[-37.84, 144.9], [-30, 150], [-15, 155], [0, 150], [15, 140], [30, 135], [34.6, 135.4]],
  },
  // Australia (Fremantle) -> China (Shanghai) via Malacca
  {
    from: 36, to: 156, value: 45,
    waypoints: [[-32.05, 115.74], [-20, 110], [-8, 105], [2, 103], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07]],
  },
  // Brazil (Santos) -> US East Coast (New York) via Atlantic
  {
    from: 76, to: 840, value: 30,
    waypoints: [[-23.96, -46.3], [-20, -40], [-10, -33], [0, -38], [12, -52], [20, -62], [28, -70], [35, -73], [40.67, -74.05]],
  },
  // UK (Felixstowe) -> US East Coast (New York), trans-Atlantic
  {
    from: 826, to: 840, value: 40,
    waypoints: [[51.96, 1.33], [50, -3], [49, -15], [47, -35], [43, -55], [41, -68], [40.67, -74.05]],
  },
  // Italy (Genoa) -> China (Shanghai) via Suez + Malacca
  {
    from: 380, to: 156, value: 40,
    waypoints: [
      [44.41, 8.93], [42, 7], [38, 10], [35, 18], [33, 26], [32, 30], [31.25, 32.3], [29.9, 32.55],
      [20, 38], [12.6, 43.4], [13, 55], [8, 75], [4, 95], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07],
    ],
  },
  // Mexico (Manzanillo) -> China (Shanghai), trans-Pacific
  {
    from: 484, to: 156, value: 40,
    waypoints: [[19.05, -104.31], [18, -120], [15, -150], [8, -175], [10, 160], [20, 140], [30.63, 122.07]],
  },
  // Indonesia (Surabaya) -> China (Shanghai) via South China Sea
  {
    from: 360, to: 156, value: 30,
    waypoints: [[-7.2, 112.7], [-3, 110], [3, 108], [10, 110], [18, 113], [30.63, 122.07]],
  },
  // China (Qingdao) -> US West Coast, trans-Pacific
  {
    from: 156, to: 840, value: 60,
    waypoints: [[36.07, 120.32], [35, 128], [37, 145], [44, 170], [47, -165], [42, -135], [34, -121], [33.74, -118.26]],
  },
  // China (Tianjin) -> Germany (Hamburg) via Malacca + Suez
  {
    from: 156, to: 276, value: 50,
    waypoints: [
      [38.98, 117.75], [34, 123], [25, 122], [15, 116], [6, 106], [1.2, 104.2], [6, 95], [10, 70],
      [12.6, 43.4], [20, 38], [29.9, 32.55], [31.25, 32.3], [34, 26], [37, 11], [35.95, -5.6],
      [44, -10], [49, -6], [51, 2], [53.54, 9.97],
    ],
  },
  // India (Chennai) -> China (Shanghai) via Malacca
  {
    from: 356, to: 156, value: 35,
    waypoints: [[13.08, 80.27], [8, 84], [5, 92], [4, 98], [1.2, 104.2], [10, 114], [22, 118], [30.63, 122.07]],
  },
  // Mexico (Veracruz) -> Germany (Hamburg) via Atlantic
  {
    from: 484, to: 276, value: 30,
    waypoints: [[19.2, -96.13], [22, -94], [24, -84], [25, -80], [30, -74], [40, -55], [48, -20], [50, -6], [51, 2], [53.54, 9.97]],
  },
  // Turkey (Istanbul) -> Germany (Hamburg) via Gibraltar
  {
    from: 792, to: 276, value: 30,
    waypoints: [[41.0, 28.9], [40, 26], [37, 24], [36, 15], [37, 5], [35.95, -5.6], [40, -10], [46, -8], [50, -3], [51, 2], [53.54, 9.97]],
  },
];
