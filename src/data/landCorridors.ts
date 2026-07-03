// Simplified REAL domestic road & rail corridors, expressed as ordered sequences
// of city names (resolved against cities.ts). These approximate the actual trunk
// networks (Trans-Siberian, India's Golden Quadrilateral, Trans-Canada, the US
// interstates, China's HSR spine, etc.) — a curated simplification, not full
// road geometry. Countries not listed fall back to an auto-generated network.

export interface LandCorridors {
  road: string[][];
  rail: string[][];
}

export const CORRIDORS: Record<number, LandCorridors> = {
  // United States — interstate-style + transcontinental rail
  840: {
    road: [
      ["New York", "Chicago", "Denver", "Los Angeles"],
      ["New York", "Atlanta", "Houston", "Dallas"],
      ["Dallas", "Denver"],
      ["Chicago", "Dallas"],
    ],
    rail: [
      ["New York", "Chicago", "Denver", "Los Angeles"],
      ["Atlanta", "New York"],
      ["Houston", "Dallas", "Chicago"],
    ],
  },
  // China — expressways + HSR spine
  156: {
    road: [
      ["Beijing", "Xi'an", "Chengdu"],
      ["Beijing", "Wuhan", "Guangzhou"],
      ["Shanghai", "Wuhan", "Chengdu"],
    ],
    rail: [
      ["Beijing", "Shanghai"],
      ["Beijing", "Wuhan", "Guangzhou"],
      ["Xi'an", "Chengdu"],
      ["Shanghai", "Wuhan", "Xi'an"],
    ],
  },
  // India — Golden Quadrilateral
  356: {
    road: [
      ["Delhi", "Mumbai"],
      ["Mumbai", "Bengaluru", "Chennai"],
      ["Chennai", "Kolkata"],
      ["Kolkata", "Delhi"],
    ],
    rail: [
      ["Delhi", "Kolkata"],
      ["Delhi", "Mumbai"],
      ["Mumbai", "Chennai"],
      ["Delhi", "Hyderabad", "Chennai"],
    ],
  },
  // Brazil — southeast corridors
  76: {
    road: [
      ["São Paulo", "Rio de Janeiro"],
      ["São Paulo", "Belo Horizonte", "Brasília"],
      ["Rio de Janeiro", "Belo Horizonte"],
      ["Belo Horizonte", "Salvador"],
      ["São Paulo", "Porto Alegre"],
    ],
    rail: [
      ["Porto Alegre", "São Paulo", "Rio de Janeiro"],
      ["São Paulo", "Brasília"],
      ["Belo Horizonte", "Salvador"],
    ],
  },
  // Russia — Trans-Siberian
  643: {
    road: [
      ["Moskva", "Sankt-Peterburg"],
      ["Moskva", "Kazan", "Yekaterinburg", "Novosibirsk"],
    ],
    rail: [["Sankt-Peterburg", "Moskva", "Kazan", "Yekaterinburg", "Novosibirsk"]],
  },
  // Canada — Trans-Canada
  124: {
    road: [["Vancouver", "Calgary", "Winnipeg", "Toronto", "Montréal"]],
    rail: [["Vancouver", "Calgary", "Winnipeg", "Toronto", "Montréal"]],
  },
  // Australia — coastal highways + rail
  36: {
    road: [
      ["Perth", "Adelaide", "Melbourne", "Sydney", "Brisbane"],
    ],
    rail: [
      ["Perth", "Adelaide", "Melbourne", "Sydney"],
      ["Sydney", "Brisbane"],
    ],
  },
  // Germany — Autobahn + ICE
  276: {
    road: [
      ["Hamburg", "Berlin", "Leipzig", "München"],
      ["Köln", "Frankfurt", "Stuttgart", "München"],
      ["Dortmund", "Köln"],
    ],
    rail: [
      ["Hamburg", "Berlin", "München"],
      ["Köln", "Frankfurt", "Stuttgart"],
      ["Düsseldorf", "Dortmund", "Leipzig"],
    ],
  },
  // Japan — Tokaido/Sanyo + Tohoku Shinkansen
  392: {
    road: [
      ["Tokyo", "Yokohama", "Nagoya", "Osaka", "Kobe", "Hiroshima", "Fukuoka"],
      ["Tokyo", "Sendai"],
    ],
    rail: [
      ["Tokyo", "Nagoya", "Kyoto", "Osaka", "Kobe", "Hiroshima", "Fukuoka"],
      ["Tokyo", "Sendai", "Sapporo"],
    ],
  },
  // Mexico — federal highways + rail
  484: {
    road: [
      ["Ciudad de México", "Puebla", "Veracruz"],
      ["Ciudad de México", "León", "Guadalajara", "Monterrey", "Tijuana"],
      ["Mérida", "Cancún"],
    ],
    rail: [
      ["Ciudad de México", "Guadalajara", "Monterrey"],
      ["Ciudad de México", "Veracruz"],
    ],
  },
  // United Kingdom — motorways + rail
  826: {
    road: [
      ["London", "Birmingham", "Manchester", "Leeds", "Newcastle", "Glasgow"],
      ["London", "Bristol", "Cardiff"],
      ["Manchester", "Liverpool"],
    ],
    rail: [
      ["London", "Birmingham", "Manchester", "Glasgow"],
      ["London", "Leeds", "Newcastle"],
    ],
  },
};
