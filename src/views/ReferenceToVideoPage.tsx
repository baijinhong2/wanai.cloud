import AiVideoGenerator from "../components/AiVideoGenerator";
import SeoLanding from "../components/SeoLanding";
import HideWhenAuthed from "../components/HideWhenAuthed";
import { ToolModeTabs } from "../components/Layout";

export default function ReferenceToVideoPage() {
  return (
    <main className="tool-main">
      <ToolModeTabs />
      <AiVideoGenerator mode="reference-to-video" showHeader={false} />
      <HideWhenAuthed>
        <SeoLanding contentKey="reference-to-video" />
      </HideWhenAuthed>
    </main>
  );
}
