import AiVideoGenerator from "../components/AiVideoGenerator";
import SeoLanding from "../components/SeoLanding";
import HideWhenAuthed from "../components/HideWhenAuthed";
import { ToolModeTabs } from "../components/Layout";

export default function ImageToVideoPage() {
  return (
    <main className="tool-main">
      <ToolModeTabs />
      <AiVideoGenerator mode="image-to-video" showHeader={false} />
      <HideWhenAuthed>
        <SeoLanding contentKey="image-to-video" />
      </HideWhenAuthed>
    </main>
  );
}
