import { Track } from "@preload/emusik";

export interface DetailLoaderData {
  tracks: Track[];
}

function sleep(n: number = 500) {
  return new Promise((r) => setTimeout(r, n));
}
export async function detailLoader(): Promise<DetailLoaderData> {
  await sleep();
  return { tracks: [] };
}

export function DetailView() {
  return (
    <div>detailView</div>
  )
}
