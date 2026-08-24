import AiVideoGenerator from "../components/AiVideoGenerator";
import SeoLanding from "../components/SeoLanding";
import HideWhenAuthed from "../components/HideWhenAuthed";
import { ToolModeTabs } from "../components/Layout";
import { MODELS, type ModelId } from "../lib/modelConfig";

const VALID_MODELS: ModelId[] = MODELS.map((m) => m.id);

export default function ImageToVideoPage({ modelParam }: { modelParam?: string }) {
  // 从 URL ?model= 读取默认模型（如 explore 的「生成同款」跳转），非法值回退默认
  const defaultModel = VALID_MODELS.includes(modelParam as ModelId) ? (modelParam as ModelId) : undefined;
  return (
    <main className="tool-main">
      <ToolModeTabs />
      <AiVideoGenerator mode="image-to-video" showHeader={false} defaultModel={defaultModel} />
      <HideWhenAuthed>
        <SeoLanding contentKey="image-to-video" />
      </HideWhenAuthed>
    </main>
  );
}
