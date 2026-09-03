import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function DirectionMarkdown({ content }: { content: string }) {
  return <div className="direction-reading">
    <Markdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        a: ({ children, ...props }) => <a {...props} target="_blank" rel="noreferrer">{children}</a>,
      }}
    >
      {content}
    </Markdown>
  </div>;
}
