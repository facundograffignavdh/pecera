import Encabezado from "@/components/Encabezado";
import FeedMezclado from "@/components/FeedMezclado";
import { getFeed } from "@/lib/datos";

export const revalidate = 60;

export default async function Home() {
  return (
    <>
      <Encabezado variante="feed" />
      <FeedMezclado items={await getFeed()} />
    </>
  );
}
