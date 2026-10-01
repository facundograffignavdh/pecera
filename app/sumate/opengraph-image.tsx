import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Pecera: donde el ecosistema emprendedor se encuentra. Startups, inversores y aliados de Latinoamérica.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

async function dataUrl(archivo: string, tipo: string) {
  const datos = await readFile(join(process.cwd(), "public/brand", archivo));
  return `data:${tipo};base64,${datos.toString("base64")}`;
}

export default async function Image() {
  const [logo, isotipo] = await Promise.all([
    dataUrl("logo-combinado-tinta.png", "image/png"),
    dataUrl("isotipo-naranja.png", "image/png"),
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
        <img src={isotipo} alt="" width={380} height={246} style={{ position: "absolute", right: 72, top: 190 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 660 }}>
          <img src={logo} alt="" width={262} height={56} />
          <div style={{ display: "flex", fontSize: 66, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1 }}>
            Donde el ecosistema emprendedor se encuentra.
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#A9441A", fontWeight: 700 }}>
            Startups · Inversores · Aliados — Latinoamérica
          </div>
        </div>
      </div>
    ),
    size
  );
}
