function pointsToHex(points) {
  let str = "";
  if (points instanceof Uint8Array) {
    str = new TextDecoder().decode(points);
  } else {
    str = JSON.stringify(points);
  }
  let hex = "\\x";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

function parsePoints(points) {
  if (Array.isArray(points)) return points;
  if (typeof points === "string") {
    if (points.startsWith("\\x")) {
      const hex = points.slice(2);
      let str = "";
      for (let i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      try { return JSON.parse(str); } catch { return []; }
    }
    try { return JSON.parse(points); } catch { return []; }
  }
  return [];
}

const original = [1, 2, 3.14, 4];
const hex = pointsToHex(original);
console.log(hex);
const parsed = parsePoints(hex);
console.log(parsed);
