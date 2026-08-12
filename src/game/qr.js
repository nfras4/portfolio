// qrcode-generator matrix → single-path SVG data. The whole renderer.
import qrcode from "qrcode-generator";

export function qrPath(text) {
  const qr = qrcode(0, "M"); // auto version, medium EC
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let d = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { d, size };
}
