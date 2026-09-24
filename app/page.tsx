import Feed from "@/components/Feed";
import { getFeed } from "@/lib/mock-data";

export default function Home() {
  return <Feed items={getFeed()} />;
}
