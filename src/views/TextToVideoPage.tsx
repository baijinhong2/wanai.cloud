import AiVideoGenerator from "../components/AiVideoGenerator";
import SeoLanding from "../components/SeoLanding";
import HideWhenAuthed from "../components/HideWhenAuthed";
import { ToolModeTabs } from "../components/Layout";

export default function TextToVideoPage() {
  return (
    <main className="tool-main">
      <ToolModeTabs />
      <AiVideoGenerator mode="text-to-video" showHeader={false} />
      <HideWhenAuthed>
        <SeoLanding contentKey="text-to-video" />
      </HideWhenAuthed>
    </main>
  );
}
