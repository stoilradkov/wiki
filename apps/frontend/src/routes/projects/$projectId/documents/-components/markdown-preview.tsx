import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface MarkdownPreviewProps {
  markdown: string;
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  return (
    <div className="markdown-preview">
      <ReactMarkdown rehypePlugins={[rehypeSanitize]} remarkPlugins={[remarkGfm]} skipHtml>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
