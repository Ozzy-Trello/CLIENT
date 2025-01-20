import dynamic from "next/dynamic";
import { Suspense } from "react";

const TrelloBoard = dynamic(() => import("./components/board"), {
  ssr: false,
});

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TrelloBoard />
    </Suspense>
  );
}
