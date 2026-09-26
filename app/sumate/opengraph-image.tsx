import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Pecera: construí tu startup en público. Subí tu pitch de 90 segundos.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

async function dataUrl(archivo: string, tipo: string) {
  const datos = await readFile(join(process.cwd(), "public/brand", archivo));
  return `data:${tipo};base64,${datos.toString("base64")}`;
}

export default async function Image() {
  const [logo, pez] = await Promise.all([
    dataUrl("logo-combinado-tinta.png", "image/png"),
    dataUrl("pez.svg", "image/svg+xml"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#F5F4EC",
          color: "#1C1B16",
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={pez}
          alt=""
          width={400}
          height={358}
          style={{ position: "absolute", right: 56, bottom: 110, transform: "scaleX(-1) rotate(-8deg)" }}
        />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt="" width={262} height={56} />
          <div style={{ display: "flex", fontSize: 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>
            Construí tu startup en público.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#D95A22", fontWeight: 700 }}>
            Subí tu pitch de 90 segundos →
          </div>
        </div>
      </div>
    ),
    size
  );
}
