import { getVideos } from "@/lib/db/data-access";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { VideoGrid } from "./video-grid";

export default async function VideosPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || "";
  const videos = await getVideos(userId);
  return <VideoGrid videos={videos} />;
}
