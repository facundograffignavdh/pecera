import Encabezado from "@/components/Encabezado";
import Feed from "@/components/Feed";
import { getFeed } from "@/lib/datos";

export const revalidate = 60;

export default async function Home() {
  return (
    <>
      <Encabezado variante="feed" />
      <Feed items={await getFeed()} />
    </>
  );
}
