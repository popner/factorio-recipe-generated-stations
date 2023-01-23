const zlib = require("zlib");

export function decode(str) {
  // Version 0
  let data = null;
  try {
    data = JSON.parse(
      zlib.inflateSync(Buffer.from(str.slice(1), "base64")).toString("utf8")
    );
  } catch (e) {
    throw e;
  }

  return data;
}

export function encode(obj) {
  return "0" + zlib.deflateSync(JSON.stringify(obj)).toString("base64");
}
