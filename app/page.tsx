import Feed from "@/components/Feed";
import { getFeed } from "@/lib/datos";

export const revalidate = 60;

export default async function Home() {
  return <Feed items={await getFeed()} />;
}
